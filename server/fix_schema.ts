import fs from 'fs';

let content = fs.readFileSync('server/prisma/schema.prisma', 'utf-8');

content = content.replace(
  /fromBatchId\s+String\n\s+fromBatch\s+AcademicBatch\s+@relation\("TransferredFrom", fields: \[fromBatchId\], references: \[id\], onDelete: Cascade\)/g,
  'fromBatchId       String?\n  fromBatch         AcademicBatch?  @relation("TransferredFrom", fields: [fromBatchId], references: [id], onDelete: Cascade)'
);

fs.writeFileSync('server/prisma/schema.prisma', content);
