import fs from 'fs';
let content = fs.readFileSync('server/src/controllers/financeEnrollmentController.ts', 'utf-8');

content = content.replace(
  /debitedAt: new Date\(\),/,
  "debitedAt: existingEnrollment.initialPaymentDate ? new Date(existingEnrollment.initialPaymentDate) : new Date(),"
);

fs.writeFileSync('server/src/controllers/financeEnrollmentController.ts', content);
