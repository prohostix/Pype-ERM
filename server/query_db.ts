import { PrismaClient } from './src/generated/client/index.js';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: ["adt003.tims@gmail.com", "adt002.tims@gmail.com", "bct001.tims@gmail.com", "bct017.tims@gmail.com"] } },
    select: { id: true, email: true, reportingTo: true, name: true, role: true }
  });
  console.log("Users:", users);

  const sithara = await prisma.user.findFirst({
    where: { name: { contains: "Sithara", mode: "insensitive" } },
    select: { id: true, email: true, name: true }
  });
  console.log("Sithara:", sithara);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
