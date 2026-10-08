import prisma from './src/lib/prisma.js';
async function run() {
  const user = await prisma.user.findFirst({ where: { email: 'bossacademics@gmail.com' } });
  console.log('User orgId:', user?.organizationId);
}
run();
