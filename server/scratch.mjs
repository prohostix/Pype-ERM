import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'medgare@gmail.com' } });
  console.log('ROLE:', user?.role);
}
main().finally(() => prisma.$disconnect());
