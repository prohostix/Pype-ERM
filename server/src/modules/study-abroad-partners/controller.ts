/**
 * Study Abroad Partners — external overseas-education partners who submit student
 * applications to the organization.
 *
 * Partners are created by the org admin and are active immediately; the generated login is
 * shown once and emailed. active ⇄ suspended.
 *
 * Applications are core Enrollment rows tagged source = "study_abroad" (see the applications
 * section below). Lifecycle (Enrollment.status):
 *   document_review → (Operations approves) → finance_review → (Finance approves) → enrolled
 *   Operations rejects → ops_rejected, Finance rejects → rejected; the partner fixes and resubmits.
 */
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../../utils/authUtils.js';
import { notifyStaff } from './notify.js';
import { checkStudentOrEnrollmentExists } from '../../utils/studentValidation.js';
import { enqueueNotification } from '../../utils/notificationQueue.js';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Marks an Enrollment as a Study Abroad application. */
export const STUDY_ABROAD_SOURCE = 'study_abroad';

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

/** Application totals per partner, counted from the (tagged) Enrollment rows. */
const applicationCounts = async (organizationId: string, partnerIds: string[]): Promise<Record<string, number>> => {
  if (partnerIds.length === 0) return {};
  const rows = await prisma.enrollment.groupBy({
    by: ['studyAbroadPartnerId'],
    where: { organizationId, source: STUDY_ABROAD_SOURCE, studyAbroadPartnerId: { in: partnerIds } },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map(r => [r.studyAbroadPartnerId as string, r._count._all]));
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
  const grouped = await prisma.enrollment.groupBy({
    by: ['status'], where: { organizationId: req.user.organizationId, source: STUDY_ABROAD_SOURCE, studyAbroadPartnerId: partnerId }, _count: { _all: true },
  });
  // Core statuses → the names the portal uses
  const counts: Record<string, number> = {};
  for (const g of grouped) {
    const k = g.status === 'rejected' ? 'finance_rejected' : g.status === 'department_rejected' ? 'ops_rejected' : g.status;
    counts[k] = (counts[k] || 0) + g._count._all;
  }
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

// ─── applications (stored as core Enrollment rows tagged source = "study_abroad") ─────────────
//
// A Study Abroad application is an Enrollment with source "study_abroad" and the partner's id. It has no Student or User
// row until Finance approves it; approval then creates the student's portal login like any other enrollment, and the
// partner's payment receipt becomes the invoice. Operations and Finance review it in the normal Enrollment screens.

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** An uploaded file reference: only our own /uploads path or an http(s) URL is accepted. */
function fileRef(v: unknown): string | undefined {
  const u = str(v, 500);
  return u && (u.startsWith('/uploads/') || /^https?:\/\//i.test(u)) ? u : undefined;
}

/** Documents the wizard uploaded ahead of submitting — same shape Direct Enrollment stores. */
const parseDocuments = (raw: unknown) => {
  let list: any = raw;
  if (typeof raw === 'string') { try { list = JSON.parse(raw); } catch { list = []; } }
  if (!Array.isArray(list)) return [];
  return list.slice(0, 30).flatMap((d: any) => {
    const url = fileRef(d?.url);
    if (!url) return [];
    return [{ type: str(d.type, 60) || 'Other', url, label: str(d.label, 100), status: 'pending' }];
  });
};

/** What the partner portal shows for an Enrollment (kept in the shape the portal pages already use). */
const PORTAL_INCLUDE = { program: { include: { university: true } }, session: true } as const;
const toPortal = (e: any) => {
  const status = e.status === 'rejected' || e.status === 'department_rejected'
    ? (e.status === 'rejected' ? 'finance_rejected' : 'ops_rejected') : e.status;
  const start: Date | undefined = e.session?.startDate;
  const docs = (Array.isArray(e.documents) ? e.documents : []).map((d: any) => ({ ...d, name: d.label || d.name || d.type }));
  return {
    id: e.id,
    status,
    studentName: e.studentName, studentEmail: e.studentEmail, studentPhone: e.studentPhone,
    studentAddress: e.studentAddress === 'Pending' ? null : e.studentAddress,
    dateOfBirth: e.dob,
    destinationCountry: e.program?.university?.country || NO_COUNTRY,
    universityName: e.program?.university?.name || '',
    courseName: e.specialisation ? `${e.program?.name} - ${e.specialisation}` : e.program?.name,
    intake: start ? MONTH_NAMES[start.getUTCMonth()] : 'Not specified',
    intakeYear: start ? start.getUTCFullYear() : null,
    opsRemarks: e.departmentRemarks, financeRemarks: e.financeRemarks,
    financeReviewedAt: e.financeReviewedAt, createdAt: e.createdAt,
    photoStatus: e.photoStatus,
    receiptUrl: e.receiptUrl, initialPaymentAmount: e.initialPaymentAmount, initialPaymentDate: e.initialPaymentDate,
    documents: docs,
    studentDetails: {
      gender: e.gender, altPhone: e.altPhone, religion: e.religion, caste: e.caste, fatherName: e.fatherName,
      fatherPhone: e.fatherPhone, motherName: e.motherName, motherPhone: e.motherPhone, pinCode: e.pinCode,
      session: e.session?.name, photo: e.photo,
    },
  };
};

const pushStatus = (history: unknown, status: string, by: string, name: string, role: string, note: string) => ([
  ...(Array.isArray(history) ? history : []),
  { status, changedAt: new Date().toISOString(), changedBy: by, actorName: name, actorRole: role, note },
]);

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

export const createMyEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partnerId = await myPartnerId(req, res);
  const partner = await findPartner(req, res, partnerId);
  if (partner.status !== 'active') return fail(res, 403, 'Your account must be active to submit applications');
  const b = req.body || {};

  const studentName = str(b.studentName, 200);
  const studentEmail = str(b.studentEmail, 200)?.toLowerCase();
  const studentPhone = str(b.studentPhone, 40);
  const programId = str(b.programId, 100);
  if (!studentName || !studentEmail || !studentPhone || !programId) {
    return fail(res, 400, 'studentName, studentEmail, studentPhone and programId are required');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) return fail(res, 400, 'A valid email is required');
  const dob = b.dob ? new Date(b.dob) : undefined;
  if (dob && Number.isNaN(dob.getTime())) return fail(res, 400, 'dob is not a valid date');

  const orgId = req.user.organizationId;
  const program = await prisma.program.findFirst({
    where: { id: programId, organizationId: orgId, status: 'active', university: { isAcademicPartnerOnly: false } },
    select: { id: true, universityId: true, specialisations: true },
  });
  if (!program) return fail(res, 400, 'This program is not available');

  const specialisation = str(b.specialisation, 100);
  if (program.specialisations.length > 0 && (!specialisation || !program.specialisations.includes(specialisation))) {
    return fail(res, 400, 'Please choose one of the program’s specialisations');
  }
  const sessionId = str(b.sessionId, 100);
  if (sessionId) {
    const ok = await prisma.admissionSession.findFirst({
      where: { id: sessionId, organizationId: orgId, universityId: program.universityId, OR: [{ programId: null }, { programId: program.id }] },
      select: { id: true },
    });
    if (!ok) return fail(res, 400, 'This session is not available for the chosen program');
  }

  // The payment to the organization is part of the application: amount, date and a receipt are required.
  const paidAmount = Number(b.initialPaymentAmount);
  const paidDate = b.initialPaymentDate ? new Date(b.initialPaymentDate) : undefined;
  const receiptUrl = fileRef(b.receiptUrl);
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) return fail(res, 400, 'Enter the amount paid');
  if (!paidDate || Number.isNaN(paidDate.getTime())) return fail(res, 400, 'Enter the payment date');
  if (!receiptUrl) return fail(res, 400, 'Upload the payment receipt');

  const u = await uniqueness(orgId, studentEmail, studentPhone);
  if (u.state !== 'new') return fail(res, 409, u.message);

  const enrollment = await prisma.enrollment.create({
    data: {
      organizationId: orgId,
      programId: program.id,
      specialisation: specialisation || null,
      sessionId: sessionId || null,
      studentName, studentEmail, studentPhone,
      studentAddress: str(b.studentAddress, 500) || 'Pending',
      dob,
      gender: str(b.gender, 20), caste: str(b.caste, 40), religion: str(b.religion, 60),
      fatherName: str(b.fatherName, 200), fatherPhone: str(b.fatherPhone, 40),
      motherName: str(b.motherName, 200), motherPhone: str(b.motherPhone, 40),
      altPhone: str(b.altPhone, 40), pinCode: str(b.pinCode, 20),
      photo: fileRef(b.photo),
      documents: parseDocuments(b.documents),
      initialPaymentAmount: paidAmount, initialPaymentDate: paidDate, receiptUrl,
      status: 'document_review',
      source: STUDY_ABROAD_SOURCE,
      studyAbroadPartnerId: partnerId,
      statusHistory: pushStatus([], 'document_review', req.user.id, req.user.name, req.user.role, `Submitted by study abroad partner ${partner.name}`),
    },
    include: PORTAL_INCLUDE,
  });
  res.status(201).json({ success: true, data: toPortal(enrollment) });
});

export const getMyEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partnerId = await myPartnerId(req, res);
  const rows = await prisma.enrollment.findMany({
    where: { organizationId: req.user.organizationId, source: STUDY_ABROAD_SOURCE, studyAbroadPartnerId: partnerId },
    include: PORTAL_INCLUDE, orderBy: { createdAt: 'desc' }, take: 500,
  });
  res.json({ success: true, count: rows.length, data: rows.map(toPortal) });
});

const findMine = async (req: AuthRequest, res: Response) => {
  const partnerId = await myPartnerId(req, res);
  const e = await prisma.enrollment.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId, source: STUDY_ABROAD_SOURCE, studyAbroadPartnerId: partnerId },
  });
  if (!e) return fail(res, 404, 'Application not found');
  return e;
};

export const uploadEnrollmentDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const e = await findMine(req, res);
  const files = (req.files as any[]) || [];
  if (files.length === 0) return fail(res, 400, 'No documents uploaded');
  if (!['document_review', 'ops_rejected', 'rejected', 'department_rejected'].includes(e.status)) {
    return fail(res, 409, 'Documents can no longer be changed for this application');
  }
  const existing = Array.isArray(e.documents) ? (e.documents as any[]) : [];
  const type = str(req.body.type, 60) || 'Other';
  const added = files.map(f => ({ type, url: fileUrl(f), label: f.originalname, status: 'pending' }));
  const updated = await prisma.enrollment.update({ where: { id: e.id }, data: { documents: [...existing, ...added] }, include: PORTAL_INCLUDE });
  res.status(201).json({ success: true, data: toPortal(updated) });
});

/** Resubmit a rejected application; it returns to the stage that rejected it. */
export const resubmitMyEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const e = await findMine(req, res);
  const next = (e.status === 'ops_rejected' || e.status === 'department_rejected') ? 'document_review'
    : e.status === 'rejected' ? 'finance_review' : null;
  if (!next) return fail(res, 409, 'Only rejected applications can be resubmitted');
  if (next === 'document_review') {
    const stillRejected = ((Array.isArray(e.documents) ? e.documents : []) as any[]).some(d => d?.status === 'rejected') || e.photoStatus === 'rejected';
    if (stillRejected) return fail(res, 409, 'Replace the rejected documents before resubmitting');
  }
  const { count } = await prisma.enrollment.updateMany({
    where: { id: e.id, status: e.status },
    data: {
      status: next,
      statusHistory: pushStatus(e.statusHistory, next, req.user.id, req.user.name, req.user.role, str(req.body.remarks) || 'Resubmitted by partner') as any,
    },
  });
  if (count === 0) return fail(res, 409, 'Application was updated by someone else. Please refresh.');
  res.json({ success: true, data: toPortal(await prisma.enrollment.findUnique({ where: { id: e.id }, include: PORTAL_INCLUDE })) });
});

// ─── re-upload after a rejection (Academic Partner style) ───────────────────
//
// Operations can reject one document (or the photo) without rejecting the whole application; Finance can reject the receipt.
// The partner replaces just that item; accepted ones are left alone.

const DOC_EDITABLE = ['document_review', 'ops_rejected', 'department_rejected'];
const RECEIPT_EDITABLE = ['document_review', 'finance_review', 'rejected'];

const anyRejected = (e: { documents: unknown; photoStatus?: string | null }) =>
  ((Array.isArray(e.documents) ? e.documents : []) as any[]).some(d => d?.status === 'rejected') || e.photoStatus === 'rejected';

/** After a replacement: an Operations-rejected application with nothing left to fix goes back to Operations. */
const returnToOperations = async (req: AuthRequest, e: any, data: Record<string, unknown>, note: string) => {
  const nowRejected = anyRejected({ documents: data.documents ?? e.documents, photoStatus: (data.photoStatus as string | undefined) ?? e.photoStatus });
  const back = (e.status === 'ops_rejected' || e.status === 'department_rejected') && !nowRejected;
  return prisma.enrollment.update({
    where: { id: e.id },
    data: {
      ...data,
      ...(back ? { status: 'document_review', statusHistory: pushStatus(e.statusHistory, 'document_review', req.user.id, req.user.name, req.user.role, note) as any } : {}),
    },
    include: PORTAL_INCLUDE,
  });
};

/** Replace one rejected (or any) document. Body: { url } of the already-uploaded file. */
export const replaceDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const e = await findMine(req, res);
  if (!DOC_EDITABLE.includes(e.status)) return fail(res, 409, 'Documents can no longer be changed for this application');
  const docs = (Array.isArray(e.documents) ? e.documents : []) as any[];
  const index = Number.parseInt(req.params.index, 10);
  if (!Number.isInteger(index) || index < 0 || index >= docs.length) return fail(res, 400, 'Invalid document');
  const url = fileRef(req.body?.url);
  if (!url) return fail(res, 400, 'Upload the new file first');
  const wasRejected = docs[index].status === 'rejected';
  docs[index] = { ...docs[index], url, status: 'pending', remarks: undefined, replacedAt: new Date().toISOString() };
  const updated = await returnToOperations(req, e, { documents: docs }, 'Partner replaced the rejected documents');
  if (wasRejected) {
    await notifyStaff(e.organizationId, ['ops_admin', 'ops_sub_admin'], 'Document re-uploaded',
      `${e.studentName}: a rejected ${docs[index].label || docs[index].type || 'document'} was replaced and is ready to review again.`, 'enrollment_review');
  }
  res.json({ success: true, data: toPortal(updated) });
});

/** Replace the student's photo. Body: { url }. */
export const replacePhoto = asyncHandler(async (req: AuthRequest, res: Response) => {
  const e = await findMine(req, res);
  if (!DOC_EDITABLE.includes(e.status)) return fail(res, 409, 'The photo can no longer be changed for this application');
  const url = fileRef(req.body?.url);
  if (!url) return fail(res, 400, 'Upload the new photo first');
  const wasRejected = e.photoStatus === 'rejected';
  const updated = await returnToOperations(req, e, { photo: url, photoStatus: 'pending' }, 'Partner replaced the rejected photo');
  if (wasRejected) {
    await notifyStaff(e.organizationId, ['ops_admin', 'ops_sub_admin'], 'Photo re-uploaded', `${e.studentName}: the rejected photo was replaced and is ready to review again.`, 'enrollment_review');
  }
  res.json({ success: true, data: toPortal(updated) });
});

/** Replace the payment receipt (and optionally the amount / date). Body: { url, amount?, date? }. */
export const replaceReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
  const e = await findMine(req, res);
  if (!RECEIPT_EDITABLE.includes(e.status)) return fail(res, 409, 'The receipt can no longer be changed for this application');
  const url = fileRef(req.body?.url);
  if (!url) return fail(res, 400, 'Upload the new receipt first');
  const data: Record<string, unknown> = { receiptUrl: url };
  if (req.body?.amount !== undefined && req.body.amount !== '') {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return fail(res, 400, 'Enter a valid amount');
    data.initialPaymentAmount = amount;
  }
  if (req.body?.date) {
    const d = new Date(req.body.date);
    if (Number.isNaN(d.getTime())) return fail(res, 400, 'Enter a valid payment date');
    data.initialPaymentDate = d;
  }
  const financeRejected = e.status === 'rejected';
  const updated = await prisma.enrollment.update({
    where: { id: e.id },
    data: {
      ...data,
      ...(financeRejected ? { status: 'finance_review', statusHistory: pushStatus(e.statusHistory, 'finance_review', req.user.id, req.user.name, req.user.role, 'Partner re-uploaded the payment receipt') as any } : {}),
    },
    include: PORTAL_INCLUDE,
  });
  if (financeRejected || e.status === 'finance_review') {
    await notifyStaff(e.organizationId, ['finance_admin', 'finance_sub_admin'], 'Payment receipt updated',
      `${e.studentName}: the payment receipt was replaced and is ready to verify.`, 'enrollments_finance');
  }
  res.json({ success: true, data: toPortal(updated) });
});
