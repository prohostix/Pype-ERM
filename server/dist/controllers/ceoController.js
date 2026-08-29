import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getPerformanceMetrics = asyncHandler(async (req, res) => {
    const [total, completed] = await Promise.all([
        prisma.task.count({ where: { organizationId: req.user.organizationId } }),
        prisma.task.count({ where: { organizationId: req.user.organizationId, status: 'completed' } })
    ]);
    res.json({ success: true, data: { taskCompletionRate: total > 0 ? (completed / total) * 100 : 0 } });
});
export const getRiskMetrics = asyncHandler(async (req, res) => {
    const overdue = await prisma.task.count({ where: { organizationId: req.user.organizationId, status: 'overdue' } });
    res.json({ success: true, data: { overdueTasks: overdue } });
});
export const getEscalations = asyncHandler(async (req, res) => {
    const escalations = await prisma.escalation.findMany({ where: { organizationId: req.user.organizationId }, include: { employee: true, deptAdmin: true } });
    res.json({ success: true, count: escalations.length, data: escalations });
});
export const handleEscalation = asyncHandler(async (req, res) => {
    const escalation = await prisma.escalation.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: escalation });
});
export const getAnalytics = asyncHandler(async (req, res) => {
    const orgId = req.user.organizationId;
    const [totalStudents, totalCenters, activePrograms] = await Promise.all([
        prisma.student.count({ where: { organizationId: orgId } }),
        prisma.studyCenter.count({ where: { organizationId: orgId } }),
        prisma.program.count({ where: { organizationId: orgId, status: 'active' } })
    ]);
    res.json({ success: true, data: { totalStudents, totalCenters, activePrograms } });
});
export const getDepartmentManagers = asyncHandler(async (req, res) => {
    const managers = await prisma.user.findMany({ where: { organizationId: req.user.organizationId, role: { in: ['ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin'] }, status: { not: 'resigned' } } });
    res.json({ success: true, count: managers.length, data: managers });
});
export const assignTask = asyncHandler(async (req, res) => {
    const { assigneeId, assignedTo, deadline, ...rest } = req.body;
    const task = await prisma.task.create({
        data: {
            ...rest,
            assignedTo: assignedTo || assigneeId,
            createdBy: req.user.id,
            deadline: deadline ? new Date(deadline) : new Date(),
            organizationId: req.user.organizationId
        }
    });
    res.status(201).json({ success: true, data: task });
});
export const getKPIKRAReport = asyncHandler(async (req, res) => {
    const profiles = await prisma.employeeProfile.findMany({
        where: { organizationId: req.user.organizationId },
        include: {
            user: { select: { name: true, email: true, department: true } }
        }
    });
    res.json({ success: true, data: profiles });
});
export const getCenterOnboardingOverview = asyncHandler(async (req, res) => {
    const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId } });
    res.json({ success: true, data: centers });
});
export const getStudentEnrollmentOverview = asyncHandler(async (req, res) => {
    const enrollments = await prisma.enrollment.findMany({ where: { organizationId: req.user.organizationId } });
    res.json({ success: true, data: enrollments });
});
export const getActivityLogs = asyncHandler(async (req, res) => {
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
//# sourceMappingURL=ceoController.js.map