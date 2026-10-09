import prisma from './src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  const org = await prisma.organization.findUnique({ where: { email: 'ecatcr@gmail.com' } });
  if (!org) throw new Error('Org not found');

  const universityId = 'a211c28a-e4c4-4a84-ba52-db16c66dffb9';
  const programId = '32d7622f-392a-4eb0-844e-742896bad146';
  const email = 'ecastudent@gmail.com';

  const user = await prisma.user.create({
    data: {
      email,
      name: 'ECA Test Student',
      password: await bcrypt.hash('password123', 10),
      role: 'student',
      organizationId: org.id
    }
  });

  const student = await prisma.student.create({
    data: {
      name: 'ECA Test Student',
      email: email,
      phone: '1234567890',
      address: 'Test Address',
      organizationId: org.id,
      programId: programId,
      status: 'pending',
    }
  });

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: student.id,
      programId: programId,
      organizationId: org.id,
      status: 'payment_pending',
      studentName: student.name,
      studentEmail: student.email,
      studentPhone: student.phone
    }
  });

  console.log('Created student:', student.email);
  console.log('Created enrollment:', enrollment.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
