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
        enrollments: true,
        organization: true,
        center: true,
      }
    });
    console.log(JSON.stringify(student, null, 2));
  } catch (e) {
    console.error(e);
  }
}

main();
