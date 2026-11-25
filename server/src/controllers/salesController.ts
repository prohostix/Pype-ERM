import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Leads
export const getLeads = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leads = await prisma.lead.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, count: leads.length, data: leads });
});
export const getLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lead = await prisma.lead.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId }
  });
  if (!lead) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }
  res.json({ success: true, data: lead });
});
export const createLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { centerName, contactName, email, phone, address, source, status, notes } = req.body;
  const lead = await prisma.lead.create({
    data: {
      centerName, contactName, email, phone, address, source, status, notes,
      organizationId: req.user.organizationId
    }
  });
  res.status(201).json({ success: true, data: lead });
});
export const updateLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }
  const { centerName, contactName, email, phone, address, source, status, notes } = req.body;
  const updateData: any = {};
  if (centerName !== undefined) updateData.centerName = centerName;
  if (contactName !== undefined) updateData.contactName = contactName;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (address !== undefined) updateData.address = address;
  if (source !== undefined) updateData.source = source;
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;
  
  const lead = await prisma.lead.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: lead });
});
export const deleteLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }
  await prisma.lead.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const convertLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }
  const lead = await prisma.lead.update({ where: { id: req.params.id }, data: { status: 'converted', convertedAt: new Date() } });
  res.json({ success: true, data: lead });
});

import { handleTargetRollup, syncParentTargets } from '../utils/targetUtils.js';
import { partnerBranchWhere, targetBranchWhere, userInReach, refuseOwnRecord, type PageRequest } from '../access/pageGuard.js';
import { withoutPortalLogins } from '../access/partnerSecrets.js';
import { isEntryUser, salesPersonWhere } from '../access/salesEntry.js';
import { can } from '../access/resolve.js';

// Targets
export const getTargets = asyncHandler(async (req: PageRequest, res: Response) => {
  const { role, id: userId, organizationId, departmentId } = req.user;
  const canManage = ['superadmin', 'org_admin', 'ceo', 'general_manager', 'sales_admin', 'sales_sub_admin', 'finance_admin', 'finance_sub_admin'].includes(role);
  
  const whereClause: any = { organizationId };
  if (req.ownBranchOnly) {
    Object.assign(whereClause, targetBranchWhere(req.user.branchId));
  } else if (!canManage) {
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
export const getTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
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
export const createTarget = asyncHandler(async (req: PageRequest, res: Response) => {
  const { branchId: _branchId, ...fields } = req.body;
  if ((fields.employeeId && !(await userInReach(req, fields.employeeId))) || (req.ownBranchOnly && req.user.branchId && !fields.employeeId)) {
    res.status(404).json({ success: false, message: 'Choose a person you can set targets for' });
    return;
  }
  if (refuseOwnRecord(req, res, fields.employeeId, 'target')) return;
  const target = await prisma.target.create({ data: { ...fields, organizationId: req.user.organizationId } });
  await handleTargetRollup(target.id, req.user.organizationId);
  await syncParentTargets(req.user.organizationId);
  res.status(201).json({ success: true, data: target });
});
export const updateTarget = asyncHandler(async (req: PageRequest, res: Response) => {
  const exists = await prisma.target.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }
  if (refuseOwnRecord(req, res, exists.employeeId, 'target')) return;
  const { title, targetAmount, period, employeeId, departmentId } = req.body;
  if (employeeId && !(await userInReach(req, employeeId))) {
    res.status(404).json({ success: false, message: 'That person was not found' });
    return;
  }
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (targetAmount !== undefined) updateData.targetAmount = Number(targetAmount);
  if (period !== undefined) updateData.period = period;
  if (employeeId !== undefined) updateData.employeeId = employeeId;
  if (departmentId !== undefined) updateData.departmentId = departmentId;
  const target = await prisma.target.update({ where: { id: req.params.id }, data: updateData });
  await handleTargetRollup(target.id, req.user.organizationId);
  await syncParentTargets(req.user.organizationId);
  res.json({ success: true, data: target });
});
export const deleteTarget = asyncHandler(async (req: PageRequest, res: Response) => {
  const exists = await prisma.target.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }
  if (refuseOwnRecord(req, res, exists.employeeId, 'target')) return;
  await prisma.target.delete({ where: { id: req.params.id } });
  await syncParentTargets(req.user.organizationId);
  res.json({ success: true, data: {} });
});

// Invites
/** The sales employees someone doing data entry may choose from. */
export const getSalesPeople = asyncHandler(async (req: PageRequest, res: Response) => {
  if (!isEntryUser(req.user) && !(req.access && can(req.access, 'sales_entry_enroll', 'view'))) {
    res.status(403).json({ success: false, message: 'You do not have permission to do this' });
    return;
  }
  const search = String(req.query.search || '').trim();
  const people = await prisma.user.findMany({
    where: {
      ...salesPersonWhere(req.user.organizationId, req.user.branchId),
      ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }),
    },
    select: { id: true, name: true, email: true, designation: true, role: true, status: true, branch: { select: { name: true } } },
    orderBy: { name: 'asc' },
    take: 200,
  });
  res.json({ success: true, count: people.length, data: people });
});

const REJECTED = ['rejected', 'ops_rejected', 'provisional_finance_rejected'];
const groupWhere = (group: string): any =>
  group === 'enrolled' ? { status: 'enrolled' }
  : group === 'rejected' ? { status: { in: REJECTED } }
  : group === 'pending' ? { status: { notIn: ['enrolled', ...REJECTED] } }
  : {};

/** Totals for a data-entry user's overview: what they entered, what is waiting, and for whom. */
export const getEntryOverview = asyncHandler(async (req: PageRequest, res: Response) => {
  if (!isEntryUser(req.user) && !(req.access && can(req.access, 'sales_entry_enroll', 'view'))) {
    res.status(403).json({ success: false, message: 'You do not have permission to do this' });
    return;
  }
  const base = { organizationId: req.user.organizationId, enteredBy: req.user.id };
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const [total, enrolled, rejected, today, pendingLinks, byEmployee] = await Promise.all([
    prisma.enrollment.count({ where: base }),
    prisma.enrollment.count({ where: { ...base, ...groupWhere('enrolled') } }),
    prisma.enrollment.count({ where: { ...base, ...groupWhere('rejected') } }),
    prisma.enrollment.count({ where: { ...base, createdAt: { gte: startOfToday } } }),
    prisma.studyCenterInvite.count({ where: { organizationId: req.user.organizationId, createdById: req.user.id, status: 'pending', expiresAt: { gt: new Date() } } }),
    prisma.enrollment.groupBy({ by: ['salesUserId', 'status'], where: base, _count: { _all: true } }),
  ]);
  const people = new Map<string, { id: string; name: string; total: number; pending: number; rejected: number; enrolled: number }>();
  const ids = [...new Set(byEmployee.map((r) => r.salesUserId).filter(Boolean) as string[])];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  for (const u of users) people.set(u.id, { id: u.id, name: u.name, total: 0, pending: 0, rejected: 0, enrolled: 0 });
  for (const r of byEmployee) {
    const p = r.salesUserId && people.get(r.salesUserId);
    if (!p) continue;
    const n = r._count._all;
    p.total += n;
    if (r.status === 'enrolled') p.enrolled += n; else if (REJECTED.includes(r.status)) p.rejected += n; else p.pending += n;
  }
  res.json({
    success: true,
    data: {
      total, enrolled, rejected, today, pendingLinks,
      pending: total - enrolled - rejected,
      employees: [...people.values()].sort((a, b) => b.pending + b.rejected - (a.pending + a.rejected) || b.total - a.total),
    },
  });
});

/** The applications a data-entry user entered, newest first, whichever sales employee they were for. */
export const getMyEntries = asyncHandler(async (req: PageRequest, res: Response) => {
  if (!isEntryUser(req.user) && !(req.access && can(req.access, 'sales_entry_enroll', 'view'))) {
    res.status(403).json({ success: false, message: 'You do not have permission to do this' });
    return;
  }
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));
  const search = String(req.query.search || '').trim();
  const where: any = {
    organizationId: req.user.organizationId,
    enteredBy: req.user.id,
    ...groupWhere(String(req.query.group || '')),
    ...(String(req.query.salesUserId || '') && { salesUserId: String(req.query.salesUserId) }),
    ...(search && {
      OR: [
        { studentName: { contains: search, mode: 'insensitive' } },
        { studentPhone: { contains: search } },
        { studentEmail: { contains: search, mode: 'insensitive' } },
        { salesUser: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };
  const [total, rows] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where,
      select: {
        id: true, studentName: true, studentPhone: true, status: true, isProvisional: true, createdAt: true,
        program: { select: { name: true } },
        salesUser: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  res.json({ success: true, data: rows, total, page, limit });
});

/** The links a data-entry user generated, newest first, with what became of each. */
export const getMyEntryLinks = asyncHandler(async (req: PageRequest, res: Response) => {
  if (!isEntryUser(req.user) && !(req.access && can(req.access, 'sales_entry_enroll', 'view'))) {
    res.status(403).json({ success: false, message: 'You do not have permission to do this' });
    return;
  }
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));
  const search = String(req.query.search || '').trim();
  const state = String(req.query.state || '');
  const now = new Date();
  const where: any = {
    organizationId: req.user.organizationId,
    createdById: req.user.id,
    ...(state === 'used' && { status: 'used' }),
    ...(state === 'pending' && { status: 'pending', expiresAt: { gt: now } }),
    ...(state === 'expired' && { status: { not: 'used' }, expiresAt: { lte: now } }),
    ...(search && { referrer: { name: { contains: search, mode: 'insensitive' } } }),
  };
  const [total, rows] = await Promise.all([
    prisma.studyCenterInvite.count({ where }),
    prisma.studyCenterInvite.findMany({
      where,
      select: {
        id: true, token: true, status: true, expiresAt: true, usedAt: true, createdAt: true,
        programIds: true, referrer: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  res.json({ success: true, data: rows.map(({ programIds, ...r }) => ({ ...r, programCount: programIds.length })), total, page, limit });
});

export const listMyInvites = asyncHandler(async (req: PageRequest, res: Response) => {
  const where: any = {};
  if (['org_admin', 'superadmin', 'ceo', 'general_manager'].includes(req.user.role)) {
    where.organizationId = req.user.organizationId;
  } else {
    where.referredBy = req.user.id;
  }
  // Data-entry staff see the links they made, whoever the employee is
  if (isEntryUser(req.user)) {
    delete where.referredBy;
    where.organizationId = req.user.organizationId;
    where.createdById = req.user.id;
  }
  // Someone given this page sees their branch's links
  if (req.ownBranchOnly) {
    delete where.referredBy;
    where.organizationId = req.user.organizationId;
    if (req.user.branchId) where.referrer = { branchId: req.user.branchId };
  }
  const invites = await prisma.studyCenterInvite.findMany({
    where,
    include: { referrer: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  // Resolve session names for display
  const allSessionIds = [...new Set(invites.flatMap((i: any) => i.sessionIds || []))];
  const sessions = allSessionIds.length > 0
    ? await prisma.admissionSession.findMany({ where: { id: { in: allSessionIds } }, select: { id: true, name: true } })
    : [];
  const sessionMap = Object.fromEntries(sessions.map(s => [s.id, s]));
  const enriched = invites.map((inv: any) => ({
    ...inv,
    sessionIds: (inv.sessionIds || []).map((id: string) => sessionMap[id] || { id, name: 'Unknown' }),
  }));
  res.json({ success: true, count: enriched.length, data: enriched });
});
export const generateInvite = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Read org config for expiry days
  const org = await prisma.organization.findUnique({
    where: { id: req.user.organizationId },
    select: { metadata: true },
  });
  const orgMeta = (org?.metadata as any) || {};
  const config = orgMeta.enrollmentLinkConfig || {};
  const expiryDays = config.expiryDays || 7;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  // Data-entry staff make the link for a sales employee, who gets the credit
  let referredBy = req.user.id;
  let createdById: string | null = null;
  let branchId: string | null = null;
  if (isEntryUser(req.user)) {
    const person = await prisma.user.findFirst({
      where: { id: String(req.body.salesUserId || ''), ...salesPersonWhere(req.user.organizationId, req.user.branchId) },
      select: { id: true, branchId: true },
    });
    if (!person) {
      res.status(400).json({ success: false, message: 'Choose an active sales employee from your branch' });
      return;
    }
    referredBy = person.id;
    createdById = req.user.id;
    branchId = person.branchId;
  }
  const invite = await prisma.studyCenterInvite.create({
    data: {
      ...req.body,
      salesUserId: undefined,
      organizationId: req.user.organizationId,
      referredBy,
      createdById,
      ...(branchId && { branchId }),
      token: Math.random().toString(36).substring(7).toUpperCase(),
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : expiresAt,
      specializations: req.body.specializations || {}
    }
  });
  res.status(201).json({ success: true, data: invite });
});
export const regenerateInvite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const own = await prisma.studyCenterInvite.findFirst({
    where: {
      id: req.params.id,
      ...(req.user.role !== 'superadmin' && { organizationId: req.user.organizationId }),
      // Data-entry staff renew only the links they made
      ...(isEntryUser(req.user) && { createdById: req.user.id }),
    },
    select: { id: true }
  });
  if (!own) {
    res.status(404).json({ success: false, message: 'Invite not found' });
    return;
  }
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
export const getTeamPerformance = asyncHandler(async (req: PageRequest, res: Response) => {
  let whereClause: any = { organizationId: req.user.organizationId };

  if (['superadmin', 'org_admin', 'ceo', 'general_manager', 'branch_manager'].includes(req.user.role)) {
    // See all users
  } else if (req.user.role === 'center_admin') {
    whereClause.OR = [];
    if (req.user.branchId) whereClause.OR.push({ branchId: req.user.branchId });
    if (req.user.studyCenterId) whereClause.OR.push({ studyCenterId: req.user.studyCenterId });
    if (whereClause.OR.length === 0) delete whereClause.OR;
  } else {
    whereClause.OR = [
      { reportingTo: req.user.id },
      { id: req.user.id }
    ];
    if (req.user.departmentId) {
      whereClause.OR.push({ departmentId: req.user.departmentId });
    }
  }

  // Someone given this page sees the staff of their branch, or everyone if they have none
  if (req.ownBranchOnly) {
    delete whereClause.OR;
    if (req.user.branchId) whereClause.branchId = req.user.branchId;
  }

  // A branch manager's team is the staff of their own branch.
  if (req.user.role === 'branch_manager' && req.user.branchId) {
    whereClause.branchId = req.user.branchId;
  }

  // Team performance is about staff: never include student accounts (an
  // organization can have thousands, which made this call take ~20 seconds).
  whereClause.role = { not: 'student' };

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
/** Someone given this page sees their branch's partners */
const reachablePartners = (req: PageRequest) => ({
  organizationId: req.user.organizationId,
  ...(req.ownBranchOnly && partnerBranchWhere(req.user.branchId)),
});

export const getMyCenters = asyncHandler(async (req: PageRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({ where: reachablePartners(req) });
  res.json({ success: true, data: withoutPortalLogins(req.user, centers) });
});
export const getMyCenterAdmissions = asyncHandler(async (req: PageRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({
    where: reachablePartners(req),
    select: { id: true }
  });
  const centerIds = centers.map((c: any) => c.id);
  const students = await prisma.student.findMany({
    where: { centerId: { in: centerIds }, ...(req.ownBranchOnly && req.user.branchId && { branchId: req.user.branchId }) },
    orderBy: { createdAt: 'desc' },
    include: {
      program: { select: { id: true, name: true } }
    }
  });
  res.json({ success: true, count: students.length, data: withoutPortalLogins(req.user, students) });
});
export const getMyCenterDetail = asyncHandler(async (req: PageRequest, res: Response) => {
  const center = await prisma.studyCenter.findFirst({ where: { id: req.params.centerId, ...reachablePartners(req) } });
  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }
  res.json({ success: true, data: withoutPortalLogins(req.user, [center])[0] });
});

// Programs
export const getProgramsByUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uniId = req.query.universityId as string;
  const uniIdsStr = req.query.universityIds as string;

  let whereClause: any = {};

  if (uniIdsStr) {
    const ids = uniIdsStr.split(',').filter(Boolean);
    whereClause.universityId = { in: ids };
  } else if (uniId) {
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

// Sessions by university (for invite creation)
export const getSessionsByUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uniIdsStr = req.query.universityIds as string;
  const whereClause: any = {
    organizationId: req.user.organizationId,
    status: { in: ['active', 'approved'] },
  };
  if (uniIdsStr) {
    const ids = uniIdsStr.split(',').filter(Boolean);
    whereClause.OR = [
      { universityId: { in: ids } },
      { universityId: null },
    ];
  }
  const sessions = await prisma.admissionSession.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, startDate: true, endDate: true, status: true, universityId: true },
  });
  res.json({ success: true, data: sessions });
});
