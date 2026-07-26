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
    const enrollment = await prisma.enrollment.create({ data: { ...req.body, organizationId: req.user.organizationId, studyCenterId: req.user.studyCenterId || '' } });
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
//# sourceMappingURL=enrollmentController.js.map