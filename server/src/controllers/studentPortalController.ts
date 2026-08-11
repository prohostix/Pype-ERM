import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Helper: get the Student record linked to the logged-in user (via email)
async function getLinkedStudent(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return prisma.student.findUnique({
    where: { email: user.email },
    include: {
      program: true,
      center: true,
      organization: true,
      session: true,
      enrollments: {
        include: { session: true, program: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
}

// GET /student-portal/profile
export const getStudentProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) {
    res.status(404).json({ success: false, message: 'No student record linked to this account' });
    return;
  }
  res.json({ success: true, data: student });
});

// GET /student-portal/notifications
export const getStudentNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  // Also fetch announcements for the org
  const announcements = await prisma.announcement.findMany({
    where: { organizationId: req.user.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json({ success: true, data: { notifications, announcements } });
});

// GET /student-portal/materials
export const getStudentMaterials = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) {
    res.json({ success: true, data: [] });
    return;
  }
  const materials = await prisma.programMaterial.findMany({
    where: { programId: student.programId, organizationId: req.user.organizationId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: materials });
});

// GET /student-portal/fees
export const getStudentFees = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) {
    res.json({ success: true, data: { schedules: [], feeStructures: [] } });
    return;
  }
  const schedules = await prisma.paymentSchedule.findMany({
    where: { studentId: student.id },
    orderBy: { dueDate: 'asc' },
  });
  const feeStructures = await prisma.feeStructure.findMany({
    where: {
      organizationId: req.user.organizationId,
      OR: [
        { programId: student.programId },
        { programId: null },
      ],
    },
    include: { program: true, university: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: { schedules, feeStructures } });
});

// GET /student-portal/invoices
export const getStudentInvoices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  if (!student) {
    res.json({ success: true, data: [] });
    return;
  }
  const invoices = await prisma.invoice.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: 'desc' },
    include: { payments: true },
  });
  res.json({ success: true, data: invoices });
});

// POST /student-portal/refer
export const submitReferral = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await getLinkedStudent(req.user.id);
  const studentName = student ? student.name : req.user.name;

  const { centerName, contactName, email, phone, address, notes } = req.body;

  const lead = await prisma.lead.create({
    data: {
      organizationId: req.user.organizationId,
      centerName: centerName || 'Direct',
      contactName,
      email,
      phone: phone || '',
      address: address || '',
      source: 'referral',
      referredBy: req.user.id,
      notes: `Referred by student: ${studentName} (${req.user.email}). ${notes || ''}`
    }
  });

  res.status(201).json({ success: true, data: lead });
});
