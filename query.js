const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:postgres@localhost:5432/erp_db?schema=public" } } });

async function main() {
  const users = await prisma.user.findMany({
    where: { name: { contains: 'Aslam' } }
  });
  console.log(users);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
