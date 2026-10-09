import prisma from './src/lib/prisma.js';

async function main() {
  const org = await prisma.organization.findUnique({ where: { email: 'ecatcr@gmail.com' } });
  if (!org) throw new Error('Org not found');

  const branches = await prisma.academicCenter.findMany({ where: { organizationId: org.id } });
  console.log('Branches:', branches.map(b => b.name));
}
main().catch(console.error).finally(() => prisma.$disconnect());
