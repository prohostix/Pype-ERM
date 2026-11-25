import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ListPagination } from '@/components/ui/list-pagination';

import { CS, numLocale, compactMoney } from '@/lib/currency';
// ─── Types ────────────────────────────────────────────────────────────────────
interface KPI {
  id: string; title: string; description?: string; target: number; achieved: number; unit: string; period: string;
  status: 'on_track' | 'at_risk' | 'achieved' | 'missed'; source?: 'auto' | 'manual'; category?: string;
}
interface KRA { id: string; area: string; description?: string; weightage: number; rating?: number; remarks?: string }
interface EmployeeReport {
  userId: string; name: string; email: string; designation?: string; role: string; department: string; branch?: string; status: string;
  overallRating?: number; lastReviewDate?: string; nextReviewDate?: string; reviewRemarks?: string;
  kpis: KPI[]; kpiSummary: { total: number; achieved: number; atRisk: number; missed: number; avgPct: number };
  kras: KRA[]; kraSummary: { total: number; avgRating: string | null; totalWeightage: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; soft: string }> = {
  achieved: { label: 'Achieved', color: '#256c1d', soft: 'bg-[#dff3da] text-[#256c1d]' },
  on_track: { label: 'On track', color: '#54b947', soft: 'bg-[#eaf6e6] text-[#256c1d]' },
  at_risk: { label: 'At risk', color: '#f5b942', soft: 'bg-amber-100 text-amber-700' },
  missed: { label: 'Missed', color: '#ef6f64', soft: 'bg-red-100 text-red-700' },
};
const pctOf = (k: KPI) => (k.target > 0 ? Math.min(100, Math.round((k.achieved / k.target) * 100)) : 0);
const heat = (pct: number) => (pct >= 100 ? '#256c1d' : pct >= 75 ? '#54b947' : pct >= 50 ? '#f5b942' : '#ef6f64');
const initials = (name: string) => (name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const money = (n: number) => (numLocale() !== 'en-IN' ? compactMoney(n, 2) : n >= 100000 ? `${CS()}${(n / 100000).toFixed(2)} L` : `${CS()}${Math.round(n).toLocaleString(numLocale())}`);
const fmtVal = (k: KPI, v: number) => (k.unit === '₹' ? money(v) : `${v.toLocaleString(numLocale())}${k.unit && k.unit !== '₹' ? (k.unit === '%' ? '%' : ` ${k.unit}`) : ''}`);
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const CARD = 'rounded-3xl bg-white border border-slate-100 overflow-hidden';
const starsText = (n?: number) => (n ? `${n}/5` : '—');

/** Average completion of one group of KPIs (e.g. every sales target), or null when the person has none. */
const groupPct = (emp: EmployeeReport, match: (k: KPI) => boolean): number | null => {
  const list = emp.kpis.filter(match);
  return list.length ? Math.round(list.reduce((s, k) => s + pctOf(k), 0) / list.length) : null;
};
const COLUMNS: { key: string; label: string; match: (k: KPI) => boolean }[] = [
  { key: 'sales', label: 'Sales target', match: (k) => k.category === 'Sales target' },
  { key: 'tasks', label: 'Tasks', match: (k) => k.category === 'Tasks' },
  { key: 'att', label: 'Attendance', match: (k) => k.category === 'Attendance' },
  { key: 'hr', label: 'HR KPIs', match: (k) => k.source === 'manual' },
];

function StarRow({ value }: { value?: number }) {
  return (
    <div className="flex gap-1" title={starsText(value)}>
      {[1, 2, 3, 4, 5].map((n) => <span key={n} className={cn('w-2.5 h-2.5 rounded-full', n <= (value || 0) ? 'bg-[#54b947]' : 'bg-slate-200')} />)}
    </div>
  );
}

function Cell({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-slate-300">·</span>;
  const c = heat(pct);
  return <span className="inline-block min-w-[52px] rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums bg-white" style={{ color: c, border: `1px solid ${c}55` }}>{pct}%</span>;
}

// ─── Panel ────────────────────────────────────────────────────────────────────
export function CEOKPIReportPanel() {
  const [data, setData] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [monthLabel, setMonthLabel] = useState('');
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');
  const [view, setView] = useState<'all' | 'at_risk' | 'missed' | 'top' | 'nodata'>('all');
  const [sort, setSort] = useState<'score-desc' | 'score-asc' | 'name'>('score-desc');
  const [open, setOpen] = useState<EmployeeReport | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async (m = month) => {
    setLoading(true);
    try {
      const res = await api.get('/ceo/kpi-kra-report', { params: { month: m } });
      setMonthLabel(res.data?.monthLabel || '');
      const rows: any[] = Array.isArray(res.data?.data) ? res.data.data : [];
      setData(rows.map((r) => ({
        ...r,
        name: r?.name || 'Employee', department: r?.department || '',
        kpis: Array.isArray(r?.kpis) ? r.kpis : [], kras: Array.isArray(r?.kras) ? r.kras : [],
        kpiSummary: r?.kpiSummary || { total: 0, achieved: 0, atRisk: 0, missed: 0, avgPct: 0 },
        kraSummary: r?.kraSummary || { total: 0, avgRating: null, totalWeightage: 0 },
      })));
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load the KPI / KRA report');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(month); }, [month]);
  useEffect(() => { setPage(1); }, [search, dept, view, sort, pageSize, month]);

  const shift = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    setMonth(monthKey(new Date(y, m - 1 + delta, 1)));
  };
  const isCurrentMonth = month === monthKey(new Date());

  const departments = useMemo(() => [...new Set(data.map((d) => d.department).filter(Boolean))].sort(), [data]);

  const base = data.filter((e) => {
    const q = search.trim().toLowerCase();
    return (dept === 'all' || e.department === dept)
      && (!q || e.name.toLowerCase().includes(q) || (e.department || '').toLowerCase().includes(q) || (e.designation || '').toLowerCase().includes(q) || (e.role || '').toLowerCase().includes(q));
  });
  const counts = {
    all: base.length,
    at_risk: base.filter((e) => e.kpiSummary.atRisk > 0).length,
    missed: base.filter((e) => e.kpiSummary.missed > 0).length,
    top: base.filter((e) => e.kpiSummary.total > 0 && e.kpiSummary.avgPct >= 90).length,
    nodata: base.filter((e) => e.kpiSummary.total === 0).length,
  };
  const rows = base
    .filter((e) => view === 'all' || (view === 'at_risk' ? e.kpiSummary.atRisk > 0 : view === 'missed' ? e.kpiSummary.missed > 0 : view === 'top' ? e.kpiSummary.total > 0 && e.kpiSummary.avgPct >= 90 : e.kpiSummary.total === 0))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'score-asc' ? a.kpiSummary.avgPct - b.kpiSummary.avgPct : b.kpiSummary.avgPct - a.kpiSummary.avgPct);

  // organisation numbers follow the department filter
  const scored = base.filter((e) => e.kpiSummary.total > 0);
  const orgPct = scored.length ? Math.round(scored.reduce((s, e) => s + e.kpiSummary.avgPct, 0) / scored.length) : 0;
  const allKpis = scored.flatMap((e) => e.kpis);
  const mix = (['achieved', 'on_track', 'at_risk', 'missed'] as const).map((k) => ({ key: k, ...STATUS[k], count: allKpis.filter((x) => x.status === k).length }));
  const deptRows = useMemo(() => departments.map((d) => {
    const people = data.filter((e) => e.department === d && e.kpiSummary.total > 0);
    return { name: d, people: people.length, pct: people.length ? Math.round(people.reduce((s, e) => s + e.kpiSummary.avgPct, 0) / people.length) : 0 };
  }).filter((d) => d.people > 0).sort((a, b) => b.pct - a.pct).slice(0, 7), [data, departments]);

  const exportCsv = () => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Name', 'Department', 'Role', 'KPIs', 'Achieved', 'At risk', 'Missed', 'Score %', 'Avg KRA rating'];
    const lines = rows.map((e) => [e.name, e.department, (e.designation || e.role || '').replace(/_/g, ' '), e.kpiSummary.total, e.kpiSummary.achieved, e.kpiSummary.atRisk, e.kpiSummary.missed, e.kpiSummary.avgPct, e.kraSummary.avgRating ?? ''].map(esc).join(','));
    const blob = new Blob([[head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `kpi-report-${month}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const views: { id: typeof view; label: string }[] = [
    { id: 'all', label: 'Everyone' }, { id: 'at_risk', label: 'At risk' }, { id: 'missed', label: 'Missed' }, { id: 'top', label: 'Top 90%+' }, { id: 'nodata', label: 'No KPIs' },
  ];

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const stats = [
    { label: 'Employees with KPIs', value: `${scored.length} / ${base.length}` },
    { label: 'KPIs achieved', value: `${mix[0].count} / ${allKpis.length}` },
    { label: 'Employees at risk', value: String(counts.at_risk), warn: counts.at_risk > 0 },
    { label: 'Employees missed', value: String(counts.missed), bad: counts.missed > 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">KPI & KRA Report</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Live targets, tasks and attendance for every employee, plus the KPIs and KRAs HR records.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white h-11">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => shift(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="px-2 text-sm font-semibold min-w-[130px] text-center">{monthLabel || month}</span>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => shift(1)} disabled={isCurrentMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          {!isCurrentMonth && <Button variant="outline" className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]" onClick={() => setMonth(monthKey(new Date()))}>This month</Button>}
          <Button variant="outline" onClick={() => load()} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"><RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh</Button>
          <Button onClick={exportCsv} disabled={rows.length === 0} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"><Download className="w-4 h-4 mr-2" />Export</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={cn(CARD, 'xl:col-span-2')}>
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
            <div className="p-6 sm:p-8 flex flex-col items-center justify-center md:border-r border-b md:border-b-0 border-slate-100">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f4f6f3" strokeWidth="3.4" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={heat(orgPct)} strokeWidth="3.4" strokeLinecap="round" strokeDasharray={`${(orgPct / 100) * 97.4} 97.4`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-3xl font-semibold leading-none">{orgPct}%</p>
                  <p className="text-xs text-muted-foreground mt-1.5">achievement</p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8 space-y-6">
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
                  {stats.map((t) => (
                    <div key={t.label} className="p-4">
                      <p className="text-xs font-medium text-slate-500">{t.label}</p>
                      <p className={cn('text-2xl font-semibold tracking-tight mt-1 tabular-nums', t.bad ? 'text-red-600' : t.warn ? 'text-amber-600' : 'text-slate-900')}>{t.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex h-3.5 rounded-full overflow-hidden bg-[#f4f6f3]">
                  {mix.filter((m) => m.count > 0).map((m) => <div key={m.key} title={`${m.label}: ${m.count}`} style={{ width: `${(m.count / (allKpis.length || 1)) * 100}%`, background: m.color }} />)}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
                  {mix.map((m) => <span key={m.key} className="inline-flex items-center gap-2 text-sm text-slate-600"><span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />{m.label}<b className="tabular-nums text-slate-900">{m.count}</b></span>)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={CARD}>
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-semibold tracking-tight">By department</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Tap one to filter the table</p>
          </div>
          <div className="p-5 sm:p-6 space-y-2">
            {deptRows.length === 0 && <p className="text-sm text-muted-foreground">No department data for this month.</p>}
            {deptRows.map((d) => (
              <button key={d.name} type="button" className={cn('w-full text-left rounded-2xl px-4 py-3 transition-colors', dept === d.name ? 'bg-[#eaf6e6]' : 'bg-[#f4f6f3] hover:bg-[#eef5ec]')} onClick={() => setDept(dept === d.name ? 'all' : d.name)}>
                <div className="flex justify-between text-sm"><span className="truncate font-semibold text-slate-900">{d.name}</span><span className="font-semibold tabular-nums" style={{ color: heat(d.pct) }}>{d.pct}%</span></div>
                <div className="h-2 rounded-full bg-white mt-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: heat(d.pct) }} /></div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Employee table */}
      <div className={CARD}>
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Employees</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{rows.length} of {data.length} people</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10 h-10 w-56 rounded-full bg-[#f4f6f3] border-0" placeholder="Search name or role" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="h-10 w-44 rounded-full bg-white border-slate-200 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All departments</SelectItem>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as any)}>
              <SelectTrigger className="h-10 w-44 rounded-full bg-white border-slate-200 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="score-desc">Score: high to low</SelectItem><SelectItem value="score-asc">Score: low to high</SelectItem><SelectItem value="name">Name (A-Z)</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {views.map((v) => (
              <button key={v.id} type="button" onClick={() => setView(v.id)}
                className={cn('inline-flex items-center gap-2 rounded-full px-3.5 h-9 text-xs font-semibold transition', view === v.id ? 'bg-[#0b1d14] text-white' : 'bg-[#f4f6f3] text-slate-700 hover:bg-[#eef5ec]')}>
                {v.label}<span className="tabular-nums opacity-80">{counts[v.id]}</span>
              </button>
            ))}
          </div>

          {loading && data.length === 0 ? (
            <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No employees match this view.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="pb-3 pr-3 font-medium">Employee</th>
                    {COLUMNS.map((c) => <th key={c.key} className="pb-3 px-3 font-medium text-center">{c.label}</th>)}
                    <th className="pb-3 px-3 font-medium text-center">KRA</th>
                    <th className="pb-3 pl-3 font-medium min-w-[150px]">Score</th>
                    <th className="pb-3 w-6" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageRows.map((e) => {
                    const has = e.kpiSummary.total > 0;
                    return (
                      <tr key={e.userId} className="hover:bg-[#f7faf6] cursor-pointer transition-colors" onClick={() => setOpen(e)}>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-full bg-[#f4f6f3] text-xs font-semibold text-slate-700 flex items-center justify-center shrink-0">{initials(e.name)}</span>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{e.name}</p>
                              <p className="text-xs text-muted-foreground truncate capitalize">{(e.designation || e.role || '').replace(/_/g, ' ')}{e.department ? ` · ${e.department}` : ''}</p>
                            </div>
                          </div>
                        </td>
                        {COLUMNS.map((c) => <td key={c.key} className="py-3 px-3 text-center"><Cell pct={groupPct(e, c.match)} /></td>)}
                        <td className="py-3 px-3 text-center">{e.kraSummary.avgRating ? <span className="font-semibold tabular-nums">{e.kraSummary.avgRating}<span className="text-muted-foreground font-normal">/5</span></span> : <span className="text-slate-300">·</span>}</td>
                        <td className="py-3 pl-3">
                          {has ? (
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 flex-1 rounded-full bg-[#f4f6f3] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${e.kpiSummary.avgPct}%`, background: heat(e.kpiSummary.avgPct) }} /></div>
                              <span className="font-semibold tabular-nums w-10 text-right" style={{ color: heat(e.kpiSummary.avgPct) }}>{e.kpiSummary.avgPct}%</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">No KPIs yet</span>}
                        </td>
                        <td className="py-3"><ChevronRight className="w-4 h-4 text-slate-400" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <ListPagination total={rows.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          <p className="text-xs text-muted-foreground">Sales target, Tasks and Attendance are worked out live for {monthLabel || 'the month'}. HR KPIs are the figures HR enters on the employee profile.</p>
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 bg-white">
          {open && <Detail emp={open} monthLabel={monthLabel} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SectionLabel({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return <h4 className="text-lg font-semibold tracking-tight mb-3 flex items-baseline gap-3 flex-wrap">{children}{extra}</h4>;
}

function Detail({ emp, monthLabel }: { emp: EmployeeReport; monthLabel: string }) {
  const has = emp.kpiSummary.total > 0;
  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  return (
    <div style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
      <div className="p-6 border-b border-slate-100">
        <SheetHeader className="p-0">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-full bg-[#f4f6f3] text-lg font-semibold text-slate-700 flex items-center justify-center">{initials(emp.name)}</span>
            <div className="min-w-0">
              <SheetTitle className="text-xl font-semibold truncate">{emp.name}</SheetTitle>
              <SheetDescription className="capitalize truncate">{(emp.designation || emp.role || '').replace(/_/g, ' ')}{emp.department ? ` · ${emp.department}` : ''}{emp.branch ? ` · ${emp.branch}` : ''}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="rounded-2xl border border-slate-100 overflow-hidden mt-5">
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="p-4"><p className="text-xs font-medium text-slate-500">Score</p><p className="text-2xl font-semibold mt-1 tabular-nums">{has ? `${emp.kpiSummary.avgPct}%` : '—'}</p></div>
            <div className="p-4"><p className="text-xs font-medium text-slate-500">Achieved</p><p className="text-2xl font-semibold mt-1 tabular-nums">{emp.kpiSummary.achieved}/{emp.kpiSummary.total}</p></div>
            <div className="p-4"><p className="text-xs font-medium text-slate-500">KRA rating</p><p className="text-2xl font-semibold mt-1 tabular-nums">{emp.kraSummary.avgRating ?? '—'}</p></div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-7">
        <section>
          <SectionLabel extra={<span className="text-sm font-normal text-muted-foreground">{monthLabel}</span>}>KPIs</SectionLabel>
          {emp.kpis.length === 0 ? <p className="text-sm text-muted-foreground rounded-2xl bg-[#f4f6f3] p-4">No KPIs yet. Live ones appear once this person has a sales target, tasks due or attendance this month.</p> : (
            <div className="space-y-3">
              {emp.kpis.map((k) => {
                const p = pctOf(k); const st = STATUS[k.status] || STATUS.on_track;
                return (
                  <div key={k.id} className="rounded-2xl bg-[#f4f6f3] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{k.title}</p>
                        <p className="text-xs text-muted-foreground">{k.source === 'manual' ? 'HR entered' : 'Live'}{k.category && k.source !== 'manual' ? ` · ${k.category}` : ''}{k.period ? ` · ${k.period}` : ''}</p>
                      </div>
                      <span className={cn('rounded-full px-3 py-0.5 text-xs font-semibold shrink-0', st.soft)}>{st.label}</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-3">
                      <p className="text-lg font-semibold tabular-nums">{fmtVal(k, k.achieved)}<span className="text-sm font-normal text-muted-foreground"> of {fmtVal(k, k.target)}</span></p>
                      <p className="text-sm font-semibold tabular-nums" style={{ color: heat(p) }}>{p}%</p>
                    </div>
                    <div className="h-2 rounded-full bg-white mt-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p}%`, background: heat(p) }} /></div>
                    {k.description && <p className="text-xs text-muted-foreground mt-2">{k.description}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <SectionLabel extra={emp.kras.length > 0 && emp.kraSummary.totalWeightage !== 100 ? <span className="text-xs font-medium text-amber-600">weightage adds to {emp.kraSummary.totalWeightage}%, not 100%</span> : undefined}>KRAs</SectionLabel>
          {emp.kras.length === 0 ? <p className="text-sm text-muted-foreground rounded-2xl bg-[#f4f6f3] p-4">HR has not set key result areas for this person.</p> : (
            <div className="space-y-2">
              {emp.kras.map((k) => (
                <div key={k.id} className="rounded-2xl bg-[#f4f6f3] px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="font-semibold text-slate-900 truncate">{k.area}</p><p className="text-xs text-muted-foreground">Weightage {k.weightage}%{k.remarks ? ` · “${k.remarks}”` : ''}</p></div>
                  <StarRow value={k.rating} />
                </div>
              ))}
            </div>
          )}
        </section>

        {(emp.overallRating || emp.reviewRemarks || emp.nextReviewDate) && (
          <section className="rounded-2xl bg-[#eaf6e6] p-4 space-y-2">
            <div className="flex items-center justify-between"><p className="font-semibold text-sm text-[#256c1d]">Latest review</p>{emp.overallRating ? <StarRow value={emp.overallRating} /> : null}</div>
            {emp.reviewRemarks && <p className="text-sm italic text-slate-700">“{emp.reviewRemarks}”</p>}
            <p className="text-xs text-slate-600">{emp.lastReviewDate ? `Reviewed ${fmtDate(emp.lastReviewDate)}` : ''}{emp.nextReviewDate ? ` · next ${fmtDate(emp.nextReviewDate)}` : ''}</p>
          </section>
        )}
      </div>
    </div>
  );
}
