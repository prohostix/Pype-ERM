import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getProgramMaterials = asyncHandler(async (req: AuthRequest, res: Response) => {
  const materials = await prisma.programMaterial.findMany({
    where: { programId: req.params.programId, organizationId: req.user.organizationId, isActive: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: materials.length, data: materials });
});

export const getProgramDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await prisma.program.findUnique({ where: { id: req.params.programId }, include: { university: true } });
  
  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  const materials = await prisma.programMaterial.findMany({
    where: { programId: req.params.programId, isActive: true },
    orderBy: { createdAt: 'desc' },
    include: { uploader: { select: { id: true, name: true, email: true } } }
  });

  const mappedMaterials = materials.map(m => ({
    ...m,
    category: (m as any).category || 'study_material',
    fileName: (m as any).fileName || m.title,
    fileSize: (m as any).fileSize || 0,
    mimeType: (m as any).mimeType || 'application/pdf',
    uploadedBy: m.uploader
  }));

  const byCategory = mappedMaterials.reduce((acc: any, material) => {
    if (!acc[material.category]) acc[material.category] = [];
    acc[material.category].push(material);
    return acc;
  }, {});

  res.json({ 
    success: true, 
    data: {
      program,
      materials: mappedMaterials,
      byCategory
    }
  });
});

export const uploadProgramMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  const material = await prisma.programMaterial.create({
    data: { ...req.body, programId: req.params.programId, organizationId: req.user.organizationId, uploadedBy: req.user.id }
  });
  res.status(201).json({ success: true, data: material });
});

export const updateProgramMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  const material = await prisma.programMaterial.update({ where: { id: req.params.materialId }, data: req.body });
  res.json({ success: true, data: material });
});

export const deleteProgramMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.programMaterial.update({ where: { id: req.params.materialId }, data: { isActive: false } });
  res.json({ success: true, data: {} });
});
