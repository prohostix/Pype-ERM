import prisma from './src/lib/prisma.js';

async function run() {
  const org = await prisma.organization.findFirst({ where: { name: { contains: 'prohostix', mode: 'insensitive' } } });
  if (!org) {
    console.log('Prohostix org not found');
    return;
  }
  
  const attendances = await prisma.attendance.findMany({
    where: { organizationId: org.id },
    orderBy: { date: 'desc' },
    take: 10
  });
  
  console.log('Recent Attendances:');
  attendances.forEach(a => console.log(a.date, a.status, a.userId));
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  console.log('\nCalculated today variable:', today);
}
run().finally(() => prisma.$disconnect());
