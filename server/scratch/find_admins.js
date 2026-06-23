import dotenv from 'dotenv';
import prisma from '../src/lib/prisma.js';

dotenv.config({ path: './.env' });

async function findAdmins() {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ['superadmin', 'org_admin']
        }
      },
      select: {
        id: true,
        userId: true,
        email: true,
        name: true,
        role: true,
        status: true,
        organizationId: true
      }
    });
    console.log("Admins found in database:");
    console.log(JSON.stringify(admins, null, 2));
  } catch (err) {
    console.error("Failed to query database:", err);
  } finally {
    await prisma.$disconnect();
  }
}

findAdmins();
