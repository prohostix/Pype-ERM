import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();
async function main() {
  await prisma.user.deleteMany({ where: { email: 'zzzzz@gmail.com' } });
  console.log('Deleted zzzzz@gmail.com');
}
main().catch(console.error).finally(() => prisma.$disconnect());
