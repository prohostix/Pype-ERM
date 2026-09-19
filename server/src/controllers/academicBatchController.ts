import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getBatchesByClass = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;

  if (!organizationId) {
    return res.status(400).json({ success: false, message: 'Organization ID is required' });
  }

  const batches = await prisma.academicBatch.findMany({
    where: { academicClassId: classId, organizationId },
    include: {
      _count: {
        select: { students: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: batches });
});

export const createBatch = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const { name, academicClassId, startDate, endDate, capacity, status } = req.body;

  if (!name || !academicClassId) {
    return res.status(400).json({ success: false, message: 'Name and academic class ID are required' });
  }

  // Validate that class exists and belongs to the org
  const academicClass = await prisma.academicClass.findFirst({
    where: { id: academicClassId, organizationId }
  });

  if (!academicClass) {
    return res.status(404).json({ success: false, message: 'Academic class not found' });
  }

  const batch = await prisma.academicBatch.create({
    data: {
      name,
      academicClassId,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      capacity: capacity ? parseInt(capacity) : null,
      status: status || 'active',
      organizationId
    }
  });

  res.status(201).json({ success: true, data: batch, message: 'Academic batch created successfully' });
});

export const updateBatch = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const { name, startDate, endDate, capacity, status } = req.body;

  const existingBatch = await prisma.academicBatch.findFirst({
    where: { id, organizationId }
  });

  if (!existingBatch) {
    return res.status(404).json({ success: false, message: 'Academic batch not found' });
  }

  const batch = await prisma.academicBatch.update({
    where: { id },
    data: {
      name,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      capacity: capacity ? parseInt(capacity) : null,
      status
    }
  });

  res.json({ success: true, data: batch, message: 'Academic batch updated successfully' });
});

export const deleteBatch = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;

  const existingBatch = await prisma.academicBatch.findFirst({
    where: { id, organizationId }
  });

  if (!existingBatch) {
    return res.status(404).json({ success: false, message: 'Academic batch not found' });
  }

  await prisma.academicBatch.delete({
    where: { id }
  });

  res.json({ success: true, message: 'Academic batch deleted successfully' });
});

// --- Student Allocation Features ---

export const getBatchStudents = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;

  const batch = await prisma.academicBatch.findFirst({
    where: { id, organizationId },
    include: {
      students: {
        select: { id: true, name: true, enrollmentNo: true, programId: true }
      }
    }
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  const currentCount = batch.students.length;
  const remainingSlots = batch.capacity ? batch.capacity - currentCount : null;

  res.json({
    success: true,
    data: {
      students: batch.students,
      currentCount,
      remainingSlots,
      capacity: batch.capacity
    }
  });
});

export const getUnallocatedStudents = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;

  const batch = await prisma.academicBatch.findFirst({
    where: { id, organizationId },
    include: {
      academicClass: {
        include: {
          academicCenter: true
        }
      }
    }
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  const classObj = batch.academicClass;
  const centerId = classObj.academicCenter.id;
  const programIds = classObj.programIds;

  // Find students in the same center, same programs, and not assigned to any batch
  const unallocatedStudents = await prisma.student.findMany({
    where: {
      organizationId,
      programId: { in: programIds },
      academicBatchId: null,
      status: { not: 'rejected' } // Only consider non-rejected students
    },
    select: { id: true, name: true, enrollmentNo: true, programId: true }
  });

  res.json({ success: true, data: unallocatedStudents });
});

export const smartAllocate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;

  const batch = await prisma.academicBatch.findFirst({
    where: { id, organizationId },
    include: {
      academicClass: {
        include: { academicCenter: true }
      },
      _count: {
        select: { students: true }
      }
    }
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  if (user.role === 'faculty' && batch.academicClass.inchargeId !== user.id) {
    return res.status(403).json({ success: false, message: 'Only the principal in charge can allocate students to this batch' });
  }

  const currentCount = batch._count.students;
  if (batch.capacity && currentCount >= batch.capacity) {
    return res.status(400).json({ success: false, message: 'Batch is already at full capacity' });
  }

  const limit = batch.capacity ? batch.capacity - currentCount : undefined;

  const classObj = batch.academicClass;
  const centerId = classObj.academicCenter.id;
  const programIds = classObj.programIds;

  // Get eligible students
  const unallocatedStudents = await prisma.student.findMany({
    where: {
      organizationId,
      programId: { in: programIds },
      academicBatchId: null,
      status: { not: 'rejected' }
    },
    take: limit,
    orderBy: { createdAt: 'asc' } // oldest first
  });

  if (unallocatedStudents.length === 0) {
    return res.status(400).json({ success: false, message: 'No eligible unallocated students found' });
  }

  const studentIds = unallocatedStudents.map(s => s.id);

  
  const historyData = studentIds.map((sid: string) => ({
    studentId: sid,
    toBatchId: batch.id,
    academicClassId: batch.academicClassId,
    transferredById: user.role === 'faculty' ? null : user.id,
    transferredByFacultyId: user.role === 'faculty' ? user.id : null,
    organizationId,
    reason: 'Initial Smart Allocation'
  }));

  await prisma.$transaction([
    prisma.student.updateMany({
      where: { id: { in: studentIds } },
      data: { academicBatchId: batch.id }
    }),
    prisma.studentBatchTransfer.createMany({
      data: historyData
    })
  ]);


  res.json({ 
    success: true, 
    message: `Smart allocation successful. Assigned ${studentIds.length} students to the batch.` 
  });
});

export const manualAllocate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { studentIds } = req.body;
  const user = (req as any).user;
  const organizationId = user.organizationId;

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Please provide an array of student IDs' });
  }

  const batch = await prisma.academicBatch.findFirst({
    where: { id, organizationId },
    include: {
      academicClass: true,
      _count: {
        select: { students: true }
      }
    }
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  if (user.role === 'faculty' && batch.academicClass.inchargeId !== user.id) {
    return res.status(403).json({ success: false, message: 'Only the principal in charge can allocate students to this batch' });
  }

  const currentCount = batch._count.students;
  if (batch.capacity && (currentCount + studentIds.length) > batch.capacity) {
    return res.status(400).json({ 
      success: false, 
      message: `Cannot allocate ${studentIds.length} students. Only ${batch.capacity - currentCount} slots remaining.` 
    });
  }

  
  const historyData = studentIds.map((sid: string) => ({
    studentId: sid,
    toBatchId: batch.id,
    academicClassId: batch.academicClassId,
    transferredById: user.role === 'faculty' ? null : user.id,
    transferredByFacultyId: user.role === 'faculty' ? user.id : null,
    organizationId,
    reason: 'Initial Manual Allocation'
  }));

  // Perform in transaction
  await prisma.$transaction([
    prisma.student.updateMany({
      where: { 
        id: { in: studentIds },
        organizationId
      },
      data: { academicBatchId: batch.id }
    }),
    prisma.studentBatchTransfer.createMany({
      data: historyData
    })
  ]);


  res.json({ 
    success: true, 
    message: `Successfully allocated ${studentIds.length} students to the batch.` 
  });
});


// @desc    Transfer student to another batch
// @route   POST /api/v1/academic-batches/:id/transfer
// @access  Private
export const transferStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id: fromBatchId } = req.params;
  const { studentId, toBatchId, reason } = req.body;
  const user = (req as any).user;
  const organizationId = user.organizationId;

  if (!organizationId) {
    return res.status(400).json({ success: false, message: 'Organization ID is required' });
  }

  if (!studentId || !toBatchId) {
    return res.status(400).json({ success: false, message: 'Student ID and Target Batch ID are required' });
  }

  if (fromBatchId === toBatchId) {
    return res.status(400).json({ success: false, message: 'Source and target batches cannot be the same' });
  }

  const fromBatch = await prisma.academicBatch.findUnique({
    where: { id: fromBatchId },
    include: { academicClass: true }
  });

  if (!fromBatch || fromBatch.organizationId !== organizationId) {
    return res.status(404).json({ success: false, message: 'Source batch not found' });
  }

  if (user.role === 'faculty' && fromBatch.academicClass.inchargeId !== user.id) {
    return res.status(403).json({ success: false, message: 'Only the principal in charge can transfer students from this batch' });
  }

  const toBatch = await prisma.academicBatch.findUnique({
    where: { id: toBatchId },
    include: { _count: { select: { students: true } } }
  });

  if (!toBatch || toBatch.organizationId !== organizationId) {
    return res.status(404).json({ success: false, message: 'Target batch not found' });
  }

  if (fromBatch.academicClassId !== toBatch.academicClassId) {
    return res.status(400).json({ success: false, message: 'Target batch must be in the same Academic Class' });
  }

  if (toBatch.capacity && toBatch._count.students >= toBatch.capacity) {
    return res.status(400).json({ success: false, message: 'Target batch is at full capacity' });
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  if (!student || student.organizationId !== organizationId) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  if (student.academicBatchId !== fromBatchId) {
    return res.status(400).json({ success: false, message: 'Student is not currently enrolled in the source batch' });
  }

  // Perform transfer in a transaction
  await prisma.$transaction([
    prisma.student.update({
      where: { id: studentId },
      data: { academicBatchId: toBatchId }
    }),
    prisma.studentBatchTransfer.create({
      data: {
        studentId,
        fromBatchId,
        toBatchId,
        academicClassId: fromBatch.academicClassId,
        transferredById: user.role === 'faculty' ? null : user.id,
        transferredByFacultyId: user.role === 'faculty' ? user.id : null,
        organizationId,
        reason: reason || null
      }
    })
  ]);

  res.json({ success: true, message: 'Student successfully transferred' });
});
