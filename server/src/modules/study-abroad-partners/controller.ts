/**
 * Study Abroad Partners — external overseas-education partners who submit student
 * applications to the organization. Separate counterpart of Academic Partners
 * (StudyCenter), with its own application flow.
 *
 * Partners are created by staff and are active immediately (like Academic Partners);
 * the generated login is shown once and emailed. active ⇄ suspended.
 *
 * Application lifecycle (StudyAbroadEnrollment.status):
 *   document_review → (Ops approves) → finance_review → (Finance approves, optionally recording a service fee) → enrolled
 *   Ops rejects → ops_rejected, Finance rejects → finance_rejected; partner resubmits to retry.
 */
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../../utils/authUtils.js';
import { enqueueNotification } from '../../utils/notificationQueue.js';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Set the HTTP status and throw so the shared error handler formats the response. */
const fail = (res: Response, status: number, message: string): never => {
  res.status(status);
  throw new Error(message);
};

const str = (v: unknown, max = 500): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
};

const strList = (v: unknown, maxItems = 100): string[] =>
  Array.isArray(v)
    ? Array.from(new Set(v.map(x => str(x, 100)).filter((x): x is string => !!x))).slice(0, maxItems)
    : [];

const pushHistory = (history: unknown, status: string, by: string, remarks?: string | null) => [
  ...(Array.isArray(history) ? history : []),
  { status, changedAt: new Date().toISOString(), changedBy: by, ...(remarks ? { remarks } : {}) },
];

/** Password the admin chose (optional). Returns undefined to auto-generate; rejects weak ones. */
const chosenPassword = (v: unknown, res: Response): string | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string' || v.length < 8 || v.length > 100) return fail(res, 400, 'Password must be 8 to 100 characters');
  return v;
};

const generatePassword = () => `Abroad@${Math.floor(100000 + Math.random() * 900000)}`;

const fileUrl = (f: any): string => `/uploads/${f.key || f.filename}`;

/**
 * The partner a portal user administers. Resolved from the partner row (adminUserId) rather
 * than a column on User, so the core auth path never depends on this feature's schema.
 */
const myPartnerId = async (req: AuthRequest, res: Response): Promise<string> => {
  const partner = await prisma.studyAbroadPartner.findFirst({
    where: { adminUserId: req.user?.id, organizationId: req.user?.organizationId },
    select: { id: true },
  });
  if (!partner) return fail(res, 403, 'No study abroad partner is linked to this account');
  return partner.id;
};

const findPartner = async (req: AuthRequest, res: Response, id: string) => {
  const partner = await prisma.studyAbroadPartner.findFirst({
    where: { id, organizationId: req.user.organizationId },
  });
  if (!partner) return fail(res, 404, 'Study abroad partner not found');
  return partner;
};

// ─── staff: partner management ──────────────────────────────────────────────

export const listPartners = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  const status = str(req.query.status, 40);
  if (status && status !== 'all') where.status = status;
  const partners = await prisma.studyAbroadPartner.findMany({
    where,
    include: { _count: { select: { enrollments: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, count: partners.length, data: partners });
});

export const getPartner = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partner = await prisma.studyAbroadPartner.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId },
    include: { _count: { select: { enrollments: true } } },
  });
  if (!partner) return fail(res, 404, 'Study abroad partner not found');
  res.json({ success: true, data: partner });
});

export const createPartner = asyncHandler(async (req: AuthRequest, res: Response) => {
  const name = str(req.body.name, 200);
  const code = str(req.body.code, 40);
  const email = str(req.body.email, 200)?.toLowerCase();
  if (!name || !code || !email) return fail(res, 400, 'name, code and email are required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'A valid email is required');

  if (await prisma.studyAbroadPartner.findFirst({ where: { organizationId: req.user.organizationId, code } })) {
    return fail(res, 400, 'A study abroad partner with this code already exists in your organization');
  }
  if (await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } })) {
    return fail(res, 400, 'An account with this email already exists. Please use a different email.');
  }

  const status = 'active';
  const chosen = chosenPassword(req.body.password, res);
  const generatedPassword = chosen ?? generatePassword();
  const hashedPassword = await hashPassword(generatedPassword);
  const userId = await generateUserId();
  const contact = str(req.body.contact, 40);

  // Admin login + partner are created together: a failure must not leave one without the other.
  const partner = await prisma.$transaction(async tx => {
    const admin = await tx.user.create({
      data: {
        userId,
        organizationId: req.user.organizationId,
        email,
        password: hashedPassword,
        name: `${name} Admin`,
        role: 'study_abroad_admin',
        phone: contact,
        status: 'active',
      },
    });
    return tx.studyAbroadPartner.create({
      data: {
        organizationId: req.user.organizationId,
        name, code, email, contact,
        address: str(req.body.address),
        city: str(req.body.city, 100),
        state: str(req.body.state, 100),
        country: str(req.body.country, 100),
        destinationCountries: strList(req.body.destinationCountries),
        status,
        adminUserId: admin.id,
        referredBy: req.user.id,
        statusHistory: pushHistory([], status, req.user.id, 'Partner created'),
      },
    });
  });

  res.status(201).json({
    success: true,
    data: partner,
    // Shown once to the creator; the password is not stored anywhere readable.
    credentials: { email, password: generatedPassword, generated: !chosen },
  });

  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  enqueueNotification({
    type: 'CUSTOM_EMAIL',
    data: {
      to: email,
      subject: 'Your Study Abroad Partner Portal Credentials',
      text: `Hello ${name} Admin,\n\nYour study abroad partner account has been created.\n\nLogin URL: ${loginUrl}\nEmail: ${email}\nPassword: ${generatedPassword}\n\nPlease change your password after your first login.`,
      html: `<p>Hello <strong>${name} Admin</strong>,</p><p>Your study abroad partner account has been created.</p><p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a><br/><strong>Email:</strong> ${email}<br/><strong>Password:</strong> ${generatedPassword}</p><p>Please change your password after your first login.</p>`,
      organizationId: req.user.organizationId,
    },
  });
});

export const updatePartner = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partner = await findPartner(req, res, req.params.id);
  const data: any = {};
  for (const [k, max] of [['name', 200], ['contact', 40], ['address', 500], ['city', 100], ['state', 100], ['country', 100]] as const) {
    const v = str(req.body[k], max);
    if (v !== undefined) data[k] = v;
  }
  if (req.body.destinationCountries !== undefined) data.destinationCountries = strList(req.body.destinationCountries);

  // The partner's email is its login. Changing it changes how they sign in.
  const newEmail = str(req.body.email, 200)?.toLowerCase();
  if (newEmail && newEmail !== partner.email?.toLowerCase()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return fail(res, 400, 'A valid email is required');
    const taken = await prisma.user.findFirst({
      where: { email: { equals: newEmail, mode: 'insensitive' }, NOT: partner.adminUserId ? { id: partner.adminUserId } : undefined },
      select: { id: true },
    });
    if (taken) return fail(res, 400, 'An account with this email already exists. Please use a different email.');
    data.email = newEmail;
  }

  // Keep the partner's login user in step with the partner, as an admin would expect.
  const userData: any = {};
  if (data.name !== undefined) userData.name = `${data.name} Admin`;
  if (data.contact !== undefined) userData.phone = data.contact;
  if (data.email !== undefined) userData.email = data.email;

  const updated = await prisma.$transaction(async tx => {
    if (partner.adminUserId && Object.keys(userData).length > 0) {
      await tx.user.update({ where: { id: partner.adminUserId }, data: userData });
    }
    return tx.studyAbroadPartner.update({ where: { id: partner.id }, data });
  });
  res.json({ success: true, data: updated });
});

/** Replace the set of destination countries this partner may submit applications for. */
export const setPartnerCountries = asyncHandler(async (req: AuthRequest, res: Response) => {
  await findPartner(req, res, req.params.id);
  const updated = await prisma.studyAbroadPartner.update({
    where: { id: req.params.id },
    data: { destinationCountries: strList(req.body.destinationCountries) },
  });
  res.json({ success: true, data: updated });
});

/** Set a new password for the partner's admin login (admin-chosen, or generated); shown once and emailed. Nothing readable is stored. */
export const resetPartnerPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partner = await findPartner(req, res, req.params.id);
  if (!partner.adminUserId || !partner.email) return fail(res, 404, 'This partner has no admin login');
  const chosen = chosenPassword(req.body.password, res);
  const password = chosen ?? generatePassword();
  await prisma.user.update({ where: { id: partner.adminUserId }, data: { password: await hashPassword(password) } });
  res.json({ success: true, credentials: { email: partner.email, password, generated: !chosen } });

  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  enqueueNotification({
    type: 'CUSTOM_EMAIL',
    data: {
      to: partner.email,
      subject: 'Your Study Abroad Partner Portal password was reset',
      text: `Hello ${partner.name} Admin,\n\nYour password was reset.\n\nLogin URL: ${loginUrl}\nEmail: ${partner.email}\nPassword: ${password}\n\nPlease change it after you log in.`,
      html: `<p>Hello <strong>${partner.name} Admin</strong>,</p><p>Your password was reset.</p><p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a><br/><strong>Email:</strong> ${partner.email}<br/><strong>Password:</strong> ${password}</p><p>Please change it after you log in.</p>`,
      organizationId: req.user.organizationId,
    },
  });
});

const transition = async (
  req: AuthRequest, res: Response, id: string,
  from: string[], to: string, extra: Record<string, unknown>, remarks?: string,
) => {
  const partner = await findPartner(req, res, id);
  if (!from.includes(partner.status)) {
    return fail(res, 409, `Partner is "${partner.status}"; expected ${from.join(' or ')}`);
  }
  // Guard on the current status so two concurrent reviewers can't both apply.
  const { count } = await prisma.studyAbroadPartner.updateMany({
    where: { id: partner.id, organizationId: req.user.organizationId, status: partner.status },
    data: { status: to, statusHistory: pushHistory(partner.statusHistory, to, req.user.id, remarks), ...extra },
  });
  if (count === 0) return fail(res, 409, 'Partner was updated by someone else. Please refresh.');
  return prisma.studyAbroadPartner.findUnique({ where: { id: partner.id } });
};

export const suspendPartner = asyncHandler(async (req: AuthRequest, res: Response) => {
  const remarks = str(req.body.remarks);
  const data = await transition(req, res, req.params.id, ['active'], 'suspended', {}, remarks);
  res.json({ success: true, data });
});

export const reactivatePartner = asyncHandler(async (req: AuthRequest, res: Response) => {
  const remarks = str(req.body.remarks);
  const data = await transition(req, res, req.params.id, ['suspended'], 'active', {}, remarks);
  res.json({ success: true, data });
});

// ─── staff: application review (Operations → Finance) ───────────────────────

export const listEnrollmentsForReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stage = str(req.query.stage, 20);
  const where: any = { organizationId: req.user.organizationId };
  if (stage === 'ops') where.status = { in: ['document_review'] };
  else if (stage === 'finance') where.status = { in: ['finance_review'] };
  else {
    const st = str(req.query.status, 30);
    if (st && st !== 'all') where.status = st;
  }
  const enrollments = await prisma.studyAbroadEnrollment.findMany({
    where,
    include: { partner: { select: { id: true, name: true, code: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

const reviewTransition = async (
  req: AuthRequest, res: Response,
  from: string, to: string, extra: Record<string, unknown>, remarks?: string,
) => {
  const enrollment = await prisma.studyAbroadEnrollment.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId },
  });
  if (!enrollment) return fail(res, 404, 'Application not found');
  if (enrollment.status !== from) return fail(res, 409, `Application is "${enrollment.status}"; expected "${from}"`);
  const { count } = await prisma.studyAbroadEnrollment.updateMany({
    where: { id: enrollment.id, status: from },
    data: { status: to, statusHistory: pushHistory(enrollment.statusHistory, to, req.user.id, remarks), ...extra },
  });
  if (count === 0) return fail(res, 409, 'Application was updated by someone else. Please refresh.');
  return prisma.studyAbroadEnrollment.findUnique({ where: { id: enrollment.id } });
};

export const opsApproveEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const remarks = str(req.body.remarks);
  const data = await reviewTransition(req, res, 'document_review', 'finance_review',
    { opsReviewedBy: req.user.id, opsReviewedAt: new Date(), opsRemarks: remarks ?? null }, remarks);
  res.json({ success: true, data });
});

export const opsRejectEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const remarks = str(req.body.remarks);
  if (!remarks) return fail(res, 400, 'Remarks are required to reject');
  const data = await reviewTransition(req, res, 'document_review', 'ops_rejected',
    { opsReviewedBy: req.user.id, opsReviewedAt: new Date(), opsRemarks: remarks }, remarks);
  res.json({ success: true, data });
});

export const financeRejectEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const remarks = str(req.body.remarks);
  if (!remarks) return fail(res, 400, 'Remarks are required to reject');
  const data = await reviewTransition(req, res, 'finance_review', 'finance_rejected',
    { financeReviewedBy: req.user.id, financeReviewedAt: new Date(), financeRemarks: remarks }, remarks);
  res.json({ success: true, data });
});

/** Finance approval enrolls the student. The service fee is optional and only recorded. */
export const financeApproveEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rawFee = req.body.serviceFee;
  let serviceFee: number | null = null;
  if (rawFee !== undefined && rawFee !== null && rawFee !== '') {
    serviceFee = Number(rawFee);
    if (!Number.isFinite(serviceFee) || serviceFee < 0) return fail(res, 400, 'serviceFee must be 0 or more');
  }
  const remarks = str(req.body.remarks);
  const data = await reviewTransition(req, res, 'finance_review', 'enrolled', {
    serviceFee,
    financeReviewedBy: req.user.id,
    financeReviewedAt: new Date(),
    financeRemarks: remarks ?? null,
  }, remarks || (serviceFee ? `Approved with service fee ${serviceFee}` : 'Approved'));
  res.json({ success: true, data });
});

// ─── partner portal (role: study_abroad_admin) ──────────────────────────────

export const getMyPartner = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partnerId = await myPartnerId(req, res);
  const partner = await prisma.studyAbroadPartner.findFirst({
    where: { id: partnerId, organizationId: req.user.organizationId },
  });
  if (!partner) return fail(res, 404, 'Study abroad partner not found');
  const grouped = await prisma.studyAbroadEnrollment.groupBy({
    by: ['status'], where: { partnerId }, _count: { _all: true },
  });
  const counts = Object.fromEntries(grouped.map(g => [g.status, g._count._all]));
  res.json({ success: true, data: { ...partner, enrollmentCounts: counts } });
});

const parseApplication = (body: any, res: Response) => {
  const studentName = str(body.studentName, 200);
  const studentEmail = str(body.studentEmail, 200)?.toLowerCase();
  const studentPhone = str(body.studentPhone, 40);
  const destinationCountry = str(body.destinationCountry, 100);
  const universityName = str(body.universityName, 200);
  const courseName = str(body.courseName, 200);
  const intake = str(body.intake, 60);
  if (!studentName || !studentEmail || !studentPhone || !destinationCountry || !universityName || !courseName || !intake) {
    return fail(res, 400, 'studentName, studentEmail, studentPhone, destinationCountry, universityName, courseName and intake are required');
  }
  const dob = body.dateOfBirth ? new Date(body.dateOfBirth) : undefined;
  if (dob && Number.isNaN(dob.getTime())) return fail(res, 400, 'dateOfBirth is not a valid date');
  const intakeYear = body.intakeYear !== undefined && body.intakeYear !== '' ? Number(body.intakeYear) : undefined;
  if (intakeYear !== undefined && (!Number.isInteger(intakeYear) || intakeYear < 2000 || intakeYear > 2100)) {
    return fail(res, 400, 'intakeYear is not valid');
  }
  return {
    studentName, studentEmail, studentPhone, destinationCountry, universityName, courseName, intake,
    studentAddress: str(body.studentAddress),
    passportNumber: str(body.passportNumber, 40),
    dateOfBirth: dob,
    intakeYear,
  };
};

export const createMyEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partnerId = await myPartnerId(req, res);
  const partner = await findPartner(req, res, partnerId);
  if (partner.status !== 'active') return fail(res, 403, 'Your account must be active to submit applications');
  const data = parseApplication(req.body, res);
  if (partner.destinationCountries.length > 0 &&
      !partner.destinationCountries.some(c => c.toLowerCase() === data.destinationCountry.toLowerCase())) {
    return fail(res, 403, `You are not allocated to ${data.destinationCountry}`);
  }
  const enrollment = await prisma.studyAbroadEnrollment.create({
    data: {
      ...data,
      organizationId: req.user.organizationId,
      partnerId,
      createdBy: req.user.id,
      status: 'document_review',
      statusHistory: pushHistory([], 'document_review', req.user.id, 'Application submitted'),
    },
  });
  res.status(201).json({ success: true, data: enrollment });
});

export const getMyEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partnerId = await myPartnerId(req, res);
  const enrollments = await prisma.studyAbroadEnrollment.findMany({
    where: { partnerId }, orderBy: { createdAt: 'desc' }, take: 500,
  });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const uploadEnrollmentDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partnerId = await myPartnerId(req, res);
  const files = (req.files as any[]) || [];
  if (files.length === 0) return fail(res, 400, 'No documents uploaded');
  const enrollment = await prisma.studyAbroadEnrollment.findFirst({ where: { id: req.params.id, partnerId } });
  if (!enrollment) return fail(res, 404, 'Application not found');
  if (!['document_review', 'ops_rejected', 'finance_rejected'].includes(enrollment.status)) {
    return fail(res, 409, 'Documents can no longer be changed for this application');
  }
  const existing = Array.isArray(enrollment.documents) ? (enrollment.documents as any[]) : [];
  const added = files.map(f => ({
    name: f.originalname, url: fileUrl(f), type: str(req.body.type, 60) || 'document', uploadedAt: new Date().toISOString(),
  }));
  const updated = await prisma.studyAbroadEnrollment.update({
    where: { id: enrollment.id }, data: { documents: [...existing, ...added] },
  });
  res.status(201).json({ success: true, data: updated });
});

/** Resubmit a rejected application; it returns to the stage that rejected it. */
export const resubmitMyEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partnerId = await myPartnerId(req, res);
  const enrollment = await prisma.studyAbroadEnrollment.findFirst({ where: { id: req.params.id, partnerId } });
  if (!enrollment) return fail(res, 404, 'Application not found');
  const next = enrollment.status === 'ops_rejected' ? 'document_review'
    : enrollment.status === 'finance_rejected' ? 'finance_review' : null;
  if (!next) return fail(res, 409, 'Only rejected applications can be resubmitted');
  const edits = enrollment.status === 'ops_rejected' ? parseApplication({ ...enrollment, ...req.body }, res) : {};
  const { count } = await prisma.studyAbroadEnrollment.updateMany({
    where: { id: enrollment.id, status: enrollment.status },
    data: {
      ...edits,
      status: next,
      statusHistory: pushHistory(enrollment.statusHistory, next, req.user.id, str(req.body.remarks) || 'Resubmitted by partner'),
    },
  });
  if (count === 0) return fail(res, 409, 'Application was updated by someone else. Please refresh.');
  res.json({ success: true, data: await prisma.studyAbroadEnrollment.findUnique({ where: { id: enrollment.id } }) });
});
