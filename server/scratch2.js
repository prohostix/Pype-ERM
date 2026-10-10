import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'salessub@xyz.com' },
    include: {
      branch: true,
      department: true,
      subDepartment: true,
    }
  });
  console.log(JSON.stringify(user, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
