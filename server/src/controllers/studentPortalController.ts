import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler, asyncHandlerWithoutDeleteApproval } from '../utils/asyncHandler.js';
import {
  computeVideoProgress,
  evaluateFeeLock,
  getDailyLimit,
  getResumePosition,
  getStartOfIstDay,
  getWatchedPercent,
  isVideoLogWatched
} from '../utils/videoAccess.js';

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

// Only lessons in online centers count toward the daily quota.
const ONLINE_LESSON_FILTER = {
  classModule: { academicClass: { academicCenter: { type: 'online' } } }
};

function getTodayOnlineVideoLogs(studentId: string) {
  return prisma.studentVideoLog.findMany({
    where: {
      studentId,
      lastWatchedAt: { gte: getStartOfIstDay() },
      watchDuration: { gt: 0 },
      moduleLesson: ONLINE_LESSON_FILTER
    }
  });
}

function getStudentFeeRecords(student: any) {
  return Promise.all([
    prisma.invoice.findMany({
      where: { studentId: student.id },
      include: { payments: true }
    }),
    prisma.paymentSchedule.findMany({
      where: { studentId: student.id }
    }),
    prisma.feeStructure.findMany({
      where: {
        organizationId: student.organizationId,
        ...(student.programId ? { programId: student.programId } : {})
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);
}

function getDailyLimitMessage(limit: number, watchedCount: number) {
  return `Daily viewing limit of ${limit} classes reached for today (${watchedCount}/${limit} watched). New classes unlock tomorrow at 12:00 AM.`;
}

// Helper: check access to a lesson before recording a view or watch time.
// Fee and quota rules apply only to online-center lessons of the student's program.
async function checkLessonAccessForStudent(student: any, moduleLessonId: string) {
  const lesson = await prisma.moduleLesson.findUnique({
    where: { id: moduleLessonId },
    include: {
      classModule: {
        include: { academicClass: { include: { academicCenter: true } } }
      }
    }
  });

  if (!lesson || lesson.organizationId !== student.organizationId) {
    return { allowed: false, status: 404, message: 'Lesson not found' };
  }

  if (lesson.classModule.academicClass.academicCenter.type !== 'online' || !lesson.videoUrl) {
    return { allowed: true };
  }

  const org = await prisma.organization.findUnique({
    where: { id: student.organizationId },
    select: { metadata: true }
  });
  const activeConfig = (org?.metadata as any)?.programAccessConfigs?.[student.programId];

  const [invoices, schedules, feeStructures] = await getStudentFeeRecords(student);
  const feeStatus = evaluateFeeLock(activeConfig, invoices, schedules, feeStructures, student);
  if (feeStatus.isFeeLocked) {
    return {
      allowed: false,
      status: 403,
      reason: 'fee_overdue',
      message: feeStatus.message
    };
  }

  const dailyLimit = getDailyLimit(activeConfig);
  if (dailyLimit !== null) {
    const watchedTodayIds = new Set((await getTodayOnlineVideoLogs(student.id)).map(l => l.moduleLessonId));
    if (!watchedTodayIds.has(moduleLessonId) && watchedTodayIds.size >= dailyLimit) {
      return {
        allowed: false,
        status: 403,
        reason: 'daily_limit',
        message: getDailyLimitMessage(dailyLimit, watchedTodayIds.size)
      };
    }
  }

  return { allowed: true };
}

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
          academicCenter: true,
          modules: {
            orderBy: { order: 'asc' },
            include: {
              subModules: {
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
              },
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

  // Batches in online centers are handled with the online classes below, so that
  // allocated students get the same video progress and access rules.
  const isOnlineBatch = (batch: any) => batch.academicClass?.academicCenter?.type === 'online';
  const onlineBatchClassIds = batches.filter(isOnlineBatch).map(b => b.academicClassId);

  // 2. Fetch online classes via program matching or batch allocation
  const onlineClasses = await prisma.academicClass.findMany({
    where: {
      organizationId: student.organizationId,
      academicCenter: { type: 'online' },
      OR: [
        { programIds: { has: student.programId || '' } },
        { id: { in: onlineBatchClassIds } }
      ]
    },
    orderBy: { createdAt: 'asc' },
    include: {
      academicCenter: true,
      modules: {
        orderBy: { order: 'asc' },
        include: {
          subModules: {
            orderBy: { order: 'asc' },
            include: {
              lessons: {
                orderBy: { order: 'asc' },
                include: {
                  materials: true,
                  assessment: {
                    include: {
                      studentAttempts: {
                        where: { studentId: student.id },
                        orderBy: { createdAt: 'desc' }
                      }
                    }
                  }
                }
              }
            }
          },
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              materials: true,
              assessment: {
                include: {
                  studentAttempts: {
                    where: { studentId: student.id },
                    orderBy: { createdAt: 'desc' }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  // 3. Fetch program access rules, video logs and fee records
  const [org, allVideoLogs, todayVideoLogs, [studentInvoices, studentSchedules, studentFeeStructures]] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: student.organizationId },
      select: { metadata: true }
    }),
    prisma.studentVideoLog.findMany({
      where: { studentId: student.id }
    }),
    getTodayOnlineVideoLogs(student.id),
    getStudentFeeRecords(student)
  ]);

  const programAccessConfig = (org?.metadata as any)?.programAccessConfigs?.[student.programId];
  const watchedLessonsToday = new Set(todayVideoLogs.map(l => l.moduleLessonId));
  const watchedCountToday = watchedLessonsToday.size;
  const feeStatus = evaluateFeeLock(programAccessConfig, studentInvoices, studentSchedules, studentFeeStructures, student);
  const dailyLimit = getDailyLimit(programAccessConfig);
  const isDailyLimitReached = dailyLimit !== null && watchedCountToday >= dailyLimit;

  // Format Offline Classes
  const offlineResultData = batches.filter(b => b.academicClass && !isOnlineBatch(b)).map(batch => {
    const classData = batch.academicClass;

    const formatOfflineLesson = (lesson: any) => {
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
        videoUrl: lesson.videoUrl || null,
        hasVideo: !!lesson.videoUrl,
        resumePosition: getResumePosition(allVideoLogs.find(l => l.moduleLessonId === lesson.id))
      };
    };

    const formattedModules = classData.modules.map((mod: any) => ({
      id: mod.id,
      title: mod.title,
      description: mod.description,
      subModules: (mod.subModules || []).map((sub: any) => ({
        id: sub.id,
        title: sub.title,
        description: sub.description,
        lessons: sub.lessons.map(formatOfflineLesson)
      })),
      lessons: (mod.lessons || []).filter((l: any) => !l.classSubModuleId).map(formatOfflineLesson)
    }));

    return {
      id: classData.id,
      name: classData.name,
      modules: formattedModules,
      type: 'offline',
      centerId: classData.academicCenterId,
      centerName: classData.academicCenter?.name
    };
  });

  // Format Online Classes
  const onlineResultData = onlineClasses.map(classData => {
    const formatOnlineLesson = (lesson: any) => {
      const log = allVideoLogs.find(l => l.moduleLessonId === lesson.id);
      const isVideoWatched = !lesson.videoUrl || isVideoLogWatched(log);
      const hasAssessment = !!lesson.assessment;
      const attempts = lesson.assessment?.studentAttempts || [];
      const assessmentPassed = hasAssessment ? attempts.some((att: any) => att.passed) : true;
      const lastScore = attempts.length > 0 ? attempts[0].score : null;
      const isCompleted = isVideoWatched && assessmentPassed;
      const watchedToday = watchedLessonsToday.has(lesson.id);

      let isFeeLocked = false;
      let isDailyLimitLocked = false;
      let lockReason: string | null = null;
      let lockMessage: string | null = null;

      if (lesson.videoUrl && feeStatus.isFeeLocked) {
        isFeeLocked = true;
        lockReason = 'fee_overdue';
        lockMessage = feeStatus.message;
      } else if (lesson.videoUrl && dailyLimit !== null && isDailyLimitReached && !watchedToday) {
        isDailyLimitLocked = true;
        lockReason = 'daily_limit';
        lockMessage = getDailyLimitMessage(dailyLimit, watchedCountToday);
      }

      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        isCompleted: isCompleted,
        isVideoWatched,
        hasAssessment,
        assessmentPassed,
        passingScore: lesson.assessment?.passingScore ?? 50,
        lastScore,
        attemptsCount: attempts.length,
        sessionId: null,
        myRating: null,
        myReview: null,
        canRate: false,
        materials: lesson.materials || [],
        // A locked lesson must not reveal its video link.
        videoUrl: isFeeLocked || isDailyLimitLocked ? null : lesson.videoUrl || null,
        hasVideo: !!lesson.videoUrl,
        watchedToday,
        watchedPercent: getWatchedPercent(log),
        resumePosition: getResumePosition(log),
        isFeeLocked,
        isDailyLimitLocked,
        lockReason,
        lockMessage,
        dailyLimit,
        watchedTodayCount: watchedCountToday,
        totalFee: feeStatus.totalFee,
        paidFee: feeStatus.paidFee,
        paidPercentage: feeStatus.paidPercentage,
        minPaidPercentage: feeStatus.minPaidPercentage
      };
    };

    const formattedModules = classData.modules.map((mod: any) => ({
      id: mod.id,
      title: mod.title,
      description: mod.description,
      subModules: (mod.subModules || []).map((sub: any) => ({
        id: sub.id,
        title: sub.title,
        description: sub.description,
        lessons: sub.lessons.map(formatOnlineLesson)
      })),
      lessons: (mod.lessons || []).filter((l: any) => !l.classSubModuleId).map(formatOnlineLesson)
    }));

    return {
      id: classData.id,
      name: classData.name,
      modules: formattedModules,
      type: 'online',
      centerId: classData.academicCenterId,
      centerName: classData.academicCenter?.name,
      dailyLimit,
      watchedTodayCount: watchedCountToday,
      isFeeLocked: feeStatus.isFeeLocked,
      feeLockMessage: feeStatus.message,
      totalFee: feeStatus.totalFee,
      paidFee: feeStatus.paidFee,
      paidPercentage: feeStatus.paidPercentage,
      minPaidPercentage: feeStatus.minPaidPercentage
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

// GET /student-portal/trial-videos - Free videos of the student's online classes.
// These skip the fee lock and daily quota, and are not counted as lesson progress.
export const getStudentTrialVideos = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) {
    return res.json({ success: true, data: [] });
  }

  const videos = await prisma.classTrialVideo.findMany({
    where: {
      organizationId: student.organizationId,
      academicClass: {
        academicCenter: { type: 'online' },
        OR: [
          { programIds: { has: student.programId || '' } },
          ...(student.academicBatchId ? [{ batches: { some: { id: student.academicBatchId } } }] : [])
        ]
      }
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      description: true,
      videoUrl: true,
      academicClass: { select: { name: true } }
    }
  });

  res.json({ success: true, data: videos });
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

  // The student portal (web and mobile) reads invoiceNumber / paidAmount /
  // balanceAmount, an upper-case status and payments with paymentDate,
  // transactionId and paymentMethod. Add those next to the stored fields so
  // invoices and receipts show correctly (they came out blank before).
  const data = invoices.map((inv: any) => {
    const total = Number(inv.total ?? inv.amount ?? 0);
    const received = (inv.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    // An invoice marked paid counts as fully paid even if its payment rows are missing.
    const paidAmount = inv.status === 'paid' ? Math.max(received, total) : received;
    const balanceAmount = Math.max(total - paidAmount, 0);
    const status = balanceAmount <= 0 && (paidAmount > 0 || total === 0)
      ? 'PAID'
      : paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING';
    return {
      ...inv,
      invoiceNumber: inv.invoiceNo,
      subtotal: inv.amount,
      amount: total,
      paidAmount,
      balanceAmount,
      status,
      payments: (inv.payments || []).map((p: any) => ({
        ...p,
        paymentDate: p.receivedAt || p.createdAt,
        transactionId: p.referenceNo || null,
        paymentMethod: p.method || 'cash',
      })),
    };
  });
  res.json({ success: true, data });
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
  
  const { moduleLessonId, watchDuration = 10, position, duration, completed } = req.body;
  if (!moduleLessonId) return res.status(400).json({ success: false, message: 'moduleLessonId is required' });

  // Access validation (fee lock & daily limit)
  const accessCheck = await checkLessonAccessForStudent(student, moduleLessonId);
  if (!accessCheck.allowed) {
    return res.status(accessCheck.status || 403).json({
      success: false,
      message: accessCheck.message,
      reason: accessCheck.reason
    });
  }

  const playedSeconds = Math.min(60, Math.max(0, Number(watchDuration) || 0));
  
  const existingLog = await prisma.studentVideoLog.findUnique({
    where: { studentId_moduleLessonId: { studentId: student.id, moduleLessonId } }
  });

  const progress = computeVideoProgress(existingLog, {
    position,
    duration,
    playedSeconds,
    markCompleted: completed === true
  });

  const log = existingLog
    ? await prisma.studentVideoLog.update({
        where: { id: existingLog.id },
        data: {
          ...progress,
          watchDuration: { increment: playedSeconds },
          lastWatchedAt: new Date()
        }
      })
    : await prisma.studentVideoLog.create({
        data: {
          ...progress,
          studentId: student.id,
          moduleLessonId,
          organizationId: req.user.organizationId,
          watchDuration: playedSeconds,
          viewCount: 1
        }
      });

  res.status(200).json({
    success: true,
    data: { ...log, watchedPercent: getWatchedPercent(log), resumePosition: getResumePosition(log) }
  });
});

export const recordVideoView = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  
  const { moduleLessonId } = req.body;
  if (!moduleLessonId) return res.status(400).json({ success: false, message: 'moduleLessonId is required' });

  // Access validation (fee lock & daily limit)
  const accessCheck = await checkLessonAccessForStudent(student, moduleLessonId);
  if (!accessCheck.allowed) {
    return res.status(accessCheck.status || 403).json({
      success: false,
      message: accessCheck.message,
      reason: accessCheck.reason
    });
  }
  
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

// --- Lesson doubts and notes ---

const MAX_POST_LENGTH = 2000;

// The lesson, if it belongs to a class this student takes.
function findStudentLesson(student: any, lessonId: string) {
  return prisma.moduleLesson.findFirst({
    where: {
      id: lessonId,
      organizationId: student.organizationId,
      classModule: {
        academicClass: {
          OR: [
            { academicCenter: { type: 'online' }, programIds: { has: student.programId || '' } },
            ...(student.academicBatchId ? [{ batches: { some: { id: student.academicBatchId } } }] : [])
          ]
        }
      }
    },
    select: { id: true }
  });
}

const DOUBT_INCLUDE = {
  student: { select: { id: true, name: true } },
  replies: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      student: { select: { id: true, name: true } },
      faculty: { select: { id: true, name: true } }
    }
  }
};

export const getLessonDoubts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });
  if (!await findStudentLesson(student, req.params.lessonId)) {
    return res.status(404).json({ success: false, message: 'Lesson not found' });
  }

  const doubts = await prisma.lessonDoubt.findMany({
    where: { moduleLessonId: req.params.lessonId },
    orderBy: { createdAt: 'desc' },
    include: DOUBT_INCLUDE
  });
  res.json({
    success: true,
    data: doubts.map(d => ({ ...d, isMine: d.studentId === student.id }))
  });
});

export const createLessonDoubt = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });
  if (!await findStudentLesson(student, req.params.lessonId)) {
    return res.status(404).json({ success: false, message: 'Lesson not found' });
  }

  const question = String(req.body.question || '').trim();
  if (!question || question.length > MAX_POST_LENGTH) {
    return res.status(400).json({ success: false, message: `Enter a question of up to ${MAX_POST_LENGTH} characters` });
  }

  const doubt = await prisma.lessonDoubt.create({
    data: {
      question,
      moduleLessonId: req.params.lessonId,
      studentId: student.id,
      organizationId: student.organizationId
    },
    include: DOUBT_INCLUDE
  });
  res.status(201).json({ success: true, data: { ...doubt, isMine: true } });
});

export const replyToLessonDoubt = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });

  const doubt = await prisma.lessonDoubt.findUnique({ where: { id: req.params.doubtId } });
  if (!doubt || !await findStudentLesson(student, doubt.moduleLessonId)) {
    return res.status(404).json({ success: false, message: 'Doubt not found' });
  }

  const message = String(req.body.message || '').trim();
  if (!message || message.length > MAX_POST_LENGTH) {
    return res.status(400).json({ success: false, message: `Enter a reply of up to ${MAX_POST_LENGTH} characters` });
  }

  const reply = await prisma.lessonDoubtReply.create({
    data: { message, doubtId: doubt.id, studentId: student.id, organizationId: doubt.organizationId },
    include: { student: { select: { id: true, name: true } }, faculty: { select: { id: true, name: true } } }
  });
  res.status(201).json({ success: true, data: reply });
});

function parseVideoSeconds(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const seconds = Math.round(Number(value));
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

export const getLessonNotes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });

  const notes = await prisma.lessonNote.findMany({
    where: { moduleLessonId: req.params.lessonId, studentId: student.id },
    orderBy: [{ videoSeconds: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]
  });
  res.json({ success: true, data: notes });
});

export const createLessonNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });
  if (!await findStudentLesson(student, req.params.lessonId)) {
    return res.status(404).json({ success: false, message: 'Lesson not found' });
  }

  const content = String(req.body.content || '').trim();
  const videoSeconds = parseVideoSeconds(req.body.videoSeconds);
  if ((!content && videoSeconds === null) || content.length > MAX_POST_LENGTH) {
    return res.status(400).json({ success: false, message: `Enter a note of up to ${MAX_POST_LENGTH} characters` });
  }

  const note = await prisma.lessonNote.create({
    data: {
      content,
      videoSeconds,
      moduleLessonId: req.params.lessonId,
      studentId: student.id,
      organizationId: student.organizationId
    }
  });
  res.status(201).json({ success: true, data: note });
});

export const updateLessonNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });

  const note = await prisma.lessonNote.findFirst({ where: { id: req.params.noteId, studentId: student.id } });
  if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

  const content = String(req.body.content || '').trim();
  if ((!content && note.videoSeconds === null) || content.length > MAX_POST_LENGTH) {
    return res.status(400).json({ success: false, message: `Enter a note of up to ${MAX_POST_LENGTH} characters` });
  }

  const updated = await prisma.lessonNote.update({ where: { id: note.id }, data: { content } });
  res.json({ success: true, data: updated });
});

export const deleteLessonNote = asyncHandlerWithoutDeleteApproval(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });

  const note = await prisma.lessonNote.findFirst({ where: { id: req.params.noteId, studentId: student.id } });
  if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

  await prisma.lessonNote.delete({ where: { id: note.id } });
  res.json({ success: true, message: 'Note deleted' });
});
