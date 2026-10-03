import prisma from './src/lib/prisma.js';
import fs from 'fs';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'abheeshkumaran7@gmail.com' } });
  if (!user) return console.log('User not found');

  const leaves = await prisma.leaveRequest.findMany({
    where: { 
      employeeId: user.id,
      status: 'approved'
    }
  });

  if (leaves.length === 0) {
    console.log('No approved leaves found for this user.');
    return;
  }

  // Backup the leaves first!
  fs.writeFileSync('leave_backup.json', JSON.stringify(leaves, null, 2));
  console.log('Backed up leaves to leave_backup.json');

  // Revert the latest one to pending
  const targetLeave = leaves[0];
  
  await prisma.leaveRequest.update({
    where: { id: targetLeave.id },
    data: { 
      status: 'pending',
      hrApprovedBy: null,
      deptApprovedBy: null,
      hrRemarks: '',
      deptAdminRemarks: ''
    }
  });

  console.log(`Reverted leave request ${targetLeave.id} to pending state.`);
}
main();
