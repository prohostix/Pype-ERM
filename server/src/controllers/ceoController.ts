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
  const managers = await prisma.user.findMany({ where: { organizationId: req.user.organizationId, role: { in: ['ops_admin', 'finance_admin', 'hr_admin', 'sales_admin'] }, status: { not: 'resigned' } } });
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
