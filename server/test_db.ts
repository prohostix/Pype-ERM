import prisma from './src/lib/prisma.js';

async function main() {
  const lessons = await prisma.moduleLesson.findMany({
    where: { facultyId: { not: null } },
    select: { id: true, title: true, facultyId: true, faculty: { select: { id: true, name: true } } }
  });
  console.log("Lessons with faculty:", JSON.stringify(lessons, null, 2));
  
  const batchAss = await prisma.batchLessonAssignment.findMany({
    select: { id: true, moduleLessonId: true, facultyId: true, faculty: { select: { id: true, name: true } } }
  });
  console.log("Batch Assignments:", JSON.stringify(batchAss, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
