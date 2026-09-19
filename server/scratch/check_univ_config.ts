import prisma from '../src/lib/prisma';
async function main() {
  const univs = await prisma.university.findMany({ select: { name: true, enrollmentFormConfig: true }});
  console.log(JSON.stringify(univs, null, 2));
}
main().catch(console.error).finally(async () => { await (prisma as any).$disconnect?.() });
