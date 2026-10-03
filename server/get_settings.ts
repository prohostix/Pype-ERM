import prisma from './src/lib/prisma.js';

async function main() {
  const settings = await prisma.hRSettings.findFirst();
  console.log(JSON.stringify(settings?.officeHours, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
