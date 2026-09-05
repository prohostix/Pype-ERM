import { Response } from 'express';
import { AcademicAuthRequest } from './academicAuth.middleware.js';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { hashPassword } from '../../utils/authUtils.js';

// @desc    Register a student to a center and enroll into programs
// @route   POST /api/v1/academic-center/students
// @access  Private (Academic Counselor, Org Admin)
export const registerStudent = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const {
    centerId,
    name,
    email,
    password,
    phone,
    dateOfBirth,
    gender,
    guardianName,
    guardianPhone,
    address,
    programIds = [],
    studentCode,
  } = req.body;

  const organizationId = req.academicUser?.organizationId;
  const counselorId = req.academicUser?.counselorId;

  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization ID is required' });
    return;
  }

  if (!centerId || !name || !email || !password) {
    res.status(400).json({ success: false, message: 'Center ID, name, email, and password are required' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check email uniqueness in organization
  const existing = await prisma.centerStudent.findFirst({
    where: {
      organizationId,
      email: normalizedEmail,
    },
  });

  if (existing) {
    res.status(400).json({ success: false, message: 'A student with this email is already registered in this organization' });
    return;
  }

  // Generate unique studentCode if not provided
  let finalCode = studentCode?.trim().toUpperCase();
  if (!finalCode) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    finalCode = `STU-${new Date().getFullYear()}-${randomSuffix}`;
  }

  // Ensure student code uniqueness
  const codeExists = await prisma.centerStudent.findFirst({
    where: { organizationId, studentCode: finalCode },
  });
  if (codeExists) {
    finalCode = `STU-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  }

  const hashedPassword = await hashPassword(password);

  const student = await prisma.centerStudent.create({
    data: {
      organizationId,
      centerId,
      studentCode: finalCode,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone?.trim() || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender || null,
      guardianName: guardianName?.trim() || null,
      guardianPhone: guardianPhone?.trim() || null,
      address: address?.trim() || null,
      admittedById: counselorId || null,
      status: 'ACTIVE',
    },
    include: {
      center: {
        select: { id: true, name: true, code: true, type: true },
      },
    },
  });

  // Enroll in programs if specified
  if (Array.isArray(programIds) && programIds.length > 0) {
    for (const pId of programIds) {
      await prisma.centerEnrollment.create({
        data: {
          studentId: student.id,
          programId: pId,
          enrolledBy: counselorId || null,
          status: 'ACTIVE',
          progressPercent: 0,
        },
      }).catch((e) => console.warn('Enrollment insert skipped/duplicate:', e.message));
    }
  }

  // Fetch full student with enrollments
  const fullStudent = await prisma.centerStudent.findUnique({
    where: { id: student.id },
    include: {
      center: true,
      enrollments: {
        include: {
          program: {
            include: { university: true },
          },
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Student registered and enrolled successfully',
    data: fullStudent,
  });
});

// @desc    Get students
// @route   GET /api/v1/academic-center/students
// @access  Private (Academic Counselor, Org Admin)
export const getStudents = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { centerId, programId, search } = req.query;
  const organizationId = req.academicUser?.organizationId;

  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization ID is required' });
    return;
  }

  let programIds: string[] = [];
  if (programId) {
    programIds = [String(programId)];
  } else if (centerId) {
    const center = await prisma.academicCenter.findUnique({
      where: { id: String(centerId) },
      select: {
        id: true,
        assignedPrograms: { select: { id: true } },
      },
    });
    programIds = center?.assignedPrograms?.map((p) => p.id) || [];
  }

  const s = search ? String(search).trim() : '';

  // 1. Fetch existing students from the primary Student table (enrolled against center's programs or center)
  const regularStudentWhere: any = {
    organizationId,
    ...(programIds.length > 0
      ? {
          OR: [
            { programId: { in: programIds } },
            ...(centerId ? [{ centerId: String(centerId) }] : []),
          ],
        }
      : centerId
      ? { centerId: String(centerId) }
      : {}),
  };

  if (s) {
    regularStudentWhere.AND = [
      {
        OR: [
          { name: { contains: s, mode: 'insensitive' } },
          { email: { contains: s, mode: 'insensitive' } },
          { enrollmentNo: { contains: s, mode: 'insensitive' } },
          { phone: { contains: s, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const regularStudents = await prisma.student.findMany({
    where: regularStudentWhere,
    orderBy: { createdAt: 'desc' },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          courseType: true,
          university: { select: { id: true, name: true, code: true, logo: true } },
        },
      },
    },
  });

  // 2. Fetch from CenterStudent table (if any exist)
  const centerStudentWhere: any = { organizationId };
  if (centerId) centerStudentWhere.centerId = String(centerId);
  if (programId) {
    centerStudentWhere.enrollments = {
      some: { programId: String(programId) },
    };
  }
  if (s) {
    centerStudentWhere.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { studentCode: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s, mode: 'insensitive' } },
    ];
  }

  const centerStudents = await prisma.centerStudent.findMany({
    where: centerStudentWhere,
    orderBy: { createdAt: 'desc' },
    include: {
      center: {
        select: { id: true, name: true, code: true, type: true },
      },
      admittedBy: {
        select: { id: true, name: true, email: true },
      },
      enrollments: {
        include: {
          program: {
            select: {
              id: true,
              name: true,
              code: true,
              courseType: true,
              university: { select: { id: true, name: true, code: true, logo: true } },
            },
          },
        },
      },
    },
  });

  // 3. Merge both collections (deduplicate by email)
  const studentMap = new Map<string, any>();

  // Center students
  centerStudents.forEach((cs) => {
    const key = (cs.email || '').toLowerCase();
    studentMap.set(key, cs);
  });

  // Regular students from student table
  regularStudents.forEach((rs) => {
    const key = (rs.email || '').toLowerCase();
    if (!key || studentMap.has(key)) return;

    studentMap.set(key, {
      id: rs.id,
      studentCode: rs.enrollmentNo || rs.admissionNo || rs.id.slice(0, 8).toUpperCase(),
      name: rs.name,
      email: rs.email,
      phone: rs.phone,
      gender: rs.gender,
      address: rs.address,
      status: rs.status?.toUpperCase() || 'ACTIVE',
      createdAt: rs.createdAt,
      source: 'ERP Student',
      enrollments: rs.program
        ? [
            {
              id: rs.id,
              program: rs.program,
              status: 'ACTIVE',
            },
          ]
        : [],
    });
  });

  res.status(200).json({
    success: true,
    data: Array.from(studentMap.values()),
  });
});

// @desc    Enroll student into additional program
// @route   POST /api/v1/academic-center/students/:id/enroll
// @access  Private (Academic Counselor, Org Admin)
export const enrollStudentInProgram = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const { programId } = req.body;
  const counselorId = req.academicUser?.counselorId;

  if (!programId) {
    res.status(400).json({ success: false, message: 'Program ID is required' });
    return;
  }

  const enrollment = await prisma.centerEnrollment.upsert({
    where: {
      studentId_programId: {
        studentId: id,
        programId,
      },
    },
    update: {
      status: 'ACTIVE',
    },
    create: {
      studentId: id,
      programId,
      enrolledBy: counselorId || null,
      status: 'ACTIVE',
    },
    include: {
      program: true,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Student enrolled in program successfully',
    data: enrollment,
  });
});

// @desc    Update student
// @route   PUT /api/v1/academic-center/students/:id
// @access  Private (Academic Counselor, Org Admin)
export const updateStudent = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, phone, guardianName, guardianPhone, address, status, password } = req.body;

  let updateData: any = {
    ...(name && { name: name.trim() }),
    ...(phone !== undefined && { phone }),
    ...(guardianName !== undefined && { guardianName }),
    ...(guardianPhone !== undefined && { guardianPhone }),
    ...(address !== undefined && { address }),
    ...(status && { status }),
  };

  if (password && password.trim().length > 0) {
    updateData.password = await hashPassword(password);
  }

  const updated = await prisma.centerStudent.update({
    where: { id },
    data: updateData,
    include: {
      center: true,
      enrollments: {
        include: { program: true },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: 'Student updated successfully',
    data: updated,
  });
});
