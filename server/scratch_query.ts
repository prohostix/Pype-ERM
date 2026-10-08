import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'timstirur@gmail.com' },
    include: {
      designation: true,
      manager: true,
      subordinates: true,
      department: true,
      branch: true,
      organization: true,
    }
  });
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log('User:', JSON.stringify(user, null, 2));

  // Also query Modern Org Chart node if it exists
  try {
    const orgNode = await prisma.orgChartNode.findFirst({
      where: { userId: user.id },
      include: {
        parent: true,
        children: true,
      }
    });
    console.log('\nOrg Chart Node:', JSON.stringify(orgNode, null, 2));
  } catch (e) {
    console.log('Error querying OrgChartNode:', e.message);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
