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
  const { studentId, feeMode, universityId, ...rest } = req.body;
  const data: any = {
    ...rest,
    organizationId: req.user.organizationId
  };
  
  if (req.user.studyCenterId) {
    data.studyCenterId = req.user.studyCenterId;
  }
  
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

export const uploadReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollmentId = req.params.id;
  if (!req.file) {
    res.status(400);
    throw new Error('No receipt file uploaded');
  }
  // @ts-ignore
  const fileUrl = `/uploads/${req.file.key || req.file.filename}`;

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId }
  });

  if (!enrollment) {
    res.status(404);
    throw new Error('Enrollment not found');
  }

  // Optional: Add to statusHistory if transitioning to 'receipt_submitted'
  const historyEntry = {
    status: 'receipt_submitted',
    changedAt: new Date().toISOString(),
    changedBy: req.user.id,
    remarks: 'Payment receipt uploaded'
  };

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      receiptUrl: fileUrl,
      receiptVerified: false,
      status: enrollment.isProvisional ? enrollment.status : 'receipt_submitted',
      statusHistory: {
        push: historyEntry
      }
    }
  });

  res.json({ success: true, data: updated });
});

export const completeProvisionalEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollmentId = req.params.id;
  const { ...updateData } = req.body;

  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment) {
    res.status(404);
    throw new Error('Enrollment not found');
  }

  // Update enrollment with new data and set status to department_review or whatever is next
  const historyEntry = {
    status: 'payment_pending', // Standard starting flow, or document_review if payment was already verified
    changedAt: new Date().toISOString(),
    changedBy: req.user.id,
    remarks: 'Provisional enrollment completed with full details'
  };

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      ...updateData,
      isProvisional: false,
      status: enrollment.receiptVerified ? 'document_review' : 'payment_pending',
      statusHistory: {
        push: historyEntry
      }
    }
  });

  res.json({ success: true, data: updated });
});

export const getMyProvisionalEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: req.user.organizationId,
      isProvisional: true,
    },
    include: { program: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});
