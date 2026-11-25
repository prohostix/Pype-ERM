import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Download, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ListPagination } from '@/components/ui/list-pagination';

import { numLocale } from '@/lib/currency';
// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceInfo {
  status: string;
  checkIn?: string;
  checkOut?: string;
  isLate?: boolean;
  lateMinutes?: number;
  workingHours?: number;
}

interface TaskInfo {
  total: number;
  completedToday: number;
  inProgress: number;
  overdue: number;
  list: any[];
}

interface UsageInfo {
  tracked: boolean;
  activeHours?: number; idleHours?: number; awayHours?: number; leaves?: number;
  firstSeen?: string; lastSeen?: string;
  pages?: { page: string; hours: number }[];
  segments?: [number, number, 'a' | 'i' | 'w'][];
}

interface EmployeeReport {
  userId: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  department: string;
  departmentId?: any;
  attendance: AttendanceInfo | null;
  productiveHours: number;
  scheduledHours: number;
  timeWasted: number | null;
  breakMinutes: number;
  erpActions: number;
  ermActivity: Record<string, number>;
  usage?: UsageInfo;
  tasks: TaskInfo;
}

interface DeptSummary {
  departmentId: string;
  name: string;
  totalEmployees: number;
  present: number;
  absent: number;
  late: number;
  avgProductiveHours: number;
  totalErmActions: number;
  totalTasksCompleted: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CARD = 'rounded-3xl bg-white border border-slate-100 overflow-hidden';
const STATUS: Record<string, { label: string; color: string; soft: string }> = {
  present: { label: 'Present', color: '#54b947', soft: 'bg-[#dff3da] text-[#256c1d]' },
  wfh: { label: 'Work from home', color: '#256c1d', soft: 'bg-[#eaf6e6] text-[#256c1d]' },
  late: { label: 'Late', color: '#f5b942', soft: 'bg-amber-100 text-amber-700' },
  half_day: { label: 'Half day', color: '#f5b942', soft: 'bg-amber-100 text-amber-700' },
  leave: { label: 'On leave', color: '#64748b', soft: 'bg-slate-100 text-slate-600' },
  absent: { label: 'Absent', color: '#ef6f64', soft: 'bg-red-100 text-red-700' },
};
const st = (s?: string | null) => STATUS[s || 'absent'] || STATUS.absent;
const initials = (name: string) => (name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const clock = (time?: string) => (time ? new Date(time).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '—');
const hoursLabel = (h: number) => {
  const hrs = Math.floor(h); const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};
const here = (e: EmployeeReport) => !!e.attendance?.checkIn;
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ─── Panel ────────────────────────────────────────────────────────────────────

export function EmployeeActivityReportPanel() {
  const [date, setDate] = useState(() => dayKey(new Date()));
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [view, setView] = useState<'all' | 'present' | 'late' | 'absent'>('all');
  const [sortOrder, setSortOrder] = useState('dept');
  const [departments, setDepartments] = useState<DeptSummary[]>([]);
  const [report, setReport] = useState<EmployeeReport[]>([]);
  const [scheduledHours, setScheduledHours] = useState(8);
  const [loading, setLoading] = useState(false);
  const [deptList, setDeptList] = useState<any[]>([]);
  const [open, setOpen] = useState<EmployeeReport | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { api.get('/departments').then((r) => setDeptList(r.data.data || [])).catch(() => {}); }, []);
  useEffect(() => { fetchReport(); }, [date, deptFilter]);
  useEffect(() => { setPage(1); }, [search, view, sortOrder, deptFilter, date, pageSize]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = { date };
      if (deptFilter !== 'all') params.departmentId = deptFilter;
      const res = await api.get('/hr/attendance/activity-report', { params });
      setReport(res.data.data || []);
      setDepartments(res.data.departments || []);
      setScheduledHours(res.data.scheduledHours ?? 8);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load activity report');
    } finally {
      setLoading(false);
    }
  };

  const shift = (days: number) => { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + days); setDate(dayKey(d)); };
  const isToday = date === dayKey(new Date());
  const prettyDate = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const totals = useMemo(() => {
    const present = report.filter((e) => here(e) && e.attendance?.status !== 'absent').length;
    const late = report.filter((e) => e.attendance?.isLate).length;
    const absent = report.filter((e) => !here(e)).length;
    const tracked = report.filter((e) => e.usage?.tracked);
    const productive = tracked.reduce((s, e) => s + (e.usage?.activeHours || 0), 0);
    const trackedCount = tracked.length;
    return {
      present, late, absent, total: report.length,
      avgProductive: trackedCount ? productive / trackedCount : 0,
      trackedCount,
      erm: report.reduce((s, e) => s + e.erpActions, 0),
      done: report.reduce((s, e) => s + e.tasks.completedToday, 0),
    };
  }, [report]);

  const counts = {
    all: report.length,
    present: report.filter((e) => here(e)).length,
    late: report.filter((e) => e.attendance?.isLate).length,
    absent: report.filter((e) => !here(e)).length,
  };
  const q = search.trim().toLowerCase();
  const rows = report
    .filter((e) => !q || e.name.toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q) || (e.department || '').toLowerCase().includes(q))
    .filter((e) => view === 'all' || (view === 'present' ? here(e) : view === 'late' ? !!e.attendance?.isLate : !here(e)))
    .sort((a, b) => {
      if (sortOrder === 'late') return (b.attendance?.isLate ? b.attendance.lateMinutes || 1 : 0) - (a.attendance?.isLate ? a.attendance.lateMinutes || 1 : 0) || a.name.localeCompare(b.name);
      if (sortOrder === 'productive_desc') return (b.productiveHours || 0) - (a.productiveHours || 0);
      if (sortOrder === 'wasted_desc') return (b.timeWasted || 0) - (a.timeWasted || 0);
      if (sortOrder === 'erm') return b.erpActions - a.erpActions;
      return a.department.localeCompare(b.department) || a.name.localeCompare(b.name);
    });

  const exportCsv = () => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Name', 'Department', 'Status', 'Check-in', 'Check-out', 'Working hours', 'Active in ERM (h)', 'Idle + away (h)', 'Times left the tab', 'ERM actions', 'Tasks done today', 'Tasks total'];
    const lines = rows.map((e) => [e.name, e.department, st(e.attendance?.status).label, clock(e.attendance?.checkIn), clock(e.attendance?.checkOut), e.attendance?.workingHours ?? '', e.usage?.tracked ? e.usage.activeHours?.toFixed(2) : '', e.usage?.tracked ? ((e.usage.idleHours || 0) + (e.usage.awayHours || 0)).toFixed(2) : '', e.usage?.tracked ? e.usage.leaves : '', e.erpActions, e.tasks.completedToday, e.tasks.total].map(esc).join(','));
    const blob = new Blob([[head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `activity-report-${date}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const attPct = totals.total ? Math.round((counts.present / totals.total) * 100) : 0;
  const views: { id: typeof view; label: string }[] = [{ id: 'all', label: 'Everyone' }, { id: 'present', label: 'Checked in' }, { id: 'late', label: 'Late' }, { id: 'absent', label: 'Not in' }];

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const stats = [
    { label: 'Checked in', value: String(counts.present) },
    { label: 'Late', value: String(totals.late), warn: totals.late > 0 },
    { label: 'Not in', value: String(totals.absent), bad: totals.absent > 0 },
    { label: totals.trackedCount ? `Avg active in ERM (${totals.trackedCount} tracked)` : 'Avg active in ERM', value: totals.trackedCount ? hoursLabel(totals.avgProductive) : '—' },
    { label: 'ERM actions', value: totals.erm.toLocaleString(numLocale()) },
    { label: 'Tasks done today', value: String(totals.done) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Employee Activity Report</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Who was in, how long they actually used the platform and what got done. Scheduled {hoursLabel(scheduledHours)}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white h-11">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => shift(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <label className="relative px-2 text-sm font-semibold min-w-[150px] text-center cursor-pointer inline-flex items-center justify-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              {new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              <input type="date" value={date} max={dayKey(new Date())} onChange={(e) => e.target.value && setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => shift(1)} disabled={isToday}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          {!isToday && <Button variant="outline" className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]" onClick={() => setDate(dayKey(new Date()))}>Today</Button>}
          <Button variant="outline" onClick={fetchReport} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"><RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh</Button>
          <Button onClick={exportCsv} disabled={rows.length === 0} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"><Download className="w-4 h-4 mr-2" />Export</Button>
        </div>
      </div>

      {/* Day at a glance */}
      <div className={CARD}>
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr]">
          <div className="p-6 sm:p-8 flex items-center gap-6 lg:border-r border-b lg:border-b-0 border-slate-100">
            <div className="relative w-28 h-28 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f4f6f3" strokeWidth="3.6" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#54b947" strokeWidth="3.6" strokeLinecap="round" strokeDasharray={`${(attPct / 100) * 97.4} 97.4`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><p className="text-2xl font-semibold leading-none">{attPct}%</p><p className="text-xs text-muted-foreground mt-1">checked in</p></div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{prettyDate}</p>
              <p className="text-2xl font-semibold mt-1">{counts.present} of {totals.total}</p>
              <p className="text-sm text-muted-foreground">employees checked in</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-slate-100">
            {stats.map((t) => (
              <div key={t.label} className="p-5 sm:p-6">
                <p className="text-sm font-medium text-slate-500">{t.label}</p>
                <p className={cn('text-3xl font-semibold tracking-tight mt-2 tabular-nums', t.bad ? 'text-red-600' : t.warn ? 'text-amber-600' : 'text-slate-900')}>{t.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Departments */}
      {departments.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {departments.map((d) => {
            const pct = d.totalEmployees ? Math.round((d.present / d.totalEmployees) * 100) : 0;
            const active = deptFilter === d.departmentId;
            return (
              <button key={d.departmentId} type="button" onClick={() => setDeptFilter(active ? 'all' : d.departmentId)}
                className={cn('shrink-0 w-[240px] text-left rounded-3xl bg-white border p-5 transition-colors', active ? 'border-[#54b947] bg-[#f7faf6]' : 'border-slate-100 hover:border-[#cfe9c9]')}>
                <div className="flex items-center justify-between gap-2"><p className="font-semibold text-sm truncate">{d.name}</p><span className="text-sm font-semibold tabular-nums" style={{ color: pct >= 80 ? '#256c1d' : pct >= 50 ? '#b7791f' : '#dc2626' }}>{pct}%</span></div>
                <div className="h-2 rounded-full bg-[#f4f6f3] mt-3 overflow-hidden"><div className="h-full rounded-full bg-[#54b947]" style={{ width: `${pct}%` }} /></div>
                <div className="flex justify-between text-xs text-muted-foreground mt-3">
                  <span><b className="text-slate-900">{d.present}</b> in</span><span><b className="text-slate-900">{d.late}</b> late</span><span><b className="text-slate-900">{d.absent}</b> out</span>
                  <span>{hoursLabel(d.avgProductiveHours)} avg</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Roster */}
      <div className={CARD}>
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Roster</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{rows.length} of {report.length} people</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative"><Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-10 h-10 w-56 rounded-full bg-[#f4f6f3] border-0" placeholder="Search name or department" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-10 w-44 rounded-full bg-white border-slate-200 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All departments</SelectItem>{deptList.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="h-10 w-48 rounded-full bg-white border-slate-200 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dept">Department, then name</SelectItem><SelectItem value="late">Late first</SelectItem><SelectItem value="productive_desc">Most productive</SelectItem>
                <SelectItem value="wasted_desc">Most time wasted</SelectItem><SelectItem value="erm">Most ERM actions</SelectItem>
              </SelectContent>
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

          {loading && report.length === 0 ? (
            <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No one matches this day and filter.</p>
          ) : (
            <div className="space-y-2">
              {pageRows.map((e) => <Row key={e.userId} emp={e} scheduled={scheduledHours} onOpen={() => setOpen(e)} />)}
            </div>
          )}
          <ListPagination total={rows.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0 bg-white">
          {open && <Detail emp={open} scheduled={scheduledHours} date={prettyDate} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** Time in the platform: active (green), idle (amber), away from the tab (grey), sized against the scheduled day. */
function HoursBar({ emp, scheduled, tall }: { emp: EmployeeReport; scheduled: number; tall?: boolean }) {
  const u = emp.usage;
  const act = u?.activeHours || 0, idle = u?.idleHours || 0, away = u?.awayHours || 0;
  const span = Math.max(scheduled, act + idle + away, 1);
  const pct = (h: number) => `${Math.min(100, (h / span) * 100)}%`;
  return (
    <div className={cn('flex rounded-full overflow-hidden bg-white', tall ? 'h-3.5' : 'h-2.5')} title={`Active ${hoursLabel(act)} · idle ${hoursLabel(idle)} · away ${hoursLabel(away)}`}>
      <div style={{ width: pct(act), background: '#54b947' }} />
      <div style={{ width: pct(idle), background: '#f5b942' }} />
      <div style={{ width: pct(away), background: '#cbd5e1' }} />
    </div>
  );
}

function Row({ emp, scheduled, onOpen }: { emp: EmployeeReport; scheduled: number; onOpen: () => void }) {
  const s = st(emp.attendance?.status);
  const inn = here(emp);
  const rate = scheduled ? (emp.usage?.activeHours || 0) / scheduled : 0;
  const prodColor = !emp.usage?.tracked ? '#94a3b8' : rate >= 0.8 ? '#256c1d' : rate >= 0.5 ? '#b7791f' : '#dc2626';
  return (
    <button type="button" onClick={onOpen} className="w-full text-left rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors px-4 py-3.5 grid grid-cols-[auto_1fr_auto] lg:grid-cols-[minmax(210px,1.1fr)_150px_minmax(200px,1.4fr)_90px_90px_28px] gap-x-4 gap-y-3 items-center">
      <div className="flex items-center gap-3 min-w-0 col-span-2 lg:col-span-1">
        <span className="w-10 h-10 rounded-full bg-white text-xs font-semibold text-slate-700 flex items-center justify-center shrink-0">{initials(emp.name)}</span>
        <div className="min-w-0"><p className="font-semibold text-slate-900 truncate">{emp.name}</p><p className="text-xs text-muted-foreground truncate">{emp.department || '—'} · {emp.designation || (emp.role || '').replace(/_/g, ' ')}</p></div>
      </div>
      <div className="justify-self-end lg:justify-self-start">
        <span className={cn('inline-block rounded-full px-3 py-0.5 text-xs font-semibold', inn ? s.soft : 'bg-red-100 text-red-700')}>{inn ? s.label : 'Not in'}</span>
        <p className="text-xs text-muted-foreground mt-1 tabular-nums">{inn ? `${clock(emp.attendance?.checkIn)} – ${emp.attendance?.checkOut ? clock(emp.attendance.checkOut) : 'now'}` : '—'}{emp.attendance?.isLate ? <span className="text-amber-600 font-medium"> · +{emp.attendance.lateMinutes}m</span> : null}</p>
      </div>
      <div className="col-span-3 lg:col-span-1">
        {emp.usage?.tracked ? (
          <>
            <HoursBar emp={emp} scheduled={scheduled} />
            <div className="flex justify-between text-xs mt-1.5">
              <span className="font-semibold tabular-nums" style={{ color: prodColor }}>{hoursLabel(emp.usage.activeHours || 0)} active</span>
              <span className="text-muted-foreground tabular-nums">{hoursLabel((emp.usage.idleHours || 0) + (emp.usage.awayHours || 0))} idle or away{emp.usage.leaves ? ` · left ${emp.usage.leaves}×` : ''}</span>
            </div>
          </>
        ) : <p className="text-xs text-muted-foreground">{inn ? 'No platform usage tracked' : 'No attendance recorded'}</p>}
      </div>
      <div className="hidden lg:block text-center"><p className="font-semibold tabular-nums">{emp.erpActions}</p><p className="text-[11px] text-muted-foreground">ERM actions</p></div>
      <div className="hidden lg:block text-center"><p className="font-semibold tabular-nums"><span className="text-[#256c1d]">{emp.tasks.completedToday}</span><span className="text-muted-foreground font-normal">/{emp.tasks.total}</span></p><p className="text-[11px] text-muted-foreground">Tasks{emp.tasks.overdue > 0 ? <span className="text-red-600 font-semibold"> · {emp.tasks.overdue} late</span> : ''}</p></div>
      <ChevronRight className="w-4 h-4 text-slate-400 hidden lg:block" />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="text-lg font-semibold tracking-tight mb-3">{children}</h4>;
}

function Detail({ emp, scheduled, date }: { emp: EmployeeReport; scheduled: number; date: string }) {
  const s = st(emp.attendance?.status);
  const inn = here(emp);
  const erm = Object.entries(emp.ermActivity || {}).sort((a, b) => b[1] - a[1]);
  const maxErm = Math.max(1, ...erm.map((x) => x[1]));
  return (
    <div style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
      <div className="p-6 border-b border-slate-100">
        <SheetHeader className="p-0">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-full bg-[#f4f6f3] text-lg font-semibold text-slate-700 flex items-center justify-center">{initials(emp.name)}</span>
            <div className="min-w-0">
              <SheetTitle className="text-xl font-semibold truncate">{emp.name}</SheetTitle>
              <SheetDescription className="truncate capitalize">{emp.designation || (emp.role || '').replace(/_/g, ' ')}{emp.department ? ` · ${emp.department}` : ''}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <p className="text-xs text-muted-foreground mt-4">{date}</p>
        <div className="rounded-2xl border border-slate-100 overflow-hidden mt-2">
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <Stat label="Status" value={inn ? s.label : 'Not in'} />
            <Stat label="Check-in" value={clock(emp.attendance?.checkIn)} />
            <Stat label="Check-out" value={emp.attendance?.checkOut ? clock(emp.attendance.checkOut) : inn ? 'Still in' : '—'} />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-7">
        <section>
          <SectionLabel>Time in the platform</SectionLabel>
          {emp.usage?.tracked ? (
            <div className="rounded-2xl bg-[#f4f6f3] p-4 space-y-4">
              <HoursBar emp={emp} scheduled={scheduled} tall />
              <div className="grid grid-cols-3 gap-2 text-center">
                <Mini color="#54b947" label="Active" value={hoursLabel(emp.usage.activeHours || 0)} />
                <Mini color="#f5b942" label="Idle" value={hoursLabel(emp.usage.idleHours || 0)} />
                <Mini color="#cbd5e1" label="Away from tab" value={hoursLabel(emp.usage.awayHours || 0)} />
              </div>
              <Timeline segments={emp.usage.segments || []} />
              <p className="text-xs text-muted-foreground">
                First seen {clock(emp.usage.firstSeen)}, last seen {clock(emp.usage.lastSeen)}. Left the platform tab {emp.usage.leaves || 0} time{emp.usage.leaves === 1 ? '' : 's'}.
                Idle means no mouse or keyboard for 5 minutes. Time with the tab closed, the computer asleep or offline is not counted.
              </p>
              {emp.usage.pages && emp.usage.pages.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Where the active time went</p>
                  <div className="space-y-2">
                    {emp.usage.pages.map((pg) => (
                      <div key={pg.page}>
                        <div className="flex justify-between text-sm"><span className="capitalize truncate">{pg.page.replace(/[_-]/g, ' ')}</span><b className="tabular-nums">{hoursLabel(pg.hours)}</b></div>
                        <div className="h-1.5 rounded-full bg-white mt-1 overflow-hidden"><div className="h-full rounded-full bg-[#54b947]" style={{ width: `${(pg.hours / (emp.usage!.pages![0].hours || 1)) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {inn && <p className="text-xs text-muted-foreground border-t border-white pt-3">Attendance: worked {hoursLabel(emp.attendance?.workingHours || 0)} of a {hoursLabel(scheduled)} day{emp.attendance?.isLate ? `, arrived ${emp.attendance.lateMinutes} minutes late` : ''}.</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground rounded-2xl bg-[#f4f6f3] p-4">
              No platform usage was recorded for this day. {inn ? `Attendance shows ${hoursLabel(emp.attendance?.workingHours || 0)} worked.` : 'No attendance either.'} Usage is only recorded from the day tracking was switched on, and only while the platform is open in a browser.
            </p>
          )}
        </section>

        <section>
          <SectionLabel>ERM activity · {emp.erpActions} actions</SectionLabel>
          {erm.length === 0 ? <p className="text-sm text-muted-foreground rounded-2xl bg-[#f4f6f3] p-4">No ERM activity recorded.</p> : (
            <div className="rounded-2xl bg-[#f4f6f3] p-4 space-y-3">
              {erm.map(([key, count]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm"><span className="capitalize truncate">{key.replace(/_/g, ' ')}</span><b className="tabular-nums">{count}</b></div>
                  <div className="h-2 rounded-full bg-white mt-1 overflow-hidden"><div className="h-full rounded-full bg-[#54b947]" style={{ width: `${(count / maxErm) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionLabel>Tasks</SectionLabel>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Mini color="#54b947" label="Done today" value={String(emp.tasks.completedToday)} />
            <Mini color="#256c1d" label="In progress" value={String(emp.tasks.inProgress)} />
            <Mini color="#ef6f64" label="Overdue" value={String(emp.tasks.overdue)} />
          </div>
          {emp.tasks.list.length === 0 ? <p className="text-sm text-muted-foreground rounded-2xl bg-[#f4f6f3] p-4">No tasks assigned.</p> : (
            <div className="space-y-2">
              {emp.tasks.list.slice(0, 8).map((t: any) => {
                const pill = t.status === 'completed' ? 'bg-[#dff3da] text-[#256c1d]' : t.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                return (
                  <div key={t.id} className="rounded-2xl bg-[#f4f6f3] px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                    <span className={cn('rounded-full px-3 py-0.5 text-xs font-semibold capitalize shrink-0', pill)}>{String(t.status).replace(/_/g, ' ')}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="p-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className="text-sm font-semibold mt-1 truncate">{value}</p></div>;
}
function Mini({ color, label, value }: { color: string; label: string; value: string }) {
  return <div className="rounded-xl bg-white p-2.5"><div className="flex items-center justify-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: color }} /><p className="font-semibold tabular-nums">{value}</p></div><p className="text-xs text-muted-foreground mt-0.5">{label}</p></div>;
}

/** The day's blocks laid out on a clock: green = active, amber = idle, grey = away from the tab. */
function Timeline({ segments }: { segments: [number, number, 'a' | 'i' | 'w'][] }) {
  const blocks = segments.filter((x) => Array.isArray(x) && x[1] > x[0]);
  if (blocks.length === 0) return null;
  const start = Math.min(...blocks.map((b) => b[0])); const end = Math.max(...blocks.map((b) => b[1]));
  const span = Math.max(end - start, 60_000);
  const color = { a: '#54b947', i: '#f5b942', w: '#cbd5e1' } as const;
  const t = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return (
    <div>
      <div className="relative h-6 rounded-lg bg-white overflow-hidden">
        {blocks.map((b, i) => (
          <div key={i} className="absolute top-0 bottom-0" title={`${t(b[0])} – ${t(b[1])}`} style={{ left: `${((b[0] - start) / span) * 100}%`, width: `${Math.max(0.4, ((b[1] - b[0]) / span) * 100)}%`, background: color[b[2]] }} />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>{t(start)}</span><span>{t(end)}</span></div>
    </div>
  );
}
