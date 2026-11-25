import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Everyone else sees only the escalations that are about them */
const REVIEWERS = ['superadmin', 'org_admin', 'ceo', 'general_manager', 'ops_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin'];
const visibleTo = (req: AuthRequest) => ({
  organizationId: req.user.organizationId,
  ...(!REVIEWERS.includes(req.user.role) && { employeeId: req.user.id }),
});

export const getEscalations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalations = await prisma.escalation.findMany({
    where: visibleTo(req),
    include: { employee: { select: { name: true } } },
    orderBy: { escalatedAt: 'desc' }
  });
  res.json({ success: true, count: escalations.length, data: escalations });
});

export const getEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalation = await prisma.escalation.findFirst({ where: { id: req.params.id, ...visibleTo(req) } });
  res.json({ success: true, data: escalation });
});

export const createEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Its outcome is decided by a reviewer, not by whoever raises it
  const { id: _id, status: _status, resolution: _resolution, resolvedAt: _resolvedAt, resolvedBy: _resolvedBy, handledBy: _handledBy, ...fields } = req.body;
  if (fields.taskId && !(await prisma.task.findFirst({ where: { id: fields.taskId, organizationId: req.user.organizationId }, select: { id: true } }))) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }
  const escalation = await prisma.escalation.create({ data: { ...fields, organizationId: req.user.organizationId, employeeId: req.user.id } });
  res.status(201).json({ success: true, data: escalation });
});

export const updateEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalation = await prisma.escalation.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: escalation });
});

export const deleteEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.escalation.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const resolveEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalation = await prisma.escalation.update({ where: { id: req.params.id }, data: { status: 'resolved', resolvedAt: new Date(), resolvedBy: req.user.id } });
  res.json({ success: true, data: escalation });
});
