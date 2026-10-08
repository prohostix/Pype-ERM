import prisma from './src/lib/prisma.js';

async function run() {
  const user = await prisma.user.findFirst({ where: { email: 'branchmanagerkochi@xyz.com' } });
  if (user) {
    const branch = await prisma.branch.findFirst({ where: { branchManagerId: user.id } });
    if (branch) {
      await prisma.user.update({
        where: { id: user.id },
        data: { branchId: branch.id }
      });
      console.log('Updated user branchId to:', branch.id);
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
