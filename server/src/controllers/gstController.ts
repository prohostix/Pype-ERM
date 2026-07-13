import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const { feeType, gstPercentage, hsnCode, sacCode, applicableFrom, applicableTo, allowOverride, status } = req.body;
  const setting = await prisma.gSTSetting.create({
    data: { 
      feeType, 
      gstPercentage: Number(gstPercentage), 
      hsnCode, 
      sacCode, 
      applicableFrom: applicableFrom ? new Date(applicableFrom) : new Date(), 
      applicableTo: applicableTo ? new Date(applicableTo) : null,
      allowOverride,
      status, 
      organizationId: orgId, 
      createdBy: req.user.id 
    }
  });
  res.status(201).json({ success: true, data: setting });
});

export const getGSTSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const settings = await prisma.gSTSetting.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: settings.length, data: settings });
});

export const getGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const setting = await prisma.gSTSetting.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId }
  });
  if (!setting) {
    res.status(404).json({ success: false, message: 'GST setting not found' });
    return;
  }
  res.json({ success: true, data: setting });
});

export const updateGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.gSTSetting.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'GST setting not found' });
    return;
  }
  const { feeType, gstPercentage, hsnCode, sacCode, applicableFrom, applicableTo, allowOverride, status } = req.body;
  const updateData: any = {};
  if (feeType !== undefined) updateData.feeType = feeType;
  if (gstPercentage !== undefined) updateData.gstPercentage = Number(gstPercentage);
  if (hsnCode !== undefined) updateData.hsnCode = hsnCode;
  if (sacCode !== undefined) updateData.sacCode = sacCode;
  if (applicableFrom !== undefined) updateData.applicableFrom = new Date(applicableFrom);
  if (applicableTo !== undefined) updateData.applicableTo = applicableTo ? new Date(applicableTo) : null;
  if (allowOverride !== undefined) updateData.allowOverride = allowOverride;
  if (status !== undefined) updateData.status = status;
  const setting = await prisma.gSTSetting.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: setting });
});

export const deleteGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.gSTSetting.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'GST setting not found' });
    return;
  }
  await prisma.gSTSetting.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const getApplicableGST = asyncHandler(async (req: AuthRequest, res: Response) => {
  const setting = await prisma.gSTSetting.findFirst({
    where: { organizationId: req.user.organizationId, feeType: req.params.feeType, status: 'active' }
  });
  res.json({ success: true, data: setting });
});

export const calculateGST = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { amount, feeType } = req.body;
  const setting = await prisma.gSTSetting.findFirst({
    where: { organizationId: req.user.organizationId, feeType, status: 'active' }
  });
  const percentage = setting ? setting.gstPercentage : 0;
  const gstAmount = (amount * percentage) / 100;
  res.json({ success: true, data: { amount, percentage, gstAmount, totalAmount: amount + gstAmount } });
});

export const getGSTSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
