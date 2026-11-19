import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler, asyncHandlerWithoutDeleteApproval } from '../utils/asyncHandler.js';

const MAX_TYPES = 10;
const MAX_OPTIONS = 30;
const MAX_BULK = 500;
const GLOBAL_ROLES = ['superadmin', 'org_admin', 'ceo', 'general_manager'];
const SALES_ROLES = ['sales', 'sales_admin', 'sales_sub_admin', 'employee']; // same scoping as the student list

// Default colours handed out in order; the admin can pick any other from the panel
export const OPTION_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const cleanColor = (v: any): string | null => (typeof v === 'string' && HEX.test(v.trim()) ? v.trim().toLowerCase() : null);

const clean = (v: any, max = 80) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const fail = (res: Response, status: number, message: string) => res.status(status).json({ success: false, message });

// ── Admin: filter types and options ───────────────────────────────────────────────────

// @route GET /api/v1/student-filters  (?all=true includes inactive filters and archived options, for the admin screen)
export const getFilterTypes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const isAdmin = ['org_admin', 'superadmin'].includes(req.user.role);
  const all = req.query.all === 'true' && isAdmin;

  const types = await prisma.studentFilterType.findMany({
    where: { organizationId, ...(all ? {} : { isActive: true }) },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { options: { where: all ? {} : { isArchived: false }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } }
  });

  // how many students use each option (admin screen only)
  let usage = new Map<string, number>();
  if (all) {
    const grouped = await prisma.studentFilterValue.groupBy({
      by: ['optionId'],
      where: { filterType: { organizationId } },
      _count: { _all: true }
    });
    usage = new Map(grouped.map((g) => [g.optionId, g._count._all]));
  }
  res.json({
    success: true,
    data: types.map((t) => ({ ...t, options: t.options.map((o) => ({ ...o, studentCount: usage.get(o.id) || 0 })) }))
  });
});

// @route POST /api/v1/student-filters   { name, options?: string[] }
export const createFilterType = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const name = clean(req.body.name);
  if (!name) return fail(res, 400, 'Filter name is required');

  const existing = await prisma.studentFilterType.findMany({ where: { organizationId }, select: { name: true, sortOrder: true } });
  if (existing.length >= MAX_TYPES) return fail(res, 400, `You can create at most ${MAX_TYPES} filters`);
  if (existing.some((t) => t.name.toLowerCase() === name.toLowerCase())) return fail(res, 409, 'A filter with this name already exists');

  const labels: string[] = [];
  for (const raw of Array.isArray(req.body.options) ? req.body.options : []) {
    const label = clean(raw);
    if (label && !labels.some((l) => l.toLowerCase() === label.toLowerCase())) labels.push(label);
  }
  if (labels.length > MAX_OPTIONS) return fail(res, 400, `A filter can have at most ${MAX_OPTIONS} options`);

  const type = await prisma.studentFilterType.create({
    data: {
      organizationId, name, createdBy: req.user.id,
      sortOrder: existing.reduce((m, t) => Math.max(m, t.sortOrder), 0) + 1,
      options: { create: labels.map((label, i) => ({ label, sortOrder: i + 1, color: OPTION_COLORS[i % OPTION_COLORS.length] })) }
    },
    include: { options: true }
  });
  res.status(201).json({ success: true, data: type });
});

const findOwnType = (req: AuthRequest, id: string) =>
  prisma.studentFilterType.findFirst({ where: { id, organizationId: req.user.organizationId } });

// @route PUT /api/v1/student-filters/:id   { name?, isActive?, sortOrder? }
export const updateFilterType = asyncHandler(async (req: AuthRequest, res: Response) => {
  const type = await findOwnType(req, req.params.id);
  if (!type) return fail(res, 404, 'Filter not found');
  const data: any = {};
  if (req.body.name !== undefined) {
    const name = clean(req.body.name);
    if (!name) return fail(res, 400, 'Filter name is required');
    const dup = await prisma.studentFilterType.findFirst({
      where: { organizationId: req.user.organizationId, id: { not: type.id }, name: { equals: name, mode: 'insensitive' } }
    });
    if (dup) return fail(res, 409, 'A filter with this name already exists');
    data.name = name;
  }
  if (typeof req.body.isActive === 'boolean') data.isActive = req.body.isActive;
  if (Number.isFinite(Number(req.body.sortOrder))) data.sortOrder = Number(req.body.sortOrder);
  const updated = await prisma.studentFilterType.update({ where: { id: type.id }, data });
  res.json({ success: true, data: updated });
});

// @route DELETE /api/v1/student-filters/:id   (only while no student has a value; otherwise deactivate it)
export const deleteFilterType = asyncHandlerWithoutDeleteApproval(async (req: AuthRequest, res: Response) => {
  const type = await findOwnType(req, req.params.id);
  if (!type) return fail(res, 404, 'Filter not found');
  const used = await prisma.studentFilterValue.count({ where: { filterTypeId: type.id } });
  if (used > 0) return fail(res, 409, `${used} student(s) have a value for this filter. Deactivate it instead of deleting.`);
  await prisma.studentFilterType.delete({ where: { id: type.id } });
  res.json({ success: true });
});

// @route POST /api/v1/student-filters/:id/options   { label, color? }
export const addFilterOption = asyncHandler(async (req: AuthRequest, res: Response) => {
  const type = await findOwnType(req, req.params.id);
  if (!type) return fail(res, 404, 'Filter not found');
  const label = clean(req.body.label);
  if (!label) return fail(res, 400, 'Option name is required');
  const options = await prisma.studentFilterOption.findMany({ where: { filterTypeId: type.id }, select: { label: true, sortOrder: true } });
  if (options.length >= MAX_OPTIONS) return fail(res, 400, `A filter can have at most ${MAX_OPTIONS} options`);
  if (options.some((o) => o.label.toLowerCase() === label.toLowerCase())) return fail(res, 409, 'This option already exists');
  const option = await prisma.studentFilterOption.create({
    data: { filterTypeId: type.id, label, color: cleanColor(req.body.color) ?? OPTION_COLORS[options.length % OPTION_COLORS.length], sortOrder: options.reduce((m, o) => Math.max(m, o.sortOrder), 0) + 1 }
  });
  res.status(201).json({ success: true, data: option });
});

const findOwnOption = (req: AuthRequest, optionId: string) =>
  prisma.studentFilterOption.findFirst({ where: { id: optionId, filterType: { organizationId: req.user.organizationId } } });

// @route PUT /api/v1/student-filters/options/:optionId   { label?, color?, isArchived?, sortOrder? }
export const updateFilterOption = asyncHandler(async (req: AuthRequest, res: Response) => {
  const option = await findOwnOption(req, req.params.optionId);
  if (!option) return fail(res, 404, 'Option not found');
  const data: any = {};
  if (req.body.label !== undefined) {
    const label = clean(req.body.label);
    if (!label) return fail(res, 400, 'Option name is required');
    const dup = await prisma.studentFilterOption.findFirst({
      where: { filterTypeId: option.filterTypeId, id: { not: option.id }, label: { equals: label, mode: 'insensitive' } }
    });
    if (dup) return fail(res, 409, 'This option already exists');
    data.label = label;
  }
  if (req.body.color !== undefined) {
    const color = cleanColor(req.body.color);
    if (req.body.color && !color) return fail(res, 400, 'Colour must be a hex value like #3b82f6');
    data.color = color;
  }
  if (typeof req.body.isArchived === 'boolean') data.isArchived = req.body.isArchived;
  if (Number.isFinite(Number(req.body.sortOrder))) data.sortOrder = Number(req.body.sortOrder);
  // A rename needs nothing else: students point at the option, so they all show the new name
  const updated = await prisma.studentFilterOption.update({ where: { id: option.id }, data });
  res.json({ success: true, data: updated });
});

// @route DELETE /api/v1/student-filters/options/:optionId   (blocked while a student uses it)
export const deleteFilterOption = asyncHandlerWithoutDeleteApproval(async (req: AuthRequest, res: Response) => {
  const option = await findOwnOption(req, req.params.optionId);
  if (!option) return fail(res, 404, 'Option not found');
  const used = await prisma.studentFilterValue.count({ where: { optionId: option.id } });
  if (used > 0) return fail(res, 409, `${used} student(s) use this option. Move them to another option first, or archive it.`);
  await prisma.studentFilterOption.delete({ where: { id: option.id } });
  res.json({ success: true });
});

// ── Students: set a value, read values and history ────────────────────────────────────

/** Ids (from `ids`) of students this user may change: same organisation, branch and sales scope as the student list. */
const scopedStudentIds = async (req: AuthRequest, ids: string[]): Promise<string[]> => {
  const where: any = { id: { in: ids }, organizationId: req.user.organizationId };
  if (!GLOBAL_ROLES.includes(req.user.role) && req.user.branchId) where.branchId = req.user.branchId;
  if (SALES_ROLES.includes(req.user.role)) {
    let allowed = [req.user.id];
    if (['sales_admin', 'sales_sub_admin'].includes(req.user.role)) {
      const roles = (req.user.role === 'sales_admin' ? ['sales_sub_admin', 'sales', 'employee'] : ['sales', 'employee']) as any;
      const subs = await prisma.user.findMany({ where: { role: { in: roles }, organizationId: req.user.organizationId }, select: { id: true } });
      allowed = [...allowed, ...subs.map((s) => s.id)];
    }
    where.OR = [{ enrolledBy: { in: allowed } }, { referredBy: { in: allowed } }];
  }
  const rows = await prisma.student.findMany({ where, select: { id: true } });
  return rows.map((r) => r.id);
};

/** Set (or clear, with optionId null) one student's value, writing the history row in the same transaction. */
const applyValue = async (req: AuthRequest, studentId: string, typeId: string, optionId: string | null, note: string | null, filterName: string, toLabel: string | null) => {
  return prisma.$transaction(async (tx) => {
    const current = await tx.studentFilterValue.findUnique({ where: { studentId_filterTypeId: { studentId, filterTypeId: typeId } }, include: { option: true } });
    if ((current?.optionId || null) === optionId) return false; // unchanged: no history row
    if (optionId) {
      await tx.studentFilterValue.upsert({
        where: { studentId_filterTypeId: { studentId, filterTypeId: typeId } },
        create: { studentId, filterTypeId: typeId, optionId, updatedBy: req.user.id },
        update: { optionId, updatedBy: req.user.id }
      });
    } else if (current) {
      await tx.studentFilterValue.delete({ where: { id: current.id } });
    }
    await tx.studentFilterHistory.create({
      data: {
        organizationId: req.user.organizationId, studentId, filterTypeId: typeId, filterName,
        fromLabel: current?.option.label ?? null, toLabel, note,
        changedBy: req.user.id, changedByName: req.user.name || req.user.email || req.user.role
      }
    });
    return true;
  });
};

const resolveTarget = async (req: AuthRequest, typeId: string, optionId: any) => {
  const type = await prisma.studentFilterType.findFirst({ where: { id: typeId, organizationId: req.user.organizationId } });
  if (!type) return { error: 'Filter not found' as const };
  if (!type.isActive) return { error: 'This filter is turned off' as const };
  if (optionId === null || optionId === undefined || optionId === '') return { type, option: null };
  const option = await prisma.studentFilterOption.findFirst({ where: { id: String(optionId), filterTypeId: type.id } });
  if (!option) return { error: 'Option not found' as const };
  if (option.isArchived) return { error: 'This option is archived and can no longer be assigned' as const };
  return { type, option };
};

// @route PUT /api/v1/students/:id/filters/:typeId   { optionId | null, note? }
export const setStudentFilterValue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await resolveTarget(req, req.params.typeId, req.body.optionId);
  if ('error' in target) return fail(res, 404, target.error as string);
  const ids = await scopedStudentIds(req, [req.params.id]);
  if (ids.length === 0) return fail(res, 404, 'Student not found');
  const changed = await applyValue(req, ids[0], target.type.id, target.option?.id ?? null, clean(req.body.note, 300) || null, target.type.name, target.option?.label ?? null);
  res.json({ success: true, changed });
});

// @route POST /api/v1/students/filters/bulk   { studentIds, typeId, optionId | null, note? }
export const bulkSetStudentFilterValue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const studentIds: string[] = [...new Set<string>(Array.isArray(req.body.studentIds) ? req.body.studentIds.map(String) : [])];
  if (studentIds.length === 0) return fail(res, 400, 'Select at least one student');
  if (studentIds.length > MAX_BULK) return fail(res, 400, `You can update at most ${MAX_BULK} students at a time`);
  const target = await resolveTarget(req, String(req.body.typeId || ''), req.body.optionId);
  if ('error' in target) return fail(res, 404, target.error as string);

  const allowed = new Set(await scopedStudentIds(req, studentIds));
  const note = clean(req.body.note, 300) || null;
  let changed = 0, unchanged = 0, failed = 0;
  for (const id of studentIds) {
    if (!allowed.has(id)) { failed++; continue; }
    try {
      (await applyValue(req, id, target.type.id, target.option?.id ?? null, note, target.type.name, target.option?.label ?? null)) ? changed++ : unchanged++;
    } catch { failed++; }
  }
  res.json({ success: true, data: { changed, unchanged, failed } });
});

// @route GET /api/v1/students/:id/filters   current values and the change history
export const getStudentFilterData = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ids = await scopedStudentIds(req, [req.params.id]);
  if (ids.length === 0) return fail(res, 404, 'Student not found');
  const [values, history] = await Promise.all([
    prisma.studentFilterValue.findMany({ where: { studentId: ids[0] }, select: { filterTypeId: true, optionId: true, updatedAt: true } }),
    prisma.studentFilterHistory.findMany({ where: { studentId: ids[0] }, orderBy: { changedAt: 'desc' }, take: 200 })
  ]);
  res.json({ success: true, data: { values, history } });
});
