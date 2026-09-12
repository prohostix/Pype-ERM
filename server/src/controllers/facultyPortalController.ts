import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { emitToUser } from '../config/socket.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get classes managed by the logged-in faculty
// @route   GET /api/v1/faculty-portal/classes
// @access  Private (Faculty only)
export const getMyClasses = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const classes = await prisma.academicClass.findMany({
    where: { inchargeId: req.user.id },
    include: {
      organization: { select: { id: true, name: true } },
      _count: { select: { batches: true } }
    }
  });
  res.status(200).json({ success: true, data: classes });
});

export const getClassBatches = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { classId } = req.params;
  
  const classData = await prisma.academicClass.findUnique({ where: { id: classId } });
  if (!classData || classData.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Class not found or unauthorized' });

  const batches = await prisma.academicBatch.findMany({
    where: { academicClassId: classId, status: 'active' },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { students: true } }
    }
  });
  
  res.status(200).json({ success: true, data: batches });
});

export const getMyBatches = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const batches = await prisma.academicBatch.findMany({
    where: { academicClass: { inchargeId: req.user.id } },
    include: { academicClass: { select: { name: true } } }
  });
  res.status(200).json({ success: true, data: batches });
});

export const getMyStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { batchId } = req.params;
  const batch = await prisma.academicBatch.findUnique({ where: { id: batchId }, include: { academicClass: true } });
  if (!batch || batch.academicClass.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Batch not found or unauthorized' });

  const students = await prisma.student.findMany({
    where: { academicBatchId: batchId },
    select: { id: true, name: true, email: true, enrollmentNo: true }
  });
  res.status(200).json({ success: true, data: students });
});

export const getOrganizationFaculty = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const faculty = await prisma.faculty.findMany({
    where: { organizationId: req.user.organizationId, status: 'active' },
    select: { id: true, name: true, email: true }
  });
  res.status(200).json({ success: true, data: faculty });
});

// --- Modules Management ---
export const getModulesForClass = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { classId } = req.params;
  const ac = await prisma.academicClass.findFirst({ where: { id: classId, inchargeId: req.user.id } });
  if (!ac) return res.status(404).json({ success: false, message: 'Class not found or unauthorized' });

  const modules = await prisma.classModule.findMany({
    where: { academicClassId: classId },
    orderBy: [ { order: 'asc' }, { createdAt: 'asc' } ],
    include: { 
      lessons: { 
        include: { 
          materials: true, 
          faculty: { select: { id: true, name: true } },
          batchAssignments: { include: { faculty: { select: { id: true, name: true } }, academicBatch: { select: { id: true, name: true } } } },
          academicSessions: { select: { id: true, academicBatchId: true, status: true } }
        }, 
        orderBy: [ { order: 'asc' }, { createdAt: 'asc' } ] 
      } 
    }
  });
  res.status(200).json({ success: true, data: modules });
});

export const createModule = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { classId } = req.params;
  const { title, description, order } = req.body;
  const ac = await prisma.academicClass.findFirst({ where: { id: classId, inchargeId: req.user.id } });
  if (!ac) return res.status(404).json({ success: false, message: 'Class not found or unauthorized' });

  const mod = await prisma.classModule.create({
    data: {
      title,
      description,
      order: order || 0,
      academicClassId: classId,
      organizationId: req.user.organizationId
    }
  });
  res.status(201).json({ success: true, data: mod });
});

export const updateModule = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { moduleId } = req.params;
  const { title, description, order } = req.body;
  
  const mod = await prisma.classModule.findUnique({ where: { id: moduleId }, include: { academicClass: true } });
  if (!mod || mod.academicClass.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Module not found or unauthorized' });

  const updated = await prisma.classModule.update({
    where: { id: moduleId },
    data: { title, description, order }
  });
  res.status(200).json({ success: true, data: updated });
});

export const deleteModule = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { moduleId } = req.params;
  const mod = await prisma.classModule.findUnique({ where: { id: moduleId }, include: { academicClass: true } });
  if (!mod || mod.academicClass.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Module not found or unauthorized' });

  await prisma.classModule.delete({ where: { id: moduleId } });
  res.status(200).json({ success: true, message: 'Module deleted' });
});

// --- Lessons Management ---
export const createLesson = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { moduleId } = req.params;
  const { title, description, order, facultyId } = req.body;

  const mod = await prisma.classModule.findUnique({ where: { id: moduleId }, include: { academicClass: true } });
  if (!mod || mod.academicClass.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Module not found or unauthorized' });

  const lesson = await prisma.moduleLesson.create({
    data: {
      title,
      description,
      order: order || 0,
      classModuleId: moduleId,
      facultyId: facultyId || null,
      organizationId: req.user.organizationId
    },
    include: { faculty: { select: { id: true, name: true } } }
  });
  res.status(201).json({ success: true, data: lesson });
});

export const updateLesson = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { lessonId } = req.params;
  const { title, description, order, facultyId } = req.body;

  const lesson = await prisma.moduleLesson.findUnique({ where: { id: lessonId }, include: { classModule: { include: { academicClass: true } } } });
  if (!lesson || lesson.classModule.academicClass.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Lesson not found or unauthorized' });

  const updated = await prisma.moduleLesson.update({
    where: { id: lessonId },
    data: { title, description, order, facultyId: facultyId || null },
    include: { faculty: { select: { id: true, name: true } } }
  });
  res.status(200).json({ success: true, data: updated });
});

export const deleteLesson = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { lessonId } = req.params;
  const lesson = await prisma.moduleLesson.findUnique({ where: { id: lessonId }, include: { classModule: { include: { academicClass: true } } } });
  if (!lesson || lesson.classModule.academicClass.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Lesson not found or unauthorized' });

  await prisma.moduleLesson.delete({ where: { id: lessonId } });
  res.status(200).json({ success: true, message: 'Lesson deleted' });
});

export const assignTeacherToLesson = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { lessonId } = req.params;
  const { facultyId, reason, batchId } = req.body;

  if (!reason) return res.status(400).json({ success: false, message: 'Reason is required for assignment' });

  const lesson = await prisma.moduleLesson.findUnique({ where: { id: lessonId }, include: { classModule: { include: { academicClass: true } } } });
  if (!lesson || lesson.classModule.academicClass.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Lesson not found or unauthorized' });

  const newId = facultyId === 'none' || !facultyId ? null : facultyId;

  // Handle batch-specific assignment
  if (batchId && batchId !== 'default') {
    if (!newId) {
      // Delete the specific batch assignment if they selected "Unassigned"
      await prisma.batchLessonAssignment.deleteMany({
        where: { academicBatchId: batchId, moduleLessonId: lessonId }
      });
    } else {
      await prisma.batchLessonAssignment.upsert({
        where: { academicBatchId_moduleLessonId: { academicBatchId: batchId, moduleLessonId: lessonId } },
        update: { facultyId: newId },
        create: {
          academicBatchId: batchId,
          moduleLessonId: lessonId,
          facultyId: newId,
          organizationId: req.user.organizationId
        }
      });
    }

    // Still record history
    await prisma.lessonFacultyHistory.create({
      data: {
        moduleLessonId: lessonId,
        newFacultyId: newId,
        reason: `(Batch Specific) ${reason}`,
        changedById: req.user.id,
        organizationId: req.user.organizationId
      }
    });

    return res.status(200).json({ success: true, message: 'Batch specific teacher assigned' });
  }

  // Fallback to updating the default teacher for the lesson
  if (lesson.facultyId === newId) return res.status(200).json({ success: true, message: 'No change needed', data: lesson });

  await prisma.lessonFacultyHistory.create({
    data: {
      moduleLessonId: lessonId,
      previousFacultyId: lesson.facultyId,
      newFacultyId: newId,
      reason: `(Default) ${reason}`,
      changedById: req.user.id,
      organizationId: req.user.organizationId
    }
  });

  const updated = await prisma.moduleLesson.update({
    where: { id: lessonId },
    data: { facultyId: newId },
    include: { faculty: { select: { id: true, name: true } }, batchAssignments: { include: { faculty: true, academicBatch: true } } }
  });

  res.status(200).json({ success: true, data: updated, message: 'Default teacher assigned' });
});

export const getLessonHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { lessonId } = req.params;

  // Optimized to a single database trip to reduce network latency!
  const history = await prisma.lessonFacultyHistory.findMany({
    where: { 
      moduleLessonId: lessonId,
      moduleLesson: {
        classModule: {
          academicClass: {
            inchargeId: req.user.id
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    include: {
      previousFaculty: { select: { id: true, name: true } },
      newFaculty: { select: { id: true, name: true } },
      changedBy: { select: { id: true, name: true } }
    }
  });

  res.status(200).json({ success: true, data: history });
});

// --- Materials Management ---
export const uploadMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { lessonId } = req.params;
  const { title, description } = req.body;

  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const lesson = await prisma.moduleLesson.findUnique({ where: { id: lessonId }, include: { classModule: { include: { academicClass: true } } } });
  if (!lesson || lesson.classModule.academicClass.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Lesson not found or unauthorized' });

  const mat = await prisma.classMaterial.create({
    data: {
      title,
      description,
      fileUrl: (req.file as any).location || req.file.path,
      fileName: req.file.originalname,
      moduleLessonId: lessonId,
      uploadedBy: req.user.id,
      organizationId: req.user.organizationId
    }
  });
  res.status(201).json({ success: true, data: mat });
});

export const deleteMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { materialId } = req.params;
  const mat = await prisma.classMaterial.findUnique({ where: { id: materialId }, include: { moduleLesson: { include: { classModule: { include: { academicClass: true } } } } } });
  
  if (!mat || mat.moduleLesson.classModule.academicClass.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Material not found or unauthorized' });

  await prisma.classMaterial.delete({ where: { id: materialId } });
  res.status(200).json({ success: true, message: 'Material deleted' });
});



export const getMyAssignedLessons = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });

  // Get lessons where faculty is either the default teacher OR assigned via batch override
  const lessons = await prisma.moduleLesson.findMany({
    where: {
      OR: [
        { facultyId: req.user.id },
        { batchAssignments: { some: { facultyId: req.user.id } } }
      ]
    },
    include: {
      classModule: {
        include: {
          academicClass: {
            select: { name: true }
          }
        }
      },
      batchAssignments: {
        where: { facultyId: req.user.id },
        include: { academicBatch: { select: { name: true } } }
      },
      academicSessions: { select: { id: true, academicBatchId: true, status: true } }
    },
    orderBy: [
      { classModule: { academicClassId: 'asc' } },
      { classModule: { order: 'asc' } },
      { order: 'asc' }
    ]
  });

  res.status(200).json({ success: true, data: lessons });
});

// --- LIVE CLASS SESSIONS ---

export const startSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { academicClassId, classModuleId, moduleLessonId, academicBatchId, facultyId } = req.body;

  if (!academicClassId || !classModuleId || !moduleLessonId || !academicBatchId || !facultyId) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // Verify principal incharge
  const academicClass = await prisma.academicClass.findUnique({ where: { id: academicClassId } });
  if (!academicClass || academicClass.inchargeId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only the Principal In-Charge can start a class.' });
  }

  // Prevent starting if already ongoing or completed for this lesson and batch
  const existingSession = await prisma.academicSession.findFirst({
    where: { academicBatchId, moduleLessonId }
  });
  if (existingSession) {
    return res.status(400).json({ success: false, message: 'This lesson has already been started or completed for this batch.' });
  }

  const session = await prisma.academicSession.create({
    data: {
      academicClassId,
      classModuleId,
      moduleLessonId,
      academicBatchId,
      facultyId,
      startedById: req.user.id,
      organizationId: req.user.organizationId,
      status: 'IN_PROGRESS'
    },
    include: {
      academicClass: { select: { name: true } },
      classModule: { select: { title: true } },
      moduleLesson: { select: { title: true } },
      academicBatch: { select: { name: true } },
      faculty: { select: { name: true } }
    }
  });

  emitToUser(facultyId, 'session-started', session);

  res.status(201).json({ success: true, data: session, message: 'Class session started' });
});

export const getActiveSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });

  const sessions = await prisma.academicSession.findMany({
    where: {
      facultyId: req.user.id,
      status: 'IN_PROGRESS'
    },
    include: {
      academicClass: { select: { name: true } },
      classModule: { select: { title: true } },
      moduleLesson: { select: { title: true } },
      academicBatch: { select: { name: true } },
      startedBy: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({ success: true, data: sessions });
});

export const getSessionStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  
  const { sessionId } = req.params;
  
  const session = await prisma.academicSession.findUnique({ 
    where: { id: sessionId },
    include: { academicClass: true }
  });
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.facultyId !== req.user.id && session.academicClass?.inchargeId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied to this session' });
  }

  // Get students in this batch
  const students = await prisma.student.findMany({
    where: { academicBatchId: session.academicBatchId },
    select: { id: true, name: true, enrollmentNo: true }
  });

  // Get existing attendance for this session
  const attendances = await prisma.studentAcademicAttendance.findMany({
    where: { sessionId }
  });

  const studentsWithAttendance = students.map(student => {
    const existing = attendances.find(a => a.studentId === student.id);
    return {
      student: {
        id: student.id,
        studentName: student.name,
        admissionNumber: student.enrollmentNo,
      },
      attendance: existing ? { status: existing.status, remarks: existing.remarks } : null
    };
  });

  res.status(200).json({ success: true, data: studentsWithAttendance });
});

export const submitSessionAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { sessionId } = req.params;
  const { attendances } = req.body; // Array of { studentId, status, remarks }

  const session = await prisma.academicSession.findUnique({ where: { id: sessionId } });
  if (!session || session.facultyId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  // Bulk upsert is tricky in Prisma without raw queries if we need to return data, 
  // but since we just need to save them, we can use a transaction.
  const operations = attendances.map((att: any) => 
    prisma.studentAcademicAttendance.upsert({
      where: { sessionId_studentId: { sessionId, studentId: att.studentId } },
      update: { status: att.status, remarks: att.remarks },
      create: {
        sessionId,
        studentId: att.studentId,
        status: att.status,
        remarks: att.remarks,
        organizationId: req.user.organizationId
      }
    })
  );

  await prisma.$transaction(operations);

  res.status(200).json({ success: true, message: 'Attendance saved successfully' });
});

export const endSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { sessionId } = req.params;

  const session = await prisma.academicSession.findUnique({ where: { id: sessionId } });
  if (!session || session.facultyId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  await prisma.academicSession.update({
    where: { id: sessionId },
    data: { status: 'COMPLETED', endTime: new Date() }
  });

  emitToUser(session.facultyId, 'session-ended', sessionId);

  res.status(200).json({ success: true, message: 'Session ended successfully' });
});

export const getBatchSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { batchId } = req.params;
  
  const batch = await prisma.academicBatch.findUnique({ 
    where: { id: batchId },
    include: { academicClass: true }
  });
  
  if (!batch || batch.academicClass.inchargeId !== req.user.id) {
    return res.status(404).json({ success: false, message: 'Batch not found or unauthorized' });
  }

  const sessions = await prisma.academicSession.findMany({
    where: { academicBatchId: batchId },
    include: { 
      faculty: { select: { id: true, name: true } },
      moduleLesson: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  res.status(200).json({ success: true, data: sessions });
});
