import prisma from './src/lib/prisma.js';

async function main() {
  await prisma.attendance.delete({ where: { id: 'b20ac266-9494-432b-be68-4c063241423b' } });
  
  await prisma.attendance.update({
    where: { id: '2b42f5d4-05fe-499c-bfc1-61ae9006a878' },
    data: {
      status: 'leave',
      notes: 'sick leave (converted)'
    }
  });

  console.log('Fixed records');
}

main().catch(console.error).finally(() => prisma.$disconnect());
