import { prisma } from './src/config/postgres.js';

async function run() {
  const studentsCount = await prisma.student.count();
  const enrollmentsCount = await prisma.enrollment.count();
  
  console.log('--- DATABASE STATUS ---');
  console.log(`Total Students: ${studentsCount}`);
  console.log(`Total Enrollments: ${enrollmentsCount}`);

  const students = await prisma.student.findMany({
    select: { id: true, name: true, email: true, status: true, organizationId: true }
  });
  console.log('\n--- STUDENTS ---');
  console.dir(students, { depth: null });

  const enrollments = await prisma.enrollment.findMany({
    select: { id: true, studentName: true, studentEmail: true, status: true, organizationId: true, studentId: true }
  });
  console.log('\n--- ENROLLMENTS ---');
  console.dir(enrollments, { depth: null });

  await prisma.$disconnect();
}

run();
