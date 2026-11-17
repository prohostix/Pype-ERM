import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthRequest } from '../middleware/auth.js';

const GLOBAL_ROLES = ['superadmin', 'org_admin', 'ceo', 'general_manager', 'branch_manager'];

/**
 * A user who belongs to a branch only sees that branch's data (people, admissions, payments).
 * Organization owners (org admin, superadmin) are never limited.
 */
const branchLimitOf = (req: AuthRequest): string | null =>
  req.user.branchId && !['superadmin', 'org_admin'].includes(req.user.role) ? req.user.branchId : null;

/**
 * Everyone below this user: people who report to them (and to those people, and so on), and anyone
 * in a department or sub-department they manage. Includes the user. Being in the same department
 * is not enough on its own.
 */
const getSubordinateIds = async (req: AuthRequest): Promise<string[]> => {
  const { id: userId, organizationId } = req.user;
  const seen = new Set<string>([userId]);

  // Reporting line, any depth
  let frontier = [userId];
  while (frontier.length > 0 && seen.size < 5000) {
    const reports = await prisma.user.findMany({
      where: { organizationId, reportingTo: { in: frontier }, status: { not: 'resigned' } },
      select: { id: true },
    });
    frontier = reports.map((r) => r.id).filter((id) => !seen.has(id));
    frontier.forEach((id) => seen.add(id));
  }

  // Departments / sub-departments this user manages
  const [managedDepts, managedSubs] = await Promise.all([
    prisma.department.findMany({ where: { organizationId, managerId: userId }, select: { id: true } }),
    prisma.subDepartment.findMany({ where: { managerId: userId }, select: { id: true } }),
  ]);
  const deptIds = managedDepts.map((d) => d.id);
  const people = await prisma.user.findMany({
    where: {
      organizationId,
      status: { not: 'resigned' },
      OR: [
        ...(deptIds.length ? [{ departmentId: { in: deptIds } }] : []),
        ...(managedSubs.length ? [{ subDepartmentId: { in: managedSubs.map((m) => m.id) } }] : []),
      ],
    },
    select: { id: true },
  });
  people.forEach((u) => seen.add(u.id));

  return [...seen];
};

// Helper to build the "who is in this report" clause based on the authenticated user's role
const buildHierarchyClause = async (req: AuthRequest) => {
  const whereClause: any = { organizationId: req.user.organizationId };

  if (GLOBAL_ROLES.includes(req.user.role)) {
    // See all users
  } else if (req.user.role === 'center_admin') {
    whereClause.OR = [];
    if (req.user.branchId) whereClause.OR.push({ branchId: req.user.branchId });
    if (req.user.studyCenterId) whereClause.OR.push({ studyCenterId: req.user.studyCenterId });
    if (whereClause.OR.length === 0) delete whereClause.OR;
  } else {
    // Sales admin / managers: themselves and everyone below them
    whereClause.id = { in: await getSubordinateIds(req) };
  }

  whereClause.status = { not: 'resigned' };

  // A user with a branch only sees people of that branch
  const branchLimit = branchLimitOf(req);
  if (branchLimit && req.user.role !== 'center_admin') whereClause.branchId = branchLimit;

  // Counselor filter: narrow the report to one person (only if they are in scope)
  const counselorId = typeof req.query.counselorId === 'string' ? req.query.counselorId : '';
  if (counselorId) {
    const inScope = await prisma.user.findFirst({ where: { ...whereClause, id: counselorId }, select: { id: true } });
    return { ...whereClause, id: inScope ? counselorId : '__none__' };
  }
  return whereClause;
};

/**
 * Month filter: ?month=YYYY-MM (new) or ?month=M&year=YYYY (admission report's older form).
 * Returns a date range, or null for "all time".
 */
const getMonthRange = (req: AuthRequest): { gte: Date; lte: Date } | null => {
  const month = typeof req.query.month === 'string' ? req.query.month : '';
  const year = typeof req.query.year === 'string' ? req.query.year : '';
  let y: number, m: number;
  const iso = /^(\d{4})-(\d{2})$/.exec(month);
  if (iso) { y = Number(iso[1]); m = Number(iso[2]); }
  else if (month && year) { y = Number(year); m = Number(month); }
  else return null;
  if (!(m >= 1 && m <= 12) || !Number.isFinite(y)) return null;
  return { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59, 999) };
};

// ─── People in this report (for the counselor filter) ────────────────────────
export const getReportMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = await buildHierarchyClause({ ...req, query: {} } as AuthRequest);
  const members = await prisma.user.findMany({
    where,
    select: { id: true, name: true, designation: true },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: members });
});

// ─── Team Report ─────────────────────────────────────────────────────────────
export const getTeamReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userWhere = await buildHierarchyClause(req);
  const range = getMonthRange(req);
  const studentBranch = branchLimitOf(req) ? { branchId: branchLimitOf(req) as string } : {};

  const teammates = await prisma.user.findMany({
    where: userWhere,
    select: { id: true, name: true, designation: true, status: true, departmentId: true }
  });

  const memberIds = teammates.map(t => t.id);

  if (memberIds.length === 0) {
    return res.json({ success: true, data: [] });
  }

  // Get total enrollments and revenue per member
  const performanceData = await Promise.all(teammates.map(async (member) => {
    const enrollmentsCount = await prisma.student.count({
      where: {
        OR: [
          { referredBy: member.id },
          { enrolledBy: member.id }
        ],
        ...(range ? { joinDate: range } : {}),
        ...studentBranch
      }
    });

    const payments = await prisma.paymentEntry.aggregate({
      _sum: { amount: true },
      where: {
        ...(range ? { receivedAt: range } : {}),
        invoice: {
          student: {
            OR: [
              { referredBy: member.id },
              { enrolledBy: member.id }
            ],
            ...studentBranch
          }
        }
      }
    });

    const revenue = payments._sum.amount || 0;

    const targets = await prisma.target.findMany({ where: { employeeId: member.id } });
    const targetTotal = targets.reduce((acc, t) => acc + t.target, 0);
    const targetProgress = targetTotal > 0 ? Math.round((enrollmentsCount / targetTotal) * 100) : 0;

    return {
      id: member.id,
      name: member.name,
      designation: member.designation || 'Team Member',
      enrollments: enrollmentsCount,
      revenue,
      targetTotal,
      targetProgress
    };
  }));

  res.json({ success: true, data: performanceData });
});

// ─── Counselor Report ────────────────────────────────────────────────────────
export const getCounselorReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userWhere = await buildHierarchyClause(req);
  const range = getMonthRange(req);
  const studentBranch = branchLimitOf(req) ? { branchId: branchLimitOf(req) as string } : {};

  // Sales team roles that work leads and admissions (sub admins included)
  userWhere.role = { in: ['sales', 'sales_sub_admin', 'academic_counselor'] };

  const counselors = await prisma.user.findMany({
    where: userWhere,
    select: { id: true, name: true, status: true }
  });

  const counselorData = await Promise.all(counselors.map(async (c) => {
    // Lead generation & conversion
    const created = range ? { createdAt: range } : {};
    const totalLeads = await prisma.lead.count({ where: { referredBy: c.id, ...created } });
    const convertedLeads = await prisma.lead.count({ where: { referredBy: c.id, status: 'converted', ...created } });
    
    // Tasks 
    const totalTasks = await prisma.task.count({ where: { assignedTo: c.id, ...created } });
    const completedTasks = await prisma.task.count({ where: { assignedTo: c.id, status: 'completed', ...created } });

    // Enrollments
    const enrollments = await prisma.student.count({
      where: { OR: [{ referredBy: c.id }, { enrolledBy: c.id }], ...(range ? { joinDate: range } : {}), ...studentBranch }
    });

    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    return {
      id: c.id,
      name: c.name,
      totalLeads,
      convertedLeads,
      conversionRate,
      totalTasks,
      completedTasks,
      enrollments
    };
  }));

  res.json({ success: true, data: counselorData });
});

// ─── Admission Report ────────────────────────────────────────────────────────
export const getAdmissionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userWhere = await buildHierarchyClause(req);
  const range = getMonthRange(req);
  
  const teammates = await prisma.user.findMany({ where: userWhere, select: { id: true } });
  const memberIds = teammates.map(t => t.id);

  if (memberIds.length === 0) {
    return res.json({ success: true, totalAdmissions: 0, byUniversity: {}, byProgram: {}, trends: {} });
  }

  let studentWhere: any = {
    OR: [
      { referredBy: { in: memberIds } },
      { enrolledBy: { in: memberIds } }
    ]
  };

  // If we only want a specific month
  if (range) studentWhere.joinDate = range;
  if (branchLimitOf(req)) studentWhere.branchId = branchLimitOf(req);

  const admissions = await prisma.student.findMany({
    where: studentWhere,
    include: {
      university: { select: { id: true, name: true } }
    }
  });

  // Group by University
  const byUniversity: Record<string, number> = {};
  
  // We need to fetch programs for program names because programId might just be string
  const allPrograms = await prisma.program.findMany({
    where: { id: { in: admissions.map(a => a.programId) } },
    select: { id: true, name: true }
  });
  const programMap = allPrograms.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>);

  const byProgram: Record<string, number> = {};
  
  admissions.forEach(s => {
    const uName = s.university?.name || 'Unknown University';
    const pName = programMap[s.programId] || 'Unknown Program';
    
    byUniversity[uName] = (byUniversity[uName] || 0) + 1;
    byProgram[pName] = (byProgram[pName] || 0) + 1;
  });

  // Monthly trends (last 6 months)
  const trends: any = {};
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    trends[key] = 0;
  }

  admissions.forEach(s => {
    if (s.joinDate) {
      const d = new Date(s.joinDate);
      // only count if it's within the last 6 months
      if (d >= new Date(today.getFullYear(), today.getMonth() - 5, 1)) {
        const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (trends[key] !== undefined) {
          trends[key] += 1;
        }
      }
    }
  });

  res.json({
    success: true,
    totalAdmissions: admissions.length,
    byUniversity,
    byProgram,
    trends
  });
});

// ─── Conversion Report (Funnel) ──────────────────────────────────────────────
export const getConversionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userWhere = await buildHierarchyClause(req);
  const range = getMonthRange(req);
  
  const teammates = await prisma.user.findMany({ where: userWhere, select: { id: true } });
  const memberIds = teammates.map(t => t.id);

  if (memberIds.length === 0) {
    return res.json({ success: true, funnel: [], overallConversionRate: 0, deadLeads: 0 });
  }

  const leads = await prisma.lead.findMany({
    where: { referredBy: { in: memberIds }, ...(range ? { createdAt: range } : {}) },
    select: { status: true }
  });

  let funnel = {
    total: leads.length,
    new: 0,
    contacted: 0,
    interested: 0,
    converted: 0,
    dead: 0
  };

  leads.forEach(l => {
    const status = (l.status || 'new').toLowerCase();
    if (status.includes('new')) funnel.new++;
    else if (status.includes('contact')) funnel.contacted++;
    else if (status.includes('interest')) funnel.interested++;
    else if (status.includes('convert')) funnel.converted++;
    else funnel.dead++;
  });

  // Re-calculate the funnel logic based on progressive dropoffs.
  // total >= contacted >= interested >= converted
  const contactedStage = funnel.contacted + funnel.interested + funnel.converted;
  const interestedStage = funnel.interested + funnel.converted;
  const convertedStage = funnel.converted;

  const funnelStages = [
    { name: 'Total Leads', value: funnel.total },
    { name: 'Contacted', value: contactedStage },
    { name: 'Interested', value: interestedStage },
    { name: 'Converted', value: convertedStage },
  ];

  const overallConversionRate = funnel.total > 0 ? Math.round((convertedStage / funnel.total) * 100) : 0;

  res.json({
    success: true,
    funnel: funnelStages,
    overallConversionRate,
    deadLeads: funnel.dead
  });
});
