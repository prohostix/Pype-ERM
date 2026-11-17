import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isIncharge, parseInchargeIds } from '../utils/incharge.js';

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

  // inchargeIds is a plain list of faculty ids: look the names up once for all classes
  const facultyIds = [...new Set(classes.flatMap((c) => c.inchargeIds))];
  const faculty = facultyIds.length
    ? await prisma.faculty.findMany({ where: { id: { in: facultyIds }, organizationId }, select: { id: true, name: true, email: true } })
    : [];
  const byId = new Map(faculty.map((f) => [f.id, f]));
  const data = classes.map((c) => ({ ...c, incharges: c.inchargeIds.map((id) => byId.get(id)).filter(Boolean) }));

  res.json({ success: true, data });
});

export const createClass = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const { name, academicCenterId, programIds, status } = req.body;
  const inchargeIds = parseInchargeIds(req.body.inchargeIds, req.body.inchargeId);

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


  if (inchargeIds.length > 0) {
    const found = await prisma.faculty.count({ where: { id: { in: inchargeIds }, organizationId } });
    if (found !== inchargeIds.length) {
      return res.status(400).json({ success: false, message: 'One or more selected principals were not found' });
    }
  }

  const academicClass = await prisma.academicClass.create({
    data: {
      name,
      academicCenterId,
      programIds: programIds || [],
      status: status || 'active',
      inchargeId: inchargeIds[0] ?? null,
      inchargeIds,
      organizationId,
      ...(center.type === 'online' && {
        batches: {
          create: [{
            name: 'Global Online Batch',
            status: 'active',
            organizationId
          }]
        }
      })
    }
  });

  res.status(201).json({ success: true, data: academicClass, message: 'Academic class created successfully' });
});

export const updateClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const { name, programIds, status } = req.body;
  const inchargeIds = parseInchargeIds(req.body.inchargeIds, req.body.inchargeId);

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


  if (inchargeIds.length > 0) {
    const found = await prisma.faculty.count({ where: { id: { in: inchargeIds }, organizationId } });
    if (found !== inchargeIds.length) {
      return res.status(400).json({ success: false, message: 'One or more selected principals were not found' });
    }
  }

  const academicClass = await prisma.academicClass.update({
    where: { id },
    data: {
      name,
      programIds,
      status,
      inchargeId: inchargeIds[0] ?? null,
      inchargeIds
    }
  });

  res.json({ success: true, data: academicClass, message: 'Academic class updated successfully' });
});

export const deleteClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const reason = req.body.reason || req.headers['x-delete-reason'];

  const existingClass = await prisma.academicClass.findFirst({
    where: { id, organizationId }
  });

  if (!existingClass) {
    return res.status(404).json({ success: false, message: 'Academic class not found' });
  }

  if (user.role !== 'ceo' && user.role !== 'superadmin' && reason) {
    const requestData: any = {
      organization: { connect: { id: organizationId } },
      entityType: 'academic-class',
      entityId: id,
      requestType: 'delete',
      reason: reason as string
    };
    
    if (user.role === 'faculty') {
      requestData.faculty = { connect: { id: user.id } };
    } else {
      requestData.user = { connect: { id: user.id } };
    }

    await prisma.editDeleteRequest.create({
      data: requestData
    });
    return res.status(202).json({ success: true, message: 'Delete request sent to CEO for approval' });
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
    if (!academicClass || !isIncharge(academicClass, user.id)) {
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


// @desc    Students of an online class: allocated to one of its batches, or enrolled in one of its programs
// @route   GET /api/v1/academic-classes/:id/students
// @access  Private (org admin)
export const getClassStudents = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const organizationId = (req as any).user.organizationId;

  const academicClass = await prisma.academicClass.findFirst({
    where: { id, organizationId },
    select: { programIds: true, batches: { select: { id: true } } }
  });
  if (!academicClass) {
    return res.status(404).json({ success: false, message: 'Academic class not found' });
  }

  const students = await prisma.student.findMany({
    where: {
      organizationId,
      status: { not: 'rejected' },
      OR: [
        { programId: { in: academicClass.programIds } },
        { academicBatchId: { in: academicClass.batches.map((b) => b.id) } }
      ]
    },
    select: {
      id: true, name: true, email: true, enrollmentNo: true,
      program: { select: { name: true } },
      videoBlocked: true, videoBlockReason: true
    },
    orderBy: { name: 'asc' },
    take: 2000
  });

  res.json({ success: true, data: students });
});
