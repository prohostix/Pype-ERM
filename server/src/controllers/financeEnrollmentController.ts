import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { provisionStudentAfterApproval } from '../utils/studentProvisioning.js';

export const getAllEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, search } = req.query as Record<string, string>;

  const where: any = { organizationId: req.user.organizationId };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { studentName: { contains: search, mode: 'insensitive' } },
      { studentEmail: { contains: search, mode: 'insensitive' } },
      { enrollmentNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [enrollments, summary] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      include: {
        program: {
          include: {
            university: { select: { id: true, name: true, address: true, code: true } },
            feeStructures: {
              select: {
                id: true, registrationFee: true, tuitionFee: true,
                examFee: true, universityFee: true, billingCycle: true, yearlyFees: true,
              }
            },
          },
        },
        studyCenter: { select: { name: true, code: true } },
        session: { select: { name: true } },
        student: {
          select: {
            id: true, name: true, email: true, phone: true, altPhone: true,
            dob: true, address: true, pinCode: true,
            fatherName: true, motherName: true, fatherPhone: true, motherPhone: true,
            religion: true, caste: true, photo: true, documents: true,
          }
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.enrollment.groupBy({
      by: ['status'],
      where: { organizationId: req.user.organizationId },
      _count: { status: true },
    }),
  ]);

  const summaryMap = summary.reduce((acc: any, s: any) => {
    acc[s.status] = s._count.status;
    return acc;
  }, { payment_pending: 0, receipt_submitted: 0, document_review: 0, finance_review: 0, enrolled: 0, rejected: 0, department_rejected: 0 });

  res.status(200).json({ success: true, count: enrollments.length, data: enrollments, summary: summaryMap });
});

export const getFinanceEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { organizationId: req.user.organizationId, status: 'finance_review' },
    include: { program: true, studyCenter: true, student: true },
    orderBy: { createdAt: 'asc' }
  });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const approveFinanceEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  // First, find the enrollment to check if we need to generate an invoice
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { id: req.params.id },
    include: {
      program: { include: { feeStructures: true } }
    }
  });
  
  if (!existingEnrollment) {
    res.status(404);
    throw new Error('Enrollment not found');
  }

  // If receipt hasn't been verified yet, but there is an initial payment amount, generate the invoice
  if (!existingEnrollment.receiptVerified && existingEnrollment.initialPaymentAmount && existingEnrollment.initialPaymentAmount > 0) {
    const amountPaid = existingEnrollment.initialPaymentAmount;
    
    // Create payment record
    await prisma.enrollmentPayment.create({
      data: {
        enrollmentId: existingEnrollment.id,
        amount: amountPaid,
        ...(existingEnrollment.studyCenterId ? { studyCenterId: existingEnrollment.studyCenterId } : {}),
        debitedAt: existingEnrollment.initialPaymentDate ? new Date(existingEnrollment.initialPaymentDate) : new Date()
      }
    });

    // Generate an invoice and payment entry for the initial payment
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const invNo = `INV-AUTO-${Date.now().toString().slice(-4)}-${random}`;
    
    await prisma.invoice.create({
      data: {
        organizationId: existingEnrollment.organizationId,
        studentId: existingEnrollment.studentId || undefined,
        centerId: existingEnrollment.studyCenterId || undefined,
        invoiceNo: invNo,
        amount: amountPaid,
        tax: 0,
        total: amountPaid,
        status: 'paid',
        dueDate: existingEnrollment.initialPaymentDate ? new Date(existingEnrollment.initialPaymentDate) : new Date(),
        paidAt: existingEnrollment.initialPaymentDate ? new Date(existingEnrollment.initialPaymentDate) : new Date(),
        notes: 'Initial Admission Payment',
        items: [{ description: 'Admission/Initial Fee', amount: amountPaid }],
        payments: {
          create: {
            organizationId: existingEnrollment.organizationId,
            amount: amountPaid,
            method: 'online', 
            referenceNo: 'Admission',
            receivedBy: req.user.id,
            receivedAt: existingEnrollment.initialPaymentDate ? new Date(existingEnrollment.initialPaymentDate) : new Date(),
            notes: 'Auto-generated during finance approval'
          }
        }
      }
    });
    
    // Mark receipt as verified since we processed the payment
    await prisma.enrollment.update({
      where: { id: existingEnrollment.id },
      data: { receiptVerified: true, receiptVerifiedAt: new Date(), receiptVerifiedBy: req.user.id }
    });
  }

  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: { status: 'enrolled', financeReviewedBy: req.user.id, financeReviewedAt: new Date() }
  });
  
  // Provision student/user account post-approval
  await provisionStudentAfterApproval(enrollment.id);
  
  // Refetch the updated enrollment with provisioned student info
  const updatedEnrollment = await prisma.enrollment.findUnique({
    where: { id: enrollment.id },
    include: { program: true, studyCenter: true }
  });

  res.json({ success: true, data: updatedEnrollment || enrollment });
});

export const rejectFinanceEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: { status: 'rejected', financeReviewedBy: req.user.id, financeReviewedAt: new Date(), financeRemarks: req.body.remarks }
  });
  res.json({ success: true, data: enrollment });
});

export const verifyReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollmentId = req.params.id;

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      program: {
        include: {
          feeStructures: true
        }
      }
    }
  });

  if (!enrollment) {
    res.status(404);
    throw new Error('Enrollment not found');
  }

  if (enrollment.receiptVerified) {
    res.status(400);
    throw new Error('Receipt already verified');
  }

  // Calculate amount paid based on billing cycle
  let amountPaid = 0;
  let feeStructure = enrollment.program?.feeStructures?.find((fs: any) => fs.sessionId === enrollment.sessionId && fs.specialisation === enrollment.specialisation);
  if (!feeStructure) feeStructure = enrollment.program?.feeStructures?.find((fs: any) => fs.sessionId === enrollment.sessionId && !fs.specialisation);
  if (!feeStructure) feeStructure = enrollment.program?.feeStructures?.[0];

  if (enrollment.initialPaymentAmount !== null && enrollment.initialPaymentAmount !== undefined) {
    amountPaid = enrollment.initialPaymentAmount;
  } else if (feeStructure) {
    if (feeStructure.billingCycle === 'one_time') {
      amountPaid = feeStructure.registrationFee + feeStructure.tuitionFee + feeStructure.examFee + feeStructure.universityFee;
    } else if (feeStructure.billingCycle === 'per_year') {
      // Use yearlyFees if available, else tuitionFee
      const yearlyFees = (feeStructure.yearlyFees as any[]) || [];
      if (yearlyFees.length > 0 && yearlyFees[0].amount) {
        amountPaid = Number(yearlyFees[0].amount);
      } else {
        amountPaid = feeStructure.tuitionFee;
      }
    } else if (feeStructure.billingCycle === 'per_semester') {
      // First semester fee
      const yearlyFees = (feeStructure.yearlyFees as any[]) || [];
      if (yearlyFees.length > 0 && yearlyFees[0].amount) {
        amountPaid = Number(yearlyFees[0].amount); // Assuming yearlyFees actually holds semester fees if per_semester
      } else {
        amountPaid = feeStructure.tuitionFee / 2;
      }
    } else {
      amountPaid = feeStructure.tuitionFee;
    }
  }

  // Create payment record
  await prisma.enrollmentPayment.create({
    data: {
      enrollmentId: enrollment.id,
      amount: amountPaid,
      // studyCenterId and walletId are now optional
      ...(enrollment.studyCenterId ? { studyCenterId: enrollment.studyCenterId } : {}),
      debitedAt: enrollment.initialPaymentDate ? new Date(enrollment.initialPaymentDate) : new Date()
    }
  });

  // Generate an invoice and payment entry for the initial payment so it shows in Student Payments Log
  if (amountPaid > 0) {
    const invNo = `INV-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    await prisma.invoice.create({
      data: {
        organizationId: enrollment.organizationId,
        studentId: enrollment.studentId || undefined,
        centerId: enrollment.studyCenterId || undefined,
        invoiceNo: invNo,
        amount: amountPaid,
        tax: 0,
        total: amountPaid,
        status: 'paid',
        dueDate: enrollment.initialPaymentDate ? new Date(enrollment.initialPaymentDate) : new Date(),
        paidAt: enrollment.initialPaymentDate ? new Date(enrollment.initialPaymentDate) : new Date(),
        notes: 'Initial Admission Payment',
        items: [{ description: 'Admission/Initial Fee', amount: amountPaid }],
        payments: {
          create: {
            organizationId: enrollment.organizationId,
            amount: amountPaid,
            method: 'online', 
            referenceNo: 'Admission',
            receivedBy: req.user.id,
            receivedAt: enrollment.initialPaymentDate ? new Date(enrollment.initialPaymentDate) : new Date(),
            notes: 'Auto-generated during receipt verification'
          }
        }
      }
    });
  }

  // Update enrollment
  const historyEntry = {
    status: 'document_review',
    changedAt: new Date().toISOString(),
    changedBy: req.user.id,
    remarks: 'Receipt verified by Finance'
  };

  const updatedEnrollment = await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      receiptVerified: true,
      receiptVerifiedAt: new Date(),
      receiptVerifiedBy: req.user.id,
      status: 'document_review', // Move forward
      statusHistory: {
        push: historyEntry
      }
    }
  });

  res.json({ success: true, data: updatedEnrollment });
});
