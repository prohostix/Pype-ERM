import prisma from '../lib/prisma.js';

async function main() {
  console.log('🚀 Starting Attendance Late Minutes Remediation...');

  // 1. Reset lateMinutes for all half_day records
  const halfDayAtts = await prisma.attendance.updateMany({
    where: {
      OR: [
        { status: 'half_day' },
        { notes: { contains: 'half day', mode: 'insensitive' } }
      ],
      lateMinutes: { gt: 0 }
    },
    data: {
      lateMinutes: 0,
      isLate: false
    }
  });
  console.log(`✅ Set lateMinutes = 0 on ${halfDayAtts.count} half-day attendance records.`);

  // 2. Find any attendance records matching an approved/dept_approved half-day leave
  const halfDayLeaves = await prisma.leaveRequest.findMany({
    where: {
      isHalfDay: true,
      status: { in: ['approved', 'dept_approved', 'pending'] }
    }
  });

  let linkedHalfDayCount = 0;
  for (const leave of halfDayLeaves) {
    const start = new Date(leave.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(leave.endDate);
    end.setHours(23, 59, 59, 999);

    const res = await prisma.attendance.updateMany({
      where: {
        employeeId: leave.employeeId,
        date: { gte: start, lte: end },
        OR: [
          { lateMinutes: { gt: 0 } },
          { status: { in: ['late', 'present'] } }
        ]
      },
      data: {
        status: 'half_day',
        lateMinutes: 0,
        isLate: false
      }
    });
    linkedHalfDayCount += res.count;
  }
  console.log(`✅ Normalized ${linkedHalfDayCount} attendance records linked to half-day leaves.`);

  // 3. Evening single punch protection (punched in >= 4:00 PM IST with late >= 240 mins)
  const eveningPunches = await prisma.attendance.findMany({
    where: {
      lateMinutes: { gte: 240 },
      checkIn: { not: null }
    }
  });

  let eveningCount = 0;
  for (const att of eveningPunches) {
    if (!att.checkIn) continue;
    const istCheckIn = new Date(att.checkIn.getTime() + (330 * 60000));
    const istHour = istCheckIn.getUTCHours();
    if (istHour >= 16) {
      await prisma.attendance.update({
        where: { id: att.id },
        data: {
          lateMinutes: 0,
          isLate: false
        }
      });
      eveningCount++;
    }
  }
  console.log(`✅ Cleared false late penalties on ${eveningCount} evening single punches (departures mistaken as arrivals).`);

  console.log('🎉 Remediation complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error in remediation:', err);
  process.exit(1);
});

