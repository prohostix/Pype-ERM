import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';
import { normalizeEmail, normalizePhone, checkStudentOrEnrollmentExists } from '../utils/studentValidation.js';

export const getWallet = asyncHandler(async (req: AuthRequest, res: Response) => {
  const wallet = await prisma.studyCenterWallet.findUnique({ where: { studyCenterId: req.user.studyCenterId || '' } });
  res.json({ success: true, data: wallet });
});

export const submitTopUp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const topUp = await prisma.walletTopUp.create({ data: { ...req.body, studyCenterId: req.user.studyCenterId || '', organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: topUp });
});

export const getTopUpHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const topUps = await prisma.walletTopUp.findMany({ where: { studyCenterId: req.user.studyCenterId || '' } });
  res.json({ success: true, count: topUps.length, data: topUps });
});

export const getEnrollablePrograms = asyncHandler(async (req: AuthRequest, res: Response) => {
  let programs: any[] = [];

  if (req.user.role === 'center_admin') {
    if (req.user.studyCenterId) {
      const allocations = await prisma.programAllocation.findMany({
        where: { centerId: req.user.studyCenterId, organizationId: req.user.organizationId, isActive: true }
      });
      const allocatedProgramIds = allocations.map(a => a.programId);
      programs = await prisma.program.findMany({ 
        where: { organizationId: req.user.organizationId, status: 'active', id: { in: allocatedProgramIds } },
        include: { university: true, feeStructures: true }
      });
    }
  } else {
    programs = await prisma.program.findMany({ 
      where: { organizationId: req.user.organizationId, status: 'active' },
      include: { university: true, feeStructures: true }
    });
  }

  res.json({ success: true, count: programs.length, data: programs });
});

export const createEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, feeMode, universityId, ...rest } = req.body;
  const data: any = {
    ...rest,
    organizationId: req.user.organizationId
  };

  // Mobile and web forms send text fields; the database wants real types.
  if (data.initialPaymentAmount !== undefined) {
    const amount = Number(data.initialPaymentAmount);
    if (data.initialPaymentAmount === '' || data.initialPaymentAmount === null || Number.isNaN(amount)) {
      delete data.initialPaymentAmount;
    } else {
      data.initialPaymentAmount = amount;
    }
  }
  if (data.initialPaymentDate !== undefined) {
    const when = data.initialPaymentDate ? new Date(data.initialPaymentDate) : null;
    if (!when || Number.isNaN(when.getTime())) delete data.initialPaymentDate;
    else data.initialPaymentDate = when;
  }
  // Blank selections must be absent, not empty strings (which break foreign keys).
  for (const key of ['sessionId', 'studentId']) {
    if (typeof data[key] === 'string' && data[key].trim() === '') delete data[key];
  }

  if (!data.programId || typeof data.programId !== 'string') {
    res.status(400).json({ success: false, message: 'Program is required' });
    return;
  }
  const programExists = await prisma.program.findFirst({
    where: { id: data.programId, organizationId: req.user.organizationId }
  });
  if (!programExists) {
    res.status(400).json({ success: false, message: 'Selected Program does not exist' });
    return;
  }
  if (data.sessionId) {
    const sessionExists = await prisma.admissionSession.findFirst({
      where: { id: data.sessionId, organizationId: req.user.organizationId }
    });
    if (!sessionExists) {
      res.status(400).json({ success: false, message: 'Selected Admission Session does not exist' });
      return;
    }
  }
  
  if (req.user.studyCenterId) {
    data.studyCenterId = req.user.studyCenterId;
  }
  
  let currentStudentId = studentId;
  const cleanEmail = normalizeEmail(rest.studentEmail);
  const cleanPhone = (rest.studentPhone || '').trim();
  const isUpgrade = Boolean(req.body.isUpgrade || rest.isUpgrade);

  // Enforce uniqueness: block duplicate enrollment if student or active enrollment with same email/phone exists
  const uniquenessCheck = await checkStudentOrEnrollmentExists({
    email: cleanEmail,
    phone: cleanPhone,
    organizationId: req.user.organizationId,
    existingStudentId: isUpgrade && currentStudentId ? currentStudentId : undefined,
    excludeStudentId: !isUpgrade && currentStudentId ? currentStudentId : undefined,
    isUpgrade,
    programId: data.programId,
    sessionId: data.sessionId
  });

  if (!uniquenessCheck.isUnique) {
    res.status(400).json({
      success: false,
      message: uniquenessCheck.message,
      field: uniquenessCheck.field
    });
    return;
  }

  if (currentStudentId && !isUpgrade) {
    const existingActiveEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: currentStudentId,
        status: { notIn: ['rejected', 'cancelled', 'ops_rejected', 'department_rejected', 'completed', 'graduated', 'alumni'] }
      }
    });
    if (existingActiveEnrollment) {
      res.status(400).json({
        success: false,
        message: 'Enrollment already exists'
      });
      return;
    }
  }

  data.studentEmail = cleanEmail;
  data.studentPhone = cleanPhone;

  if (!currentStudentId) {
    // Generate Admission Number for Provisional
    const org = await prisma.organization.findUnique({ where: { id: req.user.organizationId } });
    let admissionPrefix = 'ADM';
    if (org?.metadata && (org.metadata as any).admissionPrefix) {
      admissionPrefix = (org.metadata as any).admissionPrefix;
    } else if (org?.name) {
      admissionPrefix = org.name.substring(0, 3).toUpperCase();
    }
    
    let isUnique = false;
    let newAdmissionNo = '';
    while (!isUnique) {
      const randomStr = Math.floor(100000 + Math.random() * 900000).toString();
      newAdmissionNo = `${admissionPrefix}-${randomStr}`;
      const existing = await prisma.student.findFirst({ where: { admissionNo: newAdmissionNo } });
      if (!existing) isUnique = true;
    }

    const program = await prisma.program.findUnique({ where: { id: rest.programId } });

    // Ensure User account exists to satisfy Student_email_fkey foreign key constraint.
    // Use the normalized email (trimmed, lower-case) for BOTH the login account and the
    // student record; an email typed with capitals or spaces used to create the account
    // under one spelling and the student under another, which broke the link.
    let studentUser = await prisma.user.findFirst({ where: { email: { equals: cleanEmail, mode: 'insensitive' } } });
    const defaultPassword = `Student@${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedPassword = await hashPassword(defaultPassword);

    if (!studentUser) {
      const generatedUid = await generateUserId();
      studentUser = await prisma.user.create({
        data: {
          userId: generatedUid,
          organizationId: req.user.organizationId,
          email: cleanEmail,
          password: hashedPassword,
          name: rest.studentName,
          role: 'student',
          phone: rest.studentPhone || '',
          status: 'active',
        },
      });
    }

    const newStudent = await prisma.student.create({
      data: {
        name: rest.studentName,
        email: studentUser.email,
        phone: cleanPhone,
        address: rest.studentAddress || 'Pending',
        organizationId: req.user.organizationId,
        centerId: req.user.studyCenterId || null,
        branchId: req.user.branchId || null,
        universityId: program?.universityId || null,
        programId: rest.programId,
        sessionId: rest.sessionId,
        admissionNo: newAdmissionNo,
        credentials: { email: cleanEmail, password: defaultPassword },
        enrolledBy: req.user.id,
        status: rest.isProvisional ? 'provisional' : 'document_review'
      }
    });
    currentStudentId = newStudent.id;
    data.studentId = currentStudentId;
  } else {
    data.studentId = currentStudentId;
  }

  // Automatically attach salesUserId if the user is a staff member creating the enrollment
  if (req.user && req.user.role !== 'student') {
    data.salesUserId = req.user.id;
  }
  
  const enrollment = await prisma.enrollment.create({ data });

  // Notify finance admins for provisional enrollments
  if (rest.isProvisional) {
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
            title: 'New Provisional Enrollment',
            message: `${rest.studentName} has been provisionally enrolled and is awaiting fee receipt verification.`,
            type: 'general',
            priority: 'medium',
            link: 'provisional_verifications',
          },
        });
      }
    } catch (_) { /* non-critical */ }
  }

  if (studentId) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (student && !student.admissionNo) {
      const org = await prisma.organization.findUnique({ where: { id: req.user.organizationId } });
      let admissionPrefix = 'ADM';
      if (org?.metadata && (org.metadata as any).admissionPrefix) {
        admissionPrefix = (org.metadata as any).admissionPrefix;
      } else if (org?.name) {
        admissionPrefix = org.name.substring(0, 3).toUpperCase();
      }
      
      let isUnique = false;
      let newAdmissionNo = '';
      while (!isUnique) {
        const randomStr = Math.floor(100000 + Math.random() * 900000).toString();
        newAdmissionNo = `${admissionPrefix}-${randomStr}`;
        const existing = await prisma.student.findFirst({ where: { admissionNo: newAdmissionNo } });
        if (!existing) isUnique = true;
      }
      
      await prisma.student.update({
        where: { id: studentId },
        data: { admissionNo: newAdmissionNo }
      });
    }
  }

  res.status(201).json({ success: true, data: enrollment });
});

export const getMyEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const where: any = { studyCenterId: req.user.studyCenterId || '' };
  
  if (status) {
    where.status = status;
  }

  const enrollments = await prisma.enrollment.findMany({ 
    where,
    include: { program: true, student: true, session: true },
    orderBy: { createdAt: 'desc' }
  });
  
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const getMyCenterStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.findUnique({ where: { id: req.user.studyCenterId || '' } });
  res.json({ success: true, data: center });
});

export const submitMyCenterPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Payment submitted' });
});

export const uploadReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollmentId = req.params.id;
  if (!req.file) {
    res.status(400);
    throw new Error('No receipt file uploaded');
  }
  // @ts-ignore
  const fileUrl = `/uploads/${req.file.key || req.file.filename}`;

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId }
  });

  if (!enrollment) {
    res.status(404);
    throw new Error('Enrollment not found');
  }

  // Optional: Add to statusHistory if transitioning to 'receipt_submitted'
  const historyEntry = {
    status: 'receipt_submitted',
    changedAt: new Date().toISOString(),
    changedBy: req.user.id,
    remarks: 'Payment receipt uploaded'
  };

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      receiptUrl: fileUrl,
      receiptVerified: false,
      status: enrollment.isProvisional ? enrollment.status : 'receipt_submitted',
      statusHistory: {
        push: historyEntry
      }
    }
  });

  res.json({ success: true, data: updated });
});

export const completeProvisionalEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollmentId = req.params.id;
  const {
    name, email, phone, address, dob,
    fatherName, fatherPhone, motherName, motherPhone,
    religion, caste, altPhone, pinCode, photo, documents,
    gender, category, maritalStatus, employmentStatus,
    guardianName, familyPhone, specialisation,
    ...updateData
  } = req.body;

  const enrollment = await prisma.enrollment.findUnique({ 
    where: { id: enrollmentId },
    include: { program: true } 
  });
  if (!enrollment) {
    res.status(404);
    throw new Error('Enrollment not found');
  }

  // Find or create student user account for credentials
  const targetEmail = (email || enrollment.studentEmail || '').trim();
  let studentUser = targetEmail ? await prisma.user.findUnique({ where: { email: targetEmail } }) : null;
  if (!studentUser && targetEmail) {
    const generatedUid = await generateUserId();
    const defaultPassword = `Student@${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedPassword = await hashPassword(defaultPassword);
    studentUser = await prisma.user.create({
      data: {
        userId: generatedUid,
        organizationId: req.user.organizationId,
        email: targetEmail,
        password: hashedPassword,
        name: name || enrollment.studentName,
        role: 'student',
        phone: phone || enrollment.studentPhone || '',
        status: 'active',
      },
    });
  }

  const studentData: any = {
    name: name || enrollment.studentName,
    email: email || enrollment.studentEmail,
    phone: phone || enrollment.studentPhone,
    address: address || '',
    dob: dob ? new Date(dob) : null,
    fatherName: fatherName || null,
    fatherPhone: fatherPhone || null,
    motherName: motherName || null,
    motherPhone: motherPhone || null,
    religion: religion || null,
    caste: caste || null,
    altPhone: altPhone || null,
    pinCode: pinCode || null,
    photo: photo || null,
    documents: (documents || []).map((d: any) => (d && d.status === 'rejected' ? { ...d, status: 'pending' } : d)),
    gender: gender || null,
    category: category || null,
    maritalStatus: maritalStatus || null,
    employmentStatus: employmentStatus || null,
    guardianName: guardianName || null,
    familyPhone: familyPhone || null,
    specialisation: specialisation || null,
    status: 'document_review',
    programId: enrollment.programId,
    sessionId: enrollment.sessionId,
    universityId: enrollment.program?.universityId || null,
    centerId: enrollment.studyCenterId,
    branchId: req.user.branchId || null,
    organizationId: req.user.organizationId,
    enrolledBy: enrollment.salesUserId || req.user.id
  };

  let isPhotoUpdated = false;
  let student;
  if (enrollment.studentId) {
    const existingStudent = await prisma.student.findUnique({
      where: { id: enrollment.studentId }
    });
    let admissionProgress = (existingStudent?.admissionProgress as any) || {};
    if (photo && photo !== existingStudent?.photo) {
      admissionProgress = { ...admissionProgress, photoStatus: 'pending' };
      isPhotoUpdated = true;
    } else if (admissionProgress?.photoStatus === 'rejected') {
      admissionProgress = { ...admissionProgress, photoStatus: 'pending' };
      isPhotoUpdated = true;
    }

    student = await prisma.student.update({
      where: { id: enrollment.studentId },
      data: { ...studentData, admissionProgress }
    });
  } else {
    isPhotoUpdated = !!photo;
    
    // Generate Admission Number
    const org = await prisma.organization.findUnique({ where: { id: req.user.organizationId } });
    let admissionPrefix = 'ADM';
    if (org?.metadata && (org.metadata as any).admissionPrefix) {
      admissionPrefix = (org.metadata as any).admissionPrefix;
    } else if (org?.name) {
      admissionPrefix = org.name.substring(0, 3).toUpperCase();
    }
    
    let isUnique = false;
    let newAdmissionNo = '';
    while (!isUnique) {
      const randomStr = Math.floor(100000 + Math.random() * 900000).toString();
      newAdmissionNo = `${admissionPrefix}-${randomStr}`;
      const existing = await prisma.student.findFirst({ where: { admissionNo: newAdmissionNo } });
      if (!existing) isUnique = true;
    }
    
    studentData.admissionNo = newAdmissionNo;

    const existingByEmail = await prisma.student.findUnique({ where: { email: studentData.email } });
    if (existingByEmail) {
      student = await prisma.student.update({
        where: { id: existingByEmail.id },
        data: studentData
      });
    } else {
      student = await prisma.student.create({
        data: studentData
      });
    }
  }

  // Routing logic:
  // 1) If this is an upgrade enrollment, route to ops_upgrade_verification for Operations review.
  // 2) If Finance rejected the payment receipt, re-uploading must return directly to Finance (finance_review).
  // 3) If Sales Admin explicitly rejected it, re-applying must go back to Sales Admin for approval.
  // 4) If it's a first-time provisional completion and org requires sales admin approval, send to Sales Admin.
  // 5) In all other cases (including Operations document rejection), it goes to Operations (document_review).
  const isFinanceRejection = (enrollment.status === 'rejected' && !!enrollment.financeRemarks) ||
    (enrollment.status === 'rejected' && !!(enrollment as any).financeReviewedBy);

  const org = await prisma.organization.findUnique({ where: { id: enrollment.organizationId } });
  const flowEnabled = (org?.metadata as any)?.enrollmentApprovalFlow === 'sales_admin_approval';
  const rawHist: any = enrollment.statusHistory;
  const history: any[] = Array.isArray(rawHist) ? rawHist : (rawHist && typeof rawHist === 'object' ? Object.values(rawHist) : []);
  
  // Check if student has any modal document or photo rejection from Operations
  const existingDocs = Array.isArray(enrollment.documents) ? (enrollment.documents as any[]) : [];
  const studentProg = (student?.admissionProgress as any) || {};
  const hasModalRejection = enrollment.photoStatus === 'rejected' ||
    studentProg?.photoStatus === 'rejected' ||
    existingDocs.some((d: any) => d && d.status === 'rejected');

  const wasAlreadyInOperations = enrollment.status === 'document_review' || enrollment.status === 'ops_rejected';
  const hasPassedSalesAdmin = history.some((h: any) => 
    h?.status === 'document_review' || 
    String(h?.note || '').toLowerCase().includes('sales admin approved')
  );

  // An enrollment is ONLY rejected by Sales Admin if its current status is 'rejected' (not in Operations)
  // AND the last rejection note was from Sales Admin, AND Sales Admin has not approved it since.
  const lastRejectionIndex = history.map((h: any) => h?.status).lastIndexOf('rejected');
  const lastApprovalIndex = history.map((h: any) => String(h?.note || '').toLowerCase()).lastIndexOf('sales admin approved');
  const wasRejectedBySalesAdmin = !isFinanceRejection &&
    enrollment.status === 'rejected' &&
    lastRejectionIndex !== -1 &&
    String(history[lastRejectionIndex]?.note || '').startsWith('Sales Admin rejected') &&
    (lastApprovalIndex === -1 || lastApprovalIndex < lastRejectionIndex);

  const wasRejectedByOperations = enrollment.status === 'ops_rejected' ||
    hasModalRejection ||
    (wasAlreadyInOperations && !wasRejectedBySalesAdmin && !isFinanceRejection) ||
    (hasPassedSalesAdmin && !wasRejectedBySalesAdmin && !isFinanceRejection);

  const isAcademicPartner = Boolean(
    enrollment.studyCenterId ||
    student?.centerId ||
    req.user.studyCenterId ||
    req.user.role === 'center_admin'
  );

  let nextStatus = 'document_review';
  let remarksNote = enrollment.isProvisional 
    ? 'Provisional enrollment completed with full details by Sales' 
    : 'Re-applied by Sales with updated documents and forwarded to Operations';

  if (isAcademicPartner) {
    nextStatus = isFinanceRejection ? 'finance_review' : 'document_review';
    remarksNote = isFinanceRejection
      ? 'Payment receipt re-uploaded by Academic Partner and forwarded directly to Finance for verification'
      : (enrollment.isProvisional
          ? 'Academic partner provisional enrollment completed and forwarded directly to Operations for review'
          : 'Academic partner application forwarded directly to Operations for review');
  } else if (enrollment.isUpgrade) {
    if (wasRejectedBySalesAdmin) {
      nextStatus = 'sales_admin_review';
      remarksNote = 'Upgrade application re-submitted and forwarded back to Sales Admin for approval';
    } else {
      nextStatus = 'document_review';
      remarksNote = 'Upgrade application re-submitted with updated documents and forwarded to Operations for verification';
    }
  } else if (isFinanceRejection) {
    nextStatus = 'finance_review';
    remarksNote = 'Payment receipt re-uploaded by Sales and forwarded directly back to Finance for verification';
  } else if (wasRejectedByOperations) {
    // Operations rejected photo/docs in review modal or main rejection, or application was already in Operations:
    // Route directly back to Operations (document_review) without going to Sales Admin!
    nextStatus = 'document_review';
    remarksNote = 'Re-applied by Sales with updated documents/photos and forwarded directly to Operations for review';
  } else if (flowEnabled) {
    if (wasRejectedBySalesAdmin) {
      nextStatus = 'sales_admin_review';
      remarksNote = 'Re-applied by Sales with updated documents and sent back to Sales Admin for approval';
    } else if (enrollment.isProvisional && !hasPassedSalesAdmin && !history.some((h: any) => h?.status === 'sales_admin_review')) {
      nextStatus = 'sales_admin_review';
      remarksNote = 'Provisional enrollment completed with full details by Sales and sent to Sales Admin for approval';
    }
  }

  const requiresFinance = nextStatus === 'finance_review';
  const requiresSalesAdmin = nextStatus === 'sales_admin_review';

  const historyEntry = {
    status: nextStatus,
    changedAt: new Date().toISOString(),
    changedBy: req.user.id,
    remarks: remarksNote
  };

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      studentId: student.id,
      isProvisional: false,
      status: nextStatus,
      studentName: student.name,
      studentEmail: student.email,
      studentPhone: student.phone,
      studentAddress: student.address,
      documents: Array.isArray(student.documents)
        ? (student.documents as any[]).map((d: any) => ({ ...d, status: d?.status === 'rejected' ? 'pending' : (d?.status || 'pending') }))
        : [],
      photo: student.photo,
      ...(req.body.receiptUrl ? { receiptUrl: String(req.body.receiptUrl).trim() } : {}),
      ...(req.body.initialPaymentAmount ? { initialPaymentAmount: Number(req.body.initialPaymentAmount) } : {}),
      ...(isFinanceRejection ? { financeRemarks: null, receiptVerified: false, departmentRemarks: null } : {}),
      ...(nextStatus === 'document_review' ? { departmentRemarks: null } : {}),
      ...(isPhotoUpdated || enrollment.photoStatus === 'rejected' ? { photoStatus: 'pending' } : {}),
      statusHistory: [...history, historyEntry] as any,
    }
  });

  if (requiresFinance) {
    try {
      const financeAdmins = await prisma.user.findMany({
        where: { organizationId: enrollment.organizationId, role: { in: ['finance_admin', 'finance_sub_admin'] }, status: 'active' },
        select: { id: true },
      });
      for (const admin of financeAdmins) {
        await prisma.notification.create({
          data: {
            organizationId: enrollment.organizationId,
            userId: admin.id,
            title: 'Payment Receipt Re-uploaded',
            message: `${student.name}'s payment receipt was re-uploaded by ${req.user.name}. Please verify the payment.`,
            type: 'general',
            priority: 'medium',
            link: 'enrollments_finance',
          },
        });
      }
    } catch (_) { /* non-critical */ }
  } else if (requiresSalesAdmin) {
    try {
      const admins = await prisma.user.findMany({
        where: { organizationId: enrollment.organizationId, role: 'sales_admin', status: 'active' },
        select: { id: true },
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            organizationId: enrollment.organizationId,
            userId: admin.id,
            title: 'Application Re-applied for Sales Approval',
            message: `${student.name}'s application was re-applied by ${req.user.name} with updated documents. Please review.`,
            type: 'general',
            priority: 'medium',
            link: 'sales_enrollment_review',
          },
        });
      }
    } catch (_) { /* non-critical */ }
  } else {
    try {
      const opsUsers = await prisma.user.findMany({
        where: { organizationId: enrollment.organizationId, role: { in: ['ops_admin', 'ops_sub_admin'] }, status: 'active' },
        select: { id: true },
      });
      for (const op of opsUsers) {
        await prisma.notification.create({
          data: {
            organizationId: enrollment.organizationId,
            userId: op.id,
            title: enrollment.isUpgrade ? '🔄 Upgrade Application Resubmitted' : 'Student Documents Submitted to Operations',
            message: enrollment.isUpgrade
              ? `${student.name}'s upgrade application with updated documents was submitted by ${req.user.name}. Please review.`
              : `${student.name}'s application with updated details/documents was submitted by ${req.user.name}. Please review.`,
            type: 'general',
            priority: enrollment.isUpgrade ? 'high' : 'medium',
            link: 'enrollment_review',
          },
        });
      }
    } catch (_) { /* non-critical */ }
  }

  res.json({ success: true, data: updated });
});

export const getMyProvisionalEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: req.user.organizationId,
      isProvisional: true,
    },
    include: { program: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});
