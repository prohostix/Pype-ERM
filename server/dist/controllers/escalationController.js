import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getEscalations = asyncHandler(async (req, res) => {
    const escalations = await prisma.escalation.findMany({
        where: { organizationId: req.user.organizationId },
        include: { employee: { select: { name: true } } },
        orderBy: { escalatedAt: 'desc' }
    });
    res.json({ success: true, count: escalations.length, data: escalations });
});
export const getEscalation = asyncHandler(async (req, res) => {
    const escalation = await prisma.escalation.findUnique({ where: { id: req.params.id } });
    res.json({ success: true, data: escalation });
});
export const createEscalation = asyncHandler(async (req, res) => {
    const escalation = await prisma.escalation.create({ data: { ...req.body, organizationId: req.user.organizationId, employeeId: req.user.id } });
    res.status(201).json({ success: true, data: escalation });
});
export const updateEscalation = asyncHandler(async (req, res) => {
    const escalation = await prisma.escalation.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: escalation });
});
export const deleteEscalation = asyncHandler(async (req, res) => {
    await prisma.escalation.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
export const resolveEscalation = asyncHandler(async (req, res) => {
    const escalation = await prisma.escalation.update({ where: { id: req.params.id }, data: { status: 'resolved', resolvedAt: new Date(), resolvedBy: req.user.id } });
    res.json({ success: true, data: escalation });
});
//# sourceMappingURL=escalationController.js.map