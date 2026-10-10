import prisma from './src/lib/prisma.js';

async function main() {
  try {
    const email = 'medugarecalicut@gmail.com';

    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        designations: { include: { childDesignations: true, parentDesignation: true } }
      }
    });

    console.log(JSON.stringify({
      name: user?.name,
      role: user?.role,
      assignedSalesUsers: user?.assignedSalesUsers,
      designations: user?.designations
    }, null, 2));

  } catch (e) {
    console.error(e);
  }
}

main();
