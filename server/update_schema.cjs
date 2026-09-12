const fs = require('fs');
const path = './prisma/schema.prisma';

let schema = fs.readFileSync(path, 'utf8');

// Insert into AcademicClass
schema = schema.replace(
  /model AcademicClass {([\s\S]*?)createdAt/m,
  'model AcademicClass {$1academicSessions AcademicSession[]\n  createdAt'
);

// Insert into ClassModule
schema = schema.replace(
  /model ClassModule {([\s\S]*?)createdAt/m,
  'model ClassModule {$1academicSessions AcademicSession[]\n  createdAt'
);

// Insert into ModuleLesson
schema = schema.replace(
  /model ModuleLesson {([\s\S]*?)createdAt/m,
  'model ModuleLesson {$1academicSessions AcademicSession[]\n  createdAt'
);

// Insert into AcademicBatch
schema = schema.replace(
  /model AcademicBatch {([\s\S]*?)createdAt/m,
  'model AcademicBatch {$1academicSessions AcademicSession[]\n  createdAt'
);

// Insert into Faculty
schema = schema.replace(
  /model Faculty {([\s\S]*?)createdAt/m,
  'model Faculty {$1taughtSessions AcademicSession[] @relation("SessionTeacher")\n  startedSessions AcademicSession[] @relation("SessionStarter")\n  createdAt'
);

// Insert into Organization
schema = schema.replace(
  /model Organization {([\s\S]*?)createdAt/m,
  'model Organization {$1academicSessions AcademicSession[]\n  studentAcademicAttendances StudentAcademicAttendance[]\n  createdAt'
);

// Insert into Student
schema = schema.replace(
  /model Student {([\s\S]*?)createdAt/m,
  'model Student {$1academicAttendances StudentAcademicAttendance[]\n  createdAt'
);

fs.writeFileSync(path, schema);
