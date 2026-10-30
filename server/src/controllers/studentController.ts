import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { Prisma } from '../generated/client/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';
import { sendEmail, sendBrandedStudentCredentials } from '../utils/emailService.js';
import { enqueueNotification } from '../utils/notificationQueue.js';
import { normalizeEmail, normalizePhone, checkStudentOrEnrollmentExists } from '../utils/studentValidation.js';

const SALES_ROLES = ['sales_admin', 'sales_sub_admin', 'sales', 'employee', 'student'];

export const getStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  if (req.query.status) where.status = req.query.status as string;
  if (req.query.missingEnrollment === 'true') {
    where.enrollmentNo = null;
  } else if (req.query.hasEnrollment === 'true') {
    where.enrollmentNo = { not: null };
  }
  
  if (req.query.reregCompleted === 'true') {
    where.reregStatus = { path: ['completed'], equals: true };
  } else if (req.query.reregCompleted === 'false') {
    where.OR = [
      { reregStatus: { equals: Prisma.AnyNull } },
      { reregStatus: { path: ['completed'], equals: false } }
    ];
  }

  if (req.query.centerId) {
    const cId = req.query.centerId as string;
    delete where.branchId;
    if (!where.AND) where.AND = [];
    where.AND.push({
      OR: [
        { centerId: cId },
        { enrollments: { some: { studyCenterId: cId } } }
      ]
    });
  }

  if (req.query.startDate || req.query.endDate) {
    const dateFilter: any = {};
    if (req.query.startDate) {
      dateFilter.gte = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      const end = new Date(req.query.endDate as string);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    if (!where.AND) where.AND = [];
    where.AND.push({
      OR: [
        { enrolledAt: dateFilter },
        { admissionDate: dateFilter },
        { createdAt: dateFilter }
      ]
    });
  }

  // Branch-level isolation for students list
  const globalRoles = ['superadmin', 'org_admin', 'ceo', 'general_manager'];
  if (!globalRoles.includes(req.user.role) && req.user.branchId && !req.query.centerId) {
    where.branchId = req.user.branchId;
  }

  // Sales users only see students they personally enrolled or referred, plus those of their subordinates
  if (SALES_ROLES.includes(req.user.role)) {
    let allowedIds = [req.user.id];
    
    if (['sales_admin', 'sales_sub_admin'].includes(req.user.role)) {
      const targetRoles = (req.user.role === 'sales_admin' ? ['sales_sub_admin', 'sales', 'employee'] : ['sales', 'employee']) as any;
      const subordinates = await prisma.user.findMany({
        where: { role: { in: targetRoles as any }, organizationId: req.user.organizationId },
        select: { id: true }
      });
      allowedIds = [...allowedIds, ...subordinates.map(s => s.id)];
    }

    if (!where.AND) where.AND = [];
    where.AND.push({
      OR: [
        { enrolledBy: { in: allowedIds } },
        { referredBy: { in: allowedIds } }
      ]
    });
  } else if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers as string[] : [];
    
    if (assignedIds.length > 0) {
      delete where.branchId;

      const opsSubAdminFilter: any = { 
        OR: [
          { enrolledBy: { in: assignedIds } }, 
          { referredBy: { in: assignedIds } }
        ] 
      };
      if (!where.AND) where.AND = [];
      where.AND.push(opsSubAdminFilter);
    }
  } else if (req.user.role === 'ops_admin') {
    if (req.user.branchId) {
      const opsSubAdmins = await prisma.user.findMany({
        where: { role: 'ops_sub_admin', organizationId: req.user.organizationId, branchId: req.user.branchId },
        select: { assignedSalesUsers: true }
      });
      
      let assignedIds: string[] = [];
      opsSubAdmins.forEach(sub => {
        if (Array.isArray(sub.assignedSalesUsers)) {
          assignedIds.push(...(sub.assignedSalesUsers as string[]));
        }
      });
      
      if (assignedIds.length > 0) {
        const branchRestriction = where.branchId;
        delete where.branchId;

        const opsAdminFilter: any = {
          OR: [
            { enrolledBy: { in: assignedIds } },
            { referredBy: { in: assignedIds } },
            { branchId: branchRestriction }
          ]
        };
        if (!where.AND) where.AND = [];
        where.AND.push(opsAdminFilter);
      }
    }
  }

  const students = await prisma.student.findMany({
    where,
    include: {
      enrolledByUser: true,
      enrollments: { include: { payment: true } },
      program: true,
      center: true,
      university: true,
      session: true,
      branch: true,
      paymentSchedules: { orderBy: { dueDate: 'asc' } },
      invoices: { include: { payments: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, count: students.length, data: students });
});

export const getStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  let whereClause: any = { id: req.params.id };
  // Enforce branch isolation for students list
  const globalRoles = ['superadmin', 'org_admin', 'ceo', 'general_manager'];
  if (!globalRoles.includes(req.user.role) && req.user.branchId) {
    whereClause.branchId = req.user.branchId;
  }

  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers as string[] : [];
    
    if (assignedIds.length > 0) {
      delete whereClause.branchId;

      const opsSubAdminFilter: any = { 
        OR: [
          { enrolledBy: { in: assignedIds } }, 
          { referredBy: { in: assignedIds } }
        ] 
      };
      if (!whereClause.AND) whereClause.AND = [];
      whereClause.AND.push(opsSubAdminFilter);
    }
  } else if (req.user.role === 'ops_admin') {
    if (req.user.branchId) {
      const opsSubAdmins = await prisma.user.findMany({
        where: { role: 'ops_sub_admin', organizationId: req.user.organizationId, branchId: req.user.branchId },
        select: { assignedSalesUsers: true }
      });
      
      let assignedIds: string[] = [];
      opsSubAdmins.forEach(sub => {
        if (Array.isArray(sub.assignedSalesUsers)) {
          assignedIds.push(...(sub.assignedSalesUsers as string[]));
        }
      });
      
      if (assignedIds.length > 0) {
        const branchRestriction = whereClause.branchId;
        delete whereClause.branchId;

        const opsAdminFilter: any = {
          OR: [
            { enrolledBy: { in: assignedIds } },
            { referredBy: { in: assignedIds } },
            { branchId: branchRestriction }
          ]
        };
        if (!whereClause.AND) whereClause.AND = [];
        whereClause.AND.push(opsAdminFilter);
      }
    }
  }

  const student = await prisma.student.findFirst({
    where: whereClause,
    include: { enrollments: { include: { payment: true } }, program: true, center: true, university: true, session: true, branch: true, paymentSchedules: { orderBy: { dueDate: 'asc' } } }
  });
  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }
  res.status(200).json({ success: true, data: student });
});

export const createStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    email,
    name,
    phone,
    centerId,
    branchId,
    universityId,
    programId,
    sessionId,
    dob,
    admissionDate,
    admissionNo,
    isPrevious,
    fatherName,
    fatherPhone,
    motherName,
    motherPhone,
    religion,
    caste,
    address,
    pinCode,
    altPhone,
    photo,
    documents,
    status,
    paymentPlan,
    gender,
    category,
    maritalStatus,
    employmentStatus,
    guardianName,
    familyPhone,
    specialisation
  } = req.body;
  
  const cleanEmail = normalizeEmail(email);
  const cleanPhone = (phone || '').trim();

  if (!cleanEmail) {
    res.status(400).json({ success: false, message: 'Student email is required' });
    return;
  }
  if (!cleanPhone) {
    res.status(400).json({ success: false, message: 'Student phone number is required' });
    return;
  }

  const isUpgrade = Boolean(req.body.isUpgrade);
  const existingStudentId = req.body.existingStudentId || (isUpgrade ? req.body.studentId : undefined);

  // Enforce uniqueness across existing students and active enrollments
  const uniquenessCheck = await checkStudentOrEnrollmentExists({
    email: cleanEmail,
    phone: cleanPhone,
    organizationId: req.user.organizationId,
    existingStudentId: isUpgrade && existingStudentId ? existingStudentId : undefined,
    excludeStudentId: !isUpgrade && existingStudentId ? existingStudentId : undefined,
    isUpgrade,
    programId,
    sessionId: (sessionId && sessionId.trim() !== '') ? sessionId : null
  });

  if (!uniquenessCheck.isUnique) {
    res.status(400).json({
      success: false,
      message: uniquenessCheck.message,
      field: uniquenessCheck.field
    });
    return;
  }

  if (!programId || programId.trim() === '') {
    res.status(400).json({ success: false, message: 'Program is required' });
    return;
  }

  let resolvedCenterId = centerId;
  if (req.user.role === 'center_admin' && req.user.studyCenterId) {
    resolvedCenterId = req.user.studyCenterId;
  }

  // Verify that the referenced center exists (if provided)
  if (resolvedCenterId && typeof resolvedCenterId === 'string' && resolvedCenterId.trim() !== '') {
    const centerExists = await prisma.studyCenter.findFirst({
      where: { id: resolvedCenterId, organizationId: req.user.organizationId }
    });
    if (!centerExists) {
      res.status(400).json({ success: false, message: 'Selected Study Center does not exist' });
      return;
    }
  }

  // Verify that the referenced branch exists (if provided)
  if (branchId && branchId.trim() !== '') {
    const branchExists = await prisma.branch.findFirst({
      where: { id: branchId, organizationId: req.user.organizationId }
    });
    if (!branchExists) {
      res.status(400).json({ success: false, message: 'Selected Branch does not exist' });
      return;
    }
  }

  // Verify that the referenced program exists
  const programExists = await prisma.program.findFirst({
    where: { id: programId, organizationId: req.user.organizationId }
  });
  if (!programExists) {
    res.status(400).json({ success: false, message: 'Selected Program does not exist' });
    return;
  }

  // Verify the university and admission session too (previously an unknown id
  // only surfaced as a generic foreign-key error from the database).
  if (universityId && typeof universityId === 'string' && universityId.trim() !== '') {
    const universityExists = await prisma.university.findFirst({
      where: { id: universityId, organizationId: req.user.organizationId }
    });
    if (!universityExists) {
      res.status(400).json({ success: false, message: 'Selected University does not exist' });
      return;
    }
  }
  if (sessionId && typeof sessionId === 'string' && sessionId.trim() !== '') {
    const sessionExists = await prisma.admissionSession.findFirst({
      where: { id: sessionId, organizationId: req.user.organizationId }
    });
    if (!sessionExists) {
      res.status(400).json({ success: false, message: 'Selected Admission Session does not exist' });
      return;
    }
  }

  let studentUser = await prisma.user.findFirst({
    where: { email: { equals: cleanEmail, mode: 'insensitive' } }
  });
  const defaultPassword = `Student@${Math.floor(100000 + Math.random() * 900000)}`;
  if (!studentUser) {
    const generatedUid = await generateUserId();
    const hashedPassword = await hashPassword(defaultPassword);
    studentUser = await prisma.user.create({
      data: {
        userId: generatedUid,
        organizationId: req.user.organizationId,
        email: cleanEmail,
        password: hashedPassword,
        name,
        role: 'student', // Fallback role for student in UserRole enum
        phone: cleanPhone,
        status: 'active',
      },
    });
  } else {
    // SECURITY FIX: Do not overwrite passwords of existing admin/staff accounts!
    if (studentUser.role !== 'student') {
      res.status(400).json({ success: false, message: 'Email is already in use by an admin or staff account.' });
      return;
    }
    // We do NOT overwrite the password here, we just use the existing account.
  }

  let student: any;
  if (isUpgrade && existingStudentId) {
    const existing = await prisma.student.findFirst({
      where: { id: existingStudentId, organizationId: req.user.organizationId },
      include: { program: true }
    });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Existing student record not found' });
      return;
    }
    // Update editable fields without creating a duplicate student
    student = await prisma.student.update({
      where: { id: existing.id },
      data: {
        status: 'active',
        isPrevious: false,
        programId: programId,
        admissionDate: admissionDate ? new Date(admissionDate) : (existing.admissionDate || new Date()),
        sessionId: (sessionId && sessionId.trim() !== '') ? sessionId : existing.sessionId,
        specialisation: specialisation || existing.specialisation,
        address: address !== undefined ? address : existing.address,
        pinCode: pinCode !== undefined ? pinCode : existing.pinCode,
        altPhone: altPhone !== undefined ? altPhone : existing.altPhone,
        phone: cleanPhone || existing.phone,
        fatherName: fatherName || existing.fatherName,
        fatherPhone: fatherPhone || existing.fatherPhone,
        motherName: motherName || existing.motherName,
        motherPhone: motherPhone || existing.motherPhone,
        guardianName: guardianName || existing.guardianName,
        familyPhone: familyPhone || existing.familyPhone,
        photo: photo || existing.photo,
        documents: documents || existing.documents,
      }
    });
  } else {
    student = await prisma.student.create({
      data: {
        name,
        email: cleanEmail,
        phone: cleanPhone,
        address: address || '',
        enrollmentNo: req.body.enrollmentNo ? req.body.enrollmentNo : null,
        admissionNo: admissionNo || null,
        admissionDate: admissionDate ? new Date(admissionDate) : (req.body.initialPaymentDate ? new Date(req.body.initialPaymentDate) : new Date()),
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
        documents: documents || [],
        isPrevious: Boolean(isPrevious),
        gender: gender || null,
        category: category || null,
        maritalStatus: maritalStatus || null,
        employmentStatus: employmentStatus || null,
        guardianName: guardianName || null,
        familyPhone: familyPhone || null,
        specialisation: specialisation || null,
        status: req.body.isPipelineApplication ? 'document_review' : (status || 'pending'),
        programId,
        sessionId: (sessionId && sessionId.trim() !== '') ? sessionId : null,
        universityId: universityId || null,
        centerId: (resolvedCenterId && typeof resolvedCenterId === 'string' && resolvedCenterId.trim() !== '') ? resolvedCenterId : null,
        branchId: (branchId && branchId.trim() !== '') ? branchId : (req.user.branchId || null),
        organizationId: req.user.organizationId,
        credentials: { email, password: studentUser.password ? '(Existing Account)' : defaultPassword },
        admissionProgress: { 
          paymentPlan: paymentPlan || 'full',
          initialPaymentAmount: req.body.initialPaymentAmount !== undefined ? Number(req.body.initialPaymentAmount) : null,
          initialPaymentDate: req.body.initialPaymentDate || null
        },
        enrolledBy: req.user.id
      }
    });
  }

  if (req.body.isPipelineApplication || isUpgrade) {
    const now = new Date();
    
    const org = await prisma.organization.findUnique({ where: { id: req.user.organizationId } });
    const targetStudyCenterId = (resolvedCenterId && typeof resolvedCenterId === 'string' && resolvedCenterId.trim() !== '') 
      ? resolvedCenterId 
      : (student.centerId || req.user.studyCenterId || null);

    const isAcademicPartner = Boolean(
      req.user.role === 'center_admin' ||
      req.user.studyCenterId ||
      targetStudyCenterId
    );

    const metadata = org?.metadata as any;
    // Academic Partner enrolled students bypass Sales Admin review completely and go directly to Operations
    const requiresSalesAdmin = !isAcademicPartner && metadata?.enrollmentApprovalFlow === 'sales_admin_approval';
    
    const baseStatus = req.body.receiptUrl ? 'receipt_submitted' : 'payment_pending';
    // If Academic Partner: directly goes to Operations (document_review)
    const initialStatus = isAcademicPartner 
      ? 'document_review' 
      : (requiresSalesAdmin 
          ? 'sales_admin_review' 
          : (isUpgrade ? 'document_review' : baseStatus));

    await prisma.enrollment.create({
      data: {
        organizationId: req.user.organizationId,
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        studentPhone: student.phone,
        studentAddress: student.address,
        fatherName: student.fatherName,
        dob: student.dob,
        programId: programId,
        specialisation: specialisation || student.specialisation,
        studyCenterId: targetStudyCenterId,
        sessionId: (sessionId && sessionId.trim() !== '') ? sessionId : student.sessionId,
        paymentPlan: req.body.paymentPlan || null,
        initialPaymentAmount: req.body.initialPaymentAmount !== undefined ? Number(req.body.initialPaymentAmount) : null,
        initialPaymentDate: req.body.initialPaymentDate ? new Date(req.body.initialPaymentDate) : (admissionDate ? new Date(admissionDate) : null),
        status: initialStatus,
        isUpgrade: isUpgrade,
        previousProgramId: isUpgrade ? (existingStudentId ? (await prisma.student.findUnique({ where: { id: existingStudentId }, select: { programId: true } }))?.programId : student.programId) : null,
        receiptUrl: req.body.receiptUrl || null,
        salesUserId: req.user.role === 'center_admin' ? null : req.user.id,
        gender: student.gender,
        category: student.category,
        religion: student.religion,
        maritalStatus: student.maritalStatus,
        employmentStatus: student.employmentStatus,
        caste: student.caste,
        motherName: student.motherName,
        motherPhone: student.motherPhone,
        fatherPhone: student.fatherPhone,
        guardianName: student.guardianName,
        familyPhone: student.familyPhone,
        photo: student.photo,
        documents: documents || student.documents || undefined,
        statusHistory: [
          {
            status: 'submitted',
            actorId: req.user.id,
            actorName: req.user.name,
            actorRole: req.user.role,
            timestamp: now.toISOString(),
            note: isAcademicPartner
              ? `Academic partner enrolled student directly`
              : (isUpgrade 
                  ? `Sales rep ${req.user.name} submitted Program Upgrade for student.`
                  : `Sales rep ${req.user.name} directly enrolled student via wizard`),
          },
          {
            status: initialStatus,
            actorId: 'system',
            timestamp: now.toISOString(),
            note: isAcademicPartner
              ? 'Forwarded directly to Operations for document verification'
              : (requiresSalesAdmin 
                  ? 'Awaiting Sales Admin approval' 
                  : 'Forwarded to Operations for document verification'),
          },
        ],
      } as any,
    });

    // Notify admins
    try {
      const roleToNotify = requiresSalesAdmin ? 'sales_admin' : 'ops_admin';
      const linkToUse = requiresSalesAdmin ? 'sales_enrollment_review' : 'enrollment_review';
      const titleToUse = requiresSalesAdmin 
        ? (isUpgrade ? '🎓 Student Upgrade for Sales Approval' : 'New Student Application for Sales Approval')
        : (isUpgrade ? '🎓 Student Upgrade Application for Review' : 'New Student Application for Review');
      
      const admins = await prisma.user.findMany({
        where: { organizationId: req.user.organizationId, role: roleToNotify, status: 'active' },
        select: { id: true },
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            organizationId: req.user.organizationId,
            userId: admin.id,
            title: titleToUse,
            message: `${student.name} has applied for ${isUpgrade ? 'an upgrade to ' : ''}${programExists.name} and is ready for review.`,
            type: 'general',
            priority: isUpgrade ? 'high' : 'medium',
            link: linkToUse,
          },
        });
      }
    } catch (_) { /* non-critical */ }
  }

  // Respond immediately to client (0ms delay)
  res.status(201).json({ success: true, data: student });

  // Enqueue credentials email & WhatsApp into background queue
  enqueueNotification({
    type: 'STUDENT_CREDENTIALS',
    data: {
      to: email,
      recipientName: name,
      email,
      password: defaultPassword,
      userId: student.admissionNo || undefined,
      organizationId: req.user.organizationId,
      studentPhone: phone || undefined,
      programName: programExists?.name || undefined,
      admissionNo: student.admissionNo || undefined
    }
  });
});

export const updateStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  let whereClause: any = { id: req.params.id };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    if (assignedIds.length > 0) {
      whereClause.OR = [{ enrolledBy: { in: assignedIds } }, { referredBy: { in: assignedIds } }];
    }
  }

  const studentExists = await prisma.student.findFirst({ where: whereClause });
  if (!studentExists) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  // If credentials.password is updated, hash it and update corresponding User record
  if (req.body.credentials && req.body.credentials.password) {
    const hashedPassword = await hashPassword(req.body.credentials.password);
    
    // Check if user exists first, because some legacy migrations might have skipped user creation
    const existingUser = await prisma.user.findFirst({ where: { email: studentExists.email } });
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword }
      });
    } else {
      const generatedUid = await generateUserId();
      await prisma.user.create({
        data: {
          organizationId: studentExists.organizationId,
          userId: generatedUid,
          email: studentExists.email,
          password: hashedPassword,
          name: studentExists.name,
          role: 'student',
          phone: studentExists.phone,
          status: 'active'
        }
      });
    }
  }

  const dataToUpdate: any = { ...req.body };
  delete dataToUpdate.id;
  delete dataToUpdate.email; // Do not allow updating primary email directly
  delete dataToUpdate.organizationId; // a student never moves to another organization
  // The enrollment form also sends fields that live on other models
  // (e.g. receiptUrl belongs to the enrollment) plus the payment fields handled
  // below. Prisma rejects the whole update on any unknown key, so keep only real
  // student columns (and the payment fields that are folded into admissionProgress).
  const studentColumns = new Set<string>(Object.values(Prisma.StudentScalarFieldEnum));
  const folded = new Set(['paymentPlan', 'initialPaymentAmount', 'initialPaymentDate', 'receiptUrl']);
  for (const key of Object.keys(dataToUpdate)) {
    if (!studentColumns.has(key) && !folded.has(key)) delete dataToUpdate[key];
  }

  if (dataToUpdate.phone) {
    const rawPhone = dataToUpdate.phone.trim();
    const cleanPhone = normalizePhone(rawPhone);
    const existingPhone = normalizePhone(studentExists.phone);

    // Only run uniqueness check if the phone number was changed!
    if (cleanPhone && cleanPhone !== existingPhone) {
      const phoneCheck = await checkStudentOrEnrollmentExists({
        phone: rawPhone,
        organizationId: req.user.organizationId,
        excludeStudentId: req.params.id
      });
      if (!phoneCheck.isUnique) {
        res.status(400).json({ success: false, message: phoneCheck.message, field: 'phone' });
        return;
      }

      // Also update studentPhone on related enrollments
      await prisma.enrollment.updateMany({
        where: { studentId: req.params.id },
        data: { studentPhone: rawPhone }
      });
    }
    dataToUpdate.phone = rawPhone;
  }

  if ('dob' in dataToUpdate) {
    dataToUpdate.dob = (dataToUpdate.dob && String(dataToUpdate.dob).trim() !== '') ? new Date(dataToUpdate.dob) : null;
  }
  if ('admissionDate' in dataToUpdate) {
    dataToUpdate.admissionDate = (dataToUpdate.admissionDate && String(dataToUpdate.admissionDate).trim() !== '') ? new Date(dataToUpdate.admissionDate) : null;
  }
  if ('admissionNo' in dataToUpdate) {
    dataToUpdate.admissionNo = (dataToUpdate.admissionNo && String(dataToUpdate.admissionNo).trim() !== '') ? String(dataToUpdate.admissionNo).trim() : null;
  }
  if ('specialisation' in dataToUpdate) {
    dataToUpdate.specialisation = (dataToUpdate.specialisation && String(dataToUpdate.specialisation).trim() !== '') ? String(dataToUpdate.specialisation).trim() : null;
  }
  if ('enrollmentNo' in dataToUpdate) {
    dataToUpdate.enrollmentNo = (dataToUpdate.enrollmentNo && String(dataToUpdate.enrollmentNo).trim() !== '') ? String(dataToUpdate.enrollmentNo).trim() : null;
  }
  if ('centerId' in dataToUpdate) {
    dataToUpdate.centerId = (dataToUpdate.centerId && String(dataToUpdate.centerId).trim() !== '') ? String(dataToUpdate.centerId).trim() : null;
  }
  if ('branchId' in dataToUpdate) {
    dataToUpdate.branchId = (dataToUpdate.branchId && String(dataToUpdate.branchId).trim() !== '') ? String(dataToUpdate.branchId).trim() : null;
  }
  if ('sessionId' in dataToUpdate) {
    dataToUpdate.sessionId = (dataToUpdate.sessionId && String(dataToUpdate.sessionId).trim() !== '') ? String(dataToUpdate.sessionId).trim() : null;
  }

  if ('universityId' in dataToUpdate) {
    dataToUpdate.universityId = (dataToUpdate.universityId && String(dataToUpdate.universityId).trim() !== '') ? String(dataToUpdate.universityId).trim() : null;
  }
  
  if (dataToUpdate.paymentPlan || dataToUpdate.initialPaymentAmount !== undefined || dataToUpdate.initialPaymentDate !== undefined || dataToUpdate.receiptUrl !== undefined) {
    dataToUpdate.admissionProgress = {
      ...(typeof studentExists.admissionProgress === 'object' && studentExists.admissionProgress !== null ? studentExists.admissionProgress : {}),
    };
    if (dataToUpdate.paymentPlan) {
      dataToUpdate.admissionProgress.paymentPlan = dataToUpdate.paymentPlan;
    }
    if (dataToUpdate.initialPaymentAmount !== undefined) {
      dataToUpdate.admissionProgress.initialPaymentAmount = dataToUpdate.initialPaymentAmount ? Number(dataToUpdate.initialPaymentAmount) : null;
    }
    if (dataToUpdate.initialPaymentDate !== undefined) {
      dataToUpdate.admissionProgress.initialPaymentDate = dataToUpdate.initialPaymentDate || null;
    }
    if (dataToUpdate.receiptUrl !== undefined) {
      dataToUpdate.admissionProgress.receiptUrl = dataToUpdate.receiptUrl || null;
      if (dataToUpdate.receiptUrl && typeof dataToUpdate.receiptUrl === 'string' && dataToUpdate.receiptUrl.trim() !== '') {
        await prisma.enrollment.updateMany({
          where: { studentId: req.params.id },
          data: { receiptUrl: dataToUpdate.receiptUrl.trim() }
        });
      }
    }
    delete dataToUpdate.paymentPlan;
    delete dataToUpdate.initialPaymentAmount;
    delete dataToUpdate.initialPaymentDate;
    delete dataToUpdate.receiptUrl;
  }

  const student = await prisma.student.update({
    where: { id: req.params.id },
    data: dataToUpdate
  });

  if (dataToUpdate.documents !== undefined) {
    await prisma.enrollment.updateMany({
      where: { studentId: req.params.id },
      data: { documents: student.documents as any }
    });
  }

  // Synchronize enrollment status if marked completed or if specific enrollmentId is passed
  if (req.body.enrollmentId) {
    const enrStatus = (dataToUpdate.status === 'completed' || dataToUpdate.isPrevious === true) ? 'completed' : dataToUpdate.status;
    await prisma.enrollment.updateMany({
      where: { id: req.body.enrollmentId, studentId: req.params.id },
      data: { ...(enrStatus ? { status: enrStatus } : {}) }
    });
  } else if (dataToUpdate.status === 'completed' || dataToUpdate.isPrevious === true) {
    // Only update enrollments if not an active upgrade!
    await prisma.enrollment.updateMany({
      where: {
        studentId: req.params.id,
        isUpgrade: false
      },
      data: { status: 'completed' }
    });
  }

  res.status(200).json({ success: true, data: student });
});

export const deleteStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  let whereClause: any = { id: req.params.id };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    if (assignedIds.length > 0) {
      whereClause.OR = [{ enrolledBy: { in: assignedIds } }, { referredBy: { in: assignedIds } }];
    }
  }
  const studentExists = await prisma.student.findFirst({ where: whereClause });
  if (!studentExists) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }
  await prisma.enrollment.deleteMany({ where: { studentId: req.params.id } });
  await prisma.student.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, data: {} });
});

export const approveStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  let whereClause: any = { id: req.params.id };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    if (assignedIds.length > 0) {
      whereClause.OR = [{ enrolledBy: { in: assignedIds } }, { referredBy: { in: assignedIds } }];
    }
  }
  const studentExists = await prisma.student.findFirst({ where: whereClause });
  if (!studentExists) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }
  const student = await prisma.student.update({
    where: { id: req.params.id },
    data: { status: 'active' }
  });
  res.status(200).json({ success: true, data: student });
});

export const bulkImportStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { students, isPrevious, branchId, salesUserId } = req.body;
  if (!Array.isArray(students)) {
    res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of students.' });
    return;
  }

  const organizationId = req.user.organizationId;
  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
    existed: [] as string[]
  };

  const batchEmails = new Set<string>();
  const batchPhones = new Set<string>();

  for (const s of students) {
    try {
      if (!s.email || !s.name) {
        results.skipped++;
        results.errors.push(`Skipped record missing email or name`);
        continue;
      }

      const cleanEmail = normalizeEmail(s.email);
      const rawPhone = (s.phone || '').trim();
      const cleanPhone = normalizePhone(s.phone);

      if (batchEmails.has(cleanEmail) || (cleanPhone && batchPhones.has(cleanPhone))) {
        results.skipped++;
        results.existed.push(`Duplicate within import batch: ${s.name} (${s.email} / ${s.phone || 'No phone'})`);
        continue;
      }

      const uniquenessCheck = await checkStudentOrEnrollmentExists({
        email: cleanEmail,
        phone: cleanPhone,
        organizationId
      });

      if (!uniquenessCheck.isUnique) {
        results.skipped++;
        results.existed.push(`Student ${s.name}: ${uniquenessCheck.message}`);
        continue;
      }

      batchEmails.add(cleanEmail);
      if (cleanPhone) batchPhones.add(cleanPhone);

      // Resolve program
      let program = null;
      if (s.programId) {
        program = await prisma.program.findFirst({
          where: {
            id: s.programId,
            organizationId
          }
        });
      } else {
        const programOr: any[] = [];
        if (s.programCode) programOr.push({ code: s.programCode });
        if (s.programName) programOr.push({ name: s.programName });

        if (programOr.length > 0) {
          program = await prisma.program.findFirst({
            where: {
              OR: programOr,
              organizationId
            }
          });
        }
      }
      if (!program) {
        results.skipped++;
        results.errors.push(`Program not found for student ${s.name} (${s.email})`);
        continue;
      }

      // Resolve study center (optional)
      let resolvedCenterId: string | null = null;
      if (s.centerId || s.centerCode || s.centerName) {
        const centerOr: any[] = [];
        if (s.centerId) centerOr.push({ id: s.centerId });
        if (s.centerCode) centerOr.push({ code: s.centerCode });
        if (s.centerName) centerOr.push({ name: s.centerName });

        const center = await prisma.studyCenter.findFirst({
          where: {
            OR: centerOr.length > 0 ? centerOr : undefined,
            organizationId
          }
        });
        if (!center) {
          results.skipped++;
          results.errors.push(`Study Center not found for student ${s.name} (${s.email})`);
          continue;
        }
        resolvedCenterId = center.id;
      }

      // Ensure user account exists
      let studentUser = await prisma.user.findUnique({ where: { email: s.email } });
      let generatedUid = s.enrollmentNo || s.enrollmentno || s.enrollment_no || s['enrollment no'] || s.enrollment || '';
      const defaultPassword = `Student@${Math.floor(100000 + Math.random() * 900000)}`;
      if (!studentUser) {
        if (!generatedUid) {
          generatedUid = await generateUserId();
        }
        const hashedPassword = await hashPassword(defaultPassword);
        studentUser = await prisma.user.create({
          data: {
            userId: generatedUid,
            organizationId,
            email: s.email,
            password: hashedPassword,
            name: s.name,
            role: 'student',
            phone: s.phone || '',
            status: 'active',
            branchId: branchId || undefined,
          },
        });
      } else {
        if (!generatedUid) {
          generatedUid = studentUser.userId || await generateUserId();
        }
        const hashedPassword = await hashPassword(defaultPassword);
        await prisma.user.update({
          where: { email: s.email },
          data: {
            password: hashedPassword,
            name: s.name,
            phone: s.phone || '',
            status: 'active',
            branchId: branchId || undefined,
          }
        });
      }

      // Resolve admission session (optional)
      let resolvedSessionId: string | null = null;
      if (s.sessionId) {
        resolvedSessionId = s.sessionId;
      } else if (s.session) {
        const sessionRec = await prisma.admissionSession.findFirst({
          where: {
            name: {
              equals: s.session.toString().trim(),
              mode: 'insensitive'
            },
            organizationId
          }
        });
        if (sessionRec) {
          resolvedSessionId = sessionRec.id;
        }
      }

      // Create or update student record
      const studentData = {
        name: s.name,
        email: s.email,
        phone: s.phone || '',
        address: s.address || '',
        enrollmentNo: generatedUid,
        programId: program.id,
        universityId: program.universityId,
        centerId: resolvedCenterId || undefined,
        sessionId: resolvedSessionId || undefined,
        specialisation: s.specialisation || null,
        status: s.status || 'active',
        isPrevious: isPrevious || s.isPrevious || false,
        organizationId,
        branchId: branchId || undefined,
        dob: s.dob ? new Date(s.dob) : undefined,
        admissionDate: s.admissionDate ? new Date(s.admissionDate) : undefined,
        enrolledBy: SALES_ROLES.includes(req.user.role) ? req.user.id : (salesUserId && salesUserId !== 'none' ? salesUserId : null)
      };

      await prisma.student.create({
        data: {
          ...studentData,
          credentials: { email: s.email, password: defaultPassword }
        }
      });

      results.imported++;

      // Send credentials email only for new students
      try {
        await sendEmail(
          s.email,
          'Your Student Portal Credentials',
          `Hello ${s.name},\n\nYour account has been created.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\nEmail: ${s.email}\nPassword: ${defaultPassword}\n\nRegards,\nSchool Administration`,
          `<p>Hello <strong>${s.name}</strong>,</p><p>Your account has been created.</p><p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a><br/><strong>Email:</strong> ${s.email}<br/><strong>Password:</strong> ${defaultPassword}</p><p>Regards,<br/>School Administration</p>`
        );
        } catch (emailErr) {
          console.error(`Failed to send email to ${s.email}:`, emailErr);
          // Don't fail the whole import if just email fails
        }
    } catch (err: any) {
      results.skipped++;
      results.errors.push(`Failed to import student ${s.name || 'Unknown'}: ${err.message}`);
    }
  }

  res.status(200).json({ success: true, data: results });
});

export const notifyStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  let whereClause: any = { id: req.params.id };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    if (assignedIds.length > 0) {
      whereClause.OR = [{ enrolledBy: { in: assignedIds } }, { referredBy: { in: assignedIds } }];
    }
  }
  const student = await prisma.student.findFirst({ where: whereClause });
  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }
  const studentUser = await prisma.user.findUnique({ where: { email: student.email } });
  if (!studentUser) {
    res.status(404).json({ success: false, message: 'Student user account not found' });
    return;
  }
  const notification = await prisma.notification.create({
    data: {
      organizationId: req.user.organizationId,
      userId: studentUser.id,
      title: req.body.title || 'Student Notification',
      message: req.body.message,
      type: req.body.type || 'general',
      priority: req.body.priority || 'medium'
    }
  });
  res.status(201).json({ success: true, data: notification });
});

export const getInternalMarks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const marks = await prisma.internalMark.findMany({
    where: { organizationId: req.user.organizationId },
    include: { student: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, data: marks });
});

export const getInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mark = await prisma.internalMark.findUnique({
    where: { id: req.params.id },
    include: { student: { select: { name: true } } }
  });
  if (!mark) {
    res.status(404).json({ success: false, message: 'Internal mark not found' });
    return;
  }
  res.status(200).json({ success: true, data: mark });
});

export const createInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mark = await prisma.internalMark.create({
    data: {
      ...req.body,
      organizationId: req.user.organizationId,
      enteredBy: req.user.id
    }
  });
  res.status(201).json({ success: true, data: mark });
});

export const updateInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const markExists = await prisma.internalMark.findUnique({ where: { id: req.params.id } });
  if (!markExists) {
    res.status(404).json({ success: false, message: 'Internal mark not found' });
    return;
  }
  const mark = await prisma.internalMark.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.status(200).json({ success: true, data: mark });
});

export const deleteInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const markExists = await prisma.internalMark.findUnique({ where: { id: req.params.id } });
  if (!markExists) {
    res.status(404).json({ success: false, message: 'Internal mark not found' });
    return;
  }
  await prisma.internalMark.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, data: {} });
});

export const uploadStudentDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  let whereClause: any = { id: req.params.id };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    if (assignedIds.length > 0) {
      whereClause.OR = [{ enrolledBy: { in: assignedIds } }, { referredBy: { in: assignedIds } }];
    }
  }
  const student = await prisma.student.findFirst({
    where: whereClause,
  });

  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }
  // @ts-ignore
  const fileUrl = `/uploads/${req.file.key || req.file.filename}`;
  const docName = req.body.name || req.file.originalname;

  const currentDocs = Array.isArray(student.documents) ? (student.documents as any[]) : [];
  const updatedDocs = [
    ...currentDocs,
    {
      name: docName,
      url: fileUrl,
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user.name || req.user.email,
    },
  ];

  const updatedStudent = await prisma.student.update({
    where: { id: req.params.id },
    data: {
      documents: updatedDocs,
    },
  });

  res.status(200).json({ success: true, data: updatedStudent });
});

export const updateDocumentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, docIndex } = req.params;
  const { status, remarks } = req.body;
  
  let whereClause: any = { id };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    if (assignedIds.length > 0) {
      whereClause.OR = [{ enrolledBy: { in: assignedIds } }, { referredBy: { in: assignedIds } }];
    }
  }
  const student = await prisma.student.findFirst({
    where: whereClause,
  });

  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  const currentDocs = Array.isArray(student.documents) ? (student.documents as any[]) : [];
  const index = parseInt(docIndex, 10);
  
  if (isNaN(index) || index < 0 || index >= currentDocs.length) {
    res.status(400).json({ success: false, message: 'Invalid document index' });
    return;
  }

  currentDocs[index] = {
    ...currentDocs[index],
    status,
    remarks,
    reviewedBy: req.user.name || req.user.email,
    reviewedAt: new Date().toISOString()
  };

  const updatedStudent = await prisma.student.update({
    where: { id },
    data: { documents: currentDocs },
  });

  await prisma.enrollment.updateMany({
    where: { studentId: id },
    data: { documents: currentDocs }
  });

  res.status(200).json({ success: true, data: updatedStudent });
});

export const updatePhotoStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  
  let whereClause: any = { id };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    if (assignedIds.length > 0) {
      whereClause.OR = [{ enrolledBy: { in: assignedIds } }, { referredBy: { in: assignedIds } }];
    }
  }
  const student = await prisma.student.findFirst({
    where: whereClause,
  });

  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  const admissionProgress = student.admissionProgress ? (student.admissionProgress as any) : {};
  
  admissionProgress.photoStatus = status;
  admissionProgress.photoRemarks = remarks;
  admissionProgress.photoReviewedBy = req.user.name || req.user.email;
  admissionProgress.photoReviewedAt = new Date().toISOString();

  const updatedStudent = await prisma.student.update({
    where: { id },
    data: { admissionProgress },
  });

  await prisma.enrollment.updateMany({
    where: { studentId: id },
    data: { photoStatus: status }
  });

  res.status(200).json({ success: true, data: updatedStudent });
});

export const bulkEnrollmentUpdate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { updates } = req.body;
  if (!Array.isArray(updates)) {
    res.status(400).json({ success: false, message: 'Invalid payloads' });
    return;
  }
  
  let updatedCount = 0;
  for (const update of updates) {
    if (update.id && update.enrollmentNo) {
      let whereClause: any = { id: update.id, organizationId: req.user.organizationId };
      if (req.user.role === 'ops_sub_admin') {
        const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
        const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
        if (assignedIds.length > 0) {
      whereClause.OR = [{ enrolledBy: { in: assignedIds } }, { referredBy: { in: assignedIds } }];
    }
      }
      const student = await prisma.student.findFirst({
        where: whereClause
      });
      if (student) {
        // Update Student
        await prisma.student.update({
          where: { id: update.id },
          data: { enrollmentNo: update.enrollmentNo }
        });
        
        // Update Active Enrollment if exists
        const activeEnrollment = await prisma.enrollment.findFirst({
          where: { studentId: update.id },
          orderBy: { createdAt: 'desc' }
        });
        
        if (activeEnrollment) {
          await prisma.enrollment.update({
            where: { id: activeEnrollment.id },
            data: { enrollmentNumber: update.enrollmentNo }
          });
        }

        updatedCount++;
      }
    }
  }

  res.status(200).json({ success: true, count: updatedCount, message: 'Enrollment numbers updated' });
});

export const updateAdmissionProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, stepId } = req.params;
  const { status, enrollmentId } = req.body; // 'completed' or 'pending'
  const targetEnrollmentId = (enrollmentId || req.query.enrollmentId) as string | undefined;
  
  let whereClause: any = { id, organizationId: req.user.organizationId };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    if (assignedIds.length > 0) {
      whereClause.OR = [{ enrolledBy: { in: assignedIds } }, { referredBy: { in: assignedIds } }];
    }
  }

  const student = await prisma.student.findFirst({
    where: whereClause
  });
  
  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  // If a specific enrollment was targeted, find it
  let targetEnrollment: any = null;
  if (targetEnrollmentId) {
    targetEnrollment = await prisma.enrollment.findFirst({
      where: { id: targetEnrollmentId, studentId: id, organizationId: req.user.organizationId }
    });
  }
  
  let admissionProgress: Record<string, any> = {};
  const sourceProgress = targetEnrollment?.admissionProgress || student.admissionProgress;
  if (sourceProgress) {
    if (typeof sourceProgress === 'object') {
      admissionProgress = sourceProgress as Record<string, any>;
    } else if (typeof sourceProgress === 'string') {
      try {
        admissionProgress = JSON.parse(sourceProgress);
      } catch (e) {
        console.error('Failed to parse admissionProgress', e);
      }
    }
  }

  const currentStepData = admissionProgress[stepId] || {};
  const isCurrentlyCompleted = currentStepData.completed === true;
  
  // Checking authorization for reverting back to pending
  if (isCurrentlyCompleted && status === 'pending') {
    if (req.user.role !== 'org_admin' && req.user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Only Organization Admins can revert progress steps.' });
      return;
    }
  }

  // Handle proof upload if marking as completed
  let proofUrl = currentStepData.proofUrl;
  if (status === 'completed' && req.file) {
    // Generate URL based on uploaded file
    // @ts-ignore
    proofUrl = `/uploads/${req.file.key || req.file.filename}`;
  }

  // If we are marking as pending, clear proofUrl
  if (status === 'pending') {
    proofUrl = null;
  }

  const updatedProgress = {
    ...admissionProgress,
    [stepId]: {
      completed: status === 'completed',
      proofUrl,
      updatedBy: req.user.id,
      updatedAt: new Date().toISOString()
    }
  };

  let updatedEnrollment = null;
  if (targetEnrollment) {
    updatedEnrollment = await prisma.enrollment.update({
      where: { id: targetEnrollment.id },
      data: { admissionProgress: updatedProgress }
    });
  }

  const updatedStudent = await prisma.student.update({
    where: { id },
    data: { admissionProgress: updatedProgress }
  });

  res.status(200).json({ success: true, data: updatedStudent, enrollment: updatedEnrollment });
});

export const updateStudentAcademicProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { academicProgress, enrollmentId } = req.body;

  let whereClause: any = { id, organizationId: req.user.organizationId };
  if (req.user.role === 'ops_sub_admin') {
    const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
    const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
    if (assignedIds.length > 0) {
      whereClause.OR = [{ enrolledBy: { in: assignedIds } }, { referredBy: { in: assignedIds } }];
    }
  }

  const student = await prisma.student.findFirst({ where: whereClause });
  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  let updatedEnrollment = null;
  if (enrollmentId) {
    const enr = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, studentId: id, organizationId: req.user.organizationId }
    });
    if (enr) {
      updatedEnrollment = await prisma.enrollment.update({
        where: { id: enr.id },
        data: { academicProgress: Array.isArray(academicProgress) ? academicProgress : [] }
      });
    }
  } else {
    await prisma.student.update({
      where: { id },
      data: { academicProgress: Array.isArray(academicProgress) ? academicProgress : [] }
    });
  }

  const updatedStudent = await prisma.student.findUnique({ where: { id } });
  res.status(200).json({ success: true, data: updatedStudent, enrollment: updatedEnrollment });
});

// GET /students/:id/enrollments — full enrollment history for a student
export const getStudentEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: id, organizationId: req.user.organizationId },
    include: {
      program: { include: { university: { select: { name: true } } } },
      studyCenter: { select: { name: true, code: true } },
      session: { select: { name: true } },
      payment: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ success: true, data: enrollments });
});

/**
 * POST /students/bulk-update-program
 * Org admin: update university + program on the latest enrollment for a set of students
 */
export const bulkUpdateProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentIds, universityId, programId } = req.body as {
    studentIds: string[];
    universityId?: string;
    programId?: string;
  };

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    res.status(400).json({ success: false, message: 'studentIds must be a non-empty array' });
    return;
  }
  if (!universityId && !programId) {
    res.status(400).json({ success: false, message: 'Provide at least universityId or programId' });
    return;
  }

  let updatedStudents = 0;
  let updatedEnrollments = 0;

  for (const studentId of studentIds) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, organizationId: req.user.organizationId }
    });
    if (!student) continue;

    // Build student update payload
    const studentData: any = {};
    if (universityId) studentData.universityId = universityId;
    if (programId) studentData.programId = programId;

    await prisma.student.update({ where: { id: studentId }, data: studentData });
    updatedStudents++;

    // Also update the most recent enrollment for this student
    const latestEnrollment = await prisma.enrollment.findFirst({
      where: { studentId, organizationId: req.user.organizationId },
      orderBy: { createdAt: 'desc' }
    });

    if (latestEnrollment) {
      const enrollData: any = {};
      if (programId) enrollData.programId = programId;
      await prisma.enrollment.update({ where: { id: latestEnrollment.id }, data: enrollData });
      updatedEnrollments++;
    }
  }

  res.status(200).json({
    success: true,
    message: `Updated ${updatedStudents} student(s) and ${updatedEnrollments} enrollment(s)`
  });
});

/**
 * POST /students/bulk-record-payment
 * Org admin: manually record a payment against the latest enrollment for a set of students
 */
export const bulkRecordPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentIds, amount, note } = req.body as {
    studentIds: string[];
    amount: number;
    note?: string;
  };

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    res.status(400).json({ success: false, message: 'studentIds must be a non-empty array' });
    return;
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    res.status(400).json({ success: false, message: 'Valid amount is required' });
    return;
  }

  let recorded = 0;

  for (const studentId of studentIds) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, organizationId: req.user.organizationId }
    });
    if (!student) continue;

    // Find the latest enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, organizationId: req.user.organizationId },
      orderBy: { createdAt: 'desc' }
    });
    if (!enrollment) continue;

    // Create a payment record
    await prisma.enrollmentPayment.create({
      data: {
        enrollmentId: enrollment.id,
        amount: Number(amount),
        ...(enrollment.studyCenterId ? { studyCenterId: enrollment.studyCenterId } : {}),
      }
    });

    // Log to status history
    const historyEntry = {
      status: enrollment.status,
      changedAt: new Date().toISOString(),
      changedBy: req.user.id,
      remarks: note || `Manual fee entry of ₹${amount} by ${req.user.name || req.user.role}`
    };
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        statusHistory: { push: historyEntry }
      }
    });

    recorded++;
  }

  res.status(200).json({
    success: true,
    message: `Payment of ₹${amount} recorded for ${recorded} student(s)`
  });
});

export const checkStudentUniqueness = asyncHandler(async (req: AuthRequest, res: Response) => {
  const email = req.query.email as string | undefined;
  const phone = req.query.phone as string | undefined;
  const identifier = (req.query.identifier || req.query.id || req.query.admissionNo || req.query.enrollmentNo) as string | undefined;
  const excludeStudentId = req.query.excludeStudentId as string | undefined;
  const excludeEnrollmentId = req.query.excludeEnrollmentId as string | undefined;
  const isUpgrade = req.query.isUpgrade === 'true';
  const existingStudentId = (req.query.existingStudentId || req.query.studentId) as string | undefined;
  const programId = req.query.programId as string | undefined;
  const sessionId = req.query.sessionId as string | undefined;

  const result = await checkStudentOrEnrollmentExists({
    email,
    phone,
    identifier,
    organizationId: req.user.organizationId,
    excludeStudentId,
    excludeEnrollmentId,
    existingStudentId,
    isUpgrade,
    programId,
    sessionId
  });

  res.status(200).json({ success: true, ...result });
});
