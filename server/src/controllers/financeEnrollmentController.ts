import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { provisionStudentAfterApproval } from '../utils/studentProvisioning.js';

export const getAllEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { organizationId: req.user.organizationId },
    include: {
      program: { select: { name: true, code: true } },
      studyCenter: { select: { name: true, code: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
});

export const getFinanceEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { organizationId: req.user.organizationId, status: 'finance_review' },
    include: { program: true, studyCenter: true, student: true },
    orderBy: { createdAt: 'asc' }
  });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const approveFinanceEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: { status: 'enrolled', financeReviewedBy: req.user.id, financeReviewedAt: new Date() }
  });
  
  // Provision student/user account post-approval
  await provisionStudentAfterApproval(enrollment.id);
  
  // Refetch the updated enrollment with provisioned student info
  const updatedEnrollment = await prisma.enrollment.findUnique({
    where: { id: enrollment.id },
    include: { program: true, studyCenter: true }
  });

  res.json({ success: true, data: updatedEnrollment || enrollment });
});

export const rejectFinanceEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: { status: 'rejected', financeReviewedBy: req.user.id, financeReviewedAt: new Date(), financeRemarks: req.body.remarks }
  });
  res.json({ success: true, data: enrollment });
});
