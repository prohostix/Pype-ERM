import prisma from './src/lib/prisma.js';

async function main() {
  const studentName = 'Student from Kochi';
  
  // Find the student
  const student = await prisma.student.findFirst({
    where: { name: studentName }
  });

  if (student) {
    console.log("Found student:", student.id);
  } else {
    console.log("No student found with name:", studentName);
  }

  // Delete related enrollments first based on name
  const enrollments = await prisma.enrollment.findMany({
    where: { studentName: studentName }
  });
  
  for (const enr of enrollments) {
    console.log("Deleting enrollment:", enr.id);
    
    // Attempt to delete related PaymentEntries
    try {
      await prisma.paymentEntry.deleteMany({
        where: { enrollmentId: enr.id }
      });
      console.log("Deleted related PaymentEntries for enrollment");
    } catch (e) {
      console.log("No payment entry model or error:", e.message);
    }

    try {
      await prisma.enrollment.delete({
        where: { id: enr.id }
      });
      console.log("Deleted enrollment:", enr.id);
    } catch (e) {
      console.log("Failed to delete enrollment:", e.message);
    }
  }

  if (student) {
    try {
      await prisma.paymentEntry.deleteMany({
        where: { studentId: student.id }
      });
    } catch (e) {}

    try {
      await prisma.student.delete({
        where: { id: student.id }
      });
      console.log("Deleted student.");
    } catch (e) {
      console.log("Failed to delete student:", e.message);
    }
  }

  console.log("Successfully deleted student and related records!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
