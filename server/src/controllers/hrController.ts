import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { sendPushNotification } from '../services/notification.service.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// --- Leave Requests ---
export const getLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { role, id: userId, organizationId, departmentId, branchId } = req.user;

  // Enforce visibility scoping
  const where: any = { organizationId };

  const DEPT_MANAGER_ROLES = ['ops_admin', 'finance_admin', 'finance_sub_admin', 'sales_admin', 'sales_sub_admin', 'center_admin', 'ops_sub_admin'];
  const isHR = ['hr_admin', 'hr_sub_admin'].includes(role);
  const isGlobalAdmin = ['superadmin', 'org_admin', 'ceo', 'general_manager'].includes(role);

  if (isGlobalAdmin) {
    // Global admins see all leaves
  } else if (isHR) {
    // HR admins see all leaves except center_admin
    where.user = { role: { not: 'center_admin' } };
  } else if (DEPT_MANAGER_ROLES.includes(role)) {
    // Department managers see leaves in their department plus their own leaves
    where.OR = [
      { employeeId: userId },
      { departmentId: departmentId || '' }
    ];
  } else if (branchId) {
    // Branch managers see leaves of employees in their branch plus their own leaves
    where.OR = [
      { employeeId: userId },
      { user: { branchId } }
    ];
  } else {
    // Standard employees only see their own leaves
    where.employeeId = userId;
  }

  if (req.query.status) {
    if (req.query.status === 'pending' && (isHR || isGlobalAdmin)) {
      where.status = { in: ['pending', 'dept_approved'] };
    } else {
      where.status = req.query.status;
    }
  }

  const leaves = await prisma.leaveRequest.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, designation: true } },
      department: { select: { name: true } },
      deptApprover: { select: { name: true } },
      hrApprover: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: leaves.length, data: leaves });
});

export const getMyLeaveBalance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month } = req.query;
  
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth() + 1;

  if (month && typeof month === 'string') {
    const parts = month.split('-');
    if (parts.length === 2) {
      currentYear = parseInt(parts[0], 10);
      currentMonth = parseInt(parts[1], 10);
    }
  }

  const allocation = await prisma.leaveAllocation.findFirst({
    where: { userId: req.user.id, year: currentYear }
  });

  const defaultBalance = {
    sick: { yearlyLimit: 0, accrued: 0, used: 0, available: 0, carryForward: 0 },
    casual: { yearlyLimit: 0, accrued: 0, used: 0, available: 0, carryForward: 0 },
    earned: { yearlyLimit: 0, accrued: 0, used: 0, available: 0, carryForward: 0 },
    unpaid: { taken: 0 }
  };

  if (!allocation) {
    return res.json({ success: true, data: defaultBalance });
  }

  // 1. Sick Leave
  const sickMonthlyAccrual = allocation.sickLeave / 12;
  const usedSickThisMonthRaw = await prisma.leaveRequest.findMany({
    where: {
      employeeId: req.user.id, type: 'sick',
      status: { in: ['approved', 'dept_approved'] },
      startDate: { gte: new Date(currentYear, currentMonth - 1, 1), lt: new Date(currentYear, currentMonth, 1) }
    }
  });
  const usedSickThisMonth = usedSickThisMonthRaw.reduce((acc, l: any) => acc + (l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1), 0);

  // 2. Casual Leave (3 month lookback)
  const casualMonthlyAccrual = allocation.casualLeave / 12;
  const usedCasualRecentRaw = await prisma.leaveRequest.findMany({
    where: {
      employeeId: req.user.id, type: 'casual',
      status: { in: ['approved', 'dept_approved'] },
      startDate: { gte: new Date(currentYear, currentMonth - 3, 1), lt: new Date(currentYear, currentMonth, 1) }
    }
  });
  const usedCasualRecent = usedCasualRecentRaw.reduce((acc, l: any) => acc + (l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1), 0);
  const availableCasual = Math.max(0, (casualMonthlyAccrual * 3) - usedCasualRecent);
  const carryForwardCasual = Math.max(0, availableCasual - casualMonthlyAccrual);

  // 3. Earned Leave (YTD)
  const earnedMonthlyAccrual = allocation.earnedLeave / 12;
  const accruedEarned = earnedMonthlyAccrual * currentMonth;
  const usedEarnedRaw = await prisma.leaveRequest.findMany({
    where: {
      employeeId: req.user.id, type: 'earned',
      status: { in: ['approved', 'dept_approved'] },
      startDate: { gte: new Date(currentYear, 0, 1), lt: new Date(currentYear + 1, 0, 1) }
    }
  });
  const usedEarned = usedEarnedRaw.reduce((acc, l: any) => acc + (l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1), 0);

  // 4. Unpaid Leave
  const unpaidRaw = await prisma.leaveRequest.findMany({
    where: {
      employeeId: req.user.id, type: 'unpaid',
      status: { in: ['approved', 'dept_approved'] },
      startDate: { gte: new Date(currentYear, 0, 1), lt: new Date(currentYear + 1, 0, 1) }
    }
  });
  const unpaidTaken = unpaidRaw.reduce((acc, l: any) => acc + (l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1), 0);

  const balance = {
    sick: {
      yearlyLimit: allocation.sickLeave,
      accrued: sickMonthlyAccrual,
      used: usedSickThisMonth,
      available: Math.max(0, sickMonthlyAccrual - usedSickThisMonth),
      carryForward: 0
    },
    casual: {
      yearlyLimit: allocation.casualLeave,
      accrued: casualMonthlyAccrual,
      used: usedCasualRecent,
      available: availableCasual,
      carryForward: carryForwardCasual
    },
    earned: {
      yearlyLimit: allocation.earnedLeave,
      accrued: accruedEarned,
      used: usedEarned,
      available: Math.max(0, accruedEarned - usedEarned),
      carryForward: 0
    },
    unpaid: { taken: unpaidTaken }
  };

  res.json({ success: true, data: balance });
});

export const getLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leave = await prisma.leaveRequest.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId }
  });
  if (!leave) {
    res.status(404).json({ success: false, message: 'Leave request not found' });
    return;
  }
  res.json({ success: true, data: leave });
});

export const createLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, departmentId, isHalfDay, halfDayType, type, ...rest } = req.body;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const requestedDays = isHalfDay ? 0.5 : (end.getTime() - start.getTime()) / 86400000 + 1;
  const currentYear = start.getFullYear();
  const currentMonth = start.getMonth() + 1;

  let finalType = type;

  if (type === 'sick' || type === 'casual') {
    const allocation = await prisma.leaveAllocation.findFirst({
      where: { userId: req.user.id, year: currentYear }
    });

    if (!allocation) {
      finalType = 'unpaid';
    } else {
      if (type === 'sick') {
        const monthlyAccrual = allocation.sickLeave / 12;
        const usedSickThisMonth = await prisma.leaveRequest.findMany({
          where: {
            employeeId: req.user.id,
            type: 'sick',
            status: { in: ['approved', 'dept_approved', 'pending'] },
            startDate: { gte: new Date(currentYear, currentMonth - 1, 1), lt: new Date(currentYear, currentMonth, 1) }
          }
        });
        
        const usedDays = usedSickThisMonth.reduce((acc: number, l: any) => acc + (l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1), 0);

        if (requestedDays > (monthlyAccrual - usedDays)) {
          finalType = 'unpaid';
        }
      } else if (type === 'casual') {
        const monthlyAccrual = allocation.casualLeave / 12;
        const lookbackStart = new Date(currentYear, currentMonth - 3, 1);
        
        const usedCasualRecent = await prisma.leaveRequest.findMany({
          where: {
            employeeId: req.user.id,
            type: 'casual',
            status: { in: ['approved', 'dept_approved', 'pending'] },
            startDate: { gte: lookbackStart, lt: new Date(currentYear, currentMonth, 1) }
          }
        });
        
        const usedDays = usedCasualRecent.reduce((acc: number, l: any) => acc + (l.isHalfDay ? 0.5 : (l.endDate.getTime() - l.startDate.getTime()) / 86400000 + 1), 0);
        const availableBalance = (monthlyAccrual * 3) - usedDays;
        
        if (requestedDays > availableBalance) {
          finalType = 'unpaid';
        }
      }
    }
  }

  const leave = await prisma.leaveRequest.create({
    data: { 
      ...rest,
      type: finalType,
      isHalfDay: isHalfDay || false,
      halfDayType: halfDayType || null,
      startDate: start,
      endDate: end,
      employeeId: req.user.id, 
      organizationId: req.user.organizationId,
      departmentId: departmentId || req.user.departmentId || ''
    }
  });

  try {
    const me = await prisma.user.findUnique({ where: { id: req.user.id } });
    let notifyUserId = me?.reportingTo;
    
    if (!notifyUserId && (departmentId || me?.departmentId)) {
      const deptId = departmentId || me?.departmentId;
      if (deptId) {
        const dept = await prisma.department.findUnique({ where: { id: deptId } });
        notifyUserId = dept?.managerId;
      }
    }

    if (notifyUserId) {
      sendPushNotification(notifyUserId, "New Leave Request", `${me?.name || 'An employee'} has requested leave`, { type: 'leave_request', leaveId: leave.id }).catch(console.error);
    } else {
      const hrAdmins = await prisma.user.findMany({
        where: { role: 'hr_admin', organizationId: req.user.organizationId }
      });
      hrAdmins.forEach(hr => {
        sendPushNotification(hr.id, "New Leave Request", `${me?.name || 'An employee'} has requested leave`, { type: 'leave_request', leaveId: leave.id }).catch(console.error);
      });
    }
  } catch (err) {
    console.error("Failed to send notification:", err);
  }

  res.status(201).json({ success: true, data: leave });
});

export const updateLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.leaveRequest.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Leave request not found' });
    return;
  }
  const { startDate, endDate, leaveType, reason, status, remarks, isHalfDay, halfDayType } = req.body;
  const updateData: any = {};
  if (startDate) updateData.startDate = new Date(startDate);
  if (endDate) updateData.endDate = new Date(endDate);
  if (leaveType !== undefined) updateData.type = leaveType;
  if (reason !== undefined) updateData.reason = reason;
  if (status !== undefined) updateData.status = status;
  if (remarks !== undefined) updateData.remarks = remarks;
  if (isHalfDay !== undefined) updateData.isHalfDay = isHalfDay;
  if (halfDayType !== undefined) updateData.halfDayType = halfDayType;
  const leave = await prisma.leaveRequest.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: leave });
});

export const deleteLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.leaveRequest.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Leave request not found' });
    return;
  }
  await prisma.leaveRequest.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const deptApproveLeave = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { action, remarks } = req.body;
  const leave = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: { 
      status: action === 'approve' ? 'dept_approved' : 'rejected', 
      deptAdminRemarks: remarks,
      deptApprovedBy: req.user.id
    }
  });

  try {
    const employee = await prisma.user.findUnique({ where: { id: leave.employeeId }});
    const statusText = action === 'approve' ? 'approved by your department' : 'rejected by your department';
    if (employee) {
      sendPushNotification(employee.id, "Leave Request Update", `Your leave request was ${statusText}.`, { type: 'leave_request', leaveId: leave.id }).catch(console.error);
    }
    
    if (action === 'approve' && employee) {
      const hrAdmins = await prisma.user.findMany({
        where: { role: 'hr_admin', organizationId: employee.organizationId }
      });
      hrAdmins.forEach(hr => {
        sendPushNotification(hr.id, "Pending HR Approval", `Department approved leave for ${employee.name}. Pending final HR approval.`, { type: 'leave_request', leaveId: leave.id }).catch(console.error);
      });
    }
  } catch (err) {
    console.error(err);
  }

  res.json({ success: true, data: leave });
});

export const hrApproveLeave = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { action, remarks } = req.body;
  const leave = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: { 
      status: action === 'approve' ? 'approved' : 'rejected', 
      hrRemarks: remarks,
      hrApprovedBy: req.user.id
    }
  });

  try {
    const employee = await prisma.user.findUnique({ where: { id: leave.employeeId }});
    const statusText = action === 'approve' ? 'fully approved by HR' : 'rejected by HR';
    if (employee) {
      sendPushNotification(employee.id, "Leave Request Update", `Your leave request was ${statusText}.`, { type: 'leave_request', leaveId: leave.id }).catch(console.error);
    }
  } catch (err) {
    console.error(err);
  }

  if (action === 'approve') {
    // Generate attendance records for the leave duration
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    const statusToSet = leave.isHalfDay ? 'half_day' : 'leave';

    // Loop through each day (inclusive)
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateOnly = new Date(d);
      dateOnly.setHours(0, 0, 0, 0);

      // Check if an attendance record exists for this employee on this date
      const existing = await prisma.attendance.findFirst({
        where: {
          employeeId: leave.employeeId,
          date: dateOnly
        }
      });

      if (existing) {
        // Update existing record
        await prisma.attendance.update({
          where: { id: existing.id },
          data: { status: statusToSet as any }
        });
      } else {
        // Create new record
        await prisma.attendance.create({
          data: {
            employeeId: leave.employeeId,
            organizationId: leave.organizationId,
            date: dateOnly,
            status: statusToSet as any,
            notes: `Leave Approved: ${leave.reason}`
          }
        });
      }
    }
  }

  res.json({ success: true, data: leave });
});

export const getLeaveStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const [pending, approved, rejected, deptApproved, total] = await Promise.all([
    prisma.leaveRequest.count({ where: { organizationId: orgId, status: 'pending' } }),
    prisma.leaveRequest.count({ where: { organizationId: orgId, status: 'approved' } }),
    prisma.leaveRequest.count({ where: { organizationId: orgId, status: 'rejected' } }),
    prisma.leaveRequest.count({ where: { organizationId: orgId, status: 'dept_approved' } }),
    prisma.leaveRequest.count({ where: { organizationId: orgId } }),
  ]);
  res.json({ success: true, data: { pending, approved, rejected, deptApproved, total } });
});

export const getMyLeaves = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leaves = await prisma.leaveRequest.findMany({
    where: { employeeId: req.user.id },
    include: {
      user: { select: { name: true, email: true, designation: true } },
      department: { select: { name: true } },
      deptApprover: { select: { name: true } },
      hrApprover: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: leaves });
});

// --- Vacancies ---
export const getVacancies = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancies = await prisma.vacancy.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: vacancies });
});
export const getVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancy = await prisma.vacancy.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId }
  });
  if (!vacancy) {
    res.status(404).json({ success: false, message: 'Vacancy not found' });
    return;
  }
  res.json({ success: true, data: vacancy });
});
export const createVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { designation, departmentId, count, status } = req.body;
  const vacancy = await prisma.vacancy.create({ 
    data: { 
      designation,
      departmentId,
      count: count ? Number(count) : 1,
      status: status || 'open',
      organizationId: req.user.organizationId 
    } 
  });
  res.status(201).json({ success: true, data: vacancy });
});
export const updateVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.vacancy.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) { res.status(404).json({ success: false, message: 'Vacancy not found' }); return; }
  
  const { designation, departmentId, count, status } = req.body;
  const updateData: any = {};
  if (designation !== undefined) updateData.designation = designation;
  if (departmentId !== undefined) updateData.departmentId = departmentId;
  if (count !== undefined) updateData.count = Number(count);
  if (status !== undefined) updateData.status = status;
  
  const vacancy = await prisma.vacancy.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: vacancy });
});
export const deleteVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.vacancy.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) { res.status(404).json({ success: false, message: 'Vacancy not found' }); return; }
  await prisma.vacancy.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const closeVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.vacancy.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) { res.status(404).json({ success: false, message: 'Vacancy not found' }); return; }
  const vacancy = await prisma.vacancy.update({ where: { id: req.params.id }, data: { status: 'closed' } });
  res.json({ success: true, data: vacancy });
});
export const validateVacancyForHiring = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { departmentId, designation } = req.body;
  const vacancy = await prisma.vacancy.findFirst({
    where: { organizationId: req.user.organizationId, departmentId, designation, status: 'open' }
  });
  res.json({ success: true, valid: !!vacancy, data: vacancy });
});
export const fillVacancyPosition = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancy = await prisma.vacancy.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId }
  });
  if (!vacancy || vacancy.status !== 'open') {
    res.status(400);
    throw new Error('Invalid or already filled vacancy');
  }
  const updated = await prisma.vacancy.update({
    where: { id: vacancy.id },
    data: { status: 'filled' }
  });
  res.json({ success: true, data: updated });
});
export const getVacancyStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const [open, closed, filled, total] = await Promise.all([
    prisma.vacancy.count({ where: { organizationId: orgId, status: 'open' } }),
    prisma.vacancy.count({ where: { organizationId: orgId, status: 'closed' } }),
    prisma.vacancy.count({ where: { organizationId: orgId, status: 'filled' } }),
    prisma.vacancy.count({ where: { organizationId: orgId } }),
  ]);
  res.json({ success: true, data: { open, closed, filled, total } });
});

// --- Complaints ---
export const getComplaints = asyncHandler(async (req: AuthRequest, res: Response) => {
  const complaints = await prisma.complaint.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: complaints });
});
export const getComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId }
  });
  if (!complaint) { res.status(404).json({ success: false, message: 'Complaint not found' }); return; }
  res.json({ success: true, data: complaint });
});
export const createComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const complaint = await prisma.complaint.create({
    data: { ...req.body, organizationId: req.user.organizationId, userId: req.user.id }
  });
  res.status(201).json({ success: true, data: complaint });
});
export const updateComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.complaint.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) { res.status(404).json({ success: false, message: 'Complaint not found' }); return; }
  const { title, description, category, priority, status } = req.body;
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (category !== undefined) updateData.category = category;
  if (priority !== undefined) updateData.priority = priority;
  if (status !== undefined) updateData.status = status;
  
  const complaint = await prisma.complaint.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: complaint });
});
export const deleteComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.complaint.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) { res.status(404).json({ success: false, message: 'Complaint not found' }); return; }
  await prisma.complaint.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const resolveComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.complaint.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) { res.status(404).json({ success: false, message: 'Complaint not found' }); return; }
  const complaint = await prisma.complaint.update({ where: { id: req.params.id }, data: { status: 'resolved' } });
  res.json({ success: true, data: complaint });
});

// --- Holidays ---
export const getHolidays = asyncHandler(async (req: AuthRequest, res: Response) => {
  const holidays = await prisma.holiday.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: holidays });
});
export const getHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const holiday = await prisma.holiday.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId }
  });
  if (!holiday) { res.status(404).json({ success: false, message: 'Holiday not found' }); return; }
  res.json({ success: true, data: holiday });
});
export const createHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { date, ...rest } = req.body;
  const holiday = await prisma.holiday.create({ 
    data: { 
      ...rest, 
      date: new Date(date),
      organizationId: req.user.organizationId 
    } 
  });
  res.status(201).json({ success: true, data: holiday });
});
export const updateHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.holiday.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) { res.status(404).json({ success: false, message: 'Holiday not found' }); return; }
  const { date, name, description, type, status } = req.body;
  const updateData: any = {};
  if (date !== undefined) updateData.date = new Date(date);
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (type !== undefined) updateData.type = type;
  if (status !== undefined) updateData.status = status;

  const holiday = await prisma.holiday.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: holiday });
});
export const deleteHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.holiday.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) { res.status(404).json({ success: false, message: 'Holiday not found' }); return; }
  await prisma.holiday.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

// --- Announcements ---
export const getAnnouncements = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcements = await prisma.announcement.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: announcements });
});
export const createAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { expiresAt, ...rest } = req.body;
  const announcement = await prisma.announcement.create({
    data: { 
      ...rest, 
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      organizationId: req.user.organizationId, 
      postedBy: req.user.id 
    }
  });
  res.status(201).json({ success: true, data: announcement });
});
export const updateAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { expiresAt, ...rest } = req.body;
  const updateData: any = { ...rest };
  if (expiresAt) updateData.expiresAt = new Date(expiresAt);

  const announcement = await prisma.announcement.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: announcement });
});
export const deleteAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.announcement.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
