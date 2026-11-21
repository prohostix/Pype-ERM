// Class meetings: a principal (faculty in charge of the class) schedules a meeting with a link for
// the students of one or more of their classes; students see it in their portal.
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { inchargeFilter } from '../utils/incharge.js';

const GRACE_MS = 5 * 60_000;

const isFaculty = (req: AuthRequest) => req.user?.role === 'faculty';

function cleanUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  if (v.length > 2000) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return ['http:', 'https:'].includes(u.protocol) && u.hostname.includes('.') ? u.toString() : null;
  } catch { return null; }
}

/** Students who belong to any of these classes: through a batch, or (online classes) through the program */
async function studentsOfClasses(organizationId: string, classIds: string[]) {
  const classes = await prisma.academicClass.findMany({
    where: { id: { in: classIds }, organizationId },
    select: { programIds: true, academicCenter: { select: { type: true } }, batches: { select: { id: true } } }
  });
  const batchIds = classes.flatMap((c) => c.batches.map((b) => b.id));
  const programIds = classes.filter((c) => c.academicCenter?.type === 'online').flatMap((c) => c.programIds);
  const or: any[] = [];
  if (batchIds.length) or.push({ academicBatchId: { in: batchIds } });
  if (programIds.length) or.push({ programId: { in: programIds } });
  if (!or.length) return [];
  return prisma.student.findMany({ where: { organizationId, OR: or }, select: { id: true, email: true } });
}

/** The classes a student belongs to (same rule as above, from the student's side) */
async function classIdsOfStudent(student: { id: string; organizationId: string; programId: string | null; academicBatchId: string | null }) {
  const or: any[] = [];
  if (student.academicBatchId) or.push({ batches: { some: { id: student.academicBatchId } } });
  if (student.programId) or.push({ academicCenter: { type: 'online' }, programIds: { has: student.programId } });
  if (!or.length) return [];
  const classes = await prisma.academicClass.findMany({ where: { organizationId: student.organizationId, OR: or }, select: { id: true } });
  return classes.map((c) => c.id);
}

const fmt = (d: Date) => d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

/** In-app notification for each student that has a user account. Never blocks or fails the request. */
async function notifyStudents(organizationId: string, classIds: string[], title: string, message: string) {
  try {
    const students = await studentsOfClasses(organizationId, classIds);
    const emails = students.map((s) => s.email).filter(Boolean);
    if (!emails.length) return;
    const users = await prisma.user.findMany({ where: { organizationId, email: { in: emails } }, select: { id: true } });
    const ids = [...new Set([...users.map((u) => u.id)])];
    if (!ids.length) return;
    await prisma.notification.createMany({
      data: ids.map((userId) => ({ organizationId, userId, title, message, type: 'general' as const, priority: 'medium' as const, link: 'meetings' }))
    });
  } catch (e) { console.error('[class-meetings] notify error', e); }
}

// ── Principal (faculty) ─────────────────────────────────────────────────────────

/** Validates the form and returns clean values, or an error message */
async function readMeetingBody(req: AuthRequest, partial: boolean) {
  const b = req.body || {};
  const out: any = {};
  if (!partial || b.title !== undefined) {
    const title = typeof b.title === 'string' ? b.title.trim() : '';
    if (!title) return { error: 'Meeting topic is required' };
    out.title = title.slice(0, 200);
  }
  if (b.description !== undefined) out.description = typeof b.description === 'string' && b.description.trim() ? b.description.trim().slice(0, 2000) : null;
  if (!partial || b.startsAt !== undefined) {
    const startsAt = new Date(b.startsAt);
    if (isNaN(startsAt.getTime())) return { error: 'A valid date and time is required' };
    out.startsAt = startsAt;
  }
  if (b.durationMinutes !== undefined) {
    const mins = Math.round(Number(b.durationMinutes));
    if (!Number.isFinite(mins) || mins < 5 || mins > 600) return { error: 'Duration must be between 5 and 600 minutes' };
    out.durationMinutes = mins;
  }
  if (!partial || b.meetingUrl !== undefined) {
    const url = cleanUrl(b.meetingUrl);
    if (!url) return { error: 'Enter a valid meeting link (https://…)' };
    out.meetingUrl = url;
  }
  if (!partial || b.classIds !== undefined) {
    const ids: string[] = [...new Set<string>((Array.isArray(b.classIds) ? b.classIds : []).filter((x: unknown): x is string => typeof x === 'string' && !!x))];
    if (!ids.length) return { error: 'Select at least one class' };
    const owned = await prisma.academicClass.findMany({
      where: { id: { in: ids }, organizationId: req.user.organizationId, ...inchargeFilter(req.user.id) },
      select: { id: true }
    });
    if (owned.length !== ids.length) return { error: 'You can only schedule meetings for classes you are in charge of' };
    out.classIds = ids;
  }
  return { values: out };
}

// GET /faculty-portal/meetings
export const getMyClassMeetings = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!isFaculty(req)) return res.status(403).json({ success: false, message: 'Access denied' });
  const meetings = await prisma.classMeeting.findMany({
    where: { organizationId: req.user.organizationId, createdById: req.user.id },
    orderBy: { startsAt: 'desc' },
    take: 300
  });
  res.json({ success: true, data: meetings });
});

// POST /faculty-portal/meetings
export const createClassMeeting = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!isFaculty(req)) return res.status(403).json({ success: false, message: 'Access denied' });
  const { values, error } = await readMeetingBody(req, false);
  if (error || !values) return res.status(400).json({ success: false, message: error });
  if (values.startsAt.getTime() < Date.now() - GRACE_MS) return res.status(400).json({ success: false, message: 'The meeting time is in the past' });

  const meeting = await prisma.classMeeting.create({
    data: { durationMinutes: 60, ...values, organizationId: req.user.organizationId, createdById: req.user.id, createdByName: req.user.name || 'Principal' }
  });
  void notifyStudents(meeting.organizationId, meeting.classIds, `New meeting: ${meeting.title}`, `${meeting.createdByName} scheduled a meeting on ${fmt(meeting.startsAt)} (IST). Open Meetings to join.`);
  res.status(201).json({ success: true, data: meeting });
});

// PUT /faculty-portal/meetings/:id  (edit, reschedule, or cancel with { status: 'cancelled' })
export const updateClassMeeting = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!isFaculty(req)) return res.status(403).json({ success: false, message: 'Access denied' });
  const existing = await prisma.classMeeting.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId, createdById: req.user.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Meeting not found' });

  if (req.body?.status === 'cancelled') {
    if (existing.status === 'cancelled') return res.json({ success: true, data: existing });
    const reason = typeof req.body.cancelReason === 'string' && req.body.cancelReason.trim() ? req.body.cancelReason.trim().slice(0, 300) : null;
    const meeting = await prisma.classMeeting.update({ where: { id: existing.id }, data: { status: 'cancelled', cancelReason: reason } });
    void notifyStudents(meeting.organizationId, meeting.classIds, `Meeting cancelled: ${meeting.title}`, `The meeting planned for ${fmt(meeting.startsAt)} (IST) was cancelled.${reason ? ` Reason: ${reason}` : ''}`);
    return res.json({ success: true, data: meeting });
  }

  if (existing.status === 'cancelled') return res.status(400).json({ success: false, message: 'A cancelled meeting cannot be edited. Create a new one.' });
  const { values, error } = await readMeetingBody(req, true);
  if (error || !values) return res.status(400).json({ success: false, message: error });
  // Only a changed time must be in the future; other edits to a meeting already under way are fine
  if (values.startsAt && values.startsAt.getTime() !== existing.startsAt.getTime() && values.startsAt.getTime() < Date.now() - GRACE_MS) {
    return res.status(400).json({ success: false, message: 'The new meeting time is in the past' });
  }

  const meeting = await prisma.classMeeting.update({ where: { id: existing.id }, data: values });
  const timeChanged = meeting.startsAt.getTime() !== existing.startsAt.getTime();
  const linkChanged = meeting.meetingUrl !== existing.meetingUrl;
  const classesAdded = meeting.classIds.filter((c) => !existing.classIds.includes(c));
  if (timeChanged || linkChanged || meeting.title !== existing.title) {
    void notifyStudents(meeting.organizationId, meeting.classIds, `Meeting updated: ${meeting.title}`, `${timeChanged ? `Now on ${fmt(meeting.startsAt)} (IST). ` : ''}${linkChanged ? 'The meeting link changed. ' : ''}Open Meetings for details.`);
  } else if (classesAdded.length) {
    void notifyStudents(meeting.organizationId, classesAdded, `New meeting: ${meeting.title}`, `${meeting.createdByName} scheduled a meeting on ${fmt(meeting.startsAt)} (IST). Open Meetings to join.`);
  }
  res.json({ success: true, data: meeting });
});

// ── Student ─────────────────────────────────────────────────────────────────────

// GET /student-portal/meetings  (own classes only; upcoming plus the last 30 days)
export const getStudentMeetings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await prisma.student.findFirst({
    where: { OR: [{ id: req.user.id }, { email: req.user.email }] },
    select: { id: true, organizationId: true, programId: true, academicBatchId: true }
  });
  if (!student) return res.json({ success: true, data: [] });
  const classIds = await classIdsOfStudent(student);
  if (!classIds.length) return res.json({ success: true, data: [] });

  const meetings = await prisma.classMeeting.findMany({
    where: { organizationId: student.organizationId, classIds: { hasSome: classIds }, startsAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    orderBy: { startsAt: 'asc' },
    take: 200,
    select: { id: true, title: true, description: true, startsAt: true, durationMinutes: true, meetingUrl: true, status: true, cancelReason: true, createdByName: true }
  });
  // A cancelled meeting no longer exposes its link
  res.json({ success: true, data: meetings.map((m) => (m.status === 'cancelled' ? { ...m, meetingUrl: null } : m)) });
});
