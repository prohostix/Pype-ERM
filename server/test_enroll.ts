import prisma from './src/lib/prisma.js';

async function main() {
  const org = await prisma.organization.findUnique({ where: { email: 'ecatcr@gmail.com' } });
  if (!org) throw new Error('Org not found');

  const universities = await prisma.university.findMany({ where: { organizationId: org.id } });
  console.log('Universities:', universities.map(u => ({ id: u.id, name: u.name })));

  const programs = await prisma.program.findMany({ where: { organizationId: org.id } });
  console.log('Programs:', programs.map(p => ({ id: p.id, name: p.name, universityId: p.universityId })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
