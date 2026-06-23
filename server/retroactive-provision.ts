import { prisma } from './src/config/postgres.js';
import { provisionStudentAfterApproval } from './src/utils/studentProvisioning.js';

async function run() {
  console.log('Starting retroactive student provisioning...');
  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: 'enrolled',
      OR: [
        { studentId: null },
      ]
    }
  });

  console.log(`Found ${enrollments.length} enrolled enrollments without a linked student.`);

  for (const e of enrollments) {
    console.log(`Provisioning student for enrollment ID: ${e.id}, name: ${e.studentName}, email: ${e.studentEmail}`);
    await provisionStudentAfterApproval(e.id);
  }

  console.log('Finished retroactive provisioning.');
  await prisma.$disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Error during retroactive provisioning:', err);
  await prisma.$disconnect();
  process.exit(1);
});
