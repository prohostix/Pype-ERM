import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();
async function main() {
  const orgs = await prisma.organization.findMany();
  console.log("Success! Found organizations:", orgs.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
