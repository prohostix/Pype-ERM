import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId || req.body.organizationId;
  if (!orgId) {
    res.status(400).json({ success: false, message: 'Organization ID is required.' });
    return;
  }
  const setting = await prisma.gSTSetting.create({ data: { ...req.body, organizationId: orgId, createdBy: req.user.id } });
  res.status(201).json({ success: true, data: setting });
});

export const getGSTSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId || (req.query.organizationId as string);
  if (!orgId) {
    res.status(400).json({ success: false, message: 'Organization ID is required.' });
    return;
  }
  const settings = await prisma.gSTSetting.findMany({ where: { organizationId: orgId } });
  res.json({ success: true, count: settings.length, data: settings });
});

export const getGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const setting = await prisma.gSTSetting.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: setting });
});

export const updateGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const setting = await prisma.gSTSetting.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: setting });
});

export const deleteGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.gSTSetting.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const getApplicableGST = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId || (req.query.organizationId as string);
  if (!orgId) {
    res.status(400).json({ success: false, message: 'Organization ID is required.' });
    return;
  }
  const setting = await prisma.gSTSetting.findFirst({ where: { organizationId: orgId, feeType: req.params.feeType, status: 'active' } });
  res.json({ success: true, data: setting });
});

export const calculateGST = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { amount, feeType, organizationId } = req.body;
  const orgId = req.user.organizationId || organizationId;
  if (!orgId) {
    res.status(400).json({ success: false, message: 'Organization ID is required.' });
    return;
  }
  const setting = await prisma.gSTSetting.findFirst({ where: { organizationId: orgId, feeType, status: 'active' } });
  const percentage = setting ? setting.gstPercentage : 0;
  const gstAmount = (amount * percentage) / 100;
  res.json({ success: true, data: { amount, percentage, gstAmount, totalAmount: amount + gstAmount } });
});

export const getGSTSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
