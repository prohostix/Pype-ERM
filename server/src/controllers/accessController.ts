/** Org Admin screens for per-user access. */
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { FEATURES } from '../access/catalog.js';
import { acceptsOverrides, resolveAccess } from '../access/resolve.js';
import { loadSubject } from '../access/load.js';
import { changeError, needsRow, type Change } from '../access/changes.js';

const ELIGIBLE_ROLES = [
  'general_manager', 'branch_manager', 'ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'finance',
  'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin', 'sales', 'collections_admin', 'collections', 'employee',
].filter((role) => acceptsOverrides({ role }));

const SETUP_MESSAGE = 'Access changes cannot be saved yet: the database table has not been created.';
const isMissingTable = (error: any) => error?.code === 'P2021' || /UserAccessOverride.*does not exist/i.test(error?.message || '');

const paging = (req: AuthRequest) => ({
  page: Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1),
  limit: Math.min(100, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10)),
});

const USER_FIELDS = {
  id: true, name: true, email: true, role: true, status: true, organizationId: true, branchId: true,
  departmentId: true, subDepartmentId: true,
  branch: { select: { name: true } },
  department: { select: { name: true, type: true } },
  managedBranch: { select: { id: true } },
} as const;

const findTarget = (req: AuthRequest) =>
  prisma.user.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId }, select: USER_FIELDS });

/** Changes whenever a user's rows change, so a stale screen cannot overwrite newer settings. */
const versionOf = (rows: { createdAt: Date; revokedAt: Date | null }[]): string =>
  String(rows.reduce((latest, r) => Math.max(latest, r.createdAt.getTime(), r.revokedAt?.getTime() || 0), 0));

// GET /access/users?search=&role=&page=&limit=
export const getAccessUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit } = paging(req);
  const search = String(req.query.search || '').trim();
  const role = String(req.query.role || '');
  const contains = { contains: search, mode: 'insensitive' as const };
  const where: any = {
    organizationId: req.user.organizationId,
    id: { not: req.user.id },
    role: { in: ELIGIBLE_ROLES.includes(role) ? [role] : ELIGIBLE_ROLES },
    status: { in: ['active', 'on_leave'] },
    ...(search && { OR: [{ name: contains }, { email: contains }] }),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: USER_FIELDS, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
    prisma.user.count({ where }),
  ]);

  let setupRequired = false;
  const counts = new Map<string, number>();
  try {
    const rows = await prisma.userAccessOverride.findMany({
      where: { userId: { in: users.map((u) => u.id) }, revokedAt: null },
      select: { userId: true, roleAtGrant: true, departmentIdAtGrant: true },
    });
    for (const row of rows) {
      const user = users.find((u) => u.id === row.userId)!;
      if (row.roleAtGrant === user.role && (row.departmentIdAtGrant || null) === (user.departmentId || null)) {
        counts.set(row.userId, (counts.get(row.userId) || 0) + 1);
      }
    }
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    setupRequired = true;
  }

  res.json({
    success: true, total, setupRequired, roles: ELIGIBLE_ROLES,
    data: users.map(({ managedBranch, ...u }) => ({ ...u, overrides: counts.get(u.id) || 0 })),
  });
});

// GET /access/users/:id
export const getAccessUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await findTarget(req);
  if (!target || !acceptsOverrides(target)) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  let setupRequired = false;
  let rows: any[] = [];
  try {
    rows = await prisma.userAccessOverride.findMany({ where: { userId: target.id, organizationId: req.user.organizationId } });
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    setupRequired = true;
  }
  const subject = await loadSubject(target, Boolean(target.managedBranch));
  const access = resolveAccess(subject, rows);
  res.json({
    success: true,
    data: {
      user: { id: target.id, name: target.name, email: target.email, role: target.role, branch: target.branch?.name || null, department: target.department?.name || null },
      setupRequired,
      version: versionOf(rows),
      features: FEATURES.map((f) => ({ key: f.key, label: f.label, group: f.group, blockOnly: Boolean(f.blockOnly), actions: f.actions.map((action) => ({ action, ...access[f.key][action]! })) })),
    },
  });
});

// PUT /access/users/:id  { changes: [{ featureKey, action, effect }], reason, version }
export const saveAccessUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await findTarget(req);
  if (!target) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  const reason = String(req.body.reason || '').trim();
  const subject = await loadSubject(target, Boolean(target.managedBranch));
  const invalid = !reason ? 'Enter a reason for this change' : changeError(req.user.id, subject, req.body.changes);
  if (invalid) {
    res.status(400).json({ success: false, message: invalid });
    return;
  }
  const changes = req.body.changes as Change[];

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const rows = await tx.userAccessOverride.findMany({ where: { userId: target.id, organizationId: req.user.organizationId } });
      if (String(req.body.version ?? '') !== versionOf(rows)) return false;
      const now = new Date();
      for (const change of changes) {
        // Rows are ended, never deleted: together they are the history
        await tx.userAccessOverride.updateMany({
          where: { userId: target.id, featureKey: change.featureKey, action: change.action, revokedAt: null },
          data: { revokedAt: now, revokedById: req.user.id },
        });
        if (needsRow(subject, change)) {
          await tx.userAccessOverride.create({
            data: {
              organizationId: req.user.organizationId, userId: target.id, featureKey: change.featureKey,
              action: change.action, effect: change.effect, roleAtGrant: target.role, departmentIdAtGrant: target.departmentId,
              reason: reason.slice(0, 500), grantedById: req.user.id, createdAt: now,
            },
          });
        }
      }
      return true;
    }, { isolationLevel: 'Serializable' });

    if (!saved) {
      res.status(409).json({ success: false, message: 'Someone else changed this access. Reload and try again.' });
      return;
    }
    res.json({ success: true, message: 'Access updated' });
  } catch (error: any) {
    if (isMissingTable(error)) {
      res.status(503).json({ success: false, message: SETUP_MESSAGE });
      return;
    }
    if (error?.code === 'P2034') { // two saves at the same moment
      res.status(409).json({ success: false, message: 'Someone else changed this access. Reload and try again.' });
      return;
    }
    throw error;
  }
});

// GET /access/users/:id/history?page=&limit=
export const getAccessHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit } = paging(req);
  const where = { userId: req.params.id, organizationId: req.user.organizationId };
  try {
    const [rows, total] = await Promise.all([
      prisma.userAccessOverride.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
      prisma.userAccessOverride.count({ where }),
    ]);
    const ids = [...new Set(rows.flatMap((r) => [r.grantedById, r.revokedById]).filter(Boolean))] as string[];
    const people = new Map((await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]));
    res.json({
      success: true, total,
      data: rows.map((r) => ({
        id: r.id, featureKey: r.featureKey, action: r.action, effect: r.effect, reason: r.reason,
        createdAt: r.createdAt, grantedBy: people.get(r.grantedById) || 'Unknown',
        revokedAt: r.revokedAt, revokedBy: r.revokedById ? people.get(r.revokedById) || 'Unknown' : null,
      })),
    });
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    res.json({ success: true, total: 0, data: [] });
  }
});
