import { Prisma } from '../generated/client/index.js';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/postgres.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';
import { sendEmail } from '../utils/emailService.js';

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
      university: { select: { id: true, name: true, code: true, logo: true } },
      feeStructures: { select: { allowInitialFee: true, specialisation: true } },
    },
  });

  res.status(200).json({
    success: true,
    data: {
      organizationName: invite.organization.name,
      referrerName: invite.referrer.name,
      programs: programs.map(p => ({ ...p, specialisations: p.specialisations })),
      token,
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

  // Check for duplicate email in same program+session
  const existing = await prisma.enrollment.findFirst({
    where: { studentEmail, programId, sessionId: session.id, organizationId: orgId },
  });
  if (existing) {
    res.status(400).json({ success: false, message: 'An application with this email already exists for this program' });
    return;
  }

  const now = new Date();

  // Create enrollment with document_review status
  const enrollment = await prisma.enrollment.create({
    data: {
      organizationId: orgId,
      studentName,
      studentEmail,
      studentPhone,
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
  const salesUserId = req.user.id;

  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: orgId,
      salesUserId,
      NOT: {
        status: 'enrolled',
        studentId: null
      }
    },
    include: {
      program: { select: { id: true, name: true, code: true, courseType: true, feeStructures: { select: { allowInitialFee: true } } } },
      studyCenter: { select: { id: true, name: true, code: true } },
      session: { select: { id: true, name: true } },
      departmentReviewer: { select: { id: true, name: true, email: true } },
      financeReviewer: { select: { id: true, name: true, email: true } },
      student: true,
    } as any,
    orderBy: { createdAt: 'desc' },
  });

  // Build pipeline summary
  const summary = {
    total: enrollments.length,
    sales_verification_pending: enrollments.filter((e: any) => e.status === 'sales_verification_pending').length,
    document_review: enrollments.filter((e: any) => e.status === 'document_review').length,
    finance_review: enrollments.filter((e: any) => e.status === 'finance_review').length,
    enrolled: enrollments.filter((e: any) => e.status === 'enrolled').length,
    ops_rejected: enrollments.filter((e: any) => e.status === 'ops_rejected').length,
    rejected: enrollments.filter((e: any) => e.status === 'rejected').length,
  };

  res.status(200).json({ success: true, count: enrollments.length, summary, data: enrollments });
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
  const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id } });

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
          role: 'staff', // Fallback role for student in UserRole enum
          phone: enrollment.studentPhone,
          status: 'active',
        },
      });
    } else {
      generatedUid = studentUser.userId || 'PYPEERM0000';
      generatedPassword = '(Existing student account)';
    }

    // 2. Provision Student record if not exists, or update existing to active
    let studentRecord = await prisma.student.findUnique({ where: { email: enrollment.studentEmail } });
    if (!studentRecord) {
      studentRecord = await prisma.student.create({
        data: {
          centerId: enrollment.studyCenterId,
          organizationId: enrollment.organizationId,
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
          admissionNo: `ADM${Date.now().toString().slice(-6)}`,
          ...(generatedPassword !== '(Existing student account)' ? { credentials: { email: enrollment.studentEmail, password: generatedPassword } } : {})
        },
      });
    } else {
      // If student already exists (e.g. from pipeline wizard), activate them
      studentRecord = await prisma.student.update({
        where: { id: studentRecord.id },
        data: {
          status: 'active',
          admissionNo: studentRecord.admissionNo || `ADM${Date.now().toString().slice(-6)}`
        }
      });
    }
    studentRecordId = studentRecord.id;

    // Send credentials email
    if (generatedPassword && generatedPassword !== '(Existing student account)') {
      await sendEmail(
        enrollment.studentEmail,
        'Your Student Portal Credentials',
        `Hello ${enrollment.studentName},\n\nYour enrollment has been approved and account created.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\nEmail: ${enrollment.studentEmail}\nPassword: ${generatedPassword}\n\nRegards,\nSchool Administration`,
        `<p>Hello <strong>${enrollment.studentName}</strong>,</p><p>Your enrollment has been approved and account created.</p><p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a><br/><strong>Email:</strong> ${enrollment.studentEmail}<br/><strong>Password:</strong> ${generatedPassword}</p><p>Regards,<br/>School Administration</p>`
      );
    }
  } catch (err) {
    console.error('Error auto-generating student credentials:', err);
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

  // Check for duplicate
  const existing = await prisma.enrollment.findFirst({
    where: { studentEmail, programId, sessionId: session.id, organizationId: orgId },
  });
  if (existing) {
    res.status(400).json({ success: false, message: 'An application with this email already exists for this program' });
    return;
  }

  const now = new Date();

  // Create enrollment
  const enrollment = await prisma.enrollment.create({
    data: {
      organizationId: orgId,
      studentName,
      studentEmail,
      studentPhone,
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

  if (enrollment.organizationId !== orgId || enrollment.salesUserId !== salesUserId) {
    res.status(403).json({ success: false, message: 'Not authorized to verify this enrollment' });
    return;
  }

  const allowedStatuses = ['sales_verification_pending', 'document_review', 'rejected', 'ops_rejected'];
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

  // Update enrollment with new details and move to document_review
  const updatedEnrollment = await prisma.enrollment.update({
    where: { id },
    data: {
      studentName: studentName || enrollment.studentName,
      studentEmail: studentEmail || enrollment.studentEmail,
      studentPhone: studentPhone || enrollment.studentPhone,
      studentAddress: studentAddress || enrollment.studentAddress,
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
      documents: documents !== undefined ? documents : enrollment.documents,
      photo: photo !== undefined ? photo : enrollment.photo,
      receiptUrl: receiptUrl !== undefined ? receiptUrl : enrollment.receiptUrl,
      paymentPlan: paymentPlan || enrollment.paymentPlan,
      initialPaymentAmount: initialPaymentAmount !== undefined ? Number(initialPaymentAmount) : enrollment.initialPaymentAmount,
      status: 'document_review',
      statusHistory: {
        push: {
          status: 'document_review',
          actorId: salesUserId,
          actorName: req.user.name,
          timestamp: now.toISOString(),
          note: 'Sales user verified/resubmitted application and forwarded to Operations for document verification.',
        }
      }
    }
  });

  if (updatedEnrollment.studentId) {
    // Reset photoStatus to pending if photo is being updated (or even if it's the same, it means a resubmit)
    const existingStudent = await prisma.student.findUnique({ where: { id: updatedEnrollment.studentId } });
    const progress = (existingStudent?.admissionProgress as any) || {};
    const newProgress = { ...progress, photoStatus: 'pending' };

    await prisma.student.update({
      where: { id: updatedEnrollment.studentId },
      data: {
        documents: documents !== undefined ? documents : updatedEnrollment.documents,
        photo: photo !== undefined ? photo : updatedEnrollment.photo,
        admissionProgress: newProgress,
      }
    });
  }

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
          message: `${updatedEnrollment.studentName} has been verified by Sales and applied for ${enrollment.program.name}. Please review the documents.`,
          type: 'general',
          priority: 'medium',
          link: 'enrollment_review',
        },
      });
    }
  } catch (_) { /* non-critical */ }

  res.json({ success: true, message: 'Enrollment verified and submitted to Operations.', data: updatedEnrollment });
});
