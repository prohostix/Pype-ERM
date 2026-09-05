import { Response } from 'express';
import { AcademicAuthRequest } from './academicAuth.middleware.js';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { comparePassword } from '../../utils/authUtils.js';
import jwt, { SignOptions } from 'jsonwebtoken';

// @desc    Counselor login
// @route   POST /api/v1/academic-center/counselor/login
// @access  Public
export const counselorLogin = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Please provide email and password' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const counselor = await prisma.academicCounselor.findUnique({
    where: { email: normalizedEmail },
    include: {
      assignments: {
        where: { status: 'ACTIVE' },
        include: {
          center: true,
        },
      },
    },
  });

  if (!counselor || counselor.status !== 'ACTIVE') {
    res.status(401).json({ success: false, message: 'Invalid credentials or account inactive' });
    return;
  }

  const isMatch = await comparePassword(password, counselor.password);
  if (!isMatch) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'secret';
  const options: SignOptions = { expiresIn: '30d' };
  const token = jwt.sign(
    {
      id: counselor.id,
      counselorId: counselor.id,
      email: counselor.email,
      role: 'academic_counselor',
      organizationId: counselor.organizationId,
    },
    secret,
    options
  );

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    data: {
      id: counselor.id,
      name: counselor.name,
      email: counselor.email,
      phone: counselor.phone,
      specialization: counselor.specialization,
      role: 'academic_counselor',
      organizationId: counselor.organizationId,
      assignedCenters: counselor.assignments.map((a) => a.center),
    },
  });
});

// @desc    Get assigned centers for logged-in counselor
// @route   GET /api/v1/academic-center/counselor/my-centers
// @access  Private (Academic Counselor, Org Admin)
export const getMyCenters = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const counselorId = req.academicUser?.counselorId;
  const organizationId = req.academicUser?.organizationId;

  if (!counselorId && req.academicUser?.role !== 'org_admin' && req.academicUser?.role !== 'superadmin') {
    res.status(403).json({ success: false, message: 'Academic Counselor profile not found' });
    return;
  }

  let centers: any[];

  if (counselorId) {
    const assignments = await prisma.centerCounselorAssignment.findMany({
      where: { counselorId, status: 'ACTIVE' },
      include: {
        center: {
          include: {
            _count: {
              select: {
                programs: true,
                teachers: true,
                students: true,
                schedules: true,
              },
            },
          },
        },
      },
    });
    centers = assignments.map((a) => a.center);
  } else {
    centers = await prisma.academicCenter.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            programs: true,
            teachers: true,
            students: true,
            schedules: true,
          },
        },
      },
    });
  }

  res.status(200).json({
    success: true,
    data: centers,
  });
});

// @desc    Get counselor profile
// @route   GET /api/v1/academic-center/counselor/profile
// @access  Private (Academic Counselor)
export const getCounselorProfile = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const counselorId = req.academicUser?.counselorId;
  if (!counselorId) {
    res.status(404).json({ success: false, message: 'Counselor not found' });
    return;
  }

  const counselor = await prisma.academicCounselor.findUnique({
    where: { id: counselorId },
    include: {
      assignments: {
        include: { center: true },
      },
      _count: {
        select: {
          programs: true,
          materials: true,
          students: true,
        },
      },
    },
  });

  if (!counselor) {
    res.status(404).json({ success: false, message: 'Counselor profile not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      id: counselor.id,
      name: counselor.name,
      email: counselor.email,
      phone: counselor.phone,
      specialization: counselor.specialization,
      status: counselor.status,
      assignedCenters: counselor.assignments.map((a) => a.center),
      counts: counselor._count,
    },
  });
});
