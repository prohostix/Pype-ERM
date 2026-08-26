import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const billingCycles = await prisma.feeStructure.findMany({
    select: { billingCycle: true },
    distinct: ['billingCycle'],
  });
  console.log("Billing Cycles:", billingCycles);

  const paymentPlans = await prisma.enrollment.findMany({
    select: { paymentPlan: true },
    distinct: ['paymentPlan'],
  });
  console.log("Payment Plans:", paymentPlans);
}
main().catch(console.error).finally(() => prisma.$disconnect());
