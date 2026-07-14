import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function test() {
  const hr = await prisma.user.findFirst({ where: { role: 'hr_admin' } });
  if (!hr) { console.log('No HR found'); return; }
  console.log('HR found:', hr.email);
}
test().catch(console.error).finally(() => prisma.$disconnect());
