import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getPendingReviews = asyncHandler(async (req, res) => {
    const enrollments = await prisma.enrollment.findMany({ where: { organizationId: req.user.organizationId, status: 'document_review' }, include: { program: true, studyCenter: true } });
    res.json({ success: true, count: enrollments.length, data: enrollments });
});
export const getDeptReviewEnrollments = asyncHandler(async (req, res) => {
    const { tab } = req.query; // 'pending' | 'completed'
    let statusFilter;
    if (tab === 'completed') {
        // Enrollments the dept already acted on (approved → finance_review, or rejected)
        statusFilter = { in: ['finance_review', 'university_review', 'enrolled', 'rejected', 'department_rejected'] };
    }
    else {
        // Default: pending dept review
        statusFilter = { in: ['payment_pending', 'receipt_submitted', 'submitted', 'document_review', 'dept_review'] };
    }
    const enrollments = await prisma.enrollment.findMany({
        where: {
            organizationId: req.user.organizationId,
            status: statusFilter,
        },
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
export const approveDeptEnrollment = asyncHandler(async (req, res) => {
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
export const rejectDeptEnrollment = asyncHandler(async (req, res) => {
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
//# sourceMappingURL=enrollmentReviewController.js.map