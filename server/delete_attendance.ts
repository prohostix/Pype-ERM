import prisma from './src/lib/prisma.js';

async function main() {
  const email = "lakshminairwp@gmail.com";
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log(`User not found with email: ${email}`);
    process.exit(1);
  }
  
  const attendance = await prisma.attendance.deleteMany({
    where: {
      employeeId: user.id,
      date: {
        gte: new Date("2026-09-28T00:00:00.000Z"),
        lt: new Date("2026-09-29T00:00:00.000Z")
      }
    }
  });

  console.log(`Deleted ${attendance.count} attendance records for ${email}.`);
}

main().finally(() => prisma.$disconnect());
