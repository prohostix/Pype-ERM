import prisma from './src/lib/prisma.js';

async function main() {
  const org = await prisma.organization.findUnique({ where: { email: 'ecatcr@gmail.com' } });
  if (!org) throw new Error('Org not found');

  const programId = '32d7622f-392a-4eb0-844e-742896bad146';
  const email = 'ecastudent@gmail.com';

  const student = await prisma.student.findUnique({ where: { email } });
  if (!student) throw new Error('Student not found');

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: student.id,
      programId: programId,
      organizationId: org.id,
      status: 'payment_pending',
      studentName: student.name,
      studentEmail: student.email,
      studentPhone: student.phone,
      studentAddress: student.address
    }
  });

  console.log('Created enrollment:', enrollment.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
