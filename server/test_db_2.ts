import prisma from './src/lib/prisma.js';

async function main() {
  const reqUserId = "d65af36f-c4d9-4556-b216-2a70db6358a2"; // Gopika
  
  const lessons = await prisma.moduleLesson.findMany({
    where: {
      OR: [
        { facultyId: reqUserId },
        { batchAssignments: { some: { facultyId: reqUserId } } }
      ]
    },
    include: {
      classModule: { include: { academicClass: { select: { name: true } } } },
      batchAssignments: {
        where: { facultyId: reqUserId },
        include: { academicBatch: { select: { name: true } } }
      }
    }
  });
  console.log("Found:", JSON.stringify(lessons, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
