import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getExamRegistrations = asyncHandler(async (req, res) => {
    const { status, semester } = req.query;
    const where = { organizationId: req.user.organizationId };
    if (status)
        where.status = status;
    if (semester)
        where.semester = semester;
    if (req.user.role === 'ops_sub_admin') {
        const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
        const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
        where.OR = [
            { student: { enrolledBy: null } },
            { student: { referredBy: null } },
            { student: { enrolledBy: { in: assignedIds } } },
            { student: { referredBy: { in: assignedIds } } }
        ];
    }
    const registrations = await prisma.examRegistration.findMany({
        where,
        include: {
            student: {
                select: { id: true, name: true, enrollmentNo: true, programId: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, count: registrations.length, data: registrations });
});
export const getExamRegistration = asyncHandler(async (req, res) => {
    let whereClause = { id: req.params.id, organizationId: req.user.organizationId };
    if (req.user.role === 'ops_sub_admin') {
        const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
        const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
        whereClause.OR = [
            { student: { enrolledBy: null, referredBy: null } },
            { student: { enrolledBy: { in: assignedIds } } },
            { student: { referredBy: { in: assignedIds } } }
        ];
    }
    const registration = await prisma.examRegistration.findFirst({
        where: whereClause,
        include: {
            student: {
                select: { id: true, name: true, enrollmentNo: true, programId: true }
            }
        }
    });
    if (!registration) {
        res.status(404).json({ success: false, message: 'Exam registration not found' });
        return;
    }
    res.status(200).json({ success: true, data: registration });
});
export const createExamRegistration = asyncHandler(async (req, res) => {
    const { studentId, semester, subjectCodes, examCenter, status } = req.body;
    const registration = await prisma.examRegistration.create({
        data: {
            organizationId: req.user.organizationId,
            studentId,
            semester,
            subjectCodes,
            examCenter,
            status: status || 'pending'
        }
    });
    res.status(201).json({ success: true, data: registration });
});
export const updateExamRegistration = asyncHandler(async (req, res) => {
    const { semester, subjectCodes, examCenter, status } = req.body;
    let whereClause = { id: req.params.id, organizationId: req.user.organizationId };
    if (req.user.role === 'ops_sub_admin') {
        const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
        const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
        whereClause.OR = [
            { student: { enrolledBy: null, referredBy: null } },
            { student: { enrolledBy: { in: assignedIds } } },
            { student: { referredBy: { in: assignedIds } } }
        ];
    }
    const existing = await prisma.examRegistration.findFirst({ where: whereClause });
    if (!existing) {
        res.status(404).json({ success: false, message: 'Exam registration not found or unauthorized' });
        return;
    }
    const registration = await prisma.examRegistration.update({
        where: { id: req.params.id },
        data: {
            semester,
            subjectCodes,
            examCenter,
            status
        }
    });
    res.status(200).json({ success: true, data: registration });
});
export const deleteExamRegistration = asyncHandler(async (req, res) => {
    await prisma.examRegistration.delete({
        where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    res.status(200).json({ success: true, data: {} });
});
//# sourceMappingURL=examController.js.map