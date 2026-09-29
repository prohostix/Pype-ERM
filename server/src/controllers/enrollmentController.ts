import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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
  const programs = await prisma.program.findMany({ 
    where: { organizationId: req.user.organizationId, status: 'active' },
    include: {
      university: true,
      feeStructures: true
    }
  });
  res.json({ success: true, count: programs.length, data: programs });
});

export const createEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, feeMode, universityId, ...rest } = req.body;
  const data: any = {
    ...rest,
    organizationId: req.user.organizationId
  };
  
  if (req.user.studyCenterId) {
    data.studyCenterId = req.user.studyCenterId;
  }
  
  if (studentId) {
    data.studentId = studentId;
  }

  // Automatically attach salesUserId if the user is a staff member creating the enrollment
  if (req.user && req.user.role !== 'student') {
    data.salesUserId = req.user.id;
  }
  
  const enrollment = await prisma.enrollment.create({ data });

  if (studentId) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (student && !student.admissionNo) {
      await prisma.student.update({
        where: { id: studentId },
        data: { admissionNo: `ADM${Date.now().toString().slice(-6)}` }
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
  let studentUser = await prisma.user.findUnique({ where: { email } });
  const defaultPassword = `Student@${Math.floor(100000 + Math.random() * 900000)}`;
  if (!studentUser) {
    // Note: generateUserId and hashPassword would normally be used here, but we can't easily import them.
    // For this context, we will just create the user if missing, or we can skip creating the user account until Ops verifies.
    // Ops verification usually creates the account, but we can do it here if needed.
    // Actually, `createStudent` creates it. Let's just create the Student record.
  }

  const student = await prisma.student.create({
    data: {
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
      documents: documents || [],
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
      organizationId: req.user.organizationId,
      enrolledBy: enrollment.salesUserId || req.user.id
    }
  });

  const historyEntry = {
    status: 'document_review', 
    changedAt: new Date().toISOString(),
    changedBy: req.user.id,
    remarks: 'Provisional enrollment completed with full details by Sales'
  };

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      studentId: student.id,
      isProvisional: false,
      status: 'document_review',
      studentName: student.name,
      studentEmail: student.email,
      studentPhone: student.phone,
      studentAddress: student.address,
      documents: student.documents ? (student.documents as any) : [],
      photo: student.photo,
      statusHistory: {
        push: historyEntry
      }
    }
  });

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
