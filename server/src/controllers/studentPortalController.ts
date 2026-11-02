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

// Helper: evaluate fee-paid percentage based video locking for a student
function evaluateFeeLock(
  config: any,
  invoices: any[],
  schedules: any[],
  feeStructures: any[] = [],
  student?: any
) {
  if (!config?.feeLocking?.enabled) {
    return { isFeeLocked: false, message: '', totalFee: 0, paidFee: 0, paidPercentage: 100, minPaidPercentage: 0 };
  }

  const minPaidPercentage = Number(config.feeLocking?.minPaidPercentage ?? 50);
  const gracePeriodDays = Number(config.feeLocking?.gracePeriodDays ?? 0);
  const lockMessage = config.feeLocking?.lockMessage;

  // Check enrollment grace period if configured
  if (gracePeriodDays > 0 && student) {
    const studentJoinDate = student.enrolledAt || student.joinDate || student.createdAt;
    if (studentJoinDate) {
      const now = Date.now();
      const joinTime = new Date(studentJoinDate).getTime();
      const daysSinceJoin = (now - joinTime) / (24 * 60 * 60 * 1000);
      if (daysSinceJoin < gracePeriodDays) {
        return { isFeeLocked: false, message: '', totalFee: 0, paidFee: 0, paidPercentage: 100, minPaidPercentage };
      }
    }
  }

  // Calculate Total Fee and Paid Fee from the Fee System
  // 1. Payment Schedules (student's scheduled installments)
  let scheduleTotal = 0;
  let schedulePaid = 0;
  if (schedules && schedules.length > 0) {
    for (const sch of schedules) {
      const amt = Number(sch.amount || 0);
      scheduleTotal += amt;
      if (sch.status?.toUpperCase() === 'PAID' || sch.paidAt) {
        schedulePaid += amt;
      } else if (sch.paidAmount) {
        schedulePaid += Number(sch.paidAmount);
      }
    }
  }

  // 2. Invoices & Payments (direct billed records)
  let invoiceTotal = 0;
  let invoicePaid = 0;
  if (invoices && invoices.length > 0) {
    for (const inv of invoices) {
      const invTotal = Number(inv.total ?? inv.amount ?? 0);
      invoiceTotal += invTotal;
      const received = (inv.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const paid = inv.status?.toLowerCase() === 'paid' ? Math.max(received, invTotal) : received;
      invoicePaid += paid;
    }
  }

  // 3. Fee Structure (canonical program fee structure)
  let structureTotal = 0;
  if (feeStructures && feeStructures.length > 0) {
    const fs = feeStructures[0];
    const base = (fs.tuitionFee || 0) + (fs.registrationFee || 0) + (fs.examFee || 0);
    structureTotal = base + (base * (fs.gstPercentage || 0)) / 100;
  }

  // Determine effective totalFee and paidFee
  let totalFee = 0;
  let paidFee = 0;

  if (scheduleTotal > 0) {
    totalFee = scheduleTotal;
    paidFee = Math.max(schedulePaid, invoicePaid);
  } else if (invoiceTotal > 0) {
    totalFee = invoiceTotal;
    paidFee = invoicePaid;
  } else if (structureTotal > 0) {
    totalFee = structureTotal;
    paidFee = Math.max(schedulePaid, invoicePaid);
  } else {
    // If no fee records exist for this student, do not arbitrarily lock
    return {
      isFeeLocked: false,
      message: '',
      totalFee: 0,
      paidFee: 0,
      paidPercentage: 100,
      minPaidPercentage
    };
  }

  // Calculate percentage (0 - 100%)
  const paidPercentage = totalFee > 0 ? Math.min(100, Math.round((paidFee / totalFee) * 100)) : 100;

  if (paidPercentage < minPaidPercentage) {
    const defaultMsg = `Video lectures are locked because you have paid ${paidPercentage}% of your total course fee (₹${paidFee.toLocaleString('en-IN')} of ₹${totalFee.toLocaleString('en-IN')}). A minimum payment of ${minPaidPercentage}% is required to unlock.`;
    
    let finalMsg = defaultMsg;
    if (lockMessage && lockMessage.trim()) {
      finalMsg = lockMessage
        .replace(/{paidPercent}/g, paidPercentage.toString())
        .replace(/{requiredPercent}/g, minPaidPercentage.toString())
        .replace(/{paidFee}/g, paidFee.toLocaleString('en-IN'))
        .replace(/{totalFee}/g, totalFee.toLocaleString('en-IN'));
    }

    return {
      isFeeLocked: true,
      message: finalMsg,
      totalFee,
      paidFee,
      paidPercentage,
      minPaidPercentage
    };
  }

  return {
    isFeeLocked: false,
    message: '',
    totalFee,
    paidFee,
    paidPercentage,
    minPaidPercentage
  };
}

// Helper: compute effective daily viewing limit (program config, program override or center default)
function getEffectiveDailyLimit(config: any, programId?: string): number | null {
  if (!config?.dailyClassLimitEnabled) return null;

  // If program-specific config, dailyClassLimit applies directly
  if (typeof config.dailyClassLimit === 'number' && config.dailyClassLimit > 0) {
    return config.dailyClassLimit;
  }

  // Fallback for legacy center config with programLimits array
  if (programId && Array.isArray(config.programLimits)) {
    const programOverride = config.programLimits.find((p: any) => p.programId === programId && p.enabled);
    if (programOverride && typeof programOverride.dailyClassLimit === 'number' && programOverride.dailyClassLimit > 0) {
      return programOverride.dailyClassLimit;
    }
  }

  return null;
}

// Helper: check access permissions for a specific lesson before recording watch duration
async function checkLessonAccessForStudent(student: any, moduleLessonId: string) {
  const lesson = await prisma.moduleLesson.findUnique({
    where: { id: moduleLessonId },
    include: {
      classModule: {
        include: { academicClass: true }
      },
      classSubModule: {
        include: {
          classModule: {
            include: { academicClass: true }
          }
        }
      }
    }
  });

  if (!lesson) {
    return { allowed: false, status: 404, message: 'Lesson not found' };
  }

  const academicClass = lesson.classSubModule?.classModule?.academicClass || lesson.classModule?.academicClass;
  const centerId = academicClass?.academicCenterId || student.centerId;

  const [org, invoices, schedules, feeStructures] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: student.organizationId },
      select: { metadata: true }
    }),
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
      }
    })
  ]);

  const orgMetadata = (org?.metadata as any) || {};
  const programConfigs = orgMetadata.programAccessConfigs || {};
  const centerConfigs = orgMetadata.academicCenterConfigs || {};

  // Prioritize program-specific configuration over center-level
  const activeConfig = (student.programId ? programConfigs[student.programId] : null)
    || (centerId ? centerConfigs[centerId] : null)
    || (student.centerId ? centerConfigs[student.centerId] : null);

  // 1. Fee Lock check (percentage based)
  const feeStatus = evaluateFeeLock(activeConfig, invoices, schedules, feeStructures, student);
  if (feeStatus.isFeeLocked) {
    return {
      allowed: false,
      status: 403,
      reason: 'fee_overdue',
      message: feeStatus.message,
      feeDetails: {
        totalFee: feeStatus.totalFee,
        paidFee: feeStatus.paidFee,
        paidPercentage: feeStatus.paidPercentage,
        minPaidPercentage: feeStatus.minPaidPercentage
      }
    };
  }

  // 2. Daily limit check
  const effectiveDailyLimit = getEffectiveDailyLimit(activeConfig, student.programId);
  if (effectiveDailyLimit !== null) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const todayLogs = await prisma.studentVideoLog.findMany({
      where: {
        studentId: student.id,
        lastWatchedAt: { gte: startOfToday },
        watchDuration: { gt: 0 }
      }
    });

    const watchedTodayIds = new Set(todayLogs.map(l => l.moduleLessonId));
    if (!watchedTodayIds.has(moduleLessonId)) {
      if (watchedTodayIds.size >= effectiveDailyLimit) {
        return {
          allowed: false,
          status: 403,
          reason: 'daily_limit',
          message: `Daily limit of ${effectiveDailyLimit} classes reached for today. New classes unlock tomorrow at 12:00 AM.`
        };
      }
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

  // 2. Fetch online classes via implicit program matching
  const onlineClasses = await prisma.academicClass.findMany({
    where: {
      organizationId: student.organizationId,
      programIds: { has: student.programId || '' },
      academicCenter: { type: 'online' }
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

  // 3. Fetch Organization Metadata (for center accessConfigs), Video Logs, Invoices, Payment Schedules, and Fee Structures
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const [org, allVideoLogs, todayVideoLogs, studentInvoices, studentSchedules, studentFeeStructures] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: student.organizationId },
      select: { metadata: true }
    }),
    prisma.studentVideoLog.findMany({
      where: { studentId: student.id }
    }),
    prisma.studentVideoLog.findMany({
      where: {
        studentId: student.id,
        lastWatchedAt: { gte: startOfToday },
        watchDuration: { gt: 0 }
      }
    }),
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
      }
    })
  ]);

  const orgMetadata = (org?.metadata as any) || {};
  const programConfigs = orgMetadata.programAccessConfigs || {};
  const centerConfigs = orgMetadata.academicCenterConfigs || {};
  const watchedLessonsToday = new Set(todayVideoLogs.map(l => l.moduleLessonId));
  const watchedCountToday = watchedLessonsToday.size;
  const studentProgramConfig = student.programId ? programConfigs[student.programId] : null;

  // Format Offline Classes
  const offlineResultData = batches.filter(b => b.academicClass).map(batch => {
    const classData = batch.academicClass;
    const activeConfig = studentProgramConfig
      || (classData.academicCenterId ? centerConfigs[classData.academicCenterId] : null)
      || (student.centerId ? centerConfigs[student.centerId] : null)
      || null;

    const feeStatus = evaluateFeeLock(activeConfig, studentInvoices, studentSchedules, studentFeeStructures, student);
    const effectiveDailyLimit = getEffectiveDailyLimit(activeConfig, student.programId);
    const isDailyLimitReached = effectiveDailyLimit !== null && watchedCountToday >= effectiveDailyLimit;

    const formatOfflineLesson = (lesson: any) => {
      const session = lesson.academicSessions.find((s: any) => s.status === 'COMPLETED' && s.academicBatchId === batch.id);
      const isCompleted = !!session;
      const myAttendance = session?.attendances?.[0] || null;
      const watchedToday = watchedLessonsToday.has(lesson.id);

      let isFeeLocked = false;
      let isDailyLimitLocked = false;
      let lockReason: string | null = null;
      let lockMessage: string | null = null;

      if (lesson.videoUrl && feeStatus.isFeeLocked) {
        isFeeLocked = true;
        lockReason = 'fee_overdue';
        lockMessage = feeStatus.message;
      } else if (lesson.videoUrl && isDailyLimitReached && !watchedToday && !isCompleted) {
        isDailyLimitLocked = true;
        lockReason = 'daily_limit';
        lockMessage = `Daily viewing limit of ${effectiveDailyLimit} classes reached for today (${watchedCountToday}/${effectiveDailyLimit} watched). New classes unlock tomorrow at 12:00 AM.`;
      }

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
        isFeeLocked,
        isDailyLimitLocked,
        lockReason,
        lockMessage,
        dailyLimit: effectiveDailyLimit,
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
      centerName: classData.academicCenter?.name,
      dailyLimit: effectiveDailyLimit,
      watchedTodayCount: watchedCountToday,
      isFeeLocked: feeStatus.isFeeLocked,
      feeLockMessage: feeStatus.message,
      totalFee: feeStatus.totalFee,
      paidFee: feeStatus.paidFee,
      paidPercentage: feeStatus.paidPercentage,
      minPaidPercentage: feeStatus.minPaidPercentage
    };
  });

  // Format Online Classes
  const onlineResultData = onlineClasses.map(classData => {
    const activeConfig = studentProgramConfig
      || (classData.academicCenterId ? centerConfigs[classData.academicCenterId] : null)
      || (student.centerId ? centerConfigs[student.centerId] : null)
      || null;

    const feeStatus = evaluateFeeLock(activeConfig, studentInvoices, studentSchedules, studentFeeStructures, student);
    const effectiveDailyLimit = getEffectiveDailyLimit(activeConfig, student.programId);
    const isDailyLimitReached = effectiveDailyLimit !== null && watchedCountToday >= effectiveDailyLimit;

    const formatOnlineLesson = (lesson: any) => {
      const log = allVideoLogs.find(l => l.moduleLessonId === lesson.id);
      const isVideoWatched = !lesson.videoUrl || !!(log && log.watchDuration > 0);
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
      } else if (lesson.videoUrl && isDailyLimitReached && !watchedToday && !isVideoWatched) {
        isDailyLimitLocked = true;
        lockReason = 'daily_limit';
        lockMessage = `Daily viewing limit of ${effectiveDailyLimit} classes reached for today (${watchedCountToday}/${effectiveDailyLimit} watched). New classes unlock tomorrow at 12:00 AM.`;
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
        videoUrl: lesson.videoUrl || null,
        isFeeLocked,
        isDailyLimitLocked,
        lockReason,
        lockMessage,
        dailyLimit: effectiveDailyLimit,
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
      dailyLimit: effectiveDailyLimit,
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
  
  const { moduleLessonId, watchDuration = 10 } = req.body;
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
