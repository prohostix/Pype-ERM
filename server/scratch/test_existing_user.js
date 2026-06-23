import prisma from '../src/lib/prisma.js';

async function test() {
  try {
    // Find any user
    const anyUser = await prisma.user.findFirst({
      select: { email: true }
    });
    
    if (!anyUser) {
      console.log("No users found in database!");
      return;
    }
    
    console.log("Found user email:", anyUser.email);
    
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: anyUser.email },
          { userId: anyUser.email }
        ]
      },
      include: {
        organization: true,
        department: true,
        subDepartment: true,
      }
    });
    console.log("Query succeeded! User found:", user.email);
  } catch (err) {
    console.error("Query failed with error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
