import prisma from '../src/lib/prisma.js';

async function check() {
  console.log("Checking for Users with role 'student' but no Student record...");
  const studentUsers = await prisma.user.findMany({ where: { role: 'student' } });
  
  for (const u of studentUsers) {
    const studentRecord = await prisma.student.findUnique({ where: { email: u.email } });
    if (!studentRecord) {
      console.log(`- User ${u.email} (${u.name}) has no Student record.`);
    }
  }

  console.log("\nChecking for Students with no User record...");
  const students = await prisma.student.findMany();
  for (const s of students) {
    const userRecord = await prisma.user.findUnique({ where: { email: s.email } });
    if (!userRecord) {
      console.log(`- Student ${s.email} (${s.name}) has no User record.`);
    }
  }
  
  console.log("\nDone.");
}

check().catch(console.error).finally(() => prisma.$disconnect());
