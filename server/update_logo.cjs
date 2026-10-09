const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.update({
    where: { email: 'ecatcr@gmail.com' },
    data: { logo: null },
  });
  console.log('Updated org:', org.name, org.logo);
}
main().catch(console.error).finally(() => prisma.$disconnect());
