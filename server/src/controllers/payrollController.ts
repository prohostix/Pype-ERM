import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPayrollBranchId, payrollScopeWhere } from '../utils/payrollScope.js';
import { can } from '../access/resolve.js';
import type { PageRequest } from '../access/pageGuard.js';
import type { PayrollRequest } from '../access/payrollGuard.js';

// Finds a payroll only if it belongs to the requester's organization and branch scope
const findScopedPayroll = (req: AuthRequest, id: string) =>
  prisma.payroll.findFirst({ where: { ...payrollScopeWhere(req), id } });

// Roles that work with other people's payroll. Everyone else (employees, department admins, ...)
// can only ever see their own.
const PAYROLL_STAFF_ROLES = [
  'hr_admin', 'hr_sub_admin', 'finance_admin', 'finance_sub_admin',
  'superadmin', 'org_admin', 'ceo', 'general_manager', 'branch_manager',
];
const isPayrollStaff = (req: AuthRequest) => PAYROLL_STAFF_ROLES.includes(req.user.role);

/** Someone acting only because an Org Admin allowed it may not act on their own pay. */
const refuseOwnPay = (req: PageRequest, res: Response, employeeIds: (string | undefined)[]): boolean => {
  if (!req.ownBranchOnly || !employeeIds.includes(req.user.id)) return false;
  res.status(403).json({ success: false, message: 'You cannot change or approve your own pay' });
  return true;
};

const NET_INCLUDE = { user: { select: { name: true, employeeProfile: { select: { employeeId: true } } } } };

/**
 * A batch as the requester may see it. A branch-restricted user (HR/Finance tied to a branch) only
 * sees their own branch's payrolls in it, with totals recomputed to match, so amounts and ids of
 * other branches never leave the server. `partial` is true when the batch also holds other branches.
 */
const batchViewFor = async (req: AuthRequest, batch: any) => {
  const inOrg = { organizationId: req.user.organizationId, id: { in: batch.payrollIds } };
  const visible = await prisma.payroll.findMany({ where: { ...payrollScopeWhere(req), id: { in: batch.payrollIds } }, include: NET_INCLUDE });
  if (!getPayrollBranchId(req)) return { ...batch, payrolls: visible, partial: false };
  const total = await prisma.payroll.count({ where: inOrg });
  return {
    ...batch,
    payrolls: visible,
    payrollIds: visible.map(p => p.id),
    totalAmount: visible.reduce((sum, p) => sum + p.netSalary, 0),
    employeeCount: visible.length,
    partial: visible.length < total,
  };
};

/**
 * Loads a batch for an action (approve, reject, pay, ...). It must belong to the requester's
 * organization; a branch-restricted user may act only on batches made up entirely of their own
 * branch's payroll, since an action moves every payroll in the batch.
 */
const loadBatchForAction = async (req: PageRequest, res: Response, id: string) => {
  const batch = await prisma.payrollBatch.findFirst({ where: { id, organizationId: req.user.organizationId } });
  if (!batch) {
    res.status(404).json({ success: false, message: 'Payroll batch not found' });
    return null;
  }
  if (getPayrollBranchId(req)) {
    const [visible, total] = await Promise.all([
      prisma.payroll.count({ where: { ...payrollScopeWhere(req), id: { in: batch.payrollIds } } }),
      prisma.payroll.count({ where: { organizationId: req.user.organizationId, id: { in: batch.payrollIds } } }),
    ]);
    if (visible === 0) {
      res.status(404).json({ success: false, message: 'Payroll batch not found' });
      return null;
    }
    if (visible < total) {
      res.status(403).json({ success: false, message: "This batch includes other branches' payroll. It has to be processed by someone who isn't limited to one branch." });
      return null;
    }
  }
  if (req.ownBranchOnly && await prisma.payroll.count({ where: { id: { in: batch.payrollIds }, employeeId: req.user.id } })) {
    refuseOwnPay(req, res, [req.user.id]);
    return null;
  }
  return batch;
};

export const getPayrolls = asyncHandler(async (req: PayrollRequest, res: Response) => {
  const where: any = payrollScopeWhere(req);
  if (['hr_admin', 'hr_sub_admin'].includes(req.user.role)) {
    where.user = { ...(where.user || {}), role: { not: 'center_admin' } };
  }
  // Given access applies to the team screens; "My Pay Slips" asks for neither and stays personal
  const team = req.payrollTeam !== 'blocked'
    && (isPayrollStaff(req) || (req.payrollTeam === 'given' && Boolean(req.query.team || req.query.employeeId)));
  if (!team) {
    // Employees (and other non-payroll roles) only ever see their own payslips.
    where.employeeId = req.user.id;
  } else if (req.query.employeeId) {
    where.employeeId = req.query.employeeId as string;
  }
  const payrolls = await prisma.payroll.findMany({
    where,
    include: { user: { select: { name: true, email: true, branchId: true, branch: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, count: payrolls.length, data: payrolls });
});

export const getPayroll = asyncHandler(async (req: PayrollRequest, res: Response) => {
  const team = req.payrollTeam !== 'blocked' && (isPayrollStaff(req) || req.payrollTeam === 'given');
  const payroll = await prisma.payroll.findFirst({
    where: { ...payrollScopeWhere(req), id: req.params.id, ...(team ? {} : { employeeId: req.user.id }) },
    include: { user: { select: { id: true, name: true, email: true, designation: true, branchId: true } } }
  });
  if (!payroll) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }
  res.json({ success: true, data: payroll });
});

export const createPayroll = asyncHandler(async (req: PageRequest, res: Response) => {
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
  if (refuseOwnPay(req, res, [data.employeeId])) return;
  // Without approval rights a new record can only be a draft
  if (req.ownBranchOnly && !can(req.access!, 'payroll', 'approve')) {
    for (const field of ['processedBy', 'processedAt', 'financeApprovedBy', 'financeApprovedAt', 'paymentDate', 'paymentMethod']) delete data[field];
    data.status = 'draft';
  }
  const payroll = await prisma.payroll.create({ data: { ...data, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: payroll });
});

export const updatePayroll = asyncHandler(async (req: PageRequest, res: Response) => {
  const exists = await findScopedPayroll(req, req.params.id);
  if (!exists) {
    res.status(404).json({ success: false, message: 'Payroll not found' });
    return;
  }
  if (refuseOwnPay(req, res, [exists.employeeId])) return;
  const { basicSalary, allowances, deductions, netSalary, status, remarks } = req.body;
  if (req.ownBranchOnly && status !== undefined && status !== exists.status && !can(req.access!, 'payroll', 'approve')) {
    res.status(403).json({ success: false, message: 'Only an approver can change the status of a payroll record' });
    return;
  }
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

export const deletePayroll = asyncHandler(async (req: PageRequest, res: Response) => {
  const payroll = await findScopedPayroll(req, req.params.id);
  if (!payroll) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }
  if (refuseOwnPay(req, res, [payroll.employeeId])) return;
  await prisma.payroll.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const processPayroll = asyncHandler(async (req: PageRequest, res: Response) => {
  const found = await findScopedPayroll(req, req.params.id);
  if (!found) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }
  if (refuseOwnPay(req, res, [found.employeeId])) return;
  const payroll = await prisma.payroll.update({
    where: { id: req.params.id },
    data: { status: 'processed', processedBy: req.user.id, processedAt: new Date() }
  });
  res.status(200).json({ success: true, data: payroll });
});

export const confirmPayroll = asyncHandler(async (req: PageRequest, res: Response) => {
  const found = await findScopedPayroll(req, req.params.id);
  if (!found) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }
  if (refuseOwnPay(req, res, [found.employeeId])) return;
  const payroll = await prisma.payroll.update({
    where: { id: req.params.id },
    data: { status: 'confirmed', financeApprovedAt: new Date() }
  });
  res.status(200).json({ success: true, data: payroll });
});

export const markPayrollPaid = asyncHandler(async (req: PageRequest, res: Response) => {
  const found = await findScopedPayroll(req, req.params.id);
  if (!found) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }
  if (refuseOwnPay(req, res, [found.employeeId])) return;
  const payroll = await prisma.payroll.update({
    where: { id: req.params.id },
    data: { status: 'paid', paymentDate: new Date() }
  });
  res.status(200).json({ success: true, data: payroll });
});

export const generateMonthlyPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Monthly payroll generation logic not implemented' });
});

export const transferToFinance = asyncHandler(async (req: PageRequest, res: Response) => {
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
  if (refuseOwnPay(req, res, payrolls.map(p => p.employeeId))) return;
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

  const views = await Promise.all(batches.map(batch => batchViewFor(req, batch)));
  // Branch-restricted users only see batches that contain at least one payroll of their branch.
  const visible = getPayrollBranchId(req) ? views.filter(b => b.payrolls.length > 0) : views;

  res.status(200).json({ success: true, count: visible.length, data: visible });
});

export const getPayrollBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const batch = await prisma.payrollBatch.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId },
    include: { transferer: { select: { name: true } }, approver: { select: { name: true } }, rejector: { select: { name: true } } },
  });
  const view = batch ? await batchViewFor(req, batch) : null;
  if (!view || (getPayrollBranchId(req) && view.payrolls.length === 0)) {
    res.status(404).json({ success: false, message: 'Payroll batch not found' });
    return;
  }
  res.json({ success: true, data: view });
});

const batchPayrollsWhere = (req: AuthRequest, batch: { payrollIds: string[] }) =>
  ({ organizationId: req.user.organizationId, id: { in: batch.payrollIds } });

export const financeApprovePayrollBatch = asyncHandler(async (req: PageRequest, res: Response) => {
  const found = await loadBatchForAction(req, res, req.params.id);
  if (!found) return;
  const batch = await prisma.payrollBatch.update({
    where: { id: found.id },
    data: { status: 'approved_by_finance', approvedBy: req.user.id, approvedAt: new Date() }
  });
  await prisma.payroll.updateMany({
    where: batchPayrollsWhere(req, batch),
    data: { financeApprovedBy: req.user.id, financeApprovedAt: new Date() }
  });
  res.status(200).json({ success: true, data: batch });
});

export const financeRejectPayrollBatch = asyncHandler(async (req: PageRequest, res: Response) => {
  const found = await loadBatchForAction(req, res, req.params.id);
  if (!found) return;
  const batch = await prisma.payrollBatch.update({
    where: { id: found.id },
    data: { status: 'rejected', rejectionReason: req.body.rejectionReason || req.body.remarks, rejectedBy: req.user.id, rejectedAt: new Date() }
  });
  await prisma.payroll.updateMany({
    where: batchPayrollsWhere(req, batch),
    data: { status: 'confirmed' }
  });
  res.status(200).json({ success: true, data: batch });
});

export const markBatchPaymentInProgress = asyncHandler(async (req: PageRequest, res: Response) => {
  const found = await loadBatchForAction(req, res, req.params.id);
  if (!found) return;
  const batch = await prisma.payrollBatch.update({
    where: { id: found.id },
    data: { status: 'payment_in_progress' }
  });
  res.status(200).json({ success: true, data: batch });
});

export const completeBatchPayment = asyncHandler(async (req: PageRequest, res: Response) => {
  const found = await loadBatchForAction(req, res, req.params.id);
  if (!found) return;
  const batch = await prisma.payrollBatch.update({
    where: { id: found.id },
    data: { status: 'completed', completedAt: new Date() }
  });
  await prisma.payroll.updateMany({
    where: batchPayrollsWhere(req, batch),
    data: { 
      status: 'paid', 
      paymentDate: new Date(), 
      paymentMethod: req.body.paymentMethod || 'bank_transfer' 
    }
  });
  res.status(200).json({ success: true, data: batch });
});
