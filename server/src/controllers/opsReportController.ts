import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthRequest } from '../middleware/auth.js';

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
      university: { select: { id: true, name: true } }
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

  res.json({
    success: true,
    totalAdmissions: admissions.length,
    byUniversity: Object.keys(byUniversity).map(k => ({ name: k, value: byUniversity[k] })),
    byProgram: Object.keys(byProgram).map(k => ({ name: k, value: byProgram[k] })),
    trends: trendData
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
    select: { status: true, id: true }
  });

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

  res.json({
    success: true,
    total: enrollments.length,
    statusCounts: Object.keys(statusCounts).map(k => ({ name: k, value: statusCounts[k] })),
    funnel
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
        select: { id: true } 
      },
      programs: { select: { id: true } }
    }
  });

  const universityData = universities.map(u => ({
    id: u.id,
    name: u.name,
    code: u.code,
    totalStudents: u.students.length,
    totalPrograms: u.programs.length,
    status: u.status
  }));

  res.json({
    success: true,
    totalUniversities: universities.length,
    data: universityData
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
    select: { id: true, reregStatus: true }
  });

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
    ]
  });
});
