import dotenv from 'dotenv';
import prisma from '../src/lib/prisma.js';

dotenv.config({ path: './.env' });

async function checkUniversities() {
  try {
    const universities = await prisma.university.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        organizationId: true,
        organization: {
          select: {
            name: true
          }
        }
      }
    });
    console.log("Universities in database:");
    console.log(JSON.stringify(universities, null, 2));
  } catch (err) {
    console.error("Failed to query database:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkUniversities();
