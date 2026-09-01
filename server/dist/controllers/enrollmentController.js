import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getWallet = asyncHandler(async (req, res) => {
    const wallet = await prisma.studyCenterWallet.findUnique({ where: { studyCenterId: req.user.studyCenterId || '' } });
    res.json({ success: true, data: wallet });
});
export const submitTopUp = asyncHandler(async (req, res) => {
    const topUp = await prisma.walletTopUp.create({ data: { ...req.body, studyCenterId: req.user.studyCenterId || '', organizationId: req.user.organizationId } });
    res.status(201).json({ success: true, data: topUp });
});
export const getTopUpHistory = asyncHandler(async (req, res) => {
    const topUps = await prisma.walletTopUp.findMany({ where: { studyCenterId: req.user.studyCenterId || '' } });
    res.json({ success: true, count: topUps.length, data: topUps });
});
export const getEnrollablePrograms = asyncHandler(async (req, res) => {
    const programs = await prisma.program.findMany({
        where: { organizationId: req.user.organizationId, status: 'active' },
        include: {
            university: true,
            feeStructures: true
        }
    });
    res.json({ success: true, count: programs.length, data: programs });
});
export const createEnrollment = asyncHandler(async (req, res) => {
    const { studentId, ...rest } = req.body;
    const data = {
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
export const getMyEnrollments = asyncHandler(async (req, res) => {
    const enrollments = await prisma.enrollment.findMany({ where: { studyCenterId: req.user.studyCenterId || '' } });
    res.json({ success: true, count: enrollments.length, data: enrollments });
});
export const getMyCenterStatus = asyncHandler(async (req, res) => {
    const center = await prisma.studyCenter.findUnique({ where: { id: req.user.studyCenterId || '' } });
    res.json({ success: true, data: center });
});
export const submitMyCenterPayment = asyncHandler(async (req, res) => {
    res.json({ success: true, message: 'Payment submitted' });
});
export const uploadReceipt = asyncHandler(async (req, res) => {
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
            status: 'receipt_submitted', // Move from payment_pending -> receipt_submitted
            statusHistory: {
                push: historyEntry
            }
        }
    });
    res.json({ success: true, data: updated });
});
//# sourceMappingURL=enrollmentController.js.map