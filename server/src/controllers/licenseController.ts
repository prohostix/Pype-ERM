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
      type: req.body.type,
      features: req.body.features,
      maxUsers: Number(req.body.maxUsers),
      maxStorage: Number(req.body.maxStorage),
      durationMonths: Number(req.body.durationMonths || 12),
      price: Number(req.body.price),
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
  const { type, expiresAt, seats, features, status } = req.body;
  const updateData: any = {};
  if (type !== undefined) updateData.type = type;
  if (expiresAt !== undefined) updateData.expiresAt = new Date(expiresAt);
  if (seats !== undefined) updateData.seats = Number(seats);
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
