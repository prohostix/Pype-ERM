import prisma from '../lib/prisma.js';

const REASON = 'Auto Absent';

/** A day of unpaid leave for a missed punch-in, unless leave has already been asked for that day. */
export const createAbsenceLeave = async (employee: { id: string; organizationId: string | null; departmentId: string | null }, date: Date): Promise<void> => {
  if (!employee.organizationId) return;
  const to = new Date(date);
  to.setHours(23, 59, 59, 999);
  const requested = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: employee.id,
      status: { in: ['pending', 'dept_approved', 'approved'] },
      type: { notIn: ['late_coming', 'early_exit'] },
      startDate: { lte: to },
      endDate: { gte: date }
    },
    select: { id: true }
  });
  if (requested) return;

  await prisma.leaveRequest.create({
    data: {
      employeeId: employee.id,
      organizationId: employee.organizationId,
      departmentId: employee.departmentId,
      type: 'unpaid',
      status: 'approved',
      isHalfDay: false,
      startDate: date,
      endDate: date,
      reason: `${REASON}: no punch-in on a working day`,
      hrRemarks: 'System auto-approved unpaid leave (missed punch-in policy)',
      appliedAt: new Date()
    }
  });
};

/** Removes automatic unpaid leave between two dates, when HR corrects the day or real leave is approved. */
export const cancelAbsenceLeaves = async (employeeId: string, from: Date, to: Date = from): Promise<void> => {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  await prisma.leaveRequest.deleteMany({
    where: { employeeId, startDate: { gte: start, lte: end }, reason: { startsWith: REASON } }
  });
};
