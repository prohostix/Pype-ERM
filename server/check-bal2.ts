import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'abheeshkumaran7@gmail.com' } });
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const allocation = await prisma.leaveAllocation.findFirst({
    where: { userId: user.id, year: currentYear, month: currentMonth }
  });
  console.log("Allocation", allocation);
  
  // same logic as hrController.ts
  const sickMonthlyAccrual = allocation.sickLeave / 12;
  const usedSickThisMonthRaw = await prisma.leaveRequest.findMany({
    where: {
      employeeId: user.id, type: 'sick',
      status: { in: ['approved', 'dept_approved'] },
      startDate: { gte: new Date(currentYear, currentMonth - 1, 1), lt: new Date(currentYear, currentMonth, 1) }
    }
  });
  const usedSickThisMonth = usedSickThisMonthRaw.reduce((acc, l: any) => acc + (l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1), 0);
  
  console.log({ sickMonthlyAccrual, usedSickThisMonth, available: Math.max(0, sickMonthlyAccrual - usedSickThisMonth) });
}
main();
