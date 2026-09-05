import { Response } from 'express';
import { AcademicAuthRequest } from './academicAuth.middleware.js';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { hashPassword } from '../../utils/authUtils.js';

// @desc    Create a new teacher in a Center
// @route   POST /api/v1/academic-center/teachers
// @access  Private (Academic Counselor, Org Admin)
export const createTeacher = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { centerId, name, email, phone, specialization, bio, avatar, password } = req.body;
  const organizationId = req.academicUser?.organizationId;

  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization ID is required' });
    return;
  }

  if (!centerId || !name || !email) {
    res.status(400).json({ success: false, message: 'Center ID, teacher name, and email are required' });
    return;
  }

  const hashedPassword = password ? await hashPassword(password) : await hashPassword('Teacher@123');

  const teacher = await prisma.centerTeacher.create({
    data: {
      organizationId,
      centerId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone: phone?.trim() || null,
      specialization: specialization?.trim() || null,
      bio: bio?.trim() || null,
      avatar: avatar?.trim() || null,
      status: 'ACTIVE',
    },
    include: {
      center: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Teacher created successfully',
    data: teacher,
  });
});

// @desc    Get teachers in a Center
// @route   GET /api/v1/academic-center/teachers
// @access  Private (Academic Counselor, Org Admin, Student)
export const getTeachers = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { centerId, search } = req.query;
  const organizationId = req.academicUser?.organizationId;

  const whereClause: any = { organizationId };
  if (centerId) {
    whereClause.centerId = String(centerId);
  }

  if (search) {
    const s = String(search).trim();
    whereClause.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { specialization: { contains: s, mode: 'insensitive' } },
    ];
  }

  const teachers = await prisma.centerTeacher.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      center: {
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          assignedPrograms: {
            select: { id: true, name: true, code: true },
          },
        },
      },
      programs: {
        select: { id: true, name: true, code: true },
      },
      _count: {
        select: { programs: true, schedules: true },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: teachers,
  });
});

// @desc    Update teacher
// @route   PUT /api/v1/academic-center/teachers/:id
// @access  Private (Academic Counselor, Org Admin)
export const updateTeacher = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, specialization, bio, avatar, status, password } = req.body;

  const dataToUpdate: any = {
    ...(name && { name: name.trim() }),
    ...(email && { email: email.trim().toLowerCase() }),
    ...(phone !== undefined && { phone }),
    ...(specialization !== undefined && { specialization }),
    ...(bio !== undefined && { bio }),
    ...(avatar !== undefined && { avatar }),
    ...(status && { status }),
  };

  if (password) {
    dataToUpdate.password = await hashPassword(password);
  }

  const updated = await prisma.centerTeacher.update({
    where: { id },
    data: dataToUpdate,
  });

  res.status(200).json({
    success: true,
    message: 'Teacher updated successfully',
    data: updated,
  });
});

// @desc    Delete teacher
// @route   DELETE /api/v1/academic-center/teachers/:id
// @access  Private (Academic Counselor, Org Admin)
export const deleteTeacher = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.centerTeacher.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: 'Teacher deleted successfully',
  });
});
