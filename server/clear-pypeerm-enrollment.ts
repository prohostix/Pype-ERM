import prisma from './src/lib/prisma.js';

async function main() {
  const result = await prisma.student.updateMany({
    where: {
      enrollmentNo: {
        startsWith: 'PYPEERM'
      }
    },
    data: {
      enrollmentNo: null
    }
  });

  const enrollmentResult = await prisma.enrollment.updateMany({
    where: {
      enrollmentNumber: {
        startsWith: 'PYPEERM'
      }
    },
    data: {
      enrollmentNumber: null
    }
  });

  console.log(`Cleared student enrollment numbers: ${result.count}`);
  console.log(`Cleared enrollment records numbers: ${enrollmentResult.count}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
