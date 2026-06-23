import { prisma } from './src/config/postgres.js';

async function run() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, organizationId: true }
  });
  console.log('\n--- USERS ---');
  console.dir(users, { depth: null });
  await prisma.$disconnect();
}

run();
