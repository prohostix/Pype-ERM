const { PrismaClient } = require('./server/src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const s = await prisma.student.findFirst({
    where: { name: { contains: 'mohamed', mode: 'insensitive' } },
    include: { enrollments: true, invoices: true, payments: true }
  });
  console.log(JSON.stringify(s, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
