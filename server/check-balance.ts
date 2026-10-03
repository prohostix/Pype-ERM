import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'abheeshkumaran7@gmail.com' } });
  if (!user) return;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const allocation = await prisma.leaveAllocation.findFirst({
    where: { userId: user.id, year: currentYear, month: currentMonth }
  });
  
  if (!allocation) {
    console.log("No allocation found for current month");
    return;
  }
  
  const getUsed = async (type: string, start: Date, end: Date) => {
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: user.id, type,
        status: { in: ['approved', 'dept_approved', 'pending'] },
        startDate: { gte: start, lt: end }
      }
    });
    return leaves.reduce((acc, l) => acc + (l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1), 0);
  };
  
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const nextMonth = new Date(currentYear, currentMonth, 1);
  const lookbackStart = new Date(currentYear, currentMonth - 3, 1);
  
  const usedSick = await getUsed('sick', startOfMonth, nextMonth);
  const usedCasual = await getUsed('casual', lookbackStart, nextMonth);
  const usedWfh = await getUsed('wfh', startOfMonth, nextMonth);
  
  const sickMonthlyAccrual = allocation.sickLeave / 12;
  const casualMonthlyAccrual = allocation.casualLeave / 12;
  
  console.log("Sick Accrual:", sickMonthlyAccrual, "Used:", usedSick);
  console.log("Casual Accrual:", casualMonthlyAccrual * 3, "Used:", usedCasual);
}
main().catch(console.error).finally(() => prisma.$disconnect());
