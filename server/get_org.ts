import prisma from './src/lib/prisma.js';

async function main() {
  const orgs = await prisma.organization.findMany();
  console.log(JSON.stringify(orgs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
