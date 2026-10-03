const fs = require('fs');
const file = '/Users/apple/Documents/ProHostix/Pype-ERM/server/src/controllers/attendanceController.ts';
let code = fs.readFileSync(file, 'utf8');

const helper = `
async function calculateLateMinutes(
  checkInDate: Date,
  employeeId: string,
  organizationId: string,
  officeHours: any
): Promise<{ isLate: boolean; lateMinutes: number }> {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const istCheckIn = new Date(checkInDate.getTime() + (330 * 60000));
  const currentDayName = weekdays[istCheckIn.getUTCDay()];

  const overrides = officeHours.dayOverrides || [];
  const dayOverride = overrides.find((o: any) => o.day === currentDayName);

  const checkInTarget = dayOverride?.checkInTime || officeHours.checkInTime || '09:00';
  const checkOutTarget = dayOverride?.checkOutTime || officeHours.checkOutTime || '18:00';
  const gracePeriod = officeHours.graceMinutes !== undefined ? officeHours.graceMinutes : 15;

  const punchHour = istCheckIn.getUTCHours();
  const punchMin = istCheckIn.getUTCMinutes();
  const punchTotalMins = punchHour * 60 + punchMin;

  const [targetHour, targetMin] = checkInTarget.split(':').map(Number);
  let targetTotalMins = targetHour * 60 + targetMin;

  const [outTargetHour, outTargetMin] = checkOutTarget.split(':').map(Number);
  const outTargetTotalMins = outTargetHour * 60 + outTargetMin;

  const startOfDay = new Date(checkInDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(checkInDate);
  endOfDay.setHours(23, 59, 59, 999);

  const firstHalfLeave = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      status: 'approved',
      isHalfDay: true,
      halfDayType: 'first_half',
      startDate: { lte: endOfDay },
      endDate: { gte: startOfDay }
    }
  });

  if (firstHalfLeave) {
    targetTotalMins = targetTotalMins + Math.floor((outTargetTotalMins - targetTotalMins) / 2);
  }

  const diffMins = punchTotalMins - targetTotalMins;

  if (diffMins > gracePeriod) {
    return { isLate: true, lateMinutes: diffMins };
  }
  return { isLate: false, lateMinutes: 0 };
}
`;

if (!code.includes('calculateLateMinutes(')) {
  code = code.replace('export const punchIn', helper + '\nexport const punchIn');
}

// punchIn replace
const punchInTarget = `  if (settings && settings.officeHours) {
    const officeHours = settings.officeHours as any;
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const istNow = new Date(now.getTime() + (330 * 60000));
    const currentDayName = weekdays[istNow.getUTCDay()];

    // Find if there is a day override for today
    const overrides = officeHours.dayOverrides || [];
    const dayOverride = overrides.find((o: any) => o.day === currentDayName);

    const checkInTarget = dayOverride?.checkInTime || officeHours.checkInTime || '09:00';
    const gracePeriod = officeHours.graceMinutes !== undefined ? officeHours.graceMinutes : 15;

    // Convert UTC Date to IST to safely extract local hours/minutes
    const punchHour = istNow.getUTCHours();
    const punchMin = istNow.getUTCMinutes();
    const punchTotalMins = punchHour * 60 + punchMin;
    
    // Parse shift target check-in time
    const [targetHour, targetMin] = checkInTarget.split(':').map(Number);
    const targetTotalMins = targetHour * 60 + targetMin;

    // Calculate time difference in minutes directly
    const diffMins = punchTotalMins - targetTotalMins;

    if (diffMins > gracePeriod) {
      isLate = true;
      lateMinutes = diffMins;
      status = 'late';
    }
  }`;

const punchInReplace = `  if (settings && settings.officeHours) {
    const lateCalc = await calculateLateMinutes(now, req.user.id, req.user.organizationId, settings.officeHours);
    isLate = lateCalc.isLate;
    lateMinutes = lateCalc.lateMinutes;
    if (isLate) status = 'late';
  }`;

code = code.replace(punchInTarget, punchInReplace);

// createAttendance replace
const createAttTarget = `    if (settings && settings.officeHours) {
      const officeHours = settings.officeHours as any;
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const checkInDate = new Date(data.checkIn);
      const istCheckIn = new Date(checkInDate.getTime() + (330 * 60000));
      const currentDayName = weekdays[istCheckIn.getUTCDay()];

      const overrides = officeHours.dayOverrides || [];
      const dayOverride = overrides.find((o: any) => o.day === currentDayName);

      const checkInTarget = dayOverride?.checkInTime || officeHours.checkInTime || '09:00';
      const gracePeriod = officeHours.graceMinutes !== undefined ? officeHours.graceMinutes : 15;

      const punchHour = istCheckIn.getUTCHours();
      const punchMin = istCheckIn.getUTCMinutes();
      const punchTotalMins = punchHour * 60 + punchMin;

      const [targetHour, targetMin] = checkInTarget.split(':').map(Number);
      const targetTotalMins = targetHour * 60 + targetMin;

      const diffMins = punchTotalMins - targetTotalMins;

      if (diffMins > gracePeriod) {
        data.isLate = true;
        data.lateMinutes = diffMins;
        if (!data.status || data.status === 'present') {
          data.status = 'late';
        }
      } else {
        data.isLate = false;
        data.lateMinutes = 0;
        if (data.status === 'late') data.status = 'present';
      }
    }`;

const createAttReplace = `    if (settings && settings.officeHours) {
      const lateCalc = await calculateLateMinutes(new Date(data.checkIn), data.employeeId, orgId, settings.officeHours);
      data.isLate = lateCalc.isLate;
      data.lateMinutes = lateCalc.lateMinutes;
      if (data.isLate) {
        if (!data.status || data.status === 'present') data.status = 'late';
      } else {
        if (data.status === 'late') data.status = 'present';
      }
    }`;

code = code.replace(createAttTarget, createAttReplace);

// updateAttendance replace
const updateAttTarget = `    if (settings && settings.officeHours) {
      const officeHours = settings.officeHours as any;
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const checkInDate = updateData.checkIn;
      const istCheckIn = new Date(checkInDate.getTime() + (330 * 60000));
      const currentDayName = weekdays[istCheckIn.getUTCDay()];

      const overrides = officeHours.dayOverrides || [];
      const dayOverride = overrides.find((o: any) => o.day === currentDayName);

      const checkInTarget = dayOverride?.checkInTime || officeHours.checkInTime || '09:00';
      const gracePeriod = officeHours.graceMinutes !== undefined ? officeHours.graceMinutes : 15;

      const punchHour = istCheckIn.getUTCHours();
      const punchMin = istCheckIn.getUTCMinutes();
      const punchTotalMins = punchHour * 60 + punchMin;

      const [targetHour, targetMin] = checkInTarget.split(':').map(Number);
      const targetTotalMins = targetHour * 60 + targetMin;

      const diffMins = punchTotalMins - targetTotalMins;

      if (diffMins > gracePeriod) {
        updateData.isLate = true;
        updateData.lateMinutes = diffMins;
        if (!updateData.status || updateData.status === 'present') {
          updateData.status = 'late';
        }
      } else {
        updateData.isLate = false;
        updateData.lateMinutes = 0;
        if (updateData.status === 'late') updateData.status = 'present';
      }
    }`;

const updateAttReplace = `    if (settings && settings.officeHours) {
      const lateCalc = await calculateLateMinutes(updateData.checkIn, attendance.employeeId, attendance.organizationId, settings.officeHours);
      updateData.isLate = lateCalc.isLate;
      updateData.lateMinutes = lateCalc.lateMinutes;
      if (updateData.isLate) {
        if (!updateData.status || updateData.status === 'present') updateData.status = 'late';
      } else {
        if (updateData.status === 'late') updateData.status = 'present';
      }
    }`;

code = code.replace(updateAttTarget, updateAttReplace);

// syncOfflinePunches replace
const syncTarget = `      if (type === 'in' && settings && settings.officeHours) {
        const officeHours = settings.officeHours as any;
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const istNow = new Date(punchTime.getTime() + (330 * 60000));
        const currentDayName = weekdays[istNow.getUTCDay()];

        const overrides = officeHours.dayOverrides || [];
        const dayOverride = overrides.find((o: any) => o.day === currentDayName);

        const checkInTarget = dayOverride?.checkInTime || officeHours.checkInTime || '09:00';
        const gracePeriod = officeHours.graceMinutes !== undefined ? officeHours.graceMinutes : 15;

        const punchHour = istNow.getUTCHours();
        const punchMin = istNow.getUTCMinutes();
        const punchTotalMins = punchHour * 60 + punchMin;
        
        const [targetHour, targetMin] = checkInTarget.split(':').map(Number);
        const targetTotalMins = targetHour * 60 + targetMin;

        const diffMins = punchTotalMins - targetTotalMins;
        if (diffMins > gracePeriod) {
          isLate = true;
          lateMinutes = diffMins;
          status = 'late';
        }
      }`;

const syncReplace = `      if (type === 'in' && settings && settings.officeHours) {
        const lateCalc = await calculateLateMinutes(punchTime, req.user.id, req.user.organizationId, settings.officeHours);
        isLate = lateCalc.isLate;
        lateMinutes = lateCalc.lateMinutes;
        if (isLate) status = 'late';
      }`;

code = code.replace(syncTarget, syncReplace);

fs.writeFileSync(file, code);
console.log('done');
