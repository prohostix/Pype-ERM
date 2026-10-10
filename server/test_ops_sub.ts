import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'operationsub@xyz.com' },
    select: { id: true, branchId: true, assignedSalesUsers: true, role: true }
  });
  console.log("Ops Sub Admin:", user);

  if (user) {
    const totalEnrollments = await prisma.enrollment.count();
    console.log("Total Enrollments in DB:", totalEnrollments);

    if (user.branchId) {
      const branchEnrollments = await prisma.enrollment.findMany({
        where: { student: { branchId: user.branchId } },
        select: { id: true, status: true, student: { select: { branchId: true } } }
      });
      console.log("Enrollments matching branch:", branchEnrollments.length);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
