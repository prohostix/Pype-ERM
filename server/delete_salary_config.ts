import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'finance@prohostix.com' }
  });

  if (!user) {
    console.log('User test@prohostix.com not found');
    return;
  }

  const result = await prisma.salaryConfig.deleteMany({
    where: { userId: user.id }
  });

  console.log(`Deleted ${result.count} salary configuration(s) for ${user.email}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
