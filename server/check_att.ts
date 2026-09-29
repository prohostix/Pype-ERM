import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'theshahulofcl@gmail.com' }});
  if (!user) return console.log('User not found');
  
  const atts = await prisma.attendance.findMany({
    where: {
      employeeId: user.id,
      date: { gte: new Date('2026-09-21T00:00:00Z'), lte: new Date('2026-09-23T23:59:59Z') }
    }
  });

  console.log(atts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
