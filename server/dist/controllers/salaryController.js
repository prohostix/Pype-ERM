import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getSalaryConfigs = asyncHandler(async (req, res) => {
    const configs = await prisma.salaryConfig.findMany({
        where: { organizationId: req.user.organizationId },
        include: { user: { select: { name: true, email: true, designation: true } } }
    });
    res.json({ success: true, count: configs.length, data: configs });
});
export const getFinanceSalaryConfigs = asyncHandler(async (req, res) => {
    const configs = await prisma.salaryConfig.findMany({
        where: { organizationId: req.user.organizationId, approvalStatus: 'pending_approval' },
        include: { user: { select: { name: true, email: true, designation: true } } }
    });
    res.json({ success: true, count: configs.length, data: configs });
});
export const getSalaryConfig = asyncHandler(async (req, res) => {
    const config = await prisma.salaryConfig.findUnique({ where: { userId: req.params.userId } });
    if (!config) {
        res.status(404).json({ success: false, message: 'Salary config not found' });
        return;
    }
    res.json({ success: true, data: config });
});
export const upsertSalaryConfig = asyncHandler(async (req, res) => {
    const payload = { ...req.body, organizationId: req.user.organizationId, createdBy: req.user.id };
    if (payload.effectiveFrom) {
        payload.effectiveFrom = new Date(payload.effectiveFrom).toISOString();
    }
    const config = await prisma.salaryConfig.upsert({
        where: { userId: req.params.userId },
        update: payload,
        create: { ...payload, userId: req.params.userId }
    });
    res.json({ success: true, data: config });
});
export const deleteSalaryConfig = asyncHandler(async (req, res) => {
    const config = await prisma.salaryConfig.findUnique({ where: { userId: req.params.userId } });
    if (!config) {
        res.status(404).json({ success: false, message: 'Salary config not found' });
        return;
    }
    await prisma.salaryConfig.delete({ where: { userId: req.params.userId } });
    res.json({ success: true, data: {} });
});
export const getLeaveAllocations = asyncHandler(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const allocations = await prisma.leaveAllocation.findMany({
        where: { organizationId: req.user.organizationId, year },
        include: { user: { select: { name: true, email: true } } }
    });
    res.json({ success: true, count: allocations.length, data: allocations });
});
export const getLeaveAllocation = asyncHandler(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const allocation = await prisma.leaveAllocation.findUnique({
        where: { userId_year: { userId: req.params.userId, year } }
    });
    res.json({ success: true, data: allocation });
});
export const upsertLeaveAllocation = asyncHandler(async (req, res) => {
    const year = Number(req.body.year) || new Date().getFullYear();
    const allocation = await prisma.leaveAllocation.upsert({
        where: { userId_year: { userId: req.params.userId, year } },
        update: { ...req.body, createdBy: req.user.id },
        create: { ...req.body, userId: req.params.userId, organizationId: req.user.organizationId, year, createdBy: req.user.id }
    });
    res.json({ success: true, data: allocation });
});
export const bulkInitLeaveAllocations = asyncHandler(async (req, res) => {
    const { year = new Date().getFullYear(), casual, sick, earned } = req.body;
    const users = await prisma.user.findMany({ where: { organizationId: req.user.organizationId, status: 'active', NOT: { role: { in: ['student', 'center_admin'] } } } });
    const results = await Promise.all(users.map(u => prisma.leaveAllocation.upsert({
        where: { userId_year: { userId: u.id, year } },
        update: { casualLeave: casual, sickLeave: sick, earnedLeave: earned },
        create: { userId: u.id, organizationId: req.user.organizationId, year, casualLeave: casual, sickLeave: sick, earnedLeave: earned, createdBy: req.user.id }
    })));
    res.json({ success: true, message: `Initialized for ${results.length} users` });
});
export const generateSmartPayroll = asyncHandler(async (req, res) => {
    const { month } = req.body;
    if (!month) {
        res.status(400).json({ success: false, message: 'Month is required (e.g. YYYY-MM)' });
        return;
    }
    const organizationId = req.user.organizationId;
    const hrSettings = await prisma.hRSettings.findUnique({ where: { organizationId } });
    const latePolicy = hrSettings?.latePolicy || {};
    const gracePeriod = Number(latePolicy.gracePeriod) || 0;
    const maxLateThresholdPerMonth = Number(latePolicy.maxLateThresholdPerMonth) || 0;
    const [yearStr, monthStr] = month.split('-');
    const startDate = new Date(Number(yearStr), Number(monthStr) - 1, 1);
    const endDate = new Date(Number(yearStr), Number(monthStr), 1);
    const configs = await prisma.salaryConfig.findMany({
        where: { organizationId, approvalStatus: 'approved' }
    });
    const existingPayrolls = await prisma.payroll.findMany({
        where: { organizationId, month },
        select: { employeeId: true }
    });
    const existingIds = new Set(existingPayrolls.map(p => p.employeeId));
    let createdCount = 0;
    let skippedCount = 0;
    for (const config of configs) {
        if (existingIds.has(config.userId)) {
            skippedCount++;
            continue;
        }
        const attendances = await prisma.attendance.findMany({
            where: {
                employeeId: config.userId,
                date: { gte: startDate, lt: endDate },
                isLate: true
            }
        });
        let totalBillableLateMinutes = 0;
        for (const att of attendances) {
            const billable = Math.max(0, att.lateMinutes - gracePeriod);
            totalBillableLateMinutes += billable;
        }
        const chargeableLateMinutes = Math.max(0, totalBillableLateMinutes - maxLateThresholdPerMonth);
        const lateDeductionAmount = chargeableLateMinutes * (config.lateDeductionPerMinute || 0);
        const allowances = config.allowances || {};
        const deductions = config.deductions || {};
        const sumAllowances = Object.values(allowances).reduce((acc, val) => acc + (Number(val) || 0), 0);
        const grossSalary = config.basicSalary + sumAllowances;
        // Leave Deductions
        const unpaidLeaves = await prisma.leaveRequest.findMany({
            where: {
                employeeId: config.userId,
                type: 'unpaid',
                status: { in: ['approved', 'dept_approved'] },
                startDate: { gte: startDate, lt: endDate }
            }
        });
        const unpaidDays = unpaidLeaves.reduce((acc, l) => acc + (l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1), 0);
        const leaveDeductionAmount = (grossSalary / 30) * unpaidDays;
        const standardDeductions = Object.values(deductions).reduce((acc, val) => acc + (Number(val) || 0), 0);
        const finalDeductions = { ...deductions, lateDeduction: lateDeductionAmount, leaveDeduction: leaveDeductionAmount };
        const totalDeductions = standardDeductions + lateDeductionAmount + leaveDeductionAmount;
        const netSalary = grossSalary - totalDeductions;
        await prisma.payroll.create({
            data: {
                organizationId,
                employeeId: config.userId,
                month,
                basicSalary: config.basicSalary,
                allowances,
                deductions: finalDeductions,
                grossSalary,
                netSalary,
                status: 'draft'
            }
        });
        createdCount++;
    }
    res.json({
        success: true,
        data: [],
        message: `Generated ${createdCount} payroll records. Skipped ${skippedCount}.`
    });
});
export const approveSalaryConfig = asyncHandler(async (req, res) => {
    const config = await prisma.salaryConfig.update({
        where: { id: req.params.id },
        data: { approvalStatus: 'approved', approvedBy: req.user.id, approvedAt: new Date() }
    });
    res.json({ success: true, data: config });
});
//# sourceMappingURL=salaryController.js.map