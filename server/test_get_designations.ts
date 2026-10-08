import prisma from './src/lib/prisma.js';

async function run() {
  const user = await prisma.user.findFirst({ where: { email: 'branchmanagerkochi@xyz.com' } });
  console.log('User branchId:', user?.branchId);

  const designations = await prisma.designation.findMany({
    include: { branch: true },
    where: { branchId: user?.branchId }
  });
  console.log('Designations with this branchId:', designations.map(d => ({ id: d.id, name: d.name, branchId: d.branchId })));
}

run().catch(console.error).finally(() => prisma.$disconnect());
