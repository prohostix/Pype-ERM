import prisma from './src/lib/prisma.js';

async function main() {
  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { email: 'salmasameer35@gmail.com' },
          { phone: '9446065316' },
        ]
      },
      include: {
        enrollments: {
          select: {
            id: true,
            status: true,
            opsVerificationStatus: true,
            reviewerId: true,
            rejectionReason: true,
            opsRejectionReason: true,
            enrollmentId: true,
          }
        },
      }
    });
    console.log("Student Status:", student?.status);
    console.log("Enrollments:", JSON.stringify(student?.enrollments, null, 2));
  } catch (e) {
    console.error(e);
  }
}

main();
