import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAcademicCenters = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const organizationId = user.organizationId;

  if (!organizationId) {
    return res.status(400).json({ success: false, message: 'Organization ID is required' });
  }

  const centers = await prisma.academicCenter.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: centers });
});

export const getAcademicCenterById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;

  const center = await prisma.academicCenter.findFirst({
    where: { id, organizationId }
  });

  if (!center) {
    return res.status(404).json({ success: false, message: 'Academic center not found' });
  }

  res.json({ success: true, data: center });
});

export const createAcademicCenter = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const { name, type, address, programIds, status } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  const center = await prisma.academicCenter.create({
    data: {
      name,
      type: type || 'offline',
      address,
      programIds: programIds || [],
      status: status || 'active',
      organizationId
    }
  });

  res.status(201).json({ success: true, data: center, message: 'Academic center created successfully' });
});

export const updateAcademicCenter = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const { name, type, address, programIds, status } = req.body;

  const existingCenter = await prisma.academicCenter.findFirst({
    where: { id, organizationId }
  });

  if (!existingCenter) {
    return res.status(404).json({ success: false, message: 'Academic center not found' });
  }

  const center = await prisma.academicCenter.update({
    where: { id },
    data: {
      name,
      type,
      address,
      programIds,
      status
    }
  });

  res.json({ success: true, data: center, message: 'Academic center updated successfully' });
});

export const deleteAcademicCenter = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const reason = req.body.reason || req.headers['x-delete-reason'];

  const existingCenter = await prisma.academicCenter.findFirst({
    where: { id, organizationId }
  });

  if (!existingCenter) {
    return res.status(404).json({ success: false, message: 'Academic center not found' });
  }

  if (user.role !== 'ceo' && user.role !== 'superadmin' && reason) {
    const requestData: any = {
      organization: { connect: { id: organizationId } },
      entityType: 'academic-center',
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

  await prisma.academicCenter.delete({
    where: { id }
  });

  res.json({ success: true, message: 'Academic center deleted successfully' });
});
