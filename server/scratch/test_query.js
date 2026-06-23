import prisma from '../src/lib/prisma.js';

async function test() {
  try {
    const centers = await prisma.studyCenter.findMany({
      select: {
        id: true,
        name: true,
        code: true
      }
    });
    console.log("Study Centers in DB:", centers);
  } catch (err) {
    console.error("Query failed with error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
