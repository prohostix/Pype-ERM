import prisma from './src/lib/prisma.js';

async function main() {
  const reqUserId = "da40fe9c-e179-4a43-a661-90878775dd5c"; // Abeesh
  
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
