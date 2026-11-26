import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPayrollBranchId } from '../utils/payrollScope.js';
import { refuseOwnRecord, type PageRequest } from '../access/pageGuard.js';
import { loadPayrollRules, calculatePay } from '../services/payrollCalculation.js';
import { branchUserFilter, getScopedBranchId, isUserInScope, GLOBAL_ROLES as GLOBAL_ROLES_FOR_SCOPE } from '../utils/branchScope.js';

// Only these fields can be written from a request. Identity and approval fields (id, userId,
// organizationId, approvalStatus, approvedBy, ...) are never taken from the client.
const SALARY_CONFIG_FIELDS = [
  'basicSalary', 'allowances', 'deductions', 'unpaidLeaveRule',
  'lateDeductionPerMinute', 'earlyExitDeductionPerMinute', 'wfhDeductionPerDay',
] as const;
const LEAVE_ALLOCATION_FIELDS = ['sickLeave', 'casualLeave', 'earnedLeave', 'complementaryLeave', 'wfh'] as const;

/** Someone acting only because an Org Admin allowed it may not set or approve their own salary. */
const refuseOwnSalary = (req: PageRequest, res: Response, userId: string): boolean => {
  if (!req.ownBranchOnly || userId !== req.user.id) return false;
  res.status(403).json({ success: false, message: 'You cannot change or approve your own salary' });
  return true;
};

export const getSalaryConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const configs = await prisma.salaryConfig.findMany({
    where: { organizationId: req.user.organizationId, ...branchUserFilter(req, { includeGeneralManager: true }) },
    include: { user: { select: { name: true, email: true, designation: true } } }
  });
  res.json({ success: true, count: configs.length, data: configs });
});

export const getFinanceSalaryConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const whereClause: any = { organizationId: req.user.organizationId, ...branchUserFilter(req, { includeGeneralManager: true }) };
  if (status) {
    whereClause.approvalStatus = status;
  }

  const configs = await prisma.salaryConfig.findMany({
    where: whereClause,
    include: { user: { select: { name: true, email: true, designation: true, role: true, departmentId: true } } },
    orderBy: { updatedAt: 'desc' }
  });

  const allConfigs = await prisma.salaryConfig.groupBy({
    by: ['approvalStatus'],
    where: { organizationId: req.user.organizationId, ...branchUserFilter(req, { includeGeneralManager: true }) },
    _count: { approvalStatus: true }
  });

  const summary = {
    pending_approval: 0,
    approved: 0,
    rejected: 0
  };

  allConfigs.forEach(item => {
    if (summary[item.approvalStatus as keyof typeof summary] !== undefined) {
      summary[item.approvalStatus as keyof typeof summary] = item._count.approvalStatus;
    }
  });

  res.json({ success: true, count: configs.length, data: configs, summary });
});

export const getSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const inScope = await isUserInScope(req, req.params.userId, { includeGeneralManager: true });
  const config = inScope
    ? await prisma.salaryConfig.findFirst({ where: { userId: req.params.userId, organizationId: req.user.organizationId } })
    : null;
  if (!config) {
    res.status(404).json({ success: false, message: 'Salary config not found' });
    return;
  }
  res.json({ success: true, data: config });
});

export const upsertSalaryConfig = asyncHandler(async (req: PageRequest, res: Response) => {
  if (refuseOwnSalary(req, res, req.params.userId)) return;
  // The employee must be in the requester's organization and branch.
  if (!(await isUserInScope(req, req.params.userId, { includeGeneralManager: true }))) {
    res.status(404).json({ success: false, message: 'Employee not found' });
    return;
  }
  const body = req.body || {};
  const payload: any = { organizationId: req.user.organizationId, createdBy: req.user.id };
  for (const field of SALARY_CONFIG_FIELDS) if (body[field] !== undefined) payload[field] = body[field];
  if (body.effectiveFrom) payload.effectiveFrom = new Date(body.effectiveFrom).toISOString();

  if (payload.basicSalary !== undefined) {
    const basic = Number(payload.basicSalary);
    if (!Number.isFinite(basic) || basic < 0) {
      res.status(400).json({ success: false, message: 'basicSalary must be a number, 0 or more' });
      return;
    }
    payload.basicSalary = basic;
  }

  // Update when a config exists; a new config needs a basic salary.
  const existing = await prisma.salaryConfig.findUnique({ where: { userId: req.params.userId }, select: { id: true } });
  if (!existing && payload.basicSalary === undefined) {
    res.status(400).json({ success: false, message: 'basicSalary is required for a new salary config' });
    return;
  }
  // A change made with given access goes back for approval
  if (req.ownBranchOnly) Object.assign(payload, { approvalStatus: 'pending_approval', approvedBy: null, approvedAt: null });
  const config = existing
    ? await prisma.salaryConfig.update({ where: { userId: req.params.userId }, data: payload })
    : await prisma.salaryConfig.create({ data: { ...payload, userId: req.params.userId } });
  res.json({ success: true, data: config });
});

export const deleteSalaryConfig = asyncHandler(async (req: PageRequest, res: Response) => {
  if (refuseOwnSalary(req, res, req.params.userId)) return;
  const config = (await isUserInScope(req, req.params.userId, { includeGeneralManager: true }))
    ? await prisma.salaryConfig.findFirst({ where: { userId: req.params.userId, organizationId: req.user.organizationId } })
    : null;
  if (!config) {
    res.status(404).json({ success: false, message: 'Salary config not found' });
    return;
  }
  await prisma.salaryConfig.delete({ where: { userId: req.params.userId } });
  res.json({ success: true, data: {} });
});

export const getLeaveAllocations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const month = Number(req.query.month) || (new Date().getMonth() + 1);
  const allocations = await prisma.leaveAllocation.findMany({
    where: { organizationId: req.user.organizationId, year, month, ...branchUserFilter(req, { includeGeneralManager: true }) },
    include: { user: { select: { name: true, email: true, role: true, designation: true, employeeProfileDetail: { select: { joinDate: true, probationEndDate: true } } } } }
  });
  res.json({ success: true, count: allocations.length, data: allocations });
});

export const getLeaveAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const month = Number(req.query.month) || (new Date().getMonth() + 1);
  if (!(await isUserInScope(req, req.params.userId, { includeGeneralManager: true }))) {
    res.status(404).json({ success: false, message: 'Employee not found' });
    return;
  }
  const allocation = await prisma.leaveAllocation.findFirst({
    where: { userId: req.params.userId, organizationId: req.user.organizationId, year, month }
  });
  res.json({ success: true, data: allocation });
});

export const upsertLeaveAllocation = asyncHandler(async (req: PageRequest, res: Response) => {
  if (!(await isUserInScope(req, req.params.userId, { includeGeneralManager: true }))) {
    res.status(404).json({ success: false, message: 'Employee not found' });
    return;
  }
  if (refuseOwnRecord(req, res, req.params.userId, 'leave allocation')) return;
  const year = Number(req.body?.year) || new Date().getFullYear();
  const month = Number(req.body?.month) || (new Date().getMonth() + 1);

  const values: Record<string, number> = {};
  for (const field of LEAVE_ALLOCATION_FIELDS) {
    if (req.body?.[field] === undefined) continue;
    const n = Number(req.body[field]);
    if (!Number.isFinite(n) || n < 0) {
      res.status(400).json({ success: false, message: `${field} must be a number, 0 or more` });
      return;
    }
    values[field] = n;
  }

  const allocation = await prisma.leaveAllocation.upsert({
    where: { userId_year_month: { userId: req.params.userId, year, month } },
    update: { ...values, createdBy: req.user.id },
    create: { ...values, userId: req.params.userId, organizationId: req.user.organizationId, year, month, createdBy: req.user.id }
  });
  res.json({ success: true, data: allocation });
});

export const deleteLeaveAllocation = asyncHandler(async (req: PageRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const month = Number(req.query.month) || (new Date().getMonth() + 1);

  if (!(await isUserInScope(req, req.params.userId, { includeGeneralManager: true }))) {
    res.status(404).json({ success: false, message: 'Employee not found' });
    return;
  }

  if (refuseOwnRecord(req, res, req.params.userId, 'leave allocation')) return;

  await prisma.leaveAllocation.deleteMany({
    where: {
      userId: req.params.userId,
      organizationId: req.user.organizationId,
      year,
      month
    }
  });

  res.json({ success: true, message: 'Leave allocation deleted successfully' });
});

export const bulkInitLeaveAllocations = asyncHandler(async (req: PageRequest, res: Response) => {
  const body = req.body || {};
  const year = Number(body.year) || new Date().getFullYear();
  const month = Number(body.month) || (new Date().getMonth() + 1);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    res.status(400).json({ success: false, message: 'month must be between 1 and 12' });
    return;
  }

  // The panel sends sickLeave/casualLeave/...; the older short names (sick/casual/earned) still work.
  const FIELD_NAMES: Record<(typeof LEAVE_ALLOCATION_FIELDS)[number], string[]> = {
    sickLeave: ['sickLeave', 'sick'],
    casualLeave: ['casualLeave', 'casual'],
    earnedLeave: ['earnedLeave', 'earned'],
    complementaryLeave: ['complementaryLeave'],
    wfh: ['wfh'],
  };
  const values: Record<string, number> = {};
  for (const field of LEAVE_ALLOCATION_FIELDS) {
    const sent = FIELD_NAMES[field].find(name => body[name] !== undefined && body[name] !== null && body[name] !== '');
    if (!sent) continue;
    const n = Number(body[sent]);
    if (!Number.isFinite(n) || n < 0) {
      res.status(400).json({ success: false, message: `${sent} must be a number, 0 or more` });
      return;
    }
    values[field] = n;
  }

  // Employees in scope: the requester's own branch when they are branch-restricted, otherwise the
  // whole organization (or one branch, if an unrestricted HR/admin asks for it with branchId).
  const scopedBranchId = getScopedBranchId(req);
  const users = await prisma.user.findMany({
    where: {
      organizationId: req.user.organizationId,
      status: 'active',
      ...(req.ownBranchOnly && { id: { not: req.user.id } }),
      NOT: { role: { in: ['student', 'center_admin'] } },
      // A branch-locked HR user also covers the General Manager, who has no branch
      ...(scopedBranchId
        ? { OR: [{ branchId: scopedBranchId }, ...(!req.ownBranchOnly && !GLOBAL_ROLES_FOR_SCOPE.includes(req.user.role) ? [{ role: 'general_manager' as const, branchId: null }] : [])] }
        : {}),
    },
    select: { id: true },
  });

  // Only employees without an allocation for this month are set up; existing ones keep whatever HR gave them.
  const existing = await prisma.leaveAllocation.findMany({
    where: { organizationId: req.user.organizationId, year, month, userId: { in: users.map(u => u.id) } },
    select: { userId: true },
  });
  const have = new Set(existing.map(a => a.userId));
  const missing = users.filter(u => !have.has(u.id));

  if (missing.length > 0) {
    await prisma.leaveAllocation.createMany({
      data: missing.map(u => ({ ...values, userId: u.id, organizationId: req.user.organizationId, year, month, createdBy: req.user.id })),
      skipDuplicates: true,
    });
  }

  const skipped = users.length - missing.length;
  res.json({
    success: true,
    message: `Initialized ${missing.length} employee${missing.length === 1 ? '' : 's'}${skipped ? ` (${skipped} already had an allocation)` : ''}`,
    data: { created: missing.length, skipped },
  });
});

export const generateSmartPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month } = req.body;
  if (!month) {
    res.status(400).json({ success: false, message: 'Month is required (e.g. YYYY-MM)' });
    return;
  }
  
  const organizationId = req.user.organizationId;

  const rules = await loadPayrollRules(organizationId, month, req.body);
  const { startDate, endDate } = rules;

  // Late arrivals and leave can still be added until the last day is over
  if (endDate.getTime() >= Date.now()) {
    const day = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    res.status(400).json({
      success: false,
      message: `The salary cycle ${day(startDate)} to ${day(endDate)} has not ended. Generate this payroll after ${day(endDate)}.`
    });
    return;
  }

  const branchId = getPayrollBranchId(req);
  const configs = await prisma.salaryConfig.findMany({
    where: {
      organizationId,
      approvalStatus: 'approved',
      user: { status: { not: 'resigned' }, ...(branchId ? { branchId } : {}) }
    }
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

    const pay = await calculatePay(config, rules);

    await prisma.payroll.create({
      data: {
        organizationId,
        employeeId: config.userId,
        month,
        basicSalary: pay.basicSalary,
        allowances: pay.allowances,
        deductions: pay.deductions,
        grossSalary: pay.grossSalary,
        netSalary: pay.netSalary,
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

/**
 * GET /hr/payroll/deductions-report?month=YYYY-MM&employeeId= — what each person's pay loses, for the
 * attendance export. A generated payroll is shown as saved; otherwise it is worked out as of now.
 */
export const getDeductionsReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const month = String(req.query.month || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    res.status(400).json({ success: false, message: 'month is required (YYYY-MM)' });
    return;
  }
  const organizationId = req.user.organizationId;
  const branchId = getPayrollBranchId(req);
  const employeeId = req.query.employeeId && req.query.employeeId !== 'all' ? String(req.query.employeeId) : undefined;
  const userWhere = branchId ? { branchId } : {};
  const employee = { select: { name: true, email: true } };

  const [rules, saved, configs] = await Promise.all([
    loadPayrollRules(organizationId, month),
    prisma.payroll.findMany({
      where: { organizationId, month, user: userWhere, ...(employeeId && { employeeId }) },
      include: { user: employee }
    }),
    prisma.salaryConfig.findMany({
      where: { organizationId, approvalStatus: 'approved', user: { status: { not: 'resigned' }, ...userWhere }, ...(employeeId && { userId: employeeId }) },
      include: { user: employee }
    })
  ]);

  const total = (values: unknown) => Object.values((values || {}) as Record<string, unknown>).reduce<number>((sum, v) => sum + (Number(v) || 0), 0);
  const money = (n: number) => Math.round(n * 100) / 100;
  const row = (person: { name: string; email: string }, pay: { basicSalary: number; allowances: unknown; deductions: unknown; grossSalary: number; netSalary: number }) => {
    const { lateDeduction = 0, earlyExitDeduction = 0, leaveDeduction = 0, absentDeduction = 0, wfhDeduction = 0, ...fixed } = (pay.deductions || {}) as Record<string, number>;
    return {
      name: person.name,
      email: person.email,
      basicSalary: money(pay.basicSalary),
      allowances: money(total(pay.allowances)),
      grossSalary: money(pay.grossSalary),
      fixedDeductions: money(total(fixed)),
      lateDeduction: money(lateDeduction),
      earlyExitDeduction: money(earlyExitDeduction),
      leaveDeduction: money(leaveDeduction),
      absentDeduction: money(absentDeduction),
      wfhDeduction: money(wfhDeduction),
      totalDeductions: money(pay.grossSalary - pay.netSalary),
      netSalary: money(pay.netSalary)
    };
  };

  const generated = new Set(saved.map(p => p.employeeId));
  const rows: object[] = saved.map(p => ({ userId: p.employeeId, ...row(p.user, p), source: `Payroll (${p.status.replace(/_/g, ' ')})` }));
  const ended = rules.endDate.getTime() < Date.now();
  for (const config of configs) {
    if (generated.has(config.userId)) continue;
    const pay = await calculatePay(config, rules);
    rows.push({
      userId: config.userId,
      ...row(config.user, pay),
      source: ended ? 'Estimate (not generated)' : 'Estimate (cycle not ended)',
      lateMinutes: pay.lateMinutes,
      earlyExitMinutes: pay.earlyExitMinutes,
      unpaidDays: pay.unpaidDays,
      absentDays: pay.absentDays
    });
  }

  const day = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  res.json({ success: true, data: { periodFrom: day(rules.startDate), periodTo: day(rules.endDate), rows } });
});

export const approveSalaryConfig = asyncHandler(async (req: PageRequest, res: Response) => {
  // Finance can only approve configs of their own organization and branch.
  const existing = await prisma.salaryConfig.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId, ...branchUserFilter(req, { includeGeneralManager: true }) },
    select: { id: true, userId: true },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Salary config not found' });
    return;
  }
  if (refuseOwnSalary(req, res, existing.userId)) return;
  const rejected = req.body?.action === 'reject';
  const config = await prisma.salaryConfig.update({
    where: { id: req.params.id },
    data: {
      approvalStatus: rejected ? 'rejected' : 'approved',
      rejectedRemarks: rejected ? req.body.remarks || null : null,
      approvedBy: req.user.id,
      approvedAt: new Date()
    }
  });
  res.json({ success: true, data: config });
});

export const getSalaryCycle = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { metadata: true }
  });

  const metadata = (org?.metadata as any) || {};
  const salaryCycle = metadata.salaryCycle || {
    type: 'monthly_day',
    startDay: 1,
    endDay: 31,
    cycleMode: 'same_month',
    customStartDate: '',
    customEndDate: ''
  };

  res.json({ success: true, data: salaryCycle });
});

export const updateSalaryCycle = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const { type, startDay, endDay, cycleMode, customStartDate, customEndDate } = req.body;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { metadata: true }
  });

  const metadata = (org?.metadata as any) || {};
  const updatedCycle = {
    type: type || 'monthly_day',
    startDay: Number(startDay) || 1,
    endDay: Number(endDay) || 31,
    cycleMode: cycleMode || (Number(startDay) > Number(endDay) ? 'previous_to_current' : 'same_month'),
    customStartDate: customStartDate || '',
    customEndDate: customEndDate || ''
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      metadata: {
        ...metadata,
        salaryCycle: updatedCycle
      }
    }
  });

  res.json({ success: true, message: 'Salary cycle updated successfully', data: updatedCycle });
});
