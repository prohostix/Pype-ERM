/**
 * Study Abroad Partners — external overseas-education partners who submit student
 * applications to the organization.
 *
 * Partners are created by the org admin and are active immediately; the generated login is
 * shown once and emailed. active ⇄ suspended.
 *
 * Applications run in their own pipeline (applications.ts): application → interview → offer → payment → visa
 * documents → visa decision → enrolled → commission released. They are independent of the core Enrollment flow.
 */
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../../utils/authUtils.js';
import { checkStudentOrEnrollmentExists } from '../../utils/studentValidation.js';
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

/** Destination countries must come from the organization's country list (University management). */
const validCountries = async (organizationId: string, value: unknown, res: Response): Promise<string[]> => {
  const wanted = strList(value);
  if (wanted.length === 0) return [];
  const known = await prisma.country.findMany({ where: { organizationId }, select: { name: true } });
  const byKey = new Map(known.map(c => [c.name.toLowerCase(), c.name]));
  const unknown = wanted.filter(w => !byKey.has(w.toLowerCase()));
  if (unknown.length > 0) {
    return fail(res, 400, `Unknown country: ${unknown.join(', ')}. Pick from the organization's countries (add new ones in University management).`);
  }
  return Array.from(new Set(wanted.map(w => byKey.get(w.toLowerCase())!)));
};

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

/** Application totals per partner. */
const applicationCounts = async (organizationId: string, partnerIds: string[]): Promise<Record<string, number>> => {
  if (partnerIds.length === 0) return {};
  const rows = await prisma.studyAbroadApplication.groupBy({
    by: ['partnerId'],
    where: { organizationId, partnerId: { in: partnerIds } },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map(r => [r.partnerId, r._count._all]));
};

export const listPartners = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  const status = str(req.query.status, 40);
  if (status && status !== 'all') where.status = status;
  const partners = await prisma.studyAbroadPartner.findMany({ where, orderBy: { createdAt: 'desc' } });
  const counts = await applicationCounts(req.user.organizationId, partners.map(p => p.id));
  res.json({ success: true, count: partners.length, data: partners.map(p => ({ ...p, _count: { enrollments: counts[p.id] || 0 } })) });
});

export const getPartner = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partner = await prisma.studyAbroadPartner.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId },
  });
  if (!partner) return fail(res, 404, 'Study abroad partner not found');
  const counts = await applicationCounts(req.user.organizationId, [partner.id]);
  res.json({ success: true, data: { ...partner, _count: { enrollments: counts[partner.id] || 0 } } });
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

  const destinationCountries = await validCountries(req.user.organizationId, req.body.destinationCountries, res);
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
        destinationCountries,
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
  if (req.body.destinationCountries !== undefined) data.destinationCountries = await validCountries(req.user.organizationId, req.body.destinationCountries, res);

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
    data: { destinationCountries: await validCountries(req.user.organizationId, req.body.destinationCountries, res) },
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

// ─── partner portal (role: study_abroad_admin) ──────────────────────────────

export const getMyPartner = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partnerId = await myPartnerId(req, res);
  const partner = await prisma.studyAbroadPartner.findFirst({
    where: { id: partnerId, organizationId: req.user.organizationId },
  });
  if (!partner) return fail(res, 404, 'Study abroad partner not found');
  const grouped = await prisma.studyAbroadApplication.groupBy({
    by: ['stage'], where: { organizationId: req.user.organizationId, partnerId }, _count: { _all: true },
  });
  // Applications per pipeline stage (application, interview, offer, payment, ... enrolled, withdrawn)
  const counts: Record<string, number> = Object.fromEntries(grouped.map(g => [g.stage, g._count._all]));
  res.json({ success: true, data: { ...partner, enrollmentCounts: counts } });
});

/**
 * Country-wise catalog of the organization's universities with their programs and
 * specialisations. Universities without a country are grouped under "Other" (Academic-Partner-only
 * ones are left out). `allowedCountries` empty = every country.
 */
const NO_COUNTRY = 'Other';

const buildCatalog = async (organizationId: string, allowedCountries: string[], includeEmpty = false) => {
  const universities = await prisma.university.findMany({
    where: { organizationId, status: 'active', isAcademicPartnerOnly: false },
    select: {
      id: true, name: true, logo: true, country: true, enrollmentFormConfig: true,
      programs: {
        where: { status: 'active' },
        select: { id: true, name: true, duration: true, courseType: true, specialisations: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });
  // Intakes: the university's approved admission sessions (program-specific, or university-wide when no program is set), same as Direct Enrollment lists.
  const sessions = universities.length === 0 ? [] : await prisma.admissionSession.findMany({
    where: { organizationId, status: { in: ['approved', 'active'] }, universityId: { in: universities.map(u => u.id) } },
    select: { id: true, universityId: true, programId: true, startDate: true, endDate: true, name: true },
    orderBy: { startDate: 'desc' },
  });
  const intakesFor = (universityId: string, programId: string) => {
    const seen = new Map<string, { id: string; month: number; year: number; session: string; open: boolean }>();
    for (const x of sessions) {
      if (x.universityId !== universityId || (x.programId && x.programId !== programId)) continue;
      const month = x.startDate.getUTCMonth() + 1, year = x.startDate.getUTCFullYear();
      seen.set(x.id, { id: x.id, month, year, session: x.name, open: x.endDate >= new Date() });
    }
    return Array.from(seen.values()).sort((m, n) => n.year - m.year || n.month - m.month);
  };
  const allowed = allowedCountries.map(c => c.trim().toLowerCase());
  const byCountry = new Map<string, { country: string; universities: any[] }>();
  for (const u of universities) {
    // A university without a country is still listed (under "Other") unless the partner is limited to specific countries.
    const country = (u.country || '').trim() || NO_COUNTRY;
    const key = country.toLowerCase();
    if (allowed.length > 0 && !allowed.includes(key)) continue;
    if (!byCountry.has(key)) byCountry.set(key, { country, universities: [] });
    const { country: _c, ...rest } = u;
    byCountry.get(key)!.universities.push({ ...rest, programs: rest.programs.map(p => ({ ...p, intakes: intakesFor(u.id, p.id) })) });
  }
  // Search Programs also lists the organization's own countries that no university uses yet (shown with 0 programs).
  if (includeEmpty && allowed.length === 0) {
    const known = await prisma.country.findMany({ where: { organizationId }, select: { name: true } });
    for (const k of known) {
      const key = k.name.trim().toLowerCase();
      if (key && !byCountry.has(key)) byCountry.set(key, { country: k.name.trim(), universities: [] });
    }
  }
  return Array.from(byCountry.values()).sort((a, b) =>
    a.country === NO_COUNTRY ? 1 : b.country === NO_COUNTRY ? -1 : a.country.localeCompare(b.country));
};

export const getMyCatalog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partnerId = await myPartnerId(req, res);
  const partner = await findPartner(req, res, partnerId);
  // The partner's destination countries do not limit what is listed.
  res.json({ success: true, data: await buildCatalog(req.user.organizationId, [], true) });
});

// ─── student verification (used by the apply wizard) ───────────────────────

/**
 * Same uniqueness rules as every other enrollment: the email and phone must not belong to an existing
 * student, staff account or active enrollment anywhere in the system.
 */
const uniqueness = async (organizationId: string, email?: string, phone?: string) => {
  const r = await checkStudentOrEnrollmentExists({ email, phone, organizationId });
  if (r.isUnique) return { state: 'new' as const, message: '' };
  // Only another application counts as "in progress"; an existing student or staff account is "registered".
  const inProgress = r.conflictEntity === 'enrollment';
  return {
    state: (inProgress ? 'in_progress' : 'registered') as 'in_progress' | 'registered',
    message: inProgress
      ? 'This student already has an application in progress, so a new application cannot be started.'
      : (r.message || 'This email or phone number is already registered in the system.'),
  };
};

/** Step 1 of the wizard: phone and email are each checked as the partner types. */
export const verifyStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  await myPartnerId(req, res);
  const email = str(req.body.studentEmail, 200)?.toLowerCase();
  const phone = str(req.body.studentPhone, 40);
  if (!email && !phone) return fail(res, 400, 'Enter a phone number or an email to verify');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'A valid email is required');
  if (phone && phone.replace(/\D/g, '').length < 7) return fail(res, 400, 'A valid phone number is required');

  const orgId = req.user.organizationId;
  const phoneRes = phone ? await uniqueness(orgId, undefined, phone) : undefined;
  const emailRes = email ? await uniqueness(orgId, email, undefined) : undefined;
  const blocked = [phoneRes, emailRes].find(r => r && r.state !== 'new');
  res.json({
    success: true,
    data: {
      status: blocked ? blocked.state : 'new',
      message: blocked ? blocked.message : 'No earlier record found for this student. You can continue.',
      phone: phoneRes?.state, email: emailRes?.state,
    },
  });
});
