import prisma from './dist/lib/prisma.js';

async function main() {
  const uniSubmissionsPending = await prisma.default.student.count({
    where: {
      OR: [
        { admissionProgress: { equals: 'Prisma.AnyNull' } }, // Can't easily use Prisma enum in JS without import, let's just use raw or see
        { NOT: { admissionProgress: { path: ['universitySubmitted'], equals: true } } }
      ]
    }
  });

  const docsPending = await prisma.default.student.count({
    where: {
      NOT: { admissionProgress: { path: ['documentsVerified'], equals: true } }
    }
  });

  const reregPending = await prisma.default.student.count({
    where: {
      NOT: { reregStatus: { path: ['completed'], equals: true } }
    }
  });

  console.log({ uniSubmissionsPending, docsPending, reregPending });
}
main().finally(() => prisma.default.$disconnect());
