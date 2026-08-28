const fs = require('fs');
const path = require('path');

const files = [
  'server/src/config/constants.ts',
  'server/src/controllers/attendanceController.ts',
  'server/src/controllers/authController.ts',
  'server/src/controllers/financeController.ts',
  'server/src/controllers/operationsController.ts',
  'server/src/controllers/salesController.ts',
  'server/src/controllers/salesReportController.ts',
  'server/src/controllers/universityEnrollmentController.ts'
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // constants.ts
  content = content.replace(/CENTER_ADMIN:\s*\n/, '');

  // } else if (req.user.role === ) {
  content = content.replace(/} else if \(req\.user\.role === \)\s*\{[\s\S]*?\n\s*}/g, '');
  
  // if (user.role ===  && user.studyCenterId) {
  content = content.replace(/if \(user\.role ===  && user\.studyCenterId\) \{[\s\S]*?\n\s*}/g, '');

  // role: ,
  content = content.replace(/role: \s*\n/, "role: 'employee',\n");
  
  // role:  }
  content = content.replace(/role:  }/g, "role: 'employee' }");

  // role:  status:
  content = content.replace(/role:  status:/g, "role: 'employee', status:");

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed syntax errors in ${file}`);
  }
}
