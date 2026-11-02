import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { startEscalationCron } from './escalationService.js';

export const startAllCronJobs = () => {
  startInviteExpiryCron();
  startEscalationCron();
  startAutoPunchOutCron();
  startAutoAbsentCron();
  startLeaveAllocationCron();
  console.log('✅ All cron jobs started');
};

const startInviteExpiryCron = () => {
  cron.schedule('0 1 * * *', async () => {
    console.log('🔄 Running invite token expiry check...');
    try {
      const result = await prisma.studyCenterInvite.updateMany({
        where: {
          status: 'pending',
          expiresAt: { lt: new Date() }
        },
        data: { status: 'expired' }
      });
      console.log(`✅ Expired ${result.count} invite tokens`);
    } catch (error) {
      console.error('❌ Invite expiry cron error:', error);
    }
  });
};

const startAutoPunchOutCron = () => {
  // Run at 12:01 AM every day
  cron.schedule('1 0 * * *', async () => {
    console.log('🔄 Running auto punch-out for unclosed attendances...');
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const pendingAttendances = await prisma.attendance.findMany({
        where: {
          checkOut: null,
          date: { lt: todayStart }
        }
      });

      let updatedCount = 0;
      for (const record of pendingAttendances) {
        if (!record.checkIn) continue;

        const checkOutTime = new Date(record.date);
        checkOutTime.setHours(23, 59, 59, 999);

        const checkInTime = new Date(record.checkIn).getTime();
        const workingHours = Number(((checkOutTime.getTime() - checkInTime) / 3600000).toFixed(2));

        const existingNotes = record.notes ? record.notes + '\n' : '';

        await prisma.attendance.update({
          where: { id: record.id },
          data: {
            checkOut: checkOutTime,
            workingHours,
            notes: existingNotes + 'Auto-punched out by system at midnight.'
          }
        });
        updatedCount++;
      }
      
      console.log(`✅ Auto-punched out ${updatedCount} employees`);
    } catch (error) {
      console.error('❌ Auto punch-out cron error:', error);
    }
  });
};

const startAutoAbsentCron = () => {
  // Run at 11:58 PM every day
  cron.schedule('58 23 * * *', async () => {
    console.log('🔄 Running auto absent check for missing attendances...');
    try {
      const today = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = days[today.getDay()];
      
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const activeEmployees = await prisma.user.findMany({
        where: {
          role: { notIn: ['superadmin'] },
          status: 'active'
        }
      });

      let insertedCount = 0;
      let presentCount = 0;
      const orgSettingsCache: Record<string, any> = {};

      for (const emp of activeEmployees) {
        if (!emp.organizationId) continue;

        // Cache settings per organization
        if (!orgSettingsCache[emp.organizationId]) {
          const settings = await prisma.hRSettings.findUnique({
            where: { organizationId: emp.organizationId }
          });
          let workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          let stdHours = 8;
          
          if (settings && settings.officeHours) {
            const officeHours = settings.officeHours as any;
            if (officeHours.workingDays && Array.isArray(officeHours.workingDays)) {
              workingDays = officeHours.workingDays;
            }
            if (officeHours.startTime && officeHours.endTime) {
              const startParts = officeHours.startTime.split(':');
              const endParts = officeHours.endTime.split(':');
              if (startParts.length >= 2 && endParts.length >= 2) {
                const startDec = parseInt(startParts[0]) + (parseInt(startParts[1]) / 60);
                const endDec = parseInt(endParts[0]) + (parseInt(endParts[1]) / 60);
                if (endDec > startDec) {
                  stdHours = Number((endDec - startDec).toFixed(2));
                }
              }
            }
          }
          orgSettingsCache[emp.organizationId] = { workingDays, stdHours };
        }

        const orgSettings = orgSettingsCache[emp.organizationId];
        const isWorkingDay = orgSettings.workingDays.includes(todayName);

        // Check if today is a Holiday in the database
        const holiday = await prisma.holiday.findFirst({
          where: {
            organizationId: emp.organizationId,
            date: { gte: todayStart, lte: todayEnd }
          }
        });

        // Only generate absent/present records on normal working days
        if (!isWorkingDay || !!holiday) {
           continue; 
        }

        const existingRecord = await prisma.attendance.findFirst({
          where: {
            employeeId: emp.id,
            date: { gte: todayStart, lte: todayEnd }
          }
        });

        if (!existingRecord) {
          if (emp.requiresAttendance) {
            await prisma.attendance.create({
              data: {
                employeeId: emp.id,
                organizationId: emp.organizationId,
                date: todayStart,
                status: 'absent',
                isLate: false,
                lateMinutes: 0,
                workingHours: 0,
                notes: 'Auto-generated by system (no punch-in)'
              }
            });
            insertedCount++;
          } else {
            await prisma.attendance.create({
              data: {
                employeeId: emp.id,
                organizationId: emp.organizationId,
                date: todayStart,
                status: 'present',
                isLate: false,
                lateMinutes: 0,
                workingHours: orgSettings.stdHours,
                notes: 'Auto-marked as present (attendance not required)'
              }
            });
            presentCount++;
          }
        }
      }
      
      console.log(`✅ Auto-generated ${insertedCount} absent records and ${presentCount} present records`);
    } catch (error) {
      console.error('❌ Auto absent cron error:', error);
    }
  });
};



export const runLeaveAllocationRollover = async (targetYear?: number, targetMonth?: number) => {
  const today = new Date();
  const currentMonth = targetMonth || (today.getMonth() + 1); // 1-12
  const currentYear = targetYear || today.getFullYear();

  // Determine previous month/year
  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = currentYear - 1;
  }

  const activeEmployees = await prisma.user.findMany({
    where: {
      role: { notIn: ['superadmin', 'student', 'center_admin'] },
      status: 'active'
    },
    include: { employeeProfileDetail: true }
  });

  // Batch query allocations for previous month and current month
  const [prevAllocations, currentAllocations] = await Promise.all([
    prisma.leaveAllocation.findMany({
      where: { year: prevYear, month: prevMonth }
    }),
    prisma.leaveAllocation.findMany({
      where: { year: currentYear, month: currentMonth }
    })
  ]);

  const prevAllocMap = new Map(prevAllocations.map(a => [a.userId, a]));
  const currentAllocSet = new Set(currentAllocations.map(a => a.userId));

  const toCreate: Array<{
    userId: string;
    organizationId: string;
    year: number;
    month: number;
    sickLeave: number;
    casualLeave: number;
    earnedLeave: number;
    complementaryLeave: number;
    wfh: number;
  }> = [];

  for (const emp of activeEmployees) {
    if (!emp.organizationId) continue;

    // Skip future joiners
    if (emp.employeeProfileDetail?.joinDate) {
      const joinDate = new Date(emp.employeeProfileDetail.joinDate);
      if (joinDate > today) {
        continue;
      }
    }

    // Skip if current month allocation already exists (preserve HR customizations)
    if (currentAllocSet.has(emp.id)) {
      continue;
    }

    // Only rollover if previous month allocation exists
    const prevAlloc = prevAllocMap.get(emp.id);
    if (!prevAlloc) {
      continue;
    }

    toCreate.push({
      userId: emp.id,
      organizationId: emp.organizationId,
      year: currentYear,
      month: currentMonth,
      sickLeave: prevAlloc.sickLeave,
      casualLeave: prevAlloc.casualLeave,
      earnedLeave: prevAlloc.earnedLeave,
      complementaryLeave: prevAlloc.complementaryLeave,
      wfh: prevAlloc.wfh
    });
  }

  if (toCreate.length > 0) {
    await prisma.leaveAllocation.createMany({
      data: toCreate,
      skipDuplicates: true
    });
  }

  return {
    year: currentYear,
    month: currentMonth,
    prevYear,
    prevMonth,
    allocatedCount: toCreate.length
  };
};

const startLeaveAllocationCron = () => {
  // Run at 00:01 on the 1st of every month to rollover leaves to the new month
  cron.schedule('1 0 1 * *', async () => {
    console.log('🔄 Running monthly leave allocation rollover cron...');
    try {
      const result = await runLeaveAllocationRollover();
      console.log(`✅ Rolled over monthly leaves for ${result.allocatedCount} employees (Month ${result.month}/${result.year} from Month ${result.prevMonth}/${result.prevYear})`);
    } catch (error) {
      console.error('❌ Monthly leave allocation rollover error:', error);
    }
  });
};
