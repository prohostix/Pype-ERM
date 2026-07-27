import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDocumentLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type, status } = req.query;
  const where: any = { organizationId: req.user.organizationId };
  if (type) where.type = type as string;
  if (status) where.status = status as string;

  const logs = await prisma.documentLog.findMany({
    where,
    include: {
      student: true,
      loggedByUser: { select: { id: true, name: true, role: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({ success: true, count: logs.length, data: logs });
});

export const getDocumentLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const log = await prisma.documentLog.findUnique({
    where: { id: req.params.id, organizationId: req.user.organizationId },
    include: { student: true }
  });
  if (!log) {
    res.status(404).json({ success: false, message: 'Document log not found' });
    return;
  }
  res.status(200).json({ success: true, data: log });
});

export const createDocumentLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, type, documentName, documentType, status, notes, courierName, trackingNumber, dispatchDate, deliveryDate } = req.body;
  
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

export const updateDocumentLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, notes, courierName, trackingNumber, dispatchDate, deliveryDate } = req.body;
  
  const log = await prisma.documentLog.update({
    where: { id: req.params.id, organizationId: req.user.organizationId },
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
