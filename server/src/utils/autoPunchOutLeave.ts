import prisma from '../lib/prisma.js';

const daysOf = (leaves: { isHalfDay: boolean | null; startDate: Date; endDate: Date }[]) =>
  leaves.reduce((sum, l) => sum + (l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1), 0);

/**
 * Which leave a half day can come from: casual, then sick, then earned, else unpaid.
 * Balances are counted from the leave records, as on the balance screen, so the allocation itself is not changed.
 */
export const halfDayLeaveType = async (employeeId: string, date: Date): Promise<'casual' | 'sick' | 'earned' | 'unpaid'> => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  const allocation = await prisma.leaveAllocation.findFirst({ where: { userId: employeeId, year, month: month + 1 } });
  if (!allocation) return 'unpaid';

  const used = async (type: 'casual' | 'sick' | 'earned', from: Date, to: Date) => daysOf(await prisma.leaveRequest.findMany({
    where: { employeeId, type, status: { in: ['approved', 'dept_approved', 'pending'] }, startDate: { gte: from, lt: to } },
    select: { isHalfDay: true, startDate: true, endDate: true }
  }));
  const nextMonth = new Date(year, month + 1, 1);

  if (allocation.casualLeave * 3 - await used('casual', new Date(year, month - 2, 1), nextMonth) >= 0.5) return 'casual';
  if (allocation.sickLeave - await used('sick', new Date(year, month, 1), nextMonth) >= 0.5) return 'sick';
  if (allocation.earnedLeave * (month + 1) - await used('earned', new Date(year, 0, 1), new Date(year + 1, 0, 1)) >= 0.5) return 'earned';
  return 'unpaid';
};

/** Removes the half-day leave a missed punch-out created, once the day turns out to have been worked. */
export const cancelAutoPunchOutLeave = async (employeeId: string, date: Date): Promise<void> => {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(date);
  to.setHours(23, 59, 59, 999);

  const leave = await prisma.leaveRequest.findFirst({
    where: { employeeId, startDate: { gte: from, lte: to }, reason: { contains: 'Auto Punch-Out' } }
  });
  if (!leave) return;

  // Older records also lowered the allocation, so that half day is given back
  const loweredAllocation = leave.reason?.includes('leave applied due to missing punch-out');
  const field = !loweredAllocation ? null : leave.type === 'casual' ? 'casualLeave' : leave.type === 'sick' ? 'sickLeave' : leave.type === 'earned' ? 'earnedLeave' : null;
  await prisma.$transaction([
    ...(field ? [prisma.leaveAllocation.updateMany({
      where: { userId: employeeId, year: date.getFullYear(), month: date.getMonth() + 1 },
      data: { [field]: { increment: 0.5 } }
    })] : []),
    prisma.leaveRequest.delete({ where: { id: leave.id } })
  ]);
};
