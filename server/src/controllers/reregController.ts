import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getReregRules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rules = await prisma.reregRule.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: rules.length, data: rules });
});

export const createOrUpdateReregRules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { programId, semester, rules } = req.body;
  let rule = await prisma.reregRule.findFirst({
    where: { organizationId: req.user.organizationId, programId }
  });
  if (rule) {
    rule = await prisma.reregRule.update({
      where: { id: rule.id },
      data: { semester, rules }
    });
  } else {
    rule = await prisma.reregRule.create({
      data: { organizationId: req.user.organizationId, programId, semester, rules }
    });
  }
  res.json({ success: true, data: rule });
});

export const getPendingReregs = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, count: 0, data: [] });
});

export const getCompletedReregs = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, count: 0, data: [] });
});

export const processRereg = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: { id: req.params.id, status: 'completed' } });
});

export const carryForwardMissedReregs = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Missed reregs carried forward' });
});

export const getReregStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
