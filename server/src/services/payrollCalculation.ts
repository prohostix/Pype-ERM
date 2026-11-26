import type { SalaryConfig } from '../generated/client/index.js';
import prisma from '../lib/prisma.js';
import { salaryCycleDates } from '../utils/salaryCycle.js';
import { ABSENT_RULE_AFTER, uncoveredAbsentDays } from '../utils/absentDays.js';

/** The period and policies that apply to an organization's payroll for a month (YYYY-MM). */
export const loadPayrollRules = async (organizationId: string, month: string, requested: { startDate?: string; endDate?: string } = {}) => {
  const hrSettings = await prisma.hRSettings.findUnique({ where: { organizationId } });
  const latePolicy: any = hrSettings?.latePolicy || {};
  const gracePeriod = Number(latePolicy.gracePeriod) || 0;
  const maxLateThresholdPerMonth = Number(latePolicy.maxLateMinutesPerMonth) || 0; // the name HR Settings saves

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

  if (requested.startDate && requested.endDate) {
    startDate = new Date(requested.startDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(requested.endDate);
    endDate.setHours(23, 59, 59, 999);
  } else if (salaryCycle?.type === 'custom_range' && salaryCycle.customStartDate && salaryCycle.customEndDate) {
    startDate = new Date(salaryCycle.customStartDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(salaryCycle.customEndDate);
    endDate.setHours(23, 59, 59, 999);
  } else if (salaryCycle?.startDay && salaryCycle?.endDay) {
    ({ startDate, endDate } = salaryCycleDates(salaryCycle, Number(yearStr), Number(monthStr)));
  } else {
    startDate = new Date(Number(yearStr), Number(monthStr) - 1, 1, 0, 0, 0, 0);
    endDate = new Date(Number(yearStr), Number(monthStr), 0, 23, 59, 59, 999);
  }

  return { organizationId, hrSettings, gracePeriod, maxLateThresholdPerMonth, startDate, endDate, yearStr, monthStr };
};

export type PayrollRules = Awaited<ReturnType<typeof loadPayrollRules>>;

/** What one employee is paid under their salary configuration. Reads only; saves nothing. */
export const calculatePay = async (config: SalaryConfig, rules: PayrollRules) => {
  const { organizationId, hrSettings, gracePeriod, maxLateThresholdPerMonth, startDate, endDate, yearStr, monthStr } = rules;

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
  const wfhMonthlyLimit = alloc?.wfh ?? 0; // allocations are per month
  const exceededWfhDays = Math.max(0, wfhDays - wfhMonthlyLimit);
  
  const wfhDeductionAmount = exceededWfhDays * ((grossSalary / 30) * ((config.wfhDeductionPerDay || 0) / 100));

  // With the missed punch-in rule on, an absence that no leave record covers is unpaid too
  let absentDays = 0;
  if ((hrSettings?.officeHours as any)?.absentAsUnpaidLeave === true && startDate > ABSENT_RULE_AFTER) {
    const [absences, approvedLeaves, holidays] = await Promise.all([
      prisma.attendance.findMany({
        where: { employeeId: config.userId, date: { gte: startDate, lte: endDate } },
        select: { date: true, status: true }
      }),
      prisma.leaveRequest.findMany({
        where: { employeeId: config.userId, status: { in: ['approved', 'dept_approved'] }, startDate: { lte: endDate }, endDate: { gte: startDate } },
        select: { type: true, isHalfDay: true, startDate: true, endDate: true }
      }),
      prisma.holiday.findMany({ where: { organizationId, date: { gte: startDate, lte: endDate } }, select: { date: true } })
    ]);
    absentDays = uncoveredAbsentDays(absences, approvedLeaves, holidays.map(h => h.date));
  }

  const rule = config.unpaidLeaveRule as any || { type: 'standard' };
  const unpaidAmount = (days: number): number => {
    if (rule.type === 'fixed') {
        return days * (Number(rule.dailyRate) || 0);
    } else if (rule.type === 'progressive') {
        const firstXDays = Number(rule.firstXDays) || 0;
        const firstXRate = Number(rule.firstXRate) || 0;
        const subsequentRate = Number(rule.subsequentRate) || 0;

        if (days <= firstXDays) {
            return days * firstXRate;
        } else {
            return (firstXDays * firstXRate) + ((days - firstXDays) * subsequentRate);
        }
    } else {
        return (grossSalary / 30) * days;
    }
  };
  const leaveDeductionAmount = unpaidAmount(unpaidDays);
  // Absences follow on from unpaid leave, so a progressive rate applies to both together
  const absentDeductionAmount = unpaidAmount(unpaidDays + absentDays) - leaveDeductionAmount;

  const standardDeductions = Object.values(deductions).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
  
  const finalDeductions = { 
    ...deductions, 
    lateDeduction: lateDeductionAmount, 
    earlyExitDeduction: earlyExitDeductionAmount,
    leaveDeduction: leaveDeductionAmount, 
    absentDeduction: absentDeductionAmount,
    wfhDeduction: wfhDeductionAmount 
  };
  const totalDeductions = standardDeductions + lateDeductionAmount + earlyExitDeductionAmount + leaveDeductionAmount + absentDeductionAmount + wfhDeductionAmount;
  
  const netSalary = grossSalary - totalDeductions;

  return {
    basicSalary: config.basicSalary,
    allowances,
    deductions: finalDeductions,
    grossSalary,
    netSalary,
    lateMinutes: chargeableLateMinutes,
    earlyExitMinutes: totalBillableEarlyExitMinutes,
    unpaidDays,
    absentDays,
    extraWfhDays: exceededWfhDays
  };
};
