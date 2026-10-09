import prisma from './src/lib/prisma.js';

async function main() {
  const org = await prisma.organization.update({
    where: { email: 'ecatcr@gmail.com' },
    data: { logo: null },
  });
  console.log('Updated org:', org.name, org.logo);
}
main().catch(console.error).finally(() => prisma.$disconnect());
