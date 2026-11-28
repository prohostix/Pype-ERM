/**
 * Puts back the leave type of requests that became "unpaid" because no leave allocation existed.
 *
 *   npx tsx scripts/restoreLeaveTypes.ts --org "TIMS" --since 2026-11-01            (dry run: report only)
 *   npx tsx scripts/restoreLeaveTypes.ts --org "TIMS" --since 2026-11-01 --apply    (writes)
 *
 * Recreate the leave allocations first. --since is the date the requests were raised (createdAt).
 * Only `type` changes (and the reason of auto punch-out leaves); status and approvals stay.
 */
import fs from 'fs';
import path from 'path';
import prisma from '../src/lib/prisma.js';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const APPLY = process.argv.includes('--apply');
const LIVE = ['pending', 'dept_approved', 'approved', 'withdraw_pending'] as const;
const COUNTED = ['pending', 'dept_approved', 'approved'];

const daysOf = (l: { isHalfDay: boolean; startDate: Date; endDate: Date }) =>
  l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1;
const ymd = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

async function main() {
  const orgName = arg('org');
  const since = arg('since');
  if (!orgName || !since || Number.isNaN(Date.parse(since))) throw new Error('Usage: --org "<name>" --since YYYY-MM-DD [--apply]');

  const orgs = await prisma.organization.findMany({ where: { name: { contains: orgName, mode: 'insensitive' } }, select: { id: true, name: true } });
  if (orgs.length !== 1) throw new Error(`--org matched ${orgs.length} organizations: ${orgs.map(o => o.name).join(', ')}`);
  const organizationId = orgs[0].id;

  const candidates = await prisma.leaveRequest.findMany({
    where: { organizationId, type: 'unpaid', status: { in: [...LIVE] }, createdAt: { gte: new Date(since) } },
    include: { user: { select: { name: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
  });

  // Leave already counted against each balance; restored requests are added as they are decided
  const counted = await prisma.leaveRequest.findMany({
    where: { organizationId, type: { in: ['sick', 'casual', 'earned'] }, status: { in: COUNTED as any } },
    select: { employeeId: true, type: true, isHalfDay: true, startDate: true, endDate: true }
  });
  const used = (employeeId: string, type: string, from: Date, to: Date) => counted
    .filter(l => l.employeeId === employeeId && l.type === type && l.startDate >= from && l.startDate < to)
    .reduce((sum, l) => sum + daysOf(l), 0);

  const rows: any[] = [];
  const changes: { id: string; type: any; reason?: string }[] = [];

  for (const leave of candidates) {
    const year = leave.startDate.getFullYear();
    const month = leave.startDate.getMonth(); // 0-11
    const row = {
      employee: leave.user.name, leaveId: leave.id, from: ymd(leave.startDate), to: ymd(leave.endDate),
      days: daysOf(leave), status: leave.status, requested: '', newType: 'unpaid', action: 'SKIP', note: ''
    };
    rows.push(row);

    if (leave.reason.startsWith('Auto Absent')) { row.note = 'Missed punch-in: unpaid by policy, not caused by allocation'; continue; }
    const autoPunchOut = leave.reason.startsWith('Auto Punch-Out');

    // The type the employee picked is only in the activity log (the request body of the create call)
    if (!autoPunchOut) {
      const logs = await prisma.auditLog.findMany({
        where: {
          actorId: leave.employeeId, method: 'POST', route: { in: ['/hr/leaves', '/hr/leaves/'] }, statusCode: 201,
          timestamp: { gte: new Date(leave.createdAt.getTime() - 5000), lte: new Date(leave.createdAt.getTime() + 60000) }
        },
        select: { newValue: true },
        orderBy: { timestamp: 'asc' }
      });
      const match = logs.map(l => l.newValue as any).find(b => b?.startDate && ymd(b.startDate) === ymd(leave.startDate));
      if (!match) { row.action = 'MANUAL'; row.note = 'No activity log: confirm the type with the employee or the register'; continue; }
      row.requested = match.type;

      const edited = await prisma.auditLog.count({ where: { route: `/hr/leaves/${leave.id}`, method: 'PUT', statusCode: { lt: 400 } } });
      if (edited) { row.action = 'MANUAL'; row.note = 'Edited after creation: check it was not set to unpaid on purpose'; continue; }
      if (match.type === 'unpaid') { row.note = 'Employee asked for unpaid'; continue; }
      if (!['sick', 'casual', 'wfh'].includes(match.type)) { row.action = 'MANUAL'; row.note = 'Not a type the system converts: changed by someone'; continue; }
    }

    const allocation = await prisma.leaveAllocation.findFirst({ where: { userId: leave.employeeId, year, month: month + 1 } });
    if (!allocation) { row.action = 'BLOCKED'; row.note = `No allocation for ${year}-${String(month + 1).padStart(2, '0')}: create it first`; continue; }

    const next = new Date(year, month + 1, 1);
    const left: Record<string, number> = {
      sick: allocation.sickLeave - used(leave.employeeId, 'sick', new Date(year, month, 1), next),
      casual: allocation.casualLeave * 3 - used(leave.employeeId, 'casual', new Date(year, month - 2, 1), next),
      earned: allocation.earnedLeave * (month + 1) - used(leave.employeeId, 'earned', new Date(year, 0, 1), new Date(year + 1, 0, 1))
    };

    // Same fallback order as the app
    const order = autoPunchOut ? ['casual', 'sick', 'earned'] : row.requested === 'sick' ? ['sick', 'casual'] : row.requested === 'casual' ? ['casual', 'sick'] : ['wfh'];
    const type = order.find(t => t === 'wfh' || left[t] >= daysOf(leave));
    if (!type) { row.note = 'Allocation is there but the balance is not enough: stays unpaid'; continue; }

    row.newType = type;
    row.action = 'RESTORE';
    if (!autoPunchOut && type !== row.requested) row.note = `${row.requested} balance not enough, taken from ${type}`;
    if (leave.status === 'withdraw_pending') row.note = `${row.note} Withdrawal is still pending`.trim();
    const payroll = await prisma.payroll.findFirst({ where: { employeeId: leave.employeeId, month: `${year}-${String(month + 1).padStart(2, '0')}` }, select: { status: true } });
    if (payroll) row.note = `${row.note} Payroll exists (${payroll.status}): recalculate it`.trim();

    changes.push({ id: leave.id, type, ...(autoPunchOut && { reason: `Auto Punch-Out: Half-day ${type} leave (no punch-out)` }) });
    if (type !== 'wfh') counted.push({ employeeId: leave.employeeId, type: type as any, isHalfDay: leave.isHalfDay, startDate: leave.startDate, endDate: leave.endDate });
  }

  const dir = path.resolve('backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  // CSV with a BOM so Excel opens it correctly; the quote prefix stops formulas in names
  const cell = (v: unknown) => `"${String(v).replace(/^[=+\-@]/, "'$&").replace(/"/g, '""')}"`;
  const headers = ['employee', 'leaveId', 'from', 'to', 'days', 'status', 'requested', 'newType', 'action', 'note'];
  const report = path.join(dir, `leave_restore_report_${stamp}.csv`);
  fs.writeFileSync(report, '﻿' + [headers.join(','), ...rows.map(r => headers.map(h => cell(r[h])).join(','))].join('\n'));

  const totals = rows.reduce((t, r) => ({ ...t, [r.action]: (t[r.action] || 0) + 1 }), {} as Record<string, number>);
  console.log(`${orgs[0].name}: ${rows.length} unpaid requests`, totals);
  console.log(`Report: ${report}`);

  if (!APPLY) return console.log('Dry run: nothing changed.');

  const ids = changes.map(c => c.id);
  const backup = path.join(dir, `leave_restore_before_${stamp}.json`);
  fs.writeFileSync(backup, JSON.stringify(candidates.filter(c => ids.includes(c.id)).map(({ user, ...l }) => l), null, 2));
  console.log(`Backup: ${backup}`);

  await prisma.$transaction(changes.map(({ id, ...data }) => prisma.leaveRequest.update({ where: { id }, data })));
  console.log(`Restored ${changes.length} requests.`);
}

main()
  .catch(err => { console.error(err.message || err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
