const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const student = await prisma.student.findUnique({
    where: { email: 'nandhuanandhu82@gmail.com' },
    include: { enrollments: true, studentBatchTransfers: true }
  });
  console.log(JSON.stringify(student, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
