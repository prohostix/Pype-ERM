import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// --- Leave Requests ---
export const getLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { role, id: userId, organizationId, departmentId, branchId } = req.user;

  // Enforce visibility scoping
  const where: any = { organizationId };

  const DEPT_MANAGER_ROLES = ['ops_admin', 'finance_admin', 'sales_admin', 'center_admin', 'ops_sub_admin'];
  const isHR = role === 'hr_admin';
  const isGlobalAdmin = ['superadmin', 'org_admin', 'ceo'].includes(role);

  if (isGlobalAdmin || isHR) {
    // Global admins and HR see all leaves
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
  const { startDate, endDate, departmentId, ...rest } = req.body;
  const leave = await prisma.leaveRequest.create({
    data: { 
      ...rest,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      employeeId: req.user.id, 
      organizationId: req.user.organizationId,
      departmentId: departmentId || req.user.departmentId || ''
    }
  });
  res.status(201).json({ success: true, data: leave });
});

export const updateLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.leaveRequest.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Leave request not found' });
    return;
  }
  const { startDate, endDate, leaveType, reason, status, remarks } = req.body;
  const updateData: any = {};
  if (startDate) updateData.startDate = new Date(startDate);
  if (endDate) updateData.endDate = new Date(endDate);
  if (leaveType !== undefined) updateData.leaveType = leaveType;
  if (reason !== undefined) updateData.reason = reason;
  if (status !== undefined) updateData.status = status;
  if (remarks !== undefined) updateData.remarks = remarks;
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
  res.json({ success: true, valid: true });
});
export const fillVacancyPosition = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
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
