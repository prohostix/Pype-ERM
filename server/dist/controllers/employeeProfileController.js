import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getEmployeeProfile = asyncHandler(async (req, res) => {
    const userId = req.params.userId || req.user.id;
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true, department: true }
    });
    const profile = await prisma.employeeProfile.findUnique({
        where: { userId }
    });
    const salaryConfig = await prisma.salaryConfig.findUnique({
        where: { userId }
    });
    res.json({ success: true, data: { user, profile, salaryConfig } });
});
export const upsertEmployeeProfile = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const data = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Format dates if they are provided
    if (data.dateOfBirth)
        data.dateOfBirth = new Date(data.dateOfBirth);
    if (data.joinDate)
        data.joinDate = new Date(data.joinDate);
    if (data.confirmationDate)
        data.confirmationDate = new Date(data.confirmationDate);
    if (data.probationEndDate)
        data.probationEndDate = new Date(data.probationEndDate);
    const profile = await prisma.employeeProfile.upsert({
        where: { userId },
        update: data,
        create: {
            userId,
            organizationId: user.organizationId || req.user.organizationId,
            ...data
        }
    });
    res.json({ success: true, data: profile });
});
export const updateKPIs = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const profile = await prisma.employeeProfile.upsert({
        where: { userId },
        update: { kpis: req.body.kpis },
        create: { userId, organizationId: req.user.organizationId, kpis: req.body.kpis }
    });
    res.json({ success: true, data: profile });
});
export const updateKRAs = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const profile = await prisma.employeeProfile.upsert({
        where: { userId },
        update: { kras: req.body.kras },
        create: { userId, organizationId: req.user.organizationId, kras: req.body.kras }
    });
    res.json({ success: true, data: profile });
});
export const updateSalaryDetails = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const config = await prisma.salaryConfig.upsert({
        where: { userId },
        update: req.body,
        create: { ...req.body, userId, organizationId: req.user.organizationId, createdBy: req.user.id }
    });
    res.json({ success: true, data: config });
});
//# sourceMappingURL=employeeProfileController.js.map