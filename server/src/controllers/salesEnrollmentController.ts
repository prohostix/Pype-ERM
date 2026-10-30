import { Prisma } from '../generated/client/index.js';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/postgres.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';
import { sendEmail, sendBrandedStudentCredentials } from '../utils/emailService.js';
import { sendAdmissionConfirmationWhatsApp } from '../utils/whatsappService.js';
import { enqueueNotification } from '../utils/notificationQueue.js';
import { normalizeEmail, normalizePhone, checkStudentOrEnrollmentExists } from '../utils/studentValidation.js';
import { sendPushNotification } from '../services/notification.service.js';
import { emitToUser } from '../config/socket.js';

// ─── Public: Validate invite token and get form data ─────────────────────────

export const validateStudentInviteToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;

  const invite = await prisma.studyCenterInvite.findUnique({
    where: { token },
    include: {
      referrer: { select: { id: true, name: true, organizationId: true } },
      organization: { select: { id: true, name: true } },
    },
  });

  if (!invite) {
    res.status(404).json({ success: false, message: 'Invalid or expired invite link' });
    return;
  }

  if (invite.status !== 'pending') {
    res.status(400).json({ success: false, message: 'This invite link has already been used or expired' });
    return;
  }

  if (new Date(invite.expiresAt) < new Date()) {
    res.status(400).json({ success: false, message: 'This invite link has expired' });
    return;
  }

  // Get programs for this invite
  const programs = await prisma.program.findMany({
    where: {
      organizationId: invite.organizationId,
      status: 'active',
      ...(invite.programIds.length > 0 ? { id: { in: invite.programIds } } : {}),
      ...(invite.universityIds.length > 0 ? { universityId: { in: invite.universityIds } } : {}),
    },
    include: {
      university: { select: { id: true, name: true, code: true, logo: true, enrollmentFormConfig: true } },
      feeStructures: { select: { allowInitialFee: true, specialisation: true } },
    },
  });

  // Get sessions for this invite
  const sessionWhere: any = {
    organizationId: invite.organizationId,
    status: { in: ['active', 'approved'] },
  };
  if ((invite as any).sessionIds?.length > 0) {
    sessionWhere.id = { in: (invite as any).sessionIds };
  } else if (invite.universityIds.length > 0) {
    sessionWhere.OR = [
      { universityId: { in: invite.universityIds } },
      { universityId: null },
    ];
  }
  const sessions = await prisma.admissionSession.findMany({
    where: sessionWhere,
    select: { id: true, name: true, startDate: true, endDate: true, status: true },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch enrollment link config
  const org = await prisma.organization.findUnique({
    where: { id: invite.organizationId },
    select: { metadata: true },
  });
  const metadata = (org?.metadata as any) || {};
  const DEFAULT_ENROLLMENT_LINK_CONFIG = {
    universityStep: 'mandatory',
    programStep: 'optional',
    specializationStep: 'optional',
    sessionStep: 'optional',
    expiryDays: 7,
    allowMultipleUse: false,
    requireDocuments: true,
    requirePhoto: true,
  };
  const enrollmentLinkConfig = { ...DEFAULT_ENROLLMENT_LINK_CONFIG, ...(metadata.enrollmentLinkConfig || {}) };

  res.status(200).json({
    success: true,
    data: {
      organizationName: invite.organization.name,
      referrerName: invite.referrer.name,
      programs,
      sessions,
      token,
      enrollmentLinkConfig,
      specializations: (invite as any).specializations || {}
    },
  });
});

// ─── Public: Student submits their data via invite link ───────────────────────

export const submitStudentApplication = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const {
    studentName,
    studentEmail,
    studentPhone,
    studentAddress,
    programId,
    sessionId,
    documents,
    fatherName,
    dob,
    altPhone,
    pinCode,
    gender,
    category,
    religion,
    maritalStatus,
    employmentStatus,
    caste,
    motherName,
    motherPhone,
    fatherPhone,
    guardianName,
    familyPhone,
    photo,
    specialisation
  } = req.body;

  // Validate required fields
  const missing: string[] = [];
  if (!studentName) missing.push('studentName');
  if (!studentEmail) missing.push('studentEmail');
  if (!studentPhone) missing.push('studentPhone');
  if (!programId) missing.push('programId');
  if (missing.length > 0) {
    res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
    return;
  }

  // Validate invite
  const invite = await prisma.studyCenterInvite.findUnique({
    where: { token },
    include: { referrer: { select: { id: true, organizationId: true } } },
  });

  if (!invite || invite.status !== 'pending' || new Date(invite.expiresAt) < new Date()) {
    res.status(400).json({ success: false, message: 'Invalid or expired invite link' });
    return;
  }

  const orgId = invite.organizationId;
  const salesUserId = invite.referredBy;

  // Validate program belongs to this org and invite's universities
  const program = await prisma.program.findFirst({
    where: {
      id: programId,
      organizationId: orgId,
      status: 'active',
      ...(invite.universityIds.length > 0 ? { universityId: { in: invite.universityIds } } : {}),
    },
  });

  if (!program) {
    res.status(400).json({ success: false, message: 'Invalid program selection' });
    return;
  }

  // Find or create a default study center for sales-led enrollments (optional)
  // Use a special "Sales Direct" center or the first active center
  let studyCenter = await prisma.studyCenter.findFirst({
    where: { organizationId: orgId, status: 'active' },
    orderBy: { createdAt: 'asc' },
  });

  // Find or use first active/approved session
  let session = sessionId
    ? await prisma.admissionSession.findFirst({ where: { id: sessionId, organizationId: orgId } })
    : await prisma.admissionSession.findFirst({ where: { organizationId: orgId, status: { in: ['active', 'approved'] } }, orderBy: { createdAt: 'desc' } });

  if (!session) {
    res.status(400).json({ success: false, message: 'No active admission session found' });
    return;
  }

  const cleanEmail = normalizeEmail(studentEmail);
  const cleanPhone = (studentPhone || '').trim();
  const isUpgrade = Boolean(req.body.isUpgrade);
  const existingStudentId = req.body.existingStudentId || (isUpgrade ? req.body.studentId : undefined);

  // Enforce uniqueness across existing students and active enrollments
  const uniquenessCheck = await checkStudentOrEnrollmentExists({
    email: cleanEmail,
    phone: cleanPhone,
    organizationId: orgId,
    existingStudentId: isUpgrade && existingStudentId ? existingStudentId : undefined,
    excludeStudentId: !isUpgrade && existingStudentId ? existingStudentId : undefined,
    isUpgrade,
    programId,
    sessionId: session?.id
  });

  if (!uniquenessCheck.isUnique) {
    res.status(400).json({
      success: false,
      message: uniquenessCheck.message,
      field: uniquenessCheck.field
    });
    return;
  }

  const now = new Date();

  // Create enrollment with document_review status
  const enrollment = await prisma.enrollment.create({
    data: {
      organizationId: orgId,
      studentName,
      studentEmail: cleanEmail,
      studentPhone: cleanPhone,
      studentAddress: studentAddress || '',
      fatherName,
      dob: dob ? new Date(dob) : null,
      altPhone,
      pinCode,
      gender,
      category,
      religion,
      maritalStatus,
      employmentStatus,
      caste,
      motherName,
      motherPhone,
      fatherPhone,
      guardianName,
      familyPhone,
      photo,
      documents: documents || [],
      programId,
      specialisation: specialisation || null,
      studyCenterId: studyCenter?.id || null,
      sessionId: session.id,
      paymentPlan: req.body.paymentPlan || null,
      status: 'sales_verification_pending',
      salesUserId,
      statusHistory: [
        {
          status: 'submitted',
          actorId: 'student',
          actorName: studentName,
          timestamp: now.toISOString(),
          note: 'Student submitted application via sales invite link',
        },
        {
          status: 'sales_verification_pending',
          actorId: 'system',
          timestamp: now.toISOString(),
          note: 'Awaiting verification by the sales user who generated the invite.',
        },
      ],
    } as any,
  });

  // Notify the sales user
  try {
    await prisma.notification.create({
      data: {
        organizationId: orgId,
        userId: salesUserId,
        title: 'New Student Application',
        message: `${studentName} has submitted an application for ${program.name} via your invite link and is awaiting your verification.`,
        type: 'general',
        priority: 'medium',
        link: 'student-applications',
      },
    });
  } catch (_) { /* non-critical */ }

  // Update invite link to 'used'
  try {
    await prisma.studyCenterInvite.update({
      where: { id: invite.id },
      data: { status: 'used', usedAt: new Date() },
    });
  } catch (_) { /* non-critical */ }

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully. You will be notified once reviewed.',
    data: { enrollmentId: enrollment.id, status: enrollment.status },
  });
});

// ─── Sales: Get all enrollments from their invite links ──────────────────────

export const getSalesEnrollmentPipeline = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  let allowedIds = [req.user.id];

  const isGlobalAdmin = ['org_admin', 'superadmin', 'ceo', 'general_manager'].includes(req.user.role);

  if (['sales_admin', 'sales_sub_admin'].includes(req.user.role)) {
    const targetRoles = (req.user.role === 'sales_admin' ? ['sales_sub_admin', 'sales', 'employee'] : ['sales', 'employee']) as any;
    const subordinates = await prisma.user.findMany({
      where: { role: { in: targetRoles as any }, organizationId: orgId },
      select: { id: true }
    });
    allowedIds = [...allowedIds, ...subordinates.map(s => s.id)];
  }

  const whereClause: any = {
    organizationId: orgId,
    NOT: {
      status: 'enrolled',
      studentId: null
    }
  };

  if (!isGlobalAdmin) {
    whereClause.salesUserId = { in: allowedIds };
  }

  const enrollments = await prisma.enrollment.findMany({
    where: whereClause,
    include: {
      program: { select: { id: true, name: true, code: true, courseType: true, universityId: true, feeStructures: { select: { allowInitialFee: true } } } },
      studyCenter: { select: { id: true, name: true, code: true } },
      session: { select: { id: true, name: true } },
      departmentReviewer: { select: { id: true, name: true, email: true } },
      financeReviewer: { select: { id: true, name: true, email: true } },
      student: true,
      salesUser: { select: { id: true, name: true } },
    } as any,
    orderBy: { createdAt: 'desc' },
  });

  // Build pipeline summary
  const summary = {
    total: enrollments.length,
    ops_upgrade_verification: enrollments.filter((e: any) => e.status === 'ops_upgrade_verification').length,
    sales_admin_review: enrollments.filter((e: any) => e.status === 'sales_admin_review').length,
    sales_verification_pending: enrollments.filter((e: any) => e.status === 'sales_verification_pending').length,
    provisional_finance_pending: enrollments.filter((e: any) => e.status === 'provisional_finance_pending').length,
    provisional_finance_verified: enrollments.filter((e: any) => e.status === 'provisional_finance_verified').length,
    document_review: enrollments.filter((e: any) => e.status === 'document_review').length,
    finance_review: enrollments.filter((e: any) => e.status === 'finance_review').length,
    enrolled: enrollments.filter((e: any) => e.status === 'enrolled').length,
    ops_rejected: enrollments.filter((e: any) => e.status === 'ops_rejected').length,
    rejected: enrollments.filter((e: any) => e.status === 'rejected').length,
  };

  const data = enrollments.map((e: any) => ({ ...e, rejectedBySalesAdmin: isSalesAdminRejected(e) }));
  res.status(200).json({ success: true, count: enrollments.length, summary, data });
});

// ─── Ops: Approve → finance_review (sales-led flow) ──────────────────────────

export const approveSalesEnrollmentOps = asyncHandler(async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id } });

  if (!enrollment || enrollment.organizationId !== req.user.organizationId) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  if (enrollment.status !== 'document_review') {
    res.status(409).json({ success: false, message: `Cannot approve from status: ${enrollment.status}` });
    return;
  }

  const history = ((enrollment as any).statusHistory as any[]) || [];
  history.push({
    status: 'finance_review',
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'ops_admin',
    timestamp: now.toISOString(),
    note: 'Documents verified by Operations',
  });

  const updated = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: 'finance_review',
      departmentReviewedBy: req.user.id,
      departmentReviewedAt: now,
      statusHistory: history,
    } as any,
  });

  // Notify sales user
  try {
    if ((enrollment as any).salesUserId) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: (enrollment as any).salesUserId,
          title: 'Application Verified by Operations',
          message: `${enrollment.studentName}'s application has been verified and forwarded to Finance for payment.`,
          type: 'general',
          priority: 'medium',
          link: 'student-applications',
        },
      });
    }
    // Notify finance admins
    const financeAdmins = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId, role: { in: ['finance_admin', 'finance_sub_admin'] }, status: 'active' },
      select: { id: true },
    });
    for (const admin of financeAdmins) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: admin.id,
          title: 'Student Application Pending Payment',
          message: `${enrollment.studentName}'s application is ready for payment verification.`,
          type: 'general',
          priority: 'medium',
          link: 'enrollments_finance',
        },
      });
    }
  } catch (_) { /* non-critical */ }

  res.status(200).json({ success: true, data: updated });
});

// ─── Finance: Approve → enrolled ─────────────────────────────────────────────

export const approveSalesEnrollmentFinance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: req.params.id },
    include: { program: true }
  });

  if (!enrollment || enrollment.organizationId !== req.user.organizationId) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  if (enrollment.status !== 'finance_review') {
    res.status(409).json({ success: false, message: `Cannot approve from status: ${enrollment.status}` });
    return;
  }

  let generatedUid = '';
  let generatedPassword = '';
  let studentRecordId = null;

  try {
    // 1. Provision student's User account if not exists
    let studentUser = await prisma.user.findUnique({ where: { email: enrollment.studentEmail } });

    if (!studentUser) {
      generatedPassword = `Student@${Math.floor(100000 + Math.random() * 900000)}`;
      const hashedPassword = await hashPassword(generatedPassword);
      generatedUid = await generateUserId();

      studentUser = await prisma.user.create({
        data: {
          userId: generatedUid,
          organizationId: enrollment.organizationId,
          email: enrollment.studentEmail,
          password: hashedPassword,
          name: enrollment.studentName,
          role: 'student', // Fallback role for student in UserRole enum
          phone: enrollment.studentPhone,
          status: 'active',
        },
      });
    } else {
      generatedUid = studentUser.userId || 'PYPEERM0000';
      generatedPassword = '(Existing student account)';
    }

    let salesUserBranchId = null;
    if (enrollment.salesUserId) {
      const salesUser = await prisma.user.findUnique({ where: { id: enrollment.salesUserId }, select: { branchId: true } });
      if (salesUser) salesUserBranchId = salesUser.branchId;
    }

    // Determine admission prefix
    const org = await prisma.organization.findUnique({ where: { id: enrollment.organizationId } });
    let admissionPrefix = 'ADM';
    if (org?.metadata && (org.metadata as any).admissionPrefix) {
      admissionPrefix = (org.metadata as any).admissionPrefix;
    } else if (org?.name) {
      admissionPrefix = org.name.substring(0, 3).toUpperCase();
    }
    
    // Generate a unique admission number
    let isUnique = false;
    let newAdmissionNo = '';
    while (!isUnique) {
      const randomStr = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit random
      newAdmissionNo = `${admissionPrefix}-${randomStr}`;
      const existing = await prisma.student.findFirst({ where: { admissionNo: newAdmissionNo } });
      if (!existing) isUnique = true;
    }

    // 2. Provision Student record if not exists, or update existing to active
    let studentRecord = await prisma.student.findUnique({ where: { email: enrollment.studentEmail } });
    if (!studentRecord) {
      studentRecord = await prisma.student.create({
        data: {
          centerId: enrollment.studyCenterId,
          organizationId: enrollment.organizationId,
          branchId: salesUserBranchId,
          name: enrollment.studentName,
          email: enrollment.studentEmail,
          phone: enrollment.studentPhone,
          address: enrollment.studentAddress,
          fatherName: enrollment.fatherName,
          dob: enrollment.dob,
          altPhone: enrollment.altPhone,
          pinCode: enrollment.pinCode,
          gender: enrollment.gender,
          category: enrollment.category,
          religion: enrollment.religion,
          maritalStatus: enrollment.maritalStatus,
          employmentStatus: enrollment.employmentStatus,
          caste: enrollment.caste,
          motherName: enrollment.motherName,
          motherPhone: enrollment.motherPhone,
          fatherPhone: enrollment.fatherPhone,
          guardianName: enrollment.guardianName,
          familyPhone: enrollment.familyPhone,
          photo: enrollment.photo,
          documents: enrollment.documents ? enrollment.documents : undefined,
          programId: enrollment.programId,
          specialisation: (enrollment as any).specialisation || null,
          sessionId: enrollment.sessionId,
          status: 'active',
          referredBy: enrollment.salesUserId,
          admissionNo: newAdmissionNo,
          admissionDate: enrollment.createdAt || new Date(),
          ...(generatedPassword !== '(Existing student account)' ? { credentials: { email: enrollment.studentEmail, password: generatedPassword } } : {})
        },
      });
    } else {
      // If student already exists (e.g. from pipeline wizard), activate them
      studentRecord = await prisma.student.update({
        where: { id: studentRecord.id },
        data: {
          status: 'active',
          admissionNo: studentRecord.admissionNo || newAdmissionNo,
          admissionDate: studentRecord.admissionDate || enrollment.createdAt || new Date(),
          branchId: studentRecord.branchId || salesUserBranchId || undefined
        }
      });
    }
    studentRecordId = studentRecord.id;

    // Enqueue notifications (Email + WhatsApp) into background queue (0ms wait time)
    enqueueNotification({
      type: 'STUDENT_CREDENTIALS',
      data: {
        to: enrollment.studentEmail,
        recipientName: enrollment.studentName,
        email: enrollment.studentEmail,
        password: generatedPassword,
        userId: generatedUid || studentRecord.admissionNo || undefined,
        organizationId: enrollment.organizationId,
        studentPhone: enrollment.studentPhone,
        programName: enrollment.program?.name || 'Academic Program',
        admissionNo: studentRecord.admissionNo || newAdmissionNo
      }
    });

    // 2. Generate invoice & fee receipt if initial payment amount exists
    if (enrollment.initialPaymentAmount && enrollment.initialPaymentAmount > 0) {
      const amountPaid = enrollment.initialPaymentAmount;
      const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      const invNo = `INV-ADM-${Date.now().toString().slice(-4)}-${random}`;

      // Check if an invoice was already created for this student admission
      let invoiceToUse = await prisma.invoice.findFirst({
        where: {
          organizationId: enrollment.organizationId,
          studentId: studentRecordId || undefined,
          notes: { contains: 'Initial Admission Payment' }
        },
        include: { payments: true }
      });

      if (!invoiceToUse) {
        await prisma.enrollmentPayment.create({
          data: {
            enrollmentId: enrollment.id,
            amount: amountPaid,
            ...(enrollment.studyCenterId ? { studyCenterId: enrollment.studyCenterId } : {}),
            debitedAt: enrollment.initialPaymentDate ? new Date(enrollment.initialPaymentDate) : new Date()
          }
        });

        invoiceToUse = await prisma.invoice.create({
          data: {
            organizationId: enrollment.organizationId,
            studentId: studentRecordId || undefined,
            centerId: enrollment.studyCenterId || undefined,
            invoiceNo: invNo,
            amount: amountPaid,
            tax: 0,
            total: amountPaid,
            status: 'paid',
            dueDate: enrollment.initialPaymentDate ? new Date(enrollment.initialPaymentDate) : new Date(),
            paidAt: enrollment.initialPaymentDate ? new Date(enrollment.initialPaymentDate) : new Date(),
            notes: 'Initial Admission Payment',
            items: [{ description: 'Admission / Initial Program Fee', amount: amountPaid }],
            payments: {
              create: {
                organizationId: enrollment.organizationId,
                amount: amountPaid,
                method: 'online',
                referenceNo: 'Admission',
                receivedBy: req.user.id,
                receivedAt: enrollment.initialPaymentDate ? new Date(enrollment.initialPaymentDate) : new Date(),
                notes: 'Auto-generated during sales enrollment finance approval'
              }
            }
          },
          include: { payments: true }
        });
      }

      // Enqueue official fee receipt & invoice notification with PDF attachment
      enqueueNotification({
        type: 'FEE_RECEIPT',
        data: {
          to: enrollment.studentEmail,
          recipientName: enrollment.studentName,
          amount: amountPaid,
          receiptNo: invoiceToUse.invoiceNo,
          paymentDate: (enrollment.initialPaymentDate ? new Date(enrollment.initialPaymentDate) : new Date()).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
          paymentMode: 'Online / Bank Transfer',
          organizationId: enrollment.organizationId,
          paymentId: invoiceToUse.payments?.[0]?.id,
          admissionNo: studentRecord.admissionNo || newAdmissionNo,
          programName: enrollment.program?.name || 'Academic Program',
          studentPhone: enrollment.studentPhone || undefined
        }
      });
    }
  } catch (err) {
    console.error('Error auto-generating student credentials or invoice receipt:', err);
  }

  const history = ((enrollment as any).statusHistory as any[]) || [];
  const credentialNote = generatedPassword && generatedPassword !== '(Existing student account)'
    ? `Student credentials generated successfully. User ID: ${generatedUid}, Password: ${generatedPassword}`
    : `Student enrolled successfully. User ID: ${generatedUid}`;

  history.push({
    status: 'enrolled',
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role === 'finance_sub_admin' ? 'finance_sub_admin' : 'finance_admin',
    timestamp: now.toISOString(),
    note: `Payment verified by Finance. ${credentialNote}.`,
  });

  const updated = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: 'enrolled',
      financeReviewedBy: req.user.id,
      financeReviewedAt: now,
      enrolledAt: now,
      statusHistory: history,
      studentId: studentRecordId
    } as any,
  });

  // Notify sales user
  try {
    if ((enrollment as any).salesUserId) {
      const credsInfo = generatedPassword && generatedPassword !== '(Existing student account)'
        ? `\n\nStudent Portal Access:\nUser ID: ${generatedUid}\nPassword: ${generatedPassword}`
        : `\n\nStudent User ID: ${generatedUid}`;

      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: (enrollment as any).salesUserId,
          title: '🎉 Student Credentials Generated!',
          message: `${enrollment.studentName} has been successfully verified & enrolled.${credsInfo}`,
          type: 'general',
          priority: 'high',
          link: 'student-applications',
        },
      });
    }
  } catch (_) { /* non-critical */ }

  res.status(200).json({ success: true, data: updated });
});

// ─── Ops/Finance: Reject ──────────────────────────────────────────────────────

export const rejectSalesEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { remarks } = req.body;
  const now = new Date();

  if (!remarks?.trim()) {
    res.status(400).json({ success: false, message: 'remarks is required for rejection' });
    return;
  }

  const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id } });

  if (!enrollment || enrollment.organizationId !== req.user.organizationId) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  const allowedStatuses = ['document_review', 'finance_review'];
  if (!allowedStatuses.includes(enrollment.status)) {
    res.status(409).json({ success: false, message: `Cannot reject from status: ${enrollment.status}` });
    return;
  }

  const newStatus = enrollment.status === 'document_review' ? 'ops_rejected' : 'rejected';
  const history = ((enrollment as any).statusHistory as any[]) || [];
  history.push({
    status: newStatus,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    timestamp: now.toISOString(),
    remarks,
  });

  const updated = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: newStatus,
      ...(enrollment.status === 'document_review'
        ? { departmentRemarks: remarks, departmentReviewedBy: req.user.id, departmentReviewedAt: now }
        : { financeRemarks: remarks, financeReviewedBy: req.user.id, financeReviewedAt: now }),
      statusHistory: history,
    } as any,
  });

  // Notify sales user
  try {
    if ((enrollment as any).salesUserId) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: (enrollment as any).salesUserId,
          title: 'Application Rejected',
          message: `${enrollment.studentName}'s application was rejected by ${req.user.role === 'ops_admin' ? 'Operations' : 'Finance'}. Reason: ${remarks}`,
          type: 'general',
          priority: 'high',
          link: 'student-applications',
        },
      });
    }
  } catch (_) { /* non-critical */ }

  res.status(200).json({ success: true, data: updated });
});

// ─── Sales: Direct Enrollment (rep fills on student's behalf) ────────────────
export const createDirectEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentName, studentEmail, studentPhone, studentAddress, programId, sessionId, studyCenterId } = req.body;
  const orgId = req.user.organizationId;
  const salesUserId = req.user.id;

  // Validate required fields
  const missing: string[] = [];
  if (!studentName) missing.push('studentName');
  if (!studentEmail) missing.push('studentEmail');
  if (!studentPhone) missing.push('studentPhone');
  if (!studentAddress) missing.push('studentAddress');
  if (!programId) missing.push('programId');
  if (missing.length > 0) {
    res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
    return;
  }

  // Validate program
  const program = await prisma.program.findFirst({
    where: {
      id: programId,
      organizationId: orgId,
      status: 'active',
    },
  });

  if (!program) {
    res.status(400).json({ success: false, message: 'Invalid program selection' });
    return;
  }

  // Find or use selected study center (optional)
  let studyCenter = null;
  if (studyCenterId) {
    studyCenter = await prisma.studyCenter.findFirst({
      where: { id: studyCenterId, organizationId: orgId, status: 'active' }
    });
  } else {
    studyCenter = await prisma.studyCenter.findFirst({
      where: { organizationId: orgId, status: 'active' },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Find active/approved session
  let session = sessionId
    ? await prisma.admissionSession.findFirst({ where: { id: sessionId, organizationId: orgId } })
    : await prisma.admissionSession.findFirst({ where: { organizationId: orgId, status: { in: ['active', 'approved'] } }, orderBy: { createdAt: 'desc' } });

  if (!session) {
    res.status(400).json({ success: false, message: 'No active admission session found' });
    return;
  }

  const cleanEmail = normalizeEmail(studentEmail);
  const cleanPhone = (studentPhone || '').trim();
  const isUpgrade = Boolean(req.body.isUpgrade);
  const existingStudentId = req.body.existingStudentId || (isUpgrade ? req.body.studentId : undefined);

  // Enforce uniqueness across existing students and active enrollments
  const uniquenessCheck = await checkStudentOrEnrollmentExists({
    email: cleanEmail,
    phone: cleanPhone,
    organizationId: orgId,
    existingStudentId: isUpgrade && existingStudentId ? existingStudentId : undefined,
    excludeStudentId: !isUpgrade && existingStudentId ? existingStudentId : undefined,
    isUpgrade,
    programId,
    sessionId: session.id
  });

  if (!uniquenessCheck.isUnique) {
    res.status(400).json({
      success: false,
      message: uniquenessCheck.message,
      field: uniquenessCheck.field
    });
    return;
  }

  const now = new Date();

  // Create enrollment
  const enrollment = await prisma.enrollment.create({
    data: {
      organizationId: orgId,
      studentName,
      studentEmail: cleanEmail,
      studentPhone: cleanPhone,
      studentAddress,
      programId,
      studyCenterId: studyCenter?.id || null,
      sessionId: session.id,
      paymentPlan: req.body.paymentPlan || null,
      initialPaymentAmount: req.body.initialPaymentAmount !== undefined ? Number(req.body.initialPaymentAmount) : null,
      status: 'document_review',
      salesUserId,
      statusHistory: [
        {
          status: 'submitted',
          actorId: salesUserId,
          actorName: req.user.name,
          actorRole: req.user.role,
          timestamp: now.toISOString(),
          note: `Sales rep ${req.user.name} directly enrolled student`,
        },
        {
          status: 'document_review',
          actorId: 'system',
          timestamp: now.toISOString(),
          note: 'Forwarded to Operations for document verification',
        },
      ],
    } as any,
  });

  // Notify ops admins
  try {
    const opsAdmins = await prisma.user.findMany({
      where: { organizationId: orgId, role: 'ops_admin', status: 'active' },
      select: { id: true },
    });
    for (const admin of opsAdmins) {
      await prisma.notification.create({
        data: {
          organizationId: orgId,
          userId: admin.id,
          title: 'New Student Application for Review',
          message: `${studentName} has been directly enrolled by ${req.user.name} and is ready for review.`,
          type: 'general',
          priority: 'medium',
          link: 'enrollment_review',
        },
      });
    }
  } catch (_) { /* non-critical */ }

  res.status(201).json({
    success: true,
    message: 'Student enrolled successfully and forwarded to Operations review.',
    data: enrollment,
  });
});


// Prisma's list-only `push`, which stored {"push": {...}} instead of a list, so
// accept either shape when reading and always write a real array.
const historyList = (raw: any): any[] =>
  Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
const appendHistory = (raw: any, entry: any): any[] => [...historyList(raw), entry];

const isSalesAdminRejected = (e: any): boolean => {
  if (e?.status !== 'rejected' || e?.financeRemarks) return false;
  const hist = historyList(e?.statusHistory);
  const last = hist[hist.length - 1];
  return String(last?.note || '').startsWith('Sales Admin rejected');
};

// ─── Sales: Verify student enrollment from invite link ───────────────────────

export const verifySalesEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;
  const salesUserId = req.user.id;
  
  const {
    studentName,
    studentEmail,
    studentPhone,
    studentAddress,
    fatherName,
    dob,
    altPhone,
    pinCode,
    paymentPlan,
    initialPaymentAmount,
    gender,
    category,
    religion,
    maritalStatus,
    employmentStatus,
    caste,
    motherName,
    motherPhone,
    fatherPhone,
    guardianName,
    familyPhone,
    documents,
    photo,
    receiptUrl
  } = req.body;

  const enrollment = await prisma.enrollment.findUnique({
    where: { id },
    include: { program: true }
  });

  if (!enrollment) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  // The creating sales user, or Sales Admin / Org Admin / Super Admin
  const isPrivilegedAdmin = ['sales_admin', 'org_admin', 'superadmin'].includes(req.user.role);
  if (enrollment.organizationId !== orgId || (enrollment.salesUserId !== salesUserId && !isPrivilegedAdmin)) {
    res.status(403).json({ success: false, message: 'Not authorized to verify this enrollment' });
    return;
  }

  const allowedStatuses = ['sales_verification_pending', 'document_review', 'rejected', 'ops_rejected', 'department_rejected'];
  if (!allowedStatuses.includes(enrollment.status)) {
    res.status(400).json({ success: false, message: 'Enrollment cannot be resubmitted from its current status.' });
    return;
  }

  if (!initialPaymentAmount || parseFloat(initialPaymentAmount) <= 0) {
    res.status(400).json({ success: false, message: 'Initial fee amount paid is required and must be greater than zero.' });
    return;
  }

  if (!receiptUrl) {
    res.status(400).json({ success: false, message: 'Fee payment receipt screenshot is required.' });
    return;
  }

  const now = new Date();

  // Reset any rejected document status to pending on resubmission
  const cleanDocuments = Array.isArray(documents)
    ? documents.map((d: any) => (d && d.status === 'rejected' ? { ...d, status: 'pending', remarks: undefined } : d))
    : enrollment.documents;

  // Update enrollment with new details and move to document_review
  const updatedEnrollment = await prisma.enrollment.update({
    where: { id },
    data: {
      studentName: studentName || req.body.name || enrollment.studentName,
      studentEmail: studentEmail || req.body.email || enrollment.studentEmail,
      studentPhone: studentPhone || req.body.phone || enrollment.studentPhone,
      studentAddress: studentAddress || req.body.address || enrollment.studentAddress,
      fatherName: fatherName !== undefined ? fatherName : enrollment.fatherName,
      dob: dob ? new Date(dob) : enrollment.dob,
      altPhone: altPhone !== undefined ? altPhone : enrollment.altPhone,
      pinCode: pinCode !== undefined ? pinCode : enrollment.pinCode,
      gender: gender !== undefined ? gender : enrollment.gender,
      category: category !== undefined ? category : enrollment.category,
      religion: religion !== undefined ? religion : enrollment.religion,
      maritalStatus: maritalStatus !== undefined ? maritalStatus : enrollment.maritalStatus,
      employmentStatus: employmentStatus !== undefined ? employmentStatus : enrollment.employmentStatus,
      caste: caste !== undefined ? caste : enrollment.caste,
      motherName: motherName !== undefined ? motherName : enrollment.motherName,
      motherPhone: motherPhone !== undefined ? motherPhone : enrollment.motherPhone,
      fatherPhone: fatherPhone !== undefined ? fatherPhone : enrollment.fatherPhone,
      guardianName: guardianName !== undefined ? guardianName : enrollment.guardianName,
      familyPhone: familyPhone !== undefined ? familyPhone : enrollment.familyPhone,
      documents: (cleanDocuments !== undefined ? cleanDocuments : enrollment.documents) as any,
      photo: photo !== undefined ? photo : enrollment.photo,
      receiptUrl: receiptUrl !== undefined ? receiptUrl : enrollment.receiptUrl,
      paymentPlan: paymentPlan || enrollment.paymentPlan,
      initialPaymentAmount: initialPaymentAmount !== undefined ? Number(initialPaymentAmount) : enrollment.initialPaymentAmount,
    }
  });

  const isFinanceRejection = (enrollment.status === 'rejected' && !!enrollment.financeRemarks) ||
    (enrollment.status === 'rejected' && !!(enrollment as any).financeReviewedBy);

  const hist = historyList(enrollment.statusHistory);
  const lastRejection = [...hist].reverse().find((h: any) =>
    h?.status === 'rejected' || h?.status === 'ops_rejected'
  );

  const lastRejectionIndex = hist.map((h: any) => h?.status).lastIndexOf('rejected');
  const lastApprovalIndex = hist.map((h: any) => String(h?.note || '').toLowerCase()).lastIndexOf('sales admin approved');
  const wasRejectedBySalesAdmin = !isFinanceRejection &&
    enrollment.status === 'rejected' &&
    (isSalesAdminRejected(enrollment) || (
      lastRejectionIndex !== -1 &&
      String(hist[lastRejectionIndex]?.note || '').startsWith('Sales Admin rejected') &&
      (lastApprovalIndex === -1 || lastApprovalIndex < lastRejectionIndex)
    ));

  // Operations rejection can happen from the main table (status === 'ops_rejected')
  // OR from inside the review modal (photoStatus === 'rejected' or individual doc.status === 'rejected')
  // OR if the enrollment was already at 'document_review' (it already passed Sales Admin earlier!)
  const existingDocs = Array.isArray(enrollment.documents) ? (enrollment.documents as any[]) : [];
  const studentProg = enrollment.studentId ? ((await prisma.student.findUnique({ where: { id: enrollment.studentId }, select: { admissionProgress: true } }))?.admissionProgress as any) : null;
  const hasModalRejection = enrollment.photoStatus === 'rejected' ||
    studentProg?.photoStatus === 'rejected' ||
    existingDocs.some((d: any) => d && d.status === 'rejected');
  
  const wasAlreadyInOperations = enrollment.status === 'document_review' || enrollment.status === 'ops_rejected';
  const hasPassedSalesAdmin = hist.some((h: any) => 
    h?.status === 'document_review' || 
    String(h?.note || '').toLowerCase().includes('sales admin approved')
  );

  const wasRejectedByOperations = enrollment.status === 'ops_rejected' ||
    hasModalRejection ||
    (wasAlreadyInOperations && !wasRejectedBySalesAdmin && !isFinanceRejection) ||
    (hasPassedSalesAdmin && !wasRejectedBySalesAdmin && !isFinanceRejection) ||
    (
      !wasRejectedBySalesAdmin && !isFinanceRejection && (
        lastRejection?.status === 'ops_rejected' ||
        String(lastRejection?.note || '').startsWith('Operations rejected') ||
        !!enrollment.departmentReviewedBy
      )
    );

  const isAcademicPartner = Boolean(
    enrollment.studyCenterId ||
    req.user.studyCenterId ||
    req.user.role === 'center_admin'
  );

  let newStatus: string;
  let note: string;

  if (isFinanceRejection) {
    newStatus = 'finance_review';
    note = 'Payment receipt re-uploaded by Sales and forwarded directly back to Finance for verification.';
  } else if (isAcademicPartner) {
    newStatus = 'document_review';
    note = 'Academic Partner enrollment forwarded directly to Operations for document verification.';
  } else if (wasRejectedByOperations) {
    // Operations rejected the documents/photo (either via main reject or inside the modal):
    // Sales Admin already approved this previously. Once the sales user fixes the documents,
    // route directly back to Operations (document_review) without bothering Sales Admin again!
    newStatus = 'document_review';
    note = 'Sales user updated documents/photos after Operations review and forwarded directly back to Operations for verification.';
  } else if (wasRejectedBySalesAdmin) {
    newStatus = 'sales_admin_review';
    note = 'Sales user re-applied with updated details and forwarded back to Sales Admin for approval.';
  } else {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const metadata = org?.metadata as any;
    const requiresSalesAdmin = metadata?.enrollmentApprovalFlow === 'sales_admin_approval';
    
    newStatus = requiresSalesAdmin ? 'sales_admin_review' : 'document_review';
    note = requiresSalesAdmin 
      ? 'Sales user verified application and forwarded to Sales Admin for approval.'
      : 'Sales user verified/resubmitted application and forwarded to Operations for document verification.';
  }

  // Reset any previously rejected doc statuses to 'pending' upon re-upload so Operations can re-evaluate
  const incomingDocs = documents !== undefined ? documents : enrollment.documents;
  const cleanedDocs = Array.isArray(incomingDocs)
    ? incomingDocs.map((d: any) => ({
        ...d,
        status: d?.status === 'rejected' ? 'pending' : (d?.status || 'pending')
      }))
    : enrollment.documents;

  const isPhotoUpdated = photo !== undefined && photo !== enrollment.photo;
  const newPhotoStatus = (enrollment.photoStatus === 'rejected' || isPhotoUpdated) ? 'pending' : (enrollment.photoStatus || 'pending');

  const finalEnrollment = await prisma.enrollment.update({
    where: { id },
    data: {
      status: newStatus,
      documents: cleanedDocs as any,
      photoStatus: newPhotoStatus,
      departmentRemarks: null,
      ...(isFinanceRejection ? { financeRemarks: null, receiptVerified: false } : {}),
      statusHistory: appendHistory(updatedEnrollment.statusHistory, {
        status: newStatus,
        actorId: salesUserId,
        actorName: req.user.name,
        actorRole: req.user.role,
        timestamp: now.toISOString(),
        note: note,
      }) as any,
    }
  });

  if (finalEnrollment.studentId) {
    const existingStudent = await prisma.student.findUnique({ where: { id: finalEnrollment.studentId } });
    const progress = (existingStudent?.admissionProgress as any) || {};
    const newProgress = { ...progress, photoStatus: newPhotoStatus };

    await prisma.student.update({
      where: { id: finalEnrollment.studentId },
      data: {
        documents: cleanedDocs as any,
        photo: photo !== undefined ? photo : finalEnrollment.photo,
        admissionProgress: newProgress,
      }
    });
  }

  // Notify admins
  if (isFinanceRejection) {
    try {
      const financeAdmins = await prisma.user.findMany({
        where: { organizationId: orgId, role: { in: ['finance_admin', 'finance_sub_admin'] }, status: 'active' },
        select: { id: true },
      });
      for (const admin of financeAdmins) {
        const notifTitle = 'Payment Receipt Re-uploaded';
        const notifMsg = `${finalEnrollment.studentName}'s payment receipt was re-uploaded by ${req.user.name}. Please verify the payment.`;
        const notif = await prisma.notification.create({
          data: {
            organizationId: orgId,
            userId: admin.id,
            title: notifTitle,
            message: notifMsg,
            type: 'general',
            priority: 'medium',
            link: 'enrollments_finance',
          },
        });
        try { emitToUser(admin.id, 'notification', notif); } catch (_) {}
        sendPushNotification(admin.id, notifTitle, notifMsg, { type: 'enrollments_finance', enrollmentId: finalEnrollment.id, link: 'enrollments_finance' })
          .catch(e => console.error('[Push Notification Error]:', e?.message || e));
      }
    } catch (_) { /* non-critical */ }
  } else if (newStatus === 'document_review') {
    try {
      const adminsToNotify = await prisma.user.findMany({
        where: { organizationId: orgId, role: { in: ['ops_admin', 'ops_sub_admin'] }, status: 'active' },
        select: { id: true },
      });
      for (const admin of adminsToNotify) {
        const notifTitle = wasRejectedByOperations ? 'Resubmitted Application for Operations Review' : 'New Student Application for Review';
        const notifMsg = wasRejectedByOperations
          ? `${finalEnrollment.studentName}'s application was updated with corrected documents by ${req.user.name}. Please review.`
          : `${finalEnrollment.studentName} has been verified by Sales and applied for ${enrollment.program.name}. Please review.`;
        const notif = await prisma.notification.create({
          data: {
            organizationId: orgId,
            userId: admin.id,
            title: notifTitle,
            message: notifMsg,
            type: 'general',
            priority: 'medium',
            link: 'enrollment_review',
          },
        });
        try { emitToUser(admin.id, 'notification', notif); } catch (_) {}
        sendPushNotification(admin.id, notifTitle, notifMsg, { type: 'enrollment_review', enrollmentId: finalEnrollment.id, link: 'enrollment_review' })
          .catch(e => console.error('[Push Notification Error]:', e?.message || e));
      }
    } catch (_) { /* non-critical */ }
  } else {
    // newStatus === 'sales_admin_review'
    try {
      const adminsToNotify = await prisma.user.findMany({
        where: { organizationId: orgId, role: 'sales_admin', status: 'active' },
        select: { id: true },
      });
      for (const admin of adminsToNotify) {
        const notifTitle = wasRejectedBySalesAdmin ? 'Application Re-applied for Sales Approval' : 'New Student Application for Sales Approval';
        const notifMsg = `${finalEnrollment.studentName} has been verified by Sales and applied for ${enrollment.program.name}. Please review.`;
        const notif = await prisma.notification.create({
          data: {
            organizationId: orgId,
            userId: admin.id,
            title: notifTitle,
            message: notifMsg,
            type: 'general',
            priority: 'medium',
            link: 'sales_enrollment_review',
          },
        });
        try { emitToUser(admin.id, 'notification', notif); } catch (_) {}
        sendPushNotification(admin.id, notifTitle, notifMsg, { type: 'sales_enrollment_review', enrollmentId: finalEnrollment.id, link: 'sales_enrollment_review' })
          .catch(e => console.error('[Push Notification Error]:', e?.message || e));
      }
    } catch (_) { /* non-critical */ }
  }

  res.json({ 
    success: true, 
    message: isFinanceRejection
      ? 'Payment receipt re-uploaded and sent directly to Finance.'
      : wasRejectedByOperations
      ? 'Documents updated and sent directly back to Operations for review.'
      : newStatus === 'sales_admin_review'
      ? 'Enrollment verified and submitted to Sales Admin.' 
      : 'Enrollment verified and submitted to Operations.', 
    data: finalEnrollment 
  });
});

// ─── Sales: re-upload ONLY the payment receipt after Finance rejection ───────
// Everything else on the application stays locked. Only the sales user who
// created it can do this, and only while it sits in "rejected" with Finance's
// remarks (a Finance rejection). It goes straight back to Finance review.
export const resubmitPaymentReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { receiptUrl } = req.body;

  if (!receiptUrl || typeof receiptUrl !== 'string' || !receiptUrl.trim()) {
    res.status(400).json({ success: false, message: 'Payment receipt is required.' });
    return;
  }

  const enrollment = await prisma.enrollment.findUnique({ where: { id } });
  if (!enrollment || enrollment.organizationId !== req.user.organizationId) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }
  const canReupload = enrollment.salesUserId === req.user.id ||
    ['sales_admin', 'superadmin', 'org_admin', 'branch_manager'].includes(req.user.role);
  if (!canReupload) {
    res.status(403).json({ success: false, message: 'You are not authorized to re-upload this payment receipt.' });
    return;
  }
  if (enrollment.status !== 'rejected' || !(enrollment as any).financeRemarks) {
    res.status(409).json({ success: false, message: 'The payment receipt can only be re-uploaded after Finance has rejected the application.' });
    return;
  }

  const now = new Date();
  const history = Array.isArray(enrollment.statusHistory) ? [...(enrollment.statusHistory as any[])] : [];
  history.push({
    status: 'finance_review',
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    timestamp: now.toISOString(),
    note: 'Payment receipt re-uploaded by Sales and sent back to Finance for verification.',
  });

  const updated = await prisma.enrollment.update({
    where: { id },
    data: { 
      receiptUrl: receiptUrl.trim(), 
      status: 'finance_review', 
      financeRemarks: null,
      departmentRemarks: null,
      receiptVerified: false,
      statusHistory: history 
    } as any,
  });

  try {
    const financeAdmins = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId, role: { in: ['finance_admin', 'finance_sub_admin'] }, status: 'active' },
      select: { id: true },
    });
    for (const admin of financeAdmins) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: admin.id,
          title: 'Payment Receipt Re-uploaded',
          message: `${enrollment.studentName}'s payment receipt was re-uploaded by ${req.user.name}. Please verify the payment.`,
          type: 'general',
          priority: 'medium',
          link: 'enrollments_finance',
        },
      });
    }
  } catch (_) { /* non-critical */ }

  res.json({ success: true, message: 'Payment receipt re-uploaded and sent to Finance.', data: updated });
});

// True when the application was rejected by a Sales Admin (Finance rejections
// share the "rejected" status but always carry financeRemarks).
// statusHistory is a plain JSON column. Some older code saved entries with
// (helpers moved above verifySalesEnrollment)

export const getSalesAdminReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
  // ?view=rejected -> applications this admin's team submitted that a Sales
  // Admin rejected, so they can be edited and re-requested.
  const wantRejected = req.query.view === 'rejected';
  const baseWhere: any = {
    organizationId: req.user.organizationId,
    status: wantRejected ? 'rejected' : 'sales_admin_review'
  };

  // sales_admin / sales_sub_admin: find subordinates via designation hierarchy (OrgHierarchyPanel)
  if (['sales_admin', 'sales_sub_admin'].includes(req.user.role)) {
    // Step 1: Get the sales_admin's designations
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { designations: { select: { id: true } }, assignedSalesUsers: true }
    });

    const designationIds = currentUser?.designations?.map((d: any) => d.id) || [];
    let subordinateUserIds: string[] = [];

    if (designationIds.length > 0) {
      // Step 2: Find all designations whose parent is one of the sales_admin's designations
      const childDesignations = await prisma.designation.findMany({
        where: { parentDesignationId: { in: designationIds } },
        select: { id: true }
      });
      const childDesignationIds = childDesignations.map(d => d.id);

      if (childDesignationIds.length > 0) {
        // Step 3: Find all users assigned to those child designations
        const subordinateUsers = await prisma.user.findMany({
          where: {
            organizationId: req.user.organizationId,
            designations: { some: { id: { in: childDesignationIds } } },
            status: { not: 'resigned' }
          },
          select: { id: true }
        });
        subordinateUserIds = subordinateUsers.map(u => u.id);
      }
    }

    // Fallback: also include assignedSalesUsers (legacy/manual assignment)
    const assignedIds = Array.isArray(currentUser?.assignedSalesUsers) ? (currentUser.assignedSalesUsers as string[]) : [];
    // Include subordinates, assigned sales users, AND the sales admin's own ID so they can see and approve their own enrollments
    const allowedUserIds = [...new Set([...subordinateUserIds, ...assignedIds, req.user.id])];

    baseWhere.salesUserId = { in: allowedUserIds };
  }
  // org_admin / superadmin see all

  const enrollments = await prisma.enrollment.findMany({
    where: baseWhere,
    include: {
      program: { include: { university: true } },
      studyCenter: true,
      student: true,
      salesUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' }
  });
  const data = wantRejected ? enrollments.filter(isSalesAdminRejected) : enrollments;
  res.json({ success: true, count: data.length, data });
});

export const approveBySalesAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: req.params.id },
    include: { program: { select: { name: true } } }
  });
  if (!enrollment || enrollment.status !== 'sales_admin_review') {
    res.status(404).json({ success: false, message: 'Enrollment not found or not in review status' });
    return;
  }
  const updated = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: 'document_review',
      departmentRemarks: null,
      statusHistory: appendHistory(enrollment.statusHistory, {
        status: 'document_review',
        actorId: req.user.id,
        actorName: req.user.name,
        actorRole: req.user.role,
        timestamp: new Date().toISOString(),
        note: 'Sales Admin approved application and forwarded to Operations.'
      }) as any,
    }
  });

  // 1. Notify Operations team (ops_admin and ops_sub_admin) via In-App + FCM Push Notification + Socket
  try {
    const opsAdmins = await prisma.user.findMany({
      where: {
        organizationId: enrollment.organizationId,
        role: { in: ['ops_admin', 'ops_sub_admin'] },
        status: 'active'
      },
      select: { id: true, name: true }
    });

    const programTitle = (enrollment as any).program?.name ? ` for ${(enrollment as any).program.name}` : '';
    const opsTitle = enrollment.isUpgrade
      ? '🔄 Upgrade Application Approved by Sales Admin'
      : '📋 Student Application Approved by Sales Admin';
    const opsMessage = `${enrollment.studentName}'s application${programTitle} has been approved by Sales Admin (${req.user.name}) and forwarded to Operations for review.`;

    for (const op of opsAdmins) {
      // Create In-App Notification
      const notif = await prisma.notification.create({
        data: {
          organizationId: enrollment.organizationId,
          userId: op.id,
          title: opsTitle,
          message: opsMessage,
          type: 'general',
          priority: enrollment.isUpgrade ? 'high' : 'medium',
          link: 'enrollment_review',
        }
      });

      // Realtime WebSocket notification
      try {
        emitToUser(op.id, 'notification', notif);
      } catch (_) {}

      // FCM Push Notification to device(s)
      sendPushNotification(
        op.id,
        opsTitle,
        opsMessage,
        {
          type: 'enrollment_review',
          enrollmentId: enrollment.id,
          action: 'sales_admin_approved',
          link: 'enrollment_review'
        }
      ).catch(err => console.error(`[Push Notification] Error sending to Ops ${op.id}:`, err?.message || err));
    }
  } catch (err: any) {
    console.error('[approveBySalesAdmin] Error notifying operations:', err?.message || err);
  }

  // 2. Notify the Sales Counselor (creator/owner of the application)
  if (enrollment.salesUserId) {
    try {
      const programTitle = (enrollment as any).program?.name ? ` for ${(enrollment as any).program.name}` : '';
      const counselorTitle = '✅ Application Approved by Sales Admin';
      const counselorMessage = `Your student application for ${enrollment.studentName}${programTitle} has been approved by Sales Admin (${req.user.name}) and forwarded to Operations.`;

      const counselorNotif = await prisma.notification.create({
        data: {
          organizationId: enrollment.organizationId,
          userId: enrollment.salesUserId,
          title: counselorTitle,
          message: counselorMessage,
          type: 'general',
          priority: 'high',
          link: 'student-applications',
        }
      });

      try {
        emitToUser(enrollment.salesUserId, 'notification', counselorNotif);
      } catch (_) {}

      sendPushNotification(
        enrollment.salesUserId,
        counselorTitle,
        counselorMessage,
        {
          type: 'student_application',
          enrollmentId: enrollment.id,
          action: 'sales_admin_approved',
          link: 'student-applications'
        }
      ).catch(err => console.error(`[Push Notification] Error sending to Sales user ${enrollment.salesUserId}:`, err?.message || err));
    } catch (err: any) {
      console.error('[approveBySalesAdmin] Error notifying sales user:', err?.message || err);
    }
  }

  res.json({ success: true, data: updated, message: 'Application approved' });
});

export const rejectBySalesAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { remarks } = req.body;
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: req.params.id },
    include: { program: { select: { name: true } } }
  });
  if (!enrollment || enrollment.status !== 'sales_admin_review') {
    res.status(404).json({ success: false, message: 'Enrollment not found or not in review status' });
    return;
  }
  const updated = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: 'rejected',
      departmentRemarks: remarks,
      statusHistory: appendHistory(enrollment.statusHistory, {
        status: 'rejected',
        actorId: req.user.id,
        actorName: req.user.name,
        actorRole: req.user.role,
        timestamp: new Date().toISOString(),
        note: `Sales Admin rejected: ${remarks || 'No remarks'}`
      }) as any,
    }
  });

  // Notify the Sales Counselor
  if (enrollment.salesUserId) {
    try {
      const programTitle = (enrollment as any).program?.name ? ` for ${(enrollment as any).program.name}` : '';
      const counselorTitle = '❌ Application Rejected by Sales Admin';
      const counselorMessage = `Application for ${enrollment.studentName}${programTitle} was rejected by Sales Admin (${req.user.name}). Reason: ${remarks || 'No remarks provided.'}`;

      const counselorNotif = await prisma.notification.create({
        data: {
          organizationId: enrollment.organizationId,
          userId: enrollment.salesUserId,
          title: counselorTitle,
          message: counselorMessage,
          type: 'general',
          priority: 'high',
          link: 'student-applications',
        }
      });

      try {
        emitToUser(enrollment.salesUserId, 'notification', counselorNotif);
      } catch (_) {}

      sendPushNotification(
        enrollment.salesUserId,
        counselorTitle,
        counselorMessage,
        {
          type: 'student_application',
          enrollmentId: enrollment.id,
          action: 'sales_admin_rejected',
          link: 'student-applications'
        }
      ).catch(err => console.error(`[Push Notification] Error sending to Sales user ${enrollment.salesUserId}:`, err?.message || err));
    } catch (err: any) {
      console.error('[rejectBySalesAdmin] Error notifying sales user:', err?.message || err);
    }
  }

  res.json({ success: true, data: updated, message: 'Application rejected' });
});
