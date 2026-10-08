import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'branchmanagerkochi@xyz.com' } });
  if (!user) return console.log('User not found');
  
  const branchUsers = await prisma.user.findMany({
    where: { branchId: user.branchId },
    select: { id: true, name: true, role: true, designation: true, reportingTo: true }
  });
  
  console.log('Branch Users:', branchUsers);
}

main().catch(console.error).finally(() => prisma.$disconnect());
