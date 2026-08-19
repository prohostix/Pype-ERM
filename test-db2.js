const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const sithara = await prisma.user.findFirst({
    where: { name: { contains: 'Sithara', mode: 'insensitive' } },
    include: { designations: true }
  });
  console.log("Sithara Designations:", sithara.designations);
}
main().finally(() => prisma.$disconnect());
