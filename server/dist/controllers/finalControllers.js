import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
// --- Employee Profile Controller ---
export const getEmployeeProfile = asyncHandler(async (req, res) => {
    const profile = await prisma.user.findUnique({
        where: { id: req.params.userId || req.user.id },
        include: { organization: true, department: true }
    });
    res.json({ success: true, data: profile });
});
// --- Public Controller ---
export const getPublicUniversities = asyncHandler(async (req, res) => {
    const universities = await prisma.university.findMany({
        where: { status: 'active' }
    });
    res.json({ success: true, count: universities.length, data: universities });
});
// --- Rereg Controller ---
export const getReregRules = asyncHandler(async (req, res) => {
    const rules = await prisma.reregRule.findMany({
        where: { organizationId: req.user.organizationId }
    });
    res.json({ success: true, count: rules.length, data: rules });
});
// --- Program Material Controller ---
export const getProgramMaterials = asyncHandler(async (req, res) => {
    const materials = await prisma.programMaterial.findMany({
        where: { programId: req.params.programId, organizationId: req.user.organizationId },
        orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, count: materials.length, data: materials });
});
//# sourceMappingURL=finalControllers.js.map