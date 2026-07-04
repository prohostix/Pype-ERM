// Queries the database to find exact role strings used by finance users
const { PrismaClient } = require('../dist/generated/client');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      role: {
        contains: 'finance'
      }
    },
    select: { id: true, name: true, role: true },
    take: 10
  });
  console.log('Finance users:', JSON.stringify(users, null, 2));

  const allRoles = await prisma.$queryRaw`SELECT DISTINCT role FROM "User" ORDER BY role`;
  console.log('All distinct roles:', JSON.stringify(allRoles, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
