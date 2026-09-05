import { Response } from 'express';
import { AcademicAuthRequest } from './academicAuth.middleware.js';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { hashPassword } from '../../utils/authUtils.js';

// @desc    Create a new Academic Center (Offline or Online)
// @route   POST /api/v1/academic-center/centers
// @access  Private (Org Admin, Superadmin)
export const createCenter = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const {
    name,
    code,
    type = 'OFFLINE',
    address,
    city,
    state,
    pincode,
    meetingPlatform,
    onlineAccessUrl,
    contactEmail,
    contactPhone,
    description,
    programIds,
  } = req.body;

  const organizationId = req.academicUser?.organizationId;
  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization ID is required' });
    return;
  }

  if (!name || !code) {
    res.status(400).json({ success: false, message: 'Center name and unique code are required' });
    return;
  }

  if (!programIds || !Array.isArray(programIds) || programIds.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Please select a program for this center. Exactly one program is required.',
    });
    return;
  }

  if (programIds.length > 1) {
    res.status(400).json({
      success: false,
      message: 'Only one program is allowed per academic center. Please select a single program.',
    });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();

  // Check unique code in organization
  const existing = await prisma.academicCenter.findUnique({
    where: {
      organizationId_code: {
        organizationId,
        code: normalizedCode,
      },
    },
  });

  if (existing) {
    res.status(400).json({ success: false, message: `Center code '${normalizedCode}' already exists in your organization` });
    return;
  }

  const center = await prisma.academicCenter.create({
    data: {
      organizationId,
      name: name.trim(),
      code: normalizedCode,
      type: type === 'ONLINE' ? 'ONLINE' : 'OFFLINE',
      status: 'ACTIVE',
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      pincode: pincode?.trim() || null,
      meetingPlatform: meetingPlatform?.trim() || null,
      onlineAccessUrl: onlineAccessUrl?.trim() || null,
      contactEmail: contactEmail?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      description: description?.trim() || null,
      assignedPrograms: {
        connect: [{ id: programIds[0] }],
      },
    },
    include: {
      counselors: {
        include: { counselor: true },
      },
      assignedPrograms: {
        select: {
          id: true,
          name: true,
          code: true,
          courseType: true,
          university: { select: { id: true, name: true, code: true } },
        },
      },
      _count: {
        select: {
          programs: true,
          teachers: true,
          students: true,
        },
      },
    },
  });

  const enrichedCenter = await attachStudentCountToCenter(organizationId, center);

  res.status(201).json({
    success: true,
    message: 'Academic Center created successfully',
    data: enrichedCenter,
  });
});

// Helper to compute actual enrolled student count (merging prisma.student and prisma.centerStudent)
async function attachStudentCountsToCenters(organizationId: string, centers: any[]) {
  return Promise.all(
    centers.map(async (center) => {
      const assignedProgramIds = (center.assignedPrograms || []).map((p: any) => p.id);
      let regularCount = 0;
      if (assignedProgramIds.length > 0) {
        regularCount = await prisma.student.count({
          where: {
            organizationId,
            OR: [
              { programId: { in: assignedProgramIds } },
              { centerId: center.id },
            ],
          },
        });
      } else {
        regularCount = await prisma.student.count({
          where: { organizationId, centerId: center.id },
        });
      }

      const centerStudentCount = center._count?.students || 0;
      const totalStudents = Math.max(centerStudentCount, regularCount);

      return {
        ...center,
        _count: {
          ...center._count,
          students: totalStudents,
        },
      };
    })
  );
}

async function attachStudentCountToCenter(organizationId: string, center: any) {
  const [enriched] = await attachStudentCountsToCenters(organizationId, [center]);
  return enriched;
}

// @desc    Get all Academic Centers
// @route   GET /api/v1/academic-center/centers
// @access  Private (Org Admin, Superadmin, Academic Counselor)
export const getCenters = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const organizationId = req.academicUser?.organizationId;
  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization ID is required' });
    return;
  }
  const { type, status, search } = req.query;

  const whereClause: any = { organizationId };

  if (type && (type === 'OFFLINE' || type === 'ONLINE')) {
    whereClause.type = type;
  }

  if (status) {
    whereClause.status = status as any;
  }

  if (search) {
    const s = String(search).trim();
    whereClause.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { code: { contains: s, mode: 'insensitive' } },
      { city: { contains: s, mode: 'insensitive' } },
    ];
  }

  // If role is counselor, only show centers assigned to this counselor
  if (req.academicUser?.role === 'academic_counselor' && req.academicUser.counselorId) {
    whereClause.counselors = {
      some: {
        counselorId: req.academicUser.counselorId,
        status: 'ACTIVE',
      },
    };
  }

  const centers = await prisma.academicCenter.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      counselors: {
        where: { status: 'ACTIVE' },
        include: {
          counselor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              specialization: true,
            },
          },
        },
      },
      assignedPrograms: {
        select: {
          id: true,
          name: true,
          code: true,
          courseType: true,
          university: { select: { id: true, name: true, code: true } },
        },
      },
      _count: {
        select: {
          programs: true,
          assignedPrograms: true,
          teachers: true,
          students: true,
          schedules: true,
        },
      },
    },
  });

  const centersWithCounts = await attachStudentCountsToCenters(organizationId, centers);

  // Calculate summary metrics
  const totalCenters = centersWithCounts.length;
  const onlineCount = centersWithCounts.filter((c) => c.type === 'ONLINE').length;
  const offlineCount = centersWithCounts.filter((c) => c.type === 'OFFLINE').length;
  const totalPrograms = centersWithCounts.reduce((acc, c) => acc + (c._count?.assignedPrograms ?? c._count?.programs ?? 0), 0);
  const totalStudents = centersWithCounts.reduce((acc, c) => acc + (c._count?.students || 0), 0);

  res.status(200).json({
    success: true,
    data: centersWithCounts,
    metrics: {
      totalCenters,
      onlineCount,
      offlineCount,
      totalPrograms,
      totalStudents,
    },
  });
});

// @desc    Get single Academic Center by ID
// @route   GET /api/v1/academic-center/centers/:id
// @access  Private
export const getCenterById = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const organizationId = req.academicUser?.organizationId;
  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization ID is required' });
    return;
  }

  const center = await prisma.academicCenter.findFirst({
    where: { id, organizationId },
    include: {
      counselors: {
        include: {
          counselor: true,
        },
      },
      assignedPrograms: {
        select: {
          id: true,
          name: true,
          code: true,
          courseType: true,
          university: { select: { id: true, name: true, code: true } },
        },
      },
      programs: {
        include: {
          teacher: true,
        },
      },
      teachers: true,
      _count: {
        select: {
          students: true,
          programs: true,
          assignedPrograms: true,
          teachers: true,
          schedules: true,
        },
      },
    },
  });

  if (!center) {
    res.status(404).json({ success: false, message: 'Academic Center not found' });
    return;
  }

  const enrichedCenter = await attachStudentCountToCenter(organizationId, center);
  res.status(200).json({ success: true, data: enrichedCenter });
});

// @desc    Update Academic Center
// @route   PUT /api/v1/academic-center/centers/:id
// @access  Private (Org Admin, Superadmin)
export const updateCenter = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const organizationId = req.academicUser?.organizationId;
  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization ID is required' });
    return;
  }
  const {
    name,
    type,
    status,
    address,
    city,
    state,
    pincode,
    meetingPlatform,
    onlineAccessUrl,
    contactEmail,
    contactPhone,
    description,
    programIds,
  } = req.body;

  const center = await prisma.academicCenter.findFirst({
    where: { id, organizationId },
  });

  if (!center) {
    res.status(404).json({ success: false, message: 'Academic Center not found' });
    return;
  }

  const updated = await prisma.academicCenter.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(type && { type: type === 'ONLINE' ? 'ONLINE' : 'OFFLINE' }),
      ...(status && { status }),
      address: address !== undefined ? address : center.address,
      city: city !== undefined ? city : center.city,
      state: state !== undefined ? state : center.state,
      pincode: pincode !== undefined ? pincode : center.pincode,
      meetingPlatform: meetingPlatform !== undefined ? meetingPlatform : center.meetingPlatform,
      onlineAccessUrl: onlineAccessUrl !== undefined ? onlineAccessUrl : center.onlineAccessUrl,
      contactEmail: contactEmail !== undefined ? contactEmail : center.contactEmail,
      contactPhone: contactPhone !== undefined ? contactPhone : center.contactPhone,
      description: description !== undefined ? description : center.description,
      ...(programIds && Array.isArray(programIds) && programIds.length > 0 && {
        assignedPrograms: {
          set: [{ id: programIds[0] }],
        },
      }),
    },
    include: {
      counselors: {
        include: { counselor: true },
      },
      assignedPrograms: {
        select: {
          id: true,
          name: true,
          code: true,
          courseType: true,
          university: { select: { id: true, name: true, code: true } },
        },
      },
      _count: {
        select: {
          programs: true,
          assignedPrograms: true,
          teachers: true,
          students: true,
          schedules: true,
        },
      },
    },
  });

  const enrichedUpdated = await attachStudentCountToCenter(organizationId, updated);

  res.status(200).json({
    success: true,
    message: 'Academic Center updated successfully',
    data: enrichedUpdated,
  });
});

// @desc    Delete Academic Center
// @route   DELETE /api/v1/academic-center/centers/:id
// @access  Private (Org Admin, Superadmin)
export const deleteCenter = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const organizationId = req.academicUser?.organizationId;

  const center = await prisma.academicCenter.findFirst({
    where: { id, organizationId },
  });

  if (!center) {
    res.status(404).json({ success: false, message: 'Academic Center not found' });
    return;
  }

  // Delete all center associations in transaction
  await prisma.$transaction(async (tx) => {
    // 1. Delete materials for this center
    await tx.centerMaterial.deleteMany({ where: { centerId: id } });

    // 2. Delete class schedules for this center
    await tx.centerClassSchedule.deleteMany({ where: { centerId: id } });

    // 3. Delete student enrollments and students for this center
    await tx.centerEnrollment.deleteMany({
      where: {
        student: { centerId: id },
      },
    });
    await tx.centerStudent.deleteMany({ where: { centerId: id } });

    // 4. Delete counselor assignments
    await tx.centerCounselorAssignment.deleteMany({ where: { centerId: id } });

    // 5. Delete teachers for this center
    await tx.centerTeacher.deleteMany({ where: { centerId: id } });

    // 6. Delete center programs
    await tx.centerProgram.deleteMany({ where: { centerId: id } });

    // 7. Delete the academic center
    await tx.academicCenter.delete({ where: { id } });
  });

  res.status(200).json({
    success: true,
    message: `Academic Center '${center.name}' deleted successfully`,
  });
});

// @desc    Register a new Academic Counselor
// @route   POST /api/v1/academic-center/counselors/register
// @access  Private (Org Admin, Superadmin)
export const registerCounselor = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { name, email, password, phone, specialization, centerId, isPrimary = true } = req.body;
  const organizationId = req.academicUser?.organizationId;

  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization ID is required' });
    return;
  }

  if (!name || !email || !password) {
    res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if counselor email already exists
  const existing = await prisma.academicCounselor.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    res.status(400).json({ success: false, message: 'An Academic Counselor with this email already exists' });
    return;
  }

  const hashedPassword = await hashPassword(password);

  // Create Counselor
  const counselor = await prisma.academicCounselor.create({
    data: {
      organizationId,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone?.trim() || null,
      specialization: specialization?.trim() || null,
      status: 'ACTIVE',
    },
  });

  // If centerId is provided, immediately assign to center
  if (centerId) {
    await prisma.centerCounselorAssignment.create({
      data: {
        centerId,
        counselorId: counselor.id,
        isPrimary: Boolean(isPrimary),
        assignedBy: req.academicUser?.id,
        status: 'ACTIVE',
      },
    });
  }

  res.status(201).json({
    success: true,
    message: 'Academic Counselor registered successfully',
    data: {
      id: counselor.id,
      name: counselor.name,
      email: counselor.email,
      phone: counselor.phone,
      specialization: counselor.specialization,
      status: counselor.status,
    },
  });
});

// @desc    Get all Academic Counselors in organization
// @route   GET /api/v1/academic-center/counselors
// @access  Private (Org Admin, Superadmin)
export const getAllCounselors = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const organizationId = req.academicUser?.organizationId;

  const counselors = await prisma.academicCounselor.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    include: {
      assignments: {
        where: { status: 'ACTIVE' },
        include: {
          center: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
            },
          },
        },
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

  res.status(200).json({
    success: true,
    data: counselors.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      specialization: c.specialization,
      status: c.status,
      assignedCenters: c.assignments.map((a) => a.center),
      counts: c._count,
      createdAt: c.createdAt,
    })),
  });
});

// @desc    Assign Academic Counselor to a Center
// @route   POST /api/v1/academic-center/centers/:centerId/counselors
// @access  Private (Org Admin, Superadmin)
export const assignCounselorToCenter = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { centerId } = req.params;
  const { counselorId, isPrimary = true, replacePrevious = false } = req.body;
  const organizationId = req.academicUser?.organizationId;

  if (!counselorId) {
    res.status(400).json({ success: false, message: 'Counselor ID is required' });
    return;
  }

  // Verify center belongs to org
  const center = await prisma.academicCenter.findFirst({
    where: { id: centerId, organizationId },
  });

  if (!center) {
    res.status(404).json({ success: false, message: 'Academic Center not found' });
    return;
  }

  // Verify counselor belongs to org
  const counselor = await prisma.academicCounselor.findFirst({
    where: { id: counselorId, organizationId },
  });

  if (!counselor) {
    res.status(404).json({ success: false, message: 'Academic Counselor not found' });
    return;
  }

  // If replacePrevious is true, remove any other counselor assignments for this center
  if (replacePrevious) {
    await prisma.centerCounselorAssignment.deleteMany({
      where: {
        centerId,
        counselorId: { not: counselorId },
      },
    });
  } else if (Boolean(isPrimary)) {
    // Unset primary for other counselors if setting this one as primary
    await prisma.centerCounselorAssignment.updateMany({
      where: {
        centerId,
        counselorId: { not: counselorId },
        isPrimary: true,
      },
      data: { isPrimary: false },
    });
  }

  // Upsert assignment
  const assignment = await prisma.centerCounselorAssignment.upsert({
    where: {
      centerId_counselorId: {
        centerId,
        counselorId,
      },
    },
    update: {
      status: 'ACTIVE',
      isPrimary: Boolean(isPrimary),
    },
    create: {
      centerId,
      counselorId,
      isPrimary: Boolean(isPrimary),
      assignedBy: req.academicUser?.id,
      status: 'ACTIVE',
    },
    include: {
      counselor: true,
      center: true,
    },
  });

  res.status(200).json({
    success: true,
    message: `Counselor ${counselor.name} successfully assigned to ${center.name}`,
    data: assignment,
  });
});

// @desc    Unassign Counselor from Center
// @route   DELETE /api/v1/academic-center/centers/:centerId/counselors/:counselorId
// @access  Private (Org Admin, Superadmin)
export const unassignCounselorFromCenter = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { centerId, counselorId } = req.params;

  await prisma.centerCounselorAssignment.deleteMany({
    where: {
      centerId,
      counselorId,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Counselor assignment removed from center',
  });
});

// @desc    Update Academic Counselor details
// @route   PUT /api/v1/academic-center/counselors/:id
// @access  Private (Org Admin, Superadmin)
export const updateCounselor = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const organizationId = req.academicUser?.organizationId;
  const { name, email, phone, specialization, status, password, centerIds } = req.body;

  const counselor = await prisma.academicCounselor.findFirst({
    where: { id, organizationId },
  });

  if (!counselor) {
    res.status(404).json({ success: false, message: 'Academic Counselor not found' });
    return;
  }

  const updateData: any = {};
  if (name) updateData.name = name.trim();
  if (phone !== undefined) updateData.phone = phone?.trim() || null;
  if (specialization !== undefined) updateData.specialization = specialization?.trim() || null;
  if (status) updateData.status = status;

  if (email && email.trim().toLowerCase() !== counselor.email.toLowerCase()) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.academicCounselor.findFirst({
      where: {
        email: normalizedEmail,
        id: { not: id },
      },
    });
    if (existing) {
      res.status(400).json({ success: false, message: 'Email is already in use by another counselor' });
      return;
    }
    updateData.email = normalizedEmail;
  }

  if (password && password.trim().length > 0) {
    updateData.password = await hashPassword(password);
  }

  const updatedCounselor = await prisma.academicCounselor.update({
    where: { id },
    data: updateData,
  });

  // If centerIds provided, sync assignments
  if (Array.isArray(centerIds)) {
    // Remove existing assignments not in centerIds
    await prisma.centerCounselorAssignment.deleteMany({
      where: {
        counselorId: id,
        centerId: { notIn: centerIds },
      },
    });

    // Add new assignments
    for (const cId of centerIds) {
      await prisma.centerCounselorAssignment.upsert({
        where: {
          centerId_counselorId: {
            centerId: cId,
            counselorId: id,
          },
        },
        update: { status: 'ACTIVE' },
        create: {
          centerId: cId,
          counselorId: id,
          assignedBy: req.academicUser?.id,
          status: 'ACTIVE',
        },
      });
    }
  }

  res.status(200).json({
    success: true,
    message: 'Academic Counselor details updated successfully',
    data: updatedCounselor,
  });
});
