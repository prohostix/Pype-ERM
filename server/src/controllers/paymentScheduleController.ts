import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPaymentSchedules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, status } = req.query;
  const where: any = { organizationId: req.user.organizationId };

  if (studentId) where.studentId = studentId as string;
  if (status) where.status = status as string;

  const schedules = await prisma.paymentSchedule.findMany({
    where,
    include: {
      student: {
        select: {
          name: true,
          email: true,
          phone: true,
          enrollmentNo: true
        }
      }
    },
    orderBy: { dueDate: 'asc' }
  });

  res.status(200).json({ success: true, count: schedules.length, data: schedules });
});

export const createPaymentSchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, title, amount, dueDate, remarks } = req.body;

  if (!studentId || !title || !amount || !dueDate) {
    res.status(400).json({ success: false, message: 'Please provide studentId, title, amount, and dueDate' });
    return;
  }

  const schedule = await prisma.paymentSchedule.create({
    data: {
      organizationId: req.user.organizationId,
      studentId,
      title,
      amount: parseFloat(amount),
      dueDate: new Date(dueDate),
      status: 'pending',
      remarks
    },
    include: {
      student: true
    }
  });

  res.status(201).json({ success: true, data: schedule });
});

export const updatePaymentSchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, amount, dueDate, status, remarks, paidAt } = req.body;

  const exists = await prisma.paymentSchedule.findFirst({
    where: { id, organizationId: req.user.organizationId }
  });

  if (!exists) {
    res.status(404).json({ success: false, message: 'Payment schedule not found' });
    return;
  }

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (amount !== undefined) updateData.amount = parseFloat(amount);
  if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
  if (status !== undefined) {
    updateData.status = status;
    if (status === 'paid') {
      updateData.paidAt = paidAt ? new Date(paidAt) : new Date();
    } else {
      updateData.paidAt = null;
    }
  }
  if (remarks !== undefined) updateData.remarks = remarks;

  const schedule = await prisma.paymentSchedule.update({
    where: { id },
    data: updateData,
    include: {
      student: true
    }
  });

  res.status(200).json({ success: true, data: schedule });
});

export const deletePaymentSchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const exists = await prisma.paymentSchedule.findFirst({
    where: { id, organizationId: req.user.organizationId }
  });

  if (!exists) {
    res.status(404).json({ success: false, message: 'Payment schedule not found' });
    return;
  }

  await prisma.paymentSchedule.delete({ where: { id } });

  res.status(200).json({ success: true, data: {} });
});
