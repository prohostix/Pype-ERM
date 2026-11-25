import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { PageRequest } from '../access/pageGuard.js';
import { studentBranchWhere } from '../access/studentRules.js';

/** Someone given this page works with the students of their own branch */
const givenStudents = (req: PageRequest) =>
  (req.ownBranchOnly && req.user.branchId ? { AND: [{ student: studentBranchWhere(req.user.branchId) }] } : {});

export const getExamRegistrations = asyncHandler(async (req: PageRequest, res: Response) => {
  const { status, semester } = req.query;
  const where: any = { organizationId: req.user.organizationId };
  if (status) where.status = status as string;
  if (semester) where.semester = semester as string;

  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    
    where.OR = [
      { student: { enrolledBy: null } },
      { student: { referredBy: null } },
      { student: { enrolledBy: { in: assignedIds } } },
      { student: { referredBy: { in: assignedIds } } }
    ];
  }
  Object.assign(where, givenStudents(req));

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

export const getExamRegistration = asyncHandler(async (req: PageRequest, res: Response) => {
  let whereClause: any = { id: req.params.id, organizationId: req.user.organizationId };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    whereClause.OR = [
      { student: { enrolledBy: null, referredBy: null } },
      { student: { enrolledBy: { in: assignedIds } } },
      { student: { referredBy: { in: assignedIds } } }
    ];
  }

  const registration = await prisma.examRegistration.findFirst({
    where: { ...whereClause, ...givenStudents(req) },
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

export const createExamRegistration = asyncHandler(async (req: PageRequest, res: Response) => {
  const { studentId, semester, subjectCodes, examCenter, status } = req.body;
  
  const student = await prisma.student.findFirst({
    where: { id: studentId || '', organizationId: req.user.organizationId, ...(req.ownBranchOnly && studentBranchWhere(req.user.branchId)) },
    select: { id: true }
  });
  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }
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

export const updateExamRegistration = asyncHandler(async (req: PageRequest, res: Response) => {
  const { semester, subjectCodes, examCenter, status } = req.body;
  
  let whereClause: any = { id: req.params.id, organizationId: req.user.organizationId };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    whereClause.OR = [
      { student: { enrolledBy: null, referredBy: null } },
      { student: { enrolledBy: { in: assignedIds } } },
      { student: { referredBy: { in: assignedIds } } }
    ];
  }

  const existing = await prisma.examRegistration.findFirst({ where: { ...whereClause, ...givenStudents(req) } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Exam registration not found or unauthorized' });
    return;
  }

  const registration = await prisma.examRegistration.update({
    where: { id: req.params.id },
    data: {
      semester,
      subjectCodes,
      examCenter,
      status
    }
  });

  res.status(200).json({ success: true, data: registration });
});

export const deleteExamRegistration = asyncHandler(async (req: PageRequest, res: Response) => {
  const removed = await prisma.examRegistration.deleteMany({
    where: { id: req.params.id, organizationId: req.user.organizationId, ...givenStudents(req) }
  });
  if (!removed.count) {
    res.status(404).json({ success: false, message: 'Exam registration not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});
