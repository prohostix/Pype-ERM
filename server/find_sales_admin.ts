import prisma from './src/lib/prisma.js';

async function main() {
  try {
    const student = await prisma.student.findFirst({
      where: {
        email: 'salmasameer35@gmail.com',
      },
      include: {
        enrolledByUser: { select: { name: true, email: true, role: true } },
        enrollments: {
          select: {
            salesUser: { select: { name: true, email: true, role: true } },
            salesUserId: true,
            statusHistory: true,
          }
        }
      }
    });

    console.log(JSON.stringify(student, null, 2));
  } catch (e) {
    console.error(e);
  }
}

main();
