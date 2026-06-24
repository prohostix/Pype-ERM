import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendEmail } from '../utils/emailService.js';

// ── Payment Reminders ────────────────────────────────────────────────────────

export const getOverdueSchedules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const filter = req.query.filter as string || 'all'; // all | overdue | week | month

  let dueBefore: Date | undefined;
  let dueAfter: Date | undefined;

  if (filter === 'overdue') {
    dueBefore = now;
  } else if (filter === 'week') {
    dueAfter = now;
    dueBefore = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else if (filter === 'month') {
    dueAfter = now;
    dueBefore = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  const where: any = {
    organizationId: req.user.organizationId,
    status: { in: ['pending', 'overdue'] },
  };
  if (dueBefore) where.dueDate = { ...(where.dueDate || {}), lte: dueBefore };
  if (dueAfter) where.dueDate = { ...(where.dueDate || {}), gte: dueAfter };

  const schedules = await prisma.paymentSchedule.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, email: true, phone: true, enrollmentNo: true, program: { select: { name: true } } } }
    },
    orderBy: { dueDate: 'asc' }
  });

  // Mark overdue ones
  const enriched = schedules.map(s => ({
    ...s,
    isOverdue: s.dueDate < now && s.status === 'pending'
  }));

  res.json({ success: true, count: enriched.length, data: enriched });
});

export const sendPaymentReminder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentIds, scheduleIds, subject, message, closingDate } = req.body;

  if (!studentIds?.length && !scheduleIds?.length) {
    res.status(400).json({ success: false, message: 'Provide studentIds or scheduleIds' });
    return;
  }

  let targetStudents: any[] = [];

  if (scheduleIds?.length) {
    const schedules = await prisma.paymentSchedule.findMany({
      where: { id: { in: scheduleIds }, organizationId: req.user.organizationId },
      include: { student: true }
    });
    targetStudents = schedules.map(s => ({ ...s.student, dueDate: s.dueDate, amount: s.amount, scheduleTitle: s.title }));
  } else {
    targetStudents = await prisma.student.findMany({
      where: { id: { in: studentIds }, organizationId: req.user.organizationId }
    });
  }

  let sent = 0;
  for (const student of targetStudents) {
    const emailBody = message
      .replace('{name}', student.name)
      .replace('{amount}', student.amount ? `₹${student.amount}` : '')
      .replace('{dueDate}', student.dueDate ? new Date(student.dueDate).toLocaleDateString('en-IN') : '')
      .replace('{closingDate}', closingDate || '');

    const htmlBody = `<p>Dear <strong>${student.name}</strong>,</p>${emailBody.split('\n').map((l: string) => `<p>${l}</p>`).join('')}<p>Regards,<br/>Finance Department</p>`;

    await sendEmail(
      student.email,
      subject || 'Payment Reminder',
      emailBody,
      htmlBody
    );
    sent++;
  }

  res.json({ success: true, message: `Reminder sent to ${sent} students` });
});

// ── Receipt Generation ────────────────────────────────────────────────────────

export const generateReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { invoiceId, paymentId } = req.params;

  let data: any = {};

  if (invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: { include: { program: { include: { university: true } } } },
        center: true,
        payments: true
      }
    });
    if (!invoice) { res.status(404).json({ success: false, message: 'Invoice not found' }); return; }
    data = {
      type: 'invoice',
      receiptNo: `RCP-${invoice.invoiceNo}`,
      date: invoice.paidAt || invoice.updatedAt,
      studentName: invoice.student?.name || 'N/A',
      studentEmail: invoice.student?.email || '',
      enrollmentNo: invoice.student?.enrollmentNo || '',
      program: invoice.student?.program?.name || '',
      university: invoice.student?.program?.university?.name || '',
      center: invoice.center?.name || 'Direct',
      items: invoice.items,
      amount: invoice.amount,
      tax: invoice.tax,
      total: invoice.total,
      status: invoice.status,
      payments: invoice.payments
    };
  } else if (paymentId) {
    const payment = await prisma.paymentEntry.findUnique({ where: { id: paymentId } });
    if (!payment) { res.status(404).json({ success: false, message: 'Payment not found' }); return; }
    data = { type: 'payment', ...payment };
  }

  res.json({ success: true, data });
});

// ── Invoice from Schedule ─────────────────────────────────────────────────────

export const getStudentPaymentPlan = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const schedules = await prisma.paymentSchedule.findMany({
    where: { studentId, organizationId: req.user.organizationId },
    include: { invoices: true },
    orderBy: { dueDate: 'asc' }
  });
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { program: { include: { university: true } } }
  });
  res.json({ success: true, data: { student, schedules } });
});

export const generateInvoiceFromSchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { scheduleId } = req.params;

  const schedule = await prisma.paymentSchedule.findUnique({
    where: { id: scheduleId },
    include: { student: { include: { program: true } } }
  });
  if (!schedule) { res.status(404).json({ success: false, message: 'Schedule not found' }); return; }

  // Check not already invoiced
  const existing = await prisma.invoice.findFirst({ where: { scheduleId } });
  if (existing) {
    res.status(400).json({ success: false, message: 'Invoice already generated for this installment', data: existing });
    return;
  }

  const invNo = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const invoice = await prisma.invoice.create({
    data: {
      organizationId: req.user.organizationId,
      studentId: schedule.studentId,
      scheduleId,
      invoiceNo: invNo,
      amount: schedule.amount,
      tax: 0,
      total: schedule.amount,
      status: 'pending',
      dueDate: schedule.dueDate,
      notes: schedule.title,
      items: [{ description: schedule.title, amount: schedule.amount }]
    }
  });

  res.status(201).json({ success: true, data: invoice });
});

export const generateAllInvoicesForStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;

  const schedules = await prisma.paymentSchedule.findMany({
    where: { studentId, organizationId: req.user.organizationId },
    include: { invoices: true }
  });

  const results = { created: 0, skipped: 0 };
  for (const schedule of schedules) {
    if (schedule.invoices.length > 0) { results.skipped++; continue; }
    const invNo = `INV-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    await prisma.invoice.create({
      data: {
        organizationId: req.user.organizationId,
        studentId,
        scheduleId: schedule.id,
        invoiceNo: invNo,
        amount: schedule.amount,
        tax: 0,
        total: schedule.amount,
        status: 'pending',
        dueDate: schedule.dueDate,
        notes: schedule.title,
        items: [{ description: schedule.title, amount: schedule.amount }]
      }
    });
    results.created++;
  }

  res.json({ success: true, data: results });
});

// ── Bulk Old Fees ─────────────────────────────────────────────────────────────

export const bulkCreateOldFees = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { fees } = req.body; // Array of { enrollmentNo, studentId, amount, description, dueDate }

  if (!Array.isArray(fees) || fees.length === 0) {
    res.status(400).json({ success: false, message: 'No fee records provided' });
    return;
  }

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const fee of fees) {
    try {
      let studentId = fee.studentId;

      // Resolve by enrollmentNo if no studentId
      if (!studentId && fee.enrollmentNo) {
        const student = await prisma.student.findFirst({
          where: { enrollmentNo: fee.enrollmentNo, organizationId: req.user.organizationId }
        });
        if (!student) {
          results.skipped++;
          results.errors.push(`Student not found: ${fee.enrollmentNo}`);
          continue;
        }
        studentId = student.id;
      }

      if (!studentId) { results.skipped++; results.errors.push(`Missing student reference`); continue; }

      await prisma.paymentSchedule.create({
        data: {
          organizationId: req.user.organizationId,
          studentId,
          title: fee.description || 'Old Fee Arrear',
          amount: parseFloat(fee.amount),
          dueDate: fee.dueDate ? new Date(fee.dueDate) : new Date(),
          status: 'overdue',
          isOldFee: true,
          remarks: fee.remarks || 'Imported as historical arrear'
        }
      });
      results.created++;
    } catch (err: any) {
      results.skipped++;
      results.errors.push(err.message);
    }
  }

  res.json({ success: true, data: results });
});

export const getOldFees = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fees = await prisma.paymentSchedule.findMany({
    where: { organizationId: req.user.organizationId, isOldFee: true },
    include: {
      student: { select: { name: true, email: true, enrollmentNo: true, program: { select: { name: true } } } }
    },
    orderBy: { dueDate: 'asc' }
  });
  res.json({ success: true, count: fees.length, data: fees });
});

// ── Payment Gateway ───────────────────────────────────────────────────────────

export const generatePaymentLink = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, scheduleId, invoiceId, amount, description, expiryDays } = req.body;

  if (!studentId || !amount) {
    res.status(400).json({ success: false, message: 'studentId and amount are required' });
    return;
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (expiryDays || 30));

  const link = await prisma.paymentLink.create({
    data: {
      organizationId: req.user.organizationId,
      studentId,
      scheduleId: scheduleId || null,
      invoiceId: invoiceId || null,
      amount: parseFloat(amount),
      description: description || 'Fee Payment',
      status: 'active',
      expiresAt,
      createdBy: req.user.id
    },
    include: { student: { select: { name: true, email: true } } }
  });

  const paymentUrl = `${process.env.FRONTEND_URL || 'http://localhost:5579'}/pay/${link.token}`;

  res.status(201).json({ success: true, data: { ...link, paymentUrl } });
});

export const getPaymentLinks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const links = await prisma.paymentLink.findMany({
    where: { organizationId: req.user.organizationId },
    include: {
      student: { select: { name: true, email: true, enrollmentNo: true } },
      schedule: { select: { title: true, dueDate: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Auto-expire
  const now = new Date();
  const enriched = links.map(l => ({
    ...l,
    status: l.paidAt ? 'paid' : (l.expiresAt < now ? 'expired' : l.status),
    paymentUrl: `${process.env.FRONTEND_URL || 'http://localhost:5579'}/pay/${l.token}`
  }));

  res.json({ success: true, count: enriched.length, data: enriched });
});

export const updatePaymentLinkStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const link = await prisma.paymentLink.update({
    where: { id: req.params.id },
    data: { status, ...(status === 'paid' ? { paidAt: new Date() } : {}) }
  });
  res.json({ success: true, data: link });
});
