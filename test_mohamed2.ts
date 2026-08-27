import prisma from './server/src/lib/prisma.js';
async function main() {
  const s = await prisma.student.findMany({
    where: { name: { contains: 'mohamed', mode: 'insensitive' } },
    select: { id: true, name: true, enrollmentNo: true, admissionProgress: true, enrollments: { select: { initialPaymentAmount: true } } }
  });
  console.log(JSON.stringify(s, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
