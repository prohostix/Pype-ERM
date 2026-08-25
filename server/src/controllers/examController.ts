import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getExamRegistrations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, semester } = req.query;
  const where: any = { organizationId: req.user.organizationId };
  if (status) where.status = status as string;
  if (semester) where.semester = semester as string;

  const registrations = await prisma.examRegistration.findMany({
    where,
    include: {
      student: {
        select: { id: true, name: true, enrollmentNo: true, programId: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({ success: true, count: registrations.length, data: registrations });
});

export const getExamRegistration = asyncHandler(async (req: AuthRequest, res: Response) => {
  const registration = await prisma.examRegistration.findUnique({
    where: { id: req.params.id, organizationId: req.user.organizationId },
    include: {
      student: {
        select: { id: true, name: true, enrollmentNo: true, programId: true }
      }
    }
  });

  if (!registration) {
    res.status(404).json({ success: false, message: 'Exam registration not found' });
    return;
  }

  res.status(200).json({ success: true, data: registration });
});

export const createExamRegistration = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, semester, subjectCodes, examCenter, status } = req.body;
  
  const registration = await prisma.examRegistration.create({
    data: {
      organizationId: req.user.organizationId!,
      studentId,
      semester,
      subjectCodes,
      examCenter,
      status: status || 'pending'
    }
  });

  res.status(201).json({ success: true, data: registration });
});

export const updateExamRegistration = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { semester, subjectCodes, examCenter, status } = req.body;
  
  const registration = await prisma.examRegistration.update({
    where: { id: req.params.id, organizationId: req.user.organizationId },
    data: {
      semester,
      subjectCodes,
      examCenter,
      status
    }
  });

  res.status(200).json({ success: true, data: registration });
});

export const deleteExamRegistration = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.examRegistration.delete({
    where: { id: req.params.id, organizationId: req.user.organizationId }
  });

  res.status(200).json({ success: true, data: {} });
});
