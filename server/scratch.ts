import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'salessub@xyz.com' },
    include: {
      branch: true,
      department: true
    }
  });
  console.log(JSON.stringify(user, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
