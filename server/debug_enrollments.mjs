import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  const opsSub = await prisma.user.findUnique({
    where: { email: 'operationsub@xyz.com' },
    select: { id: true, branchId: true, assignedSalesUsers: true, role: true }
  });
  console.log("Ops Sub Admin:", opsSub);

  if (opsSub) {
    if (opsSub.assignedSalesUsers && Array.isArray(opsSub.assignedSalesUsers) && opsSub.assignedSalesUsers.length > 0) {
      console.log("Assigned Sales Users:", opsSub.assignedSalesUsers);
      
      const salesUsers = await prisma.user.findMany({
        where: { id: { in: opsSub.assignedSalesUsers } },
        select: { id: true, email: true, name: true, branchId: true }
      });
      console.log("Sales Users Data:", salesUsers);

      const enrollments = await prisma.enrollment.findMany({
        where: { salesUserId: { in: opsSub.assignedSalesUsers } },
        select: { id: true, status: true, student: { select: { name: true, branchId: true } } }
      });
      console.log("Enrollments for these sales users:", enrollments);
    } else {
      console.log("No assigned sales users. Showing branch enrollments for branch:", opsSub.branchId);
      const enrollments = await prisma.enrollment.findMany({
        where: { student: { branchId: opsSub.branchId } },
        select: { id: true, status: true, salesUserId: true, student: { select: { name: true } } }
      });
      console.log("Branch Enrollments:", enrollments);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
