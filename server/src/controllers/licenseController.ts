import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getLicenses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = req.user.role === 'superadmin' ? {} : { organizationId: req.user.organizationId };
  const licenses = await prisma.license.findMany({ where });
  res.status(200).json({ success: true, count: licenses.length, data: licenses });
});

export const getLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { id: req.params.id };
  if (req.user.role !== 'superadmin') where.organizationId = req.user.organizationId;
  const license = await prisma.license.findFirst({ where });
  if (!license) {
    res.status(404).json({ success: false, message: 'License not found' });
    return;
  }
  res.status(200).json({ success: true, data: license });
});

export const createLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const license = await prisma.license.create({
    data: {
      name: req.body.name,
      tag: req.body.tag,
      features: req.body.features,
      maxUsers: Number(req.body.maxUsers),
      maxStorage: Number(req.body.maxStorage),
      durationMonths: Number(req.body.durationMonths || 12),
      price: Number(req.body.price),
      perEnrollmentFee: Number(req.body.perEnrollmentFee || 0),
      isSystem: false,
      status: req.body.status
    }
  });
  res.status(201).json({ success: true, data: license });
});

export const updateLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { id: req.params.id };
  if (req.user.role !== 'superadmin') where.organizationId = req.user.organizationId;
  const exists = await prisma.license.findFirst({ where });
  if (!exists) {
    res.status(404).json({ success: false, message: 'License not found' });
    return;
  }

  const { name, tag, maxUsers, maxStorage, durationMonths, price, perEnrollmentFee, features, status } = req.body;
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (tag !== undefined) updateData.tag = tag;
  if (maxUsers !== undefined) updateData.maxUsers = Number(maxUsers);
  if (maxStorage !== undefined) updateData.maxStorage = Number(maxStorage);
  if (durationMonths !== undefined) updateData.durationMonths = Number(durationMonths);
  if (price !== undefined) updateData.price = Number(price);
  if (perEnrollmentFee !== undefined) updateData.perEnrollmentFee = Number(perEnrollmentFee);
  if (features !== undefined) updateData.features = features;
  if (status !== undefined) updateData.status = status;
  
  const license = await prisma.license.update({ where: { id: req.params.id }, data: updateData });
  res.status(200).json({ success: true, data: license });
});

export const deleteLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { id: req.params.id };
  if (req.user.role !== 'superadmin') where.organizationId = req.user.organizationId;
  const exists = await prisma.license.findFirst({ where });
  if (!exists) {
    res.status(404).json({ success: false, message: 'License not found' });
    return;
  }

  await prisma.license.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, data: {} });
});
