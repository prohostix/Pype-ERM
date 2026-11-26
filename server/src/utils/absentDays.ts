import { salaryCycleDates } from './salaryCycle.js';

/** Whether the salary cycle holding this date started after the rule was introduced. */
export const absentRuleApplies = (date: Date, cycle?: { type?: string; startDay?: number; endDay?: number; cycleMode?: string }): boolean => {
  let start = new Date(date.getFullYear(), date.getMonth(), 1);
  if (cycle?.type !== 'custom_range' && cycle?.startDay && cycle?.endDay) {
    for (const offset of [0, 1, 2]) {
      const { startDate, endDate } = salaryCycleDates({ startDay: cycle.startDay, endDay: cycle.endDay, cycleMode: cycle.cycleMode }, date.getFullYear(), date.getMonth() + offset);
      if (date >= startDate && date <= endDate) start = startDate;
    }
  }
  return start > ABSENT_RULE_AFTER;
};

/** Absent days are deducted only in salary cycles that start after the rule was introduced. */
export const ABSENT_RULE_AFTER = new Date(2026, 10, 26);

// Dates are saved at midnight UTC or midnight India time; both fall on the right day 12 hours later
const dayKey = (date: Date) => new Date(date.getTime() + 12 * 3600000).toISOString().slice(0, 10);

interface Leave { type: string; isHalfDay: boolean | null; startDate: Date; endDate: Date }

/**
 * Days marked absent that nothing accounts for. A date counts once; it is skipped if it also has a
 * worked record or is a holiday, and approved leave covers it (a half day covers half).
 */
export const uncoveredAbsentDays = (
  attendance: { date: Date; status: string }[],
  approvedLeaves: Leave[],
  holidays: Date[] = [],
): number => {
  const absent = new Set(attendance.filter((a) => a.status === 'absent').map((a) => dayKey(a.date)));
  for (const a of attendance) if (a.status !== 'absent') absent.delete(dayKey(a.date));
  for (const holiday of holidays) absent.delete(dayKey(holiday));

  let total = 0;
  for (const day of absent) {
    let covered = 0;
    for (const leave of approvedLeaves) {
      // Late coming and early exit permissions are not time off
      if (leave.type === 'late_coming' || leave.type === 'early_exit') continue;
      if (day >= dayKey(leave.startDate) && day <= dayKey(leave.endDate)) covered += leave.isHalfDay ? 0.5 : 1;
    }
    total += Math.max(0, 1 - covered);
  }
  return total;
};
