import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getOrganizations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const whereClause = req.user.role === 'superadmin' ? {} : { id: req.user.organizationId };
  const organizations = await prisma.organization.findMany({
    where: whereClause
  });
  res.status(200).json({ success: true, count: organizations.length, data: organizations });
});

export const getOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organization = await prisma.organization.findUnique({
    where: { id: req.params.id }
  });
  if (!organization) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }
  res.status(200).json({ success: true, data: organization });
});

export const createOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, phone, slug, ...rest } = req.body;
  
  const organization = await prisma.organization.create({
    data: {
      ...rest,
      name,
      email: email || rest.email || rest.contactEmail,
      phone: phone || rest.phone || rest.contactPhone,
    }
  });
  res.status(201).json({ success: true, data: organization });
});

export const updateOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organization = await prisma.organization.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.status(200).json({ success: true, data: organization });
});

export const deleteOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organization = await prisma.organization.findUnique({ where: { id: req.params.id } });
  if (!organization) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }
  await prisma.organization.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, data: {} });
});

export const assignLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { licenseId, durationMonths } = req.body;
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

  const updatedOrg = await prisma.organization.update({
    where: { id: req.params.id },
    data: {
      licenseId,
      licenseExpiry: expiryDate,
    }
  });
  res.status(200).json({ success: true, data: updatedOrg });
});
