import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getSalaryConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const configs = await prisma.salaryConfig.findMany({
    where: { organizationId: req.user.organizationId },
    include: { user: { select: { name: true, email: true, designation: true } } }
  });
  res.json({ success: true, count: configs.length, data: configs });
});

export const getFinanceSalaryConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const whereClause: any = { organizationId: req.user.organizationId };
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
    where: { organizationId: req.user.organizationId },
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
  const config = await prisma.salaryConfig.findUnique({ where: { userId: req.params.userId } });
  if (!config) {
    res.status(404).json({ success: false, message: 'Salary config not found' });
    return;
  }
  res.json({ success: true, data: config });
});

export const upsertSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
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

export const deleteSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const config = await prisma.salaryConfig.findUnique({ where: { userId: req.params.userId } });
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
    where: { organizationId: req.user.organizationId, year, month },
    include: { user: { select: { name: true, email: true, role: true, designation: true, employeeProfileDetail: { select: { joinDate: true, probationEndDate: true } } } } }
  });
  res.json({ success: true, count: allocations.length, data: allocations });
});

export const getLeaveAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const month = Number(req.query.month) || (new Date().getMonth() + 1);
  const allocation = await prisma.leaveAllocation.findUnique({
    where: { userId_year_month: { userId: req.params.userId, year, month } }
  });
  res.json({ success: true, data: allocation });
});

export const upsertLeaveAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.body.year) || new Date().getFullYear();
  const month = Number(req.body.month) || (new Date().getMonth() + 1);
  const allocation = await prisma.leaveAllocation.upsert({
    where: { userId_year_month: { userId: req.params.userId, year, month } },
    update: { ...req.body, createdBy: req.user.id },
    create: { ...req.body, userId: req.params.userId, organizationId: req.user.organizationId, year, month, createdBy: req.user.id }
  });
  res.json({ success: true, data: allocation });
});

export const bulkInitLeaveAllocations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { year = new Date().getFullYear(), month = (new Date().getMonth() + 1), casual, sick, earned } = req.body;
  const users = await prisma.user.findMany({ where: { organizationId: req.user.organizationId, status: 'active', NOT: { role: { in: ['student', 'center_admin'] } } } });
  
  const results = await Promise.all(users.map(u => 
    prisma.leaveAllocation.upsert({
      where: { userId_year_month: { userId: u.id, year, month } },
      update: { casualLeave: casual, sickLeave: sick, earnedLeave: earned },
      create: { userId: u.id, organizationId: req.user.organizationId, year, month, casualLeave: casual, sickLeave: sick, earnedLeave: earned, createdBy: req.user.id }
    })
  ));

  res.json({ success: true, message: `Initialized for ${results.length} users` });
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
        startDate: { gte: startDate, lt: endDate }
      }
    });

    const unpaidDays = unpaidLeaves.reduce((acc: number, l: any) => acc + (l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1), 0);
    
    // WFH Deductions
    const wfhLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: config.userId,
        type: 'wfh',
        status: { in: ['approved', 'dept_approved'] },
        startDate: { gte: startDate, lt: endDate }
      }
    });

    const wfhDays = wfhLeaves.reduce((acc: number, l: any) => acc + (l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1), 0);
    
    // Fetch WFH limit to only deduct for exceeded days
    const alloc = await prisma.leaveAllocation.findFirst({
      where: { userId: config.userId, year: Number(yearStr), month: Number(monthStr) }
    });
    const wfhMonthlyLimit = alloc ? (alloc.wfh / 12) : 0;
    const exceededWfhDays = Math.max(0, wfhDays - wfhMonthlyLimit);
    
    const wfhDeductionAmount = exceededWfhDays * (config.wfhDeductionPerDay || 0);

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
    
    const finalDeductions = { ...deductions, lateDeduction: lateDeductionAmount, leaveDeduction: leaveDeductionAmount, wfhDeduction: wfhDeductionAmount };
    const totalDeductions = standardDeductions + lateDeductionAmount + leaveDeductionAmount + wfhDeductionAmount;
    
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
  const config = await prisma.salaryConfig.update({
    where: { id: req.params.id },
    data: { approvalStatus: 'approved', approvedBy: req.user.id, approvedAt: new Date() }
  });
  res.json({ success: true, data: config });
});
