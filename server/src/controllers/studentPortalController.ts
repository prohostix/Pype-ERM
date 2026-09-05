import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Helper: get the Student record linked to the logged-in user (via email or direct ID)
async function getLinkedStudent(userId: string) {
  // 1. Check if direct CenterStudent ID
  const directCenterStudent = await prisma.centerStudent.findUnique({
    where: { id: userId },
    include: {
      enrollments: {
        include: {
          program: {
            include: {
              university: true,
            },
          },
        },
      },
      center: true,
    },
  });

  if (directCenterStudent) {
    const firstProg = directCenterStudent.enrollments?.[0]?.program;
    return {
      id: directCenterStudent.id,
      name: directCenterStudent.name,
      email: directCenterStudent.email,
      phone: directCenterStudent.phone || '',
      address: directCenterStudent.address || '',
      admissionNo: directCenterStudent.studentCode,
      status: directCenterStudent.status,
      programId: firstProg?.id || '',
      program: firstProg || null,
      centerId: directCenterStudent.centerId,
      center: directCenterStudent.center || null,
      organizationId: directCenterStudent.organizationId,
      enrollments: directCenterStudent.enrollments.map((e) => ({
        id: e.id,
        programId: e.programId,
        program: e.program,
        status: e.status,
      })),
    } as any;
  }

  // 2. Check if direct Student ID
  const directStudent = await prisma.student.findUnique({
    where: { id: userId },
    include: {
      program: {
        include: {
          university: true,
        },
      },
      center: true,
      organization: true,
      session: true,
      enrollments: {
        include: {
          session: true,
          program: {
            include: {
              university: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (directStudent) return directStudent;

  // 3. Lookup User table and link via email
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const student = await prisma.student.findUnique({
    where: { email: user.email },
    include: {
      program: {
        include: {
          university: true,
        },
      },
      center: true,
      organization: true,
      session: true,
      enrollments: {
        include: {
          session: true,
          program: {
            include: {
              university: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (student) return student;

  // Fallback: check CenterStudent if registered in academic center
  const centerStudent = await prisma.centerStudent.findFirst({
    where: { email: user.email },
    include: {
      enrollments: {
        include: {
          program: {
            include: {
              university: true,
            },
          },
        },
      },
      center: true,
    },
  });

  if (centerStudent) {
    const firstProg = centerStudent.enrollments?.[0]?.program;
    return {
      id: centerStudent.id,
      name: centerStudent.name,
      email: centerStudent.email,
      phone: centerStudent.phone || '',
      address: centerStudent.address || '',
      admissionNo: centerStudent.studentCode,
      status: centerStudent.status,
      programId: firstProg?.id || '',
      program: firstProg || null,
      centerId: centerStudent.centerId,
      center: centerStudent.center || null,
      organizationId: centerStudent.organizationId,
      enrollments: centerStudent.enrollments.map((e) => ({
        id: e.id,
        programId: e.programId,
        program: e.program,
        status: e.status,
      })),
    } as any;
  }

  return null;
}

// GET /student-portal/profile
export const getStudentProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) {
    res.status(404).json({ success: false, message: 'No student record linked to this account' });
    return;
  }
  res.json({ success: true, data: student });
});

// GET /student-portal/notifications
export const getStudentNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  // Also fetch announcements for the org
  const announcements = await prisma.announcement.findMany({
    where: { organizationId: req.user.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json({ success: true, data: { notifications, announcements } });
});

// GET /student-portal/classes - Get scheduled classes (online live + offline campus)
export const getStudentClasses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  let programIds: string[] = [];

  if (student) {
    const mainProgramId = student.programId;
    const enrolledProgramIds = (student.enrollments || []).map((e: any) => e.programId).filter(Boolean);
    programIds = Array.from(new Set([mainProgramId, ...enrolledProgramIds].filter(Boolean)));
  }

  const whereClause: any = {
    organizationId: req.user.organizationId,
  };

  if (programIds.length > 0) {
    whereClause.programId = { in: programIds };
  }

  const classes = await prisma.centerClassSchedule.findMany({
    where: whereClause,
    include: {
      program: {
        include: {
          university: true,
        },
      },
      teacher: true,
      center: true,
      attendances: student?.email
        ? {
            where: { studentEmail: student.email.toLowerCase().trim() },
            take: 1,
          }
        : false,
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  const formattedClasses = classes.map((cls: any) => ({
    ...cls,
    myAttendance: cls.attendances?.[0] || null,
  }));

  res.json({ success: true, data: formattedClasses });
});

// POST /student-portal/classes/:classId/attendance
export const registerClassAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  const student = await getLinkedStudent(req.user.id);

  if (!student) {
    res.status(404).json({ success: false, message: 'No student record found linked to your account' });
    return;
  }

  const classSchedule = await prisma.centerClassSchedule.findUnique({
    where: { id: classId },
    include: { center: true },
  });

  if (!classSchedule) {
    res.status(404).json({ success: false, message: 'Class schedule not found' });
    return;
  }

  // If center / class is OFFLINE:
  // students cannot self-register; teacher must mark attendance at the physical center
  const isOffline =
    classSchedule.type === 'OFFLINE_LECTURE' &&
    (!classSchedule.meetingLink || classSchedule.center?.type === 'OFFLINE');

  if (isOffline) {
    res.status(400).json({
      success: false,
      message: 'This is an offline campus class. Attendance must be marked by the teacher at the center.',
    });
    return;
  }

  const studentEmail = (student.email || '').toLowerCase().trim();
  if (!studentEmail) {
    res.status(400).json({ success: false, message: 'Valid student email is required' });
    return;
  }

  const attendance = await prisma.centerClassAttendance.upsert({
    where: {
      classScheduleId_studentEmail: {
        classScheduleId: classId,
        studentEmail,
      },
    },
    create: {
      organizationId: req.user.organizationId || classSchedule.organizationId,
      classScheduleId: classId,
      studentId: student.id,
      studentEmail,
      studentName: student.name,
      status: 'PRESENT',
      markedBy: 'STUDENT',
      markedAt: new Date(),
    },
    update: {
      status: 'PRESENT',
      markedBy: 'STUDENT',
      markedAt: new Date(),
    },
  });

  res.status(200).json({
    success: true,
    message: 'Attendance registered successfully! Marked as Present.',
    data: attendance,
  });
});

// GET /student-portal/materials
export const getStudentMaterials = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) {
    res.json({ success: true, data: [] });
    return;
  }

  const mainProgramId = student.programId;
  const enrolledProgramIds = (student.enrollments || []).map((e: any) => e.programId).filter(Boolean);
  const programIds = Array.from(new Set([mainProgramId, ...enrolledProgramIds].filter(Boolean)));

  const filterProgramIds = programIds.length > 0 ? programIds : [student.programId].filter(Boolean);

  const [programMaterials, centerMaterials] = await Promise.all([
    prisma.programMaterial.findMany({
      where: {
        programId: filterProgramIds.length > 0 ? { in: filterProgramIds } : undefined,
        organizationId: req.user.organizationId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.centerMaterial.findMany({
      where: {
        programId: filterProgramIds.length > 0 ? { in: filterProgramIds } : undefined,
        organizationId: req.user.organizationId,
        isPublished: true,
      },
      include: {
        program: {
          include: {
            university: true,
          },
        },
        uploadedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const formattedCenterMaterials = centerMaterials.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    type: m.type,
    fileUrl: m.mediaUrl,
    fileSize: m.fileSize ? `${Math.round(m.fileSize / 1024)} KB` : undefined,
    duration: m.duration ? `${m.duration} mins` : undefined,
    chapterOrTopic: m.chapterOrTopic,
    programName: m.program?.name,
    universityName: m.program?.university?.name,
    createdAt: m.createdAt,
    isCenterMaterial: true,
  }));

  res.json({ success: true, data: [...formattedCenterMaterials, ...programMaterials] });
});

// GET /student-portal/fees
export const getStudentFees = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) {
    res.json({ success: true, data: { schedules: [], feeStructures: [] } });
    return;
  }
  const schedules = await prisma.paymentSchedule.findMany({
    where: { studentId: student.id },
    orderBy: { dueDate: 'asc' },
  });
  const feeStructures = await prisma.feeStructure.findMany({
    where: {
      organizationId: req.user.organizationId,
      OR: [
        { programId: student.programId, specialisation: student.specialisation || null },
        { programId: student.programId, specialisation: null },
        { programId: null },
      ],
    },
    include: { program: true, university: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: { schedules, feeStructures } });
});

// GET /student-portal/invoices
export const getStudentInvoices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) {
    res.json({ success: true, data: [] });
    return;
  }
  const invoices = await prisma.invoice.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: 'desc' },
    include: { payments: true },
  });
  res.json({ success: true, data: invoices });
});

// POST /student-portal/refer
export const submitReferral = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  const studentName = student ? student.name : req.user.name;

  const { centerName, contactName, email, phone, address, notes } = req.body;

  const lead = await prisma.lead.create({
    data: {
      organizationId: req.user.organizationId,
      centerName: centerName || 'Direct',
      contactName,
      email,
      phone: phone || '',
      address: address || '',
      source: 'referral',
      referredBy: req.user.id,
      notes: `Referred by student: ${studentName} (${req.user.email}). ${notes || ''}`
    }
  });

  res.status(201).json({ success: true, data: lead });
});
