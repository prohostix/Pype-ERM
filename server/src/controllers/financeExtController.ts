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
        payments: true,
        organization: true
      }
    });
    if (!invoice) { res.status(404).json({ success: false, message: 'Invoice not found' }); return; }

    let overallProgramFee = invoice.total;
    let overallPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    let universityFee = 0;

    let actualStudentId = invoice.studentId;
    let fallbackEnrollment: any = null;
    let matchedEnrollment: any = null;

    // 1. If invoice has payments, check enrollmentPayment to find exact enrollment linked to payment
    if (invoice.payments.length > 0) {
      const payment = invoice.payments[0];
      const envPayment = await prisma.enrollmentPayment.findFirst({
        where: {
          amount: payment.amount,
          ...(actualStudentId ? { enrollment: { studentId: actualStudentId } } : {})
        },
        include: { enrollment: { include: { program: { include: { university: true } } } } },
        orderBy: { createdAt: 'desc' }
      });
      if (envPayment && envPayment.enrollment) {
        matchedEnrollment = envPayment.enrollment;
        if (!actualStudentId && matchedEnrollment.studentId) {
          actualStudentId = matchedEnrollment.studentId;
        }
      }
    }

    // 2. If it is a provisional or admission invoice, find matching enrollment
    const isProvisionalOrAdmission = invoice.invoiceNo?.startsWith('INV-PROV-') || 
                                     invoice.invoiceNo?.startsWith('INV-AUTO-') ||
                                     invoice.notes?.includes('Provisional') ||
                                     invoice.notes?.includes('Admission');

    if (!matchedEnrollment && isProvisionalOrAdmission && actualStudentId) {
      matchedEnrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: actualStudentId,
          ...(invoice.invoiceNo?.startsWith('INV-PROV-') || invoice.notes?.includes('Provisional') ? { isProvisional: true } : {})
        },
        include: { program: { include: { university: true } } },
        orderBy: { createdAt: 'desc' }
      });
    }

    // 3. Fallback for unlinked invoice without studentId
    if (!actualStudentId && invoice.payments.length > 0) {
      const payment = invoice.payments[0];
      const envPayment = await prisma.enrollmentPayment.findFirst({
        where: { amount: payment.amount },
        include: { enrollment: { include: { program: { include: { university: true } } } } }
      });
      if (envPayment && envPayment.enrollment) {
        fallbackEnrollment = envPayment.enrollment;
        if (fallbackEnrollment.studentId) {
          actualStudentId = fallbackEnrollment.studentId;
        }
      }
    }

    let actualStudent: any = invoice.student;
    if (actualStudentId && !actualStudent) {
      actualStudent = await prisma.student.findUnique({ where: { id: actualStudentId }, include: { program: { include: { university: true } } } });
    }

    let studentPaymentHistory: any[] = [];
    let studentInvoices: any[] = [];

    if (actualStudentId) {
      const schedules = await prisma.paymentSchedule.findMany({ where: { studentId: actualStudentId } });
      if (schedules.length > 0) {
        overallProgramFee = schedules.reduce((acc, curr) => acc + curr.amount, 0);
      }

      studentInvoices = await prisma.invoice.findMany({
        where: { studentId: actualStudentId },
        include: { payments: true },
        orderBy: { createdAt: 'asc' }
      });
      overallPaid = studentInvoices.reduce((acc: number, inv: any) => acc + (inv.payments || []).reduce((s: number, p: any) => s + p.amount, 0), 0);
      
      // If this invoice itself isn't linked to the student in DB yet, add its paid amount to the total
      if (!invoice.studentId) {
        overallPaid += invoice.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
      }

      // Collect all payments from student's invoices
      studentInvoices.forEach((inv: any) => {
        (inv.payments || []).forEach((p: any) => {
          studentPaymentHistory.push({
            id: p.id,
            date: p.receivedAt || p.createdAt,
            amount: p.amount,
            method: p.method || 'CASH',
            referenceNo: p.referenceNo || `RCP-${inv.invoiceNo}`,
            invoiceNo: inv.invoiceNo,
            notes: p.notes || ''
          });
        });
      });

      // Include initial payment from student enrollment if present
      const studentEnrollments = await prisma.enrollment.findMany({
        where: { studentId: actualStudentId }
      });
      for (const enr of studentEnrollments) {
        if (enr.initialPaymentAmount && enr.initialPaymentAmount > 0) {
          const alreadyExists = studentPaymentHistory.some(p => Math.abs(p.amount - (enr.initialPaymentAmount || 0)) < 0.01);
          if (!alreadyExists) {
            studentPaymentHistory.unshift({
              id: `enr-${enr.id}`,
              date: enr.initialPaymentDate || enr.createdAt,
              amount: enr.initialPaymentAmount,
              method: 'ONLINE / DIRECT',
              referenceNo: 'PROVISIONAL / ADMISSION',
              invoiceNo: 'INIT-FEE',
              notes: 'Initial Admission Payment'
            });
          }
        }
      }
    }

    // Fallback if studentPaymentHistory is still empty but current invoice has payments
    if (studentPaymentHistory.length === 0 && invoice.payments.length > 0) {
      invoice.payments.forEach(p => {
        studentPaymentHistory.push({
          id: p.id,
          date: p.receivedAt || p.createdAt,
          amount: p.amount,
          method: p.method || 'CASH',
          referenceNo: p.referenceNo || `RCP-${invoice.invoiceNo}`,
          invoiceNo: invoice.invoiceNo,
          notes: p.notes || ''
        });
      });
    }

    studentPaymentHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (studentPaymentHistory.length > 0) {
      overallPaid = studentPaymentHistory.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    }

    // For academic schedule invoices (scheduleId present), respect the student's scheduled academic course.
    // For admission / provisional invoices or unlinked receipts, prioritize the matched enrollment.
    let activeProgram: any = null;
    let activeSpecialisation: any = null;

    if (invoice.scheduleId) {
      activeProgram = actualStudent?.program || fallbackEnrollment?.program;
      activeSpecialisation = actualStudent?.specialisation || fallbackEnrollment?.specialisation;
    } else {
      activeProgram = matchedEnrollment?.program || actualStudent?.program || fallbackEnrollment?.program;
      activeSpecialisation = matchedEnrollment?.specialisation || actualStudent?.specialisation || fallbackEnrollment?.specialisation;
    }

    let targetProgramId = activeProgram?.id || invoice.student?.programId || fallbackEnrollment?.programId;
    let targetSpecialisation = activeSpecialisation;
    let totalFee = 0;
    let feeBreakdown: any = null;

    if (targetProgramId) {
      let feeStruct = null;
      if (targetSpecialisation) {
        feeStruct = await prisma.feeStructure.findFirst({
          where: { programId: targetProgramId, specialisation: targetSpecialisation, organizationId: invoice.organizationId }
        });
      }
      if (!feeStruct) {
        feeStruct = await prisma.feeStructure.findFirst({
          where: { programId: targetProgramId, organizationId: invoice.organizationId }
        });
      }
      if (feeStruct) {
        universityFee = feeStruct.universityFee || 0;

        let additionalTotal = 0;
        let additionalFeesList: any[] = [];
        if (Array.isArray(feeStruct.additionalFees)) {
          additionalFeesList = feeStruct.additionalFees as any[];
        } else if (typeof feeStruct.additionalFees === 'string') {
          try {
            const parsed = JSON.parse(feeStruct.additionalFees);
            if (Array.isArray(parsed)) additionalFeesList = parsed;
          } catch {}
        }
        additionalTotal = additionalFeesList.reduce((sum, f) => sum + (Number(f?.amount) || 0), 0);

        const regFee = Number(feeStruct.registrationFee) || 0;
        const tuitFee = Number(feeStruct.tuitionFee) || 0;
        const exFee = Number(feeStruct.examFee) || 0;

        let baseTotal = 0;
        if (Array.isArray(feeStruct.yearlyFees) && (feeStruct.yearlyFees as any[]).length > 0) {
          baseTotal = (feeStruct.yearlyFees as any[]).reduce((sum, yf) => {
            return sum + (Number(yf.registrationFee) || 0) + (Number(yf.tuitionFee) || 0) + (Number(yf.examFee) || 0);
          }, 0);
        }
        if (!baseTotal) {
          baseTotal = regFee + tuitFee + exFee;
        }

        totalFee = baseTotal + additionalTotal;
        feeBreakdown = {
          registrationFee: regFee,
          tuitionFee: tuitFee,
          examFee: exFee,
          additionalFees: additionalFeesList,
          additionalTotal
        };
      }
    }

    if (!totalFee && overallProgramFee) {
      totalFee = overallProgramFee;
    } else if (totalFee) {
      overallProgramFee = totalFee;
    }

    let studentName = actualStudent?.name || matchedEnrollment?.studentName || fallbackEnrollment?.studentName || 'N/A';
    let studentDob = actualStudent?.dob || matchedEnrollment?.dob || null;
    let studentEmail = actualStudent?.email || matchedEnrollment?.studentEmail || fallbackEnrollment?.studentEmail || '';
    let enrollmentNo = actualStudent?.enrollmentNo || matchedEnrollment?.enrollmentNumber || fallbackEnrollment?.enrollmentNumber || '';
    let admissionNo = actualStudent?.admissionNo || '';
    
    let programName = activeProgram?.name ? `${activeProgram.name}${activeSpecialisation ? ` - ${activeSpecialisation}` : ''}` : '';
    let universityName = activeProgram?.university?.name || '';

    // Determine the bill date:
    // Take the latest transaction date FOR THIS SPECIFIC BILL / INVOICE
    let billTransactionDate: Date | null = null;

    // 1. Check direct payments recorded on this invoice
    if (invoice.payments && invoice.payments.length > 0) {
      const sortedThisPayments = [...invoice.payments].sort(
        (a, b) => new Date(b.receivedAt || b.createdAt).getTime() - new Date(a.receivedAt || a.createdAt).getTime()
      );
      const latestPayment = sortedThisPayments[0];
      const pDate = latestPayment?.receivedAt || latestPayment?.createdAt;
      if (pDate) {
        billTransactionDate = new Date(pDate);
      }
    }

    // 2. If this invoice is a provisional or admission fee, check matched enrollment initial payment
    if (!billTransactionDate && isProvisionalOrAdmission) {
      const enrDate = matchedEnrollment?.initialPaymentDate || fallbackEnrollment?.initialPaymentDate;
      if (enrDate) {
        billTransactionDate = new Date(enrDate);
      }
    }

    // 3. Check student payment history entries that belong specifically to this invoice
    if (!billTransactionDate && studentPaymentHistory.length > 0) {
      const currentInvNo = invoice.invoiceNo ? invoice.invoiceNo.replace('RCP-', '').trim() : '';
      const matchingHistory = studentPaymentHistory.filter((p: any) => {
        const pInv = (p.invoiceNo || '').replace('RCP-', '').trim();
        const pRef = (p.referenceNo || '').replace('RCP-', '').trim();
        return (currentInvNo && (pInv === currentInvNo || pRef === currentInvNo));
      });
      if (matchingHistory.length > 0) {
        const lastMatching = matchingHistory[matchingHistory.length - 1];
        if (lastMatching.date) billTransactionDate = new Date(lastMatching.date);
      }
    }

    // Fallback only if no transaction was recorded for this bill
    const latestTransactionDate = billTransactionDate || invoice.paidAt || invoice.createdAt || invoice.updatedAt;

    data = {
      type: 'invoice',
      receiptNo: `RCP-${invoice.invoiceNo}`,
      date: latestTransactionDate,
      billDate: latestTransactionDate,
      latestBillDate: latestTransactionDate,
      latestTransactionDate,
      studentName,
      studentDob,
      studentEmail,
      enrollmentNo,
      admissionNo,
      program: programName,
      university: universityName,
      center: invoice.center?.name || 'Direct',
      items: invoice.items,
      amount: invoice.amount,
      tax: invoice.tax,
      total: invoice.total,
      status: invoice.status,
      payments: invoice.payments,
      paymentHistory: studentPaymentHistory,
      organization: invoice.organization,
      balanceDue: Math.max(0, invoice.total - invoice.payments.reduce((sum, p) => sum + p.amount, 0)),
      totalFee,
      feeBreakdown,
      overallProgramFee,
      overallPaid,
      overallBalance: Math.max(0, overallProgramFee - overallPaid),
      universityFee
    };
  } else if (paymentId) {
    const payment = await prisma.paymentEntry.findUnique({ where: { id: paymentId } });
    if (!payment) { res.status(404).json({ success: false, message: 'Payment not found' }); return; }
    const paymentDate = payment.receivedAt || payment.createdAt;
    data = { 
      type: 'payment', 
      receiptNo: payment.referenceNo ? `RCP-${payment.referenceNo}` : `RCP-${payment.id.slice(0, 8).toUpperCase()}`,
      date: paymentDate,
      billDate: paymentDate,
      latestBillDate: paymentDate,
      ...payment 
    };
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

export const getStudentPaymentsLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const students = await prisma.student.findMany({
    where: { organizationId: req.user.organizationId },
    select: {
      id: true,
      name: true,
      enrollmentNo: true,
      sessionId: true,
      specialisation: true,
      joinDate: true,
      program: {
        select: { 
          name: true,
          feeStructures: true
        }
      },
      university: {
        select: {
          id: true,
          name: true,
          feeStructures: true
        }
      },
      branch: {
        select: {
          id: true,
          name: true
        }
      },
      paymentSchedules: true,
      invoices: {
        include: {
          payments: true
        }
      },
      enrollments: {
        where: {
          status: { notIn: ['rejected', 'ops_rejected', 'cancelled'] }
        },
        select: {
          paymentPlan: true,
          initialPaymentAmount: true,
          program: {
            select: {
              name: true,
              university: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      discountAmount: true,
      discountReason: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const logs = students.map(student => {
    let scheduledFee = student.paymentSchedules.reduce((sum, ps) => sum + (ps.amount || 0), 0);
    
    // Calculate total extra fees paid from invoices linked to extra fee schedules
    const extraFeesPaid = student.invoices.reduce((sum, inv) => {
      const isExtra = student.paymentSchedules.some(ps => ps.id === inv.scheduleId && ps.isExtraFee);
      if (isExtra) {
        return sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0);
      }
      return sum;
    }, 0);

    const enrollment = student.enrollments?.[0];
    const initialPayment = enrollment?.initialPaymentAmount || 0;
    const paymentPlan = enrollment?.paymentPlan || 'N/A';

    // Calculate total standard fees paid from invoices NOT linked to extra fee schedules
    let totalPaid = student.invoices.reduce((sum, inv) => {
      const isExtra = student.paymentSchedules.some(ps => ps.id === inv.scheduleId && ps.isExtraFee);
      if (!isExtra) {
        return sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0);
      }
      return sum;
    }, 0);

    // Check if initial payment was already invoiced/paid to prevent double counting
    const hasInitialInvoice = student.invoices.some(inv =>
      (inv.invoiceNo.startsWith('INV-AUTO') ||
       inv.invoiceNo.startsWith('INV-PROV') ||
       inv.notes?.toLowerCase().includes('initial') ||
       inv.notes?.toLowerCase().includes('provisional')) &&
      inv.payments.length > 0
    );

    if (!hasInitialInvoice && initialPayment > 0) {
      totalPaid += initialPayment;
    }
      
    let totalFee = scheduledFee;
    let breakdown: any[] = [];
    
    let feeSt: any = undefined;
    
    if (student.program?.feeStructures?.length) {
       feeSt = student.program.feeStructures.find((fs: any) => fs.sessionId === student.sessionId && fs.specialisation === student.specialisation);
       if (!feeSt) feeSt = student.program.feeStructures.find((fs: any) => fs.sessionId === student.sessionId && !fs.specialisation);
       if (!feeSt) feeSt = student.program.feeStructures[0];
    }
    
    if (!feeSt && student.university?.feeStructures?.length) {
       feeSt = student.university.feeStructures.find((fs: any) => fs.sessionId === student.sessionId && fs.specialisation === student.specialisation);
       if (!feeSt) feeSt = student.university.feeStructures.find((fs: any) => fs.sessionId === student.sessionId && !fs.specialisation);
       if (!feeSt) feeSt = student.university.feeStructures[0];
    }
    
    if (feeSt) {
      let baseTotal = (feeSt.registrationFee || 0) + (feeSt.tuitionFee || 0) + (feeSt.examFee || 0);
      
      let structureTotal = baseTotal;
      let remainingPaid = totalPaid - extraFeesPaid;
      
      if (Array.isArray(feeSt.yearlyFees) && feeSt.yearlyFees.length > 0) {
        structureTotal = 0; // Prevent double-counting as root fields are aggregates
        feeSt.yearlyFees.forEach((yf: any) => {
          const yfTotal = (Number(yf.registrationFee) || 0) + (Number(yf.tuitionFee) || 0) + (Number(yf.examFee) || 0);
          
          let yfPaid = 0;
          if (remainingPaid >= yfTotal) {
            yfPaid = yfTotal;
            remainingPaid -= yfTotal;
          } else {
            yfPaid = remainingPaid;
            remainingPaid = 0;
          }
          
          const yearOffset = yf.year ? Number(yf.year) - 1 : breakdown.length;
          const calculatedDueDate = student.joinDate ? new Date(new Date(student.joinDate).setFullYear(new Date(student.joinDate).getFullYear() + yearOffset)) : null;

          let cyclePrefix = 'Year';
          if (feeSt.billingCycle === 'per_semester') cyclePrefix = 'Sem';
          else if (feeSt.billingCycle === 'per_month') cyclePrefix = 'Month';
          else if (feeSt.billingCycle === 'one_time') cyclePrefix = 'Installment';

          breakdown.push({
            year: yf.year ? `${cyclePrefix} ${yf.year}` : `${cyclePrefix} ${breakdown.length + 1}`,
            totalFee: yfTotal,
            paid: yfPaid,
            balance: yfTotal - yfPaid,
            dueDate: calculatedDueDate
          });
          
          structureTotal += yfTotal;
        });
      } else {
        // Fallback if no yearly fees defined
        breakdown.push({
          year: 'Program Fee',
          totalFee: structureTotal,
          paid: totalPaid,
          balance: Math.max(0, structureTotal - totalPaid),
          dueDate: student.joinDate ? new Date(student.joinDate) : null
        });
      }
      
      if (structureTotal > totalFee) {
        totalFee = structureTotal;
      }
      
      // Append extra fees
      student.paymentSchedules.filter(ps => ps.isExtraFee).forEach(ps => {
        const psPaid = student.invoices
          .filter(inv => inv.scheduleId === ps.id)
          .flatMap(inv => inv.payments)
          .reduce((sum, p) => sum + p.amount, 0);
          
        breakdown.push({
          scheduleId: ps.id,
          year: ps.title,
          totalFee: ps.amount,
          paid: psPaid,
          balance: Math.max(0, ps.amount - psPaid),
          dueDate: ps.dueDate
        });
        totalFee += ps.amount;
      });
    } else {
       breakdown.push({
         year: 'Total Fee',
         totalFee: scheduledFee,
         paid: totalPaid,
         balance: Math.max(0, scheduledFee - totalPaid)
       });
    }
    
    // Apply discount
    const discount = student.discountAmount || 0;
    totalFee = Math.max(0, totalFee - discount);

    const balance = totalFee - totalPaid;
    const status = (balance <= 0 && totalFee > 0) ? 'Completed' : 'Pending';

    const latestEnrollment = student.enrollments?.[0];
    const displayProgram = latestEnrollment?.program?.name || student.program?.name || 'N/A';
    const displayUniversity = latestEnrollment?.program?.university?.name || student.university?.name || 'N/A';

    return {
      studentId: student.id,
      name: student.name,
      enrollmentNo: student.enrollmentNo,
      programName: displayProgram,
      universityName: displayUniversity,
      branchName: student.branch?.name || 'N/A',
      paymentPlan,
      totalFee,
      totalPaid,
      balance,
      status,
      breakdown,
      discountAmount: student.discountAmount || 0,
      discountReason: student.discountReason
    };
  });

  res.status(200).json({ success: true, count: logs.length, data: logs });
});

export const getDiscounts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const students = await prisma.student.findMany({
    where: { 
      organizationId: req.user.organizationId,
      discountAmount: { gt: 0 }
    },
    select: {
      id: true,
      name: true,
      enrollmentNo: true,
      discountAmount: true,
      discountReason: true,
      program: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' }
  });

  res.status(200).json({ success: true, count: students.length, data: students });
});

export const applyDiscount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, discountAmount, discountReason } = req.body;

  if (!studentId || discountAmount === undefined) {
    res.status(400).json({ success: false, message: 'Please provide studentId and discountAmount' });
    return;
  }

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      organizationId: req.user.organizationId
    }
  });

  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  const updatedStudent = await prisma.student.update({
    where: { id: studentId },
    data: {
      discountAmount: Number(discountAmount),
      discountReason
    },
    select: {
      id: true,
      name: true,
      enrollmentNo: true,
      discountAmount: true,
      discountReason: true,
      program: { select: { name: true } },
    }
  });

  res.status(200).json({ success: true, data: updatedStudent });
});

export const addExtraFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const { studentId, title, amount, dueDate, remarks } = req.body;

  if (!studentId || !title || !amount || !dueDate) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId, organizationId }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const extraFee = await prisma.paymentSchedule.create({
      data: {
        organizationId,
        studentId,
        title,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        remarks,
        isExtraFee: true
      }
    });

    res.status(201).json({ success: true, data: extraFee });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add extra fee' });
  }
});
