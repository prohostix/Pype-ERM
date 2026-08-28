import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getDocumentLogs = asyncHandler(async (req, res) => {
    const { type, status } = req.query;
    const where = { organizationId: req.user.organizationId };
    if (type)
        where.type = type;
    if (status)
        where.status = status;
    if (req.user.role === 'ops_sub_admin') {
        const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
        const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
        where.OR = [
            { studentId: null },
            { student: { enrolledBy: null } },
            { student: { referredBy: null } },
            { student: { enrolledBy: { in: assignedIds } } },
            { student: { referredBy: { in: assignedIds } } }
        ];
    }
    const logs = await prisma.documentLog.findMany({
        where,
        include: {
            student: true,
            loggedByUser: { select: { id: true, name: true, role: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, count: logs.length, data: logs });
});
export const getDocumentLog = asyncHandler(async (req, res) => {
    let whereClause = { id: req.params.id, organizationId: req.user.organizationId };
    if (req.user.role === 'ops_sub_admin') {
        const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
        const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
        whereClause.OR = [
            { studentId: null },
            { student: { enrolledBy: null, referredBy: null } },
            { student: { enrolledBy: { in: assignedIds } } },
            { student: { referredBy: { in: assignedIds } } }
        ];
    }
    const log = await prisma.documentLog.findFirst({
        where: whereClause,
        include: { student: true }
    });
    if (!log) {
        res.status(404).json({ success: false, message: 'Document log not found' });
        return;
    }
    res.status(200).json({ success: true, data: log });
});
export const createDocumentLog = asyncHandler(async (req, res) => {
    const { studentId, type, documentName, documentType, status, notes, courierName, trackingNumber, dispatchDate, deliveryDate } = req.body;
    const log = await prisma.documentLog.create({
        data: {
            organizationId: req.user.organizationId,
            loggedBy: req.user.id,
            studentId,
            type,
            documentName,
            documentType,
            status,
            notes,
            courierName,
            trackingNumber,
            dispatchDate: dispatchDate ? new Date(dispatchDate) : undefined,
            deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        }
    });
    res.status(201).json({ success: true, data: log });
});
export const updateDocumentLog = asyncHandler(async (req, res) => {
    const { status, notes, courierName, trackingNumber, dispatchDate, deliveryDate } = req.body;
    let whereClause = { id: req.params.id, organizationId: req.user.organizationId };
    if (req.user.role === 'ops_sub_admin') {
        const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
        const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
        whereClause.OR = [
            { studentId: null },
            { student: { enrolledBy: null, referredBy: null } },
            { student: { enrolledBy: { in: assignedIds } } },
            { student: { referredBy: { in: assignedIds } } }
        ];
    }
    const existing = await prisma.documentLog.findFirst({ where: whereClause });
    if (!existing) {
        res.status(404).json({ success: false, message: 'Document log not found or unauthorized' });
        return;
    }
    const log = await prisma.documentLog.update({
        where: { id: req.params.id },
        data: {
            status,
            notes,
            courierName,
            trackingNumber,
            dispatchDate: dispatchDate ? new Date(dispatchDate) : undefined,
            deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        }
    });
    res.status(200).json({ success: true, data: log });
});
//# sourceMappingURL=documentController.js.map