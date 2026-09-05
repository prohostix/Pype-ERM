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
  const { programId, centerId, type, chapterOrTopic } = req.query;

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

  res.status(200).json({
    success: true,
    data: materials,
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
