import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: 'bishrulhafi676',
        mode: 'insensitive'
      }
    }
  });
  console.log(`Found ${users.length} users with email containing 'bishrulhafi676':`);
  console.log(users.map((u: any) => ({ id: u.id, email: u.email, name: u.name, role: u.role })));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
