import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPayrollBranchId, payrollScopeWhere } from '../utils/payrollScope.js';

// Finds a payroll only if it belongs to the requester's organization and branch scope
const findScopedPayroll = (req: AuthRequest, id: string) =>
  prisma.payroll.findFirst({ where: { ...payrollScopeWhere(req), id } });

export const getPayrolls = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = payrollScopeWhere(req);
  if (['hr_admin', 'hr_sub_admin'].includes(req.user.role)) {
    where.user = { ...(where.user || {}), role: { not: 'center_admin' } };
  }
  if (req.query.employeeId) {
    where.employeeId = req.query.employeeId as string;
  }
  const payrolls = await prisma.payroll.findMany({
    where,
    include: { user: { select: { name: true, email: true, branchId: true, branch: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, count: payrolls.length, data: payrolls });
});

export const getPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payroll = await prisma.payroll.findFirst({
    where: { ...payrollScopeWhere(req), id: req.params.id },
    include: { user: true }
  });
  if (!payroll) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }
  res.json({ success: true, data: payroll });
});

export const createPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { branchId: _branchId, ...data } = req.body;
  const branchId = getPayrollBranchId(req);
  const employee = data.employeeId
    ? await prisma.user.findFirst({
        where: { id: data.employeeId, organizationId: req.user.organizationId },
        select: { status: true, branchId: true }
      })
    : null;
  if (!employee) {
    res.status(404).json({ success: false, message: 'Employee not found' });
    return;
  }
  if (branchId && employee.branchId !== branchId) {
    res.status(403).json({ success: false, message: 'You can only generate payroll for employees in your branch' });
    return;
  }
  if (employee.status === 'resigned') {
    res.status(400).json({ success: false, message: 'Cannot generate payroll for a resigned employee' });
    return;
  }
  const payroll = await prisma.payroll.create({ data: { ...data, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: payroll });
});

export const updatePayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await findScopedPayroll(req, req.params.id);
  if (!exists) {
    res.status(404).json({ success: false, message: 'Payroll not found' });
    return;
  }
  const { basicSalary, allowances, deductions, netSalary, status, remarks } = req.body;
  const updateData: any = {};
  if (basicSalary !== undefined) updateData.basicSalary = Number(basicSalary);
  if (allowances !== undefined) updateData.allowances = allowances;
  if (deductions !== undefined) updateData.deductions = deductions;
  if (netSalary !== undefined) updateData.netSalary = Number(netSalary);
  if (status !== undefined) updateData.status = status;
  if (remarks !== undefined) updateData.remarks = remarks;

  const payroll = await prisma.payroll.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: payroll });
});

export const deletePayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payroll = await findScopedPayroll(req, req.params.id);
  if (!payroll) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }
  await prisma.payroll.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const processPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!(await findScopedPayroll(req, req.params.id))) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }
  const payroll = await prisma.payroll.update({
    where: { id: req.params.id },
    data: { status: 'processed', processedBy: req.user.id, processedAt: new Date() }
  });
  res.status(200).json({ success: true, data: payroll });
});

export const confirmPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!(await findScopedPayroll(req, req.params.id))) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }
  const payroll = await prisma.payroll.update({
    where: { id: req.params.id },
    data: { status: 'confirmed', financeApprovedAt: new Date() }
  });
  res.status(200).json({ success: true, data: payroll });
});

export const markPayrollPaid = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!(await findScopedPayroll(req, req.params.id))) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }
  const payroll = await prisma.payroll.update({
    where: { id: req.params.id },
    data: { status: 'paid', paymentDate: new Date() }
  });
  res.status(200).json({ success: true, data: payroll });
});

export const generateMonthlyPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Monthly payroll generation logic not implemented' });
});

export const transferToFinance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { payrollIds, month, remarks } = req.body;
  if (!Array.isArray(payrollIds) || payrollIds.length === 0) {
    res.status(400).json({ success: false, message: 'payrollIds is required' });
    return;
  }
  const payrolls = await prisma.payroll.findMany({ where: { ...payrollScopeWhere(req), id: { in: payrollIds } } });
  if (payrolls.length !== payrollIds.length) {
    res.status(403).json({ success: false, message: 'Some payroll records are outside your branch or organization' });
    return;
  }
  const totalAmount = payrolls.reduce((sum, p) => sum + p.netSalary, 0);

  const batch = await prisma.payrollBatch.create({
    data: {
      organizationId: req.user.organizationId,
      month,
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

export const getPayrollBatches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const batches = await prisma.payrollBatch.findMany({
    where: { organizationId: req.user.organizationId },
    include: {
      transferer: { select: { name: true } },
      approver: { select: { name: true } },
      rejector: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const batchesWithPayrolls = await Promise.all(
    batches.map(async (batch) => {
      const payrolls = await prisma.payroll.findMany({
        where: { ...payrollScopeWhere(req), id: { in: batch.payrollIds } },
        include: { user: { select: { name: true, employeeProfile: { select: { employeeId: true } } } } }
      });
      return { ...batch, payrolls };
    })
  );

  const visible = getPayrollBranchId(req)
    ? batchesWithPayrolls.filter(b => b.payrolls.length > 0)
    : batchesWithPayrolls;

  res.status(200).json({ success: true, count: visible.length, data: visible });
});

export const getPayrollBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const batch = await prisma.payrollBatch.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: batch });
});

export const financeApprovePayrollBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const batch = await prisma.payrollBatch.update({
    where: { id: req.params.id },
    data: { status: 'approved_by_finance', approvedBy: req.user.id, approvedAt: new Date() }
  });
  await prisma.payroll.updateMany({
    where: { id: { in: batch.payrollIds } },
    data: { financeApprovedBy: req.user.id, financeApprovedAt: new Date() }
  });
  res.status(200).json({ success: true, data: batch });
});

export const financeRejectPayrollBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const batch = await prisma.payrollBatch.update({
    where: { id: req.params.id },
    data: { status: 'rejected', rejectionReason: req.body.rejectionReason || req.body.remarks, rejectedBy: req.user.id, rejectedAt: new Date() }
  });
  await prisma.payroll.updateMany({
    where: { id: { in: batch.payrollIds } },
    data: { status: 'confirmed' }
  });
  res.status(200).json({ success: true, data: batch });
});

export const markBatchPaymentInProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const batch = await prisma.payrollBatch.update({
    where: { id: req.params.id },
    data: { status: 'payment_in_progress' }
  });
  res.status(200).json({ success: true, data: batch });
});

export const completeBatchPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const batch = await prisma.payrollBatch.update({
    where: { id: req.params.id },
    data: { status: 'completed', completedAt: new Date() }
  });
  await prisma.payroll.updateMany({
    where: { id: { in: batch.payrollIds } },
    data: { 
      status: 'paid', 
      paymentDate: new Date(), 
      paymentMethod: req.body.paymentMethod || 'bank_transfer' 
    }
  });
  res.status(200).json({ success: true, data: batch });
});
