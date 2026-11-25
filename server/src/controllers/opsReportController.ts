import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthRequest } from '../middleware/auth.js';

const tally = (items: string[]) => {
  const m: Record<string, number> = {};
  items.forEach(i => { m[i] = (m[i] || 0) + 1; });
  return Object.keys(m).map(k => ({ name: k, value: m[k] })).sort((a, b) => b.value - a.value);
};
const titleCase = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const reregState = (s: any): 'pending' | 'completed' | 'notStarted' => {
  if (s.reregStatus && typeof s.reregStatus === 'object') {
    const statuses = Object.values(s.reregStatus);
    if (statuses.includes('pending')) return 'pending';
    if (statuses.includes('completed')) return 'completed';
  }
  return 'notStarted';
};
const monthKey = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
const lastSixMonths = () => {
  const today = new Date();
  const keys: string[] = [];
  for (let i = 5; i >= 0; i--) keys.push(monthKey(new Date(today.getFullYear(), today.getMonth() - i, 1)));
  return keys;
};

// ─── Admission Report ────────────────────────────────────────────────────────
export const getAdmissionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month, year } = req.query;
  const organizationId = req.user.organizationId;
  
  let studentWhere: any = { organizationId };

  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    
    studentWhere.OR = [
      { enrolledBy: null },
      { referredBy: null },
      { enrolledBy: { in: assignedIds } },
      { referredBy: { in: assignedIds } }
    ];
  }

  if (month && year) {
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    studentWhere.joinDate = { gte: startDate, lte: endDate };
  }

  const admissions = await prisma.student.findMany({
    where: studentWhere,
    include: {
      university: { select: { id: true, name: true } },
      branch: { select: { name: true } },
      center: { select: { name: true } }
    }
  });

  const byUniversity: Record<string, number> = {};
  
  const allPrograms = await prisma.program.findMany({
    where: { id: { in: admissions.map(a => (a as any).programId).filter(Boolean) as string[] } },
    select: { id: true, name: true }
  });
  const programMap = allPrograms.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>);

  const byProgram: Record<string, number> = {};
  
  admissions.forEach(s => {
    const uName = s.university?.name || 'Unknown University';
    const pName = (s as any).programId ? programMap[(s as any).programId] || 'Unknown Program' : 'Unknown Program';
    
    byUniversity[uName] = (byUniversity[uName] || 0) + 1;
    byProgram[pName] = (byProgram[pName] || 0) + 1;
  });

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
      if (d >= new Date(today.getFullYear(), today.getMonth() - 5, 1)) {
        const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (trends[key] !== undefined) {
          trends[key] += 1;
        }
      }
    }
  });

  const trendData = Object.keys(trends).map(k => ({ name: k, count: trends[k] }));

  const thisKey = monthKey(today);
  const lastKey = monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const thisMonth = trends[thisKey] ?? 0;
  const lastMonth = trends[lastKey] ?? 0;
  const statusOf = (s: any) => (s.isPrevious ? 'completed' : (s.status || 'pending'));

  res.json({
    success: true,
    totalAdmissions: admissions.length,
    byUniversity: Object.keys(byUniversity).map(k => ({ name: k, value: byUniversity[k] })),
    byProgram: Object.keys(byProgram).map(k => ({ name: k, value: byProgram[k] })),
    trends: trendData,
    summary: {
      thisMonth,
      lastMonth,
      changePct: lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null,
      admitted: admissions.filter(s => statusOf(s) === 'admitted').length,
      pending: admissions.filter(s => statusOf(s) === 'pending').length,
      cancelled: admissions.filter(s => statusOf(s) === 'cancelled').length,
      completed: admissions.filter(s => statusOf(s) === 'completed').length
    },
    byStatus: tally(admissions.map(s => titleCase(statusOf(s)))),
    byBranch: tally(admissions.map(s => (s as any).branch?.name || 'Main Office')),
    byCenter: tally(admissions.map(s => (s as any).center?.name || 'Direct')).slice(0, 10),
    bySource: tally(admissions.map(s => titleCase(((s as any).source || 'Direct') as string)))
  });
});

// ─── Enrollment Report ───────────────────────────────────────────────────────
export const getEnrollmentReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  
  let enrollmentWhere: any = { organizationId };

  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    
    enrollmentWhere.OR = [
      { salesUserId: null },
      { salesUserId: { in: assignedIds } }
    ];
  }

  const enrollments = await prisma.enrollment.findMany({
    where: enrollmentWhere,
    select: {
      status: true, id: true, programId: true, studyCenterId: true, source: true, createdAt: true, enrolledAt: true,
      isProvisional: true, isUpgrade: true
    }
  });
  const progIds = Array.from(new Set(enrollments.map(e => e.programId).filter(Boolean))) as string[];
  const centerIds = Array.from(new Set(enrollments.map(e => e.studyCenterId).filter(Boolean))) as string[];
  const [progRows, centerRows] = await Promise.all([
    prisma.program.findMany({ where: { id: { in: progIds } }, select: { id: true, name: true } }),
    prisma.studyCenter.findMany({ where: { id: { in: centerIds } }, select: { id: true, name: true } })
  ]);
  const progName: Record<string, string> = Object.fromEntries(progRows.map(p => [p.id, p.name]));
  const centerName: Record<string, string> = Object.fromEntries(centerRows.map(c => [c.id, c.name]));

  const statusCounts: Record<string, number> = {
    'payment_pending': 0,
    'department_pending': 0,
    'document_pending': 0,
    'finance_pending': 0,
    'approved': 0,
    'rejected': 0
  };

  enrollments.forEach(e => {
    const status = e.status || 'payment_pending';
    if (statusCounts[status] !== undefined) {
      statusCounts[status]++;
    } else {
      statusCounts[status] = 1;
    }
  });

  const funnel = [
    { name: 'Total Enrollments', value: enrollments.length },
    { name: 'Pending Review', value: statusCounts['department_pending'] + statusCounts['approved'] + statusCounts['finance_pending'] + statusCounts['document_pending'] },
    { name: 'Approved', value: statusCounts['approved'] }
  ];

  const months = lastSixMonths();
  const monthly: Record<string, number> = Object.fromEntries(months.map(m => [m, 0]));
  enrollments.forEach(e => {
    const k = monthKey(new Date(e.createdAt));
    if (monthly[k] !== undefined) monthly[k]++;
  });
  const approvedRows = enrollments.filter(e => e.status === 'approved' && e.enrolledAt);
  const avgDays = approvedRows.length
    ? Math.round((approvedRows.reduce((sum, e) => sum + (new Date(e.enrolledAt as Date).getTime() - new Date(e.createdAt).getTime()), 0) / approvedRows.length / 86400000) * 10) / 10
    : null;

  res.json({
    success: true,
    total: enrollments.length,
    statusCounts: Object.keys(statusCounts).map(k => ({ name: k, value: statusCounts[k] })),
    funnel,
    summary: {
      approved: statusCounts['approved'] || 0,
      rejected: statusCounts['rejected'] || 0,
      inReview: enrollments.length - (statusCounts['approved'] || 0) - (statusCounts['rejected'] || 0),
      approvalRate: enrollments.length ? Math.round(((statusCounts['approved'] || 0) / enrollments.length) * 100) : 0,
      provisional: enrollments.filter(e => e.isProvisional).length,
      upgrades: enrollments.filter(e => e.isUpgrade).length,
      avgDaysToApprove: avgDays
    },
    trends: months.map(m => ({ name: m, count: monthly[m] })),
    byProgram: tally(enrollments.map(e => progName[e.programId] || 'Unknown Program')).slice(0, 10),
    byCenter: tally(enrollments.map(e => (e.studyCenterId ? centerName[e.studyCenterId] : '') || 'Direct')).slice(0, 10),
    bySource: tally(enrollments.map(e => titleCase((e.source || 'Direct') as string)))
  });
});

// ─── University Report ───────────────────────────────────────────────────────
export const getUniversityReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  
  let studentsWhere: any = {};
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    
    studentsWhere.OR = [
      { enrolledBy: null },
      { referredBy: null },
      { enrolledBy: { in: assignedIds } },
      { referredBy: { in: assignedIds } }
    ];
  }

  const universities = await prisma.university.findMany({
    where: { organizationId },
    include: {
      students: { 
        where: studentsWhere,
        select: { id: true, status: true, isPrevious: true } 
      },
      programs: { select: { id: true } },
      admissionSessions: { select: { id: true, status: true } }
    }
  });

  const universityData = universities.map(u => ({
    id: u.id,
    name: u.name,
    code: u.code,
    totalStudents: u.students.length,
    totalPrograms: u.programs.length,
    status: u.status,
    country: (u as any).country || null,
    admitted: u.students.filter(s => s.status === 'admitted' && !s.isPrevious).length,
    pending: u.students.filter(s => s.status === 'pending' && !s.isPrevious).length,
    completed: u.students.filter(s => s.isPrevious).length,
    totalSessions: u.admissionSessions.length,
    openSessions: u.admissionSessions.filter(x => x.status === 'open' || x.status === 'active').length
  }));

  const totalStudents = universityData.reduce((n, u) => n + u.totalStudents, 0);

  res.json({
    success: true,
    totalUniversities: universities.length,
    data: universityData,
    summary: {
      active: universities.filter(u => u.status === 'active').length,
      totalStudents,
      totalPrograms: universityData.reduce((n, u) => n + u.totalPrograms, 0),
      avgStudents: universities.length ? Math.round(totalStudents / universities.length) : 0,
      withoutStudents: universityData.filter(u => u.totalStudents === 0).length
    }
  });
});

// ─── Re-registration Report ──────────────────────────────────────────────────
export const getReRegistrationReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  
  let studentWhere: any = { organizationId };

  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    
    studentWhere.OR = [
      { enrolledBy: null },
      { referredBy: null },
      { enrolledBy: { in: assignedIds } },
      { referredBy: { in: assignedIds } }
    ];
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    select: { id: true, reregStatus: true, programId: true, branchId: true, status: true }
  });
  const rrProgIds = Array.from(new Set(students.map(s => s.programId).filter(Boolean))) as string[];
  const rrBranchIds = Array.from(new Set(students.map(s => s.branchId).filter(Boolean))) as string[];
  const [rrProgs, rrBranches] = await Promise.all([
    prisma.program.findMany({ where: { id: { in: rrProgIds } }, select: { id: true, name: true } }),
    prisma.branch.findMany({ where: { id: { in: rrBranchIds } }, select: { id: true, name: true } })
  ]);
  const rrProgName: Record<string, string> = Object.fromEntries(rrProgs.map(p => [p.id, p.name]));
  const rrBranchName: Record<string, string> = Object.fromEntries(rrBranches.map(b => [b.id, b.name]));
  const groupBy = (keyOf: (s: any) => string) => {
    const g: Record<string, { name: string; pending: number; completed: number; notStarted: number }> = {};
    students.forEach(s => {
      const k = keyOf(s);
      if (!g[k]) g[k] = { name: k, pending: 0, completed: 0, notStarted: 0 };
      g[k][reregState(s)]++;
    });
    return Object.values(g).sort((a, b) => (b.pending + b.completed + b.notStarted) - (a.pending + a.completed + a.notStarted));
  };

  let pending = 0;
  let completed = 0;
  let notStarted = 0;

  students.forEach(s => {
    if (s.reregStatus && typeof s.reregStatus === 'object') {
      const statusObj: any = s.reregStatus;
      const statuses = Object.values(statusObj);
      if (statuses.includes('pending')) {
        pending++;
      } else if (statuses.includes('completed')) {
        completed++;
      } else {
        notStarted++;
      }
    } else {
      notStarted++;
    }
  });

  res.json({
    success: true,
    totalEligible: students.length,
    metrics: [
      { name: 'Pending', value: pending },
      { name: 'Completed', value: completed },
      { name: 'Not Started', value: notStarted }
    ],
    summary: {
      pending,
      completed,
      notStarted,
      completionRate: students.length ? Math.round((completed / students.length) * 100) : 0
    },
    byProgram: groupBy(s => rrProgName[s.programId] || 'Unknown Program').slice(0, 10),
    byBranch: groupBy(s => (s.branchId ? rrBranchName[s.branchId] : '') || 'Main Office').slice(0, 10)
  });
});
