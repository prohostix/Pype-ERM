import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getProgramFees = asyncHandler(async (req, res) => {
    const fees = await prisma.programFeeStructure.findMany({
        where: { organizationId: req.user.organizationId },
        include: { program: true }
    });
    res.json({ success: true, count: fees.length, data: fees });
});
export const getProgramFee = asyncHandler(async (req, res) => {
    const fee = await prisma.programFeeStructure.findUnique({
        where: { id: req.params.id },
        include: { program: true }
    });
    res.json({ success: true, data: fee });
});
export const createProgramFee = asyncHandler(async (req, res) => {
    const fee = await prisma.programFeeStructure.create({
        data: { ...req.body, organizationId: req.user.organizationId, createdBy: req.user.id }
    });
    res.status(201).json({ success: true, data: fee });
});
export const updateProgramFee = asyncHandler(async (req, res) => {
    const fee = await prisma.programFeeStructure.update({
        where: { id: req.params.id },
        data: req.body
    });
    res.json({ success: true, data: fee });
});
export const deleteProgramFee = asyncHandler(async (req, res) => {
    await prisma.programFeeStructure.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
//# sourceMappingURL=programFeeController.js.map