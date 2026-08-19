const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, reportingTo: true, name: true, role: true }
  });
  console.log(users.filter(u => u.name.includes('Sithara') || u.name.includes('Priyanka') || u.name.includes('Ranjitha')));
}
main().finally(() => prisma.$disconnect());
