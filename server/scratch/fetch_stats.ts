import prisma from '../src/lib/prisma.js';

async function run() {
  const org = await prisma.organization.findFirst({ where: { name: { contains: 'prohostix', mode: 'insensitive' } } });
  if (!org) {
    console.log('Prohostix org not found');
    return;
  }
  
  const totalEmployees = await prisma.user.count({
    where: { organizationId: org.id, NOT: { role: { in: ['ceo', 'org_admin', 'superadmin', 'student'] } }, status: { not: 'resigned' } }
  });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const presentToday = await prisma.attendance.count({ where: { organizationId: org.id, date: today, status: 'present' } });
  const onLeave = await prisma.attendance.count({ where: { organizationId: org.id, date: today, status: 'leave' } });
  
  const absentToday = Math.max(0, totalEmployees - presentToday - onLeave);
  const totalVacancies = await prisma.vacancy.count({ where: { organizationId: org.id, status: 'open' } });
  
  console.log('Total Head Count:', totalEmployees);
  console.log('Open Vacancies:', totalVacancies);
  console.log('Absent Today:', absentToday);
  console.log('Present Today:', presentToday);
}
run().finally(() => prisma.$disconnect());
