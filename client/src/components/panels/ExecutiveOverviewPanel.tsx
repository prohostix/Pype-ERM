import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart2, CalendarClock, CheckCircle2, ChevronRight, ClipboardList, CreditCard, GraduationCap,
  Receipt, RefreshCw, ShieldAlert, Target, Trash2, TrendingUp, Trophy, UserCheck, Users,
} from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

const DEPT_COLORS: Record<string, string> = {
  hr: 'hsl(var(--info))', finance: 'hsl(var(--success))', operations: 'hsl(var(--primary))', sales: 'hsl(var(--warning))',
};
const STATUS_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f43f5e', '#64748b'];
const BRANCH_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const inrShort = (n: number) => {
  const v = Math.abs(n || 0);
  if (v >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (v >= 1000) return `₹${(n / 1000).toFixed(1)} K`;
  return `₹${Math.round(n || 0)}`;
};
const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

/** Executive Overview: what needs attention, how money and admissions are moving, and how branches compare. */
export function ExecutiveOverviewPanel({ onNavigate, refreshKey = 0 }: { onNavigate: (tab: string) => void; refreshKey?: number }) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true); setError(false);
    try {
      const [ov, an] = await Promise.all([
        api.get('/ceo/overview'),
        api.get('/ceo/analytics').catch(() => ({ data: { data: { departmentEfficiency: [] } } })),
      ]);
      setData(ov.data?.data || null);
      setDepts((an.data?.data?.departmentEfficiency || []).filter(Boolean).slice(0, 6));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [refreshKey]);

  const attention = useMemo(() => {
    const a = data?.attention;
    if (!a) return [];
    return [
      { key: 'del', show: user?.role === 'ceo', count: a.pendingDeletes, title: 'Delete approvals', hint: 'waiting for you', icon: Trash2, tab: 'delete_approvals', tone: 'amber' },
      { key: 'esc', show: true, count: a.activeEscalations, title: 'Escalations', hint: a.criticalEscalations ? `${a.criticalEscalations} critical` : 'active', icon: ShieldAlert, tab: 'escalations', tone: a.criticalEscalations ? 'rose' : 'amber' },
      { key: 'fee', show: true, count: a.overdueFeeStudents, title: 'Overdue fees', hint: data.collections?.overdueAmount ? `${inrShort(data.collections.overdueAmount)} · students` : 'students', icon: CreditCard, tab: 'collections', tone: 'rose' },
      { key: 'task', show: true, count: a.overdueTasks, title: 'Overdue tasks', hint: 'past deadline', icon: ClipboardList, tab: 'tasks', tone: 'amber' },
      { key: 'leave', show: true, count: a.pendingLeaves, title: 'Leave requests', hint: 'to approve', icon: CalendarClock, tab: 'leaves', tone: 'sky' },
      { key: 'exp', show: true, count: a.pendingExpenses, title: 'Expense claims', hint: 'to approve', icon: Receipt, tab: 'expenses', tone: 'violet' },
    ].filter((x) => x.show);
  }, [data, user?.role]);

  if (loading && !data) return <OverviewSkeleton />;
  if (error && !data) {
    return (
      <Card><CardContent className="py-12 text-center">
        <AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground/50" />
        <p className="font-semibold mt-3">Could not load the overview</p>
        <Button variant="outline" className="mt-4" onClick={load}>Try again</Button>
      </CardContent></Card>
    );
  }
  if (!data) return null;

  const c = data.collections, adm = data.admissions;
  const open = attention.filter((x) => x.count > 0);
  const pctVs = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
  const collectDelta = pctVs(c.thisMonth, c.lastMonth);
  const admDelta = pctVs(adm.newThisMonth, adm.newLastMonth);
  const maxBranch = Math.max(1, ...data.branches.map((b: any) => b.collectedThisMonth));
  const statusTotal = adm.byStatus.reduce((t: number, s: any) => t + s.count, 0) || 1;
  const today = new Date().toISOString().slice(0, 10);
  const trend = c.trend.map((d: any) => ({ ...d, day: new Date(d.date).getDate(), isToday: d.date === today }));
  const deptData = depts.map((d: any) => ({ name: d?.name || 'N/A', score: d?.efficiency || 0, color: DEPT_COLORS[d?.type] || 'hsl(var(--muted-foreground))' }));
  const firstName = (user?.name || '').split(' ')[0];

  return (
    <div className="space-y-7">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-800 text-white shadow-xl">
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-fuchsia-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 left-1/3 w-96 h-96 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />
        <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="text-sm text-indigo-200/90 tracking-wide">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-1.5">{greeting()}{firstName ? `, ${firstName}` : ''}</h2>
            <p className="text-indigo-100/80 mt-2 max-w-xl text-sm sm:text-base">
              {inrShort(c.thisMonth)} collected this month, {adm.newThisMonth} new admission{adm.newThisMonth === 1 ? '' : 's'}
              {open.length > 0 ? `, and ${open.reduce((t, x) => t + x.count, 0)} item${open.reduce((t, x) => t + x.count, 0) === 1 ? '' : 's'} waiting for you.` : '. Nothing is waiting for you.'}
            </p>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-3">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <HeroStat label="Students" value={adm.totalStudents.toLocaleString('en-IN')} />
              <HeroStat label="Staff" value={String(data.people.staff)} />
              <HeroStat label="Present" value={String(data.people.presentToday)} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-indigo-200/80">Updated {new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
              <Button size="sm" onClick={load} disabled={loading} className="bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur"><RefreshCw className={cn('w-4 h-4 mr-1.5', loading && 'animate-spin')} />Refresh</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Needs attention */}
      <section>
        <SectionTitle>Needs your attention</SectionTitle>
        {open.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-teal-950/20 p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500 text-white"><CheckCircle2 className="w-5 h-5" /></div>
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">All clear. Nothing is waiting for you right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {attention.map((a) => <AttentionCard key={a.key} a={a} onClick={() => onNavigate(a.tab)} />)}
          </div>
        )}
      </section>

      {/* Headline numbers */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi icon={TrendingUp} tone="emerald" title="Collected this month" value={inrShort(c.thisMonth)} exact={inr(c.thisMonth)}
          delta={collectDelta} sub={c.lastMonth ? `${inrShort(c.lastMonth)} last month` : 'No collections last month'} onClick={() => onNavigate('payments')} />
        <Kpi icon={CreditCard} tone="rose" title="Overdue fees" value={inrShort(c.overdueAmount)} exact={inr(c.overdueAmount)}
          sub={`${c.overdueStudents} student${c.overdueStudents === 1 ? '' : 's'} · ${inrShort(c.dueAmount)} unpaid`} onClick={() => onNavigate('collections')} />
        <Kpi icon={GraduationCap} tone="indigo" title="New admissions" value={String(adm.newThisMonth)} exact={`${adm.totalStudents.toLocaleString('en-IN')} students in total`}
          delta={admDelta} sub={`${adm.newLastMonth} last month`} onClick={() => onNavigate('students')} />
        <Kpi icon={UserCheck} tone="amber" title="Staff present today" value={`${data.people.presentToday} / ${data.people.staff}`} exact=""
          sub={data.people.staff ? `${Math.round((data.people.presentToday / data.people.staff) * 100)}% attendance` : ''} onClick={() => onNavigate('attendance')} />
      </section>

      {/* Money + admissions */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 rounded-3xl border-0 shadow-md ring-1 ring-border/60 overflow-hidden py-6 gap-4">
          <CardHeader className="px-7 pb-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-semibold">Collections, last 30 days</CardTitle>
                <CardDescription>Fees received per day</CardDescription>
              </div>
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 px-3 py-1.5 text-right">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-300">Expenses this month</p>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">{inrShort(c.expensesThisMonth)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[260px] px-5 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="collectGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="todayGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" /><stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval={2} />
                <YAxis axisLine={false} tickLine={false} width={48} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}K` : v)} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} formatter={(v: any) => [inr(Number(v)), 'Collected']} labelFormatter={(_, p: any) => p?.[0]?.payload?.date ? new Date(p[0].payload.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {trend.map((d: any, i: number) => <Cell key={i} fill={d.isToday ? 'url(#todayGrad)' : 'url(#collectGrad)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-md ring-1 ring-border/60 overflow-hidden py-6 gap-4">
          <CardHeader className="px-7 pb-0">
            <CardTitle className="text-lg font-semibold">Students by status</CardTitle>
            <CardDescription>Where every student stands</CardDescription>
          </CardHeader>
          <CardContent className="px-7">
            <div className="relative h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={adm.byStatus} dataKey="count" nameKey="status" innerRadius={52} outerRadius={78} paddingAngle={3} cornerRadius={6} stroke="none">
                    {adm.byStatus.map((s: any, i: number) => <Cell key={s.status} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, _n: any, p: any) => [Number(v).toLocaleString('en-IN'), label(p?.payload?.status || '')]} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold leading-none">{adm.totalStudents.toLocaleString('en-IN')}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">students</p>
              </div>
            </div>
            <div className="space-y-1.5 mt-2">
              {adm.byStatus.slice(0, 6).map((s: any, i: number) => (
                <div key={s.status} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                  <span className="flex-1 truncate">{label(s.status)}</span>
                  <span className="font-semibold tabular-nums">{s.count.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-muted-foreground w-9 text-right tabular-nums">{Math.round((s.count / statusTotal) * 100)}%</span>
                </div>
              ))}
            </div>
            {(adm.leadsThisMonth > 0 || adm.leadsLastMonth > 0) && (
              <div className="border-t mt-3 pt-3 text-sm flex items-center justify-between"><span className="text-muted-foreground">New leads this month</span><span className="font-semibold">{adm.leadsThisMonth}</span></div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Branches */}
      <Card className="rounded-3xl border-0 shadow-md ring-1 ring-border/60 overflow-hidden py-6 gap-4">
        <CardHeader className="px-7 pb-1">
          <CardTitle className="text-lg font-semibold flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Branch comparison</CardTitle>
          <CardDescription>This month's collections, admissions and team size</CardDescription>
        </CardHeader>
        <CardContent className="px-7">
          {data.branches.length === 0 ? <p className="text-sm text-muted-foreground">No branches set up yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                    <th className="pb-2 pr-4 font-semibold">Branch</th>
                    <th className="pb-2 px-4 font-semibold text-right">Students</th>
                    <th className="pb-2 px-4 font-semibold text-right">New this month</th>
                    <th className="pb-2 px-4 font-semibold min-w-[220px]">Collected this month</th>
                    <th className="pb-2 pl-4 font-semibold text-right">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.branches.map((b: any, i: number) => {
                    const color = b.id ? BRANCH_COLORS[i % BRANCH_COLORS.length] : '#94a3b8';
                    return (
                      <tr key={b.id || 'none'} className={cn('hover:bg-muted/30 transition-colors', !b.id && 'text-muted-foreground')}>
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>{b.id ? i + 1 : '–'}</span>
                            <span className="font-semibold">{b.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums">{b.students.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 text-right tabular-nums">{b.newThisMonth > 0 ? <span className="inline-block rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-semibold px-2.5 py-0.5">+{b.newThisMonth}</span> : '0'}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 flex-1 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(b.collectedThisMonth / maxBranch) * 100}%`, background: `linear-gradient(90deg, ${color}aa, ${color})` }} /></div>
                            <span className="font-semibold tabular-nums w-24 text-right">{inrShort(b.collectedThisMonth)}</span>
                          </div>
                        </td>
                        <td className="py-3.5 pl-4 text-right tabular-nums">{b.staff}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Departments + quick links */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 rounded-3xl border-0 shadow-md ring-1 ring-border/60 overflow-hidden py-6 gap-4 cursor-pointer hover:ring-primary/40 transition" onClick={() => onNavigate('performance')}>
          <CardHeader className="px-7 pb-0 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Department performance</CardTitle>
              <CardDescription>Efficiency scores. Click for the full report</CardDescription>
            </div>
            <div className="p-2 rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"><BarChart2 className="w-5 h-5" /></div>
          </CardHeader>
          <CardContent className="h-[240px] px-5 pt-2">
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} layout="vertical" margin={{ left: 0, right: 40 }}>
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="score" radius={[0, 8, 8, 0]} barSize={20}>{deptData.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2"><BarChart2 className="w-10 h-10 opacity-20" /><p className="text-sm">No department data yet</p></div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 content-start">
          <QuickLink icon={Target} grad="from-indigo-500 to-violet-600" title="KPI / KRA report" text="Employee indicators and key results." onClick={() => onNavigate('kpi-kra')} />
          <QuickLink icon={Users} grad="from-emerald-500 to-teal-600" title="Activity report" text="What each employee did, day by day." onClick={() => onNavigate('activity_report')} />
          <QuickLink icon={TrendingUp} grad="from-amber-500 to-rose-500" title="Performance" text="Org-wide efficiency analytics." onClick={() => onNavigate('performance')} />
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3 flex items-center gap-3">
      <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />{children}<span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
    </h3>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur px-4 py-2.5 text-center min-w-[84px]">
      <p className="text-xl font-semibold leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-indigo-200/80 mt-1.5">{label}</p>
    </div>
  );
}

const ATTENTION_TONES: Record<string, { card: string; icon: string; num: string }> = {
  rose: { card: 'from-rose-50 to-white border-rose-200 dark:from-rose-950/30 dark:to-card dark:border-rose-900/50', icon: 'bg-gradient-to-br from-rose-500 to-red-600 text-white', num: 'text-rose-600 dark:text-rose-300' },
  amber: { card: 'from-amber-50 to-white border-amber-200 dark:from-amber-950/30 dark:to-card dark:border-amber-900/50', icon: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white', num: 'text-amber-600 dark:text-amber-300' },
  sky: { card: 'from-sky-50 to-white border-sky-200 dark:from-sky-950/30 dark:to-card dark:border-sky-900/50', icon: 'bg-gradient-to-br from-sky-400 to-blue-600 text-white', num: 'text-sky-600 dark:text-sky-300' },
  violet: { card: 'from-violet-50 to-white border-violet-200 dark:from-violet-950/30 dark:to-card dark:border-violet-900/50', icon: 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white', num: 'text-violet-600 dark:text-violet-300' },
};

function AttentionCard({ a, onClick }: { a: any; onClick: () => void }) {
  const t = ATTENTION_TONES[a.tone] || ATTENTION_TONES.amber;
  const idle = a.count === 0;
  return (
    <button onClick={onClick}
      className={cn('group text-left rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lg', idle ? 'bg-card border-border opacity-70 hover:opacity-100' : `bg-gradient-to-br ${t.card}`)}>
      <div className="flex items-center justify-between">
        <div className={cn('p-2 rounded-xl shadow-sm', idle ? 'bg-muted text-muted-foreground' : t.icon)}><a.icon className="w-4 h-4" /></div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 transition group-hover:translate-x-0.5" />
      </div>
      <p className={cn('text-3xl font-bold mt-3 leading-none', idle ? 'text-foreground/30' : t.num)}>{a.count}</p>
      <p className="text-sm font-semibold mt-2 truncate">{a.title}</p>
      <p className="text-[11px] text-muted-foreground truncate">{idle ? 'none' : a.hint}</p>
    </button>
  );
}

const KPI_TONES: Record<string, { card: string; icon: string; bar: string }> = {
  emerald: { card: 'from-emerald-50/80 via-white to-white dark:from-emerald-950/30 dark:via-card dark:to-card', icon: 'from-emerald-400 to-teal-600', bar: 'bg-emerald-500' },
  rose: { card: 'from-rose-50/80 via-white to-white dark:from-rose-950/30 dark:via-card dark:to-card', icon: 'from-rose-400 to-red-600', bar: 'bg-rose-500' },
  indigo: { card: 'from-indigo-50/80 via-white to-white dark:from-indigo-950/30 dark:via-card dark:to-card', icon: 'from-indigo-400 to-violet-600', bar: 'bg-indigo-500' },
  amber: { card: 'from-amber-50/80 via-white to-white dark:from-amber-950/30 dark:via-card dark:to-card', icon: 'from-amber-400 to-orange-600', bar: 'bg-amber-500' },
};

function Kpi({ icon: Icon, tone, title, value, exact, sub, delta, onClick }: { icon: any; tone: 'emerald' | 'rose' | 'indigo' | 'amber'; title: string; value: string; exact: string; sub: string; delta?: number | null; onClick: () => void }) {
  const t = KPI_TONES[tone];
  return (
    <button onClick={onClick} className={cn('relative text-left rounded-3xl border-0 ring-1 ring-border/60 bg-gradient-to-br p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl overflow-hidden', t.card)}>
      <span className={cn('absolute left-0 top-5 bottom-5 w-1 rounded-r-full', t.bar)} />
      <div className="flex items-center justify-between">
        <div className={cn('p-3 rounded-2xl bg-gradient-to-br text-white shadow-md', t.icon)}><Icon className="w-5 h-5" /></div>
        {delta !== undefined && delta !== null && (
          <span className={cn('inline-flex items-center text-xs font-bold rounded-full px-2.5 py-1', delta >= 0 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300')}>
            {delta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}{Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mt-5">{title}</p>
      <p className="text-4xl font-bold tracking-tight mt-1" title={exact || undefined}>{value}</p>
      <p className="text-xs text-muted-foreground mt-2 truncate">{sub}</p>
    </button>
  );
}

function QuickLink({ icon: Icon, grad, title, text, onClick }: { icon: any; grad: string; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group text-left rounded-2xl border bg-card p-4 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition">
      <div className={cn('p-3 rounded-2xl bg-gradient-to-br text-white shadow-md shrink-0', grad)}><Icon className="w-5 h-5" /></div>
      <div className="min-w-0 flex-1"><p className="font-semibold text-sm">{title}</p><p className="text-xs text-muted-foreground">{text}</p></div>
      <ChevronRight className="w-4 h-4 text-muted-foreground transition group-hover:translate-x-0.5" />
    </button>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-7">
      <div className="h-44 rounded-3xl bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 animate-pulse" />
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-28 rounded-2xl bg-muted/50 animate-pulse" />)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-40 rounded-3xl bg-muted/50 animate-pulse" />)}</div>
      <div className="h-72 rounded-3xl bg-muted/50 animate-pulse" />
    </div>
  );
}
