import prisma from './src/lib/prisma.js';

async function main() {
  const enrollments = await prisma.enrollment.findMany({
    where: { status: 'sales_admin_review' },
    select: { id: true, studentName: true, status: true, salesUserId: true }
  });
  console.log("Pending sales admin reviews:", JSON.stringify(enrollments, null, 2));

  // let's also check all enrollments for bindhya
  const bindhya = await prisma.user.findUnique({ where: { email: 'bindhyat99@gmail.com' } });
  if (bindhya) {
      const b_enrollments = await prisma.enrollment.findMany({
          where: { salesUserId: bindhya.id },
          select: { id: true, studentName: true, status: true, salesUserId: true }
      });
      console.log("Bindhya's enrollments by salesUserId:", JSON.stringify(b_enrollments, null, 2));
      
      const b_enrollments_2 = await prisma.enrollment.findMany({
          where: { student: { enrolledBy: bindhya.id } },
          select: { id: true, studentName: true, status: true, salesUserId: true, studentId: true }
      });
      console.log("Bindhya's enrollments by student.enrolledBy:", JSON.stringify(b_enrollments_2, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
