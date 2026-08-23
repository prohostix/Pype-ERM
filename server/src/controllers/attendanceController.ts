import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import fs from 'fs';
import path from 'path';

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // metres
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

export const punchIn = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user.organizationId) {
    res.status(400).json({ success: false, message: 'Punch-in is only available for tenant organization employees.' });
    return;
  }

  if (req.user.allowSystemPunchIn === false) {
    res.status(403).json({ success: false, message: 'System punch-in is disabled. Please use the biometric device.' });
    return;
  }

  const { latitude, longitude, address, photo } = req.body;

  let checkInPhoto: string | undefined;
  if (req.user.requireSelfiePunchIn) {
    if (!photo) {
      res.status(400).json({ success: false, message: 'Selfie photo is required for punch-in.' });
      return;
    }
    try {
      const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
      const fileName = `selfie-in-${req.user.id}-${Date.now()}.jpg`;
      const uploadPath = process.env.UPLOAD_PATH || './uploads';
      if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
      fs.writeFileSync(path.join(uploadPath, fileName), base64Data, 'base64');
      checkInPhoto = `/api/v1/uploads/${fileName}`;
    } catch (err) {
      console.error('Failed to save selfie:', err);
      res.status(500).json({ success: false, message: 'Failed to process selfie photo.' });
      return;
    }
  }

  // Retrieve HR Settings
  const settings = await prisma.hRSettings.findFirst({
    where: { organizationId: req.user.organizationId }
  });

  // 1. Geofencing location check (if required by settings)
  if (settings && settings.requireLocation && !req.user.allowAnywherePunchIn) {
    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ success: false, message: 'Location coordinates are required to check in.' });
      return;
    }

    let isWithinGeofence = false;
    let allowedRadiusMsg = '';

    // Check default office location
    const defaultLoc = settings.location as any;
    if (defaultLoc && defaultLoc.officeLatitude && defaultLoc.officeLongitude) {
      const distance = getDistanceInMeters(latitude, longitude, defaultLoc.officeLatitude, defaultLoc.officeLongitude);
      const radius = defaultLoc.allowedRadius || 100;
      if (distance <= radius) {
        isWithinGeofence = true;
      } else {
        allowedRadiusMsg = `Default location: ${distance.toFixed(0)}m away (max ${radius}m allowed).`;
      }
    }

    // Check other office locations
    const locationsList = settings.locations as any[];
    if (!isWithinGeofence && Array.isArray(locationsList)) {
      for (const loc of locationsList) {
        if (loc.latitude && loc.longitude) {
          const distance = getDistanceInMeters(latitude, longitude, loc.latitude, loc.longitude);
          const radius = loc.allowedRadius || 100;
          if (distance <= radius) {
            isWithinGeofence = true;
            break;
          }
        }
      }
    }

    if (!isWithinGeofence) {
      res.status(400).json({
        success: false,
        message: `Check-in denied: You are outside the allowed office geofences. ${allowedRadiusMsg}`
      });
      return;
    }
  }

  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Check if already checked in today (using 24h range check)
  const existing = await prisma.attendance.findFirst({
    where: {
      employeeId: req.user.id,
      date: {
        gte: todayStart,
        lte: todayEnd
      }
    }
  });

  if (existing) {
    res.status(400).json({ success: false, message: 'You have already checked in today.' });
    return;
  }

  const today = todayStart; // Save exact normalized midnight date to respect unique constraint


  // 2. Late calculation
  let isLate = false;
  let lateMinutes = 0;
  let status: 'present' | 'late' = 'present';

  if (settings && settings.officeHours) {
    const officeHours = settings.officeHours as any;
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = weekdays[now.getDay()];

    // Find if there is a day override for today
    const overrides = officeHours.dayOverrides || [];
    const dayOverride = overrides.find((o: any) => o.day === currentDayName);

    const checkInTarget = dayOverride?.checkInTime || officeHours.checkInTime || '09:00';
    const gracePeriod = officeHours.graceMinutes !== undefined ? officeHours.graceMinutes : 15;

    // Parse shift target check-in time
    const [targetHour, targetMin] = checkInTarget.split(':').map(Number);
    const targetCheckInDate = new Date(now);
    targetCheckInDate.setHours(targetHour, targetMin, 0, 0);

    // Calculate time difference
    const diffMs = now.getTime() - targetCheckInDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins > gracePeriod) {
      isLate = true;
      lateMinutes = diffMins;
      status = 'late';
    }
  }

  const attendance = await prisma.attendance.create({
    data: {
      employeeId: req.user.id,
      organizationId: req.user.organizationId,
      date: today,
      checkIn: now,
      checkInLocation: latitude ? { latitude, longitude, address } : undefined,
      checkInPhoto,
      status,
      isLate,
      lateMinutes
    }
  });

  res.status(201).json({
    success: true,
    message: isLate ? `Punched in successfully! (Late by ${lateMinutes} mins)` : 'Punched in successfully!',
    data: attendance
  });
});

export const punchOut = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user.organizationId) {
    res.status(400).json({ success: false, message: 'Punch-out is only available for tenant organization employees.' });
    return;
  }

  if (req.user.allowSystemPunchIn === false) {
    res.status(403).json({ success: false, message: 'System punch-in is disabled. Please use the biometric device.' });
    return;
  }

  const { latitude, longitude, address, photo } = req.body;

  // Retrieve HR Settings
  const settings = await prisma.hRSettings.findFirst({
    where: { organizationId: req.user.organizationId }
  });

  // 1. Geofencing location check (if required by settings)
  if (settings && settings.requireLocation && !req.user.allowAnywherePunchIn) {
    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ success: false, message: 'Location coordinates are required to check out.' });
      return;
    }

    let isWithinGeofence = false;
    let allowedRadiusMsg = '';

    // Check default office location
    const defaultLoc = settings.location as any;
    if (defaultLoc && defaultLoc.officeLatitude && defaultLoc.officeLongitude) {
      const distance = getDistanceInMeters(latitude, longitude, defaultLoc.officeLatitude, defaultLoc.officeLongitude);
      const radius = defaultLoc.allowedRadius || 100;
      if (distance <= radius) {
        isWithinGeofence = true;
      } else {
        allowedRadiusMsg = `Default location: ${distance.toFixed(0)}m away (max ${radius}m allowed).`;
      }
    }

    // Check other office locations
    const locationsList = settings.locations as any[];
    if (!isWithinGeofence && Array.isArray(locationsList)) {
      for (const loc of locationsList) {
        if (loc.latitude && loc.longitude) {
          const distance = getDistanceInMeters(latitude, longitude, loc.latitude, loc.longitude);
          const radius = loc.allowedRadius || 100;
          if (distance <= radius) {
            isWithinGeofence = true;
            break;
          }
        }
      }
    }

    if (!isWithinGeofence) {
      res.status(400).json({
        success: false,
        message: 'You are outside the permitted punch-out area.',
        distanceInfo: allowedRadiusMsg
      });
      return;
    }
  }

  let checkOutPhoto: string | undefined;
  if (req.user.requireSelfiePunchIn) {
    if (!photo) {
      res.status(400).json({ success: false, message: 'Selfie photo is required for punch-out.' });
      return;
    }
    try {
      const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
      const fileName = `selfie-out-${req.user.id}-${Date.now()}.jpg`;
      const uploadPath = process.env.UPLOAD_PATH || './uploads';
      if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
      fs.writeFileSync(path.join(uploadPath, fileName), base64Data, 'base64');
      checkOutPhoto = `/api/v1/uploads/${fileName}`;
    } catch (err) {
      console.error('Failed to save selfie:', err);
      res.status(500).json({ success: false, message: 'Failed to process selfie photo.' });
      return;
    }
  }
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Retrieve today's check-in record
  const attendanceRecord = await prisma.attendance.findFirst({
    where: {
      employeeId: req.user.id,
      date: {
        gte: todayStart,
        lte: todayEnd
      }
    }
  });

  if (!attendanceRecord) {
    res.status(400).json({ success: false, message: 'You must check in first before checking out.' });
    return;
  }

  if (attendanceRecord.checkOut) {
    res.status(400).json({ success: false, message: 'You have already checked out today.' });
    return;
  }

  // Calculate working hours
  const checkInTime = new Date(attendanceRecord.checkIn!).getTime();
  const workingHours = Number(((now.getTime() - checkInTime) / 3600000).toFixed(2));

  const attendance = await prisma.attendance.update({
    where: { id: attendanceRecord.id },
    data: {
      checkOut: now,
      checkOutLocation: latitude ? { latitude, longitude, address } : undefined,
      checkOutPhoto,
      workingHours
    }
  });

  res.json({
    success: true,
    message: `Punched out successfully! Total duration: ${workingHours} hrs.`,
    data: attendance
  });
});

export const getTodayAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user.organizationId) {
    res.json({ success: true, data: null });
    return;
  }
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const attendance = await prisma.attendance.findFirst({
    where: {
      employeeId: req.user.id,
      date: {
        gte: todayStart,
        lte: todayEnd
      }
    }
  });
  res.json({ success: true, data: attendance });
});

export const getMonthlyLateSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});

export const getAttendances = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  
  const userFilters: any = { role: { not: 'staff' } };

  if (['superadmin', 'org_admin', 'ceo', 'hr_admin'].includes(req.user.role)) {
    // See all users
  } else if (req.user.role === 'center_admin') {
    userFilters.OR = [];
    if (req.user.branchId) userFilters.OR.push({ branchId: req.user.branchId });
    if (req.user.studyCenterId) userFilters.OR.push({ studyCenterId: req.user.studyCenterId });
    if (userFilters.OR.length === 0) delete userFilters.OR;
  } else {
    userFilters.OR = [
      { reportingTo: req.user.id },
      { id: req.user.id }
    ];
    if (req.user.departmentId) {
      userFilters.OR.push({ departmentId: req.user.departmentId });
    }
  }

  where.user = userFilters;
  
  let isDateFiltered = false;
  let targetDate = new Date();
  
  // Date filter
  if (req.query.date) {
    isDateFiltered = true;
    const dateStr = req.query.date as string;
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
    targetDate = start;
  }
  
  // Status filter
  let requestedStatus = req.query.status as string;
  if (requestedStatus && requestedStatus !== 'absent' && requestedStatus !== 'all') {
    where.status = requestedStatus;
  } else if (requestedStatus === 'all') {
    // do not apply status filter
  } else if (requestedStatus === 'absent') {
    // we'll filter them later
  }

  const attendances = await prisma.attendance.findMany({ where, include: { user: true }, orderBy: { date: 'desc' } });

  let finalAttendances: any[] = [...attendances];

  if (isDateFiltered && (!requestedStatus || requestedStatus === 'absent' || requestedStatus === 'all')) {
    const orgQuery: any = { organizationId: req.user.organizationId, NOT: { role: { in: ['ceo', 'org_admin', 'superadmin', 'staff'] } } };
    if (where.user?.branchId) orgQuery.branchId = where.user.branchId;
    
    const allEmployees = await prisma.user.findMany({ where: orgQuery });
    
    let presentEmployeeIds = new Set(attendances.map(a => a.employeeId));
    if (requestedStatus === 'absent' || requestedStatus === 'all') {
       const allAttendancesForDate = await prisma.attendance.findMany({ 
         where: { organizationId: where.organizationId, date: where.date, ...(where.user ? { user: where.user } : {}) }
       });
       presentEmployeeIds = new Set(allAttendancesForDate.map(a => a.employeeId));
    }

    const absentEmployees = allEmployees.filter(emp => !presentEmployeeIds.has(emp.id));
    
    const mockAbsentRecords: any[] = absentEmployees.map(emp => ({
      id: `absent-${emp.id}-${targetDate.getTime()}`,
      employeeId: emp.id,
      organizationId: emp.organizationId,
      branchId: emp.branchId,
      date: targetDate,
      status: 'absent',
      checkIn: null,
      checkOut: null,
      checkInLocation: null,
      checkOutLocation: null,
      isLate: false,
      lateMinutes: 0,
      workingHours: 0,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: emp
    }));

    if (requestedStatus === 'absent') {
      finalAttendances = mockAbsentRecords;
    } else {
      finalAttendances = [...finalAttendances, ...mockAbsentRecords];
    }
    
    // re-sort by date and then by name if date is same
    finalAttendances.sort((a, b) => {
      const d1 = new Date(a.date).getTime();
      const d2 = new Date(b.date).getTime();
      if (d1 !== d2) return d2 - d1;
      const nameA = a.user?.name || '';
      const nameB = b.user?.name || '';
      return nameA.localeCompare(nameB);
    });
  }

  res.json({ success: true, count: finalAttendances.length, data: finalAttendances });
});

export const getAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await prisma.attendance.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!attendance || attendance.organizationId !== req.user.organizationId) {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
    return;
  }
  res.json({ success: true, data: attendance });
});

export const getAttendanceById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await prisma.attendance.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!attendance) {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
    return;
  }
  res.json({ success: true, data: attendance });
});

export const createAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId || req.body.organizationId;
  if (!orgId) {
    res.status(400).json({ success: false, message: 'Organization ID is required.' });
    return;
  }
  const attendance = await prisma.attendance.create({ data: { ...req.body, organizationId: orgId } });
  res.status(201).json({ success: true, data: attendance });
});
export const markAttendance = createAttendance;

export const updateAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await prisma.attendance.findUnique({ where: { id: req.params.id } });
  if (!attendance || attendance.organizationId !== req.user.organizationId) {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
    return;
  }
  const { checkIn, checkOut, status, isLate, lateMinutes, workingHours, remarks } = req.body;
  const updateData: any = {};
  if (checkIn !== undefined) updateData.checkIn = new Date(checkIn);
  if (checkOut !== undefined) updateData.checkOut = new Date(checkOut);
  if (status !== undefined) updateData.status = status;
  if (isLate !== undefined) updateData.isLate = isLate;
  if (lateMinutes !== undefined) updateData.lateMinutes = Number(lateMinutes);
  if (workingHours !== undefined) updateData.workingHours = Number(workingHours);
  if (remarks !== undefined) updateData.remarks = remarks;
  const updatedAttendance = await prisma.attendance.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: updatedAttendance });
});

export const deleteAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await prisma.attendance.findUnique({ where: { id: req.params.id } });
  if (!attendance) {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
    return;
  }
  await prisma.attendance.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const getHRSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId || (req.query.organizationId as string);
  if (!orgId) {
    res.status(400).json({ success: false, message: 'Organization ID is required.' });
    return;
  }
  const settings = await prisma.hRSettings.findFirst({ where: { organizationId: orgId } });
  const responseData = settings ? {
    ...settings,
    requireLocationForCheckIn: settings.requireLocation
  } : null;
  res.json({ success: true, data: responseData });
});

export const createOrUpdateHRSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId || req.body.organizationId;
  if (!orgId) {
    res.status(400).json({ success: false, message: 'Organization ID is required.' });
    return;
  }
  const { requireLocationForCheckIn, ...rest } = req.body;
  const updateData: any = { ...rest };
  if (requireLocationForCheckIn !== undefined) {
    updateData.requireLocation = requireLocationForCheckIn;
  }
  const settings = await prisma.hRSettings.upsert({
    where: { organizationId: orgId },
    update: updateData,
    create: { ...updateData, organizationId: orgId }
  });
  const responseData = settings ? {
    ...settings,
    requireLocationForCheckIn: settings.requireLocation
  } : null;
  res.json({ success: true, data: responseData });
});

export const biometricSync = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Biometric sync triggered' });
});

export const getActivityReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  
  const userFilters: any = { 
    role: { not: 'staff' },
    organizationId: req.user.organizationId
  };

  if (['superadmin', 'org_admin', 'ceo', 'hr_admin'].includes(req.user.role)) {
    // See all users
  } else if (req.user.role === 'center_admin') {
    userFilters.OR = [];
    if (req.user.branchId) userFilters.OR.push({ branchId: req.user.branchId });
    if (req.user.studyCenterId) userFilters.OR.push({ studyCenterId: req.user.studyCenterId });
    if (userFilters.OR.length === 0) delete userFilters.OR;
  } else {
    userFilters.OR = [
      { reportingTo: req.user.id },
      { id: req.user.id }
    ];
    if (req.user.departmentId) {
      userFilters.OR.push({ departmentId: req.user.departmentId });
    }
  }

  where.user = userFilters;
  
  let targetDate = new Date();
  if (req.query.date) {
    targetDate = new Date(req.query.date as string);
  }
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);
  
  const users = await prisma.user.findMany({
    where: userFilters,
    include: {
      department: true,
      attendances: {
        where: { date: { gte: start, lte: end } }
      },
      assignedTasks: {
        where: { createdAt: { gte: start, lte: end } }
      }
    }
  });

  const data = users.map(user => {
    const attendance = user.attendances[0] || null;
    const tasks = user.assignedTasks || [];
    
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.designation,
      department: user.department?.name || 'Unassigned',
      departmentId: user.departmentId,
      attendance: attendance ? {
        status: attendance.status,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        isLate: attendance.isLate,
        lateMinutes: attendance.lateMinutes,
        workingHours: attendance.workingHours
      } : null,
      productiveHours: attendance?.workingHours || 0,
      scheduledHours: 8,
      timeWasted: 0,
      breakMinutes: 60,
      erpActions: 0,
      ermActivity: {},
      tasks: {
        total: tasks.length,
        completedToday: tasks.filter((t: any) => t.status === 'completed').length,
        inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
        overdue: tasks.filter((t: any) => t.status === 'overdue').length,
        list: tasks
      }
    };
  });

  const departmentsMap: Record<string, any> = {};
  data.forEach(emp => {
    const dId = emp.departmentId || 'unassigned';
    if (!departmentsMap[dId]) {
      departmentsMap[dId] = {
        departmentId: dId,
        name: emp.department,
        totalEmployees: 0,
        present: 0,
        absent: 0,
        late: 0,
        avgProductiveHours: 0,
        totalErmActions: 0,
        totalTasksCompleted: 0
      };
    }
    const d = departmentsMap[dId];
    d.totalEmployees++;
    if (emp.attendance?.status === 'present') d.present++;
    if (emp.attendance?.status === 'absent') d.absent++;
    if (emp.attendance?.status === 'late') d.late++;
    d.totalTasksCompleted += emp.tasks.completedToday;
    d.avgProductiveHours += emp.productiveHours;
  });

  Object.values(departmentsMap).forEach(d => {
    if (d.totalEmployees > 0) d.avgProductiveHours /= d.totalEmployees;
  });

  res.json({ 
    success: true, 
    data, 
    departments: Object.values(departmentsMap),
    scheduledHours: 8,
    breakMinutes: 60
  });
});

export const getMyAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user.organizationId) {
    res.json({ success: true, data: [] });
    return;
  }
  const attendances = await prisma.attendance.findMany({ where: { employeeId: req.user.id }, orderBy: { date: 'desc' } });
  res.json({ success: true, data: attendances });
});

export const getMyAttendanceSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
