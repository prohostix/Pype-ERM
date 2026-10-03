import prisma from './src/lib/prisma.js';
import * as fs from 'fs';

async function main() {
  const orgId = 'f0e75a7f-4e1b-4520-827a-c12deb366277';
  const attendances = await prisma.attendance.findMany({
    where: { organizationId: orgId },
    include: { user: true },
    orderBy: [{ date: 'asc' }, { employeeId: 'asc' }]
  });

  let csvContent = 'Employee Name,Email,Date,Status,Check-In,Check-Out,Late Minutes\n';

  for (const rec of attendances) {
    const empName = rec.user?.name || 'Unknown';
    const email = rec.user?.email || '';
    const date = rec.date ? new Date(rec.date).toISOString().split('T')[0] : '';
    const status = rec.status || '';
    
    // Only format time for checkIn/checkOut
    const checkIn = rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString('en-US', { hour12: false }) : '--';
    const checkOut = rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString('en-US', { hour12: false }) : '--';
    
    // According to user, don't deduct half day punch late minutes. We just output lateMinutes as they are.
    let lateMinutes = rec.lateMinutes || 0;

    csvContent += `"${empName}","${email}","${date}","${status}","${checkIn}","${checkOut}",${lateMinutes}\n`;
  }

  fs.writeFileSync('/Users/apple/.gemini/antigravity-ide/brain/94f5c0ae-ef9c-4158-b776-aa3ac0cd8898/prohostix_attendance.csv', csvContent);
  console.log('CSV created at artifacts directory.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
