import { Request, Response } from 'express';
import { prisma } from '../config/postgres.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AuthRequest } from '../types/express.js';

// Helper to build hierarchy clause based on the authenticated user's role
const buildHierarchyClause = (req: AuthRequest) => {
  let whereClause: any = { organizationId: req.user.organizationId };

  if (['superadmin', 'org_admin', 'ceo'].includes(req.user.role)) {
    // See all users
  } else if (req.user.role === 'center_admin') {
    whereClause.OR = [];
    if (req.user.branchId) whereClause.OR.push({ branchId: req.user.branchId });
    if (req.user.studyCenterId) whereClause.OR.push({ studyCenterId: req.user.studyCenterId });
    if (whereClause.OR.length === 0) delete whereClause.OR;
  } else {
    // Sales Admin / Managers
    whereClause.OR = [
      { reportingTo: req.user.id },
      { id: req.user.id }
    ];
    if (req.user.departmentId) {
      whereClause.OR.push({ departmentId: req.user.departmentId });
    }
  }

  return whereClause;
};

// ─── Team Report ─────────────────────────────────────────────────────────────
export const getTeamReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userWhere = buildHierarchyClause(req);
  
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
  const userWhere = buildHierarchyClause(req);
  
  // Also only include roles that are typically counselors
  userWhere.role = { in: ['sales', 'sales_agent', 'bde'] }; 

  const counselors = await prisma.user.findMany({
    where: userWhere,
    select: { id: true, name: true, status: true }
  });

  const counselorData = await Promise.all(counselors.map(async (c) => {
    // Lead generation & conversion
    const totalLeads = await prisma.lead.count({ where: { referredBy: c.id } });
    const convertedLeads = await prisma.lead.count({ where: { referredBy: c.id, status: 'converted' } });
    
    // Tasks 
    const totalTasks = await prisma.task.count({ where: { assigneeId: c.id } });
    const completedTasks = await prisma.task.count({ where: { assigneeId: c.id, status: 'completed' } });

    // Enrollments
    const enrollments = await prisma.student.count({
      where: { OR: [{ referredBy: c.id }, { enrolledBy: c.id }] }
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
  const { month, year } = req.query;
  const userWhere = buildHierarchyClause(req);
  
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

  // If we only want specific months/years
  if (month && year) {
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    studentWhere.joinDate = { gte: startDate, lte: endDate };
  }

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
  const userWhere = buildHierarchyClause(req);
  
  const teammates = await prisma.user.findMany({ where: userWhere, select: { id: true } });
  const memberIds = teammates.map(t => t.id);

  if (memberIds.length === 0) {
    return res.json({ success: true, funnel: [], overallConversionRate: 0, deadLeads: 0 });
  }

  const leads = await prisma.lead.findMany({
    where: { referredBy: { in: memberIds } },
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
