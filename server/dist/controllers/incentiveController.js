import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const createIncentiveStructure = asyncHandler(async (req, res) => {
    const structure = await prisma.incentiveStructure.create({ data: { ...req.body, organizationId: req.user.organizationId, createdBy: req.user.id } });
    res.status(201).json({ success: true, data: structure });
});
export const getIncentiveStructures = asyncHandler(async (req, res) => {
    const structures = await prisma.incentiveStructure.findMany({ where: { organizationId: req.user.organizationId } });
    res.json({ success: true, count: structures.length, data: structures });
});
export const getIncentiveStructure = asyncHandler(async (req, res) => {
    const structure = await prisma.incentiveStructure.findUnique({ where: { id: req.params.id } });
    res.json({ success: true, data: structure });
});
export const updateIncentiveStructure = asyncHandler(async (req, res) => {
    const structure = await prisma.incentiveStructure.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: structure });
});
export const deleteIncentiveStructure = asyncHandler(async (req, res) => {
    await prisma.incentiveStructure.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
export const approveIncentiveStructure = asyncHandler(async (req, res) => {
    const structure = await prisma.incentiveStructure.update({ where: { id: req.params.id }, data: { status: 'active', approvedBy: req.user.id, approvedAt: new Date() } });
    res.json({ success: true, data: structure });
});
export const calculateIncentive = asyncHandler(async (req, res) => {
    res.json({ success: true, data: {} });
});
export const getCurrentActiveIncentives = asyncHandler(async (req, res) => {
    const incentives = await prisma.incentiveStructure.findMany({ where: { organizationId: req.user.organizationId, status: 'active' } });
    res.json({ success: true, data: incentives });
});
//# sourceMappingURL=incentiveController.js.map