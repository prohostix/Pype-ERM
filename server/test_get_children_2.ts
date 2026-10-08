import prisma from './src/lib/prisma.js';

async function run() {
  const designations = await prisma.designation.findMany({
    where: { parentDesignationId: 'a7a82a4d-0a95-4150-9010-0df17466cb12' }
  });
  console.log('Children:', JSON.stringify(designations, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
