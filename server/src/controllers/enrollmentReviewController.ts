import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPendingReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({ where: { organizationId: req.user.organizationId, status: 'document_review' }, include: { program: true, studyCenter: true } });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const getDeptReviewEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tab } = req.query; // 'pending' | 'completed'

  let statusFilter: any;
  if (tab === 'completed') {
    // Enrollments the dept already acted on (approved → finance_review, or rejected)
    statusFilter = { in: ['finance_review', 'university_review', 'enrolled', 'rejected', 'department_rejected'] };
  } else {
    // Default: pending dept review
    statusFilter = { in: ['payment_pending', 'receipt_submitted', 'submitted', 'document_review', 'dept_review'] };
  }

  const baseWhere: any = {
    organizationId: req.user.organizationId,
    status: statusFilter,
  };

  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];

    baseWhere.OR = [
      { salesUserId: null }, // Unassigned records all operations can see
    ];
    if (assignedIds.length > 0) {
      baseWhere.OR.push({ salesUserId: { in: assignedIds } });
    }
  }

  const enrollments = await prisma.enrollment.findMany({
    where: baseWhere,
    include: {
      program: { include: { university: true } },
      studyCenter: true,
      session: true,
      student: true,
      payment: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const approveDeptEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  let whereClause: any = { id: req.params.id };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    whereClause.OR = [
      { salesUserId: null },
      { salesUserId: { in: assignedIds } }
    ];
  }
  const existing = await prisma.enrollment.findFirst({ where: whereClause });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Enrollment not found or unauthorized' });
    return;
  }

  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: 'finance_review',
      departmentReviewedBy: req.user.id,
      departmentReviewedAt: new Date(),
      statusHistory: {
        push: { status: 'finance_review', changedAt: new Date().toISOString(), changedBy: req.user.id }
      }
    }
  });
  res.json({ success: true, data: enrollment });
});

export const rejectDeptEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  let whereClause: any = { id: req.params.id };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    whereClause.OR = [
      { salesUserId: null },
      { salesUserId: { in: assignedIds } }
    ];
  }
  const existing = await prisma.enrollment.findFirst({ where: whereClause });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Enrollment not found or unauthorized' });
    return;
  }

  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: 'rejected',
      departmentReviewedBy: req.user.id,
      departmentReviewedAt: new Date(),
      departmentRemarks: req.body.remarks,
      statusHistory: {
        push: { status: 'rejected', changedAt: new Date().toISOString(), changedBy: req.user.id, remarks: req.body.remarks }
      }
    }
  });
  res.json({ success: true, data: enrollment });
});
