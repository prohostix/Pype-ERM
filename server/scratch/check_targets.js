import dotenv from 'dotenv';
import prisma from '../dist/lib/prisma.js';

dotenv.config({ path: './.env' });

async function checkTargets() {
  try {
    const targets = await prisma.target.findMany({
      include: {
        employee: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    console.log("Targets in database:");
    console.log(JSON.stringify(targets, null, 2));
  } catch (error) {
    console.error("Error fetching targets:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTargets();
