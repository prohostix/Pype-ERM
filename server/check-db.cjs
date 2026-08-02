const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
    const student = await prisma.student.findFirst({
      where: { admissionProgress: { not: undefined } }
    });
    console.log(student ? JSON.stringify(student.admissionProgress, null, 2) : "No student found");
  } finally {
    prisma.$disconnect();
  }
}
run();
