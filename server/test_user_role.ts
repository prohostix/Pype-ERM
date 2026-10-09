import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'ecatcr@gmail.com' } });
  console.log('User Role:', user?.role);
}
main().catch(console.error).finally(() => prisma.$disconnect());
