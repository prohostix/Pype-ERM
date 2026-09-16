import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPerformanceMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const [total, completed] = await Promise.all([
    prisma.task.count({ where: { organizationId: req.user.organizationId } }),
    prisma.task.count({ where: { organizationId: req.user.organizationId, status: 'completed' } })
  ]);
  res.json({ success: true, data: { taskCompletionRate: total > 0 ? (completed / total) * 100 : 0 } });
});

export const getRiskMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const overdue = await prisma.task.count({ where: { organizationId: req.user.organizationId, status: 'overdue' } });
  res.json({ success: true, data: { overdueTasks: overdue } });
});

export const getEscalations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalations = await prisma.escalation.findMany({ where: { organizationId: req.user.organizationId }, include: { employee: true, deptAdmin: true } });
  res.json({ success: true, count: escalations.length, data: escalations });
});

export const handleEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalation = await prisma.escalation.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: escalation });
});

export const getSalesDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: orgId,
      createdAt: { gte: thirtyDaysAgo }
    },
    orderBy: { createdAt: 'desc' }
  });

  const grouped: Record<string, number> = {};
  enrollments.forEach(e => {
    const dateStr = e.createdAt.toISOString().split('T')[0];
    grouped[dateStr] = (grouped[dateStr] || 0) + 1;
  });

  const salesPerDay = Object.keys(grouped).map(date => ({ date, count: grouped[date] }));

  res.json({ success: true, data: { salesPerDay, details: enrollments } });
});

export const getRevenueDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const payments = await prisma.paymentEntry.findMany({
    where: {
      organizationId: orgId,
      receivedAt: { gte: thirtyDaysAgo }
    },
    select: { amount: true, receivedAt: true }
  });

  const grouped: Record<string, number> = {};
  payments.forEach(p => {
    const dateStr = p.receivedAt.toISOString().split('T')[0];
    grouped[dateStr] = (grouped[dateStr] || 0) + p.amount;
  });

  const revenuePerDate = Object.keys(grouped).map(date => ({ date, revenue: grouped[date] }));

  res.json({ success: true, data: { revenuePerDate } });
});

export const getAdmissionsList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [totalCount, students] = await Promise.all([
    prisma.student.count({ where: { organizationId: orgId } }),
    prisma.student.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })
  ]);

  res.json({
    success: true,
    data: students,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit)
  });
});

export const getPendingInvoicesList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [totalCount, invoices] = await Promise.all([
    prisma.invoice.count({ where: { organizationId: orgId, status: 'draft' } }),
    prisma.invoice.findMany({
      where: { organizationId: orgId, status: 'draft' },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        student: { select: { id: true, name: true, email: true } },
        center: { select: { id: true, name: true } }
      }
    })
  ]);

  res.json({
    success: true,
    data: invoices,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit)
  });
});

export const getAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const [totalStudents, totalCenters, activePrograms] = await Promise.all([
    prisma.student.count({ where: { organizationId: orgId } }),
    prisma.studyCenter.count({ where: { organizationId: orgId } }),
    prisma.program.count({ where: { organizationId: orgId, status: 'active' } })
  ]);
  res.json({ success: true, data: { totalStudents, totalCenters, activePrograms } });
});

export const getDepartmentManagers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const managers = await prisma.user.findMany({ where: { organizationId: req.user.organizationId, role: { in: ['ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin'] }, status: { not: 'resigned' } } });
  res.json({ success: true, count: managers.length, data: managers });
});

export const assignTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assigneeId, assignedTo, deadline, ...rest } = req.body;
  const task = await prisma.task.create({
    data: {
      ...rest,
      assignedTo: assignedTo || assigneeId,
      createdBy: req.user.id,
      deadline: deadline ? new Date(deadline) : new Date(),
      organizationId: req.user.organizationId!
    }
  });
  res.status(201).json({ success: true, data: task });
});

export const getKPIKRAReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profiles = await prisma.employeeProfile.findMany({
    where: { organizationId: req.user.organizationId },
    include: {
      user: { select: { name: true, email: true, department: true } }
    }
  });
  res.json({ success: true, data: profiles });
});

export const getCenterOnboardingOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: centers });
});

export const getStudentEnrollmentOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: enrollments });
});

export const getActivityLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const logs = await prisma.auditLog.findMany({
    where: { organizationId: req.user.organizationId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } }
    },
    orderBy: { timestamp: 'desc' },
    take: 500
  });
  res.json({ success: true, count: logs.length, data: logs });
});

export const getSalesCounts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [totalSales, revenueAgg, totalAdmission, totalPendingPayments] = await Promise.all([
    prisma.enrollment.count({ where: { organizationId: orgId, createdAt: { gte: sevenDaysAgo } } }),
    prisma.paymentEntry.aggregate({ where: { organizationId: orgId, receivedAt: { gte: sevenDaysAgo } }, _sum: { amount: true } }),
    prisma.student.count({ where: { organizationId: orgId, createdAt: { gte: sevenDaysAgo } } }),
    prisma.invoice.count({ where: { organizationId: orgId, status: 'draft', createdAt: { gte: sevenDaysAgo } } })
  ]);
  
  const totalRevenue = revenueAgg._sum.amount || 0;
  
  res.json({ success: true, data: { totalSales, totalRevenue, totalAdmission, totalPendingPayments } });
});

export const getOverallSalesCounts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  
  const [totalSales, revenueAgg, totalAdmission, totalPendingPayments] = await Promise.all([
    prisma.enrollment.count({ where: { organizationId: orgId } }),
    prisma.paymentEntry.aggregate({ where: { organizationId: orgId }, _sum: { amount: true } }),
    prisma.student.count({ where: { organizationId: orgId } }),
    prisma.invoice.count({ where: { organizationId: orgId, status: 'draft' } })
  ]);
  
  const totalRevenue = revenueAgg._sum.amount || 0;
  
  res.json({ success: true, data: { totalSales, totalRevenue, totalAdmission, totalPendingPayments } });
});

export const getRevenueTrend = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  
  // Calculate date 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const payments = await prisma.paymentEntry.findMany({
    where: {
      organizationId: orgId,
      receivedAt: {
        gte: sevenDaysAgo,
      }
    },
    select: {
      amount: true,
      receivedAt: true
    }
  });

  const trend: Record<string, number> = {};
  
  // Initialize last 7 days with 0
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    trend[dateStr] = 0;
  }

  // Aggregate payments by day
  payments.forEach(p => {
    const dateStr = p.receivedAt.toISOString().split('T')[0];
    if (trend[dateStr] !== undefined) {
      trend[dateStr] += p.amount;
    }
  });

  const result = Object.keys(trend).map(date => ({
    date,
    revenue: trend[date]
  }));

  res.json({ success: true, data: result });
});
