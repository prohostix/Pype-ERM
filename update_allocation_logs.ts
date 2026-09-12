import fs from 'fs';

let content = fs.readFileSync('server/src/controllers/academicBatchController.ts', 'utf-8');

// Update manualAllocate
const manualLogSnippet = `
  const historyData = studentIds.map((sid: string) => ({
    studentId: sid,
    toBatchId: batch.id,
    academicClassId: batch.academicClassId,
    transferredById: user.id,
    organizationId,
    reason: 'Initial Manual Allocation'
  }));

  // Perform in transaction
  await prisma.$transaction([
    prisma.student.updateMany({
      where: { 
        id: { in: studentIds },
        organizationId
      },
      data: { academicBatchId: batch.id }
    }),
    prisma.studentBatchTransfer.createMany({
      data: historyData
    })
  ]);
`;

content = content.replace(
  /await prisma\.student\.updateMany\(\{\s*where: \{\s*id: \{ in: studentIds \},\s*organizationId\s*\},\s*data: \{ academicBatchId: batch\.id \}\s*\}\);/,
  manualLogSnippet
);

// Update smartAllocate
const smartLogSnippet = `
  const historyData = studentIds.map((sid: string) => ({
    studentId: sid,
    toBatchId: batch.id,
    academicClassId: batch.academicClassId,
    transferredById: user.id,
    organizationId,
    reason: 'Initial Smart Allocation'
  }));

  await prisma.$transaction([
    prisma.student.updateMany({
      where: { id: { in: studentIds } },
      data: { academicBatchId: batch.id }
    }),
    prisma.studentBatchTransfer.createMany({
      data: historyData
    })
  ]);
`;

content = content.replace(
  /await prisma\.student\.updateMany\(\{\s*where: \{ id: \{ in: studentIds \} \},\s*data: \{ academicBatchId: batch\.id \}\s*\}\);/,
  smartLogSnippet
);

fs.writeFileSync('server/src/controllers/academicBatchController.ts', content);
