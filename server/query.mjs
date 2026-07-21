import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const org = await prisma.organization.findFirst();
  const schedules = await prisma.paymentSchedule.findMany({});
  console.log("Total schedules:", schedules.length);
  const orgSchedules = await prisma.paymentSchedule.findMany({ where: { organizationId: org.id }});
  console.log("Org schedules:", orgSchedules.length);
  
  if (schedules.length > 0) {
    console.log("Sample:", schedules[0]);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
