import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.updateMany({
    where: { role: 'staff' },
    data: { role: 'employee' }
  });
  console.log(`Updated ${users.count} users from staff to employee`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
