import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

import { CS, numLocale, compactMoney } from '@/lib/currency';
const STATUS_COLORS = ['#54b947', '#8ae47e', '#256c1d', '#b8d8b0', '#0b1d14', '#f5b942', '#ef6f64', '#64748b'];

const inr = (n: number) => `${CS()}${Math.round(n || 0).toLocaleString(numLocale())}`;
const inrShort = (n: number) => {
  const v = Math.abs(n || 0);
  if (numLocale() !== 'en-IN') return compactMoney(n, 2);
  if (v >= 10000000) return `${CS()}${(n / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `${CS()}${(n / 100000).toFixed(2)} L`;
  if (v >= 1000) return `${CS()}${(n / 1000).toFixed(1)} K`;
  return `${CS()}${Math.round(n || 0)}`;
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
      { key: 'del', show: user?.role === 'ceo', count: a.pendingDeletes, title: 'Delete approvals', hint: 'waiting for you', tab: 'delete_approvals', tone: 'amber' },
      { key: 'esc', show: true, count: a.activeEscalations, title: 'Escalations', hint: a.criticalEscalations ? `${a.criticalEscalations} critical` : 'active', tab: 'escalations', tone: a.criticalEscalations ? 'rose' : 'amber' },
      { key: 'fee', show: true, count: a.overdueFeeStudents, title: 'Overdue fees', hint: data.collections?.overdueAmount ? `${inrShort(data.collections.overdueAmount)} · students` : 'students', tab: 'collections', tone: 'rose' },
      { key: 'task', show: true, count: a.overdueTasks, title: 'Overdue tasks', hint: 'past deadline', tab: 'tasks', tone: 'amber' },
      { key: 'leave', show: true, count: a.pendingLeaves, title: 'Leave requests', hint: 'to approve', tab: 'leaves', tone: 'sky' },
      { key: 'exp', show: true, count: a.pendingExpenses, title: 'Expense claims', hint: 'to approve', tab: 'expenses', tone: 'violet' },
    ].filter((x) => x.show);
  }, [data, user?.role]);

  if (loading && !data) return <OverviewSkeleton />;
  if (error && !data) {
    return (
      <div className="rounded-3xl bg-white border border-slate-100 py-14 text-center">
        <p className="font-semibold text-slate-900">Could not load the overview</p>
        <Button variant="outline" className="mt-4 h-11 px-6 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]" onClick={load}>Try again</Button>
      </div>
    );
  }
  if (!data) return null;

  const c = data.collections, adm = data.admissions;
  const open = attention.filter((x) => x.count > 0);
  const waiting = open.reduce((t, x) => t + x.count, 0);
  const pctVs = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
  const collectDelta = pctVs(c.thisMonth, c.lastMonth);
  const admDelta = pctVs(adm.newThisMonth, adm.newLastMonth);
  const maxBranch = Math.max(1, ...data.branches.map((b: any) => b.collectedThisMonth));
  const statusTotal = adm.byStatus.reduce((t: number, s: any) => t + s.count, 0) || 1;
  const today = new Date().toISOString().slice(0, 10);
  const trend = c.trend.map((d: any) => ({ ...d, day: new Date(d.date).getDate(), isToday: d.date === today }));
  const deptData = depts.map((d: any) => ({ name: d?.name || 'N/A', score: d?.efficiency || 0 }));
  const firstName = (user?.name || '').split(' ')[0];
  const tip = { backgroundColor: '#fff', border: '1px solid #e8ece6', borderRadius: 16, fontSize: 12 };

  const kpis = [
    { title: 'Collected this month', value: inrShort(c.thisMonth), exact: inr(c.thisMonth), delta: collectDelta, sub: c.lastMonth ? `${inrShort(c.lastMonth)} last month` : 'No collections last month', tab: 'payments' },
    { title: 'Overdue fees', value: inrShort(c.overdueAmount), exact: inr(c.overdueAmount), sub: `${c.overdueStudents} student${c.overdueStudents === 1 ? '' : 's'} · ${inrShort(c.dueAmount)} unpaid`, tab: 'collections', bad: c.overdueAmount > 0 },
    { title: 'New admissions', value: String(adm.newThisMonth), exact: `${adm.totalStudents.toLocaleString(numLocale())} students in total`, delta: admDelta, sub: `${adm.newLastMonth} last month`, tab: 'students' },
    { title: 'Staff present today', value: `${data.people.presentToday} / ${data.people.staff}`, exact: '', sub: data.people.staff ? `${Math.round((data.people.presentToday / data.people.staff) * 100)}% attendance` : '', tab: 'attendance' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Executive Overview</h2>
          <p className="text-muted-foreground text-sm mt-1.5">
            {greeting()}{firstName ? `, ${firstName}` : ''}. {inrShort(c.thisMonth)} collected this month, {adm.newThisMonth} new admission{adm.newThisMonth === 1 ? '' : 's'}
            {waiting > 0 ? `, and ${waiting} item${waiting === 1 ? '' : 's'} waiting for you.` : '. Nothing is waiting for you.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">Updated {new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
          <Button variant="outline" onClick={load} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"><RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh</Button>
        </div>
      </div>

      {/* Needs attention */}
      <section>
        <SectionTitle>Needs your attention</SectionTitle>
        {open.length === 0 ? (
          <div className="rounded-3xl bg-[#eaf6e6] px-6 py-5">
            <p className="text-sm font-semibold text-[#256c1d]">All clear. Nothing is waiting for you right now.</p>
          </div>
        ) : (
          <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 divide-x divide-y xl:divide-y-0 divide-slate-100">
              {attention.map((a) => <AttentionCard key={a.key} a={a} onClick={() => onNavigate(a.tab)} />)}
            </div>
          </div>
        )}
      </section>

      {/* Headline numbers */}
      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-2 xl:grid-cols-4 divide-x divide-y xl:divide-y-0 divide-slate-100">
          {kpis.map((k) => (
            <button key={k.title} type="button" onClick={() => onNavigate(k.tab)} className="text-left p-5 sm:p-6 hover:bg-[#f7faf6] transition-colors">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-500">{k.title}</p>
                {k.delta !== undefined && k.delta !== null && (
                  <span className={cn('text-xs font-semibold rounded-full px-2.5 py-1', k.delta >= 0 ? 'bg-[#dff3da] text-[#256c1d]' : 'bg-red-100 text-red-700')}>{k.delta >= 0 ? '+' : '−'}{Math.abs(k.delta)}%</span>
                )}
              </div>
              <p className={cn('text-3xl sm:text-4xl font-semibold tracking-tight mt-2', k.bad ? 'text-red-600' : 'text-slate-900')} title={k.exact || undefined}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-2 truncate">{k.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Money + admissions */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2" title="Collections, last 30 days" subtitle="Fees received per day"
          right={<div className="rounded-2xl bg-[#f4f6f3] px-4 py-2 text-right"><p className="text-[11px] font-medium text-slate-500">Expenses this month</p><p className="text-sm font-semibold text-slate-900">{inrShort(c.expensesThisMonth)}</p></div>}>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ left: 0, right: 8, top: 8 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} interval={2} />
                <YAxis axisLine={false} tickLine={false} width={48} tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}K` : v)} />
                <Tooltip cursor={{ fill: '#f4f6f3' }} formatter={(v: any) => [inr(Number(v)), 'Collected']} labelFormatter={(_, p: any) => p?.[0]?.payload?.date ? new Date(p[0].payload.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''} contentStyle={tip} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {trend.map((d: any, i: number) => <Cell key={i} fill={d.isToday ? '#256c1d' : '#54b947'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Students by status" subtitle="Where every student stands">
          <div className="relative h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={adm.byStatus} dataKey="count" nameKey="status" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none">
                  {adm.byStatus.map((s: any, i: number) => <Cell key={s.status} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any, _n: any, p: any) => [Number(v).toLocaleString('en-IN'), label(p?.payload?.status || '')]} contentStyle={tip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-semibold leading-none">{adm.totalStudents.toLocaleString(numLocale())}</p>
              <p className="text-xs text-muted-foreground mt-1">students</p>
            </div>
          </div>
          <div className="space-y-1.5 mt-3">
            {adm.byStatus.slice(0, 6).map((s: any, i: number) => (
              <div key={s.status} className="flex items-center gap-2 text-sm rounded-2xl bg-[#f4f6f3] px-3 py-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                <span className="flex-1 truncate">{label(s.status)}</span>
                <span className="font-semibold tabular-nums">{s.count.toLocaleString('en-IN')}</span>
                <span className="text-xs text-muted-foreground w-9 text-right tabular-nums">{Math.round((s.count / statusTotal) * 100)}%</span>
              </div>
            ))}
          </div>
          {(adm.leadsThisMonth > 0 || adm.leadsLastMonth > 0) && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-sm flex items-center justify-between"><span className="text-muted-foreground">New leads this month</span><span className="font-semibold">{adm.leadsThisMonth}</span></div>
          )}
        </Panel>
      </section>

      {/* Branches */}
      <Panel title="Branch comparison" subtitle="This month's collections, admissions and team size">
        {data.branches.length === 0 ? <p className="text-sm text-muted-foreground">No branches set up yet.</p> : (
          <div className="space-y-3">
            {data.branches.map((b: any, i: number) => (
              <div key={b.id || 'none'} className={cn('rounded-2xl bg-[#f4f6f3] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4', !b.id && 'text-muted-foreground')}>
                <div className="flex items-center gap-3 lg:w-64 shrink-0">
                  <span className="w-9 h-9 rounded-full bg-white text-sm font-semibold text-slate-700 flex items-center justify-center">{b.id ? i + 1 : '–'}</span>
                  <span className="font-semibold text-slate-900 truncate">{b.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center lg:w-64 shrink-0">
                  <div><p className="text-[11px] text-slate-500">Students</p><p className="font-semibold text-slate-900 tabular-nums">{b.students.toLocaleString('en-IN')}</p></div>
                  <div><p className="text-[11px] text-slate-500">New</p><p className="font-semibold text-slate-900 tabular-nums">{b.newThisMonth > 0 ? `+${b.newThisMonth}` : '0'}</p></div>
                  <div><p className="text-[11px] text-slate-500">Staff</p><p className="font-semibold text-slate-900 tabular-nums">{b.staff}</p></div>
                </div>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-2.5 flex-1 rounded-full bg-white overflow-hidden"><div className="h-full rounded-full bg-[#54b947]" style={{ width: `${(b.collectedThisMonth / maxBranch) * 100}%` }} /></div>
                  <span className="font-semibold tabular-nums w-24 text-right text-slate-900">{inrShort(b.collectedThisMonth)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Departments + quick links */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <Panel className="xl:col-span-2" title="Department performance" subtitle="Efficiency scores"
          right={<Button variant="outline" onClick={() => onNavigate('performance')} className="h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold">Full report</Button>}>
          <div className="h-[240px]">
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} layout="vertical" margin={{ left: 0, right: 40 }}>
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f4f6f3' }} contentStyle={tip} />
                  <Bar dataKey="score" fill="#54b947" radius={[0, 10, 10, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No department data yet</div>
            )}
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-3">
          <QuickLink title="KPI / KRA report" text="Employee indicators and key results." onClick={() => onNavigate('kpi-kra')} />
          <QuickLink title="Activity report" text="What each employee did, day by day." onClick={() => onNavigate('activity_report')} />
          <QuickLink title="Performance" text="Org-wide efficiency analytics." onClick={() => onNavigate('performance')} />
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold tracking-tight mb-3">{children}</h3>;
}

function Panel({ title, subtitle, right, children, className = '' }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-3xl bg-white border border-slate-100 overflow-hidden', className)}>
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function AttentionCard({ a, onClick }: { a: any; onClick: () => void }) {
  const idle = a.count === 0;
  const num = idle ? 'text-slate-300' : a.tone === 'rose' ? 'text-red-600' : a.tone === 'amber' ? 'text-amber-600' : 'text-slate-900';
  return (
    <button type="button" onClick={onClick} className="text-left p-5 hover:bg-[#f7faf6] transition-colors">
      <p className="text-sm font-medium text-slate-500 truncate">{a.title}</p>
      <p className={cn('text-3xl font-semibold tracking-tight mt-2 leading-none', num)}>{a.count}</p>
      <p className="text-xs text-muted-foreground mt-2 truncate">{idle ? 'none' : a.hint}</p>
    </button>
  );
}

function QuickLink({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group text-left rounded-3xl bg-white border border-slate-100 p-5 flex items-center gap-4 hover:border-[#8ae47e] transition-colors">
      <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{title}</p><p className="text-xs text-muted-foreground mt-0.5">{text}</p></div>
      <ChevronRight className="w-4 h-4 text-slate-400 transition group-hover:translate-x-0.5" />
    </button>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-16 w-80 rounded-2xl bg-slate-100 animate-pulse" />
      <div className="h-28 rounded-3xl bg-slate-100 animate-pulse" />
      <div className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
      <div className="h-72 rounded-3xl bg-slate-100 animate-pulse" />
    </div>
  );
}
