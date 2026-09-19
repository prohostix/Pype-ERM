import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getClassesByCenter = asyncHandler(async (req: Request, res: Response) => {
  const { centerId } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;

  if (!organizationId) {
    return res.status(400).json({ success: false, message: 'Organization ID is required' });
  }

  const classes = await prisma.academicClass.findMany({
    where: { academicCenterId: centerId, organizationId },
    include: {
      incharge: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: classes });
});

export const createClass = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const { name, academicCenterId, programIds, status, inchargeId } = req.body;

  if (!name || !academicCenterId) {
    return res.status(400).json({ success: false, message: 'Name and academic center ID are required' });
  }

  // Validate that center exists and belongs to the org
  const center = await prisma.academicCenter.findFirst({
    where: { id: academicCenterId, organizationId }
  });

  if (!center) {
    return res.status(404).json({ success: false, message: 'Academic center not found' });
  }

  // Optional: Ensure programIds being assigned are actually part of the center's programIds
  if (programIds && programIds.length > 0) {
    const invalidPrograms = programIds.filter((p: string) => !center.programIds.includes(p));
    if (invalidPrograms.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot assign programs that are not offered by the academic center' });
    }
  }

  const academicClass = await prisma.academicClass.create({
    data: {
      name,
      academicCenterId,
      programIds: programIds || [],
      status: status || 'active',
      inchargeId: inchargeId || null,
      organizationId
    }
  });

  res.status(201).json({ success: true, data: academicClass, message: 'Academic class created successfully' });
});

export const updateClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const { name, programIds, status, inchargeId } = req.body;

  const existingClass = await prisma.academicClass.findFirst({
    where: { id, organizationId },
    include: { academicCenter: true }
  });

  if (!existingClass) {
    return res.status(404).json({ success: false, message: 'Academic class not found' });
  }

  if (programIds && programIds.length > 0) {
    const invalidPrograms = programIds.filter((p: string) => !existingClass.academicCenter.programIds.includes(p));
    if (invalidPrograms.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot assign programs that are not offered by the academic center' });
    }
  }

  const academicClass = await prisma.academicClass.update({
    where: { id },
    data: {
      name,
      programIds,
      status,
      inchargeId: inchargeId || null
    }
  });

  res.json({ success: true, data: academicClass, message: 'Academic class updated successfully' });
});

export const deleteClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;

  const existingClass = await prisma.academicClass.findFirst({
    where: { id, organizationId }
  });

  if (!existingClass) {
    return res.status(404).json({ success: false, message: 'Academic class not found' });
  }

  await prisma.academicClass.delete({
    where: { id }
  });

  res.json({ success: true, message: 'Academic class deleted successfully' });
});


// @desc    Get transfer history for an academic class
// @route   GET /api/v1/academic-classes/:id/transfer-history
// @access  Private
export const getTransferHistory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;

  if (!organizationId) {
    return res.status(400).json({ success: false, message: 'Organization ID is required' });
  }

  if (user.role === 'faculty') {
    const academicClass = await prisma.academicClass.findFirst({
      where: { id, organizationId }
    });
    if (!academicClass || academicClass.inchargeId !== user.id) {
      return res.status(403).json({ success: false, message: 'Only the principal in charge can view transfer history' });
    }
  }

  const history = await prisma.studentBatchTransfer.findMany({
    where: {
      academicClassId: id,
      organizationId
    },
    include: {
      student: { select: { name: true, enrollmentNo: true } },
      fromBatch: { select: { name: true } },
      toBatch: { select: { name: true } },
      transferredBy: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: history });
});
