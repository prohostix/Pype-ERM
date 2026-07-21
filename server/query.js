import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const schedules = await prisma.paymentSchedule.findMany({});
  console.log("Total schedules:", schedules.length);
  if (schedules.length > 0) {
    console.log("Sample:", schedules[0]);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
