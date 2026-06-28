import { Response, Request } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const validateInviteToken = asyncHandler(async (req: Request, res: Response) => {
  const invite = await prisma.studyCenterInvite.findUnique({ where: { token: req.params.token } });
  res.json({ success: true, data: invite });
});

export const publicRegister = asyncHandler(async (req: Request, res: Response) => {
  const center = await prisma.studyCenter.create({ data: { ...req.body, status: 'active' } });
  res.status(201).json({ success: true, data: center });
});

export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'pending' } });
});

export const submitPaymentProof = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Payment proof submitted' });
});

export const getPublicUniversities = asyncHandler(async (req: Request, res: Response) => {
  const universities = await prisma.university.findMany({ where: { status: 'active' } });
  res.json({ success: true, count: universities.length, data: universities });
});

export const getPublicPrograms = asyncHandler(async (req: Request, res: Response) => {
  const programs = await prisma.program.findMany({ where: { status: 'active' }, include: { university: true } });
  res.json({ success: true, count: programs.length, data: programs });
});

export const createOrgInquiry = asyncHandler(async (req: Request, res: Response) => {
  const { orgName, adminName, email, phone, message } = req.body;
  if (!orgName || !adminName || !email || !phone) {
    res.status(400).json({ success: false, message: 'All standard fields are required.' });
    return;
  }
  const inquiry = await prisma.orgInquiry.create({
    data: { orgName, adminName, email, phone, message }
  });
  res.status(201).json({ success: true, data: inquiry });
});
