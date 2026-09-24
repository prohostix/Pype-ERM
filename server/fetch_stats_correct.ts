import prisma from './src/lib/prisma.js';

async function run() {
  const org = await prisma.organization.findFirst({ where: { name: { contains: 'prohostix', mode: 'insensitive' } } });
  if (!org) return;

  const totalEmployees = await prisma.user.count({
    where: { organizationId: org.id, NOT: { role: { in: ['ceo', 'org_admin', 'superadmin', 'student'] } }, status: { not: 'resigned' } }
  });

  const todayDb = new Date('2026-09-23T00:00:00.000Z');

  const presentToday = await prisma.attendance.count({ where: { organizationId: org.id, date: todayDb, status: 'present' } });
  const lateToday = await prisma.attendance.count({ where: { organizationId: org.id, date: todayDb, status: 'late' } });
  const onLeave = await prisma.attendance.count({ where: { organizationId: org.id, date: todayDb, status: 'leave' } });

  const absentToday = Math.max(0, totalEmployees - (presentToday + lateToday) - onLeave);
  const totalVacancies = await prisma.vacancy.count({ where: { organizationId: org.id, status: 'open' } });

  console.log('Total Head Count:', totalEmployees);
  console.log('Open Vacancies:', totalVacancies);
  console.log('Absent Today:', absentToday);
  console.log('Present Today (including late):', presentToday + lateToday);
  console.log('On Leave:', onLeave);
}
run().finally(() => prisma.$disconnect());
