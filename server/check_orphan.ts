import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orphans = await prisma.user.findMany({
    where: { role: 'center_admin' },
    select: { id: true, email: true, studyCenterId: true, role: true }
  });
  console.log('Center Admin Users:', orphans);
}
main().catch(console.error).finally(() => prisma.$disconnect());
