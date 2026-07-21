import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getPendingReviews = asyncHandler(async (req, res) => {
    const enrollments = await prisma.enrollment.findMany({ where: { organizationId: req.user.organizationId, status: 'document_review' }, include: { program: true, studyCenter: true } });
    res.json({ success: true, count: enrollments.length, data: enrollments });
});
export const getDeptReviewEnrollments = asyncHandler(async (req, res) => {
    const enrollments = await prisma.enrollment.findMany({
        where: {
            organizationId: req.user.organizationId,
            status: { in: ['dept_review', 'document_review'] }
        },
        include: { program: true, studyCenter: true }
    });
    res.json({ success: true, count: enrollments.length, data: enrollments });
});
export const approveDeptEnrollment = asyncHandler(async (req, res) => {
    const enrollment = await prisma.enrollment.update({ where: { id: req.params.id }, data: { status: 'finance_review', departmentReviewedBy: req.user.id, departmentReviewedAt: new Date() } });
    res.json({ success: true, data: enrollment });
});
export const rejectDeptEnrollment = asyncHandler(async (req, res) => {
    const enrollment = await prisma.enrollment.update({ where: { id: req.params.id }, data: { status: 'rejected', departmentReviewedBy: req.user.id, departmentReviewedAt: new Date(), departmentRemarks: req.body.remarks } });
    res.json({ success: true, data: enrollment });
});
//# sourceMappingURL=enrollmentReviewController.js.map