import { prisma } from './src/config/database.js';

async function main() {
  const students = await prisma.student.findMany({
    select: { id: true, name: true, programId: true, centerId: true, academicBatchId: true }
  });
  console.log('Students:', students);
  await prisma.$disconnect();
}
main();
