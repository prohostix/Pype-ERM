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
  const { enrollmentApprovalFlow, ...restData } = req.body;
  
  let updateData: any = { ...restData };

  if (enrollmentApprovalFlow !== undefined) {
    const existingOrg = await prisma.organization.findUnique({ where: { id: req.params.id } });
    const currentMetadata = (existingOrg?.metadata as any) || {};
    updateData.metadata = {
      ...currentMetadata,
      enrollmentApprovalFlow
    };
  }

  const organization = await prisma.organization.update({
    where: { id: req.params.id },
    data: updateData
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

export const getOrgInquiries = asyncHandler(async (req: AuthRequest, res: Response) => {
  const inquiries = await prisma.orgInquiry.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, count: inquiries.length, data: inquiries });
});

export const updateOrgInquiryStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const inquiry = await prisma.orgInquiry.update({
    where: { id: req.params.id },
    data: { status }
  });
  res.status(200).json({ success: true, data: inquiry });
});

// ─── Enrollment Link Configuration ───────────────────────────────────────────

const DEFAULT_ENROLLMENT_LINK_CONFIG = {
  universityStep: 'mandatory',
  programStep: 'optional',
  specializationStep: 'optional',
  sessionStep: 'optional',
  expiryDays: 7,
  allowMultipleUse: false,
  requireDocuments: true,
  requirePhoto: true,
};

export const getEnrollmentLinkConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.user.organizationId },
    select: { metadata: true },
  });
  const metadata = (org?.metadata as any) || {};
  const config = { ...DEFAULT_ENROLLMENT_LINK_CONFIG, ...(metadata.enrollmentLinkConfig || {}) };
  res.status(200).json({ success: true, data: config });
});

export const updateEnrollmentLinkConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { metadata: true },
  });
  const existingMetadata = (org?.metadata as any) || {};
  const newConfig = { ...DEFAULT_ENROLLMENT_LINK_CONFIG, ...(existingMetadata.enrollmentLinkConfig || {}), ...req.body };

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      metadata: {
        ...existingMetadata,
        enrollmentLinkConfig: newConfig,
      },
    },
  });

  res.status(200).json({ success: true, data: newConfig, message: 'Enrollment link configuration updated' });
});
