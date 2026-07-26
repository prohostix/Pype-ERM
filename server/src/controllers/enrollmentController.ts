import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getWallet = asyncHandler(async (req: AuthRequest, res: Response) => {
  const wallet = await prisma.studyCenterWallet.findUnique({ where: { studyCenterId: req.user.studyCenterId || '' } });
  res.json({ success: true, data: wallet });
});

export const submitTopUp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const topUp = await prisma.walletTopUp.create({ data: { ...req.body, studyCenterId: req.user.studyCenterId || '', organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: topUp });
});

export const getTopUpHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const topUps = await prisma.walletTopUp.findMany({ where: { studyCenterId: req.user.studyCenterId || '' } });
  res.json({ success: true, count: topUps.length, data: topUps });
});

export const getEnrollablePrograms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const programs = await prisma.program.findMany({ 
    where: { organizationId: req.user.organizationId, status: 'active' },
    include: {
      university: true,
      feeStructures: true
    }
  });
  res.json({ success: true, count: programs.length, data: programs });
});

export const createEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, ...rest } = req.body;
  const data: any = {
    ...rest,
    organizationId: req.user.organizationId,
    studyCenterId: req.user.studyCenterId || ''
  };
  
  if (studentId) {
    data.studentId = studentId;
  }
  
  const enrollment = await prisma.enrollment.create({ data });

  if (studentId) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (student && !student.admissionNo) {
      await prisma.student.update({
        where: { id: studentId },
        data: { admissionNo: `ADM${Date.now().toString().slice(-6)}` }
      });
    }
  }

  res.status(201).json({ success: true, data: enrollment });
});

export const getMyEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({ where: { studyCenterId: req.user.studyCenterId || '' } });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const getMyCenterStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.findUnique({ where: { id: req.user.studyCenterId || '' } });
  res.json({ success: true, data: center });
});

export const submitMyCenterPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Payment submitted' });
});
