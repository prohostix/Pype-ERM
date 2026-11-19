import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlarmClockOff, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, Hourglass, ListChecks, LogIn,
  RefreshCw, Search, Users, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';

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

const CARD = 'rounded-3xl border-0 shadow-md ring-1 ring-border/60 py-6 gap-4';
const STATUS: Record<string, { label: string; color: string; soft: string }> = {
  present: { label: 'Present', color: '#10b981', soft: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  wfh: { label: 'Work from home', color: '#06b6d4', soft: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' },
  late: { label: 'Late', color: '#f59e0b', soft: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  half_day: { label: 'Half day', color: '#6366f1', soft: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' },
  leave: { label: 'On leave', color: '#8b5cf6', soft: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  absent: { label: 'Absent', color: '#f43f5e', soft: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
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

  useEffect(() => { api.get('/departments').then((r) => setDeptList(r.data.data || [])).catch(() => {}); }, []);
  useEffect(() => { fetchReport(); }, [date, deptFilter]);

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

  return (
    <div className="space-y-6">
      {/* Header: the day is the main control */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-lg"><Activity className="w-6 h-6" /></div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Employee Activity Report</h2>
            <p className="text-sm text-muted-foreground">Who was in, how long they actually used the platform and what got done. Scheduled {hoursLabel(scheduledHours)}.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-full border bg-card shadow-sm">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => shift(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <label className="relative px-2 text-sm font-semibold min-w-[150px] text-center cursor-pointer inline-flex items-center justify-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              {new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              <input type="date" value={date} max={dayKey(new Date())} onChange={(e) => e.target.value && setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => shift(1)} disabled={isToday}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          {!isToday && <Button variant="outline" size="sm" onClick={() => setDate(dayKey(new Date()))}>Today</Button>}
          <Button variant="outline" size="icon" onClick={fetchReport} disabled={loading} title="Refresh"><RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /></Button>
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}><Download className="w-4 h-4 mr-1.5" />Export</Button>
        </div>
      </div>

      {/* Day at a glance */}
      <Card className={cn(CARD, 'overflow-hidden bg-gradient-to-br from-cyan-50/70 via-white to-indigo-50/60 dark:from-cyan-950/20 dark:via-card dark:to-indigo-950/20')}>
        <CardContent className="px-7 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-center">
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3.6" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#10b981" strokeWidth="3.6" strokeLinecap="round" strokeDasharray={`${(attPct / 100) * 97.4} 97.4`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><p className="text-3xl font-bold leading-none">{attPct}%</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">checked in</p></div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{prettyDate}</p>
              <p className="text-2xl font-bold mt-1">{counts.present} of {totals.total}</p>
              <p className="text-sm text-muted-foreground">employees checked in</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile icon={LogIn} tint="bg-emerald-500/10 text-emerald-600" value={String(counts.present)} label="Checked in" />
            <Tile icon={AlarmClockOff} tint="bg-amber-500/10 text-amber-600" value={String(totals.late)} label="Late" />
            <Tile icon={Users} tint="bg-rose-500/10 text-rose-600" value={String(totals.absent)} label="Not in" />
            <Tile icon={Hourglass} tint="bg-indigo-500/10 text-indigo-600" value={totals.trackedCount ? hoursLabel(totals.avgProductive) : "—"} label={totals.trackedCount ? `Avg active in ERM (${totals.trackedCount} tracked)` : "Avg active in ERM"} />
            <Tile icon={Zap} tint="bg-cyan-500/10 text-cyan-600" value={totals.erm.toLocaleString('en-IN')} label="ERM actions" />
            <Tile icon={CheckCircle2} tint="bg-violet-500/10 text-violet-600" value={String(totals.done)} label="Tasks done today" />
          </div>
        </CardContent>
      </Card>

      {/* Departments */}
      {departments.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {departments.map((d) => {
            const pct = d.totalEmployees ? Math.round((d.present / d.totalEmployees) * 100) : 0;
            const active = deptFilter === d.departmentId;
            return (
              <button key={d.departmentId} onClick={() => setDeptFilter(active ? 'all' : d.departmentId)}
                className={cn('shrink-0 w-[230px] text-left rounded-2xl border bg-card p-4 transition hover:shadow-md', active && 'ring-2 ring-primary border-transparent shadow-md')}>
                <div className="flex items-center justify-between gap-2"><p className="font-semibold text-sm truncate">{d.name}</p><span className="text-xs font-bold tabular-nums" style={{ color: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e' }}>{pct}%</span></div>
                <div className="h-2 rounded-full bg-muted mt-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #34d39988, #10b981)' }} /></div>
                <div className="flex justify-between text-[11px] text-muted-foreground mt-2.5">
                  <span><b className="text-emerald-600">{d.present}</b> in</span><span><b className="text-amber-600">{d.late}</b> late</span><span><b className="text-rose-600">{d.absent}</b> out</span>
                  <span>{hoursLabel(d.avgProductiveHours)} avg</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Roster */}
      <Card className={CARD}>
        <CardContent className="px-7 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {views.map((v) => (
                <button key={v.id} onClick={() => setView(v.id)}
                  className={cn('inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition', view === v.id ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white border-transparent shadow' : 'hover:border-foreground/30')}>
                  {v.label}<span className={cn('text-[11px] rounded-full px-1.5 tabular-nums', view === v.id ? 'bg-white/25' : 'bg-muted')}>{counts[v.id]}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9 h-9 w-52" placeholder="Search name or department" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-9 w-44 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All departments</SelectItem>{deptList.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dept">Department, then name</SelectItem><SelectItem value="late">Late first</SelectItem><SelectItem value="productive_desc">Most productive</SelectItem>
                  <SelectItem value="wasted_desc">Most time wasted</SelectItem><SelectItem value="erm">Most ERM actions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading && report.length === 0 ? (
            <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 rounded-2xl bg-muted/50 animate-pulse" />)}</div>
          ) : rows.length === 0 ? (
            <div className="py-14 text-center text-muted-foreground"><Activity className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No one matches this day and filter.</p></div>
          ) : (
            <div className="space-y-2">
              {rows.map((e) => <Row key={e.userId} emp={e} scheduled={scheduledHours} onOpen={() => setOpen(e)} />)}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          {open && <Detail emp={open} scheduled={scheduledHours} date={prettyDate} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Tile({ icon: Icon, tint, value, label }: { icon: any; tint: string; value: string; label: string }) {
  return (
    <div className="rounded-2xl border bg-card/80 p-3.5">
      <div className={cn('p-1.5 rounded-lg w-fit', tint)}><Icon className="w-4 h-4" /></div>
      <p className="text-xl font-bold mt-2 leading-none tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
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
    <div className={cn('flex rounded-full overflow-hidden bg-muted', tall ? 'h-3.5' : 'h-2.5')} title={`Active ${hoursLabel(act)} · idle ${hoursLabel(idle)} · away ${hoursLabel(away)}`}>
      <div style={{ width: pct(act), background: 'linear-gradient(90deg, #34d399, #10b981)' }} />
      <div style={{ width: pct(idle), background: '#f59e0b' }} />
      <div style={{ width: pct(away), background: '#94a3b8' }} />
    </div>
  );
}

function Row({ emp, scheduled, onOpen }: { emp: EmployeeReport; scheduled: number; onOpen: () => void }) {
  const s = st(emp.attendance?.status);
  const inn = here(emp);
  const rate = scheduled ? (emp.usage?.activeHours || 0) / scheduled : 0;
  const prodColor = !emp.usage?.tracked ? '#94a3b8' : rate >= 0.8 ? '#10b981' : rate >= 0.5 ? '#f59e0b' : '#f43f5e';
  return (
    <button onClick={onOpen} className="w-full text-left rounded-2xl border bg-card px-4 py-3 grid grid-cols-[auto_1fr_auto] lg:grid-cols-[minmax(210px,1.1fr)_150px_minmax(200px,1.4fr)_90px_90px_28px] gap-x-4 gap-y-3 items-center hover:shadow-md hover:border-primary/30 transition" style={{ borderLeft: `4px solid ${s.color}` }}>
      <div className="flex items-center gap-3 min-w-0 col-span-2 lg:col-span-1">
        <span className="w-10 h-10 rounded-xl text-xs font-bold text-white flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}aa)` }}>{initials(emp.name)}</span>
        <div className="min-w-0"><p className="font-semibold truncate">{emp.name}</p><p className="text-xs text-muted-foreground truncate">{emp.department || '—'} · {emp.designation || (emp.role || '').replace(/_/g, ' ')}</p></div>
      </div>
      <div className="justify-self-end lg:justify-self-start">
        <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold', s.soft)}>{inn ? s.label : 'Not in'}</span>
        <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">{inn ? `${clock(emp.attendance?.checkIn)} – ${emp.attendance?.checkOut ? clock(emp.attendance.checkOut) : 'now'}` : '—'}{emp.attendance?.isLate ? <span className="text-amber-600 font-medium"> · +{emp.attendance.lateMinutes}m</span> : null}</p>
      </div>
      <div className="col-span-3 lg:col-span-1">
        {emp.usage?.tracked ? (
          <>
            <HoursBar emp={emp} scheduled={scheduled} />
            <div className="flex justify-between text-[11px] mt-1.5">
              <span className="font-semibold tabular-nums" style={{ color: prodColor }}>{hoursLabel(emp.usage.activeHours || 0)} active</span>
              <span className="text-muted-foreground tabular-nums">{hoursLabel((emp.usage.idleHours || 0) + (emp.usage.awayHours || 0))} idle or away{emp.usage.leaves ? ` · left ${emp.usage.leaves}×` : ''}</span>
            </div>
          </>
        ) : <p className="text-xs text-muted-foreground">{inn ? 'No platform usage tracked' : 'No attendance recorded'}</p>}
      </div>
      <div className="hidden lg:block text-center"><p className="font-bold tabular-nums">{emp.erpActions}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">ERM actions</p></div>
      <div className="hidden lg:block text-center"><p className="font-bold tabular-nums"><span className="text-emerald-600">{emp.tasks.completedToday}</span><span className="text-muted-foreground font-normal">/{emp.tasks.total}</span></p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tasks{emp.tasks.overdue > 0 ? <span className="text-rose-600 font-semibold"> · {emp.tasks.overdue} late</span> : ''}</p></div>
      <ChevronRight className="w-4 h-4 text-muted-foreground hidden lg:block" />
    </button>
  );
}

function Detail({ emp, scheduled, date }: { emp: EmployeeReport; scheduled: number; date: string }) {
  const s = st(emp.attendance?.status);
  const inn = here(emp);
  const erm = Object.entries(emp.ermActivity || {}).sort((a, b) => b[1] - a[1]);
  const maxErm = Math.max(1, ...erm.map((x) => x[1]));
  return (
    <div>
      <div className="p-6 text-white" style={{ background: `linear-gradient(135deg, #0f172a, ${s.color})` }}>
        <SheetHeader className="p-0">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 text-lg font-bold flex items-center justify-center">{initials(emp.name)}</span>
            <div className="min-w-0">
              <SheetTitle className="text-white text-xl truncate">{emp.name}</SheetTitle>
              <SheetDescription className="text-white/80 truncate">{emp.designation || (emp.role || '').replace(/_/g, ' ')}{emp.department ? ` · ${emp.department}` : ''}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <p className="text-xs text-white/70 mt-4">{date}</p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <Stat label="Status" value={inn ? s.label : 'Not in'} />
          <Stat label="Check-in" value={clock(emp.attendance?.checkIn)} />
          <Stat label="Check-out" value={emp.attendance?.checkOut ? clock(emp.attendance.checkOut) : inn ? 'Still in' : '—'} />
        </div>
      </div>

      <div className="p-6 space-y-7">
        <section>
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3 flex items-center gap-2"><Clock className="w-3.5 h-3.5" />Time in the platform</h4>
          {emp.usage?.tracked ? (
            <div className="rounded-2xl border p-4 space-y-4">
              <HoursBar emp={emp} scheduled={scheduled} tall />
              <div className="grid grid-cols-3 gap-2 text-center">
                <Mini color="#10b981" label="Active" value={hoursLabel(emp.usage.activeHours || 0)} />
                <Mini color="#f59e0b" label="Idle" value={hoursLabel(emp.usage.idleHours || 0)} />
                <Mini color="#94a3b8" label="Away from tab" value={hoursLabel(emp.usage.awayHours || 0)} />
              </div>
              <Timeline segments={emp.usage.segments || []} />
              <p className="text-xs text-muted-foreground">
                First seen {clock(emp.usage.firstSeen)}, last seen {clock(emp.usage.lastSeen)}. Left the platform tab {emp.usage.leaves || 0} time{emp.usage.leaves === 1 ? '' : 's'}.
                Idle means no mouse or keyboard for 5 minutes. Time with the tab closed, the computer asleep or offline is not counted.
              </p>
              {emp.usage.pages && emp.usage.pages.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Where the active time went</p>
                  <div className="space-y-2">
                    {emp.usage.pages.map((pg) => (
                      <div key={pg.page}>
                        <div className="flex justify-between text-sm"><span className="capitalize truncate">{pg.page.replace(/[_-]/g, ' ')}</span><b className="tabular-nums">{hoursLabel(pg.hours)}</b></div>
                        <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" style={{ width: `${(pg.hours / (emp.usage!.pages![0].hours || 1)) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {inn && <p className="text-xs text-muted-foreground border-t pt-3">Attendance: worked {hoursLabel(emp.attendance?.workingHours || 0)} of a {hoursLabel(scheduled)} day{emp.attendance?.isLate ? `, arrived ${emp.attendance.lateMinutes} minutes late` : ''}.</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground rounded-2xl bg-muted/50 p-4">
              No platform usage was recorded for this day. {inn ? `Attendance shows ${hoursLabel(emp.attendance?.workingHours || 0)} worked.` : 'No attendance either.'} Usage is only recorded from the day tracking was switched on, and only while the platform is open in a browser.
            </p>
          )}
        </section>

        <section>
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3 flex items-center gap-2"><Zap className="w-3.5 h-3.5" />ERM activity · {emp.erpActions} actions</h4>
          {erm.length === 0 ? <p className="text-sm text-muted-foreground rounded-2xl bg-muted/50 p-4">No ERM activity recorded.</p> : (
            <div className="space-y-2.5">
              {erm.map(([key, count]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm"><span className="capitalize truncate">{key.replace(/_/g, ' ')}</span><b className="tabular-nums">{count}</b></div>
                  <div className="h-2 rounded-full bg-muted mt-1 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" style={{ width: `${(count / maxErm) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3 flex items-center gap-2"><ListChecks className="w-3.5 h-3.5" />Tasks</h4>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Mini color="#10b981" label="Done today" value={String(emp.tasks.completedToday)} />
            <Mini color="#0ea5e9" label="In progress" value={String(emp.tasks.inProgress)} />
            <Mini color="#f43f5e" label="Overdue" value={String(emp.tasks.overdue)} />
          </div>
          {emp.tasks.list.length === 0 ? <p className="text-sm text-muted-foreground rounded-2xl bg-muted/50 p-4">No tasks assigned.</p> : (
            <div className="space-y-2">
              {emp.tasks.list.slice(0, 8).map((t: any) => {
                const c = t.status === 'completed' ? '#10b981' : t.status === 'overdue' ? '#f43f5e' : '#f59e0b';
                return (
                  <div key={t.id} className="rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3" style={{ borderLeft: `3px solid ${c}` }}>
                    <p className="text-sm truncate">{t.title}</p>
                    <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0" style={{ color: c }}>{String(t.status).replace(/_/g, ' ')}</span>
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
  return <div className="rounded-2xl bg-white/10 border border-white/15 p-3 text-center"><p className="text-sm font-semibold truncate">{value}</p><p className="text-[10px] uppercase tracking-wider text-white/70 mt-0.5">{label}</p></div>;
}
function Mini({ color, label, value }: { color: string; label: string; value: string }) {
  return <div className="rounded-xl bg-muted/50 p-2.5"><div className="flex items-center justify-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: color }} /><p className="font-bold tabular-nums">{value}</p></div><p className="text-[10px] text-muted-foreground mt-0.5">{label}</p></div>;
}

/** The day's blocks laid out on a clock: green = active, amber = idle, grey = away from the tab. */
function Timeline({ segments }: { segments: [number, number, 'a' | 'i' | 'w'][] }) {
  const blocks = segments.filter((x) => Array.isArray(x) && x[1] > x[0]);
  if (blocks.length === 0) return null;
  const start = Math.min(...blocks.map((b) => b[0])); const end = Math.max(...blocks.map((b) => b[1]));
  const span = Math.max(end - start, 60_000);
  const color = { a: '#10b981', i: '#f59e0b', w: '#94a3b8' } as const;
  const t = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return (
    <div>
      <div className="relative h-6 rounded-lg bg-muted overflow-hidden">
        {blocks.map((b, i) => (
          <div key={i} className="absolute top-0 bottom-0" title={`${t(b[0])} – ${t(b[1])}`} style={{ left: `${((b[0] - start) / span) * 100}%`, width: `${Math.max(0.4, ((b[1] - b[0]) / span) * 100)}%`, background: color[b[2]] }} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>{t(start)}</span><span>{t(end)}</span></div>
    </div>
  );
}
