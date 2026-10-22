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
    // Enrollments the dept already acted on (approved → finance_review/main flow, or rejected)
    statusFilter = { in: ['finance_review', 'university_review', 'enrolled', 'rejected', 'department_rejected', 'ops_rejected'] };
  } else {
    // Default: pending dept review (including upgrade verification from sales)
    statusFilter = { in: ['payment_pending', 'receipt_submitted', 'submitted', 'document_review', 'dept_review', 'ops_upgrade_verification'] };
  }

  const baseWhere: any = {
    organizationId: req.user.organizationId,
    status: statusFilter,
  };

  if (req.user.role === 'center_admin') {
    baseWhere.studyCenterId = req.user.studyCenterId || '__none__';
  } else {
    // Enforce branch isolation
    const globalRoles = ['superadmin', 'org_admin', 'ceo', 'general_manager'];
    if (!globalRoles.includes(req.user.role) && req.user.branchId) {
      baseWhere.OR = [
        { student: { branchId: req.user.branchId } },
        { salesUser: { branchId: req.user.branchId } },
        { studyCenterId: { not: null } }
      ];
    }

    if (req.user.role === 'ops_sub_admin') {
      const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
      const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];

      if (assignedIds.length > 0) {
        delete baseWhere.student;
        baseWhere.OR = [
          { salesUserId: { in: assignedIds } },
          { studyCenterId: { not: null } }
        ];
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
        
        const branchRestriction = [
          { student: { branchId: req.user.branchId } },
          { salesUser: { branchId: req.user.branchId } },
          { studyCenterId: { not: null } }
        ];

        delete baseWhere.student;
        baseWhere.OR = [
          ...(assignedIds.length > 0 ? [{ salesUserId: { in: assignedIds } }] : []),
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
      salesUser: { select: { id: true, name: true, email: true } },
      session: true,
      student: {
        include: {
          program: { include: { university: true } },
          enrollments: {
            include: {
              program: { include: { university: true } },
              session: true
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      },
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
      if (e.studyCenterId) {
        assignedOpsSubAdminName = e.studyCenter?.name || 'Academic Partner';
      } else if (e.salesUserId) {
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
      whereClause.OR = [
        { salesUserId: { in: assignedIds } },
        { studyCenterId: { not: null } }
      ];
    }
  }
  const existing = await prisma.enrollment.findFirst({ where: whereClause });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Enrollment not found or unauthorized' });
    return;
  }

  const isUpgrade = Boolean(existing.isUpgrade || existing.status === 'ops_upgrade_verification');
  // Operations approval forwards directly to Finance review so Finance can verify payment & finalize enrollment
  const nextStatus = 'finance_review';

  const rawHist: any = existing.statusHistory;
  const history: any[] = Array.isArray(rawHist) ? rawHist : (rawHist && typeof rawHist === 'object' ? Object.values(rawHist) : []);
  const newHistoryEntry = {
    status: nextStatus,
    changedAt: new Date().toISOString(),
    changedBy: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    note: isUpgrade
      ? 'Operations approved student upgrade verification. Forwarded to Finance review.'
      : 'Operations approved all documents & photo. Forwarded to Finance review.'
  };

  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: nextStatus,
      departmentRemarks: null,
      departmentReviewedBy: req.user.id,
      departmentReviewedAt: new Date(),
      statusHistory: [...history, newHistoryEntry] as any,
    }
  });

  // Notify sales user
  if (existing.salesUserId) {
    try {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: existing.salesUserId,
          title: isUpgrade ? '✅ Upgrade Application Approved by Operations' : '✅ Enrollment Approved by Operations',
          message: isUpgrade
            ? `Operations verified past & current enrollments for ${existing.studentName}. Application forwarded to Finance review.`
            : `Enrollment for ${existing.studentName} has been approved and moved to finance review.`,
          type: 'general',
          priority: 'high',
          link: 'sales_pipeline'
        }
      });
    } catch (_) {}
  }

  // Notify finance admins
  try {
    const financeAdmins = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId, role: { in: ['finance_admin', 'finance_sub_admin'] }, status: 'active' },
      select: { id: true },
    });
    for (const admin of financeAdmins) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: admin.id,
          title: 'Student Application Ready for Finance Review',
          message: `${existing.studentName}'s documents were approved by Operations and forwarded for fee verification.`,
          type: 'general',
          priority: 'medium',
          link: 'enrollments_finance',
        },
      });
    }
  } catch (_) {}

  res.json({ success: true, data: enrollment });
});

export const rejectDeptEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  let whereClause: any = { id: req.params.id };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    
    if (assignedIds.length > 0) {
      whereClause.OR = [
        { salesUserId: { in: assignedIds } },
        { studyCenterId: { not: null } }
      ];
    }
  }
  const existing = await prisma.enrollment.findFirst({ where: whereClause });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Enrollment not found or unauthorized' });
    return;
  }

  const isUpgrade = Boolean(existing.isUpgrade || existing.status === 'ops_upgrade_verification');
  const remarksText = req.body.remarks || 'Required documents missing or invalid';

  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: 'ops_rejected',
      departmentReviewedBy: req.user.id,
      departmentReviewedAt: new Date(),
      departmentRemarks: remarksText,
      statusHistory: {
        push: {
          status: 'ops_rejected',
          changedAt: new Date().toISOString(),
          changedBy: req.user.id,
          actorName: req.user.name,
          actorRole: req.user.role,
          remarks: remarksText,
          note: isUpgrade ? 'Operations rejected upgrade application due to missing/invalid documents. Returned to Sales.' : undefined
        }
      }
    }
  });

  // Notify sales user
  if (existing.salesUserId) {
    try {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: existing.salesUserId,
          title: isUpgrade ? '❌ Upgrade Application Rejected by Operations' : '❌ Enrollment Rejected by Operations',
          message: `Operations rejected application for ${existing.studentName}: ${remarksText}. Please review documents and resubmit.`,
          type: 'general',
          priority: 'high',
          link: 'sales_pipeline'
        }
      });
    } catch (_) {}
  }

  res.json({ success: true, data: enrollment });
});

export const resubmitUpgradeEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { documents, photo, remarks } = req.body;

  const existing = await prisma.enrollment.findFirst({
    where: { id, organizationId: req.user.organizationId }
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  const updated = await prisma.enrollment.update({
    where: { id },
    data: {
      status: 'ops_upgrade_verification',
      departmentRemarks: null,
      ...(documents ? { documents } : {}),
      ...(photo ? { photo } : {}),
      statusHistory: {
        push: {
          status: 'ops_upgrade_verification',
          changedAt: new Date().toISOString(),
          changedBy: req.user.id,
          actorName: req.user.name,
          actorRole: req.user.role,
          remarks: remarks || 'Documents updated and resubmitted for Operations verification',
          note: 'Resubmitted to Operations by Sales'
        }
      }
    }
  });

  if (existing.studentId && documents) {
    await prisma.student.update({
      where: { id: existing.studentId },
      data: { documents }
    });
  }

  // Notify Ops admins
  try {
    const opsAdmins = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId, role: { in: ['ops_admin', 'ops_sub_admin'] }, status: 'active' },
      select: { id: true },
    });
    for (const admin of opsAdmins) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: admin.id,
          title: '🔄 Upgrade Enrollment Resubmitted',
          message: `${existing.studentName}'s upgrade application has been resubmitted by ${req.user.name} with updated documents.`,
          type: 'general',
          priority: 'high',
          link: 'enrollment_review',
        },
      });
    }
  } catch (_) {}

  res.json({ success: true, message: 'Resubmitted to Operations successfully', data: updated });
});

export const updateEnrollmentDocumentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, docIndex } = req.params;
  const { status, remarks } = req.body;
  
  let whereClause: any = { id };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    if (assignedIds.length > 0) {
      whereClause.OR = [
        { salesUserId: { in: assignedIds } },
        { studyCenterId: { not: null } }
      ];
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
      whereClause.OR = [
        { salesUserId: { in: assignedIds } },
        { studyCenterId: { not: null } }
      ];
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

  if (enrollment.studentId) {
    const student = await prisma.student.findUnique({ where: { id: enrollment.studentId } });
    if (student) {
      const admissionProgress = (student.admissionProgress as any) || {};
      admissionProgress.photoStatus = status;
      await prisma.student.update({
        where: { id: enrollment.studentId },
        data: { admissionProgress }
      });
    }
  }

  res.json({ success: true, message: 'Photo status updated' });
});
