import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
// Leads
export const getLeads = asyncHandler(async (req, res) => {
    const leads = await prisma.lead.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, count: leads.length, data: leads });
});
export const getLead = asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    if (!lead) {
        res.status(404).json({ success: false, message: 'Lead not found' });
        return;
    }
    res.json({ success: true, data: lead });
});
export const createLead = asyncHandler(async (req, res) => {
    const { centerName, contactName, email, phone, address, source, status, notes } = req.body;
    const lead = await prisma.lead.create({
        data: {
            centerName, contactName, email, phone, address, source, status, notes,
            organizationId: req.user.organizationId
        }
    });
    res.status(201).json({ success: true, data: lead });
});
export const updateLead = asyncHandler(async (req, res) => {
    const exists = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Lead not found' });
        return;
    }
    const { centerName, contactName, email, phone, address, source, status, notes } = req.body;
    const updateData = {};
    if (centerName !== undefined)
        updateData.centerName = centerName;
    if (contactName !== undefined)
        updateData.contactName = contactName;
    if (email !== undefined)
        updateData.email = email;
    if (phone !== undefined)
        updateData.phone = phone;
    if (address !== undefined)
        updateData.address = address;
    if (source !== undefined)
        updateData.source = source;
    if (status !== undefined)
        updateData.status = status;
    if (notes !== undefined)
        updateData.notes = notes;
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: lead });
});
export const deleteLead = asyncHandler(async (req, res) => {
    const exists = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Lead not found' });
        return;
    }
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
export const convertLead = asyncHandler(async (req, res) => {
    const exists = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Lead not found' });
        return;
    }
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data: { status: 'converted', convertedAt: new Date() } });
    res.json({ success: true, data: lead });
});
import { handleTargetRollup, syncParentTargets } from '../utils/targetUtils.js';
// Targets
export const getTargets = asyncHandler(async (req, res) => {
    const { role, id: userId, organizationId, departmentId } = req.user;
    const canManage = ['superadmin', 'org_admin', 'ceo', 'sales_admin', 'finance_admin'].includes(role);
    const whereClause = { organizationId };
    if (!canManage) {
        whereClause.OR = [
            { employeeId: userId },
            { departmentId: departmentId || '' }
        ];
    }
    const targets = await prisma.target.findMany({
        where: whereClause,
        include: { employee: true, department: true }
    });
    res.json({ success: true, count: targets.length, data: targets });
});
export const getTarget = asyncHandler(async (req, res) => {
    const target = await prisma.target.findFirst({
        where: { id: req.params.id, organizationId: req.user.organizationId },
        include: { employee: true, department: true }
    });
    if (!target) {
        res.status(404).json({ success: false, message: 'Target not found' });
        return;
    }
    res.json({ success: true, data: target });
});
export const createTarget = asyncHandler(async (req, res) => {
    const target = await prisma.target.create({ data: { ...req.body, organizationId: req.user.organizationId } });
    await handleTargetRollup(target.id, req.user.organizationId);
    await syncParentTargets(req.user.organizationId);
    res.status(201).json({ success: true, data: target });
});
export const updateTarget = asyncHandler(async (req, res) => {
    const exists = await prisma.target.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Target not found' });
        return;
    }
    const { title, targetAmount, period, employeeId, departmentId } = req.body;
    const updateData = {};
    if (title !== undefined)
        updateData.title = title;
    if (targetAmount !== undefined)
        updateData.targetAmount = Number(targetAmount);
    if (period !== undefined)
        updateData.period = period;
    if (employeeId !== undefined)
        updateData.employeeId = employeeId;
    if (departmentId !== undefined)
        updateData.departmentId = departmentId;
    const target = await prisma.target.update({ where: { id: req.params.id }, data: updateData });
    await handleTargetRollup(target.id, req.user.organizationId);
    await syncParentTargets(req.user.organizationId);
    res.json({ success: true, data: target });
});
export const deleteTarget = asyncHandler(async (req, res) => {
    const exists = await prisma.target.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Target not found' });
        return;
    }
    await prisma.target.delete({ where: { id: req.params.id } });
    await syncParentTargets(req.user.organizationId);
    res.json({ success: true, data: {} });
});
// Invites
export const listMyInvites = asyncHandler(async (req, res) => {
    const invites = await prisma.studyCenterInvite.findMany({ where: { referredBy: req.user.id } });
    res.json({ success: true, count: invites.length, data: invites });
});
export const generateInvite = asyncHandler(async (req, res) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const invite = await prisma.studyCenterInvite.create({
        data: {
            ...req.body,
            organizationId: req.user.organizationId,
            referredBy: req.user.id,
            token: Math.random().toString(36).substring(7).toUpperCase(),
            expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : expiresAt
        }
    });
    res.status(201).json({ success: true, data: invite });
});
export const regenerateInvite = asyncHandler(async (req, res) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const invite = await prisma.studyCenterInvite.update({
        where: { id: req.params.id },
        data: {
            token: Math.random().toString(36).substring(7).toUpperCase(),
            status: 'pending',
            expiresAt
        }
    });
    res.json({ success: true, data: invite });
});
// Performance
export const getTeamPerformance = asyncHandler(async (req, res) => {
    let whereClause = { organizationId: req.user.organizationId };
    if (['superadmin', 'org_admin', 'ceo'].includes(req.user.role)) {
        // See all users
    }
    else if (req.user.role === 'center_admin') {
        whereClause.OR = [];
        if (req.user.branchId)
            whereClause.OR.push({ branchId: req.user.branchId });
        if (req.user.studyCenterId)
            whereClause.OR.push({ studyCenterId: req.user.studyCenterId });
        if (whereClause.OR.length === 0)
            delete whereClause.OR;
    }
    else {
        whereClause.OR = [
            { reportingTo: req.user.id },
            { id: req.user.id }
        ];
        if (req.user.departmentId) {
            whereClause.OR.push({ departmentId: req.user.departmentId });
        }
    }
    // Exclude resigned from team performance
    whereClause.status = { not: 'resigned' };
    const teammates = await prisma.user.findMany({
        where: whereClause,
        select: {
            id: true,
            name: true,
            designation: true,
            status: true,
        }
    });
    const performanceData = await Promise.all(teammates.map(async (member) => {
        const enrollmentsCount = await prisma.student.count({
            where: {
                OR: [
                    { referredBy: member.id },
                    { enrolledBy: member.id }
                ]
            }
        });
        const payments = await prisma.paymentEntry.aggregate({
            _sum: { amount: true },
            where: {
                invoice: {
                    student: {
                        OR: [
                            { referredBy: member.id },
                            { enrolledBy: member.id }
                        ]
                    }
                }
            }
        });
        const revenue = payments._sum.amount || 0;
        const targets = await prisma.target.findMany({ where: { employeeId: member.id } });
        const targetTotal = targets.reduce((acc, t) => acc + t.target, 0);
        const targetProgress = targetTotal > 0 ? Math.round((enrollmentsCount / targetTotal) * 100) : 0;
        const score = Math.min(100, targetProgress) || 0;
        return {
            id: member.id,
            name: member.name,
            designation: member.designation || 'Team Member',
            status: member.status,
            enrollments: enrollmentsCount,
            revenue,
            targetCount: targets.length,
            targetTotal,
            targetProgress,
            score
        };
    }));
    performanceData.sort((a, b) => b.score - a.score);
    res.json({ success: true, data: performanceData });
});
// Study Centers
export const getMyCenters = asyncHandler(async (req, res) => {
    const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId } });
    res.json({ success: true, data: centers });
});
export const getMyCenterAdmissions = asyncHandler(async (req, res) => {
    res.json({ success: true, data: [] });
});
export const getMyCenterDetail = asyncHandler(async (req, res) => {
    const center = await prisma.studyCenter.findUnique({ where: { id: req.params.centerId } });
    res.json({ success: true, data: center });
});
// Programs
export const getProgramsByUniversity = asyncHandler(async (req, res) => {
    const uniId = req.query.universityId;
    const uniIdsStr = req.query.universityIds;
    let whereClause = {};
    if (uniIdsStr) {
        const ids = uniIdsStr.split(',').filter(Boolean);
        whereClause.universityId = { in: ids };
    }
    else if (uniId) {
        whereClause.universityId = uniId;
    }
    // Filter by organization if program model has it
    if (req.user?.organizationId) {
        whereClause.organizationId = req.user.organizationId;
    }
    const programs = await prisma.program.findMany({
        where: whereClause,
        orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: programs });
});
//# sourceMappingURL=salesController.js.map