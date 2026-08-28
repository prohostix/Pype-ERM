import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getPayrolls = asyncHandler(async (req, res) => {
    const where = { organizationId: req.user.organizationId };
    if (req.user.role === 'hr_admin') {
        where.user = { role: { not: 'center_admin' } };
    }
    const payrolls = await prisma.payroll.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, count: payrolls.length, data: payrolls });
});
export const getPayroll = asyncHandler(async (req, res) => {
    const payroll = await prisma.payroll.findFirst({
        where: { id: req.params.id, organizationId: req.user.organizationId },
        include: { user: true }
    });
    if (!payroll) {
        res.status(404).json({ success: false, message: 'Payroll record not found' });
        return;
    }
    res.json({ success: true, data: payroll });
});
export const createPayroll = asyncHandler(async (req, res) => {
    const payroll = await prisma.payroll.create({ data: { ...req.body, organizationId: req.user.organizationId } });
    res.status(201).json({ success: true, data: payroll });
});
export const updatePayroll = asyncHandler(async (req, res) => {
    const exists = await prisma.payroll.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Payroll not found' });
        return;
    }
    const { basicSalary, allowances, deductions, netSalary, status, remarks } = req.body;
    const updateData = {};
    if (basicSalary !== undefined)
        updateData.basicSalary = Number(basicSalary);
    if (allowances !== undefined)
        updateData.allowances = allowances;
    if (deductions !== undefined)
        updateData.deductions = deductions;
    if (netSalary !== undefined)
        updateData.netSalary = Number(netSalary);
    if (status !== undefined)
        updateData.status = status;
    if (remarks !== undefined)
        updateData.remarks = remarks;
    const payroll = await prisma.payroll.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: payroll });
});
export const deletePayroll = asyncHandler(async (req, res) => {
    const payroll = await prisma.payroll.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!payroll) {
        res.status(404).json({ success: false, message: 'Payroll record not found' });
        return;
    }
    await prisma.payroll.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
export const processPayroll = asyncHandler(async (req, res) => {
    const payroll = await prisma.payroll.update({
        where: { id: req.params.id },
        data: { status: 'processed', processedBy: req.user.id, processedAt: new Date() }
    });
    res.status(200).json({ success: true, data: payroll });
});
export const confirmPayroll = asyncHandler(async (req, res) => {
    const payroll = await prisma.payroll.update({
        where: { id: req.params.id },
        data: { status: 'confirmed', financeApprovedAt: new Date() }
    });
    res.status(200).json({ success: true, data: payroll });
});
export const markPayrollPaid = asyncHandler(async (req, res) => {
    const payroll = await prisma.payroll.update({
        where: { id: req.params.id },
        data: { status: 'paid', paymentDate: new Date() }
    });
    res.status(200).json({ success: true, data: payroll });
});
export const generateMonthlyPayroll = asyncHandler(async (req, res) => {
    res.json({ success: true, message: 'Monthly payroll generation logic not implemented' });
});
export const transferToFinance = asyncHandler(async (req, res) => {
    const { payrollIds, month, year, remarks } = req.body;
    const payrolls = await prisma.payroll.findMany({ where: { id: { in: payrollIds } } });
    const totalAmount = payrolls.reduce((sum, p) => sum + p.netSalary, 0);
    const batch = await prisma.payrollBatch.create({
        data: {
            organizationId: req.user.organizationId,
            month: `${year}-${month}`,
            payrollIds,
            totalAmount,
            employeeCount: payrolls.length,
            transferredBy: req.user.id,
            remarks,
            status: 'pending_finance_approval'
        }
    });
    await prisma.payroll.updateMany({ where: { id: { in: payrollIds } }, data: { status: 'transferred_to_finance' } });
    res.status(201).json({ success: true, data: batch });
});
export const getPayrollBatches = asyncHandler(async (req, res) => {
    const batches = await prisma.payrollBatch.findMany({
        where: { organizationId: req.user.organizationId },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, count: batches.length, data: batches });
});
export const getPayrollBatch = asyncHandler(async (req, res) => {
    const batch = await prisma.payrollBatch.findUnique({ where: { id: req.params.id } });
    res.json({ success: true, data: batch });
});
export const financeApprovePayrollBatch = asyncHandler(async (req, res) => {
    const batch = await prisma.payrollBatch.update({
        where: { id: req.params.id },
        data: { status: 'approved_by_finance', approvedBy: req.user.id, approvedAt: new Date() }
    });
    res.status(200).json({ success: true, data: batch });
});
export const financeRejectPayrollBatch = asyncHandler(async (req, res) => {
    const batch = await prisma.payrollBatch.update({
        where: { id: req.params.id },
        data: { status: 'rejected', rejectionReason: req.body.remarks, rejectedBy: req.user.id, rejectedAt: new Date() }
    });
    res.status(200).json({ success: true, data: batch });
});
export const markBatchPaymentInProgress = asyncHandler(async (req, res) => {
    const batch = await prisma.payrollBatch.update({
        where: { id: req.params.id },
        data: { status: 'payment_in_progress' }
    });
    res.status(200).json({ success: true, data: batch });
});
export const completeBatchPayment = asyncHandler(async (req, res) => {
    const batch = await prisma.payrollBatch.update({
        where: { id: req.params.id },
        data: { status: 'completed', completedAt: new Date() }
    });
    res.status(200).json({ success: true, data: batch });
});
//# sourceMappingURL=payrollController.js.map