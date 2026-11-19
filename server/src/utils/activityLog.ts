import { Request } from 'express';
import prisma from '../lib/prisma.js';

/**
 * Developer-facing audit trail: who changed what, when, from where. Stored only, never shown in the app.
 * Everything here is fire-and-forget: logging must never slow down or break a request.
 */

const SENSITIVE_KEY = /password|passwd|token|secret|^otp|otp$|^pin$|^mpin$|cvv|card_?number|authorization|api_?key|account_?number|aadhaar|pan_?number|credentials/i;
const MAX_DEPTH = 4;
const MAX_STRING = 500;
const MAX_KEYS = 60;
const MAX_ARRAY = 25;

/** Deep-copy a payload with secrets masked and large values trimmed. */
export const redact = (value: any, depth = 0): any => {
  if (value === null || value === undefined) return value;
  if (depth > MAX_DEPTH) return '[…]';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') {
    if (value.startsWith('data:')) return '[binary data]';
    return value.length > MAX_STRING ? value.slice(0, MAX_STRING) + '…' : value;
  }
  if (typeof value !== 'object') return value;
  if (Buffer.isBuffer(value)) return '[binary data]';
  if (Array.isArray(value)) {
    const arr = value.slice(0, MAX_ARRAY).map((v) => redact(v, depth + 1));
    if (value.length > MAX_ARRAY) arr.push(`[+${value.length - MAX_ARRAY} more]`);
    return arr;
  }
  const out: Record<string, any> = {};
  Object.keys(value).slice(0, MAX_KEYS).forEach((k) => {
    out[k] = SENSITIVE_KEY.test(k) ? '[REDACTED]' : redact(value[k], depth + 1);
  });
  return out;
};

const ACTION_BY_METHOD: Record<string, string> = { GET: 'read', POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };
export const actionForMethod = (method: string) => ACTION_BY_METHOD[method] || method.toLowerCase();

const isId = (p: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(p) || /^[0-9a-f]{20,}$/i.test(p) || /^\d+$/.test(p);

/** "/api/v1/finance/payments/abc/approve" → { module: "finance", entityType: "payments", entityId: "abc" } */
export const describeRoute = (url: string) => {
  const path = url.split('?')[0].replace(/^\/api\/v\d+\//, '').replace(/^\/api\//, '');
  const parts = path.split('/').filter(Boolean);
  const named = parts.filter((p) => !isId(p));
  let lastIdIdx = -1;
  parts.forEach((p, i) => { if (isId(p)) lastIdIdx = i; });
  const entityType = lastIdIdx > 0 ? parts[lastIdIdx - 1] : named[named.length - 1];
  return {
    path: '/' + path,
    module: named[0] || 'unknown',
    entityType: entityType || named[0] || 'unknown',
    entityId: lastIdIdx >= 0 ? parts[lastIdIdx] : '',
  };
};

export const getClientIp = (req: Request): string => {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (req.ip || fwd || req.socket?.remoteAddress || '').toString().replace(/^::ffff:/, '') || '0.0.0.0';
};


// ── Buffered writes ───────────────────────────────────────────────────────────────────
// Every request is logged, so rows are queued and inserted in batches instead of one query each.
const FLUSH_MS = 2000;
const FLUSH_AT = 100;
const MAX_QUEUE = 5000; // if the database is down, drop the oldest rather than grow without limit
let queue: any[] = [];
let timer: NodeJS.Timeout | null = null;
let flushing = false;

export const flushActivityLog = async (): Promise<void> => {
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue.splice(0, 500);
  try {
    await prisma.auditLog.createMany({ data: batch });
  } catch (err: any) {
    console.error(`Activity log write failed (${batch.length} rows dropped):`, err?.message || err);
  } finally {
    flushing = false;
    if (queue.length > 0) schedule(true);
  }
};

const schedule = (now = false) => {
  if (timer && !now) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; void flushActivityLog(); }, now ? 0 : FLUSH_MS);
  timer.unref?.();
};

const enqueue = (row: any) => {
  queue.push(row);
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
  if (queue.length >= FLUSH_AT) schedule(true); else schedule();
};

export interface ActivityInput {
  action: string;
  entityType?: string;
  entityId?: string;
  module?: string;
  description?: string;
  oldValue?: any;
  newValue?: any;
  statusCode?: number;
  /** Override the actor (login, where req.user is not set). */
  actor?: { id: string; type?: string; name?: string; role?: string; organizationId?: string | null };
}

/** Fire-and-forget write to the audit log. Never throws. */
export const logActivity = (req: Request, input: ActivityInput): void => {
  try {
    const r: any = req;
    const actor = input.actor || (r.user
      ? { id: r.user.id, type: r.user.role === 'faculty' ? 'faculty' : 'user', name: r.user.name, role: r.user.role, organizationId: r.user.organizationId }
      : null);
    const route = describeRoute(req.originalUrl || req.url);
    const isUser = !!actor && (actor.type || 'user') === 'user';

    enqueue({
      organizationId: actor?.organizationId || null,
      userId: isUser ? actor!.id : null,
      actorId: actor?.id || null,
      actorType: actor?.type || null,
      actorName: actor?.name || null,
      actorRole: actor?.role || null,
      action: input.action,
      entityType: input.entityType || route.entityType,
      entityId: (input.entityId || route.entityId || '').toString(),
      module: input.module || route.module,
      description: input.description ? input.description.slice(0, 500) : null,
      oldValue: input.oldValue === undefined ? undefined : redact(input.oldValue),
      newValue: input.newValue === undefined ? undefined : redact(input.newValue),
      ipAddress: getClientIp(req),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 500) || null,
      method: req.method,
      route: route.path.slice(0, 500),
      statusCode: input.statusCode ?? null,
    });
  } catch (err: any) {
    console.error('Activity log error:', err?.message || err);
  }
};

// Routes that are noise, or logged explicitly elsewhere (all methods)
const SKIP_ROUTES = [/^\/auth\/(login|logout|refresh)/, /^\/fcm-token/, /heartbeat/, /video-log/, /\/progress$/, /^\/attendance\/(punch|sync)/, /^\/iclock/, /^\/health/];
// Pages poll these every few seconds, which would bury everything else (reads only)
const SKIP_READ_ROUTES = [/^\/notifications/, /^\/auth\/me/, /unread/, /^\/dashboard\/(live|ticker)/];
// Set AUDIT_LOG_READS=false to stop logging reads (GET) and keep create / update / delete only
const LOG_READS = process.env.AUDIT_LOG_READS !== 'false';

export const shouldAutoLog = (req: Request) => {
  if (!ACTION_BY_METHOD[req.method]) return false;
  if (req.method === 'GET' && !LOG_READS) return false;
  const { path } = describeRoute(req.originalUrl || req.url);
  if (SKIP_ROUTES.some((re) => re.test(path))) return false;
  return !(req.method === 'GET' && SKIP_READ_ROUTES.some((re) => re.test(path)));
};

// Route segment → Prisma model, so an update can record what the row looked like before it changed
const SNAPSHOT_MODELS: Record<string, string> = {
  students: 'student', users: 'user', faculty: 'faculty', programs: 'program', universities: 'university',
  'fee-structures': 'feeStructure', invoices: 'invoice', enrollments: 'enrollment', branches: 'branch',
  organizations: 'organization', departments: 'department', 'academic-centers': 'academicCenter', 'academic-classes': 'academicClass',
  'academic-batches': 'academicBatch', tasks: 'task', leaves: 'leaveRequest', 'study-centers': 'studyCenter',
  'payment-schedules': 'paymentSchedule',
};

/** The row as it is right now (limited to the fields the request is about to change), or undefined. */
export const snapshotBefore = async (req: Request): Promise<any | undefined> => {
  if (!['PUT', 'PATCH', 'DELETE'].includes(req.method)) return undefined;
  const { entityType, entityId } = describeRoute(req.originalUrl || req.url);
  const model = SNAPSHOT_MODELS[entityType];
  const delegate: any = model ? (prisma as any)[model] : null;
  if (!entityId || !delegate?.findUnique) return undefined;
  try {
    const row = await Promise.race([
      delegate.findUnique({ where: { id: entityId } }),
      new Promise((resolve) => setTimeout(() => resolve(undefined), 1500)),
    ]);
    if (!row) return undefined;
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const keys = req.method === 'DELETE' ? Object.keys(row) : Object.keys(body).filter((k) => k in (row as any));
    if (keys.length === 0) return undefined;
    return Object.fromEntries(keys.map((k) => [k, (row as any)[k]]));
  } catch {
    return undefined;
  }
};
