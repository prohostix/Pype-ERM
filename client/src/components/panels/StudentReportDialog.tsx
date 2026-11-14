/**
 * Student Management → "Build Report": pick columns from a list, add filters, preview, export to Excel.
 * No AI. Uses GET /student-reports/columns and POST /student-reports/run; the server decides which
 * columns this user may see and which students they may read.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Columns3, Download, FileSpreadsheet, Filter,
  Loader2, Plus, Search, ShieldCheck, Table2, Trash2, X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FieldType = 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'enum';
interface Field { key: string; label: string; type: FieldType; values?: string[] }
interface Group { label: string; fields: Field[] }
interface Filter { id: number; field: string; op: string; value: string }
interface ReportColumn { key: string; label: string; type: FieldType }
interface Result { columns: ReportColumn[]; rows: Record<string, unknown>[]; meta: { truncated: boolean } }

const OPS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  string: [{ value: 'eq', label: 'is' }, { value: 'neq', label: 'is not' }, { value: 'contains', label: 'contains' }, { value: 'is_empty', label: 'is empty' }, { value: 'not_empty', label: 'is not empty' }],
  enum: [{ value: 'eq', label: 'is' }, { value: 'neq', label: 'is not' }],
  number: [{ value: 'eq', label: '=' }, { value: 'gt', label: '>' }, { value: 'gte', label: '≥' }, { value: 'lt', label: '<' }, { value: 'lte', label: '≤' }],
  date: [{ value: 'eq', label: 'on' }, { value: 'gte', label: 'on or after' }, { value: 'lte', label: 'on or before' }, { value: 'is_empty', label: 'is empty' }, { value: 'not_empty', label: 'is not empty' }],
  boolean: [{ value: 'eq', label: 'is' }],
};
const opsFor = (t: FieldType) => OPS_BY_TYPE[t === 'datetime' ? 'date' : t] ?? OPS_BY_TYPE.string;
const needsValue = (op: string) => op !== 'is_empty' && op !== 'not_empty';

/** One-click column sets. Keys the user can't see are skipped. */
const PRESETS: { label: string; keys: string[] }[] = [
  { label: 'Basic', keys: ['name', 'enrollmentNo', 'program', 'university', 'status'] },
  { label: 'Admission', keys: ['name', 'enrollmentNo', 'admissionNo', 'admissionDate', 'program', 'specialisation', 'session', 'studyCenter', 'branch', 'enrolledBy', 'status'] },
  { label: 'Contact', keys: ['name', 'enrollmentNo', 'phone', 'email', 'altPhone', 'address', 'pinCode'] },
  { label: 'Family', keys: ['name', 'enrollmentNo', 'fatherName', 'fatherPhone', 'motherName', 'motherPhone', 'guardianName', 'familyPhone'] },
];

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  pending: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
  completed: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  dropped: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  enrolled: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400',
};

function cell(v: unknown, type: FieldType): string {
  if (v === null || v === undefined || v === '') return '';
  if (type === 'boolean') return v ? 'Yes' : 'No';
  if (type === 'date' || type === 'datetime') {
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
  }
  return String(v);
}

export function StudentReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [access, setAccess] = useState('');
  const [loadingCols, setLoadingCols] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reqId = useRef(0);

  const allFields = useMemo(() => groups.flatMap((g) => g.fields), [groups]);
  const fields = useMemo(() => Object.fromEntries(allFields.map((f) => [f.key, f])) as Record<string, Field>, [allFields]);

  useEffect(() => {
    if (!open || groups.length) return;
    setLoadingCols(true);
    api.get('/student-reports/columns')
      .then((r) => {
        const gs: Group[] = r.data.data.groups || [];
        setGroups(gs);
        setAccess(r.data.data.access || '');
        const keys = new Set(gs.flatMap((g) => g.fields.map((f) => f.key)));
        setColumns((c) => (c.length ? c : PRESETS[0].keys.filter((k) => keys.has(k))));
      })
      .catch((e) => toast.error(e.response?.data?.message || 'Could not load report columns'))
      .finally(() => setLoadingCols(false));
  }, [open, groups.length]);

  const toggle = (k: string) => setColumns((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  const setGroup = (g: Group, on: boolean) =>
    setColumns((c) => (on ? [...c, ...g.fields.map((f) => f.key).filter((k) => !c.includes(k))] : c.filter((k) => !g.fields.some((f) => f.key === k))));
  const move = (k: string, dir: -1 | 1) =>
    setColumns((c) => {
      const i = c.indexOf(k);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.length) return c;
      const n = [...c];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const applyPreset = (keys: string[]) => setColumns(keys.filter((k) => fields[k]));

  const addFilter = () => {
    const f = fields.status ?? allFields[0];
    if (f) setFilters((fs) => [...fs, { id: Date.now(), field: f.key, op: opsFor(f.type)[0].value, value: '' }]);
  };
  const patchFilter = (id: number, p: Partial<Filter>) => setFilters((fs) => fs.map((f) => (f.id === id ? { ...f, ...p } : f)));

  const activeFilters = filters.filter((f) => !needsValue(f.op) || f.value.trim() !== '');
  const payload = (limit: number) => ({
    columns,
    limit,
    filters: activeFilters.map((f) => ({ field: f.field, op: f.op, ...(needsValue(f.op) ? { value: f.value.trim() } : {}) })),
  });
  const payloadKey = JSON.stringify(payload(100));

  // Live preview: refresh shortly after any column/filter change (stale responses are ignored)
  useEffect(() => {
    if (!open || !groups.length) return;
    if (!columns.length) { setResult(null); return; }
    const id = ++reqId.current;
    setRunning(true);
    const t = setTimeout(() => {
      api.post('/student-reports/run', JSON.parse(payloadKey))
        .then((r) => { if (id === reqId.current) setResult(r.data.data); })
        .catch((e) => { if (id === reqId.current) toast.error(e.response?.data?.message || 'Could not run the report'); })
        .finally(() => { if (id === reqId.current) setRunning(false); });
    }, 450);
    return () => clearTimeout(t);
  }, [open, groups.length, payloadKey, columns.length]);

  const exportExcel = async () => {
    if (!columns.length) { toast.error('Pick at least one column'); return; }
    setExporting(true);
    const id = toast.loading('Preparing Excel...');
    try {
      const r = await api.post('/student-reports/run', payload(20000));
      const data: Result = r.data.data;
      if (!data.rows.length) { toast.error('No students match', { id }); return; }
      const XLSX = await import('xlsx');
      const rows = data.rows.map((row) => Object.fromEntries(data.columns.map((c) => [c.label, cell(row[c.key], c.type)])));
      const ws = XLSX.utils.json_to_sheet(rows, { header: data.columns.map((c) => c.label) });
      ws['!cols'] = data.columns.map((c) => ({ wch: Math.min(40, Math.max(12, c.label.length + 4)) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');
      XLSX.writeFile(wb, `student_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Exported ${data.rows.length} student(s)${data.meta.truncated ? ' (first 20,000 only)' : ''}`, { id });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Export failed', { id });
    } finally {
      setExporting(false);
    }
  };

  const q = search.trim().toLowerCase();
  const visibleGroups = groups
    .map((g) => ({ ...g, fields: q ? g.fields.filter((f) => f.label.toLowerCase().includes(q)) : g.fields }))
    .filter((g) => g.fields.length > 0);

  const selectCls = 'h-8 text-xs rounded-lg bg-white dark:bg-slate-900';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[1180px] h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-900 space-y-0">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg leading-tight">Build Student Report</DialogTitle>
              <p className="text-xs text-muted-foreground">Choose the columns you need, add filters, then export to Excel.</p>
            </div>
            {access && (
              <span className="ml-auto hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900 rounded-full px-2.5 py-1 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" /> {access}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid md:grid-cols-[300px_minmax(0,1fr)] overflow-hidden">
          {/* Left: column picker */}
          <aside className="flex flex-col min-h-0 border-b md:border-b-0 md:border-r bg-slate-50/60 dark:bg-slate-900/40 max-h-[34vh] md:max-h-none">
            <div className="p-3 space-y-2.5 border-b">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold"><Columns3 className="w-4 h-4 text-blue-600" /> Columns</span>
                <span className="text-xs text-muted-foreground">{columns.length} of {allFields.length}</span>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search columns..." className="h-8 pl-8 text-xs rounded-lg bg-white dark:bg-slate-900" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.filter((p) => p.keys.some((k) => fields[k])).map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.keys)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 hover:text-blue-700 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setColumns(allFields.map((f) => f.key))}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 hover:text-blue-700 transition-colors"
                >
                  All
                </button>
                {columns.length > 0 && (
                  <button type="button" onClick={() => setColumns([])} className="text-[11px] font-medium px-2.5 py-1 rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingCols && <div className="py-8 text-center"><Loader2 className="w-4 h-4 animate-spin inline text-slate-400" /></div>}
              {!loadingCols && visibleGroups.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">No columns match "{search}"</p>
              )}
              {visibleGroups.map((g) => {
                const full = groups.find((x) => x.label === g.label)!;
                const picked = full.fields.filter((f) => columns.includes(f.key)).length;
                const open = q ? true : !collapsed[g.label];
                return (
                  <div key={g.label} className="rounded-lg">
                    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800/60">
                      <button
                        type="button"
                        onClick={() => setCollapsed((c) => ({ ...c, [g.label]: !c[g.label] }))}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1 text-left"
                      >
                        {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                        {g.label}
                        <span className={cn('text-[10px] font-bold px-1.5 rounded-full', picked ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-200/70 text-slate-500 dark:bg-slate-800')}>
                          {picked}/{full.fields.length}
                        </span>
                      </button>
                      <button type="button" className="text-[11px] text-blue-600 hover:underline" onClick={() => setGroup(full, picked !== full.fields.length)}>
                        {picked === full.fields.length ? 'None' : 'All'}
                      </button>
                    </div>
                    {open && (
                      <div className="ml-3 pl-2 border-l border-slate-200 dark:border-slate-700 mb-1">
                        {g.fields.map((f) => (
                          <label key={f.key} className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-white dark:hover:bg-slate-800/60 cursor-pointer text-[13px]">
                            <Checkbox checked={columns.includes(f.key)} onCheckedChange={() => toggle(f.key)} />
                            <span className="truncate">{f.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Right: selected columns, filters, preview */}
          <section className="flex flex-col min-h-0 min-w-0 p-4 gap-3 overflow-y-auto md:overflow-hidden">
            {/* Selected columns (order = order in Excel) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Report columns</span>
                {columns.length > 1 && <span className="text-[11px] text-muted-foreground">Use the arrows to reorder</span>}
              </div>
              {columns.length === 0 ? (
                <p className="text-xs text-muted-foreground border border-dashed rounded-lg px-3 py-2.5">Nothing selected. Tick columns on the left or choose a preset.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {columns.map((k, i) => (
                    <span key={k} className="group inline-flex items-center gap-0.5 pl-1 pr-1 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-200">
                      <button type="button" disabled={i === 0} onClick={() => move(k, -1)} className="p-0.5 rounded-full opacity-40 hover:opacity-100 disabled:opacity-10" title="Move left"><ArrowLeft className="w-3 h-3" /></button>
                      <span className="px-1 font-medium">{fields[k]?.label ?? k}</span>
                      <button type="button" disabled={i === columns.length - 1} onClick={() => move(k, 1)} className="p-0.5 rounded-full opacity-40 hover:opacity-100 disabled:opacity-10" title="Move right"><ArrowRight className="w-3 h-3" /></button>
                      <button type="button" onClick={() => toggle(k)} className="p-0.5 rounded-full hover:bg-blue-200/60 dark:hover:bg-blue-800/50" title="Remove"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="rounded-xl border bg-white dark:bg-slate-900/40">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Filter className="w-4 h-4 text-blue-600" /> Filters
                  {activeFilters.length > 0 && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 rounded-full">{activeFilters.length}</span>}
                </span>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-blue-600" onClick={addFilter} disabled={!groups.length}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add filter
                </Button>
              </div>
              <div className="p-3">
                {filters.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No filters. Every student you can see is included.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {filters.map((f) => {
                      const def = fields[f.field];
                      return (
                        <div key={f.id} className="flex flex-wrap items-center gap-2">
                          <Select value={f.field} onValueChange={(v) => patchFilter(f.id, { field: v, op: opsFor(fields[v].type)[0].value, value: '' })}>
                            <SelectTrigger className={cn(selectCls, 'w-44')}><SelectValue /></SelectTrigger>
                            <SelectContent>{allFields.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={f.op} onValueChange={(v) => patchFilter(f.id, { op: v })}>
                            <SelectTrigger className={cn(selectCls, 'w-32')}><SelectValue /></SelectTrigger>
                            <SelectContent>{opsFor(def.type).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                          </Select>
                          {needsValue(f.op) && (
                            def.type === 'boolean' ? (
                              <Select value={f.value} onValueChange={(v) => patchFilter(f.id, { value: v })}>
                                <SelectTrigger className={cn(selectCls, 'w-28')}><SelectValue placeholder="Value" /></SelectTrigger>
                                <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
                              </Select>
                            ) : def.values?.length && f.op !== 'contains' ? (
                              <Select value={f.value} onValueChange={(v) => patchFilter(f.id, { value: v })}>
                                <SelectTrigger className={cn(selectCls, 'w-40')}><SelectValue placeholder="Value" /></SelectTrigger>
                                <SelectContent>{def.values.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type={def.type === 'date' || def.type === 'datetime' ? 'date' : def.type === 'number' ? 'number' : 'text'}
                                value={f.value}
                                onChange={(e) => patchFilter(f.id, { value: e.target.value })}
                                className={cn(selectCls, 'w-40')}
                                placeholder="Value"
                              />
                            )
                          )}
                          <button type="button" onClick={() => setFilters((fs) => fs.filter((x) => x.id !== f.id))} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Remove filter">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="flex-1 min-h-[220px] flex flex-col rounded-xl border overflow-hidden bg-white dark:bg-slate-900/40">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50/70 dark:bg-slate-900/60">
                <span className="flex items-center gap-1.5 text-sm font-semibold"><Table2 className="w-4 h-4 text-blue-600" /> Preview</span>
                <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {running && <Loader2 className="w-3 h-3 animate-spin" />}
                  {result && !running && <>{result.rows.length}{result.meta.truncated ? '+' : ''} row(s){result.meta.truncated ? ' · first 100 shown' : ''}</>}
                </span>
              </div>
              <div className={cn('flex-1 overflow-auto transition-opacity', running && result && 'opacity-60')}>
                {!result ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground p-6 text-center">
                    {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Table2 className="w-8 h-8 text-slate-300" />}
                    {running ? 'Loading preview...' : 'Select columns to see a live preview.'}
                  </div>
                ) : (
                  <table className="w-full text-xs border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-right font-medium text-slate-400 px-3 py-2 w-10 border-b">#</th>
                        {result.columns.map((c) => (
                          <th key={c.key} className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-left font-semibold text-slate-700 dark:text-slate-200 px-3 py-2 whitespace-nowrap border-b">{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.length === 0 && (
                        <tr><td colSpan={result.columns.length + 1} className="px-3 py-10 text-center text-muted-foreground">No students match these filters.</td></tr>
                      )}
                      {result.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50">
                          <td className="px-3 py-1.5 text-right text-slate-400 border-b border-slate-100 dark:border-slate-800">{i + 1}</td>
                          {result.columns.map((c) => {
                            const text = cell(row[c.key], c.type);
                            const tone = c.key === 'status' ? STATUS_TONE[text.toLowerCase()] : undefined;
                            return (
                              <td key={c.key} className="px-3 py-1.5 whitespace-nowrap border-b border-slate-100 dark:border-slate-800">
                                {tone ? <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium capitalize', tone)}>{text}</span> : text || <span className="text-slate-300">–</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t bg-slate-50/70 dark:bg-slate-900/60">
          <span className="text-xs text-muted-foreground truncate">
            {columns.length} column{columns.length === 1 ? '' : 's'} · {activeFilters.length} filter{activeFilters.length === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
            <Button type="button" size="sm" onClick={exportExcel} disabled={exporting || !columns.length} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {exporting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />} Export Excel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
