/**
 * Study Abroad applications — the partner's end-to-end journey for one student.
 *
 *   application → interview → offer → payment → visa_documents → visa_decision → enrolled → commission_released
 *
 * Independent of the core Enrollment / Operations / Finance review flow. The only point where it touches the
 * rest of the system is stage "enrolled", when the Student (and portal login) is created after the visa is approved.
 * Staff steps are performed by the organization admin.
 */
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../../utils/authUtils.js';
import { enqueueNotification } from '../../utils/notificationQueue.js';
import { checkStudentOrEnrollmentExists } from '../../utils/studentValidation.js';
import { notifyStaff } from './notify.js';
import { calcCommission, formRules, isTerminal, missingDocuments, STAGE_LABELS, type CommissionTerms } from './pipeline.js';

// ─── helpers ────────────────────────────────────────────────────────────────

const fail = (res: Response, status: number, message: string): never => { res.status(status); throw new Error(message); };

const str = (v: unknown, max = 500): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
};

/** An uploaded file reference: only our own /uploads path or an http(s) URL is accepted. */
const fileRef = (v: unknown): string | undefined => {
  const u = str(v, 500);
  return u && (u.startsWith('/uploads/') || /^https?:\/\//i.test(u)) ? u : undefined;
};

const parseDocs = (raw: unknown, max = 30) => {
  let list: any = raw;
  if (typeof raw === 'string') { try { list = JSON.parse(raw); } catch { list = []; } }
  if (!Array.isArray(list)) return [];
  return list.slice(0, max).flatMap((d: any) => {
    const url = fileRef(d?.url);
    return url ? [{ type: str(d.type, 60) || 'Other', url, label: str(d.label, 100), status: 'pending' }] : [];
  });
};

const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {});
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

type App = NonNullable<Awaited<ReturnType<typeof prisma.studyAbroadApplication.findFirst>>>;

const actor = (req: AuthRequest) => ({ id: req.user.id, name: req.user.name, role: req.user.role });

/**
 * Apply a change guarded by the stage and version we read, so two people acting at once cannot both win.
 * `stageKey` / `patch` update that stage's data; `to` moves the application to another stage.
 */
const apply = async (
  req: AuthRequest, res: Response, app: App,
  change: { to?: string; stageKey?: string; patch?: Record<string, any>; note: string; data?: Record<string, any> },
): Promise<App> => {
  const stageData = obj(app.stageData);
  if (change.stageKey) stageData[change.stageKey] = { ...obj(stageData[change.stageKey]), ...change.patch, updatedAt: new Date().toISOString() };
  const to = change.to ?? app.stage;
  const history = [
    ...(Array.isArray(app.stageHistory) ? app.stageHistory as any[] : []),
    { stage: to, changedAt: new Date().toISOString(), by: actor(req).id, actorName: actor(req).name, actorRole: actor(req).role, note: change.note },
  ];
  const { count } = await prisma.studyAbroadApplication.updateMany({
    where: { id: app.id, stage: app.stage, updatedAt: app.updatedAt },
    data: { stage: to, stageData, stageHistory: history, ...(change.data || {}) },
  });
  if (count === 0) return fail(res, 409, 'This application was updated by someone else. Please refresh.');
  return (await prisma.studyAbroadApplication.findUnique({ where: { id: app.id } }))!;
};

/** Tell the partner's admin user something happened to one of their applications. */
const notifyPartner = async (app: Pick<App, 'organizationId' | 'partnerId' | 'studentName'>, title: string, message: string) => {
  try {
    const partner = await prisma.studyAbroadPartner.findUnique({ where: { id: app.partnerId }, select: { adminUserId: true } });
    if (!partner?.adminUserId) return;
    await prisma.notification.create({
      data: { organizationId: app.organizationId, userId: partner.adminUserId, title, message: message.replace('{student}', app.studentName), type: 'general', priority: 'medium', link: 'applications' },
    });
  } catch { /* notifications must never block the pipeline */ }
};

const notifyOrgAdmins = (app: Pick<App, 'organizationId' | 'studentName'>, title: string, message: string) =>
  notifyStaff(app.organizationId, ['org_admin'], title, message.replace('{student}', app.studentName), 'study_abroad_partners');

const myPartnerId = async (req: AuthRequest, res: Response): Promise<string> => {
  const partner = await prisma.studyAbroadPartner.findFirst({
    where: { adminUserId: req.user?.id, organizationId: req.user?.organizationId }, select: { id: true },
  });
  if (!partner) return fail(res, 403, 'No study abroad partner is linked to this account');
  return partner.id;
};

const loadStaff = async (req: AuthRequest, res: Response): Promise<App> => {
  const app = await prisma.studyAbroadApplication.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  return app ?? fail(res, 404, 'Application not found');
};

const loadMine = async (req: AuthRequest, res: Response): Promise<App> => {
  const partnerId = await myPartnerId(req, res);
  const app = await prisma.studyAbroadApplication.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId, partnerId } });
  return app ?? fail(res, 404, 'Application not found');
};

const requireStage = (res: Response, app: App, stage: string, what: string) => {
  if (app.stage !== stage) fail(res, 409, `${what} is not possible at the "${STAGE_LABELS[app.stage] || app.stage}" stage`);
};

/** Add program / university / partner names for display. */
const decorate = async (rows: App[]) => {
  const programIds = Array.from(new Set(rows.map(r => r.programId)));
  const partnerIds = Array.from(new Set(rows.map(r => r.partnerId)));
  const [programs, partners] = await Promise.all([
    programIds.length ? prisma.program.findMany({ where: { id: { in: programIds } }, select: { id: true, name: true, university: { select: { id: true, name: true, country: true } } } }) : [],
    partnerIds.length ? prisma.studyAbroadPartner.findMany({ where: { id: { in: partnerIds } }, select: { id: true, name: true, code: true } }) : [],
  ]);
  const pm = new Map(programs.map(p => [p.id, p]));
  const tm = new Map(partners.map(p => [p.id, p]));
  return rows.map(r => ({
    ...r,
    stageLabel: STAGE_LABELS[r.stage] || r.stage,
    programName: pm.get(r.programId)?.name || '',
    universityName: pm.get(r.programId)?.university?.name || '',
    country: pm.get(r.programId)?.university?.country || '',
    partnerName: tm.get(r.partnerId)?.name || '',
    partnerCode: tm.get(r.partnerId)?.code || '',
  }));
};

// ─── partner: submit and track ──────────────────────────────────────────────

const DETAIL_FIELDS = ['studentAddress', 'dob', 'gender', 'caste', 'religion', 'fatherName', 'fatherPhone', 'motherName', 'motherPhone', 'altPhone', 'pinCode', 'photo'] as const;
// university form-rule key → the application field that carries it
const RULE_TO_FIELD: Record<string, string> = {
  email: 'studentEmail', dob: 'dob', address: 'studentAddress', pinCode: 'pinCode', altPhone: 'altPhone', religion: 'religion',
  caste: 'caste', fatherName: 'fatherName', fatherPhone: 'fatherPhone', motherName: 'motherName', motherPhone: 'motherPhone', photo: 'photo',
};

export const createMyApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partnerId = await myPartnerId(req, res);
  const partner = await prisma.studyAbroadPartner.findFirst({ where: { id: partnerId, organizationId: req.user.organizationId } });
  if (!partner) return fail(res, 404, 'Study abroad partner not found');
  if (partner.status !== 'active') return fail(res, 403, 'Your account must be active to submit applications');
  const b = req.body || {};
  const orgId = req.user.organizationId;

  const studentName = str(b.studentName, 200);
  const studentEmail = str(b.studentEmail, 200)?.toLowerCase();
  const studentPhone = str(b.studentPhone, 40);
  const programId = str(b.programId, 100);
  if (!studentName || !studentEmail || !studentPhone || !programId) return fail(res, 400, 'studentName, studentEmail, studentPhone and programId are required');
  if (!isEmail(studentEmail)) return fail(res, 400, 'A valid email is required');
  if (b.dob && Number.isNaN(new Date(b.dob).getTime())) return fail(res, 400, 'dob is not a valid date');

  const program = await prisma.program.findFirst({
    where: { id: programId, organizationId: orgId, status: 'active', university: { isAcademicPartnerOnly: false } },
    select: { id: true, universityId: true, specialisations: true, university: { select: { enrollmentFormConfig: true } } },
  });
  if (!program) return fail(res, 400, 'This program is not available');
  const specialisation = str(b.specialisation, 100);
  if (program.specialisations.length > 0 && (!specialisation || !program.specialisations.includes(specialisation))) {
    return fail(res, 400, 'Please choose one of the program’s specialisations');
  }
  const sessionId = str(b.sessionId, 100);
  if (sessionId) {
    const ok = await prisma.admissionSession.findFirst({
      where: { id: sessionId, organizationId: orgId, universityId: program.universityId, OR: [{ programId: null }, { programId: program.id }] }, select: { id: true },
    });
    if (!ok) return fail(res, 400, 'This session is not available for the chosen program');
  }

  const details: Record<string, any> = {};
  for (const k of DETAIL_FIELDS) { const v = str(b[k], 500); if (v) details[k] = v; }
  const documents = parseDocs(b.documents);

  // The university's own form rules, enforced here as well as in the wizard.
  const rules = formRules(program.university?.enrollmentFormConfig);
  const values: Record<string, any> = { studentEmail, ...details };
  const missingFields = rules.requiredFields.filter(f => RULE_TO_FIELD[f] && !values[RULE_TO_FIELD[f]]);
  if (missingFields.length) return fail(res, 400, `Missing required fields: ${missingFields.join(', ')}`);
  const missingDocs = missingDocuments(rules.requiredDocuments, documents);
  if (missingDocs.length) return fail(res, 400, `Missing required documents: ${missingDocs.join(', ')}`);

  const u = await checkStudentOrEnrollmentExists({ email: studentEmail, phone: studentPhone, organizationId: orgId });
  if (!u.isUnique) return fail(res, 409, u.message || 'This student is already registered or has an application in progress.');
  const open = await prisma.studyAbroadApplication.findFirst({
    where: { organizationId: orgId, studentEmail: { equals: studentEmail, mode: 'insensitive' }, stage: { notIn: ['withdrawn', 'interview_failed', 'offer_declined', 'visa_refused'] } },
    select: { id: true },
  });
  if (open) return fail(res, 409, 'This student already has a study abroad application in progress.');

  const app = await prisma.studyAbroadApplication.create({
    data: {
      organizationId: orgId, partnerId, studentName, studentEmail, studentPhone,
      programId: program.id, universityId: program.universityId, sessionId: sessionId || null, specialisation: specialisation || null,
      details, documents,
      stageData: { application: { status: 'pending' } },
      stageHistory: [{ stage: 'application', changedAt: new Date().toISOString(), by: req.user.id, actorName: req.user.name, actorRole: req.user.role, note: `Submitted by ${partner.name}` }],
    },
  });
  await notifyOrgAdmins(app, 'New study abroad application', `${studentName} was submitted by ${partner.name}. Review the documents.`);
  res.status(201).json({ success: true, data: (await decorate([app]))[0] });
});

export const listMyApplications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partnerId = await myPartnerId(req, res);
  const rows = await prisma.studyAbroadApplication.findMany({
    where: { organizationId: req.user.organizationId, partnerId }, orderBy: { createdAt: 'desc' }, take: 500,
  });
  res.json({ success: true, count: rows.length, data: await decorate(rows) });
});

export const getMyApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: (await decorate([await loadMine(req, res)]))[0] });
});

/** Replace the application documents after a rejection (or add missing ones before review). */
export const updateMyDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const app = await loadMine(req, res);
  requireStage(res, app, 'application', 'Changing documents');
  if (obj(obj(app.stageData).application).status === 'approved') return fail(res, 409, 'Documents were already approved');
  const documents = parseDocs(req.body?.documents);
  if (documents.length === 0) return fail(res, 400, 'Upload at least one document');
  const program = await prisma.program.findUnique({ where: { id: app.programId }, select: { university: { select: { enrollmentFormConfig: true } } } });
  const missing = missingDocuments(formRules(program?.university?.enrollmentFormConfig).requiredDocuments, documents);
  if (missing.length) return fail(res, 400, `Missing required documents: ${missing.join(', ')}`);
  const updated = await apply(req, res, app, { stageKey: 'application', patch: { status: 'pending', remarks: null }, note: 'Partner updated the documents', data: { documents } });
  await notifyOrgAdmins(app, 'Documents resubmitted', '{student}: documents were updated and need review.');
  res.json({ success: true, data: (await decorate([updated]))[0] });
});

export const respondToOffer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const app = await loadMine(req, res);
  requireStage(res, app, 'offer', 'Responding to an offer');
  if (obj(obj(app.stageData).offer).status !== 'issued') return fail(res, 409, 'There is no offer to respond to yet');
  const accept = req.body?.accept === true;
  const updated = accept
    ? await apply(req, res, app, { to: 'payment', stageKey: 'offer', patch: { status: 'accepted', respondedAt: new Date().toISOString() }, note: 'Offer accepted' })
    : await apply(req, res, app, { to: 'offer_declined', stageKey: 'offer', patch: { status: 'declined', respondedAt: new Date().toISOString() }, note: str(req.body?.remarks) || 'Offer declined', data: { commissionStatus: 'void' } });
  await notifyOrgAdmins(app, accept ? 'Offer accepted' : 'Offer declined', `{student}: the partner ${accept ? 'accepted' : 'declined'} the offer.`);
  res.json({ success: true, data: (await decorate([updated]))[0] });
});

export const submitPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const app = await loadMine(req, res);
  requireStage(res, app, 'payment', 'Submitting payment');
  if (obj(obj(app.stageData).payment).status === 'verified') return fail(res, 409, 'Payment was already verified');
  const amount = Number(req.body?.amount);
  const date = req.body?.date ? new Date(req.body.date) : undefined;
  const receiptUrl = fileRef(req.body?.receiptUrl);
  if (!Number.isFinite(amount) || amount <= 0) return fail(res, 400, 'Enter the amount paid');
  if (!date || Number.isNaN(date.getTime())) return fail(res, 400, 'Enter the payment date');
  if (!receiptUrl) return fail(res, 400, 'Upload the payment receipt');
  const updated = await apply(req, res, app, {
    stageKey: 'payment', patch: { status: 'submitted', amount, date: date.toISOString(), receiptUrl, notes: str(req.body?.notes), remarks: null }, note: 'Payment submitted',
  });
  await notifyOrgAdmins(app, 'Payment submitted', '{student}: a payment receipt is ready to verify.');
  res.json({ success: true, data: (await decorate([updated]))[0] });
});

export const submitVisaDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const app = await loadMine(req, res);
  requireStage(res, app, 'visa_documents', 'Submitting visa documents');
  if (obj(obj(app.stageData).visaDocuments).status === 'approved') return fail(res, 409, 'Visa documents were already approved');
  const documents = parseDocs(req.body?.documents);
  if (documents.length === 0) return fail(res, 400, 'Upload at least one visa document');
  const updated = await apply(req, res, app, { stageKey: 'visaDocuments', patch: { status: 'submitted', documents, remarks: null }, note: 'Visa documents submitted' });
  await notifyOrgAdmins(app, 'Visa documents submitted', '{student}: visa documents are ready to verify.');
  res.json({ success: true, data: (await decorate([updated]))[0] });
});

/** The partner (or the org admin) ends a journey that has not enrolled yet. */
const withdrawWith = async (req: AuthRequest, res: Response, app: App) => {
  if (isTerminal(app.stage) || ['enrolled', 'commission_released'].includes(app.stage)) return fail(res, 409, 'This application can no longer be withdrawn');
  return apply(req, res, app, { to: 'withdrawn', note: str(req.body?.remarks) || 'Withdrawn', data: { commissionStatus: 'void' } });
};
export const withdrawMine = asyncHandler(async (req: AuthRequest, res: Response) => {
  const app = await loadMine(req, res);
  const updated = await withdrawWith(req, res, app);
  await notifyOrgAdmins(app, 'Application withdrawn', '{student}: the partner withdrew this application.');
  res.json({ success: true, data: (await decorate([updated]))[0] });
});

// ─── org admin: the pipeline ────────────────────────────────────────────────

export const listApplications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  if (typeof req.query.stage === 'string' && req.query.stage) where.stage = req.query.stage;
  if (typeof req.query.partnerId === 'string' && req.query.partnerId) where.partnerId = req.query.partnerId;
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const q = req.query.q.trim();
    where.OR = [{ studentName: { contains: q, mode: 'insensitive' } }, { studentEmail: { contains: q, mode: 'insensitive' } }];
  }
  const rows = await prisma.studyAbroadApplication.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 500 });
  const grouped = await prisma.studyAbroadApplication.groupBy({ by: ['stage'], where: { organizationId: req.user.organizationId }, _count: { _all: true } });
  res.json({ success: true, count: rows.length, counts: Object.fromEntries(grouped.map(g => [g.stage, g._count._all])), data: await decorate(rows) });
});

export const getApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: (await decorate([await loadStaff(req, res)]))[0] });
});

/** Stage 1: approve or reject the submitted documents. */
export const reviewApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
  const app = await loadStaff(req, res);
  requireStage(res, app, 'application', 'Reviewing documents');
  const remarks = str(req.body?.remarks, 1000);
  if (req.body?.approve === true) {
    const updated = await apply(req, res, app, { to: 'interview', stageKey: 'application', patch: { status: 'approved', remarks, reviewedBy: req.user.id }, note: 'Documents approved' });
    await notifyPartner(app, 'Documents approved', '{student}\'s documents were approved. The application moved to the interview stage.');
    return void res.json({ success: true, data: (await decorate([updated]))[0] });
  }
  if (!remarks) return fail(res, 400, 'Enter the reason for rejecting');
  const updated = await apply(req, res, app, { stageKey: 'application', patch: { status: 'rejected', remarks, reviewedBy: req.user.id }, note: `Documents rejected: ${remarks}` });
  await notifyPartner(app, 'Documents rejected', `{student}'s documents were rejected. Reason: ${remarks}. Please fix them and resubmit.`);
  res.json({ success: true, data: (await decorate([updated]))[0] });
});

/** Stage 2: not required / schedule / record the result. */
export const updateInterview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const app = await loadStaff(req, res);
  requireStage(res, app, 'interview', 'Updating the interview');
  const b = req.body || {};
  if (b.required === false) {
    const updated = await apply(req, res, app, { to: 'offer', stageKey: 'interview', patch: { required: false, status: 'skipped' }, note: 'No interview required' });
    await notifyPartner(app, 'Interview not required', '{student}: no interview is needed. Waiting for the offer.');
    return void res.json({ success: true, data: (await decorate([updated]))[0] });
  }
  const scheduledAt = b.scheduledAt ? new Date(b.scheduledAt) : undefined;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) return fail(res, 400, 'Enter a valid interview date');
  const result = ['passed', 'failed'].includes(b.result) ? b.result : 'pending';
  if (result === 'pending' && !scheduledAt) return fail(res, 400, 'Schedule the interview or record its result');
  const patch = { required: true, status: result === 'pending' ? 'scheduled' : result, scheduledAt: scheduledAt?.toISOString(), mode: str(b.mode, 40), link: str(b.link, 500), remarks: str(b.remarks, 1000) };
  if (result === 'passed') {
    const updated = await apply(req, res, app, { to: 'offer', stageKey: 'interview', patch, note: 'Interview cleared' });
    await notifyPartner(app, 'Interview cleared', '{student} cleared the interview. Waiting for the offer.');
    return void res.json({ success: true, data: (await decorate([updated]))[0] });
  }
  if (result === 'failed') {
    const updated = await apply(req, res, app, { to: 'interview_failed', stageKey: 'interview', patch, note: 'Interview not cleared', data: { commissionStatus: 'void' } });
    await notifyPartner(app, 'Interview not cleared', '{student} did not clear the interview. The application is closed.');
    return void res.json({ success: true, data: (await decorate([updated]))[0] });
  }
  const updated = await apply(req, res, app, { stageKey: 'interview', patch, note: 'Interview scheduled' });
  await notifyPartner(app, 'Interview scheduled', `{student}: interview scheduled for ${scheduledAt!.toLocaleString('en-IN')}.`);
  res.json({ success: true, data: (await decorate([updated]))[0] });
});

/** Stage 3: record the offer (or that the university did not offer). The partner then accepts or declines. */
export const issueOffer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const app = await loadStaff(req, res);
  requireStage(res, app, 'offer', 'Recording an offer');
  const b = req.body || {};
  if (b.universityRejected === true) {
    const updated = await apply(req, res, app, { to: 'offer_declined', stageKey: 'offer', patch: { status: 'not_offered', remarks: str(b.remarks, 1000) }, note: 'University did not offer a place', data: { commissionStatus: 'void' } });
    await notifyPartner(app, 'No offer received', '{student}: the university did not offer a place. The application is closed.');
    return void res.json({ success: true, data: (await decorate([updated]))[0] });
  }
  const fileUrl = fileRef(b.fileUrl);
  if (!fileUrl) return fail(res, 400, 'Upload the offer letter');
  const offerType = b.offerType === 'conditional' ? 'conditional' : 'unconditional';
  const deadline = b.deadline ? new Date(b.deadline) : undefined;
  if (deadline && Number.isNaN(deadline.getTime())) return fail(res, 400, 'Enter a valid deadline');
  const updated = await apply(req, res, app, {
    stageKey: 'offer', patch: { status: 'issued', offerType, fileUrl, conditions: str(b.conditions, 2000), deadline: deadline?.toISOString(), remarks: str(b.remarks, 1000) }, note: `Offer received (${offerType})`,
  });
  await notifyPartner(app, 'Offer received', '{student}: an offer letter is available. Please accept or decline it.');
  res.json({ success: true, data: (await decorate([updated]))[0] });
});

/** Stage 4: verify the partner's payment. */
export const verifyPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const app = await loadStaff(req, res);
  requireStage(res, app, 'payment', 'Verifying payment');
  if (obj(obj(app.stageData).payment).status !== 'submitted') return fail(res, 409, 'No payment has been submitted yet');
  const remarks = str(req.body?.remarks, 1000);
  if (req.body?.approve === true) {
    const updated = await apply(req, res, app, { to: 'visa_documents', stageKey: 'payment', patch: { status: 'verified', remarks, verifiedBy: req.user.id, verifiedAt: new Date().toISOString() }, note: 'Payment verified' });
    await notifyPartner(app, 'Payment verified', '{student}: payment verified. Please upload the visa documents.');
    return void res.json({ success: true, data: (await decorate([updated]))[0] });
  }
  if (!remarks) return fail(res, 400, 'Enter the reason for rejecting');
  const updated = await apply(req, res, app, { stageKey: 'payment', patch: { status: 'rejected', remarks }, note: `Payment rejected: ${remarks}` });
  await notifyPartner(app, 'Payment rejected', `{student}: payment was rejected. Reason: ${remarks}. Please submit it again.`);
  res.json({ success: true, data: (await decorate([updated]))[0] });
});

/** Stage 5: verify the visa documents. */
export const verifyVisaDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const app = await loadStaff(req, res);
  requireStage(res, app, 'visa_documents', 'Verifying visa documents');
  if (obj(obj(app.stageData).visaDocuments).status !== 'submitted') return fail(res, 409, 'No visa documents have been submitted yet');
  const remarks = str(req.body?.remarks, 1000);
  if (req.body?.approve === true) {
    const updated = await apply(req, res, app, { to: 'visa_decision', stageKey: 'visaDocuments', patch: { status: 'approved', remarks }, note: 'Visa documents approved' });
    await notifyPartner(app, 'Visa documents approved', '{student}: visa documents approved. The visa has been filed; waiting for the decision.');
    return void res.json({ success: true, data: (await decorate([updated]))[0] });
  }
  if (!remarks) return fail(res, 400, 'Enter the reason for rejecting');
  const updated = await apply(req, res, app, { stageKey: 'visaDocuments', patch: { status: 'rejected', remarks }, note: `Visa documents rejected: ${remarks}` });
  await notifyPartner(app, 'Visa documents rejected', `{student}: visa documents were rejected. Reason: ${remarks}. Please upload them again.`);
  res.json({ success: true, data: (await decorate([updated]))[0] });
});

/** Stage 7 (automatic, on visa approval): create the Student and portal login, and fix the commission. */
const enrollStudent = async (app: App) => {
  const details = obj(app.details);
  const email = app.studentEmail.toLowerCase().trim();
  if (await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } })
    || await prisma.student.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } })) {
    throw Object.assign(new Error('An account with this email already exists, so the student cannot be created. Resolve it and try again.'), { statusCode: 409 });
  }
  const program = await prisma.program.findUnique({ where: { id: app.programId }, select: { universityId: true } });
  const org = await prisma.organization.findUnique({ where: { id: app.organizationId }, select: { name: true, metadata: true } });
  const prefix = (org?.metadata as any)?.admissionPrefix || (org?.name || 'ADM').substring(0, 3).toUpperCase();
  let admissionNo = '';
  for (;;) {
    admissionNo = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
    if (!(await prisma.student.findFirst({ where: { admissionNo }, select: { id: true } }))) break;
  }
  const password = `Student@${Math.floor(100000 + Math.random() * 900000)}`;
  const hashed = await hashPassword(password);
  const userId = await generateUserId();
  const dob = details.dob ? new Date(details.dob) : undefined;

  const student = await prisma.$transaction(async tx => {
    await tx.user.create({ data: { userId, organizationId: app.organizationId, email, password: hashed, name: app.studentName, role: 'student', phone: app.studentPhone, status: 'active' } });
    return tx.student.create({
      data: {
        organizationId: app.organizationId, name: app.studentName, email, phone: app.studentPhone,
        address: details.studentAddress || 'Pending', dob: dob && !Number.isNaN(dob.getTime()) ? dob : undefined,
        gender: details.gender, caste: details.caste, religion: details.religion,
        fatherName: details.fatherName, fatherPhone: details.fatherPhone, motherName: details.motherName, motherPhone: details.motherPhone,
        altPhone: details.altPhone, pinCode: details.pinCode, photo: details.photo,
        programId: app.programId, sessionId: app.sessionId, specialisation: app.specialisation, universityId: program?.universityId ?? app.universityId,
        documents: app.documents as any, status: 'active', source: 'study_abroad', enrolledAt: new Date(), admissionDate: new Date(),
        admissionNo, credentials: { email, password },
      },
    });
  });

  enqueueNotification({
    type: 'STUDENT_CREDENTIALS',
    data: { to: email, recipientName: app.studentName, email, password, userId, organizationId: app.organizationId, studentPhone: app.studentPhone, programName: 'Study Abroad Program', admissionNo },
  });

  // The commission the organization set for this program, fixed now so a later change never alters it.
  const rate = await prisma.studyAbroadProgramCommission.findUnique({ where: { organizationId_programId: { organizationId: app.organizationId, programId: app.programId } } });
  const terms: CommissionTerms = { type: rate && ['percentage', 'fixed'].includes(rate.commissionType) ? rate.commissionType as CommissionTerms['type'] : 'none', value: rate?.commissionValue ?? 0 };
  const paid = Number(obj(obj(app.stageData).payment).amount) || 0;
  const commissionAmount = calcCommission(terms, paid);
  return { student, terms, paid, commissionAmount };
};

/** Stage 6: record the visa outcome. "approved" creates the student and makes the commission payable. */
export const setVisaDecision = asyncHandler(async (req: AuthRequest, res: Response) => {
  const app = await loadStaff(req, res);
  requireStage(res, app, 'visa_decision', 'Recording the visa decision');
  const b = req.body || {};
  const outcome = ['approved', 'refused', 'pending'].includes(b.outcome) ? b.outcome : undefined;
  if (!outcome) return fail(res, 400, 'outcome must be approved, refused or pending');
  const decisionDate = b.decisionDate ? new Date(b.decisionDate) : undefined;
  if (decisionDate && Number.isNaN(decisionDate.getTime())) return fail(res, 400, 'Enter a valid decision date');
  const patch = { status: outcome, reference: str(b.reference, 100), decisionDate: decisionDate?.toISOString(), reason: str(b.reason, 1000) };

  if (outcome === 'pending') {
    const updated = await apply(req, res, app, { stageKey: 'visaDecision', patch, note: 'Visa decision pending' });
    return void res.json({ success: true, data: (await decorate([updated]))[0] });
  }
  if (outcome === 'refused') {
    const updated = await apply(req, res, app, { to: 'visa_refused', stageKey: 'visaDecision', patch, note: `Visa refused${patch.reason ? `: ${patch.reason}` : ''}`, data: { commissionStatus: 'void' } });
    await notifyPartner(app, 'Visa refused', `{student}: the visa was refused.${patch.reason ? ` Reason: ${patch.reason}.` : ''}`);
    return void res.json({ success: true, data: (await decorate([updated]))[0] });
  }

  let enrolled: Awaited<ReturnType<typeof enrollStudent>>;
  try { enrolled = await enrollStudent(app); }
  catch (e: any) { return fail(res, e?.statusCode || 500, e?.message || 'Could not create the student'); }
  const updated = await apply(req, res, app, {
    to: 'enrolled', stageKey: 'visaDecision', patch, note: 'Visa approved. Student enrolled',
    data: {
      studentId: enrolled.student.id, enrolledAt: enrolled.student.enrolledAt,
      commissionStatus: enrolled.commissionAmount > 0 ? 'payable' : 'not_eligible',
      commissionAmount: enrolled.commissionAmount,
      commissionTerms: { ...enrolled.terms, basis: 'verified_payment', paidAmount: enrolled.paid, calculatedAt: new Date().toISOString() },
    },
  });
  await notifyPartner(app, 'Visa approved', `{student}: the visa was approved and the student is enrolled.${enrolled.commissionAmount > 0 ? ' Your commission is now payable.' : ''}`);
  res.json({ success: true, data: (await decorate([updated]))[0] });
});

export const withdrawApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
  const app = await loadStaff(req, res);
  const updated = await withdrawWith(req, res, app);
  await notifyPartner(app, 'Application closed', '{student}: the application was closed by the organization.');
  res.json({ success: true, data: (await decorate([updated]))[0] });
});

// ─── commission ─────────────────────────────────────────────────────────────

/** Stage 8: pay the commission and close the journey. */
export const releaseCommission = asyncHandler(async (req: AuthRequest, res: Response) => {
  const app = await loadStaff(req, res);
  requireStage(res, app, 'enrolled', 'Releasing commission');
  if (app.commissionStatus !== 'payable' || !(app.commissionAmount > 0)) return fail(res, 409, 'There is no payable commission on this application');
  const history = [...(Array.isArray(app.stageHistory) ? app.stageHistory as any[] : []),
    { stage: 'commission_released', changedAt: new Date().toISOString(), by: req.user.id, actorName: req.user.name, actorRole: req.user.role, note: `Commission ${app.commissionAmount} released` }];
  const payout = await prisma.$transaction(async tx => {
    const { count } = await tx.studyAbroadApplication.updateMany({
      where: { id: app.id, stage: 'enrolled', commissionStatus: 'payable' },
      data: { stage: 'commission_released', commissionStatus: 'released', stageHistory: history },
    });
    if (count === 0) throw Object.assign(new Error('This commission was already released. Please refresh.'), { statusCode: 409 });
    return tx.studyAbroadPartnerPayout.create({
      data: { organizationId: app.organizationId, partnerId: app.partnerId, applicationId: app.id, amount: app.commissionAmount, reference: str(req.body?.reference, 100), notes: str(req.body?.notes, 1000), paidBy: req.user.id },
    });
  }).catch(e => fail(res, e?.statusCode || 500, e?.message || 'Could not release the commission'));
  await notifyPartner(app, 'Commission released', `Commission of ${app.commissionAmount} for {student} was released.`);
  res.json({ success: true, data: payout });
});

/** Per-partner commission totals and the payout history. */
export const commissionSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const [partners, rows, payouts] = await Promise.all([
    prisma.studyAbroadPartner.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } }),
    prisma.studyAbroadApplication.groupBy({ by: ['partnerId', 'commissionStatus'], where: { organizationId: orgId, commissionStatus: { in: ['payable', 'released'] } }, _sum: { commissionAmount: true }, _count: { _all: true } }),
    prisma.studyAbroadPartnerPayout.findMany({ where: { organizationId: orgId }, orderBy: { paidAt: 'desc' }, take: 100 }),
  ]);
  const totals = (partnerId: string, status: string) => rows.find(r => r.partnerId === partnerId && r.commissionStatus === status);
  const names = new Map(partners.map(p => [p.id, p.name]));
  const apps = payouts.length ? await prisma.studyAbroadApplication.findMany({ where: { id: { in: payouts.map(p => p.applicationId) } }, select: { id: true, studentName: true } }) : [];
  const studentOf = new Map(apps.map(a => [a.id, a.studentName]));
  res.json({
    success: true,
    data: {
      partners: partners.map(p => ({
        ...p,
        payableAmount: totals(p.id, 'payable')?._sum.commissionAmount || 0, payableCount: totals(p.id, 'payable')?._count._all || 0,
        releasedAmount: totals(p.id, 'released')?._sum.commissionAmount || 0, releasedCount: totals(p.id, 'released')?._count._all || 0,
      })),
      payouts: payouts.map(p => ({ ...p, partnerName: names.get(p.partnerId) || '', studentName: studentOf.get(p.applicationId) || '' })),
    },
  });
});

/** The partner's own commission figures (read only). */
export const myCommission = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partnerId = await myPartnerId(req, res);
  const rows = await prisma.studyAbroadApplication.groupBy({
    by: ['commissionStatus'], where: { organizationId: req.user.organizationId, partnerId, commissionStatus: { in: ['payable', 'released'] } },
    _sum: { commissionAmount: true }, _count: { _all: true },
  });
  const pick = (s: string) => rows.find(r => r.commissionStatus === s);
  res.json({
    success: true,
    data: {
      payableAmount: pick('payable')?._sum.commissionAmount || 0, payableCount: pick('payable')?._count._all || 0,
      releasedAmount: pick('released')?._sum.commissionAmount || 0, releasedCount: pick('released')?._count._all || 0 },
  });
});

// ─── commission rates (per university program) ─────────────────────────────

/** Every active program grouped by university, with the commission the org admin set for it (if any). */
export const listCommissionRates = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const [universities, rates] = await Promise.all([
    prisma.university.findMany({
      where: { organizationId: orgId, status: 'active', isAcademicPartnerOnly: false },
      select: { id: true, name: true, country: true, programs: { where: { status: 'active' }, select: { id: true, name: true, courseType: true }, orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
    prisma.studyAbroadProgramCommission.findMany({ where: { organizationId: orgId } }),
  ]);
  const byProgram = new Map(rates.map(r => [r.programId, r]));
  res.json({
    success: true,
    data: universities.filter(u => u.programs.length > 0).map(u => ({
      ...u,
      programs: u.programs.map(p => ({ ...p, commissionType: byProgram.get(p.id)?.commissionType || 'none', commissionValue: byProgram.get(p.id)?.commissionValue || 0 })),
    })),
  });
});

/** Set (or clear) the commission for one program. Body: { commissionType: none | percentage | fixed, commissionValue }. */
export const setCommissionRate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const program = await prisma.program.findFirst({ where: { id: req.params.programId, organizationId: orgId }, select: { id: true } });
  if (!program) return fail(res, 404, 'Program not found');
  const type = req.body?.commissionType;
  if (!['none', 'percentage', 'fixed'].includes(type)) return fail(res, 400, 'commissionType must be none, percentage or fixed');
  const value = type === 'none' ? 0 : Number(req.body?.commissionValue);
  if (type !== 'none') {
    if (!Number.isFinite(value) || value <= 0) return fail(res, 400, 'Enter a commission value greater than 0');
    if (type === 'percentage' && value > 100) return fail(res, 400, 'A percentage commission cannot be more than 100');
  }
  const rounded = Math.round(value * 100) / 100;
  const saved = await prisma.studyAbroadProgramCommission.upsert({
    where: { organizationId_programId: { organizationId: orgId, programId: program.id } },
    create: { organizationId: orgId, programId: program.id, commissionType: type, commissionValue: rounded, updatedBy: req.user.id },
    update: { commissionType: type, commissionValue: rounded, updatedBy: req.user.id },
  });
  res.json({ success: true, data: saved });
});
