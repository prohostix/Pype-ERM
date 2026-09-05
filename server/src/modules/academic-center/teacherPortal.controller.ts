import { Response } from 'express';
import { AcademicAuthRequest } from './academicAuth.middleware.js';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Helper to resolve the authenticated teacher
const getAuthenticatedTeacher = async (req: AcademicAuthRequest) => {
  const teacherId = req.academicUser?.teacherId || req.academicUser?.id || req.user?.id;
  if (!teacherId) return null;

  return await prisma.centerTeacher.findUnique({
    where: { id: teacherId },
    include: {
      center: {
        include: {
          assignedPrograms: {
            select: { id: true, name: true, code: true },
          },
        },
      },
    },
  });
};

// Helper to get all program IDs available to teacher (inherited from center + any direct allocations)
const getTeacherProgramIds = async (teacher: any) => {
  const centerProgIds = teacher.center?.assignedPrograms?.map((p: any) => p.id) || [];
  const [classSchedules, directProgs] = await Promise.all([
    prisma.centerClassSchedule.findMany({
      where: { teacherId: teacher.id },
      select: { programId: true },
    }),
    prisma.centerProgram.findMany({
      where: { teacherId: teacher.id },
      select: { id: true },
    }),
  ]);
  return Array.from(
    new Set([
      ...centerProgIds,
      ...classSchedules.map((c: any) => c.programId),
      ...directProgs.map((p: any) => p.id),
    ])
  );
};

// @desc    Get Teacher Portal Dashboard overview
// @route   GET /api/v1/academic-center/teacher-portal/dashboard
// @access  Private (Teacher)
export const getTeacherDashboard = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const teacher = await getAuthenticatedTeacher(req);
  if (!teacher) {
    res.status(404).json({ success: false, message: 'Teacher profile not found' });
    return;
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // 1. Programs available to teacher (center programs + any direct class schedules)
  const programIds = await getTeacherProgramIds(teacher);

  // 2. Class schedule metrics
  const [totalClasses, todayClassesCount, upcomingClasses] = await Promise.all([
    prisma.centerClassSchedule.count({
      where: { teacherId: teacher.id },
    }),
    prisma.centerClassSchedule.count({
      where: {
        teacherId: teacher.id,
        startTime: { gte: startOfDay, lte: endOfDay },
      },
    }),
    prisma.centerClassSchedule.findMany({
      where: {
        teacherId: teacher.id,
        startTime: { gte: now },
      },
      orderBy: { startTime: 'asc' },
      take: 4,
      include: {
        program: {
          select: { id: true, name: true, code: true, university: true },
        },
        attendances: {
          select: { id: true, status: true },
        },
      },
    }),
  ]);

  // 3. Count unique students enrolled in teacher's programs
  const [centerStudentCount, regularStudentCount] = await Promise.all([
    prisma.centerEnrollment.count({
      where: { programId: { in: programIds } },
    }),
    prisma.student.count({
      where: { programId: { in: programIds } },
    }),
  ]);
  const totalMonitoredStudents = centerStudentCount + regularStudentCount;

  // 4. Overall Attendance Stats
  const totalAttendances = await prisma.centerClassAttendance.count({
    where: {
      classSchedule: { teacherId: teacher.id },
    },
  });
  const presentAttendances = await prisma.centerClassAttendance.count({
    where: {
      classSchedule: { teacherId: teacher.id },
      status: 'PRESENT',
    },
  });
  const overallAttendanceRate = totalAttendances > 0 
    ? Math.round((presentAttendances / totalAttendances) * 100) 
    : 100;

  res.status(200).json({
    success: true,
    data: {
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        specialization: teacher.specialization,
        bio: teacher.bio,
        center: teacher.center,
      },
      stats: {
        totalPrograms: programIds.length,
        totalClasses,
        todayClassesCount,
        totalMonitoredStudents,
        overallAttendanceRate,
      },
      upcomingClasses,
    },
  });
});

// @desc    Get classes assigned to teacher
// @route   GET /api/v1/academic-center/teacher-portal/classes
// @access  Private (Teacher)
export const getTeacherClasses = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const teacher = await getAuthenticatedTeacher(req);
  if (!teacher) {
    res.status(404).json({ success: false, message: 'Teacher profile not found' });
    return;
  }

  const { filter } = req.query; // 'upcoming', 'today', 'past', 'all'
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const whereClause: any = {
    OR: [
      { teacherId: teacher.id },
      ...(teacher.centerId ? [{ centerId: teacher.centerId }] : []),
    ],
  };

  if (filter === 'today') {
    whereClause.startTime = { gte: startOfDay, lte: endOfDay };
  } else if (filter === 'upcoming') {
    whereClause.startTime = { gte: now };
  } else if (filter === 'past') {
    whereClause.endTime = { lt: now };
  }

  const classes = await prisma.centerClassSchedule.findMany({
    where: whereClause,
    orderBy: { startTime: 'desc' },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true } },
        },
      },
      attendances: {
        select: { id: true, status: true, studentEmail: true, markedBy: true },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: classes,
  });
});

// @desc    Get all students enrolled in the teacher's assigned programs (Student Monitoring)
// @route   GET /api/v1/academic-center/teacher-portal/students
// @access  Private (Teacher)
export const getTeacherStudents = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const teacher = await getAuthenticatedTeacher(req);
  if (!teacher) {
    res.status(404).json({ success: false, message: 'Teacher profile not found' });
    return;
  }

  // Find all program IDs associated with this teacher (center programs + direct schedules)
  const programIds = await getTeacherProgramIds(teacher);

  if (programIds.length === 0) {
    res.status(200).json({ success: true, data: [] });
    return;
  }

  // Total past classes conducted in this center / teacher's programs
  const pastClasses = await prisma.centerClassSchedule.findMany({
    where: {
      programId: { in: programIds },
      endTime: { lte: new Date() },
    },
    select: { id: true, programId: true },
  });
  const classIds = pastClasses.map((c) => c.id);

  // Fetch all attendance records for these classes
  const attendances = await prisma.centerClassAttendance.findMany({
    where: {
      classScheduleId: { in: classIds },
    },
    select: {
      classScheduleId: true,
      studentEmail: true,
      status: true,
      markedAt: true,
    },
  });

  // 1. Fetch Center Students enrolled in teacher's programs
  const centerEnrollments = await prisma.centerEnrollment.findMany({
    where: {
      programId: { in: programIds },
      status: 'ACTIVE',
    },
    include: {
      student: true,
      program: {
        include: { university: true },
      },
    },
  });

  // 2. Fetch Regular Students enrolled in teacher's programs
  const regularStudents = await prisma.student.findMany({
    where: {
      programId: { in: programIds },
      status: 'active',
    },
    include: {
      program: true,
      university: true,
    },
  });

  const studentMap = new Map<string, any>();

  // Process Center Students
  centerEnrollments.forEach((enr) => {
    const s = enr.student;
    if (!s) return;
    const emailKey = s.email.toLowerCase();

    const programClasses = pastClasses.filter((c) => c.programId === enr.programId);
    const studentRecords = attendances.filter((a) => a.studentEmail.toLowerCase() === emailKey);
    const presentCount = studentRecords.filter((a) => a.status === 'PRESENT').length;
    const totalClassesConducted = programClasses.length;
    const attendanceRate = totalClassesConducted > 0 
      ? Math.round((presentCount / totalClassesConducted) * 100) 
      : 100;

    studentMap.set(emailKey, {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone || '',
      studentCode: s.studentCode,
      source: 'Center Student',
      programName: enr.program?.name || 'Program',
      programCode: enr.program?.code || '',
      universityName: enr.program?.university?.name || '',
      enrolledAt: enr.enrolledAt,
      totalClassesConducted,
      presentCount,
      absentCount: studentRecords.filter((a) => a.status === 'ABSENT').length,
      attendanceRate,
      status: s.status,
    });
  });

  // Process Regular Students
  regularStudents.forEach((s) => {
    const emailKey = (s.email || '').toLowerCase();
    if (!emailKey || studentMap.has(emailKey)) return;

    const programClasses = pastClasses.filter((c) => c.programId === s.programId);
    const studentRecords = attendances.filter((a) => a.studentEmail.toLowerCase() === emailKey);
    const presentCount = studentRecords.filter((a) => a.status === 'PRESENT').length;
    const totalClassesConducted = programClasses.length;
    const attendanceRate = totalClassesConducted > 0 
      ? Math.round((presentCount / totalClassesConducted) * 100) 
      : 100;

    studentMap.set(emailKey, {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone || '',
      studentCode: s.enrollmentNo || s.admissionNo || s.id.slice(0, 8).toUpperCase(),
      source: 'Direct Student',
      programName: s.program?.name || 'Program',
      programCode: s.program?.code || '',
      universityName: s.university?.name || '',
      enrolledAt: s.createdAt,
      totalClassesConducted,
      presentCount,
      absentCount: studentRecords.filter((a) => a.status === 'ABSENT').length,
      attendanceRate,
      status: s.status,
    });
  });

  res.status(200).json({
    success: true,
    data: Array.from(studentMap.values()),
  });
});

// @desc    Get programs assigned to teacher
// @route   GET /api/v1/academic-center/teacher-portal/programs
// @access  Private (Teacher)
export const getTeacherPrograms = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const teacher = await getAuthenticatedTeacher(req);
  if (!teacher) {
    res.status(404).json({ success: false, message: 'Teacher profile not found' });
    return;
  }

  const programIds = await getTeacherProgramIds(teacher);

  const programs = await prisma.program.findMany({
    where: { id: { in: programIds } },
    include: {
      university: { select: { id: true, name: true, code: true } },
      _count: {
        select: {
          centerClassSchedules: true,
          students: true,
          centerEnrollments: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  res.status(200).json({
    success: true,
    data: programs,
  });
});

// @desc    Get attendance sheet for a class
// @route   GET /api/v1/academic-center/teacher-portal/classes/:classId/attendance
// @access  Private (Teacher)
export const getTeacherClassAttendanceSheet = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const teacher = await getAuthenticatedTeacher(req);
  if (!teacher) {
    res.status(404).json({ success: false, message: 'Teacher profile not found' });
    return;
  }

  const { classId } = req.params;
  const classSchedule = await prisma.centerClassSchedule.findUnique({
    where: { id: classId },
    include: {
      program: {
        select: { id: true, name: true, code: true, university: true },
      },
      teacher: true,
      attendances: true,
    },
  });

  if (!classSchedule) {
    res.status(404).json({ success: false, message: 'Class schedule not found' });
    return;
  }

  // Students enrolled in this program
  const [centerEnrollments, regularStudents] = await Promise.all([
    prisma.centerEnrollment.findMany({
      where: {
        programId: classSchedule.programId,
        status: 'ACTIVE',
      },
      include: { student: true },
    }),
    prisma.student.findMany({
      where: {
        programId: classSchedule.programId,
        status: 'active',
      },
    }),
  ]);

  const existingAttendanceMap = new Map<string, any>();
  classSchedule.attendances.forEach((att) => {
    existingAttendanceMap.set(att.studentEmail.toLowerCase(), att);
  });

  const studentList: any[] = [];
  const seenEmails = new Set<string>();

  centerEnrollments.forEach((enr) => {
    const s = enr.student;
    if (!s) return;
    const emailKey = s.email.toLowerCase();
    if (seenEmails.has(emailKey)) return;
    seenEmails.add(emailKey);

    const att = existingAttendanceMap.get(emailKey);
    studentList.push({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      studentCode: s.studentCode,
      source: 'Center Student',
      status: att ? att.status : 'ABSENT',
      markedBy: att?.markedBy || null,
      markedAt: att?.markedAt || null,
      notes: att?.notes || '',
    });
  });

  regularStudents.forEach((s) => {
    const emailKey = (s.email || '').toLowerCase();
    if (!emailKey || seenEmails.has(emailKey)) return;
    seenEmails.add(emailKey);

    const att = existingAttendanceMap.get(emailKey);
    studentList.push({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      studentCode: s.enrollmentNo || s.admissionNo || s.id.slice(0, 8).toUpperCase(),
      source: 'Direct Student',
      status: att ? att.status : 'ABSENT',
      markedBy: att?.markedBy || null,
      markedAt: att?.markedAt || null,
      notes: att?.notes || '',
    });
  });

  res.status(200).json({
    success: true,
    data: {
      classSchedule,
      students: studentList,
      stats: {
        total: studentList.length,
        presentCount: studentList.filter((s) => s.status === 'PRESENT').length,
        absentCount: studentList.filter((s) => s.status === 'ABSENT').length,
      },
    },
  });
});

// @desc    Save/batch mark attendance for a class
// @route   POST /api/v1/academic-center/teacher-portal/classes/:classId/attendance
// @access  Private (Teacher)
export const saveTeacherClassAttendance = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const teacher = await getAuthenticatedTeacher(req);
  if (!teacher) {
    res.status(404).json({ success: false, message: 'Teacher profile not found' });
    return;
  }

  const { classId } = req.params;
  const { attendances } = req.body;

  if (!Array.isArray(attendances)) {
    res.status(400).json({ success: false, message: 'Attendances array is required' });
    return;
  }

  const classSchedule = await prisma.centerClassSchedule.findUnique({
    where: { id: classId },
  });

  if (!classSchedule) {
    res.status(404).json({ success: false, message: 'Class schedule not found' });
    return;
  }

  const organizationId = teacher.organizationId;
  const markedAt = new Date();

  await prisma.$transaction(
    attendances.map((item: any) =>
      prisma.centerClassAttendance.upsert({
        where: {
          classScheduleId_studentEmail: {
            classScheduleId: classId,
            studentEmail: item.studentEmail.trim().toLowerCase(),
          },
        },
        update: {
          status: item.status === 'PRESENT' ? 'PRESENT' : 'ABSENT',
          markedBy: 'TEACHER',
          markedById: teacher.id,
          markedAt,
          notes: item.notes || null,
        },
        create: {
          organizationId,
          classScheduleId: classId,
          studentId: item.studentId || null,
          studentEmail: item.studentEmail.trim().toLowerCase(),
          studentName: item.studentName || 'Student',
          status: item.status === 'PRESENT' ? 'PRESENT' : 'ABSENT',
          markedBy: 'TEACHER',
          markedById: teacher.id,
          markedAt,
          notes: item.notes || null,
        },
      })
    )
  );

  res.status(200).json({
    success: true,
    message: `Attendance updated for ${attendances.length} student(s)`,
  });
});
