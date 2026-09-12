const fs = require('fs');

const schemaPath = './server/prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

const newModel = `
model BatchLessonAssignment {
  id              String         @id @default(uuid())
  academicBatchId String
  academicBatch   AcademicBatch  @relation(fields: [academicBatchId], references: [id], onDelete: Cascade)
  moduleLessonId  String
  moduleLesson    ModuleLesson   @relation(fields: [moduleLessonId], references: [id], onDelete: Cascade)
  facultyId       String
  faculty         Faculty        @relation(fields: [facultyId], references: [id], onDelete: Cascade)
  organizationId  String
  organization    Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@unique([academicBatchId, moduleLessonId])
  @@index([academicBatchId])
  @@index([moduleLessonId])
  @@index([facultyId])
  @@index([organizationId])
}
`;

// Insert new model at the end of the file
schema += '\n' + newModel;

// Add relations to existing models
schema = schema.replace(
  'facultyHistory LessonFacultyHistory[]',
  'facultyHistory LessonFacultyHistory[]\n  batchAssignments BatchLessonAssignment[]'
);

schema = schema.replace(
  'students        Student[]',
  'students        Student[]\n  lessonAssignments BatchLessonAssignment[]'
);

schema = schema.replace(
  'moduleLessons   ModuleLesson[]',
  'moduleLessons   ModuleLesson[]\n  batchLessonAssignments BatchLessonAssignment[]'
);

fs.writeFileSync(schemaPath, schema);
