import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();
async function main() {
  const reqs = await prisma.editDeleteRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(reqs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
