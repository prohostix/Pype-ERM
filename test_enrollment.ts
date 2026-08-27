import prisma from './server/src/lib/prisma.js';
async function main() {
  const e = await prisma.enrollment.findMany({
    where: { studentId: '43eedff0-3e97-4855-b84a-22bbe298dcf5' }
  });
  console.log(JSON.stringify(e, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
