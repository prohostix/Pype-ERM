import prisma from './src/lib/prisma.js';
async function run() {
  const t = await prisma.designation.findFirst({ where: { title: { contains: 'THRISSUR', mode: 'insensitive' } } });
  const b = await prisma.branch.findFirst({ where: { name: { contains: 'THRISSUR', mode: 'insensitive' } } });
  if (t && b) {
    await prisma.designation.update({
      where: { id: t.id },
      data: { allowedBranchIds: [b.id] }
    });
    console.log('Fixed Thrissur branch mapping.');
  }
}
run();
