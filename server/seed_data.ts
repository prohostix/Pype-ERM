import prisma from './src/lib/prisma.js';

async function main() {
  const classId = '520f90a7-21f8-406b-87a2-9f0f1179e18e';

  // 1. Get Class to find organizationId
  const cls = await prisma.academicClass.findUnique({
    where: { id: classId }
  });

  if (!cls) {
    console.error(`Class with ID ${classId} not found.`);
    process.exit(1);
  }

  console.log(`Found class: ${cls.name}, orgId: ${cls.organizationId}`);

  // 2. Create Module
  const module = await prisma.classModule.create({
    data: {
      academicClassId: cls.id,
      organizationId: cls.organizationId,
      title: 'Introduction to Advanced Concepts',
      description: 'A dummy module containing foundational lessons.',
      order: 1
    }
  });

  console.log(`Created Module: ${module.id}`);

  // 3. Create Lesson
  const lesson = await prisma.moduleLesson.create({
    data: {
      classModuleId: module.id,
      organizationId: cls.organizationId,
      title: 'Lesson 1: The Basics',
      description: 'In this lesson, we will cover the basics of advanced concepts.',
      order: 1,
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' // dummy video
    }
  });

  console.log(`Created Lesson: ${lesson.id}`);

  // 4. Create Assessment
  const assessment = await prisma.assessment.create({
    data: {
      lessonId: lesson.id,
      title: 'Basics Quiz',
      description: 'Test your knowledge on the basics.',
      passingScore: 60,
    }
  });

  console.log(`Created Assessment: ${assessment.id}`);

  // 5. Create Assessment Questions
  await prisma.assessmentQuestion.createMany({
    data: [
      {
        assessmentId: assessment.id,
        questionText: 'What is the primary goal of this lesson?',
        options: JSON.stringify(['To learn the basics', 'To write advanced code', 'To deploy to production', 'None of the above']),
        correctIndex: 0,
        order: 1
      },
      {
        assessmentId: assessment.id,
        questionText: 'Which of the following is true?',
        options: JSON.stringify(['Water is dry', 'The sun is cold', 'Fire is hot', 'Earth is flat']),
        correctIndex: 2,
        order: 2
      }
    ]
  });

  console.log(`Created Assessment Questions for Assessment: ${assessment.id}`);
  
  // Assign this lesson to all batches of this class so they can see it in curriculum
  const batches = await prisma.academicBatch.findMany({
    where: { academicClassId: classId }
  });
  
  // Get a faculty
  const faculty = await prisma.faculty.findFirst({ where: { organizationId: cls.organizationId } });
  
  for (const batch of batches) {
    await prisma.batchLessonAssignment.create({
      data: {
        academicBatch: { connect: { id: batch.id } },
        moduleLesson: { connect: { id: lesson.id } },
        faculty: faculty ? { connect: { id: faculty.id } } : undefined,
        organization: { connect: { id: cls.organizationId } }
      }
    });
    console.log(`Assigned Lesson to Batch: ${batch.name}`);
  }

  console.log('Dummy data successfully created.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
