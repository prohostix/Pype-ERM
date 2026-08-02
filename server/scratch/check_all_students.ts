import prisma from '../src/lib/prisma';

async function check() {
  const totalStudents = await prisma.student.count();
  console.log(`Total students in DB: ${totalStudents}`);
}

check().catch(console.error).finally(() => prisma.$disconnect());
