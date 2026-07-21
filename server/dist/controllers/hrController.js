import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
// --- Leave Requests ---
export const getLeaveRequests = asyncHandler(async (req, res) => {
    const { role, id: userId, organizationId, departmentId, branchId } = req.user;
    // Enforce visibility scoping
    const where = { organizationId };
    const DEPT_MANAGER_ROLES = ['ops_admin', 'finance_admin', 'sales_admin', 'center_admin', 'ops_sub_admin'];
    const isHR = role === 'hr_admin';
    const isGlobalAdmin = ['superadmin', 'org_admin', 'ceo'].includes(role);
    if (isGlobalAdmin || isHR) {
        // Global admins and HR see all leaves
    }
    else if (DEPT_MANAGER_ROLES.includes(role)) {
        // Department managers see leaves in their department plus their own leaves
        where.OR = [
            { employeeId: userId },
            { departmentId: departmentId || '' }
        ];
    }
    else if (branchId) {
        // Branch managers see leaves of employees in their branch plus their own leaves
        where.OR = [
            { employeeId: userId },
            { user: { branchId } }
        ];
    }
    else {
        // Standard employees only see their own leaves
        where.employeeId = userId;
    }
    if (req.query.status) {
        if (req.query.status === 'pending' && (isHR || isGlobalAdmin)) {
            where.status = { in: ['pending', 'dept_approved'] };
        }
        else {
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
export const getLeaveRequest = asyncHandler(async (req, res) => {
    const leave = await prisma.leaveRequest.findFirst({
        where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    if (!leave) {
        res.status(404).json({ success: false, message: 'Leave request not found' });
        return;
    }
    res.json({ success: true, data: leave });
});
export const createLeaveRequest = asyncHandler(async (req, res) => {
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
export const updateLeaveRequest = asyncHandler(async (req, res) => {
    const exists = await prisma.leaveRequest.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Leave request not found' });
        return;
    }
    const { startDate, endDate, leaveType, reason, status, remarks } = req.body;
    const updateData = {};
    if (startDate)
        updateData.startDate = new Date(startDate);
    if (endDate)
        updateData.endDate = new Date(endDate);
    if (leaveType !== undefined)
        updateData.leaveType = leaveType;
    if (reason !== undefined)
        updateData.reason = reason;
    if (status !== undefined)
        updateData.status = status;
    if (remarks !== undefined)
        updateData.remarks = remarks;
    const leave = await prisma.leaveRequest.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: leave });
});
export const deleteLeaveRequest = asyncHandler(async (req, res) => {
    const exists = await prisma.leaveRequest.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Leave request not found' });
        return;
    }
    await prisma.leaveRequest.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
export const deptApproveLeave = asyncHandler(async (req, res) => {
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
export const hrApproveLeave = asyncHandler(async (req, res) => {
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
export const getLeaveStats = asyncHandler(async (req, res) => {
    res.json({ success: true, data: {} });
});
export const getMyLeaves = asyncHandler(async (req, res) => {
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
export const getVacancies = asyncHandler(async (req, res) => {
    const vacancies = await prisma.vacancy.findMany({ where: { organizationId: req.user.organizationId } });
    res.json({ success: true, data: vacancies });
});
export const getVacancy = asyncHandler(async (req, res) => {
    const vacancy = await prisma.vacancy.findFirst({
        where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    if (!vacancy) {
        res.status(404).json({ success: false, message: 'Vacancy not found' });
        return;
    }
    res.json({ success: true, data: vacancy });
});
export const createVacancy = asyncHandler(async (req, res) => {
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
export const updateVacancy = asyncHandler(async (req, res) => {
    const exists = await prisma.vacancy.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Vacancy not found' });
        return;
    }
    const { designation, departmentId, count, status } = req.body;
    const updateData = {};
    if (designation !== undefined)
        updateData.designation = designation;
    if (departmentId !== undefined)
        updateData.departmentId = departmentId;
    if (count !== undefined)
        updateData.count = Number(count);
    if (status !== undefined)
        updateData.status = status;
    const vacancy = await prisma.vacancy.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: vacancy });
});
export const deleteVacancy = asyncHandler(async (req, res) => {
    const exists = await prisma.vacancy.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Vacancy not found' });
        return;
    }
    await prisma.vacancy.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
export const closeVacancy = asyncHandler(async (req, res) => {
    const exists = await prisma.vacancy.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Vacancy not found' });
        return;
    }
    const vacancy = await prisma.vacancy.update({ where: { id: req.params.id }, data: { status: 'closed' } });
    res.json({ success: true, data: vacancy });
});
export const validateVacancyForHiring = asyncHandler(async (req, res) => {
    res.json({ success: true, valid: true });
});
export const fillVacancyPosition = asyncHandler(async (req, res) => {
    res.json({ success: true, data: {} });
});
export const getVacancyStats = asyncHandler(async (req, res) => {
    res.json({ success: true, data: {} });
});
// --- Complaints ---
export const getComplaints = asyncHandler(async (req, res) => {
    const complaints = await prisma.complaint.findMany({ where: { organizationId: req.user.organizationId } });
    res.json({ success: true, data: complaints });
});
export const getComplaint = asyncHandler(async (req, res) => {
    const complaint = await prisma.complaint.findFirst({
        where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    if (!complaint) {
        res.status(404).json({ success: false, message: 'Complaint not found' });
        return;
    }
    res.json({ success: true, data: complaint });
});
export const createComplaint = asyncHandler(async (req, res) => {
    const complaint = await prisma.complaint.create({
        data: { ...req.body, organizationId: req.user.organizationId, userId: req.user.id }
    });
    res.status(201).json({ success: true, data: complaint });
});
export const updateComplaint = asyncHandler(async (req, res) => {
    const exists = await prisma.complaint.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Complaint not found' });
        return;
    }
    const { title, description, category, priority, status } = req.body;
    const updateData = {};
    if (title !== undefined)
        updateData.title = title;
    if (description !== undefined)
        updateData.description = description;
    if (category !== undefined)
        updateData.category = category;
    if (priority !== undefined)
        updateData.priority = priority;
    if (status !== undefined)
        updateData.status = status;
    const complaint = await prisma.complaint.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: complaint });
});
export const deleteComplaint = asyncHandler(async (req, res) => {
    const exists = await prisma.complaint.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Complaint not found' });
        return;
    }
    await prisma.complaint.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
export const resolveComplaint = asyncHandler(async (req, res) => {
    const exists = await prisma.complaint.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Complaint not found' });
        return;
    }
    const complaint = await prisma.complaint.update({ where: { id: req.params.id }, data: { status: 'resolved' } });
    res.json({ success: true, data: complaint });
});
// --- Holidays ---
export const getHolidays = asyncHandler(async (req, res) => {
    const holidays = await prisma.holiday.findMany({ where: { organizationId: req.user.organizationId } });
    res.json({ success: true, data: holidays });
});
export const getHoliday = asyncHandler(async (req, res) => {
    const holiday = await prisma.holiday.findFirst({
        where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    if (!holiday) {
        res.status(404).json({ success: false, message: 'Holiday not found' });
        return;
    }
    res.json({ success: true, data: holiday });
});
export const createHoliday = asyncHandler(async (req, res) => {
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
export const updateHoliday = asyncHandler(async (req, res) => {
    const exists = await prisma.holiday.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Holiday not found' });
        return;
    }
    const { date, name, description, type, status } = req.body;
    const updateData = {};
    if (date !== undefined)
        updateData.date = new Date(date);
    if (name !== undefined)
        updateData.name = name;
    if (description !== undefined)
        updateData.description = description;
    if (type !== undefined)
        updateData.type = type;
    if (status !== undefined)
        updateData.status = status;
    const holiday = await prisma.holiday.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: holiday });
});
export const deleteHoliday = asyncHandler(async (req, res) => {
    const exists = await prisma.holiday.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Holiday not found' });
        return;
    }
    await prisma.holiday.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
// --- Announcements ---
export const getAnnouncements = asyncHandler(async (req, res) => {
    const announcements = await prisma.announcement.findMany({ where: { organizationId: req.user.organizationId } });
    res.json({ success: true, data: announcements });
});
export const createAnnouncement = asyncHandler(async (req, res) => {
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
export const updateAnnouncement = asyncHandler(async (req, res) => {
    const { expiresAt, ...rest } = req.body;
    const updateData = { ...rest };
    if (expiresAt)
        updateData.expiresAt = new Date(expiresAt);
    const announcement = await prisma.announcement.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: announcement });
});
export const deleteAnnouncement = asyncHandler(async (req, res) => {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
//# sourceMappingURL=hrController.js.map