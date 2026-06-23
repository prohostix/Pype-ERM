import prisma from '../src/lib/prisma.js';

async function test() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'org_admin@pype.com' },
          { userId: 'org_admin@pype.com' }
        ]
      },
      include: {
        organization: true,
        department: true,
        subDepartment: true,
      }
    });
    console.log("Query succeeded! User:", user);
  } catch (err) {
    console.error("Query failed with error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
