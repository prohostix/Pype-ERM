/**
 * AI Reports: daily staff attendance (one row per employee per day), including TODAY.
 *
 * The attendance table only gets "absent" rows from the nightly job (cronService
 * startAutoAbsentCron, 11:58 PM). During the day, people who haven't punched in have
 * no row, so this view works out each day's status the same way the Attendance page
 * does (attendanceController):
 *   - punch/attendance row exists        → its status (present, late, half_day, wfh, leave, absent)
 *   - organization holiday               → holiday
 *   - not a working day (HR settings)    → week_off
 *   - approved leave covering the day    → leave   (late-coming / early-exit permissions don't count)
 *   - otherwise                          → absent
 * Employees counted: same as the Attendance page — requiresAttendance, not resigned,
 * excluding CEO / org admin / superadmin / student / center admin — within the user's scope.
 */
import prisma from '../../lib/prisma.js';
import { ReportError } from './compiler.js';
import type { AccessContext } from './access.js';

const TZ_OFFSET = process.env.REPORT_TZ_OFFSET || '+05:30';
const TZ_MIN = (() => {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(TZ_OFFSET);
  return m ? (m[1] === '-' ? -1 : 1) * (parseInt(m[2]) * 60 + parseInt(m[3])) : 330;
})();
const DAY = 86_400_000;
const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_CELLS = 100_000;

/** Business-local calendar day of a timestamp, e.g. "2026-11-10" */
const dayKey = (d: Date) => new Date(d.getTime() + TZ_MIN * 60_000).toISOString().slice(0, 10);

export const PRESENT_STATUSES = ['present', 'late', 'half_day', 'wfh'];

export async function staffDayRows(ctx: AccessContext, range: { from: Date; to: Date }, scope: Record<string, unknown>) {
  const orgId = ctx.organizationId;
  const employees = await prisma.user.findMany({
    where: {
      AND: [
        scope,
        { organizationId: orgId },
        { role: { notIn: ['ceo', 'org_admin', 'superadmin', 'student', 'center_admin'] } },
        { status: { not: 'resigned' } },
        { requiresAttendance: true },
      ],
    },
    select: {
      id: true, name: true, userId: true, designation: true, createdAt: true,
      department: { select: { name: true } }, branch: { select: { name: true } },
    },
  });

  const days: Date[] = [];
  for (let t = range.from.getTime(); t <= range.to.getTime(); t += DAY) days.push(new Date(t));
  if (employees.length * days.length > MAX_CELLS) {
    throw new ReportError(400, 'That is too many employee-days at once. Please pick a shorter period or one department/branch.');
  }
  if (!employees.length || !days.length) return [];

  const windowStart = new Date(range.from.getTime() - DAY);
  const windowEnd = new Date(range.to.getTime() + 2 * DAY);
  const ids = employees.map((e) => e.id);

  const [attendance, leaves, holidays, settings] = await Promise.all([
    prisma.attendance.findMany({
      where: { organizationId: orgId, employeeId: { in: ids }, date: { gte: windowStart, lt: windowEnd } },
      select: { employeeId: true, date: true, status: true, checkIn: true, checkOut: true, lateMinutes: true, workingHours: true, isLate: true, isEarlyExit: true },
    }),
    prisma.leaveRequest.findMany({
      where: { organizationId: orgId, employeeId: { in: ids }, status: 'approved', startDate: { lt: windowEnd }, endDate: { gte: windowStart } },
      select: { employeeId: true, startDate: true, endDate: true, type: true, isHalfDay: true },
    }),
    prisma.holiday.findMany({ where: { organizationId: orgId, date: { gte: windowStart, lt: windowEnd } }, select: { date: true } }),
    prisma.hRSettings.findUnique({ where: { organizationId: orgId }, select: { officeHours: true } }),
  ]);

  const workingDays: string[] = Array.isArray((settings?.officeHours as { workingDays?: unknown } | null)?.workingDays)
    ? ((settings!.officeHours as { workingDays: string[] }).workingDays).map((d) => d.toLowerCase())
    : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const holidayDays = new Set(holidays.map((h) => dayKey(h.date)));
  const byEmpDay = new Map<string, (typeof attendance)[number]>();
  for (const a of attendance) byEmpDay.set(`${a.employeeId}|${dayKey(a.date)}`, a);
  const leavesByEmp = new Map<string, typeof leaves>();
  for (const l of leaves) leavesByEmp.set(l.employeeId, [...(leavesByEmp.get(l.employeeId) ?? []), l]);

  const rows: Record<string, unknown>[] = [];
  for (const day of days) {
    const key = dayKey(day);
    const weekday = NAMES[new Date(day.getTime() + TZ_MIN * 60_000).getUTCDay()].toLowerCase();
    const isHoliday = holidayDays.has(key);
    const isWorking = workingDays.includes(weekday);
    for (const e of employees) {
      if (dayKey(e.createdAt) > key) continue; // not yet joined
      const rec = byEmpDay.get(`${e.id}|${key}`);
      const leave = (leavesByEmp.get(e.id) ?? []).find((l) =>
        l.type !== 'late_coming' && l.type !== 'early_exit' && dayKey(l.startDate) <= key && dayKey(l.endDate) >= key);
      const status = rec?.status
        ?? (isHoliday ? 'holiday' : !isWorking ? 'week_off' : leave ? 'leave' : 'absent');
      rows.push({
        date: day,
        status,
        present: PRESENT_STATUSES.includes(status),
        employee: e.name,
        employeeCode: e.userId ?? null,
        department: e.department?.name ?? null,
        branch: e.branch?.name ?? null,
        designation: e.designation ?? null,
        checkIn: rec?.checkIn ?? null,
        checkOut: rec?.checkOut ?? null,
        lateMinutes: rec?.lateMinutes ?? 0,
        workingHours: rec?.workingHours ?? 0,
        isLate: rec?.isLate ?? false,
        earlyExit: rec?.isEarlyExit ?? false,
        leaveType: leave?.type ?? null,
        recorded: !!rec,
      });
    }
  }
  return rows;
}
