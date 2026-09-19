const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'Medugare', mode: 'insensitive' } }
  });
  console.log(JSON.stringify(org, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
