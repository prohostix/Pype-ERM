/**
 * AI Reports: spec checker + query runner.
 *
 * Takes a report spec (from the AI, or edited by the user in the browser),
 * rejects anything not in the dataset list, ANDs in the tenant scope,
 * runs one read-only Prisma findMany and aggregates the rows in memory.
 *
 * Nothing in the spec is trusted: dataset, fields, operators and values are all
 * re-checked here on every call, including /run calls that skip the AI.
 */
import prisma from '../../lib/prisma.js';
import { DATASETS, DatasetDef, FieldDef } from './datasets.js';
import type { AccessContext } from './access.js';

export const AGGS = ['sum', 'avg', 'min', 'max', 'count', 'count_if', 'percent_if'] as const;
export const OPS = ['eq', 'neq', 'in', 'gt', 'gte', 'lt', 'lte', 'contains', 'is_empty', 'not_empty'] as const;
export const INTERVALS = ['day', 'week', 'month', 'quarter', 'year'] as const;
export const CHARTS = ['bar', 'line', 'pie', 'table', 'kpi'] as const;

type Agg = (typeof AGGS)[number];
type Op = (typeof OPS)[number];
type Interval = (typeof INTERVALS)[number];
type Chart = (typeof CHARTS)[number];

export interface ReportSpec {
  title: string;
  dataset: string;
  mode: 'aggregate' | 'list';
  /** count_if / percent_if: rows whose `field` is one of `values` (e.g. status in [absent]) */
  metrics: { field?: string; agg: Agg; values?: string[] }[];
  groupBy: string[];
  timeBucket?: { field: string; interval: Interval } | null;
  filters: { field: string; op: Op; value?: string; values?: string[] }[];
  columns: string[];
  sort?: { by: string; dir: 'asc' | 'desc' } | null;
  limit: number;
  chart: Chart;
}

export interface ReportColumn { key: string; label: string; type: 'string' | 'number' | 'date' | 'datetime' | 'boolean' }

export interface ReportResult {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  meta: { scannedRows: number; truncated: boolean; totalGroups?: number };
}

export class ReportError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Max rows read from the DB for one report. Above this the result is flagged as truncated. */
const MAX_SCAN = parseInt(process.env.AI_REPORTS_MAX_SCAN || '50000', 10);
const MAX_GROUPS = 200;
const MAX_LIST_ROWS = 500;
/** Business timezone offset for date filters and buckets (India by default) */
const TZ_OFFSET = process.env.REPORT_TZ_OFFSET || '+05:30';
const TZ_OFFSET_MIN = (() => {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(TZ_OFFSET);
  return m ? (m[1] === '-' ? -1 : 1) * (parseInt(m[2]) * 60 + parseInt(m[3])) : 330;
})();

const has = <T extends readonly string[]>(list: T, v: unknown): v is T[number] =>
  typeof v === 'string' && (list as readonly string[]).includes(v);

// ─── Validation ────────────────────────────────────────────────────────────────

/** `allowed` = datasetsFor(panel, ctx): only datasets this user can access */
export function validateSpec(raw: any, allowed: Record<string, DatasetDef>): { spec: ReportSpec; ds: DatasetDef } {
  if (!raw || typeof raw !== 'object') throw new ReportError(400, 'Invalid report spec');
  const ds = allowed[raw.dataset];
  if (!ds) {
    throw new ReportError(DATASETS[raw.dataset] ? 403 : 400,
      DATASETS[raw.dataset] ? 'You do not have access to this data' : `Unknown dataset: ${raw.dataset}`);
  }

  const field = (key: unknown, what: string): FieldDef => {
    const f = typeof key === 'string' ? ds.fields[key] : undefined;
    if (!f) throw new ReportError(400, `Field not allowed in ${what}: ${String(key)}`);
    return f;
  };

  const mode = raw.mode === 'list' ? 'list' : 'aggregate';

  // metrics
  let metrics: ReportSpec['metrics'] = [];
  for (const m of Array.isArray(raw.metrics) ? raw.metrics.slice(0, 5) : []) {
    if (!has(AGGS, m?.agg)) throw new ReportError(400, `Unknown aggregation: ${m?.agg}`);
    if (m.agg === 'count') { metrics.push({ agg: 'count' }); continue; }
    if (m.agg === 'count_if' || m.agg === 'percent_if') {
      const f = field(m.field, 'metrics');
      if (!f.groupable && f.type !== 'boolean' && f.type !== 'enum') throw new ReportError(400, `Cannot count by field: ${m.field}`);
      const values = (Array.isArray(m.values) ? m.values : [m.value]).map((v: unknown) => String(v ?? '').trim()).filter(Boolean).slice(0, 10);
      if (!values.length) throw new ReportError(400, `${m.agg} needs "values" for ${m.field}`);
      for (const v of values) coerce(f, v, m.field);
      metrics.push({ field: m.field, agg: m.agg, values });
      continue;
    }
    const f = field(m.field, 'metrics');
    if (!f.aggregatable) throw new ReportError(400, `Cannot ${m.agg} field: ${m.field}`);
    metrics.push({ field: m.field, agg: m.agg });
  }
  if (mode === 'aggregate' && metrics.length === 0) metrics = [{ agg: 'count' }];

  // groupBy
  const groupBy: string[] = [];
  for (const g of Array.isArray(raw.groupBy) ? raw.groupBy : []) {
    if (!field(g, 'groupBy').groupable) throw new ReportError(400, `Cannot group by field: ${g}`);
    if (!groupBy.includes(g)) groupBy.push(g);
  }

  // timeBucket
  let timeBucket: ReportSpec['timeBucket'] = null;
  if (raw.timeBucket && raw.timeBucket.field) {
    if (field(raw.timeBucket.field, 'timeBucket').type !== 'date') throw new ReportError(400, 'timeBucket must use a date field');
    timeBucket = { field: raw.timeBucket.field, interval: has(INTERVALS, raw.timeBucket.interval) ? raw.timeBucket.interval : 'month' };
  }
  if (groupBy.length + (timeBucket ? 1 : 0) > 2) throw new ReportError(400, 'At most 2 groupings (including the time bucket) are supported');

  // filters
  const filters: ReportSpec['filters'] = [];
  for (const fl of Array.isArray(raw.filters) ? raw.filters.slice(0, 15) : []) {
    const f = field(fl?.field, 'filters');
    if (!has(OPS, fl.op)) throw new ReportError(400, `Unknown filter operator: ${fl.op}`);
    if (fl.op === 'contains' && f.type !== 'string') throw new ReportError(400, `"contains" only works on text fields`);
    if (['gt', 'gte', 'lt', 'lte'].includes(fl.op) && !['number', 'date'].includes(f.type)) {
      throw new ReportError(400, `"${fl.op}" only works on number or date fields`);
    }
    const values = fl.op === 'in' ? (Array.isArray(fl.values) ? fl.values : String(fl.value ?? '').split(',')).map((v: unknown) => String(v).trim()).filter(Boolean).slice(0, 50) : undefined;
    const value = ['in', 'is_empty', 'not_empty'].includes(fl.op) ? undefined : String(fl.value ?? '');
    for (const v of values ?? (value !== undefined ? [value] : [])) coerce(f, v, fl.field); // throws on bad values
    filters.push({ field: fl.field, op: fl.op, ...(values ? { values } : {}), ...(value !== undefined ? { value } : {}) });
  }

  // columns (list mode)
  let columns: string[] = (Array.isArray(raw.columns) ? raw.columns : []).filter((c: unknown) => typeof c === 'string' && ds.fields[c as string]);
  if (mode === 'list' && columns.length === 0) columns = Object.keys(ds.fields).slice(0, 8);
  columns = [...new Set(columns)].slice(0, 12);

  // sort: a field key (list) or an output column key (aggregate) — checked after we know output columns
  const sort = raw.sort && typeof raw.sort.by === 'string'
    ? { by: raw.sort.by, dir: raw.sort.dir === 'asc' ? 'asc' as const : 'desc' as const }
    : null;

  const maxLimit = mode === 'list' ? MAX_LIST_ROWS : MAX_GROUPS;
  const limit = Math.min(Math.max(parseInt(raw.limit, 10) || maxLimit, 1), maxLimit);

  let chart: Chart = has(CHARTS, raw.chart) ? raw.chart : 'table';
  if (mode === 'list') chart = 'table';
  else if (groupBy.length === 0 && !timeBucket) chart = 'kpi';

  const title = String(raw.title || ds.label).slice(0, 150);

  return { spec: { title, dataset: raw.dataset, mode, metrics, groupBy, timeBucket, filters, columns, sort, limit, chart }, ds };
}

/** Parse a filter value for a field type; throws ReportError on bad input */
function coerce(f: FieldDef, v: string, key: string): unknown {
  switch (f.type) {
    case 'number': {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new ReportError(400, `"${v}" is not a number for ${key}`);
      return n;
    }
    case 'boolean':
      if (!['true', 'false'].includes(v.toLowerCase())) throw new ReportError(400, `${key} must be true or false`);
      return v.toLowerCase() === 'true';
    case 'date': {
      const d = parseDate(v);
      if (!d) throw new ReportError(400, `"${v}" is not a valid date for ${key}`);
      return d;
    }
    case 'enum':
      if (!f.values?.includes(v)) throw new ReportError(400, `"${v}" is not a valid value for ${key}`);
      return v;
    default:
      return v.slice(0, 200);
  }
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
function parseDate(v: string): Date | null {
  const d = DATE_ONLY.test(v) ? new Date(`${v}T00:00:00${TZ_OFFSET}`) : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Query building ───────────────────────────────────────────────────────────

/** {a:{b:{c: cond}}} from ['a','b','c'] */
function nest(path: string[], leaf: unknown): Record<string, unknown> {
  return path.reduceRight<unknown>((acc, key) => ({ [key]: acc }), leaf) as Record<string, unknown>;
}

function filterToWhere(f: FieldDef, key: string, fl: ReportSpec['filters'][number]): Record<string, unknown> {
  if (fl.op === 'is_empty') return nest(f.path, { equals: null });
  if (fl.op === 'not_empty') return nest(f.path, { not: null });
  if (fl.op === 'in') return nest(f.path, { in: fl.values!.map((v) => coerce(f, v, key)) });

  let value = coerce(f, fl.value!, key);
  let op: string = fl.op;
  // "lte 2026-03-31" on a date means "up to the end of that day"
  if (f.type === 'date' && DATE_ONLY.test(fl.value!) && (op === 'lte' || op === 'gt')) {
    value = new Date((value as Date).getTime() + 86_400_000);
    op = op === 'lte' ? 'lt' : 'gte';
  }
  const text = f.type === 'string' ? { mode: 'insensitive' } : {}; // "chennai" matches "Chennai"
  const cond =
    op === 'eq' ? { equals: value, ...text } :
    op === 'neq' ? { not: value, ...text } :
    op === 'contains' ? { contains: value, mode: 'insensitive' } :
    { [op]: value };
  return nest(f.path, cond);
}

/** Nested Prisma select for the given paths */
function buildSelect(paths: string[][]): Record<string, unknown> {
  const select: Record<string, any> = {};
  for (const path of paths) {
    let node = select;
    path.forEach((key, i) => {
      if (i === path.length - 1) { if (node[key] === undefined) node[key] = true; return; }
      if (!node[key] || node[key] === true) node[key] = { select: {} };
      node = node[key].select;
    });
  }
  return select;
}

function getPath(row: any, path: string[]): unknown {
  return path.reduce((acc, k) => (acc == null ? acc : acc[k]), row);
}

// ─── Date buckets ──────────────────────────────────────────────────────────────

function bucket(d: Date, interval: Interval): string {
  const local = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000); // read with UTC getters = business-local time
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  switch (interval) {
    case 'year': return `${y}`;
    case 'quarter': return `${y}-Q${Math.floor(m / 3) + 1}`;
    case 'month': return `${y}-${pad(m + 1)}`;
    case 'week': {
      const day = (local.getUTCDay() + 6) % 7; // Monday = 0
      const monday = new Date(Date.UTC(y, m, local.getUTCDate() - day));
      return `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
    }
    default: return `${y}-${pad(m + 1)}-${pad(local.getUTCDate())}`;
  }
}

// ─── Run ───────────────────────────────────────────────────────────────────────

export function metricKey(m: ReportSpec['metrics'][number]): string {
  if (m.agg === 'count') return 'count';
  if (m.agg === 'count_if' || m.agg === 'percent_if') {
    return `${m.agg === 'count_if' ? 'count' : 'pct'}_${m.field}_${(m.values ?? []).join('_')}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }
  return `${m.agg}_${m.field}`;
}

const humanize = (v: string) => v.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

function metricLabel(m: ReportSpec['metrics'][number], ds: DatasetDef): string {
  if (m.agg === 'count') return 'Count';
  const f = ds.fields[m.field!];
  if (m.agg === 'count_if' || m.agg === 'percent_if') {
    const vals = m.values ?? [];
    const named = Object.entries(ds.valueSetLabels ?? {}).find(([, set]) =>
      set.length === vals.length && set.every((v) => vals.map((x) => x.toLowerCase()).includes(v)))?.[0];
    const what = named ?? (f.type === 'boolean'
      ? (vals.length === 1 && vals[0] === 'false' ? `Not ${f.label.toLowerCase()}` : f.label)
      : vals.map(humanize).join(' / '));
    return m.agg === 'count_if' ? what : `% ${what}`;
  }
  return `${{ sum: 'Total', avg: 'Average', min: 'Min', max: 'Max' }[m.agg as 'sum' | 'avg' | 'min' | 'max']} ${f.label.toLowerCase()}`;
}

const colType = (f: FieldDef): ReportColumn['type'] =>
  f.type === 'number' ? 'number' : f.type === 'date' ? (f.time ? 'datetime' : 'date') : f.type === 'boolean' ? 'boolean' : 'string';

/**
 * Prisma silently IGNORES `undefined` in a where clause, which would widen a query.
 * Refuse to run any query that contains one.
 */
function assertNoUndefined(value: unknown, path = 'where'): void {
  if (value === undefined) throw new ReportError(500, `Report blocked: missing access value at ${path}`);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const [k, v] of Object.entries(value)) assertNoUndefined(v, `${path}.${k}`);
  }
}

/** In-memory version of filterToWhere, for computed (virtual) datasets */
function matchFilter(row: Record<string, unknown>, f: FieldDef, key: string, fl: ReportSpec['filters'][number]): boolean {
  const v = getPath(row, f.path);
  if (fl.op === 'is_empty') return v === null || v === undefined || v === '';
  if (fl.op === 'not_empty') return !(v === null || v === undefined || v === '');
  const norm = (x: unknown): unknown =>
    x instanceof Date ? x.getTime() : typeof x === 'string' && f.type === 'date' ? new Date(x).getTime() : typeof x === 'string' ? x.toLowerCase() : x;
  if (fl.op === 'in') return fl.values!.some((val) => norm(coerce(f, val, key)) === norm(v));
  let target = coerce(f, fl.value!, key);
  let op: string = fl.op;
  if (f.type === 'date' && DATE_ONLY.test(fl.value!) && (op === 'lte' || op === 'gt')) {
    target = new Date((target as Date).getTime() + 86_400_000);
    op = op === 'lte' ? 'lt' : 'gte';
  }
  if (f.type === 'date' && DATE_ONLY.test(fl.value!) && op === 'eq') {
    const t = norm(v) as number, s0 = (target as Date).getTime();
    return t >= s0 && t < s0 + 86_400_000;
  }
  const a = norm(v) as number | string | boolean, b = norm(target) as number | string | boolean;
  switch (op) {
    case 'eq': return a === b;
    case 'neq': return a !== b;
    case 'contains': return String(a ?? '').includes(String(b));
    case 'gt': return a != null && a > b;
    case 'gte': return a != null && a >= b;
    case 'lt': return a != null && a < b;
    case 'lte': return a != null && a <= b;
    default: return true;
  }
}

/** Date range for a virtual dataset, from the spec's filters on its date field (default: today) */
function virtualRange(spec: ReportSpec, ds: DatasetDef): { from: Date; to: Date } {
  const key = ds.defaultDateField;
  const today = parseDate(new Date(Date.now() + TZ_OFFSET_MIN * 60_000).toISOString().slice(0, 10))!;
  let from: Date | null = null, to: Date | null = null;
  for (const fl of spec.filters.filter((x) => x.field === key && x.value)) {
    const d = parseDate(fl.value!);
    if (!d) continue;
    if (fl.op === 'eq') { from = d; to = d; }
    if (fl.op === 'gte' || fl.op === 'gt') from = d;
    if (fl.op === 'lte' || fl.op === 'lt') to = d;
  }
  from ??= to ?? today;
  to ??= today;
  if (to > today) to = today;
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  if (days > (ds.maxDays ?? 62)) throw new ReportError(400, `Daily attendance works for up to ${ds.maxDays ?? 62} days at a time. Please pick a shorter period.`);
  if (days < 1) throw new ReportError(400, 'The date range is empty.');
  return { from, to };
}

export async function runSpec(spec: ReportSpec, ds: DatasetDef, ctx: AccessContext): Promise<ReportResult> {
  if (!ctx.organizationId) throw new ReportError(403, 'AI reports need an organization account');
  const scope = ds.scope(ctx);
  if (!scope) throw new ReportError(403, 'You do not have access to this data');
  const orgLock = ds.orgLock ? ds.orgLock(ctx.organizationId) : { organizationId: ctx.organizationId };
  const where = {
    AND: [
      orgLock, // 1) hard organization lock — independent of the dataset's scope rules
      scope,   // 2) this user's row restriction (branch, center, team, own records…)
      ...spec.filters.map((fl) => filterToWhere(ds.fields[fl.field], fl.field, fl)),
    ],
  };
  assertNoUndefined(where);

  const dims = [
    ...(spec.timeBucket ? [{ key: spec.timeBucket.field, f: ds.fields[spec.timeBucket.field], interval: spec.timeBucket.interval }] : []),
    ...spec.groupBy.map((g) => ({ key: g, f: ds.fields[g], interval: undefined as Interval | undefined })),
  ];
  const metricFields = spec.metrics.filter((m) => m.field).map((m) => ds.fields[m.field!]);

  // Rows: from the database, or computed (virtual datasets such as daily attendance)
  let rows: any[];
  let virtualTruncated = false;
  if (ds.virtual) {
    const all = await ds.virtual(ctx, virtualRange(spec, ds), scope);
    rows = all.filter((row) => spec.filters.every((fl) => matchFilter(row, ds.fields[fl.field], fl.field, fl)));
    if (spec.mode === 'list') {
      const sortField = spec.sort && ds.fields[spec.sort.by] ? ds.fields[spec.sort.by] : ds.fields[ds.defaultDateField];
      const dir = spec.sort?.dir === 'asc' ? 1 : -1;
      rows.sort((a, b) => {
        const x = getPath(a, sortField.path), y = getPath(b, sortField.path);
        const nx = x instanceof Date ? x.getTime() : x, ny = y instanceof Date ? y.getTime() : y;
        return dir * (typeof nx === 'number' && typeof ny === 'number' ? nx - ny : String(nx ?? '').localeCompare(String(ny ?? '')));
      });
    }
    virtualTruncated = rows.length > MAX_SCAN;
  } else {
    const delegate = (prisma as any)[ds.model];
    if (!delegate?.findMany) throw new ReportError(500, `Dataset model not found: ${ds.model}`);
    if (spec.mode === 'list') {
      const sortField = spec.sort && ds.fields[spec.sort.by];
      rows = await delegate.findMany({
        where,
        select: buildSelect(spec.columns.map((c) => ds.fields[c].path)),
        orderBy: sortField ? nest(sortField.path, spec.sort!.dir) : nest(ds.fields[ds.defaultDateField].path, 'desc'),
        take: spec.limit + 1,
      });
    } else {
      rows = await delegate.findMany({
        where,
        select: buildSelect([...dims.map((d) => d.f.path), ...metricFields.map((f) => f.path), ['id']]),
        take: MAX_SCAN + 1,
      });
    }
  }

  // ── List mode: plain rows ──
  if (spec.mode === 'list') {
    return {
      columns: spec.columns.map((c) => ({ key: c, label: ds.fields[c].label, type: colType(ds.fields[c]) })),
      rows: rows.slice(0, spec.limit).map((r) => Object.fromEntries(spec.columns.map((c) => [c, getPath(r, ds.fields[c].path) ?? null]))),
      meta: { scannedRows: Math.min(rows.length, spec.limit), truncated: rows.length > spec.limit },
    };
  }

  // ── Aggregate mode: group in memory ──
  const truncated = virtualTruncated || rows.length > MAX_SCAN;
  const scanned = truncated ? rows.slice(0, MAX_SCAN) : rows;

  type Acc = { dims: unknown[]; n: number; base: number; m: { sum: number; cnt: number; min: number; max: number; hits: number }[] };
  const excl = ds.excludeFromPercent;
  const exclSet = excl ? new Set(excl.values) : null;
  const groups = new Map<string, Acc>();
  const condSets = spec.metrics.map((m) => (m.values ? new Set(m.values.map((v) => v.toLowerCase())) : null));
  for (const row of scanned) {
    const dimValues = dims.map((d) => {
      const v = getPath(row, d.f.path);
      if (d.interval) return v ? bucket(new Date(v as string), d.interval) : '(no date)';
      if (v === null || v === undefined || v === '') return '(none)';
      return typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);
    });
    const k = JSON.stringify(dimValues);
    let acc = groups.get(k);
    if (!acc) {
      acc = { dims: dimValues, n: 0, base: 0, m: spec.metrics.map(() => ({ sum: 0, cnt: 0, min: Infinity, max: -Infinity, hits: 0 })) };
      groups.set(k, acc);
    }
    acc.n++;
    const inBase = !exclSet || !exclSet.has(String(getPath(row, ds.fields[excl!.field].path)));
    if (inBase) acc.base++;
    spec.metrics.forEach((m, i) => {
      if (!m.field) return;
      const raw = getPath(row, ds.fields[m.field].path);
      if (m.agg === 'count_if' || m.agg === 'percent_if') {
        if (raw !== null && raw !== undefined && condSets[i]!.has(String(raw).toLowerCase())) {
          if (m.agg === 'count_if' || inBase) acc!.m[i].hits++;
        }
        return;
      }
      const v = Number(raw);
      if (!Number.isFinite(v)) return;
      const a = acc!.m[i];
      a.sum += v; a.cnt++; a.min = Math.min(a.min, v); a.max = Math.max(a.max, v);
    });
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  let out = [...groups.values()].map((g) => {
    const r: Record<string, unknown> = {};
    dims.forEach((d, i) => { r[d.key] = g.dims[i]; });
    spec.metrics.forEach((m, i) => {
      const a = g.m[i];
      r[metricKey(m)] =
        m.agg === 'count' ? g.n :
        m.agg === 'count_if' ? a.hits :
        m.agg === 'percent_if' ? (g.base ? round((a.hits / g.base) * 100) : null) :
        m.agg === 'sum' ? round(a.sum) :
        a.cnt === 0 ? null :
        m.agg === 'avg' ? round(a.sum / a.cnt) :
        m.agg === 'min' ? a.min : a.max;
    });
    return r;
  });

  const columns: ReportColumn[] = [
    ...dims.map((d) => ({
      key: d.key,
      label: d.interval ? `${d.f.label} (${d.interval})` : d.f.label,
      type: 'string' as const,
    })),
    ...spec.metrics.map((m) => ({ key: metricKey(m), label: metricLabel(m, ds), type: 'number' as const })),
  ];

  // Sort: explicit column, else time order for time series, else first metric desc
  const sortKey = spec.sort && columns.some((c) => c.key === spec.sort!.by) ? spec.sort.by : null;
  const dir = spec.sort?.dir === 'asc' ? 1 : -1;
  const cmp = (a: unknown, b: unknown) =>
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a ?? '').localeCompare(String(b ?? ''));
  if (sortKey) out.sort((a, b) => dir * cmp(a[sortKey], b[sortKey]));
  else if (spec.timeBucket) out.sort((a, b) => cmp(a[spec.timeBucket!.field], b[spec.timeBucket!.field]));
  else out.sort((a, b) => -cmp(a[metricKey(spec.metrics[0])], b[metricKey(spec.metrics[0])]));

  const totalGroups = out.length;
  out = out.slice(0, spec.limit);

  return { columns, rows: out, meta: { scannedRows: scanned.length, truncated, totalGroups } };
}
