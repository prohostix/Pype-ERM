import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { email: 'reshmareji620@gmail.com' },
    data: { userId: 'C24PS0328' }
  });
  console.log(`Updated ${result.count} users.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
