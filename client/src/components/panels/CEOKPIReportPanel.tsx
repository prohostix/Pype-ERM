import { useEffect, useMemo, useState } from 'react';
import {
  Award, CheckCircle2, ChevronLeft, ChevronRight, Download, Flame, RefreshCw, Search, Star, Target, TrendingUp, Users, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';

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
  achieved: { label: 'Achieved', color: '#10b981', soft: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  on_track: { label: 'On track', color: '#6366f1', soft: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' },
  at_risk: { label: 'At risk', color: '#f59e0b', soft: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  missed: { label: 'Missed', color: '#f43f5e', soft: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
};
const pctOf = (k: KPI) => (k.target > 0 ? Math.min(100, Math.round((k.achieved / k.target) * 100)) : 0);
const heat = (pct: number) => (pct >= 100 ? '#10b981' : pct >= 75 ? '#6366f1' : pct >= 50 ? '#f59e0b' : '#f43f5e');
const initials = (name: string) => (name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const money = (n: number) => (numLocale() !== 'en-IN' ? compactMoney(n, 2) : n >= 100000 ? `${CS()}${(n / 100000).toFixed(2)} L` : `${CS()}${Math.round(n).toLocaleString(numLocale())}`);
const fmtVal = (k: KPI, v: number) => (k.unit === '₹' ? money(v) : `${v.toLocaleString(numLocale())}${k.unit && k.unit !== '₹' ? (k.unit === '%' ? '%' : ` ${k.unit}`) : ''}`);
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const CARD = 'rounded-3xl border-0 shadow-md ring-1 ring-border/60 py-6 gap-4';

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
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn('w-3.5 h-3.5', n <= (value || 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/25')} />)}
    </div>
  );
}

function Cell({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted-foreground/40">·</span>;
  const c = heat(pct);
  return <span className="inline-block min-w-[52px] rounded-lg px-2 py-1 text-xs font-bold tabular-nums" style={{ background: `${c}1f`, color: c }}>{pct}%</span>;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-indigo-600 text-white shadow-lg"><Target className="w-6 h-6" /></div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">KPI & KRA Report</h2>
            <p className="text-sm text-muted-foreground">Live targets, tasks and attendance for every employee, plus the KPIs and KRAs HR records.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-full border bg-card shadow-sm">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => shift(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="px-3 text-sm font-semibold min-w-[130px] text-center">{monthLabel || month}</span>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => shift(1)} disabled={isCurrentMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          {!isCurrentMonth && <Button variant="outline" size="sm" onClick={() => setMonth(monthKey(new Date()))}>This month</Button>}
          <Button variant="outline" size="icon" onClick={() => load()} disabled={loading} title="Refresh"><RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /></Button>
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}><Download className="w-4 h-4 mr-1.5" />Export</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className={cn(CARD, 'xl:col-span-2 bg-gradient-to-br from-emerald-50/70 via-white to-indigo-50/60 dark:from-emerald-950/20 dark:via-card dark:to-indigo-950/20')}>
          <CardContent className="px-7 grid grid-cols-1 md:grid-cols-[170px_1fr] gap-6 items-center">
            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3.4" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={heat(orgPct)} strokeWidth="3.4" strokeLinecap="round" strokeDasharray={`${(orgPct / 100) * 97.4} 97.4`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-3xl font-bold leading-none">{orgPct}%</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">achievement</p>
                </div>
              </div>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Tile icon={Users} tint="bg-indigo-500/10 text-indigo-600" label="Employees" value={`${scored.length}/${base.length}`} sub="with KPIs" />
                <Tile icon={CheckCircle2} tint="bg-emerald-500/10 text-emerald-600" label="KPIs achieved" value={`${mix[0].count}/${allKpis.length}`} />
                <Tile icon={Zap} tint="bg-amber-500/10 text-amber-600" label="At risk" value={String(counts.at_risk)} sub="employees" />
                <Tile icon={Flame} tint="bg-rose-500/10 text-rose-600" label="Missed" value={String(counts.missed)} sub="employees" />
              </div>
              <div>
                <div className="flex h-3.5 rounded-full overflow-hidden bg-muted">
                  {mix.filter((m) => m.count > 0).map((m) => <div key={m.key} title={`${m.label}: ${m.count}`} style={{ width: `${(m.count / (allKpis.length || 1)) * 100}%`, background: m.color }} />)}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5">
                  {mix.map((m) => <span key={m.key} className="inline-flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />{m.label}<b className="tabular-nums">{m.count}</b></span>)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={CARD}>
          <CardContent className="px-7">
            <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" />By department</h3>
            <div className="space-y-3 mt-4">
              {deptRows.length === 0 && <p className="text-sm text-muted-foreground">No department data for this month.</p>}
              {deptRows.map((d) => (
                <button key={d.name} className="w-full text-left" onClick={() => setDept(dept === d.name ? 'all' : d.name)}>
                  <div className="flex justify-between text-sm"><span className={cn('truncate font-medium', dept === d.name && 'text-primary')}>{d.name}</span><span className="font-bold tabular-nums" style={{ color: heat(d.pct) }}>{d.pct}%</span></div>
                  <div className="h-2 rounded-full bg-muted mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: `linear-gradient(90deg, ${heat(d.pct)}99, ${heat(d.pct)})` }} /></div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heat-map table */}
      <Card className={CARD}>
        <CardContent className="px-7 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {views.map((v) => (
                <button key={v.id} onClick={() => setView(v.id)}
                  className={cn('inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition', view === v.id ? 'bg-gradient-to-r from-emerald-500 to-indigo-600 text-white border-transparent shadow' : 'hover:border-foreground/30')}>
                  {v.label}<span className={cn('text-[11px] rounded-full px-1.5 tabular-nums', view === v.id ? 'bg-white/25' : 'bg-muted')}>{counts[v.id]}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 h-9 w-52" placeholder="Search name or role" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={dept} onValueChange={setDept}>
                <SelectTrigger className="h-9 w-44 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All departments</SelectItem>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                <SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="score-desc">Score: high to low</SelectItem><SelectItem value="score-asc">Score: low to high</SelectItem><SelectItem value="name">Name (A-Z)</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          {loading && data.length === 0 ? (
            <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />)}</div>
          ) : rows.length === 0 ? (
            <div className="py-14 text-center text-muted-foreground"><Award className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No employees match this view.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                    <th className="pb-2 pr-3 font-semibold">Employee</th>
                    {COLUMNS.map((c) => <th key={c.key} className="pb-2 px-3 font-semibold text-center">{c.label}</th>)}
                    <th className="pb-2 px-3 font-semibold text-center">KRA</th>
                    <th className="pb-2 pl-3 font-semibold min-w-[150px]">Score</th>
                    <th className="pb-2 w-6" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((e) => {
                    const has = e.kpiSummary.total > 0;
                    return (
                      <tr key={e.userId} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setOpen(e)}>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl text-xs font-bold text-white flex items-center justify-center shrink-0" style={{ background: has ? `linear-gradient(135deg, ${heat(e.kpiSummary.avgPct)}, ${heat(e.kpiSummary.avgPct)}aa)` : '#94a3b8' }}>{initials(e.name)}</span>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{e.name}</p>
                              <p className="text-xs text-muted-foreground truncate capitalize">{(e.designation || e.role || '').replace(/_/g, ' ')}{e.department ? ` · ${e.department}` : ''}</p>
                            </div>
                          </div>
                        </td>
                        {COLUMNS.map((c) => <td key={c.key} className="py-3 px-3 text-center"><Cell pct={groupPct(e, c.match)} /></td>)}
                        <td className="py-3 px-3 text-center">{e.kraSummary.avgRating ? <span className="inline-flex items-center gap-1 font-semibold"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{e.kraSummary.avgRating}</span> : <span className="text-muted-foreground/40">·</span>}</td>
                        <td className="py-3 pl-3">
                          {has ? (
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 flex-1 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${e.kpiSummary.avgPct}%`, background: `linear-gradient(90deg, ${heat(e.kpiSummary.avgPct)}99, ${heat(e.kpiSummary.avgPct)})` }} /></div>
                              <span className="font-bold tabular-nums w-10 text-right" style={{ color: heat(e.kpiSummary.avgPct) }}>{e.kpiSummary.avgPct}%</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">No KPIs yet</span>}
                        </td>
                        <td className="py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Sales target, Tasks and Attendance are worked out live for {monthLabel || 'the month'}. HR KPIs are the figures HR enters on the employee profile.</p>
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
          {open && <Detail emp={open} monthLabel={monthLabel} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Tile({ icon: Icon, tint, label, value, sub }: { icon: any; tint: string; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-card/80 p-3">
      <div className={cn('p-1.5 rounded-lg w-fit', tint)}><Icon className="w-4 h-4" /></div>
      <p className="text-xl font-bold mt-2 leading-none tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}{sub ? ` · ${sub}` : ''}</p>
    </div>
  );
}

function Detail({ emp, monthLabel }: { emp: EmployeeReport; monthLabel: string }) {
  const has = emp.kpiSummary.total > 0;
  return (
    <div>
      <div className="p-6 bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-800 text-white">
        <SheetHeader className="p-0">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 text-lg font-bold flex items-center justify-center">{initials(emp.name)}</span>
            <div className="min-w-0">
              <SheetTitle className="text-white text-xl truncate">{emp.name}</SheetTitle>
              <SheetDescription className="text-indigo-200 capitalize truncate">{(emp.designation || emp.role || '').replace(/_/g, ' ')}{emp.department ? ` · ${emp.department}` : ''}{emp.branch ? ` · ${emp.branch}` : ''}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-2 mt-5">
          <div className="rounded-2xl bg-white/10 border border-white/15 p-3 text-center"><p className="text-xl font-semibold">{has ? `${emp.kpiSummary.avgPct}%` : '—'}</p><p className="text-[10px] uppercase tracking-wider text-indigo-200">Score</p></div>
          <div className="rounded-2xl bg-white/10 border border-white/15 p-3 text-center"><p className="text-xl font-semibold">{emp.kpiSummary.achieved}/{emp.kpiSummary.total}</p><p className="text-[10px] uppercase tracking-wider text-indigo-200">Achieved</p></div>
          <div className="rounded-2xl bg-white/10 border border-white/15 p-3 text-center"><p className="text-xl font-semibold">{emp.kraSummary.avgRating ?? '—'}</p><p className="text-[10px] uppercase tracking-wider text-indigo-200">KRA rating</p></div>
        </div>
      </div>

      <div className="p-6 space-y-7">
        <section>
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3 flex items-center gap-2"><Target className="w-3.5 h-3.5" />KPIs · {monthLabel}</h4>
          {emp.kpis.length === 0 ? <p className="text-sm text-muted-foreground rounded-2xl bg-muted/50 p-4">No KPIs yet. Live ones appear once this person has a sales target, tasks due or attendance this month.</p> : (
            <div className="space-y-3">
              {emp.kpis.map((k) => {
                const p = pctOf(k); const st = STATUS[k.status] || STATUS.on_track;
                return (
                  <div key={k.id} className="rounded-2xl border p-4" style={{ borderLeft: `4px solid ${st.color}` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{k.title}</p>
                        <p className="text-[11px] text-muted-foreground">{k.source === 'manual' ? 'HR entered' : 'Live'}{k.category && k.source !== 'manual' ? ` · ${k.category}` : ''}{k.period ? ` · ${k.period}` : ''}</p>
                      </div>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0', st.soft)}>{st.label}</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-3">
                      <p className="text-lg font-bold tabular-nums">{fmtVal(k, k.achieved)}<span className="text-sm font-normal text-muted-foreground"> of {fmtVal(k, k.target)}</span></p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: heat(p) }}>{p}%</p>
                    </div>
                    <div className="h-2 rounded-full bg-muted mt-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p}%`, background: `linear-gradient(90deg, ${heat(p)}99, ${heat(p)})` }} /></div>
                    {k.description && <p className="text-xs text-muted-foreground mt-2">{k.description}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3 flex items-center gap-2"><Award className="w-3.5 h-3.5" />KRAs
            {emp.kras.length > 0 && emp.kraSummary.totalWeightage !== 100 && <span className="normal-case tracking-normal text-amber-600 font-medium">weightage adds to {emp.kraSummary.totalWeightage}%, not 100%</span>}
          </h4>
          {emp.kras.length === 0 ? <p className="text-sm text-muted-foreground rounded-2xl bg-muted/50 p-4">HR has not set key result areas for this person.</p> : (
            <div className="space-y-2">
              {emp.kras.map((k) => (
                <div key={k.id} className="rounded-2xl border p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="font-medium truncate">{k.area}</p><p className="text-[11px] text-muted-foreground">Weightage {k.weightage}%{k.remarks ? ` · “${k.remarks}”` : ''}</p></div>
                  <StarRow value={k.rating} />
                </div>
              ))}
            </div>
          )}
        </section>

        {(emp.overallRating || emp.reviewRemarks || emp.nextReviewDate) && (
          <section className="rounded-2xl bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-card border border-amber-200/60 dark:border-amber-900/40 p-4 space-y-2">
            <div className="flex items-center justify-between"><p className="font-semibold text-sm">Latest review</p>{emp.overallRating ? <StarRow value={emp.overallRating} /> : null}</div>
            {emp.reviewRemarks && <p className="text-sm italic text-muted-foreground">“{emp.reviewRemarks}”</p>}
            <p className="text-[11px] text-muted-foreground">{emp.lastReviewDate ? `Reviewed ${new Date(emp.lastReviewDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}{emp.nextReviewDate ? ` · next ${new Date(emp.nextReviewDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</p>
          </section>
        )}
      </div>
    </div>
  );
}
