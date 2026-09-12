import fs from 'fs';

let content = fs.readFileSync('server/prisma/schema.prisma', 'utf-8');

if (!content.includes('StudentBatchTransfer[]')) {
  // Add reverse relations
  content = content.replace(/model AcademicBatch \{/, 'model AcademicBatch {\n  transfersFrom StudentBatchTransfer[] @relation("TransferredFrom")\n  transfersTo StudentBatchTransfer[] @relation("TransferredTo")');
  content = content.replace(/model Student \{/, 'model Student {\n  studentBatchTransfers StudentBatchTransfer[]');
  content = content.replace(/model AcademicClass \{/, 'model AcademicClass {\n  studentBatchTransfers StudentBatchTransfer[]');
  content = content.replace(/model User \{/, 'model User {\n  studentBatchTransfers StudentBatchTransfer[]');
  fs.writeFileSync('server/prisma/schema.prisma', content);
}
