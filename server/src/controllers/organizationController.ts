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

export const getLoginBrandingBySlug = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;
  const organization = await prisma.organization.findUnique({
    where: { customLoginSlug: slug },
    select: { id: true, name: true, logo: true, customLoginSlug: true, loginBranding: true }
  });

  if (!organization) {
    res.status(404).json({ success: false, message: 'Organization login page not found' });
    return;
  }

  res.status(200).json({ success: true, data: organization });
});

export const initLoginBranding = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.role === 'superadmin' && req.body.organizationId ? req.body.organizationId : req.user.organizationId;
  
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  if (org.customLoginSlug) {
    res.status(400).json({ success: false, message: 'Custom login page already initialized' });
    return;
  }

  let uniqueSlug = '';
  
  while (true) {
    // Generate a random 8-character string (e.g. "a9x2b4pz")
    uniqueSlug = Math.random().toString(36).substring(2, 10);
    const existing = await prisma.organization.findUnique({ where: { customLoginSlug: uniqueSlug } });
    if (!existing) break;
  }

  const defaultBranding = {
    primaryColor: '#0052CC',
    welcomeText: `Welcome to ${org.name} Portal`,
    logoUrl: org.logo || null,
  };

  const updatedOrg = await prisma.organization.update({
    where: { id: orgId },
    data: { customLoginSlug: uniqueSlug, loginBranding: defaultBranding }
  });

  res.status(200).json({ success: true, data: updatedOrg, message: 'Login page initialized' });
});

export const updateLoginBranding = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.role === 'superadmin' && req.body.organizationId ? req.body.organizationId : req.user.organizationId;
  const { branding } = req.body;

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  if (!org.customLoginSlug) {
    res.status(400).json({ success: false, message: 'Custom login page must be initialized first' });
    return;
  }

  const currentBranding = (org.loginBranding as any) || {};
  const newBranding = { ...currentBranding, ...branding };

  const updatedOrg = await prisma.organization.update({
    where: { id: orgId },
    data: { loginBranding: newBranding }
  });

  res.status(200).json({ success: true, data: updatedOrg, message: 'Login branding updated' });
});
