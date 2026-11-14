/**
 * Student Management reports (mounted at /api/v1/student-reports)
 *
 *   GET  /columns   the columns this user may pick, grouped
 *   POST /run       { columns, filters?, sort?, limit? }  → rows
 *
 * A manual column picker, no AI. It reuses the AI reports engine (datasets.ts + compiler.ts),
 * so it gets the same safeguards: the user's row scope and the organization lock are always
 * applied on the server, and only columns the user is allowed to see can be requested.
 * Sensitive columns (phone, email, DOB, family, discount...) stay hidden until the
 * per-department report policy allows them (see `allowSensitive` in datasetsFor).
 */
import express, { Response } from 'express';
import { protect, AuthRequest } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { STUDENT_COLUMN_GROUPS, datasetsFor } from '../ai-reports/datasets.js';
import { ReportError, runSpec, validateSpec } from '../ai-reports/compiler.js';
import { AccessError, accessLabel, buildContext } from '../ai-reports/access.js';

const router = express.Router();
router.use(protect);

/** Until the department policy exists, same roles as AI reports (no new people see student data) */
const STUDENT_REPORT_ROLES = ['org_admin', 'ceo', 'general_manager'];
/** Datasets are offered per panel; global roles use this one */
const PANEL = 'org_admin';
const MAX_COLUMNS = 60;
const PREVIEW_ROWS = 100;
const MAX_ROWS = 20000;

function sendError(res: Response, err: unknown) {
  if (err instanceof ReportError || err instanceof AccessError) {
    res.status(err.status).json({ success: false, message: err.message });
    return;
  }
  console.error('[student-reports] error', err);
  res.status(500).json({ success: false, message: 'Could not build the report. Please try again.' });
}

router.get('/columns', async (req: AuthRequest, res: Response) => {
  try {
    const ctx = await buildContext(req.user, STUDENT_REPORT_ROLES);
    const ds = datasetsFor(PANEL, ctx).students;
    if (!ds) throw new AccessError(403, 'You do not have access to student data');
    const groups = STUDENT_COLUMN_GROUPS
      .map((g) => ({
        label: g.label,
        fields: g.fields
          .filter((k) => ds.fields[k])
          .map((k) => ({ key: k, label: ds.fields[k].label, type: ds.fields[k].type, values: ds.fields[k].values ?? ds.fields[k].hints })),
      }))
      .filter((g) => g.fields.length > 0);
    res.json({ success: true, data: { groups, access: accessLabel(ctx, ds.scope(ctx)), previewRows: PREVIEW_ROWS, maxRows: MAX_ROWS } });
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/run', async (req: AuthRequest, res: Response) => {
  try {
    const ctx = await buildContext(req.user, STUDENT_REPORT_ROLES);
    const body = req.body ?? {};
    const raw = {
      title: 'Student report',
      dataset: 'students',
      mode: 'list',
      columns: Array.isArray(body.columns) ? body.columns : [],
      filters: Array.isArray(body.filters) ? body.filters : [],
      sort: body.sort,
      limit: Math.min(Math.max(parseInt(body.limit, 10) || PREVIEW_ROWS, 1), MAX_ROWS),
    };
    if (raw.columns.length === 0) throw new ReportError(400, 'Pick at least one column');
    if (raw.columns.length > MAX_COLUMNS) throw new ReportError(400, `Pick at most ${MAX_COLUMNS} columns`);
    // Unknown or not-allowed columns must fail loudly, not be silently dropped
    const ds = datasetsFor(PANEL, ctx).students;
    const bad = ds ? raw.columns.filter((c: unknown) => typeof c !== 'string' || !ds.fields[c]) : raw.columns;
    if (bad.length) throw new ReportError(400, `Column not allowed: ${bad.map(String).join(', ')}`);

    const { spec, ds: checked } = validateSpec(raw, datasetsFor(PANEL, ctx), { maxColumns: MAX_COLUMNS, maxListRows: MAX_ROWS });
    const result = await runSpec(spec, checked, ctx);

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.id,
        action: 'student_report_run',
        entityType: 'student_report',
        entityId: 'students',
        newValue: { columns: spec.columns, filters: spec.filters, rows: result.rows.length, limit: spec.limit } as any,
        ipAddress: req.ip || '0.0.0.0',
      },
    }).catch((e) => console.error('[student-reports] audit log error', e));

    res.json({ success: true, data: { ...result, access: accessLabel(ctx, checked.scope(ctx)) } });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
