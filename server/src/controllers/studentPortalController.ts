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

  // 1. Fetch offline classes via explicit batches
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
                  academicSessions: {
                    include: {
                      attendances: {
                        where: { studentId: student.id }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  // 2. Fetch online classes via implicit program matching
  const onlineClasses = await prisma.academicClass.findMany({
    where: {
      organizationId: student.organizationId,
      programIds: { has: student.programId || '' },
      academicCenter: { type: 'online' }
    },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              materials: true
            }
          }
        }
      }
    }
  });

  // 3. Fetch Student Video Logs to mark online lessons as completed
  const videoLogs = await prisma.studentVideoLog.findMany({
    where: { studentId: student.id }
  });

  // Format Offline Classes
  const offlineResultData = batches.filter(b => b.academicClass).map(batch => {
    const classData = batch.academicClass;
    const formattedModules = classData.modules.map((mod: any) => ({
      id: mod.id,
      title: mod.title,
      description: mod.description,
      lessons: mod.lessons.map((lesson: any) => {
        const session = lesson.academicSessions.find((s: any) => s.status === 'COMPLETED' && s.academicBatchId === batch.id);
        const isCompleted = !!session;
        const myAttendance = session?.attendances?.[0] || null;
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          isCompleted,
          sessionId: session?.id || null,
          myRating: myAttendance?.rating || null,
          myReview: myAttendance?.review || null,
          canRate: isCompleted && myAttendance,
          materials: isCompleted ? lesson.materials : [],
          videoUrl: lesson.videoUrl || null
        };
      })
    }));

    return {
      id: classData.id,
      name: classData.name,
      modules: formattedModules,
      type: 'offline'
    };
  });

  // Format Online Classes
  const onlineResultData = onlineClasses.map(classData => {
    const formattedModules = classData.modules.map((mod: any) => ({
      id: mod.id,
      title: mod.title,
      description: mod.description,
      lessons: mod.lessons.map((lesson: any) => {
        const log = videoLogs.find(l => l.moduleLessonId === lesson.id);
        const isCompleted = log && log.watchDuration > 0; // Consider completed if watched at all

        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          isCompleted: isCompleted,
          sessionId: null,
          myRating: null,
          myReview: null,
          canRate: false,
          materials: lesson.materials || [],
          videoUrl: lesson.videoUrl || null
        };
      })
    }));

    return {
      id: classData.id,
      name: classData.name,
      modules: formattedModules,
      type: 'online'
    };
  });

  // Combine and deduplicate
  const allResultsMap = new Map();
  offlineResultData.forEach(c => allResultsMap.set(c.id, c));
  onlineResultData.forEach(c => {
    if (!allResultsMap.has(c.id)) {
      allResultsMap.set(c.id, c);
    }
  });

  res.json({ success: true, data: Array.from(allResultsMap.values()) });
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

// POST /student-portal/sessions/:sessionId/rate
export const rateSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  const { rating, review } = req.body;
  const student = await getLinkedStudent(req.user.id);

  if (!student) {
    return res.status(404).json({ success: false, message: 'No student record found linked to your account' });
  }

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
  }

  const attendanceRecord = await prisma.studentAcademicAttendance.findUnique({
    where: {
      sessionId_studentId: {
        sessionId,
        studentId: student.id
      }
    }
  });

  if (!attendanceRecord) {
    return res.status(404).json({ success: false, message: 'You are not a participant in this session or attendance has not been recorded yet.' });
  }

  const updatedRecord = await prisma.studentAcademicAttendance.update({
    where: { id: attendanceRecord.id },
    data: { rating, review }
  });

  res.json({ success: true, message: 'Thank you for rating this session!', data: updatedRecord });
});

export const videoHeartbeat = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  
  const { moduleLessonId, watchDuration = 10 } = req.body;
  
  const existingLog = await prisma.studentVideoLog.findUnique({
    where: { studentId_moduleLessonId: { studentId: student.id, moduleLessonId } }
  });

  if (existingLog) {
    const log = await prisma.studentVideoLog.update({
      where: { id: existingLog.id },
      data: {
        watchDuration: { increment: watchDuration },
        lastWatchedAt: new Date()
      }
    });
    res.status(200).json({ success: true, data: log });
  } else {
    const log = await prisma.studentVideoLog.create({
      data: {
        studentId: student.id,
        moduleLessonId,
        organizationId: req.user.organizationId,
        watchDuration,
        viewCount: 1
      }
    });
    res.status(200).json({ success: true, data: log });
  }
});

export const recordVideoView = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  
  const { moduleLessonId } = req.body;
  
  const existingLog = await prisma.studentVideoLog.findUnique({
    where: { studentId_moduleLessonId: { studentId: student.id, moduleLessonId } }
  });

  if (existingLog) {
    const log = await prisma.studentVideoLog.update({
      where: { id: existingLog.id },
      data: {
        viewCount: { increment: 1 },
        lastWatchedAt: new Date()
      }
    });
    res.status(200).json({ success: true, data: log });
  } else {
    const log = await prisma.studentVideoLog.create({
      data: {
        studentId: student.id,
        moduleLessonId,
        organizationId: req.user.organizationId,
        watchDuration: 0,
        viewCount: 1
      }
    });
    res.status(200).json({ success: true, data: log });
  }
});
export const getLessonAssessmentForStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });

  const { lessonId } = req.params;
  const assessment = await prisma.assessment.findFirst({
    where: { lessonId },
    include: {
      questions: { orderBy: { order: 'asc' } },
      studentAttempts: {
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!assessment) return res.status(404).json({ success: false, message: 'No assessment for this lesson' });

  // Omit correctIndex from questions before sending to client
  const safeAssessment = {
    ...assessment,
    questions: assessment.questions.map((q: any) => {
      const { correctIndex, ...safeQ } = q;
      return safeQ;
    })
  };

  res.status(200).json({ success: true, data: safeAssessment });
});

export const submitLessonAssessment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });

  const { lessonId } = req.params;
  const { answers } = req.body; // array of { questionId, selectedIndex }

  const assessment = await prisma.assessment.findFirst({
    where: { lessonId },
    include: { questions: true }
  });

  if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found' });

  let correctCount = 0;
  
  // Grade answers
  assessment.questions.forEach((q: any) => {
    const studentAnswer = answers.find((a: any) => a.questionId === q.id);
    if (studentAnswer && studentAnswer.selectedIndex === q.correctIndex) {
      correctCount++;
    }
  });

  const score = (correctCount / assessment.questions.length) * 100;
  const passed = score >= assessment.passingScore;

  const attempt = await prisma.studentAssessmentAttempt.create({
    data: {
      assessmentId: assessment.id,
      studentId: student.id,
      score,
      passed,
      answers: answers || []
    }
  });

  res.status(200).json({ 
    success: true, 
    data: attempt,
    message: passed ? 'Congratulations! You passed the assessment.' : 'You did not pass. Try again.'
  });
});
