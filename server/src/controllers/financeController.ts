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
  if (req.user.role !== 'superadmin' && req.user.role !== 'org_admin' && req.user.role !== 'ceo' && req.user.branchId) {
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
  if (req.user.role !== 'superadmin' && req.user.role !== 'org_admin' && req.user.role !== 'ceo' && req.user.branchId) {
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

    if (student.programId) {
      const feeStructure = await prisma.feeStructure.findFirst({
        where: { programId: student.programId }
      });
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
  if (req.user.role !== 'superadmin' && req.user.role !== 'org_admin' && req.user.role !== 'ceo' && req.user.branchId) {
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
  if (req.user.role !== 'superadmin' && req.user.role !== 'org_admin' && req.user.role !== 'ceo' && req.user.branchId) {
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
    additionalFees
  } = req.body;

  const data: any = {
    organizationId: req.user.organizationId,
    createdBy: req.user.id,
    feeLevel: feeLevel || 'program',
    programId: feeLevel === 'program' ? programId : null,
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
    additionalFees: additionalFees || []
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
    additionalFees
  } = req.body;

  const data: any = {
    feeLevel: feeLevel || 'program',
    programId: feeLevel === 'program' ? programId : null,
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
    additionalFees: additionalFees || []
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
  res.json({ success: true, data: [] });
});
export const createAuthFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
export const updateAuthFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
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
  res.json({ success: true, data: { totals: { income: 0, expenditure: 0, netProfit: 0 } } });
});

export const getFinanceSalesUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    where: {
      organizationId: req.user.organizationId,
      OR: [
        { role: { in: ['sales_admin', 'sales'] } },
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
