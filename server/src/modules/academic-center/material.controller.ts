import { Response } from 'express';
import { AcademicAuthRequest } from './academicAuth.middleware.js';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// @desc    Add learning material (Video, Document, E-Book, Syllabus)
// @route   POST /api/v1/academic-center/materials
// @access  Private (Academic Counselor, Org Admin)
export const createMaterial = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const {
    centerId,
    programId,
    title,
    description,
    type = 'VIDEO',
    mediaUrl,
    fileKey,
    fileSize,
    mimeType,
    duration,
    chapterOrTopic,
    sequenceOrder = 0,
  } = req.body;

  const organizationId = req.academicUser?.organizationId;
  const counselorId = req.academicUser?.counselorId;

  if (!centerId || !programId || !title || !mediaUrl) {
    res.status(400).json({ success: false, message: 'Center ID, Program ID, title, and media URL are required' });
    return;
  }

  // Verify university program exists
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { university: true },
  });

  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  let effectiveCounselorId = counselorId;
  if (!effectiveCounselorId) {
    const assign = await prisma.centerCounselorAssignment.findFirst({
      where: { centerId, status: 'ACTIVE' },
    });
    if (assign) {
      effectiveCounselorId = assign.counselorId;
    } else {
      const anyCounselor = await prisma.academicCounselor.findFirst({
        where: { organizationId },
      });
      if (!anyCounselor) {
        res.status(400).json({ success: false, message: 'An Academic Counselor must be registered' });
        return;
      }
      effectiveCounselorId = anyCounselor.id;
    }
  }

  const material = await prisma.centerMaterial.create({
    data: {
      organizationId: organizationId || program.organizationId,
      centerId,
      programId,
      uploadedById: effectiveCounselorId,
      title: title.trim(),
      description: description?.trim() || null,
      type: type as any,
      mediaUrl: mediaUrl.trim(),
      fileKey: fileKey || null,
      fileSize: fileSize ? Number(fileSize) : null,
      mimeType: mimeType || null,
      duration: duration ? Number(duration) : null,
      chapterOrTopic: chapterOrTopic?.trim() || 'General',
      sequenceOrder: Number(sequenceOrder) || 0,
      isPublished: true,
    },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true, logo: true } },
        },
      },
      uploadedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: `${type === 'VIDEO' ? 'Video' : 'Learning Document'} added successfully`,
    data: material,
  });
});

// @desc    Get materials for a program
// @route   GET /api/v1/academic-center/materials
// @access  Private
export const getMaterials = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { programId, centerId, type, chapterOrTopic, excludeAssessments } = req.query;

  const whereClause: any = { isPublished: true };
  if (programId) whereClause.programId = String(programId);
  if (centerId) whereClause.centerId = String(centerId);
  if (type) whereClause.type = type as any;
  if (chapterOrTopic) whereClause.chapterOrTopic = String(chapterOrTopic);

  const materials = await prisma.centerMaterial.findMany({
    where: whereClause,
    orderBy: [
      { chapterOrTopic: 'asc' },
      { sequenceOrder: 'asc' },
      { createdAt: 'desc' },
    ],
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true, logo: true } },
        },
      },
      uploadedBy: {
        select: { id: true, name: true },
      },
    },
  });

  const filtered = excludeAssessments === 'true'
    ? materials.filter((m) => {
        if (!m.description) return true;
        try {
          const p = JSON.parse(m.description);
          return !p.isAssessment;
        } catch {
          return true;
        }
      })
    : materials;

  res.status(200).json({
    success: true,
    data: filtered,
  });
});

// @desc    Update material
// @route   PUT /api/v1/academic-center/materials/:id
// @access  Private (Academic Counselor, Org Admin)
export const updateMaterial = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, mediaUrl, duration, chapterOrTopic, sequenceOrder, isPublished } = req.body;

  const updated = await prisma.centerMaterial.update({
    where: { id },
    data: {
      ...(title && { title: title.trim() }),
      ...(description !== undefined && { description }),
      ...(mediaUrl && { mediaUrl: mediaUrl.trim() }),
      ...(duration !== undefined && { duration: Number(duration) }),
      ...(chapterOrTopic !== undefined && { chapterOrTopic }),
      ...(sequenceOrder !== undefined && { sequenceOrder: Number(sequenceOrder) }),
      ...(isPublished !== undefined && { isPublished }),
    },
  });

  res.status(200).json({
    success: true,
    message: 'Material updated successfully',
    data: updated,
  });
});

// @desc    Delete material
// @route   DELETE /api/v1/academic-center/materials/:id
// @access  Private (Academic Counselor, Org Admin)
export const deleteMaterial = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.centerMaterial.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: 'Material deleted successfully',
  });
});

// Helper to parse assessment payload from material description
function parseAssessmentRecord(mat: any) {
  let meta: any = {};
  if (mat.description) {
    try {
      meta = JSON.parse(mat.description);
    } catch {
      meta = {};
    }
  }

  return {
    id: mat.id,
    centerId: mat.centerId,
    programId: mat.programId,
    title: mat.title,
    module: mat.chapterOrTopic || 'General',
    assessmentType: meta.assessmentType || 'ASSIGNMENT',
    maxMarks: meta.maxMarks !== undefined ? Number(meta.maxMarks) : 100,
    dueDate: meta.dueDate || null,
    instructions: meta.instructions || mat.description || '',
    questionPaperUrl: mat.mediaUrl,
    isPublished: mat.isPublished,
    createdAt: mat.createdAt,
    updatedAt: mat.updatedAt,
    program: mat.program,
    uploadedBy: mat.uploadedBy,
  };
}

// @desc    Get all Assessments for a Center / Program
// @route   GET /api/v1/academic-center/assessments
// @access  Private
export const getAssessments = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { centerId, programId, search } = req.query;
  const organizationId = req.academicUser?.organizationId;

  const whereClause: any = {
    isPublished: true,
    ...(organizationId ? { organizationId } : {}),
  };

  if (centerId) whereClause.centerId = String(centerId);
  else if (req.academicUser?.role === 'center_student' && req.academicUser.centerId) {
    whereClause.centerId = req.academicUser.centerId;
  }
  if (programId) whereClause.programId = String(programId);

  const materials = await prisma.centerMaterial.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true, logo: true } },
        },
      },
      uploadedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Filter materials that are marked as assessments
  const assessments = materials
    .filter((mat) => {
      if (!mat.description) return false;
      try {
        const parsed = JSON.parse(mat.description);
        return parsed && parsed.isAssessment === true;
      } catch {
        return false;
      }
    })
    .map(parseAssessmentRecord);

  res.status(200).json({
    success: true,
    data: assessments,
  });
});

// @desc    Create Assessment (Assignment, Quiz, Test, Project)
// @route   POST /api/v1/academic-center/assessments
// @access  Private (Academic Counselor, Org Admin)
export const createAssessment = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const {
    centerId,
    programId,
    title,
    assessmentType = 'ASSIGNMENT',
    module = 'General',
    maxMarks = 100,
    dueDate,
    instructions = '',
    questionPaperUrl,
    mediaUrl,
  } = req.body;

  const organizationId = req.academicUser?.organizationId;
  const counselorId = req.academicUser?.counselorId;

  const finalUrl = (questionPaperUrl || mediaUrl || '').trim();

  if (!centerId || !programId || !title || !finalUrl) {
    res.status(400).json({
      success: false,
      message: 'Center ID, Program ID, Assessment Title, and Question Paper / Resource URL are required',
    });
    return;
  }

  let effectiveCounselorId = counselorId;
  if (!effectiveCounselorId) {
    const assign = await prisma.centerCounselorAssignment.findFirst({
      where: { centerId, status: 'ACTIVE' },
    });
    effectiveCounselorId = assign?.counselorId;
    if (!effectiveCounselorId) {
      const anyCounselor = await prisma.academicCounselor.findFirst({
        where: { organizationId },
      });
      effectiveCounselorId = anyCounselor?.id;
    }
  }

  if (!effectiveCounselorId) {
    res.status(400).json({ success: false, message: 'An Academic Counselor must be assigned to create assessments' });
    return;
  }

  const metaPayload = {
    isAssessment: true,
    assessmentType,
    maxMarks: Number(maxMarks) || 100,
    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    instructions: instructions.trim(),
  };

  const material = await prisma.centerMaterial.create({
    data: {
      organizationId: organizationId || '',
      centerId,
      programId,
      uploadedById: effectiveCounselorId,
      title: title.trim(),
      description: JSON.stringify(metaPayload),
      type: 'DOCUMENT',
      mediaUrl: finalUrl,
      chapterOrTopic: module.trim(),
      sequenceOrder: 0,
      isPublished: true,
    },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true, logo: true } },
        },
      },
      uploadedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: `${assessmentType} created successfully`,
    data: parseAssessmentRecord(material),
  });
});

// @desc    Update Assessment
// @route   PUT /api/v1/academic-center/assessments/:id
// @access  Private (Academic Counselor, Org Admin)
export const updateAssessment = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    title,
    assessmentType,
    module,
    maxMarks,
    dueDate,
    instructions,
    questionPaperUrl,
    mediaUrl,
  } = req.body;

  const existing = await prisma.centerMaterial.findUnique({
    where: { id },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Assessment not found' });
    return;
  }

  let currentMeta: any = {};
  try {
    currentMeta = JSON.parse(existing.description || '{}');
  } catch {
    currentMeta = {};
  }

  const updatedMeta = {
    ...currentMeta,
    isAssessment: true,
    ...(assessmentType && { assessmentType }),
    ...(maxMarks !== undefined && { maxMarks: Number(maxMarks) }),
    ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate).toISOString() : null }),
    ...(instructions !== undefined && { instructions }),
  };

  const finalUrl = questionPaperUrl || mediaUrl;

  const updated = await prisma.centerMaterial.update({
    where: { id },
    data: {
      ...(title && { title: title.trim() }),
      description: JSON.stringify(updatedMeta),
      ...(module !== undefined && { chapterOrTopic: module.trim() }),
      ...(finalUrl && { mediaUrl: finalUrl.trim() }),
    },
    include: {
      program: true,
      uploadedBy: true,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Assessment updated successfully',
    data: parseAssessmentRecord(updated),
  });
});

// @desc    Delete Assessment
// @route   DELETE /api/v1/academic-center/assessments/:id
// @access  Private (Academic Counselor, Org Admin)
export const deleteAssessment = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.centerMaterial.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: 'Assessment deleted successfully',
  });
});

