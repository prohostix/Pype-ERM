import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';
import { sendEmail } from '../utils/emailService.js';

export const getStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  if (req.query.status) where.status = req.query.status as string;
  const students = await prisma.student.findMany({
    where,
    include: { enrollments: true },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, count: students.length, data: students });
});

export const getStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
    include: { enrollments: true }
  });
  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }
  res.status(200).json({ success: true, data: student });
});

export const createStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, name, phone, centerId, programId } = req.body;
  
  if (!programId || programId.trim() === '') {
    res.status(400).json({ success: false, message: 'Program is required' });
    return;
  }

  // Verify that the referenced center exists (if provided)
  if (centerId && centerId.trim() !== '') {
    const centerExists = await prisma.studyCenter.findFirst({
      where: { id: centerId, organizationId: req.user.organizationId }
    });
    if (!centerExists) {
      res.status(400).json({ success: false, message: 'Selected Study Center does not exist' });
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

  let studentUser = await prisma.user.findUnique({ where: { email } });
  const defaultPassword = `Student@${Math.floor(100000 + Math.random() * 900000)}`;
  if (!studentUser) {
    const generatedUid = await generateUserId();
    const hashedPassword = await hashPassword(defaultPassword);
    studentUser = await prisma.user.create({
      data: {
        userId: generatedUid,
        organizationId: req.user.organizationId,
        email,
        password: hashedPassword,
        name,
        role: 'staff', // Fallback role for student in UserRole enum
        phone,
        status: 'active',
      },
    });
  } else {
    // If the user already exists, update their password so it matches the generated credentials
    const hashedPassword = await hashPassword(defaultPassword);
    studentUser = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        name,
        phone,
        status: 'active'
      }
    });
  }

  const student = await prisma.student.create({
    data: {
      ...req.body,
      centerId: (centerId && centerId.trim() !== '') ? centerId : null,
      organizationId: req.user.organizationId,
      credentials: { email, password: defaultPassword }
    }
  });

  // Send credentials email
  await sendEmail(
    email,
    'Your Student Portal Credentials',
    `Hello ${name},\n\nYour account has been created.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\nEmail: ${email}\nPassword: ${defaultPassword}\n\nRegards,\nSchool Administration`,
    `<p>Hello <strong>${name}</strong>,</p><p>Your account has been created.</p><p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a><br/><strong>Email:</strong> ${email}<br/><strong>Password:</strong> ${defaultPassword}</p><p>Regards,<br/>School Administration</p>`
  );

  res.status(201).json({ success: true, data: student });
});

export const updateStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const studentExists = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!studentExists) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  // If credentials.password is updated, hash it and update corresponding User record
  if (req.body.credentials && req.body.credentials.password) {
    const hashedPassword = await hashPassword(req.body.credentials.password);
    await prisma.user.update({
      where: { email: studentExists.email },
      data: { password: hashedPassword }
    });
  }

  if ('centerId' in req.body) {
    req.body.centerId = (req.body.centerId && req.body.centerId.trim() !== '') ? req.body.centerId : null;
  }

  const student = await prisma.student.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.status(200).json({ success: true, data: student });
});

export const deleteStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const studentExists = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!studentExists) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }
  await prisma.student.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, data: {} });
});

export const approveStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const studentExists = await prisma.student.findUnique({ where: { id: req.params.id } });
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
  const { students, isPrevious } = req.body;
  if (!Array.isArray(students)) {
    res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of students.' });
    return;
  }

  const organizationId = req.user.organizationId;
  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[]
  };

  for (const s of students) {
    try {
      if (!s.email || !s.name) {
        results.skipped++;
        results.errors.push(`Skipped record missing email or name`);
        continue;
      }

      // Check if student email is already registered
      const existingStudent = await prisma.student.findUnique({ where: { email: s.email } });
      if (existingStudent) {
        results.skipped++;
        results.errors.push(`Student with email ${s.email} already exists`);
        continue;
      }

      // Resolve program
      const program = await prisma.program.findFirst({
        where: {
          OR: [
            { id: s.programId },
            { code: s.programCode },
            { name: s.programName }
          ],
          organizationId
        }
      });
      if (!program) {
        results.skipped++;
        results.errors.push(`Program not found for student ${s.name} (${s.email})`);
        continue;
      }

      // Resolve study center (optional)
      let resolvedCenterId: string | null = null;
      if (s.centerId || s.centerCode || s.centerName) {
        const center = await prisma.studyCenter.findFirst({
          where: {
            OR: [
              { id: s.centerId || undefined },
              { code: s.centerCode || undefined },
              { name: s.centerName || undefined }
            ],
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
      let generatedUid = s.enrollmentNo;
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
            role: 'staff',
            phone: s.phone || '',
            status: 'active',
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
            status: 'active'
          }
        });
      }

      // Create student record
      await prisma.student.create({
        data: {
          name: s.name,
          email: s.email,
          phone: s.phone || '',
          address: s.address || '',
          enrollmentNo: generatedUid,
          programId: program.id,
          centerId: resolvedCenterId,
          sessionId: s.sessionId || null,
          status: s.status || 'active',
          isPrevious: isPrevious || s.isPrevious || false,
          organizationId,
          credentials: { email: s.email, password: defaultPassword }
        }
      });

      // Send credentials email
      await sendEmail(
        s.email,
        'Your Student Portal Credentials',
        `Hello ${s.name},\n\nYour account has been created.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\nEmail: ${s.email}\nPassword: ${defaultPassword}\n\nRegards,\nSchool Administration`,
        `<p>Hello <strong>${s.name}</strong>,</p><p>Your account has been created.</p><p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a><br/><strong>Email:</strong> ${s.email}<br/><strong>Password:</strong> ${defaultPassword}</p><p>Regards,<br/>School Administration</p>`
      );

      results.imported++;
    } catch (err: any) {
      results.skipped++;
      results.errors.push(`Failed to import student ${s.name || 'Unknown'}: ${err.message}`);
    }
  }

  res.status(200).json({ success: true, data: results });
});

export const notifyStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await prisma.student.findUnique({ where: { id: req.params.id } });
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
