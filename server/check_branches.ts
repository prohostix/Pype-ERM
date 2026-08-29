import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  for (const b of branches) {
    const users = await prisma.user.count({ where: { branchId: b.id } });
    console.log(`Branch: ${b.name} (${b.id}) - Users: ${users}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
