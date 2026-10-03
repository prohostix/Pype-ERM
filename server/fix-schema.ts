import fs from 'fs';
import path from 'path';

const schemaPath = path.resolve('prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Replace the bad additions:
// "rejected\n  withdraw_pending\n  withdrawn" -> "rejected"
schema = schema.split('rejected\n  withdraw_pending\n  withdrawn').join('rejected');

// Now explicitly add them to LeaveStatus ONLY
const enumTarget = `enum LeaveStatus {
  pending
  dept_approved
  approved
  rejected
}`;

const enumReplacement = `enum LeaveStatus {
  pending
  dept_approved
  approved
  rejected
  withdraw_pending
  withdrawn
}`;

schema = schema.replace(enumTarget, enumReplacement);

fs.writeFileSync(schemaPath, schema);
