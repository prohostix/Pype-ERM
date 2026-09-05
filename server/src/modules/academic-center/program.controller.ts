import { Response } from 'express';
import { AcademicAuthRequest } from './academicAuth.middleware.js';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// @desc    Create a program in a Center and assign a teacher
// @route   POST /api/v1/academic-center/programs
// @access  Private (Academic Counselor, Org Admin)
export const createProgram = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { centerId, name, code, description, mode = 'ONLINE', duration, teacherId, syllabus, thumbnail } = req.body;
  const organizationId = req.academicUser?.organizationId;
  const counselorId = req.academicUser?.counselorId;

  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization ID is required' });
    return;
  }

  if (!centerId || !name || !code) {
    res.status(400).json({ success: false, message: 'Center ID, program name, and code are required' });
    return;
  }

  // Ensure counselor is specified
  let effectiveCounselorId = counselorId;
  if (!effectiveCounselorId) {
    // If org_admin is creating on behalf of counselor, find primary counselor for the center
    const assignment = await prisma.centerCounselorAssignment.findFirst({
      where: { centerId, status: 'ACTIVE' },
    });
    if (assignment) {
      effectiveCounselorId = assignment.counselorId;
    } else {
      // Find any counselor in org
      const anyCounselor = await prisma.academicCounselor.findFirst({
        where: { organizationId },
      });
      if (!anyCounselor) {
        res.status(400).json({
          success: false,
          message: 'An Academic Counselor must be registered before creating programs',
        });
        return;
      }
      effectiveCounselorId = anyCounselor.id;
    }
  }

  const normalizedCode = code.trim().toUpperCase();

  // Check unique code in center
  const existing = await prisma.centerProgram.findUnique({
    where: {
      centerId_code: {
        centerId,
        code: normalizedCode,
      },
    },
  });

  if (existing) {
    res.status(400).json({
      success: false,
      message: `Program code '${normalizedCode}' already exists in this center`,
    });
    return;
  }

  const program = await prisma.centerProgram.create({
    data: {
      organizationId,
      centerId,
      counselorId: effectiveCounselorId,
      teacherId: teacherId || null,
      name: name.trim(),
      code: normalizedCode,
      description: description?.trim() || null,
      mode: mode || 'ONLINE',
      duration: duration?.trim() || null,
      syllabus: syllabus || [],
      thumbnail: thumbnail || null,
      status: 'ACTIVE',
    },
    include: {
      teacher: true,
      counselor: {
        select: { id: true, name: true, email: true },
      },
      center: {
        select: { id: true, name: true, code: true, type: true },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Program created and teacher assigned successfully',
    data: program,
  });
});

// @desc    Get programs
// @desc    Get all universities in organization for Academic Center
// @route   GET /api/v1/academic-center/universities
// @access  Private
export const getUniversities = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const organizationId = req.academicUser?.organizationId;

  const universities = await prisma.university.findMany({
    where: { organizationId, status: 'active' },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      logo: true,
      _count: {
        select: { programs: true },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: universities,
  });
});

// @desc    Get University Programs
// @route   GET /api/v1/academic-center/programs
// @access  Private
export const getPrograms = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { universityId, search, centerId } = req.query;
  const organizationId = req.academicUser?.organizationId;

  const whereClause: any = { organizationId, status: 'active' };
  if (universityId) {
    whereClause.universityId = String(universityId);
  }
  if (centerId) {
    const centerWithProgs = await prisma.academicCenter.findUnique({
      where: { id: String(centerId) },
      select: { _count: { select: { assignedPrograms: true } } },
    });
    if (centerWithProgs && centerWithProgs._count.assignedPrograms > 0) {
      whereClause.academicCenters = { some: { id: String(centerId) } };
    }
  }
  if (search) {
    const s = String(search).trim();
    whereClause.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { code: { contains: s, mode: 'insensitive' } },
      { university: { name: { contains: s, mode: 'insensitive' } } },
    ];
  }

  const programs = await prisma.program.findMany({
    where: whereClause,
    orderBy: [
      { university: { name: 'asc' } },
      { name: 'asc' },
    ],
    include: {
      university: {
        select: { id: true, name: true, code: true, logo: true },
      },
      _count: {
        select: {
          centerClassSchedules: centerId ? { where: { centerId: String(centerId) } } : true,
          centerMaterials: centerId ? { where: { centerId: String(centerId) } } : true,
          centerEnrollments: true,
          students: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: programs,
  });
});

// @desc    Get program by ID with materials & schedules
// @route   GET /api/v1/academic-center/programs/:id
// @access  Private
export const getProgramById = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const { centerId } = req.query;

  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      university: true,
      centerMaterials: {
        where: centerId ? { centerId: String(centerId) } : undefined,
        orderBy: { sequenceOrder: 'asc' },
      },
      centerClassSchedules: {
        where: centerId ? { centerId: String(centerId) } : undefined,
        orderBy: { startTime: 'asc' },
        include: { teacher: true },
      },
      _count: {
        select: { centerMaterials: true, centerClassSchedules: true, centerEnrollments: true, students: true },
      },
    },
  });

  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: program,
  });
});

// @desc    Update program / assign teacher (compatibility fallback)
// @route   PUT /api/v1/academic-center/programs/:id
// @access  Private (Academic Counselor, Org Admin)
export const updateProgram = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, duration } = req.body;

  const updated = await prisma.program.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { syllabus: description }),
      ...(duration !== undefined && { duration: Number(duration) || undefined }),
    },
    include: {
      university: true,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Program updated successfully',
    data: updated,
  });
});

// @desc    Delete program (compatibility fallback)
// @route   DELETE /api/v1/academic-center/programs/:id
// @access  Private (Academic Counselor, Org Admin)
export const deleteProgram = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.program.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: 'Program deleted successfully',
  });
});
