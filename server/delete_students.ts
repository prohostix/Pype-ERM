import prisma from './src/lib/prisma.js';

async function main() {
  const emails = ['studentonetwo@gmail.com', 'studycenterstudent@gmail.com'];
  
  for (const email of emails) {
    console.log(`Processing deletion for: ${email}`);
    
    // Find Student
    const student = await prisma.student.findUnique({ where: { email } });
    if (student) {
      // 1. Delete associated enrollments (if any link directly by studentId)
      // Usually Enrollment links to studentId
      const enrolls = await prisma.enrollment.findMany({ where: { studentId: student.id } });
      if (enrolls.length > 0) {
        // Delete related payments first to avoid FK constraints
        await prisma.enrollmentPayment.deleteMany({
          where: { enrollmentId: { in: enrolls.map(e => e.id) } }
        });
        await prisma.enrollment.deleteMany({
          where: { studentId: student.id }
        });
        console.log(`- Deleted ${enrolls.length} Enrollment records.`);
      }

      // Delete other relations (e.g. attendance)
      await prisma.studentAcademicAttendance.deleteMany({ where: { studentId: student.id } });
      await prisma.studentAssessmentAttempt.deleteMany({ where: { studentId: student.id } });
      await prisma.studentVideoLog.deleteMany({ where: { studentId: student.id } });
      
      // Finally delete the Student record
      await prisma.student.delete({ where: { id: student.id } });
      console.log(`- Deleted Student record.`);
    } else {
      console.log(`- Student record not found.`);
    }
    
    // Delete corresponding User record (if any)
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // Delete any associated attendance for the user
      await prisma.attendance.deleteMany({ where: { employeeId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`- Deleted User login record.`);
    } else {
      console.log(`- User login record not found.`);
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
