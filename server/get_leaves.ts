import prisma from './src/lib/prisma.js';

async function main() {
  const email = 'adhithyaedufolio@gmail.com';
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log(`User ${email} not found`);
    return;
  }

  const leaves = await prisma.leaveRequest.findMany({
    where: { employeeId: user.id },
    orderBy: { startDate: 'desc' }
  });

  const sepLeaves = leaves.filter(l => {
    const d = new Date(l.startDate);
    return d.getMonth() === 8 && d.getFullYear() === 2026; // 0-indexed month, 8 is September
  });

  console.log(`\nLeaves in September 2026 for ${email}: ${sepLeaves.length}`);
  sepLeaves.forEach(l => {
    console.log(`- Type: ${l.type} | Status: ${l.status} | From: ${new Date(l.startDate).toDateString()} To: ${new Date(l.endDate).toDateString()} | HalfDay: ${l.isHalfDay ? l.halfDayType : 'No'}`);
  });

  console.log(`\nTotal leaves overall: ${leaves.length}`);
  leaves.forEach(l => {
    console.log(`- Type: ${l.type} | Status: ${l.status} | From: ${new Date(l.startDate).toDateString()} To: ${new Date(l.endDate).toDateString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
