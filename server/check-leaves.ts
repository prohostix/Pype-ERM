import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'abheeshkumaran7@gmail.com' } });
  if (!user) {
    console.log("User not found!");
    return;
  }
  console.log("User:", user.name, user.id);
  
  const allocations = await prisma.leaveAllocation.findMany({
    where: { userId: user.id }
  });
  
  console.log("Allocations:", allocations);
}
main().catch(console.error).finally(() => prisma.$disconnect());
