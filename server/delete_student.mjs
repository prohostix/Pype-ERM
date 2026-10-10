import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  const studentName = 'Student from Kochi';

  // Find the student
  const student = await prisma.student.findFirst({
    where: { name: studentName }
  });

  if (!student) {
    console.log("No student found with name:", studentName);
    return;
  }

  console.log("Found student:", student);

  // Delete related enrollments first
  const enrollments = await prisma.enrollment.findMany({
    where: { studentEmail: student.email }
  });
  
  for (const enr of enrollments) {
    console.log("Deleting enrollment:", enr.id);
    // Delete payments/receipts for this enrollment if necessary
    // Prisma usually cascades or we might need to delete them manually if cascade is not set
    await prisma.payment.deleteMany({
      where: { enrollmentId: enr.id }
    });
    
    await prisma.enrollment.delete({
      where: { id: enr.id }
    });
  }

  // Delete any payments associated with student directly (if any)
  await prisma.payment.deleteMany({
    where: { studentId: student.id }
  });

  // Finally delete the student
  await prisma.student.delete({
    where: { id: student.id }
  });

  console.log("Successfully deleted student and related records!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
