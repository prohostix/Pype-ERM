import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPayrollBranchId } from '../utils/payrollScope.js';
import { branchUserFilter, getScopedBranchId, isUserInScope } from '../utils/branchScope.js';

// Only these fields can be written from a request. Identity and approval fields (id, userId,
// organizationId, approvalStatus, approvedBy, ...) are never taken from the client.
const SALARY_CONFIG_FIELDS = [
  'basicSalary', 'allowances', 'deductions', 'unpaidLeaveRule',
  'lateDeductionPerMinute', 'earlyExitDeductionPerMinute', 'wfhDeductionPerDay',
] as const;
const LEAVE_ALLOCATION_FIELDS = ['sickLeave', 'casualLeave', 'earnedLeave', 'complementaryLeave', 'wfh'] as const;

export const getSalaryConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const configs = await prisma.salaryConfig.findMany({
    where: { organizationId: req.user.organizationId, ...branchUserFilter(req) },
    include: { user: { select: { name: true, email: true, designation: true } } }
  });
  res.json({ success: true, count: configs.length, data: configs });
});

export const getFinanceSalaryConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const whereClause: any = { organizationId: req.user.organizationId, ...branchUserFilter(req) };
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
    where: { organizationId: req.user.organizationId, ...branchUserFilter(req) },
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
  const inScope = await isUserInScope(req, req.params.userId);
  const config = inScope
    ? await prisma.salaryConfig.findFirst({ where: { userId: req.params.userId, organizationId: req.user.organizationId } })
    : null;
  if (!config) {
    res.status(404).json({ success: false, message: 'Salary config not found' });
    return;
  }
  res.json({ success: true, data: config });
});

export const upsertSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  // The employee must be in the requester's organization and branch.
  if (!(await isUserInScope(req, req.params.userId))) {
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
  const config = existing
    ? await prisma.salaryConfig.update({ where: { userId: req.params.userId }, data: payload })
    : await prisma.salaryConfig.create({ data: { ...payload, userId: req.params.userId } });
  res.json({ success: true, data: config });
});

export const deleteSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const config = (await isUserInScope(req, req.params.userId))
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
    where: { organizationId: req.user.organizationId, year, month, ...branchUserFilter(req) },
    include: { user: { select: { name: true, email: true, role: true, designation: true, employeeProfileDetail: { select: { joinDate: true, probationEndDate: true } } } } }
  });
  res.json({ success: true, count: allocations.length, data: allocations });
});

export const getLeaveAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const month = Number(req.query.month) || (new Date().getMonth() + 1);
  if (!(await isUserInScope(req, req.params.userId))) {
    res.status(404).json({ success: false, message: 'Employee not found' });
    return;
  }
  const allocation = await prisma.leaveAllocation.findFirst({
    where: { userId: req.params.userId, organizationId: req.user.organizationId, year, month }
  });
  res.json({ success: true, data: allocation });
});

export const upsertLeaveAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!(await isUserInScope(req, req.params.userId))) {
    res.status(404).json({ success: false, message: 'Employee not found' });
    return;
  }
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

export const deleteLeaveAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const month = Number(req.query.month) || (new Date().getMonth() + 1);

  if (!(await isUserInScope(req, req.params.userId))) {
    res.status(404).json({ success: false, message: 'Employee not found' });
    return;
  }

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

export const bulkInitLeaveAllocations = asyncHandler(async (req: AuthRequest, res: Response) => {
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
      NOT: { role: { in: ['student', 'center_admin'] } },
      ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
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

  const hrSettings = await prisma.hRSettings.findUnique({ where: { organizationId } });
  const latePolicy: any = hrSettings?.latePolicy || {};
  const gracePeriod = Number(latePolicy.gracePeriod) || 0;
  const maxLateThresholdPerMonth = Number(latePolicy.maxLateThresholdPerMonth) || 0;

  const [yearStr, monthStr] = month.split('-');
  
  // Organization salary cycle settings
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { metadata: true }
  });
  const metadata = (org?.metadata as any) || {};
  const salaryCycle = metadata.salaryCycle;

  let startDate: Date;
  let endDate: Date;

  if (req.body.startDate && req.body.endDate) {
    startDate = new Date(req.body.startDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(req.body.endDate);
    endDate.setHours(23, 59, 59, 999);
  } else if (salaryCycle?.type === 'custom_range' && salaryCycle.customStartDate && salaryCycle.customEndDate) {
    startDate = new Date(salaryCycle.customStartDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(salaryCycle.customEndDate);
    endDate.setHours(23, 59, 59, 999);
  } else if (salaryCycle?.startDay && salaryCycle?.endDay) {
    const targetYear = Number(yearStr);
    const targetMonth = Number(monthStr); // 1-12
    const startDay = Number(salaryCycle.startDay);
    const endDay = Number(salaryCycle.endDay);

    if (salaryCycle.cycleMode === 'previous_to_current' || startDay > endDay) {
      // e.g. 26th of previous month to 25th of current month
      startDate = new Date(targetYear, targetMonth - 2, startDay, 0, 0, 0, 0);
      endDate = new Date(targetYear, targetMonth - 1, endDay, 23, 59, 59, 999);
    } else {
      // e.g. 1st to 30th/31st of current month
      startDate = new Date(targetYear, targetMonth - 1, startDay, 0, 0, 0, 0);
      endDate = new Date(targetYear, targetMonth - 1, endDay, 23, 59, 59, 999);
    }
  } else {
    startDate = new Date(Number(yearStr), Number(monthStr) - 1, 1, 0, 0, 0, 0);
    endDate = new Date(Number(yearStr), Number(monthStr), 0, 23, 59, 59, 999);
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

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: config.userId,
        date: { gte: startDate, lte: endDate },
        OR: [
          { isLate: true },
          { isEarlyExit: true },
          { lateMinutes: { gt: 0 } },
          { earlyExitMinutes: { gt: 0 } }
        ]
      }
    });

    let totalBillableLateMinutes = 0;
    let totalBillableEarlyExitMinutes = 0;

    for (const att of attendances) {
      let lateM = att.lateMinutes || 0;
      // Protect from unadjusted half-day morning offset
      if (att.status === 'half_day' && lateM >= 180) {
        lateM = Math.max(0, lateM - 270);
      }
      const billable = Math.max(0, lateM - gracePeriod);
      totalBillableLateMinutes += billable;

      // Early exit minutes
      if (att.isEarlyExit || (att.earlyExitMinutes || 0) > 0) {
        totalBillableEarlyExitMinutes += (att.earlyExitMinutes || 0);
      }
    }

    const chargeableLateMinutes = Math.max(0, totalBillableLateMinutes - maxLateThresholdPerMonth);
    const lateDeductionAmount = chargeableLateMinutes * (config.lateDeductionPerMinute || 0);

    const earlyExitRate = (config.earlyExitDeductionPerMinute !== null && config.earlyExitDeductionPerMinute !== undefined && config.earlyExitDeductionPerMinute > 0)
      ? config.earlyExitDeductionPerMinute
      : (config.lateDeductionPerMinute || 0);
    const earlyExitDeductionAmount = totalBillableEarlyExitMinutes * earlyExitRate;

    const allowances = config.allowances as Record<string, number> || {};
    const deductions = config.deductions as Record<string, number> || {};

    const sumAllowances = Object.values(allowances).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
    const grossSalary = config.basicSalary + sumAllowances;

    // Leave Deductions
    const unpaidLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: config.userId,
        type: 'unpaid',
        status: { in: ['approved', 'dept_approved'] },
        startDate: { gte: startDate, lte: endDate }
      }
    });

    const unpaidDays = unpaidLeaves.reduce((acc: number, l: any) => acc + (l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1), 0);
    
    // WFH Deductions
    const wfhLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: config.userId,
        type: 'wfh',
        status: { in: ['approved', 'dept_approved'] },
        startDate: { gte: startDate, lte: endDate }
      }
    });

    const wfhDays = wfhLeaves.reduce((acc: number, l: any) => acc + (l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1), 0);
    
    // Fetch WFH limit to only deduct for exceeded days
    const alloc = await prisma.leaveAllocation.findFirst({
      where: { userId: config.userId, year: Number(yearStr), month: Number(monthStr) }
    });
    const wfhMonthlyLimit = alloc ? (alloc.wfh / 12) : 0;
    const exceededWfhDays = Math.max(0, wfhDays - wfhMonthlyLimit);
    
    const wfhDeductionAmount = exceededWfhDays * ((grossSalary / 30) * ((config.wfhDeductionPerDay || 0) / 100));

    let leaveDeductionAmount = 0;
    const rule = config.unpaidLeaveRule as any || { type: 'standard' };

    if (rule.type === 'fixed') {
        leaveDeductionAmount = unpaidDays * (Number(rule.dailyRate) || 0);
    } else if (rule.type === 'progressive') {
        const firstXDays = Number(rule.firstXDays) || 0;
        const firstXRate = Number(rule.firstXRate) || 0;
        const subsequentRate = Number(rule.subsequentRate) || 0;

        if (unpaidDays <= firstXDays) {
            leaveDeductionAmount = unpaidDays * firstXRate;
        } else {
            leaveDeductionAmount = (firstXDays * firstXRate) + ((unpaidDays - firstXDays) * subsequentRate);
        }
    } else {
        leaveDeductionAmount = (grossSalary / 30) * unpaidDays;
    }

    const standardDeductions = Object.values(deductions).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
    
    const finalDeductions = { 
      ...deductions, 
      lateDeduction: lateDeductionAmount, 
      earlyExitDeduction: earlyExitDeductionAmount,
      leaveDeduction: leaveDeductionAmount, 
      wfhDeduction: wfhDeductionAmount 
    };
    const totalDeductions = standardDeductions + lateDeductionAmount + earlyExitDeductionAmount + leaveDeductionAmount + wfhDeductionAmount;
    
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

export const approveSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Finance can only approve configs of their own organization and branch.
  const existing = await prisma.salaryConfig.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId, ...branchUserFilter(req) },
    select: { id: true },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Salary config not found' });
    return;
  }
  const config = await prisma.salaryConfig.update({
    where: { id: req.params.id },
    data: { approvalStatus: 'approved', approvedBy: req.user.id, approvedAt: new Date() }
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
    startDay: 26,
    endDay: 25,
    cycleMode: 'previous_to_current',
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
    startDay: Number(startDay) || 26,
    endDay: Number(endDay) || 25,
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
