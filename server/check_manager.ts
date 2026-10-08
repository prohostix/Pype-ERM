import prisma from './src/lib/prisma.js';

async function main() {
  const u = await prisma.user.findUnique({ where: { email: 'branchinchargeedpl.tims@gmail.com' } });
  console.log("MANAGER ROLE IS:", u?.role);
}
main().finally(() => process.exit(0));
