import fs from 'fs';
let content = fs.readFileSync('server/src/controllers/studentController.ts', 'utf-8');

// Add initialPaymentDate to admissionProgress
content = content.replace(
  /initialPaymentAmount: req\.body\.initialPaymentAmount !== undefined \? Number\(req\.body\.initialPaymentAmount\) : null/,
  "initialPaymentAmount: req.body.initialPaymentAmount !== undefined ? Number(req.body.initialPaymentAmount) : null,\n        initialPaymentDate: req.body.initialPaymentDate || null"
);

// Add initialPaymentDate to enrollment creation
content = content.replace(
  /initialPaymentAmount: req\.body\.initialPaymentAmount !== undefined \? Number\(req\.body\.initialPaymentAmount\) : null,/,
  "initialPaymentAmount: req.body.initialPaymentAmount !== undefined ? Number(req.body.initialPaymentAmount) : null,\n        initialPaymentDate: req.body.initialPaymentDate ? new Date(req.body.initialPaymentDate) : null,"
);

fs.writeFileSync('server/src/controllers/studentController.ts', content);
