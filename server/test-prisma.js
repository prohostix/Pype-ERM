import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const student = await prisma.student.findFirst();
    if (!student) {
      console.log('No student found');
      return;
    }
    console.log('Testing with student:', student.id);
    
    // Simulate what the controller does
    let admissionProgress = {};
    if (student.admissionProgress && typeof student.admissionProgress === 'object') {
      admissionProgress = student.admissionProgress;
    }
    
    const updatedProgress = {
      ...admissionProgress,
      ['verification']: {
        completed: true,
        proofUrl: '/uploads/test.png',
        updatedBy: 'system',
        updatedAt: new Date().toISOString()
      }
    };
    
    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: { admissionProgress: updatedProgress }
    });
    console.log('Success!', updatedStudent.admissionProgress);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
