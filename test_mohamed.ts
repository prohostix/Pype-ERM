import prisma from './server/src/lib/prisma.js';
async function main() {
  const s = await prisma.student.findFirst({
    where: { name: { contains: 'mohamed', mode: 'insensitive' } },
    include: { enrollments: true, invoices: true }
  });
  console.log(JSON.stringify(s, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
