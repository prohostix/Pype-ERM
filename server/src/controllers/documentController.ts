import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { PageRequest } from '../access/pageGuard.js';
import { studentBranchWhere } from '../access/studentRules.js';

/** Someone given a documents page works with the students of their own branch */
const givenStudents = (req: PageRequest) =>
  (req.ownBranchOnly && req.user.branchId ? { AND: [{ student: studentBranchWhere(req.user.branchId) }] } : {});

export const getDocumentLogs = asyncHandler(async (req: PageRequest, res: Response) => {
  const { type, status } = req.query;
  const where: any = { organizationId: req.user.organizationId };
  if (type) where.type = type as string;
  if (status) where.status = status as string;

  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    
    where.OR = [
      { studentId: null },
      { student: { enrolledBy: null } },
      { student: { referredBy: null } },
      { student: { enrolledBy: { in: assignedIds } } },
      { student: { referredBy: { in: assignedIds } } }
    ];
  }

  Object.assign(where, givenStudents(req));

  const logs = await prisma.documentLog.findMany({
    where,
    include: {
      // Never the student's portal password
      student: { omit: { credentials: true } },
      loggedByUser: { select: { id: true, name: true, role: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({ success: true, count: logs.length, data: logs });
});

export const getDocumentLog = asyncHandler(async (req: PageRequest, res: Response) => {
  let whereClause: any = { id: req.params.id, organizationId: req.user.organizationId };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    whereClause.OR = [
      { studentId: null },
      { student: { enrolledBy: null, referredBy: null } },
      { student: { enrolledBy: { in: assignedIds } } },
      { student: { referredBy: { in: assignedIds } } }
    ];
  }

  const log = await prisma.documentLog.findFirst({
    where: { ...whereClause, ...givenStudents(req) },
    include: { student: { omit: { credentials: true } } }
  });
  if (!log) {
    res.status(404).json({ success: false, message: 'Document log not found' });
    return;
  }
  res.status(200).json({ success: true, data: log });
});

export const createDocumentLog = asyncHandler(async (req: PageRequest, res: Response) => {
  const { studentId, type, documentName, documentType, status, notes, courierName, trackingNumber, dispatchDate, deliveryDate } = req.body;
  
  const limited = Boolean(req.ownBranchOnly && req.user.branchId);
  const reachable = studentId
    ? Boolean(await prisma.student.findFirst({
      where: { id: studentId, organizationId: req.user.organizationId, ...(limited && studentBranchWhere(req.user.branchId)) },
      select: { id: true }
    }))
    : !limited;
  if (!reachable) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  const log = await prisma.documentLog.create({
    data: {
      organizationId: req.user.organizationId!,
      loggedBy: req.user.id,
      studentId,
      type,
      documentName,
      documentType,
      status,
      notes,
      courierName,
      trackingNumber,
      dispatchDate: dispatchDate ? new Date(dispatchDate) : undefined,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
    }
  });

  res.status(201).json({ success: true, data: log });
});

export const updateDocumentLog = asyncHandler(async (req: PageRequest, res: Response) => {
  const { status, notes, courierName, trackingNumber, dispatchDate, deliveryDate } = req.body;
  
  let whereClause: any = { id: req.params.id, organizationId: req.user.organizationId };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    whereClause.OR = [
      { studentId: null },
      { student: { enrolledBy: null, referredBy: null } },
      { student: { enrolledBy: { in: assignedIds } } },
      { student: { referredBy: { in: assignedIds } } }
    ];
  }

  const existing = await prisma.documentLog.findFirst({ where: { ...whereClause, ...givenStudents(req) } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Document log not found or unauthorized' });
    return;
  }

  const log = await prisma.documentLog.update({
    where: { id: req.params.id },
    data: {
      status,
      notes,
      courierName,
      trackingNumber,
      dispatchDate: dispatchDate ? new Date(dispatchDate) : undefined,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
    }
  });

  res.status(200).json({ success: true, data: log });
});
