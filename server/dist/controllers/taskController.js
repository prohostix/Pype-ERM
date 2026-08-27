import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getTasks = asyncHandler(async (req, res) => {
    const where = {};
    if (req.user.role !== 'superadmin') {
        where.organizationId = req.user.organizationId;
        if (req.user.role !== 'org_admin' && req.user.role !== 'ceo') {
            where.OR = [
                { assignedTo: req.user.id },
                { createdBy: req.user.id }
            ];
        }
    }
    if (req.query.assignedTo)
        where.assignedTo = req.query.assignedTo;
    if (req.query.status)
        where.status = req.query.status;
    const tasks = await prisma.task.findMany({
        where,
        include: {
            assignee: { select: { name: true, email: true } },
            assigner: { select: { name: true, email: true } },
            department: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
});
export const getTask = asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({
        where: { id: req.params.id },
        include: {
            assignee: { select: { name: true, email: true } },
            assigner: { select: { name: true, email: true } },
            department: { select: { name: true } },
        }
    });
    if (!task) {
        res.status(404).json({ success: false, message: 'Task not found' });
        return;
    }
    res.status(200).json({ success: true, data: task });
});
export const createTask = asyncHandler(async (req, res) => {
    const { title, description, assignedTo, deadline, priority, departmentId, organizationId } = req.body;
    const orgId = req.user.organizationId || organizationId;
    if (!orgId) {
        res.status(400).json({ success: false, message: 'Organization ID is required.' });
        return;
    }
    const task = await prisma.task.create({
        data: {
            title,
            description,
            status: 'pending',
            priority: priority || 'medium',
            deadline: deadline ? new Date(deadline) : new Date(),
            organizationId: orgId,
            createdBy: req.user.id,
            assignedTo,
            departmentId: departmentId || req.user.departmentId
        }
    });
    res.status(201).json({ success: true, data: task });
});
export const updateTask = asyncHandler(async (req, res) => {
    const { title, description, assignedTo, deadline, status, priority, departmentId } = req.body;
    const updateData = {};
    if (title)
        updateData.title = title;
    if (description)
        updateData.description = description;
    if (assignedTo)
        updateData.assignedTo = assignedTo;
    if (deadline)
        updateData.deadline = new Date(deadline);
    if (status)
        updateData.status = status;
    if (priority)
        updateData.priority = priority;
    if (departmentId)
        updateData.departmentId = departmentId;
    const task = await prisma.task.update({
        where: { id: req.params.id },
        data: updateData
    });
    res.status(200).json({ success: true, data: task });
});
export const completeTask = asyncHandler(async (req, res) => {
    const task = await prisma.task.update({
        where: { id: req.params.id },
        data: {
            status: 'completed',
            completedAt: new Date(),
            remarks: req.body.remarks,
        }
    });
    res.status(200).json({ success: true, data: task });
});
export const deleteTask = asyncHandler(async (req, res) => {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.status(200).json({ success: true, data: {} });
});
export const getAssignableUsers = asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
        where: { organizationId: req.user.organizationId, status: 'active' },
        select: { id: true, name: true, email: true, designation: true }
    });
    res.status(200).json({ success: true, count: users.length, data: users });
});
//# sourceMappingURL=taskController.js.map