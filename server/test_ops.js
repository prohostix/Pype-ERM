import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'operationsub@xyz.com' },
    select: { id: true, branchId: true, assignedSalesUsers: true }
  });
  console.log("Ops Sub Admin:", user);

  if (user && user.assignedSalesUsers && user.assignedSalesUsers.length > 0) {
    const enrollments = await prisma.enrollment.findMany({
      where: { salesUserId: { in: user.assignedSalesUsers } },
      select: { id: true, salesUserId: true, status: true, student: { select: { branchId: true } } }
    });
    console.log("Enrollments by assigned sales users:", enrollments);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
