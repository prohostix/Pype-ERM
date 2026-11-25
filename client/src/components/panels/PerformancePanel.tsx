import { useState, useEffect } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ListPagination } from '@/components/ui/list-pagination';

import { numLocale } from '@/lib/currency';
interface EmployeePerf {
  userId: string;
  name: string;
  email: string;
  role: string;
  total: number;
  completed: number;
  overdue: number;
  inProgress: number;
  completionRate: number;
  score: number;
}

interface DeptEfficiency {
  departmentId: string;
  name: string;
  type: string;
  memberCount: number;
  total: number;
  completed: number;
  overdue: number;
  inProgress: number;
  completionRate: number;
  overdueRate: number;
  efficiency: number;
}

// Semicircle gauge, 0–100, flat colours
function GaugeMeter({ value, size = 220 }: { value: number; size?: number }) {
  const clamp = Math.max(0, Math.min(100, value));
  const stroke = 16;
  const r = size / 2 - stroke;
  const cx = size / 2, cy = size / 2;
  const pt = (frac: number) => ({ x: cx + r * Math.cos(Math.PI - frac * Math.PI), y: cy - r * Math.sin(Math.PI - frac * Math.PI) });
  const s0 = pt(0), e1 = pt(1), v = pt(clamp / 100);
  const color = clamp >= 67 ? '#54b947' : clamp >= 34 ? '#f5b942' : '#ef6f64';
  return (
    <svg width={size} height={size / 2 + 28} viewBox={`0 0 ${size} ${size / 2 + 28}`}>
      <path d={`M ${s0.x} ${s0.y} A ${r} ${r} 0 0 1 ${e1.x} ${e1.y}`} fill="none" stroke="#f4f6f3" strokeWidth={stroke} strokeLinecap="round" />
      {clamp > 0 && <path d={`M ${s0.x} ${s0.y} A ${r} ${r} 0 0 1 ${v.x} ${v.y}`} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />}
      <text x={cx} y={cy - 6} fontSize={40} fontWeight={600} fill="#0b1d14" textAnchor="middle">{clamp}</text>
      <text x={cx} y={cy + 16} fontSize={12} fill="#64748b" textAnchor="middle">out of 100</text>
    </svg>
  );
}

const scoreLevel = (score: number) =>
  score >= 80 ? { label: 'Excellent', color: '#256c1d', soft: 'bg-[#dff3da] text-[#256c1d]' }
  : score >= 60 ? { label: 'Good', color: '#54b947', soft: 'bg-[#eaf6e6] text-[#256c1d]' }
  : score >= 40 ? { label: 'Average', color: '#f5b942', soft: 'bg-amber-100 text-amber-700' }
  : { label: 'Needs attention', color: '#ef6f64', soft: 'bg-red-100 text-red-700' };

const initials = (name: string) => (name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const CARD = 'rounded-3xl bg-white border border-slate-100 overflow-hidden';

export function PerformancePanel() {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeePerf[]>([]);
  const [departments, setDepartments] = useState<DeptEfficiency[]>([]);
  const [tab, setTab] = useState<'departments' | 'employees'>('departments');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ceo/analytics');
      setEmployees(res.data.data.employeePerformance || []);
      setDepartments(res.data.data.departmentEfficiency || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchAnalytics(); }, []);
  useEffect(() => { setPage(1); }, [search, levelFilter, pageSize]);

  const rankedDepts = [...departments].sort((a, b) => b.efficiency - a.efficiency);
  const orgScore = departments.length ? Math.round(departments.reduce((s, d) => s + d.efficiency, 0) / departments.length) : 0;
  const totals = employees.reduce((t, e) => ({ total: t.total + e.total, done: t.done + e.completed, active: t.active + e.inProgress, overdue: t.overdue + e.overdue }), { total: 0, done: 0, active: 0, overdue: 0 });
  const waiting = Math.max(0, totals.total - totals.done - totals.active - totals.overdue);
  const pipeline = [
    { label: 'Done', value: totals.done, color: '#54b947' },
    { label: 'In progress', value: totals.active, color: '#256c1d' },
    { label: 'Not started', value: waiting, color: '#cbd5e1' },
    { label: 'Overdue', value: totals.overdue, color: '#ef6f64' },
  ];
  const focus = rankedDepts.filter((d) => d.efficiency < 60 || d.overdue > 0).sort((a, b) => a.efficiency - b.efficiency).slice(0, 4);
  const levels = ['Excellent', 'Good', 'Average', 'Needs attention'].map((label) => ({
    label, color: scoreLevel(label === 'Excellent' ? 90 : label === 'Good' ? 70 : label === 'Average' ? 50 : 10).color,
    count: employees.filter((e) => scoreLevel(e.score).label === label).length,
  }));
  const q = search.trim().toLowerCase();
  const visible = employees.filter((e) => (!q || e.name.toLowerCase().includes(q) || (e.role || '').toLowerCase().includes(q)) && (!levelFilter || scoreLevel(e.score).label === levelFilter));
  const pageRows = visible.slice((page - 1) * pageSize, page * pageSize);
  const podium = employees.slice(0, 3);
  const podiumOrder = podium.length === 3 ? [1, 0, 2] : podium.map((_, i) => i);
  const stats = [
    { label: 'Departments', value: String(departments.length) },
    { label: 'Contributors', value: String(employees.length) },
    { label: 'With overdue work', value: String(employees.filter((e) => e.overdue > 0).length) },
    { label: 'Top performer', value: employees[0]?.name?.split(' ')[0] || '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Performance Analytics</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Who is delivering, which teams are slipping, and where to step in.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex p-1 rounded-full bg-[#f4f6f3]">
            {([['departments', 'Departments'], ['employees', 'People']] as const).map(([id, text]) => (
              <button key={id} type="button" onClick={() => setTab(id)}
                className={cn('rounded-full px-5 h-9 text-sm font-semibold transition', tab === id ? 'bg-[#8ae47e] text-[#0b1d14]' : 'text-slate-600 hover:text-slate-900')}>{text}</button>
            ))}
          </div>
          <Button variant="outline" onClick={fetchAnalytics} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"><RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh</Button>
        </div>
      </div>

      {/* Organisation scoreboard */}
      <div className={CARD}>
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
          <div className="p-6 sm:p-8 flex flex-col items-center text-center lg:border-r border-b lg:border-b-0 border-slate-100">
            <p className="text-sm font-medium text-slate-500">Organisation score</p>
            <div className="mt-3"><GaugeMeter value={orgScore} /></div>
            <ScoreBadgeLg score={orgScore} />
          </div>
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
                <p className="text-lg font-semibold tracking-tight">Task pipeline</p>
                <p className="text-sm text-muted-foreground tabular-nums">{totals.total.toLocaleString(numLocale())} tasks · {totals.total ? Math.round((totals.done / totals.total) * 100) : 0}% done</p>
              </div>
              <div className="flex h-3.5 rounded-full overflow-hidden bg-[#f4f6f3]">
                {pipeline.filter((p) => p.value > 0).map((p) => <div key={p.label} title={`${p.label}: ${p.value}`} style={{ width: `${(p.value / (totals.total || 1)) * 100}%`, backgroundColor: p.color }} />)}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
                {pipeline.map((p) => (
                  <span key={p.label} className="inline-flex items-center gap-2 text-sm text-slate-600"><span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />{p.label}<span className="font-semibold text-slate-900 tabular-nums">{p.value}</span></span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
                {stats.map((c) => (
                  <div key={c.label} className="p-4">
                    <p className="text-xs font-medium text-slate-500">{c.label}</p>
                    <p className="text-2xl font-semibold tracking-tight mt-1 truncate">{c.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Departments */}
      {tab === 'departments' && (
        loading ? <div className="h-80 rounded-3xl bg-slate-100 animate-pulse" /> :
        departments.length === 0 ? (
          <div className={cn(CARD, 'py-14 text-center')}><p className="font-semibold text-slate-900">No department data yet</p><p className="text-sm text-muted-foreground mt-1">Scores appear once tasks are assigned.</p></div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
            <div className={cn(CARD, 'xl:col-span-2')}>
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-lg font-semibold tracking-tight">Department leaderboard</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Efficiency score, with completed and overdue work</p>
              </div>
              <div className="p-5 sm:p-6 space-y-3">
                {rankedDepts.map((d, i) => {
                  const l = scoreLevel(d.efficiency);
                  const done = d.total ? (d.completed / d.total) * 100 : 0, late = d.total ? (d.overdue / d.total) * 100 : 0;
                  return (
                    <div key={d.departmentId} className="rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors p-4 sm:p-5">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-white text-sm font-semibold text-slate-700 flex items-center justify-center shrink-0">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 truncate">{d.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{d.type} · {d.memberCount} members · {d.total} tasks</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-2xl font-semibold leading-none tabular-nums" style={{ color: l.color }}>{d.efficiency}</p>
                          <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold mt-1.5', l.soft)}>{l.label}</span>
                        </div>
                      </div>
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-white mt-4">
                        <div style={{ width: `${done}%`, background: '#54b947' }} title={`${d.completed} done`} />
                        <div style={{ width: `${late}%`, background: '#ef6f64' }} title={`${d.overdue} overdue`} />
                      </div>
                      <div className="flex gap-4 mt-2.5 text-xs text-slate-500">
                        <span><b className="text-slate-900 tabular-nums">{d.completed}</b> done</span>
                        <span><b className="text-slate-900 tabular-nums">{d.inProgress}</b> active</span>
                        <span><b className={cn('tabular-nums', d.overdue > 0 ? 'text-red-600' : 'text-slate-900')}>{d.overdue}</b> overdue</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={CARD}>
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-lg font-semibold tracking-tight">Focus areas</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Where to step in first</p>
              </div>
              <div className="p-5 sm:p-6 space-y-3">
                {focus.length === 0 ? (
                  <p className="text-sm font-semibold text-[#256c1d] rounded-2xl bg-[#eaf6e6] p-4">Every department is healthy. Nothing to chase.</p>
                ) : focus.map((d) => (
                  <div key={d.departmentId} className="rounded-2xl bg-[#f4f6f3] p-4">
                    <div className="flex items-center justify-between gap-2"><p className="font-semibold text-slate-900 truncate">{d.name}</p><span className="rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-semibold tabular-nums">{d.efficiency}</span></div>
                    <p className="text-xs text-muted-foreground mt-1.5">{d.overdue} overdue of {d.total} tasks · {d.completionRate}% done</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}

      {/* People */}
      {tab === 'employees' && (
        loading ? <div className="h-80 rounded-3xl bg-slate-100 animate-pulse" /> :
        employees.length === 0 ? (
          <div className={cn(CARD, 'py-14 text-center')}><p className="font-semibold text-slate-900">No employee task data yet</p></div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
            <div className={CARD}>
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-lg font-semibold tracking-tight">Top performers</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Best scores this period</p>
              </div>
              <div className="p-6">
                <div className="flex items-end justify-center gap-3 min-h-[220px]">
                  {podiumOrder.map((idx) => {
                    const e = podium[idx]; if (!e) return null;
                    const heights = ['h-32', 'h-24', 'h-16'];
                    const fills = ['bg-[#54b947]', 'bg-[#8ae47e]', 'bg-[#b8d8b0]'];
                    return (
                      <div key={e.userId} className="flex flex-col items-center w-24 text-center">
                        <div className="w-12 h-12 rounded-full bg-[#f4f6f3] text-slate-700 flex items-center justify-center font-semibold">{initials(e.name)}</div>
                        <p className="text-xs font-semibold mt-2 truncate w-full">{e.name.split(' ')[0]}</p>
                        <p className="text-[11px] text-muted-foreground">{e.completionRate}% done</p>
                        <div className={cn('mt-2 w-full rounded-t-2xl flex items-start justify-center pt-2 text-[#0b1d14] font-semibold text-lg', heights[idx], fills[idx])}>{idx + 1}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={cn(CARD, 'xl:col-span-2')}>
              <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div><h3 className="text-lg font-semibold tracking-tight">Full ranking</h3><p className="text-sm text-muted-foreground mt-0.5">{visible.length} of {employees.length} people</p></div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search name or role" className="pl-10 h-10 rounded-full bg-[#f4f6f3] border-0" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {levels.map((l) => (
                    <button key={l.label} type="button" onClick={() => setLevelFilter(levelFilter === l.label ? null : l.label)}
                      className={cn('inline-flex items-center gap-2 rounded-full px-3.5 h-9 text-xs font-semibold transition', levelFilter === l.label ? 'bg-[#0b1d14] text-white' : 'bg-[#f4f6f3] text-slate-700 hover:bg-[#eef5ec]')}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />{l.label}<span className="tabular-nums opacity-80">{l.count}</span>
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="pb-3 pr-3 font-medium w-10">#</th><th className="pb-3 pr-3 font-medium">Person</th>
                        <th className="pb-3 px-3 font-medium text-center">Tasks</th><th className="pb-3 px-3 font-medium text-center">Done</th>
                        <th className="pb-3 px-3 font-medium text-center">Active</th><th className="pb-3 px-3 font-medium text-center">Overdue</th>
                        <th className="pb-3 pl-3 font-medium text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visible.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No one matches.</td></tr>}
                      {pageRows.map((e) => {
                        const l = scoreLevel(e.score);
                        return (
                          <tr key={e.userId} className="hover:bg-[#f7faf6] transition-colors">
                            <td className="py-3 pr-3 text-muted-foreground tabular-nums">{employees.indexOf(e) + 1}</td>
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-3">
                                <span className="w-9 h-9 rounded-full bg-[#f4f6f3] text-xs font-semibold text-slate-700 flex items-center justify-center shrink-0">{initials(e.name)}</span>
                                <div className="min-w-0"><p className="font-semibold text-slate-900 truncate">{e.name}</p><p className="text-xs text-muted-foreground capitalize truncate">{e.role?.replace(/_/g, ' ')}</p></div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center tabular-nums">{e.total}</td>
                            <td className="py-3 px-3 text-center tabular-nums font-semibold text-[#256c1d]">{e.completed}</td>
                            <td className="py-3 px-3 text-center tabular-nums">{e.inProgress}</td>
                            <td className={cn('py-3 px-3 text-center tabular-nums', e.overdue > 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>{e.overdue}</td>
                            <td className="py-3 pl-3 text-right"><span className={cn('inline-block min-w-[48px] text-center rounded-full px-3 py-1 text-xs font-semibold', l.soft)}>{e.score}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <ListPagination total={visible.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
                <p className="text-xs text-muted-foreground">Score = 70% completion rate + 30% on-time (not overdue) work.</p>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function ScoreBadgeLg({ score }: { score: number }) {
  const l = scoreLevel(score);
  return <span className={cn('inline-block rounded-full px-3.5 py-1 text-xs font-semibold mt-2', l.soft)}>{l.label}</span>;
}
