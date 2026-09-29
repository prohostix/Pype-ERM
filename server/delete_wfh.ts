import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'theshahulofcl@gmail.com' } });
  if (!user) {
    console.log("User not found.");
    return;
  }
  
  const targetDateStart = new Date('2026-09-28T18:30:00.000Z'); // Start of Sep 29 IST
  const targetDateEnd = new Date('2026-09-29T18:29:59.999Z'); // End of Sep 29 IST

  // Delete LeaveRequest
  const deletedLeaves = await prisma.leaveRequest.deleteMany({
    where: {
      employeeId: user.id,
      type: 'wfh',
      startDate: {
        gte: targetDateStart,
        lte: targetDateEnd
      }
    }
  });
  console.log("Deleted leave requests:", deletedLeaves.count);

  // Delete Attendance
  const deletedAttendance = await prisma.attendance.deleteMany({
    where: {
      employeeId: user.id,
      status: 'wfh',
      date: {
        gte: targetDateStart,
        lte: targetDateEnd
      }
    }
  });
  console.log("Deleted attendance records:", deletedAttendance.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
