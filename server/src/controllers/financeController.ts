import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';
import { sendEmail } from '../utils/emailService.js';

// Invoices
export const getInvoices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  if (req.query.studentId) where.studentId = req.query.studentId as string;

  // Branch-level isolation for invoices list
  const globalRoles = ['superadmin', 'org_admin', 'ceo', 'general_manager', 'hr_admin', 'hr_sub_admin', 'finance_admin', 'finance_sub_admin', 'ops_admin', 'ops_sub_admin', 'sales_admin', 'sales_sub_admin', 'sales', 'collections_admin'];
  if (!globalRoles.includes(req.user.role) && req.user.branchId) {
    where.branchId = req.user.branchId;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      center: { select: { name: true } },
      student: { select: { name: true } },
      payments: { select: { amount: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: invoices.length, data: invoices });
});
export const getInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId }
  });
  if (!invoice) {
    res.status(404).json({ success: false, message: 'Invoice not found' });
    return;
  }
  res.json({ success: true, data: invoice });
});
export const createInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: invoice });
});
export const updateInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.invoice.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Invoice not found' });
    return;
  }
  const { status, amount, tax, total, items, notes } = req.body;
  const updateData: any = {};
  if (status !== undefined) updateData.status = status;
  if (amount !== undefined) updateData.amount = Number(amount);
  if (tax !== undefined) updateData.tax = Number(tax);
  if (total !== undefined) updateData.total = Number(total);
  if (items !== undefined) updateData.items = items;
  if (notes !== undefined) updateData.notes = notes;
  const invoice = await prisma.invoice.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: invoice });
});
export const deleteInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.invoice.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Invoice not found' });
    return;
  }
  await prisma.invoice.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const approveInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.update({ where: { id: req.params.id }, data: { status: 'approved' } });
  res.json({ success: true, data: invoice });
});

// Payments
export const getPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };

  // Branch-level isolation for payments list
  const globalRoles = ['superadmin', 'org_admin', 'ceo', 'general_manager', 'hr_admin', 'hr_sub_admin', 'finance_admin', 'finance_sub_admin', 'ops_admin', 'ops_sub_admin', 'sales_admin', 'sales_sub_admin', 'sales', 'collections_admin'];
  if (!globalRoles.includes(req.user.role) && req.user.branchId) {
    where.branchId = req.user.branchId;
  }

  const payments = await prisma.paymentEntry.findMany({
    where,
    include: {
      invoice: {
        include: {
          student: true
        }
      }
    }
  });
  res.json({ success: true, count: payments.length, data: payments });
});
export const getPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payment = await prisma.paymentEntry.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId }
  });
  if (!payment) {
    res.status(404).json({ success: false, message: 'Payment not found' });
    return;
  }
  res.json({ success: true, data: payment });
});
export const createPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  let invoiceId = req.body.invoiceId;
  const scheduleId = req.body.scheduleId;

  // If a schedule is specified, try to find an existing invoice for it, or we will create one below
  if (!invoiceId && scheduleId) {
    const existingInvoice = await prisma.invoice.findFirst({ where: { scheduleId } });
    if (existingInvoice) {
      invoiceId = existingInvoice.id;
    }
  }

  // Auto-generate invoice if payment is recorded directly against student (no invoice selected)
  if (!invoiceId && req.body.studentId) {
    const student = await prisma.student.findUnique({
      where: { id: req.body.studentId },
      include: { program: true }
    });

    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    // Attempt to resolve program fee structure from db
    let invoiceTotal = Number(req.body.amount);
    let feeDescription = 'Program Admission Fees / Custom Invoice Item';
    let targetScheduleId: string | undefined = undefined;

    if (scheduleId) {
      const schedule = await prisma.paymentSchedule.findUnique({ where: { id: scheduleId } });
      if (schedule) {
        invoiceTotal = schedule.amount;
        feeDescription = schedule.title;
        targetScheduleId = schedule.id;
      }
    } else if (student.programId) {
      let feeStructure = await prisma.feeStructure.findFirst({
        where: { programId: student.programId, sessionId: student.sessionId || undefined, specialisation: student.specialisation || null }
      });
      if (!feeStructure && student.specialisation) {
        feeStructure = await prisma.feeStructure.findFirst({
          where: { programId: student.programId, sessionId: student.sessionId || undefined, specialisation: null }
        });
      }
      if (!feeStructure) {
        feeStructure = await prisma.feeStructure.findFirst({
          where: { programId: student.programId }
        });
      }
      if (feeStructure) {
        const base = (feeStructure.registrationFee || 0) + (feeStructure.tuitionFee || 0) + (feeStructure.examFee || 0);
        const gst = feeStructure.gstPercentage || 0;
        invoiceTotal = base + Math.round((base * gst) / 100);
        feeDescription = `Admission Fees for ${student.program?.name || 'Program'}`;
      }
    }

    // Auto-generate unique invoice number
    const random = Math.floor(1000 + Math.random() * 9000);
    const invoiceNo = `INV-AUTO-${Date.now().toString().slice(-4)}-${random}`;

    const newInvoice = await prisma.invoice.create({
      data: {
        organizationId: req.user.organizationId,
        studentId: student.id,
        centerId: student.centerId,
        scheduleId: targetScheduleId,
        invoiceNo,
        amount: invoiceTotal,
        tax: 0,
        total: invoiceTotal,
        status: 'approved',
        items: [{
          description: feeDescription,
          quantity: 1,
          rate: invoiceTotal,
          amount: invoiceTotal
        }]
      }
    });
    invoiceId = newInvoice.id;
  }

  if (!invoiceId) {
    res.status(400).json({ success: false, message: 'Invoice ID or Student ID is required' });
    return;
  }

  const payment = await prisma.paymentEntry.create({
    data: {
      amount: Number(req.body.amount),
      method: req.body.method || 'cash',
      referenceNo: req.body.referenceNo || null,
      invoiceId,
      organizationId: req.user.organizationId,
      receivedBy: req.user.id
    }
  });

  // Auto-update invoice status based on total payments received
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true }
  });
  if (invoice) {
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    let newStatus = invoice.status;
    if (totalPaid >= invoice.total) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partial';
    }
    if (newStatus !== invoice.status) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus, paidAt: totalPaid >= invoice.total ? new Date() : null }
      });
    }
    
    if (newStatus === 'paid' && invoice.scheduleId) {
      await prisma.paymentSchedule.update({
        where: { id: invoice.scheduleId },
        data: { status: 'paid', paidAt: new Date() }
      });
    }
  }

  // Include populated invoice in response to generate receipt immediately
  const populatedPayment = await prisma.paymentEntry.findUnique({
    where: { id: payment.id },
    include: {
      invoice: {
        include: {
          student: {
            include: {
              program: true,
              center: true
            }
          }
        }
      }
    }
  });

  res.status(201).json({ success: true, data: populatedPayment });
});
export const updatePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.paymentEntry.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Payment not found' });
    return;
  }
  const { amount, method, referenceNo, notes } = req.body;
  const updateData: any = {};
  if (amount !== undefined) updateData.amount = Number(amount);
  if (method !== undefined) updateData.method = method;
  if (referenceNo !== undefined) updateData.referenceNo = referenceNo;
  if (notes !== undefined) updateData.notes = notes;
  const payment = await prisma.paymentEntry.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: payment });
});
export const deletePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.paymentEntry.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Payment not found' });
    return;
  }
  await prisma.paymentEntry.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

// Expenses
export const getExpenses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  // Branch-level isolation
  const globalRoles = ['superadmin', 'org_admin', 'ceo', 'general_manager', 'hr_admin', 'hr_sub_admin', 'finance_admin', 'finance_sub_admin', 'ops_admin', 'ops_sub_admin', 'sales_admin', 'sales_sub_admin', 'collections_admin'];
  if (!globalRoles.includes(req.user.role) && req.user.branchId) {
    where.branchId = req.user.branchId;
  }
  const expenses = await prisma.expenseClaim.findMany({ where });
  res.json({ success: true, count: expenses.length, data: expenses });
});
export const getExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expense = await prisma.expenseClaim.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId }
  });
  if (!expense) {
    res.status(404).json({ success: false, message: 'Expense not found' });
    return;
  }
  res.json({ success: true, data: expense });
});
export const createExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expense = await prisma.expenseClaim.create({ data: { ...req.body, organizationId: req.user.organizationId, employeeId: req.user.id } });
  res.status(201).json({ success: true, data: expense });
});
export const updateExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.expenseClaim.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Expense not found' });
    return;
  }
  const { title, description, amount, category, date, receiptUrl } = req.body;
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (amount !== undefined) updateData.amount = Number(amount);
  if (category !== undefined) updateData.category = category;
  if (date !== undefined) updateData.date = new Date(date);
  if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl;
  const expense = await prisma.expenseClaim.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: expense });
});
export const deleteExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.expenseClaim.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Expense not found' });
    return;
  }
  await prisma.expenseClaim.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const approveExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expense = await prisma.expenseClaim.update({ where: { id: req.params.id }, data: { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() } });
  res.json({ success: true, data: expense });
});

import { handleTargetRollup, syncParentTargets } from '../utils/targetUtils.js';

// Targets
export const getTargets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  // Branch-level isolation
  const globalRoles = ['superadmin', 'org_admin', 'ceo', 'general_manager', 'hr_admin', 'hr_sub_admin', 'finance_admin', 'finance_sub_admin', 'ops_admin', 'ops_sub_admin', 'sales_admin', 'sales_sub_admin', 'collections_admin'];
  if (!globalRoles.includes(req.user.role) && req.user.branchId) {
    where.branchId = req.user.branchId;
  }
  const targets = await prisma.target.findMany({ where, include: { employee: true } });
  res.json({ success: true, count: targets.length, data: targets });
});
export const getTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await prisma.target.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId },
    include: { employee: true }
  });
  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }
  res.json({ success: true, data: target });
});
export const createTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await prisma.target.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  await handleTargetRollup(target.id, req.user.organizationId);
  await syncParentTargets(req.user.organizationId);
  res.status(201).json({ success: true, data: target });
});
export const updateTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.target.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }
  const { title, targetAmount, period, employeeId, branchId } = req.body;
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (targetAmount !== undefined) updateData.targetAmount = Number(targetAmount);
  if (period !== undefined) updateData.period = period;
  if (employeeId !== undefined) updateData.employeeId = employeeId;
  if (branchId !== undefined) updateData.branchId = branchId || null;
  const target = await prisma.target.update({ where: { id: req.params.id }, data: updateData });
  await handleTargetRollup(target.id, req.user.organizationId);
  await syncParentTargets(req.user.organizationId);
  res.json({ success: true, data: target });
});
export const deleteTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.target.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }
  await prisma.target.delete({ where: { id: req.params.id } });
  await syncParentTargets(req.user.organizationId);
  res.json({ success: true, data: {} });
});

// Fee Structures
export const getFeeStructures = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fees = await prisma.feeStructure.findMany({
    where: { organizationId: req.user.organizationId },
    include: {
      program: {
        include: { university: true }
      },
      session: true
    }
  });
  res.json({ success: true, count: fees.length, data: fees });
});
export const getFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fee = await prisma.feeStructure.findUnique({
    where: { id: req.params.id },
    include: {
      program: {
        include: { university: true }
      },
      session: true
    }
  });
  if (!fee) {
    res.status(404).json({ success: false, message: 'Fee structure not found' });
    return;
  }
  res.json({ success: true, data: fee });
});
export const createFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    programId,
    universityId,
    feeLevel,
    sessionId,
    registrationFee,
    tuitionFee,
    examFee,
    universityFee,
    commissionRate,
    yearlyFees,
    gstPercentage,
    billingCycle,
    currency,
    effectiveFrom,
    dueDate,
    additionalFees,
    allowInitialFee,
    specialisation,
    installments
  } = req.body;

  const data: any = {
    organizationId: req.user.organizationId,
    createdBy: req.user.id,
    feeLevel: feeLevel || 'program',
    programId: feeLevel === 'program' ? programId : null,
    specialisation: specialisation || null,
    universityId: universityId || null,
    sessionId: sessionId === '' || !sessionId ? null : sessionId,
    registrationFee: registrationFee ? parseFloat(registrationFee) : 0,
    tuitionFee: tuitionFee ? parseFloat(tuitionFee) : 0,
    examFee: examFee ? parseFloat(examFee) : 0,
    universityFee: universityFee ? parseFloat(universityFee) : 0,
    commissionRate: commissionRate ? parseFloat(commissionRate) : 0,
    yearlyFees: yearlyFees || [],
    gstPercentage: gstPercentage ? parseFloat(gstPercentage) : 18,
    billingCycle: billingCycle || 'per_year',
    currency: currency || 'INR',
    allowInitialFee: allowInitialFee === true || allowInitialFee === 'true',
    additionalFees: additionalFees || [],
    installments: installments || []
  };

  if (effectiveFrom) {
    data.effectiveFrom = new Date(effectiveFrom);
  }

  const fee = await prisma.feeStructure.create({ data });
  res.status(201).json({ success: true, data: fee });
});

export const updateFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.feeStructure.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Fee structure not found' });
    return;
  }

  const {
    programId,
    universityId,
    feeLevel,
    sessionId,
    registrationFee,
    tuitionFee,
    examFee,
    universityFee,
    commissionRate,
    yearlyFees,
    gstPercentage,
    billingCycle,
    currency,
    effectiveFrom,
    dueDate,
    additionalFees,
    allowInitialFee,
    specialisation,
    installments
  } = req.body;

  const data: any = {
    feeLevel: feeLevel || 'program',
    programId: feeLevel === 'program' ? programId : null,
    specialisation: specialisation || null,
    universityId: universityId || null,
    sessionId: sessionId === '' || !sessionId ? null : sessionId,
    registrationFee: registrationFee ? parseFloat(registrationFee) : 0,
    tuitionFee: tuitionFee ? parseFloat(tuitionFee) : 0,
    examFee: examFee ? parseFloat(examFee) : 0,
    universityFee: universityFee ? parseFloat(universityFee) : 0,
    commissionRate: commissionRate ? parseFloat(commissionRate) : 0,
    yearlyFees: yearlyFees || [],
    gstPercentage: gstPercentage ? parseFloat(gstPercentage) : 18,
    billingCycle: billingCycle || 'per_year',
    currency: currency || 'INR',
    allowInitialFee: allowInitialFee === true || allowInitialFee === 'true',
    additionalFees: additionalFees || [],
    installments: installments || []
  };

  if (effectiveFrom) {
    data.effectiveFrom = new Date(effectiveFrom);
  } else {
    data.effectiveFrom = null;
  }

  const fee = await prisma.feeStructure.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: fee });
});
export const deleteFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.feeStructure.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Fee structure not found' });
    return;
  }
  await prisma.feeStructure.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

// Auth Fees
export const getAuthFees = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fees = await prisma.universityAuthFee.findMany({
    where: { organizationId: req.user.organizationId },
    include: { university: { select: { id: true, name: true, code: true } } },
    orderBy: { updatedAt: 'desc' }
  });
  // Flatten feeDetails JSON into top-level fields for UI compatibility
  const mapped = fees.map(f => ({
    ...f,
    universityId: f.university,
    amount: (f.feeDetails as any)?.amount ?? 0,
    currency: (f.feeDetails as any)?.currency ?? 'INR',
  }));
  res.json({ success: true, data: mapped });
});
export const createAuthFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { universityId, amount, currency } = req.body;
  if (!universityId || !amount) return res.status(400).json({ success: false, message: 'universityId and amount are required' }) as any;
  const fee = await prisma.universityAuthFee.upsert({
    where: { organizationId_universityId: { organizationId: req.user.organizationId, universityId } },
    create: { organizationId: req.user.organizationId, universityId, feeDetails: { amount: Number(amount), currency: currency || 'INR' }, configuredBy: req.user.id },
    update: { feeDetails: { amount: Number(amount), currency: currency || 'INR' }, configuredBy: req.user.id },
    include: { university: { select: { id: true, name: true, code: true } } }
  });
  res.status(201).json({ success: true, data: { ...fee, universityId: fee.university, amount: Number(amount), currency: currency || 'INR' } });
});
export const updateAuthFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { amount, currency } = req.body;
  const existing = await prisma.universityAuthFee.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Auth fee not found' }) as any;
  const prevDetails = existing.feeDetails as any;
  const fee = await prisma.universityAuthFee.update({
    where: { id: req.params.id },
    data: { feeDetails: { amount: Number(amount ?? prevDetails.amount), currency: currency || prevDetails.currency || 'INR' }, configuredBy: req.user.id },
    include: { university: { select: { id: true, name: true, code: true } } }
  });
  res.json({ success: true, data: { ...fee, universityId: fee.university, amount: Number(amount ?? prevDetails.amount), currency: currency || prevDetails.currency } });
});

// Centers
export const getPendingPaymentCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId, status: 'pending_payment' } });
  res.json({ success: true, data: centers });
});
export const financeVerifyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: { status: 'active', financeApprovedBy: req.user.id, financeApprovedAt: new Date() } });
  res.json({ success: true, data: center });
});

export const createStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, code, email, contact, ...rest } = req.body;
  const targetEmail = email || `admin.${code}@example.com`;
  const generatedPassword = `Center@${Math.floor(100000 + Math.random() * 900000)}`;
  
  const center = await prisma.studyCenter.create({
    data: {
      ...rest,
      name,
      code,
      email,
      contact,
      organizationId: req.user.organizationId,
      status: 'active',
      financeApprovedBy: req.user.id,
      financeApprovedAt: new Date(),
      credentials: { email: targetEmail, password: generatedPassword }
    }
  });

  const hashedPassword = await hashPassword(generatedPassword);
  const userId = await generateUserId();

  const user = await prisma.user.create({
    data: {
      userId,
      organizationId: req.user.organizationId,
      studyCenterId: center.id,
      email: targetEmail,
      password: hashedPassword,
      name: `${name} Admin`,
      role: 'center_admin',
      phone: contact,
      status: 'active'
    }
  });

  // Send credentials email
  await sendEmail(
    targetEmail,
    'Your Study Center Portal Credentials',
    `Hello ${name} Admin,\n\nYour study center account has been created.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\nEmail: ${targetEmail}\nPassword: ${generatedPassword}\n\nRegards,\nSchool Administration`,
    `<p>Hello <strong>${name} Admin</strong>,</p><p>Your study center account has been created.</p><p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a><br/><strong>Email:</strong> ${targetEmail}<br/><strong>Password:</strong> ${generatedPassword}</p><p>Regards,<br/>School Administration</p>`
  );

  res.status(201).json({ success: true, data: { center, user } });
});

// Reports
export const getIncomeExpenditureReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { from, to } = req.query;
  const organizationId = req.user.organizationId;
  
  const fromDate = from ? new Date(from as string) : new Date(new Date().getFullYear(), 3, 1);
  const toDate = to ? new Date(to as string) : new Date();
  toDate.setHours(23, 59, 59, 999);

  // 1. Get Invoices (billed amount)
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      createdAt: { gte: fromDate, lte: toDate },
      status: { not: 'cancelled' }
    }
  });

  // 2. Get Payments (actual received money)
  const payments = await prisma.paymentEntry.findMany({
    where: {
      organizationId,
      receivedAt: { gte: fromDate, lte: toDate }
    }
  });

  // 3. Get Enrollment Payments
  const enrollments = await prisma.enrollmentPayment.findMany({
    where: {
      enrollment: { organizationId },
      debitedAt: { gte: fromDate, lte: toDate }
    },
    include: { enrollment: true }
  });

  // 4. Get Expenses
  const expenses = await prisma.expenseClaim.findMany({
    where: {
      organizationId,
      status: { in: ['approved', 'reimbursed'] },
      createdAt: { gte: fromDate, lte: toDate }
    }
  });

  // 5. Get Payrolls
  const payrolls = await prisma.payroll.findMany({
    where: {
      organizationId,
      status: { in: ['paid', 'transferred_to_finance'] },
      updatedAt: { gte: fromDate, lte: toDate }
    }
  });

  // Aggregate by month (YYYY-MM)
  const monthlyData: Record<string, any> = {};

  const getMonthKey = (d: Date | string) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  };

  const ensureMonth = (key: string) => {
    if (!monthlyData[key]) {
      monthlyData[key] = {
        month: key,
        income: { invoices: 0, enrollments: 0, payments: 0, total: 0 },
        expenditure: { expenses: 0, salaries: 0, total: 0 },
        net: 0
      };
    }
  };

  invoices.forEach(inv => {
    const m = getMonthKey(inv.createdAt);
    ensureMonth(m);
    monthlyData[m].income.invoices += inv.total;
    monthlyData[m].income.total += inv.total;
  });

  payments.forEach(pay => {
    const m = getMonthKey(pay.receivedAt);
    ensureMonth(m);
    monthlyData[m].income.payments += pay.amount;
    monthlyData[m].income.total += pay.amount;
  });

  enrollments.forEach(enr => {
    const m = getMonthKey(enr.debitedAt);
    ensureMonth(m);
    monthlyData[m].income.enrollments += enr.amount;
    monthlyData[m].income.total += enr.amount;
  });

  expenses.forEach(exp => {
    const m = getMonthKey(exp.createdAt);
    ensureMonth(m);
    monthlyData[m].expenditure.expenses += exp.amount;
    monthlyData[m].expenditure.total += exp.amount;
  });

  payrolls.forEach(pay => {
    const m = getMonthKey(pay.updatedAt);
    ensureMonth(m);
    monthlyData[m].expenditure.salaries += pay.netSalary;
    monthlyData[m].expenditure.total += pay.netSalary;
  });

  const totals = {
    income: 0,
    expenditure: 0,
    netProfit: 0,
    profitMargin: 0
  };

  const incomeBreakdown = {
    invoices: 0,
    enrollments: 0,
    payments: 0
  };

  const expenditureBreakdown = {
    salaries: 0,
    expenses: 0,
    byCategory: [] as any[]
  };

  const expenseCategories: Record<string, { amount: number; count: number }> = {};

  Object.values(monthlyData).forEach((row: any) => {
    row.net = row.income.total - row.expenditure.total;
    
    totals.income += row.income.total;
    totals.expenditure += row.expenditure.total;
    totals.netProfit += row.net;
    
    incomeBreakdown.invoices += row.income.invoices;
    incomeBreakdown.enrollments += row.income.enrollments;
    incomeBreakdown.payments += row.income.payments;
    
    expenditureBreakdown.salaries += row.expenditure.salaries;
    expenditureBreakdown.expenses += row.expenditure.expenses;
  });

  expenses.forEach(exp => {
    if (!expenseCategories[exp.category]) expenseCategories[exp.category] = { amount: 0, count: 0 };
    expenseCategories[exp.category].amount += exp.amount;
    expenseCategories[exp.category].count += 1;
  });
  
  expenditureBreakdown.byCategory = Object.keys(expenseCategories).map(k => ({
    id: k,
    amount: expenseCategories[k].amount,
    count: expenseCategories[k].count
  })).sort((a, b) => b.amount - a.amount);

  if (totals.income > 0) {
    totals.profitMargin = (totals.netProfit / totals.income) * 100;
  }

  // Sort monthly
  const monthly = Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month));

  res.json({
    success: true,
    data: {
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      monthly,
      totals,
      incomeBreakdown,
      expenditureBreakdown
    }
  });
});

export const getFinanceSalesUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    where: {
      organizationId: req.user.organizationId,
      status: { not: 'resigned' },
      OR: [
        { role: { in: ['sales_admin', 'sales_sub_admin', 'sales'] } },
        { department: { type: 'sales' } }
      ]
    },
    include: {
      department: true
    }
  });
  res.json({ success: true, data: users });
});

export const getUniversityCommissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const students = await prisma.student.findMany({
    where: {
      organizationId,
    },
    include: {
      program: {
        include: {
          university: true,
          feeStructures: {
            where: {
              organizationId
            }
          }
        }
      },
      commissions: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  res.json({ success: true, data: students });
});

export const recordUniversityCommission = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const { studentId, universityId, amountReceived, notes, status } = req.body;

  if (!studentId || !universityId || amountReceived === undefined) {
    res.status(400).json({ success: false, message: 'Missing required fields' });
    return;
  }

  const commission = await prisma.universityCommission.create({
    data: {
      organizationId,
      studentId,
      universityId,
      amountReceived: parseFloat(amountReceived),
      status: status || 'received',
      notes: notes || '',
      dateReceived: new Date()
    }
  });

  res.status(201).json({ success: true, data: commission });
});

export const getUniversityPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const students = await prisma.student.findMany({
    where: {
      organizationId,
    },
    include: {
      program: {
        include: {
          university: true,
          feeStructures: {
            where: {
              organizationId
            }
          }
        }
      },
      universityPayments: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  res.json({ success: true, data: students });
});

export const recordUniversityPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const { studentId, universityId, amountPaid, notes, status } = req.body;

  if (!studentId || !universityId || amountPaid === undefined) {
    res.status(400).json({ success: false, message: 'Missing required fields' });
    return;
  }

  const payment = await prisma.universityPayment.create({
    data: {
      organizationId,
      studentId,
      universityId,
      amountPaid: Number(amountPaid),
      notes,
      status: status || 'paid'
    }
  });

  res.json({ success: true, data: payment });
});

// Collection Report
export const getCollectionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { organizationId } = req.user;
  const { startDate, endDate, receivedBy } = req.query;

  const where: any = { organizationId };

  if (startDate && endDate) {
    where.receivedAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    };
  } else if (startDate) {
    where.receivedAt = { gte: new Date(startDate as string) };
  } else if (endDate) {
    where.receivedAt = { lte: new Date(endDate as string) };
  }

  if (receivedBy && receivedBy !== 'all') {
    where.receivedBy = receivedBy as string;
  }

  const payments = await prisma.paymentEntry.findMany({
    where,
    include: {
      receiver: { select: { name: true } },
      invoice: {
        include: {
          student: { select: { name: true, enrollmentNo: true } }
        }
      }
    },
    orderBy: { receivedAt: 'desc' }
  });

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  res.json({
    success: true,
    data: {
      summary: {
        totalCollected,
        transactionCount: payments.length
      },
      ledger: payments
    }
  });
});
