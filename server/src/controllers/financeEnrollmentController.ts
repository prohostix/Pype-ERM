import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { provisionStudentAfterApproval } from '../utils/studentProvisioning.js';

export const getAllEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, search } = req.query as Record<string, string>;

  const where: any = { organizationId: req.user.organizationId };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { studentName: { contains: search, mode: 'insensitive' } },
      { studentEmail: { contains: search, mode: 'insensitive' } },
      { enrollmentNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [enrollments, summary] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      include: {
        program: {
          include: {
            university: { select: { id: true, name: true, address: true, code: true } },
            feeStructures: {
              select: {
                id: true, registrationFee: true, tuitionFee: true,
                examFee: true, universityFee: true, billingCycle: true, yearlyFees: true,
              }
            },
          },
        },
        studyCenter: { select: { name: true, code: true } },
        session: { select: { name: true } },
        student: {
          select: {
            id: true, name: true, email: true, phone: true, altPhone: true,
            dob: true, address: true, pinCode: true,
            fatherName: true, motherName: true, fatherPhone: true, motherPhone: true,
            religion: true, caste: true, photo: true, documents: true,
          }
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.enrollment.groupBy({
      by: ['status'],
      where: { organizationId: req.user.organizationId },
      _count: { status: true },
    }),
  ]);

  const summaryMap = summary.reduce((acc: any, s: any) => {
    acc[s.status] = s._count.status;
    return acc;
  }, { payment_pending: 0, document_review: 0, finance_review: 0, enrolled: 0, rejected: 0, department_rejected: 0 });

  res.status(200).json({ success: true, count: enrollments.length, data: enrollments, summary: summaryMap });
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
