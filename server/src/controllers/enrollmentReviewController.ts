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

  // Enforce branch isolation
  const globalRoles = ['superadmin', 'org_admin', 'ceo', 'general_manager'];
  if (!globalRoles.includes(req.user.role) && req.user.branchId) {
    baseWhere.OR = [
      { student: { branchId: req.user.branchId } },
      { salesUser: { branchId: req.user.branchId } }
    ];
  }

  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];

    if (assignedIds.length > 0) {
      delete baseWhere.OR;
      delete baseWhere.student;
      baseWhere.salesUserId = { in: assignedIds };
    }
  } else if (req.user.role === 'ops_admin') {
    if (req.user.branchId) {
      const opsSubAdmins = await prisma.user.findMany({ 
        where: { role: 'ops_sub_admin', organizationId: req.user.organizationId, branchId: req.user.branchId }, 
        select: { assignedSalesUsers: true } 
      });
      
      let assignedIds: string[] = [];
      opsSubAdmins.forEach(sub => {
        if (Array.isArray(sub.assignedSalesUsers)) {
          assignedIds.push(...(sub.assignedSalesUsers as string[]));
        }
      });
      
      if (assignedIds.length > 0) {
        const branchRestriction = baseWhere.OR || (baseWhere.student ? [{ student: baseWhere.student }] : []);
        delete baseWhere.OR;
        delete baseWhere.student;

        baseWhere.OR = [
          { salesUserId: { in: assignedIds } },
          ...branchRestriction
        ];
      }
    }
  }

  const enrollments = await prisma.enrollment.findMany({
    where: baseWhere,
    include: {
      program: { include: { university: true } },
      studyCenter: true,
      salesUser: { select: { name: true } },
      session: true,
      student: true,
      payment: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  let enhancedEnrollments = enrollments;

  if (['ops_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager'].includes(req.user.role)) {
    // Fetch all ops_sub_admins in the organization
    const opsSubAdmins = await prisma.user.findMany({
      where: { role: 'ops_sub_admin', organizationId: req.user.organizationId }
    });

    enhancedEnrollments = enrollments.map((e: any) => {
      let assignedOpsSubAdminName = 'Unassigned';
      if (e.salesUserId) {
        const assignedSubAdmin = opsSubAdmins.find(sub => {
          const assigned = Array.isArray(sub.assignedSalesUsers) ? sub.assignedSalesUsers as string[] : [];
          return assigned.includes(e.salesUserId);
        });
        if (assignedSubAdmin) assignedOpsSubAdminName = assignedSubAdmin.name;
      }
      return { ...e, assignedOpsSubAdminName };
    });
  }

  res.json({ success: true, count: enhancedEnrollments.length, data: enhancedEnrollments });
});

export const approveDeptEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  let whereClause: any = { id: req.params.id };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    
    if (assignedIds.length > 0) {
      whereClause.salesUserId = { in: assignedIds };
    }
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
      departmentRemarks: null,
      departmentReviewedBy: req.user.id,
      departmentReviewedAt: new Date(),
      statusHistory: {
        push: { status: 'finance_review', changedAt: new Date().toISOString(), changedBy: req.user.id, actorName: req.user.name, actorRole: req.user.role }
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
    
    if (assignedIds.length > 0) {
      whereClause.salesUserId = { in: assignedIds };
    }
  }
  const existing = await prisma.enrollment.findFirst({ where: whereClause });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Enrollment not found or unauthorized' });
    return;
  }

  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: 'ops_rejected',
      departmentReviewedBy: req.user.id,
      departmentReviewedAt: new Date(),
      departmentRemarks: req.body.remarks,
      statusHistory: {
        push: { status: 'ops_rejected', changedAt: new Date().toISOString(), changedBy: req.user.id, actorName: req.user.name, actorRole: req.user.role, remarks: req.body.remarks }
      }
    }
  });
  res.json({ success: true, data: enrollment });
});

export const updateEnrollmentDocumentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, docIndex } = req.params;
  const { status, remarks } = req.body;
  
  let whereClause: any = { id };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    if (assignedIds.length > 0) {
      whereClause.salesUserId = { in: assignedIds };
    }
  }
  
  const enrollment = await prisma.enrollment.findFirst({
    where: whereClause,
  });

  if (!enrollment) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  const currentDocs = Array.isArray(enrollment.documents) ? (enrollment.documents as any[]) : [];
  const index = parseInt(docIndex, 10);
  
  if (isNaN(index) || index < 0 || index >= currentDocs.length) {
    res.status(400).json({ success: false, message: 'Invalid document index' });
    return;
  }

  currentDocs[index].status = status;
  if (remarks !== undefined) {
    currentDocs[index].remarks = remarks;
  }

  await prisma.enrollment.update({
    where: { id },
    data: {
      documents: currentDocs,
    },
  });

  if (enrollment.studentId) {
    await prisma.student.update({
      where: { id: enrollment.studentId },
      data: { documents: currentDocs },
    });
  }

  res.json({ success: true, message: 'Document status updated', data: currentDocs[index] });
});

export const updateEnrollmentPhotoStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  let whereClause: any = { id };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    if (assignedIds.length > 0) {
      whereClause.salesUserId = { in: assignedIds };
    }
  }
  
  const enrollment = await prisma.enrollment.findFirst({
    where: whereClause,
  });

  if (!enrollment) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  await prisma.enrollment.update({
    where: { id },
    data: {
      photoStatus: status,
    },
  });

  res.json({ success: true, message: 'Photo status updated' });
});
