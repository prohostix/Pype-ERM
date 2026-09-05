import { Response } from 'express';
import { AcademicAuthRequest } from './academicAuth.middleware.js';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { hashPassword } from '../../utils/authUtils.js';

// @desc    Schedule an Offline Lecture or Online Live Class
// @route   POST /api/v1/academic-center/classes
// @access  Private (Academic Counselor, Org Admin)
export const scheduleClass = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const {
    centerId,
    programId,
    title,
    type = 'ONLINE_LIVE_CLASS',
    startTime,
    endTime,
    teacherId,
    roomOrLocation,
    meetingLink,
    meetingPassword,
    recordingUrl,
    notes,
  } = req.body;

  const organizationId = req.academicUser?.organizationId;

  if (!centerId || !title || !startTime || !endTime) {
    res.status(400).json({ success: false, message: 'Center ID, title, start time, and end time are required' });
    return;
  }

  // Auto-resolve program if not provided
  let effectiveProgramId = programId;
  if (!effectiveProgramId) {
    const center = await prisma.academicCenter.findUnique({
      where: { id: centerId },
      include: { assignedPrograms: { select: { id: true }, take: 1 } },
    });
    if (center?.assignedPrograms && center.assignedPrograms.length > 0) {
      effectiveProgramId = center.assignedPrograms[0].id;
    } else {
      const fallbackProg = await prisma.program.findFirst({
        where: { organizationId: organizationId || center?.organizationId, status: 'active' },
        select: { id: true },
      });
      effectiveProgramId = fallbackProg?.id;
    }
  }

  if (!effectiveProgramId) {
    res.status(400).json({ success: false, message: 'No program found for this Academic Center. Please assign a program to the center.' });
    return;
  }

  // Find university program
  let program = await prisma.program.findUnique({
    where: { id: effectiveProgramId },
    include: { university: true },
  });

  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  // Auto-resolve class type if not provided
  let resolvedType: 'ONLINE_LIVE_CLASS' | 'OFFLINE_LECTURE' = 'ONLINE_LIVE_CLASS';
  if (type === 'OFFLINE_LECTURE') {
    resolvedType = 'OFFLINE_LECTURE';
  } else if (type === 'ONLINE_LIVE_CLASS') {
    resolvedType = 'ONLINE_LIVE_CLASS';
  } else if (roomOrLocation && !meetingLink) {
    resolvedType = 'OFFLINE_LECTURE';
  } else if (meetingLink) {
    resolvedType = 'ONLINE_LIVE_CLASS';
  } else {
    const center = await prisma.academicCenter.findUnique({
      where: { id: centerId },
      select: { type: true },
    });
    resolvedType = center?.type === 'OFFLINE' ? 'OFFLINE_LECTURE' : 'ONLINE_LIVE_CLASS';
  }

  const newClass = await prisma.centerClassSchedule.create({
    data: {
      organizationId: organizationId || program.organizationId,
      centerId,
      programId: effectiveProgramId,
      teacherId: teacherId || null,
      title: title.trim(),
      type: resolvedType,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      roomOrLocation: roomOrLocation?.trim() || null,
      meetingLink: meetingLink?.trim() || null,
      meetingPassword: meetingPassword?.trim() || null,
      recordingUrl: recordingUrl?.trim() || null,
      notes: notes?.trim() || null,
      status: 'SCHEDULED',
    },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true, logo: true } },
        },
      },
      teacher: {
        select: { id: true, name: true, email: true, specialization: true },
      },
      center: {
        select: { id: true, name: true, type: true, city: true, address: true },
      },
    },
  });

  // Asynchronously dispatch notifications for teachers and students
  dispatchClassScheduledNotifications(newClass).catch((err) =>
    console.error('Error dispatching notifications on class schedule:', err)
  );

  res.status(201).json({
    success: true,
    message: 'Class scheduled successfully! Notifications sent to teacher and enrolled students.',
    data: newClass,
  });
});

// Helper to dispatch in-app and push notifications to assigned teachers and enrolled students
async function dispatchClassScheduledNotifications(newClass: any) {
  try {
    const orgId = newClass.organizationId;
    const startDate = new Date(newClass.startTime);
    const dateFormatted = startDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeFormatted = `${startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })} - ${new Date(newClass.endTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    const isOnline = newClass.type === 'ONLINE_LIVE_CLASS';
    const classModeLabel = isOnline ? 'Online Live Class' : 'Campus Lecture';
    const venueDetail = isOnline
      ? (newClass.meetingLink ? `Meeting Link: ${newClass.meetingLink}` : 'Live Class Platform')
      : `Venue: ${newClass.roomOrLocation || newClass.center?.address || 'Campus Classroom'}`;
    const programName = newClass.program?.name ? `[${newClass.program.name}] ` : '';

    // 1. NOTIFY TEACHER(S)
    let teachersToNotify: Array<{ id?: string; name?: string; email?: string; password?: string | null }> = [];
    if (newClass.teacherId) {
      const assignedTeacher = await prisma.centerTeacher.findUnique({
        where: { id: newClass.teacherId },
        select: { id: true, name: true, email: true, password: true },
      });
      if (assignedTeacher) teachersToNotify.push(assignedTeacher);
    } else if (newClass.centerId) {
      const centerTeachers = await prisma.centerTeacher.findMany({
        where: { centerId: newClass.centerId, status: 'ACTIVE' },
        select: { id: true, name: true, email: true, password: true },
      });
      teachersToNotify.push(...centerTeachers);
    }

    for (const teacher of teachersToNotify) {
      if (!teacher.email) continue;
      const normalizedEmail = teacher.email.trim().toLowerCase();
      let user = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        select: { id: true, organizationId: true },
      });

      if (!user) {
        const defaultHash = teacher.password || (await hashPassword('Teacher@123'));
        user = await prisma.user.create({
          data: {
            organizationId: orgId,
            name: teacher.name || 'Faculty Member',
            email: normalizedEmail,
            password: defaultHash,
            role: 'employee',
            status: 'active',
          },
          select: { id: true, organizationId: true },
        }).catch(() => null);
      }

      if (user) {
        await prisma.notification.create({
          data: {
            organizationId: user.organizationId || orgId,
            userId: user.id,
            title: `🗓️ Class Scheduled: ${newClass.title}`,
            message: `You are scheduled to conduct ${programName}"${newClass.title}" on ${dateFormatted} (${timeFormatted}). ${venueDetail}.`,
            type: 'general',
            priority: 'high',
            link: '/dashboard?tab=classes',
          },
        }).catch((err) => console.error('Failed to notify teacher:', err));
      }
    }

    // 2. NOTIFY ENROLLED STUDENTS
    const [centerEnrollments, regularStudents] = await Promise.all([
      prisma.centerEnrollment.findMany({
        where: {
          programId: newClass.programId,
          status: 'ACTIVE',
        },
        include: {
          student: {
            select: { id: true, email: true, name: true, organizationId: true },
          },
        },
      }),
      prisma.student.findMany({
        where: {
          programId: newClass.programId,
          status: 'active',
        },
        select: { id: true, email: true, name: true, organizationId: true },
      }),
    ]);

    const studentMap = new Map<string, { name: string; orgId?: string }>();
    centerEnrollments.forEach((e) => {
      if (e.student?.email) {
        studentMap.set(e.student.email.trim().toLowerCase(), {
          name: e.student.name,
          orgId: e.student.organizationId,
        });
      }
    });
    regularStudents.forEach((s) => {
      if (s.email) {
        studentMap.set(s.email.trim().toLowerCase(), {
          name: s.name,
          orgId: s.organizationId,
        });
      }
    });

    const uniqueStudentEmails = Array.from(studentMap.keys());
    if (uniqueStudentEmails.length > 0) {
      const existingStudentUsers = await prisma.user.findMany({
        where: {
          email: { in: uniqueStudentEmails, mode: 'insensitive' },
        },
        select: { id: true, email: true, organizationId: true },
      });

      const foundEmails = new Set(existingStudentUsers.map((u) => u.email.toLowerCase().trim()));
      const usersToNotify = [...existingStudentUsers];

      for (const email of uniqueStudentEmails) {
        if (!foundEmails.has(email)) {
          const studentInfo = studentMap.get(email);
          const defaultStudentHash = await hashPassword('Student@123');
          const newUser = await prisma.user.create({
            data: {
              organizationId: studentInfo?.orgId || orgId,
              name: studentInfo?.name || 'Student',
              email,
              password: defaultStudentHash,
              role: 'student',
              status: 'active',
            },
            select: { id: true, email: true, organizationId: true },
          }).catch(() => null);

          if (newUser) {
            usersToNotify.push(newUser);
          }
        }
      }

      if (usersToNotify.length > 0) {
        await prisma.notification.createMany({
          data: usersToNotify.map((su) => ({
            organizationId: su.organizationId || orgId,
            userId: su.id,
            title: `📚 New ${classModeLabel}: ${newClass.title}`,
            message: `A new ${classModeLabel} for ${programName}"${newClass.title}" has been scheduled for ${dateFormatted} at ${timeFormatted}. ${venueDetail}.`,
            type: 'general' as const,
            priority: 'high' as const,
            link: '/student/classes',
          })),
        }).catch((err) => console.error('Failed to batch notify students:', err));
      }
    }
  } catch (err) {
    console.error('Error dispatching notifications on class schedule:', err);
  }
}

// @desc    Get classes
// @route   GET /api/v1/academic-center/classes
// @access  Private
export const getClasses = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { programId, centerId, status, type } = req.query;

  const whereClause: any = {};
  if (programId) whereClause.programId = String(programId);
  if (centerId) whereClause.centerId = String(centerId);
  if (status) whereClause.status = status as any;
  if (type) whereClause.type = type as any;

  const classes = await prisma.centerClassSchedule.findMany({
    where: whereClause,
    orderBy: { startTime: 'asc' },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true, logo: true } },
        },
      },
      teacher: {
        select: { id: true, name: true, email: true, specialization: true },
      },
      center: {
        select: { id: true, name: true, type: true, city: true },
      },
      attendances: {
        select: { id: true, status: true, markedBy: true },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: classes,
  });
});

// @desc    Update class
// @route   PUT /api/v1/academic-center/classes/:id
// @access  Private (Academic Counselor, Org Admin)
export const updateClass = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    title,
    type,
    startTime,
    endTime,
    teacherId,
    roomOrLocation,
    meetingLink,
    meetingPassword,
    recordingUrl,
    notes,
    status,
  } = req.body;

  const updated = await prisma.centerClassSchedule.update({
    where: { id },
    data: {
      ...(title && { title: title.trim() }),
      ...(type && { type: type as any }),
      ...(startTime && { startTime: new Date(startTime) }),
      ...(endTime && { endTime: new Date(endTime) }),
      ...(teacherId !== undefined && { teacherId: teacherId || null }),
      ...(roomOrLocation !== undefined && { roomOrLocation }),
      ...(meetingLink !== undefined && { meetingLink }),
      ...(meetingPassword !== undefined && { meetingPassword }),
      ...(recordingUrl !== undefined && { recordingUrl }),
      ...(notes !== undefined && { notes }),
      ...(status && { status: status as any }),
    },
    include: {
      teacher: true,
      program: true,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Class updated successfully',
    data: updated,
  });
});

// @desc    Delete class
// @route   DELETE /api/v1/academic-center/classes/:id
// @access  Private (Academic Counselor, Org Admin)
export const deleteClass = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.centerClassSchedule.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: 'Scheduled class deleted successfully',
  });
});

// @desc    Get attendance sheet for a class
// @route   GET /api/v1/academic-center/classes/:id/attendance
// @access  Private (Academic Counselor, Org Admin, Superadmin)
export const getClassAttendanceSheet = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;

  const classSchedule = await prisma.centerClassSchedule.findUnique({
    where: { id },
    include: {
      program: {
        include: { university: true },
      },
      center: true,
      teacher: true,
      attendances: true,
    },
  });

  if (!classSchedule) {
    res.status(404).json({ success: false, message: 'Class schedule not found' });
    return;
  }

  const organizationId = req.academicUser?.organizationId || classSchedule.organizationId;

  // 1. Fetch students from Student
  const regularStudents = await prisma.student.findMany({
    where: {
      programId: classSchedule.programId,
      organizationId,
      status: { not: 'rejected' },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      enrollmentNo: true,
      admissionNo: true,
    },
    orderBy: { name: 'asc' },
  });

  // 2. Fetch students from CenterStudent
  const centerStudents = await prisma.centerStudent.findMany({
    where: {
      centerId: classSchedule.centerId,
      organizationId,
      status: 'ACTIVE',
      enrollments: {
        some: { programId: classSchedule.programId },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      studentCode: true,
    },
    orderBy: { name: 'asc' },
  });

  const studentMap = new Map<string, any>();
  regularStudents.forEach((s) => {
    studentMap.set(s.email.toLowerCase().trim(), {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      studentCode: s.admissionNo || s.enrollmentNo || '',
      source: 'student',
    });
  });

  centerStudents.forEach((cs) => {
    const key = cs.email.toLowerCase().trim();
    if (!studentMap.has(key)) {
      studentMap.set(key, {
        id: cs.id,
        name: cs.name,
        email: cs.email,
        phone: cs.phone || '',
        studentCode: cs.studentCode,
        source: 'center_student',
      });
    }
  });

  const allStudents = Array.from(studentMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const attendanceMap = new Map<string, any>();
  classSchedule.attendances.forEach((att) => {
    attendanceMap.set(att.studentEmail.toLowerCase().trim(), att);
  });

  const studentSheet = allStudents.map((s) => {
    const record = attendanceMap.get(s.email.toLowerCase().trim());
    return {
      ...s,
      attendance: record
        ? {
            id: record.id,
            status: record.status,
            markedBy: record.markedBy,
            markedAt: record.markedAt,
            notes: record.notes,
          }
        : null,
    };
  });

  const presentCount = studentSheet.filter((s) => s.attendance?.status === 'PRESENT').length;
  const absentCount = studentSheet.filter((s) => s.attendance?.status === 'ABSENT').length;
  const unrecordedCount = studentSheet.filter((s) => !s.attendance).length;

  res.status(200).json({
    success: true,
    data: {
      classSchedule,
      students: studentSheet,
      stats: {
        total: studentSheet.length,
        presentCount,
        absentCount,
        unrecordedCount,
      },
    },
  });
});

// @desc    Save teacher / counselor attendance for offline or online class
// @route   POST /api/v1/academic-center/classes/:id/attendance
// @access  Private (Academic Counselor, Org Admin, Superadmin)
export const saveClassAttendance = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const { attendances } = req.body;

  if (req.academicUser?.role === 'academic_counselor') {
    res.status(403).json({
      success: false,
      message: 'Counselors have view-only access to class attendance. Offline classes are marked by teachers; online classes are registered by students.',
    });
    return;
  }

  if (!Array.isArray(attendances) || attendances.length === 0) {
    res.status(400).json({ success: false, message: 'Attendances array is required' });
    return;
  }

  const classSchedule = await prisma.centerClassSchedule.findUnique({
    where: { id },
  });

  if (!classSchedule) {
    res.status(404).json({ success: false, message: 'Class schedule not found' });
    return;
  }

  const organizationId = req.academicUser?.organizationId || classSchedule.organizationId;
  const markerId = req.academicUser?.id;

  const results = await prisma.$transaction(
    attendances.map((att: any) =>
      prisma.centerClassAttendance.upsert({
        where: {
          classScheduleId_studentEmail: {
            classScheduleId: id,
            studentEmail: String(att.studentEmail).toLowerCase().trim(),
          },
        },
        create: {
          organizationId,
          classScheduleId: id,
          studentId: att.studentId || null,
          studentEmail: String(att.studentEmail).toLowerCase().trim(),
          studentName: att.studentName || 'Student',
          status: att.status || 'PRESENT',
          markedBy: 'TEACHER',
          markedById: markerId || null,
          markedAt: new Date(),
          notes: att.notes || null,
        },
        update: {
          status: att.status || 'PRESENT',
          markedBy: 'TEACHER',
          markedById: markerId || null,
          markedAt: new Date(),
          notes: att.notes || null,
        },
      })
    )
  );

  res.status(200).json({
    success: true,
    message: `Attendance saved for ${results.length} students successfully`,
    data: results,
  });
});
