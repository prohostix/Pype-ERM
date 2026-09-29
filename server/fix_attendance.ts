import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'theshahulofcl@gmail.com' }});
  if (!user) return console.log('User not found');
  
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId: user.id,
      startDate: { gte: new Date('2026-09-22T00:00:00Z'), lte: new Date('2026-09-22T23:59:59Z') }
    }
  });

  const targetLeave = leaves[0];
  if (!targetLeave) return console.log('Leave not found');
  
  console.log("Found leave status:", targetLeave.status, "type:", targetLeave.type);

  // Re-run the attendance generation logic
  const startDate = new Date(targetLeave.startDate);
  const endDate = new Date(targetLeave.endDate);
  const statusToSet = targetLeave.isHalfDay ? 'half_day' : 'leave';

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateOnly = new Date(d);
    dateOnly.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId: targetLeave.employeeId,
        date: dateOnly
      }
    });

    if (existing) {
      await prisma.attendance.update({
        where: { id: existing.id },
        data: { status: statusToSet as any, notes: 'sick leave (converted)' }
      });
      console.log('Updated existing attendance for', dateOnly);
    } else {
      await prisma.attendance.create({
        data: {
          employeeId: targetLeave.employeeId,
          organizationId: targetLeave.organizationId,
          date: dateOnly,
          status: statusToSet as any,
          notes: `Leave Approved: ${targetLeave.reason}`
        }
      });
      console.log('Created new attendance for', dateOnly);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
