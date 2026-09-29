import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'theshahulofcl@gmail.com' }});
  if (!user) return console.log('User not found');
  
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId: user.id,
      type: 'unpaid'
    }
  });

  const targetLeave = leaves.find(l => l.startDate.toISOString().startsWith('2026-09-22'));
  if (!targetLeave) return console.log('Leave not found');

  await prisma.leaveRequest.update({
    where: { id: targetLeave.id },
    data: { type: 'sick' }
  });
  
  console.log('Successfully updated leave to sick');
}

main().catch(console.error).finally(() => prisma.$disconnect());
