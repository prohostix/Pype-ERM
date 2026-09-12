import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Helper: get the Student record linked to the logged-in user (via email or direct ID)
async function getLinkedStudent(userId: string) {
  // Check if direct Student ID
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
  
  if (!student) {
    return res.json({ success: true, data: [] });
  }

  const batches = await prisma.academicBatch.findMany({
    where: { 
      OR: [
        { students: { some: { id: student.id } } },
        student.academicBatchId ? { id: student.academicBatchId } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    },
    include: {
      academicClass: {
        include: {
          modules: {
            orderBy: { order: 'asc' },
            include: {
              lessons: {
                orderBy: { order: 'asc' },
                include: {
                  materials: true,
                  academicSessions: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!batches || batches.length === 0) {
    return res.json({ success: true, data: [] });
  }

  const resultData = batches.filter(b => b.academicClass).map(batch => {
    const classData = batch.academicClass;
    const formattedModules = classData.modules.map((mod: any) => ({
      id: mod.id,
      title: mod.title,
      description: mod.description,
      lessons: mod.lessons.map((lesson: any) => {
        const isCompleted = lesson.academicSessions.some((s: any) => s.status === 'COMPLETED' && s.academicBatchId === batch.id);
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          isCompleted,
          materials: isCompleted ? lesson.materials : []
        };
      })
    }));

    return {
      id: classData.id,
      name: classData.name,
      modules: formattedModules
    };
  });

  res.json({ success: true, data: resultData });
});

// POST /student-portal/classes/:classId/attendance
export const registerClassAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  const student = await getLinkedStudent(req.user.id);

  if (!student) {
    res.status(404).json({ success: false, message: 'No student record found linked to your account' });
    return;
  }

  res.status(400).json({ success: false, message: 'Class attendance is not available' });
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

  const programMaterials = await prisma.programMaterial.findMany({
    where: {
      programId: filterProgramIds.length > 0 ? { in: filterProgramIds } : undefined,
      organizationId: req.user.organizationId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: programMaterials });
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
