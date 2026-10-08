import prisma from './src/lib/prisma.js';

async function run() {
  const designations = await prisma.designation.findMany({
    include: { branch: true },
    where: { title: { contains: 'KOCHI', mode: 'insensitive' } }
  });
  console.log('Designations:', JSON.stringify(designations, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
