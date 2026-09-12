import { prisma } from './src/config/database.js';

async function main() {
  const students = await prisma.student.findMany({
    where: { academicBatchId: { not: null } },
    select: { id: true, name: true, academicBatchId: true }
  });
  console.log('Allocated Students:', students);
  await prisma.$disconnect();
}
main();
