import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Helper to determine the exact billing start & end dates (1st to last day of the month).
 */
export async function getOrgBillingDateRange(orgId: string, billingMonth: string) {
  const [yearStr, monthStr] = billingMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Exact calendar month: 1st of the month (00:00:00.000) to the last day of the month (23:59:59.999)
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const cycleStartFormatted = startDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const cycleEndFormatted = endDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const billingCycleLabel = `${cycleStartFormatted} — ${cycleEndFormatted}`;

  return { startDate, endDate, billingCycleLabel, salaryCycle: null };
}

/** Money is kept to 2 decimals so per-student fees like 0.1 x 3 do not drift. */
const roundMoney = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Helper to fetch and deduplicate students/enrollments for an organization strictly within its salary billing cycle.
 */
export async function getOrganizationMonthEnrollments(orgId: string, billingMonth: string) {
  const { startDate, endDate } = await getOrgBillingDateRange(orgId, billingMonth);

  // Billing is per enrollment record, whatever its status (document review, pending, rejected, ...).
  // Each enrollment is dated by enrolledAt, else the day it was created.
  const inRange = { gte: startDate, lte: endDate };
  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { enrolledAt: inRange },
        { AND: [{ enrolledAt: null }, { createdAt: inRange }] },
      ],
    },
    include: {
      program: { select: { id: true, name: true, code: true } },
      studyCenter: { select: { id: true, name: true, code: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Students with no enrollment record at all (legacy imports / manually added). A student who has an
  // enrollment record is counted through that record only, so applicants are not counted twice.
  const candidateStudents = await prisma.student.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { enrolledAt: inRange },
        { AND: [{ enrolledAt: null }, { admissionDate: inRange }] },
        { AND: [{ enrolledAt: null }, { admissionDate: null }, { createdAt: inRange }] },
      ],
    },
    include: {
      program: { select: { id: true, name: true, code: true } },
      center: { select: { id: true, name: true, code: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  let students = candidateStudents;
  if (candidateStudents.length) {
    const linked = await prisma.enrollment.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { studentId: { in: candidateStudents.map(c => c.id) } },
          { studentEmail: { in: candidateStudents.flatMap(c => c.email ? [c.email, c.email.toLowerCase().trim()] : []) } },
        ],
      },
      select: { studentId: true, studentEmail: true },
    });
    const linkedIds = new Set(linked.map(l => l.studentId).filter(Boolean) as string[]);
    const linkedEmails = new Set(linked.map(l => (l.studentEmail || '').toLowerCase().trim()));
    students = candidateStudents.filter(c => !linkedIds.has(c.id) && !linkedEmails.has((c.email || '').toLowerCase().trim()));
  }

  const list: any[] = [];
  const seen = new Set<string>();

  for (const e of enrollments) {
    const keys = [e.studentEmail, e.enrollmentNumber, e.studentId]
      .filter(Boolean).map(k => String(k).toLowerCase().trim());
    if (!keys.length) keys.push(e.id);
    // The same student enrolled twice in one cycle is billed once.
    if (!keys.some(k => seen.has(k))) {
      keys.forEach(k => seen.add(k));
      const isPartner = Boolean(e.studyCenterId || e.studyCenter);
      const isStudyAbroad = !isPartner && (e.source === 'study_abroad' || Boolean(e.studyAbroadPartnerId));
      list.push({
        id: e.id,
        studentName: e.studentName || 'Student',
        studentEmail: e.studentEmail || 'N/A',
        studentPhone: e.studentPhone || 'N/A',
        enrollmentNumber: e.enrollmentNumber || 'Pending',
        programName: e.program?.name || 'Academic Program',
        studyCenterId: e.studyCenterId || null,
        studyCenterName: e.studyCenter?.name || null,
        isPartnerEnrollment: isPartner,
        isStudyAbroadEnrollment: isStudyAbroad,
        enrollmentType: isPartner ? 'Academic Partner' : isStudyAbroad ? 'Study Abroad' : 'Direct Admission',
        enrolledAt: (e.enrolledAt || e.createdAt).toISOString(),
        status: e.status || 'enrolled',
        source: 'enrollment'
      });
    }
  }

  for (const s of students) {
    const emailKey = s.email ? s.email.toLowerCase().trim() : '';
    const enrollKey = s.enrollmentNo ? s.enrollmentNo.toLowerCase().trim() : '';
    if ((emailKey && seen.has(emailKey)) || (enrollKey && seen.has(enrollKey))) {
      continue;
    }
    if (emailKey) seen.add(emailKey);
    if (enrollKey) seen.add(enrollKey);

    const isPartner = Boolean(s.centerId || s.center);
    const isStudyAbroad = !isPartner && s.source === 'study_abroad';
    list.push({
      id: s.id,
      studentName: s.name || 'Student',
      studentEmail: s.email || 'N/A',
      studentPhone: s.phone || 'N/A',
      enrollmentNumber: s.enrollmentNo || s.admissionNo || 'Pending',
      programName: s.program?.name || 'Academic Program',
      studyCenterId: s.centerId || null,
      studyCenterName: s.center?.name || null,
      isPartnerEnrollment: isPartner,
      isStudyAbroadEnrollment: isStudyAbroad,
      enrollmentType: isPartner ? 'Academic Partner' : isStudyAbroad ? 'Study Abroad' : 'Direct Admission',
      enrolledAt: (s.enrolledAt || s.admissionDate || s.createdAt).toISOString(),
      status: s.status || 'enrolled',
      source: 'student'
    });
  }

  list.sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
  return list;
}

export const getOrganizations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const whereClause = req.user.role === 'superadmin' ? {} : { id: req.user.organizationId };
  const monthParam = typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month)
    ? req.query.month
    : null;

  const organizations = await prisma.organization.findMany({
    where: whereClause,
    include: {
      license: true,
      _count: {
        select: {
          students: true,
          enrollments: true,
          users: {
            where: {
              role: { not: 'student' }
            }
          },
          academicCenters: true,
          studyCenters: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  let resultData = organizations.map((org: any) => {
    const studentCount = Math.max(org._count?.students || 0, org._count?.enrollments || 0);
    return {
      ...org,
      _count: {
        ...org._count,
        students: studentCount,
        enrollments: studentCount,
      }
    };
  });

  if (monthParam) {
    resultData = await Promise.all(
      organizations.map(async (org) => {
        const monthEnrollments = await getOrganizationMonthEnrollments(org.id, monthParam);
        const partnerCount = monthEnrollments.filter(e => e.isPartnerEnrollment).length;
        const orgMeta: any = org.metadata || {};
        const orgFeatures = orgMeta.planConfig?.features ?? orgMeta.billingConfig?.features ?? org.license?.features;
        const orgHasStudyAbroad = Array.isArray(orgFeatures) && orgFeatures.includes('study_abroad_partners');
        const studyAbroadCount = orgHasStudyAbroad ? monthEnrollments.filter(e => e.isStudyAbroadEnrollment).length : 0;
        const directCount = monthEnrollments.filter(e => !e.isPartnerEnrollment && !(orgHasStudyAbroad && e.isStudyAbroadEnrollment)).length;
        return {
          ...org,
          selectedMonth: monthParam,
          monthEnrollmentCount: partnerCount,
          monthPartnerEnrollmentCount: partnerCount,
          monthDirectEnrollmentCount: directCount,
          monthStudyAbroadEnrollmentCount: studyAbroadCount,
          monthTotalEnrollmentCount: monthEnrollments.length,
        };
      })
    );
  }

  res.status(200).json({ success: true, count: resultData.length, data: resultData });
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
  const { enrollmentApprovalFlow, admissionPrefix, ...restData } = req.body;
  
  let updateData: any = { ...restData };

  if (enrollmentApprovalFlow !== undefined || admissionPrefix !== undefined) {
    const existingOrg = await prisma.organization.findUnique({ where: { id: req.params.id } });
    const currentMetadata = (existingOrg?.metadata as any) || {};
    
    if (enrollmentApprovalFlow !== undefined) currentMetadata.enrollmentApprovalFlow = enrollmentApprovalFlow;
    if (admissionPrefix !== undefined) currentMetadata.admissionPrefix = admissionPrefix;

    updateData.metadata = currentMetadata;
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

// Features Superadmin can switch on/off for one organization without opening the full plan dialog.
const TOGGLEABLE_FEATURES = ['academic_partners', 'academic_centers', 'study_abroad_partners'];
// What the org menus assume when nothing has been configured for an organization.
const DEFAULT_ORG_FEATURES = ['academic_partners', 'academic_centers'];

export const setOrganizationFeature = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { feature, enabled } = req.body;
  if (!TOGGLEABLE_FEATURES.includes(feature)) {
    res.status(400).json({ success: false, message: `feature must be one of: ${TOGGLEABLE_FEATURES.join(', ')}` });
    return;
  }
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ success: false, message: 'enabled must be true or false' });
    return;
  }

  const org = await prisma.organization.findUnique({ where: { id: req.params.id }, include: { license: true } });
  if (!org) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  const meta: any = { ...((org.metadata as any) || {}) };
  // The feature list in force today (same precedence the menus use), so toggling one feature
  // never changes the others — including the default Academic features of an unconfigured org.
  const current: string[] =
    Array.isArray(meta.planConfig?.features) ? meta.planConfig.features
    : Array.isArray(meta.billingConfig?.features) ? meta.billingConfig.features
    : (Array.isArray(org.license?.features) && org.license!.features.length > 0 ? org.license!.features : DEFAULT_ORG_FEATURES);
  const next = enabled ? Array.from(new Set([...current, feature])) : current.filter(f => f !== feature);

  // Keep planConfig and billingConfig in step, as the plan dialog does. If neither exists yet,
  // planConfig carries just the feature list (prices fall back to billingConfig/license as before).
  if (meta.planConfig || !meta.billingConfig) meta.planConfig = { ...(meta.planConfig || {}), features: next };
  if (meta.billingConfig) meta.billingConfig = { ...meta.billingConfig, features: next };

  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: { metadata: meta },
    select: { id: true, metadata: true },
  });
  res.status(200).json({ success: true, data: { id: updated.id, metadata: updated.metadata, feature, enabled } });
});

export const assignLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { 
    planName, 
    basePrice, 
    perEnrollmentFee, 
    features, 
    academicPartnersPrice,
    academicCentersPrice,
    academicPartnerBasePrice = 0,
    academicPartnerPerEnrollmentFee = 0,
    directPerEnrollmentFee = 0,
    academicCenterBasePrice = 0,
    studyAbroadBasePrice = 0,
    studyAbroadPerEnrollmentFee = 0,
    durationMonths, 
    licenseExpiry,
    maxUsers,
    maxStorage,
    status = 'active',
    licenseId,
  } = req.body;

  const existingOrg = await prisma.organization.findUnique({ 
    where: { id: req.params.id },
    include: { license: true }
  });
  if (!existingOrg) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  const priceFields: Record<string, unknown> = {
    academicPartnerBasePrice, academicPartnerPerEnrollmentFee, directPerEnrollmentFee,
    academicCenterBasePrice, studyAbroadBasePrice, studyAbroadPerEnrollmentFee,
  };
  for (const [name, value] of Object.entries(priceFields)) {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n) || n < 0) {
      res.status(400).json({ success: false, message: `${name} must be a number that is 0 or more` });
      return;
    }
  }

  const expiryDate = new Date();
  if (licenseExpiry) {
    expiryDate.setTime(new Date(licenseExpiry).getTime());
  } else if (durationMonths) {
    expiryDate.setMonth(expiryDate.getMonth() + Number(durationMonths));
  } else {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  }

  // Synchronize or create dedicated License record for this organization
  let targetLicenseId = existingOrg.licenseId || licenseId;
  const planFeatures = Array.isArray(features) ? features : [];
  
  // Academic Partner values: Base Value + Per Enrollment Value
  const partnerBase = Number(academicPartnerBasePrice ?? academicPartnersPrice ?? 0);
  const partnerPerEnrollment = Number(academicPartnerPerEnrollmentFee ?? perEnrollmentFee ?? 0);

  // Academic Center values: Base Value
  const centerBase = Number(academicCenterBasePrice ?? academicCentersPrice ?? 0);

  // Study Abroad Partner values: Base Value + Per Study Abroad Enrollment Value
  const studyAbroadBase = Number(studyAbroadBasePrice || 0);
  const studyAbroadPerEnrollment = Number(studyAbroadPerEnrollmentFee || 0);

  const totalBasePrice = Number(basePrice || 0) + (planFeatures.includes('academic_partners') ? partnerBase : 0) + (planFeatures.includes('academic_centers') ? centerBase : 0) + (planFeatures.includes('study_abroad_partners') ? studyAbroadBase : 0);
  const numericDuration = Number(durationMonths ?? existingOrg.license?.durationMonths ?? 12);
  const numericMaxUsers = Number(maxUsers ?? existingOrg.license?.maxUsers ?? 25);
  const numericMaxStorage = Number(maxStorage ?? existingOrg.license?.maxStorage ?? 2048);
  const resolvedPlanName = planName || existingOrg.license?.name || `${existingOrg.name} Plan`;

  if (targetLicenseId) {
    await prisma.license.update({
      where: { id: targetLicenseId },
      data: {
        name: resolvedPlanName,
        price: totalBasePrice,
        perEnrollmentFee: partnerPerEnrollment,
        features: planFeatures,
        durationMonths: numericDuration,
        maxUsers: numericMaxUsers,
        maxStorage: numericMaxStorage,
        status: status,
      }
    });
  } else {
    const createdLicense = await prisma.license.create({
      data: {
        name: resolvedPlanName,
        price: totalBasePrice,
        perEnrollmentFee: partnerPerEnrollment,
        features: planFeatures,
        durationMonths: numericDuration,
        maxUsers: numericMaxUsers,
        maxStorage: numericMaxStorage,
        status: status,
      }
    });
    targetLicenseId = createdLicense.id;
  }

  const currentMetadata = (existingOrg.metadata as any) || {};
  const directPerFee = Number(directPerEnrollmentFee || 0);

  currentMetadata.planConfig = {
    planName: resolvedPlanName,
    basePrice: totalBasePrice,
    academicPartnerBasePrice: partnerBase,
    academicPartnerPerEnrollmentFee: partnerPerEnrollment,
    directPerEnrollmentFee: directPerFee,
    academicCenterBasePrice: centerBase,
    studyAbroadBasePrice: studyAbroadBase,
    studyAbroadPerEnrollmentFee: studyAbroadPerEnrollment,
    academicPartnersPrice: partnerBase,
    academicCentersPrice: centerBase,
    perEnrollmentFee: partnerPerEnrollment,
    features: planFeatures,
    durationMonths: numericDuration,
    maxUsers: numericMaxUsers,
    maxStorage: numericMaxStorage,
    status: status,
  };
  currentMetadata.billingConfig = {
    customPricing: true,
    basePrice: totalBasePrice,
    academicPartnerBasePrice: partnerBase,
    academicPartnerPerEnrollmentFee: partnerPerEnrollment,
    directPerEnrollmentFee: directPerFee,
    academicCenterBasePrice: centerBase,
    studyAbroadBasePrice: studyAbroadBase,
    studyAbroadPerEnrollmentFee: studyAbroadPerEnrollment,
    academicPartnersPrice: partnerBase,
    academicCentersPrice: centerBase,
    perEnrollmentFee: partnerPerEnrollment,
    features: planFeatures,
  };

  const updatedOrg = await prisma.organization.update({
    where: { id: req.params.id },
    data: {
      licenseId: targetLicenseId,
      licenseExpiry: expiryDate,
      metadata: currentMetadata,
    },
    include: {
      license: true,
      _count: {
        select: {
          students: true,
          enrollments: true,
          users: {
            where: {
              role: { not: 'student' }
            }
          },
          academicCenters: true,
          studyCenters: true,
        }
      }
    }
  });

  const studentCount = Math.max(updatedOrg._count?.students || 0, updatedOrg._count?.enrollments || 0);
  const formattedOrg = {
    ...updatedOrg,
    _count: {
      ...updatedOrg._count,
      students: studentCount,
      enrollments: studentCount,
    }
  };

  res.status(200).json({ success: true, data: formattedOrg });
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

export const generateOrgBill = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { billingMonth } = req.body; // e.g. "2026-10"

  if (!billingMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(billingMonth)) {
    res.status(400).json({ success: false, message: 'Valid billingMonth in YYYY-MM format is required' });
    return;
  }
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (billingMonth > currentMonth) {
    res.status(400).json({ success: false, message: 'Cannot generate a bill for a future month' });
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      license: true,
      _count: {
        select: {
          students: true,
          enrollments: true,
        }
      }
    }
  });

  if (!org) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  const currentMetadata = (org.metadata as any) || {};
  const planConfig = currentMetadata.planConfig || {};
  const billingConfig = currentMetadata.billingConfig || {};

  const features = Array.isArray(planConfig.features) 
    ? planConfig.features 
    : (Array.isArray(billingConfig.features) ? billingConfig.features : (Array.isArray(org.license?.features) ? org.license.features : ['academic_partners', 'academic_centers']));

  const hasAcademicPartners = features.includes('academic_partners');
  const hasAcademicCenters = features.includes('academic_centers');
  const hasStudyAbroad = features.includes('study_abroad_partners');

  const partnerBase = hasAcademicPartners
    ? Number(planConfig.academicPartnerBasePrice ?? billingConfig.academicPartnerBasePrice ?? 0)
    : 0;

  const partnerPerEnrollment = hasAcademicPartners
    ? Number(planConfig.academicPartnerPerEnrollmentFee ?? billingConfig.academicPartnerPerEnrollmentFee ?? org.license?.perEnrollmentFee ?? 0)
    : 0;

  const directPerEnrollment = Number(planConfig.directPerEnrollmentFee ?? billingConfig.directPerEnrollmentFee ?? 0);

  const centerBase = hasAcademicCenters
    ? Number(planConfig.academicCenterBasePrice ?? billingConfig.academicCenterBasePrice ?? 0)
    : 0;

  const studyAbroadBase = hasStudyAbroad
    ? Number(planConfig.studyAbroadBasePrice ?? billingConfig.studyAbroadBasePrice ?? 0)
    : 0;
  const studyAbroadPerEnrollment = hasStudyAbroad
    ? Number(planConfig.studyAbroadPerEnrollmentFee ?? billingConfig.studyAbroadPerEnrollmentFee ?? 0)
    : 0;

  // Query strictly for the selected billing month within organization's salary billing cycle
  const { startDate, endDate, billingCycleLabel } = await getOrgBillingDateRange(org.id, billingMonth);
  const monthEnrollments = await getOrganizationMonthEnrollments(org.id, billingMonth);
  const partnerEnrollments = monthEnrollments.filter(e => e.isPartnerEnrollment);
  // Study Abroad students are billed on their own rate only when the feature is on; otherwise they stay direct.
  const studyAbroadEnrollments = hasStudyAbroad ? monthEnrollments.filter(e => e.isStudyAbroadEnrollment) : [];
  const directEnrollments = monthEnrollments.filter(e => !e.isPartnerEnrollment && !(hasStudyAbroad && e.isStudyAbroadEnrollment));

  const partnerStudentCount = partnerEnrollments.length;
  const studyAbroadStudentCount = studyAbroadEnrollments.length;
  const directStudentCount = directEnrollments.length;
  const totalStudentCount = monthEnrollments.length;

  const partnerEnrollmentTotal = roundMoney(partnerStudentCount * partnerPerEnrollment);
  const partnerSubtotal = roundMoney(partnerBase + partnerEnrollmentTotal);

  const directEnrollmentTotal = roundMoney(directStudentCount * directPerEnrollment);

  const studyAbroadEnrollmentTotal = roundMoney(studyAbroadStudentCount * studyAbroadPerEnrollment);
  const studyAbroadSubtotal = roundMoney(studyAbroadBase + studyAbroadEnrollmentTotal);

  const totalAmount = roundMoney((hasAcademicPartners ? partnerSubtotal : 0) + directEnrollmentTotal + (hasAcademicCenters ? centerBase : 0) + (hasStudyAbroad ? studyAbroadSubtotal : 0));

  const [yearStr, monthStr] = billingMonth.split('-');
  const monthDate = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  const monthLabel = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const billId = `BILL-${org.id.slice(0, 6).toUpperCase()}-${billingMonth.replace('-', '')}`;
  const billNo = `INV-${billingMonth.replace('-', '')}-${org.id.slice(0, 4).toUpperCase()}`;

  const existingHistory: any[] = Array.isArray(currentMetadata.billHistory) ? currentMetadata.billHistory : [];
  const existingIdx = existingHistory.findIndex((b: any) => b.billingMonth === billingMonth);
  const existingStatus = existingIdx >= 0 ? (existingHistory[existingIdx].status || 'unpaid') : 'unpaid';
  if (existingStatus === 'paid') {
    // A settled invoice must not silently change amount; mark it unpaid first if it truly needs re-issuing.
    res.status(409).json({ success: false, message: `The bill for ${billingMonth} is already marked paid. Mark it unpaid before regenerating.` });
    return;
  }

  const billRecord = {
    id: billId,
    billNo: billNo,
    organizationId: org.id,
    organizationName: org.name,
    organizationAddress: org.address,
    organizationEmail: org.email,
    organizationPhone: org.phone,
    billingMonth: billingMonth,
    billingMonthLabel: monthLabel,
    billingCycleStart: startDate.toISOString(),
    billingCycleEnd: endDate.toISOString(),
    billingCycleLabel: billingCycleLabel,
    generatedAt: new Date().toISOString(),
    status: existingStatus,
    studentCount: totalStudentCount,
    partnerStudentCount: partnerStudentCount,
    directStudentCount: directStudentCount,
    studyAbroadStudentCount: studyAbroadStudentCount,
    totalStudentCount: totalStudentCount,
    enrollments: monthEnrollments,
    academicPartner: {
      enabled: hasAcademicPartners,
      basePrice: partnerBase,
      perEnrollmentFee: partnerPerEnrollment,
      studentCount: partnerStudentCount,
      enrollmentTotal: partnerEnrollmentTotal,
      subtotal: partnerSubtotal,
    },
    directEnrollment: {
      perEnrollmentFee: directPerEnrollment,
      studentCount: directStudentCount,
      enrollmentTotal: directEnrollmentTotal,
      subtotal: directEnrollmentTotal,
    },
    academicCenter: {
      enabled: hasAcademicCenters,
      basePrice: centerBase,
      subtotal: centerBase,
    },
    studyAbroad: {
      enabled: hasStudyAbroad,
      basePrice: studyAbroadBase,
      perEnrollmentFee: studyAbroadPerEnrollment,
      studentCount: studyAbroadStudentCount,
      enrollmentTotal: studyAbroadEnrollmentTotal,
      subtotal: studyAbroadSubtotal,
    },
    totalAmount: totalAmount,
  };

  if (existingIdx >= 0) {
    existingHistory[existingIdx] = {
      ...existingHistory[existingIdx],
      ...billRecord,
      generatedAt: new Date().toISOString(),
    };
  } else {
    existingHistory.unshift(billRecord);
  }

  currentMetadata.billHistory = existingHistory;

  await prisma.organization.update({
    where: { id: org.id },
    data: { metadata: currentMetadata }
  });

  res.status(200).json({ 
    success: true, 
    data: billRecord, 
    message: `Bill generated for ${monthLabel} (${billingCycleLabel}) with ${partnerStudentCount} partner enrollment(s) (${directStudentCount} direct admissions excluded)` 
  });
});

export const getOrgMonthEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const monthParam = typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month)
    ? req.query.month
    : new Date().toISOString().slice(0, 7);

  // An org admin may only read their own organization's enrollments.
  if (req.user.role !== 'superadmin' && req.user.organizationId !== id) {
    res.status(403).json({ success: false, message: 'Not authorized to view this organization' });
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true }
  });

  if (!org) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  const [yearStr, monthStr] = monthParam.split('-');
  const monthDate = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  const monthLabel = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const { startDate, endDate, billingCycleLabel } = await getOrgBillingDateRange(id, monthParam);
  const enrollments = await getOrganizationMonthEnrollments(id, monthParam);
  const partnerEnrollments = enrollments.filter(e => e.isPartnerEnrollment);
  const studyAbroadEnrollments = enrollments.filter(e => e.isStudyAbroadEnrollment);
  const directEnrollments = enrollments.filter(e => !e.isPartnerEnrollment && !e.isStudyAbroadEnrollment);

  res.status(200).json({
    success: true,
    organizationId: org.id,
    organizationName: org.name,
    billingMonth: monthParam,
    billingMonthLabel: monthLabel,
    billingCycleLabel,
    billingCycleStart: startDate.toISOString(),
    billingCycleEnd: endDate.toISOString(),
    count: enrollments.length,
    partnerCount: partnerEnrollments.length,
    directCount: directEnrollments.length,
    studyAbroadCount: studyAbroadEnrollments.length,
    data: enrollments
  });
});

export const getBillHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { organizationId, month } = req.query;

  const whereClause: any = {};
  if (req.user.role !== 'superadmin') {
    whereClause.id = req.user.organizationId;
  } else if (organizationId) {
    whereClause.id = String(organizationId);
  }

  const organizations = await prisma.organization.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      metadata: true,
    }
  });

  let allBills: any[] = [];
  for (const org of organizations) {
    const meta = (org.metadata as any) || {};
    const history = Array.isArray(meta.billHistory) ? meta.billHistory : [];
    for (const bill of history) {
      allBills.push({
        ...bill,
        organizationName: bill.organizationName || org.name,
        organizationEmail: bill.organizationEmail || org.email,
        organizationPhone: bill.organizationPhone || org.phone,
        organizationAddress: bill.organizationAddress || org.address,
      });
    }
  }

  if (month) {
    allBills = allBills.filter(b => b.billingMonth === month);
  }

  allBills.sort((a, b) => new Date(b.generatedAt || b.billingMonth).getTime() - new Date(a.generatedAt || a.billingMonth).getTime());

  res.status(200).json({ success: true, count: allBills.length, data: allBills });
});

export const updateBillStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, billId } = req.params;
  const { status } = req.body; // 'paid' | 'unpaid'

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  const currentMetadata = (org.metadata as any) || {};
  const history: any[] = Array.isArray(currentMetadata.billHistory) ? currentMetadata.billHistory : [];
  const bill = history.find(b => b.id === billId);

  if (!bill) {
    res.status(404).json({ success: false, message: 'Bill not found' });
    return;
  }

  bill.status = status || 'paid';
  bill.updatedAt = new Date().toISOString();

  await prisma.organization.update({
    where: { id },
    data: { metadata: currentMetadata }
  });

  res.status(200).json({ success: true, data: bill, message: 'Bill status updated' });
});
