import { useState, useEffect } from 'react';
import { Building2, Crown, Flame, RefreshCw, Search, Sparkles, Target, Trophy, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

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

// SVG Arc Gauge — semicircle, 0–100 scale
function GaugeMeter({ value, size = 160 }: { value: number; size?: number }) {
  const clamp = Math.max(0, Math.min(100, value));
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size * 0.58;
  const startAngle = Math.PI; // 180°
  const endAngle = 0;         // 0°

  // Arc path helper
  const polarToXY = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  });

  // Background arc (full semicircle)
  const bgStart = polarToXY(startAngle, r);
  const bgEnd = polarToXY(endAngle, r);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 0 1 ${bgEnd.x} ${bgEnd.y}`;

  // Filled arc (value portion)
  const fillAngle = startAngle - (clamp / 100) * Math.PI;
  const fillEnd = polarToXY(fillAngle, r);
  const largeArc = clamp > 50 ? 1 : 0;
  const fillPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`;

  // Color zones
  const gaugeColor = clamp >= 67 ? '#22c55e' : clamp >= 34 ? '#f59e0b' : '#ef4444';
  const trackColor = 'hsl(var(--muted))';

  // Needle
  const needleAngle = startAngle - (clamp / 100) * Math.PI;
  const needleLen = r * 0.85;
  const needleTip = polarToXY(needleAngle, needleLen);
  const needleBase1 = polarToXY(needleAngle + Math.PI / 2, 4);
  const needleBase2 = polarToXY(needleAngle - Math.PI / 2, 4);

  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      {/* Zone ticks */}
      {[0, 33, 67, 100].map((tick) => {
        const a = startAngle - (tick / 100) * Math.PI;
        const inner = polarToXY(a, r - 8);
        const outer = polarToXY(a, r + 2);
        return <line key={tick} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="hsl(var(--border))" strokeWidth={1.5} />;
      })}
      {/* Track */}
      <path d={bgPath} fill="none" stroke={trackColor} strokeWidth={14} strokeLinecap="round" />
      {/* Red zone 0–33 */}
      {(() => {
        const zEnd = polarToXY(startAngle - 0.33 * Math.PI, r);
        return <path d={`M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 0 1 ${zEnd.x} ${zEnd.y}`} fill="none" stroke="#ef444430" strokeWidth={14} strokeLinecap="round" />;
      })()}
      {/* Yellow zone 33–67 */}
      {(() => {
        const zStart = polarToXY(startAngle - 0.33 * Math.PI, r);
        const zEnd = polarToXY(startAngle - 0.67 * Math.PI, r);
        return <path d={`M ${zStart.x} ${zStart.y} A ${r} ${r} 0 0 1 ${zEnd.x} ${zEnd.y}`} fill="none" stroke="#f59e0b30" strokeWidth={14} strokeLinecap="round" />;
      })()}
      {/* Green zone 67–100 */}
      {(() => {
        const zStart = polarToXY(startAngle - 0.67 * Math.PI, r);
        return <path d={`M ${zStart.x} ${zStart.y} A ${r} ${r} 0 0 1 ${bgEnd.x} ${bgEnd.y}`} fill="none" stroke="#22c55e30" strokeWidth={14} strokeLinecap="round" />;
      })()}
      {/* Value fill */}
      {clamp > 0 && (
        <path d={fillPath} fill="none" stroke={gaugeColor} strokeWidth={14} strokeLinecap="round" />
      )}
      {/* Needle */}
      <polygon
        points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
        fill={gaugeColor}
        opacity={0.9}
      />
      <circle cx={cx} cy={cy} r={5} fill={gaugeColor} />
      {/* Labels */}
      <text x={cx - r - 4} y={cy + 14} fontSize={9} fill="hsl(var(--muted-foreground))" textAnchor="middle">1</text>
      <text x={cx + r + 4} y={cy + 14} fontSize={9} fill="hsl(var(--muted-foreground))" textAnchor="middle">100</text>
      {/* Value */}
      <text x={cx} y={cy - 6} fontSize={22} fontWeight="bold" fill={gaugeColor} textAnchor="middle">{clamp}</text>
      <text x={cx} y={cy + 10} fontSize={9} fill="hsl(var(--muted-foreground))" textAnchor="middle">efficiency</text>
    </svg>
  );
}

const scoreLevel = (score: number) =>
  score >= 80 ? { label: 'Excellent', color: '#10b981', soft: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' }
  : score >= 60 ? { label: 'Good', color: '#6366f1', soft: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' }
  : score >= 40 ? { label: 'Average', color: '#f59e0b', soft: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' }
  : { label: 'Needs attention', color: '#f43f5e', soft: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' };

const DEPT_TYPE_COLORS: Record<string, string> = { hr: '#0ea5e9', finance: '#10b981', operations: '#6366f1', sales: '#f59e0b' };
const initials = (name: string) => (name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const CARD = 'rounded-3xl border-0 shadow-md ring-1 ring-border/60 py-6 gap-5';

export function PerformancePanel() {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeePerf[]>([]);
  const [departments, setDepartments] = useState<DeptEfficiency[]>([]);
  const [tab, setTab] = useState<'departments' | 'employees'>('departments');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

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

  const rankedDepts = [...departments].sort((a, b) => b.efficiency - a.efficiency);
  const orgScore = departments.length ? Math.round(departments.reduce((s, d) => s + d.efficiency, 0) / departments.length) : 0;
  const totals = employees.reduce((t, e) => ({ total: t.total + e.total, done: t.done + e.completed, active: t.active + e.inProgress, overdue: t.overdue + e.overdue }), { total: 0, done: 0, active: 0, overdue: 0 });
  const waiting = Math.max(0, totals.total - totals.done - totals.active - totals.overdue);
  const pipeline = [
    { label: 'Done', value: totals.done, color: '#10b981' },
    { label: 'In progress', value: totals.active, color: '#0ea5e9' },
    { label: 'Not started', value: waiting, color: '#cbd5e1' },
    { label: 'Overdue', value: totals.overdue, color: '#f43f5e' },
  ];
  const focus = rankedDepts.filter((d) => d.efficiency < 60 || d.overdue > 0).sort((a, b) => a.efficiency - b.efficiency).slice(0, 4);
  const levels = ['Excellent', 'Good', 'Average', 'Needs attention'].map((label) => ({
    label, color: scoreLevel(label === 'Excellent' ? 90 : label === 'Good' ? 70 : label === 'Average' ? 50 : 10).color,
    count: employees.filter((e) => scoreLevel(e.score).label === label).length,
  }));
  const q = search.trim().toLowerCase();
  const visible = employees.filter((e) => (!q || e.name.toLowerCase().includes(q) || (e.role || '').toLowerCase().includes(q)) && (!levelFilter || scoreLevel(e.score).label === levelFilter));
  const podium = employees.slice(0, 3);
  const podiumOrder = podium.length === 3 ? [1, 0, 2] : podium.map((_, i) => i);

  return (
    <div className="space-y-6">
      {/* Header: light, with the view switch beside the title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white shadow-lg"><Sparkles className="w-6 h-6" /></div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Performance Analytics</h2>
            <p className="text-sm text-muted-foreground">Who is delivering, which teams are slipping, and where to step in.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex p-1 rounded-full bg-muted/70 border">
            {([['departments', 'Departments', Building2], ['employees', 'People', Users]] as const).map(([id, text, Icon]) => (
              <button key={id} onClick={() => setTab(id)}
                className={cn('inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition', tab === id ? 'bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white shadow' : 'text-muted-foreground hover:text-foreground')}>
                <Icon className="w-4 h-4" />{text}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={fetchAnalytics} disabled={loading} title="Refresh"><RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /></Button>
        </div>
      </div>

      {/* Organisation scoreboard */}
      <Card className={cn(CARD, 'overflow-hidden bg-gradient-to-br from-fuchsia-50/70 via-white to-indigo-50/60 dark:from-fuchsia-950/20 dark:via-card dark:to-indigo-950/20')}>
        <CardContent className="px-7 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-center">
          <div className="flex flex-col items-center text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Organisation score</p>
            <GaugeMeter value={orgScore} size={230} />
            <ScoreBadgeLg score={orgScore} />
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex items-end justify-between mb-2">
                <p className="font-semibold">Task pipeline</p>
                <p className="text-sm text-muted-foreground tabular-nums">{totals.total.toLocaleString(numLocale())} tasks · {totals.total ? Math.round((totals.done / totals.total) * 100) : 0}% done</p>
              </div>
              <div className="flex h-4 rounded-full overflow-hidden bg-muted">
                {pipeline.filter((p) => p.value > 0).map((p) => <div key={p.label} title={`${p.label}: ${p.value}`} style={{ width: `${(p.value / (totals.total || 1)) * 100}%`, backgroundColor: p.color }} />)}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
                {pipeline.map((p) => (
                  <span key={p.label} className="inline-flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />{p.label}<span className="font-bold tabular-nums">{p.value}</span></span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Chip icon={Building2} tint="bg-indigo-500/10 text-indigo-600" label="Departments" value={String(departments.length)} />
              <Chip icon={Users} tint="bg-emerald-500/10 text-emerald-600" label="Contributors" value={String(employees.length)} />
              <Chip icon={Flame} tint="bg-rose-500/10 text-rose-600" label="With overdue" value={String(employees.filter((e) => e.overdue > 0).length)} />
              <Chip icon={Crown} tint="bg-amber-500/10 text-amber-600" label="Top performer" value={employees[0]?.name?.split(' ')[0] || '—'} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Departments */}
      {tab === 'departments' && (
        loading ? <div className="h-80 rounded-3xl bg-muted/50 animate-pulse" /> :
        departments.length === 0 ? (
          <Card className={CARD}><CardContent className="py-10 text-center text-muted-foreground"><Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No department data yet. Scores appear once tasks are assigned.</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className={cn(CARD, 'xl:col-span-2')}>
              <CardContent className="px-7 space-y-4">
                <div><h3 className="text-lg font-semibold">Department leaderboard</h3><p className="text-sm text-muted-foreground">Efficiency score, with completed and overdue work</p></div>
                <div className="space-y-3">
                  {rankedDepts.map((d, i) => {
                    const l = scoreLevel(d.efficiency); const tc = DEPT_TYPE_COLORS[d.type] || '#64748b';
                    const done = d.total ? (d.completed / d.total) * 100 : 0, late = d.total ? (d.overdue / d.total) * 100 : 0;
                    return (
                      <div key={d.departmentId} className="rounded-2xl border p-4 hover:shadow-md transition" style={{ borderLeft: `4px solid ${tc}` }}>
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl text-sm font-bold text-white flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${tc}, ${tc}bb)` }}>{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate">{d.name}</p>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{d.type} · {d.memberCount} members · {d.total} tasks</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-2xl font-bold leading-none tabular-nums" style={{ color: l.color }}>{d.efficiency}</p>
                            <span className={cn('inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold mt-1', l.soft)}>{l.label}</span>
                          </div>
                        </div>
                        <div className="flex h-2.5 rounded-full overflow-hidden bg-muted mt-3">
                          <div style={{ width: `${done}%`, background: '#10b981' }} title={`${d.completed} done`} />
                          <div style={{ width: `${late}%`, background: '#f43f5e' }} title={`${d.overdue} overdue`} />
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span><b className="text-emerald-600 tabular-nums">{d.completed}</b> done</span>
                          <span><b className="text-sky-600 tabular-nums">{d.inProgress}</b> active</span>
                          <span><b className="text-rose-600 tabular-nums">{d.overdue}</b> overdue</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className={cn(CARD, 'self-start')}>
              <CardContent className="px-7 space-y-4">
                <div className="flex items-center gap-2"><Target className="w-5 h-5 text-rose-500" /><h3 className="text-lg font-semibold">Focus areas</h3></div>
                {focus.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 p-4">Every department is healthy. Nothing to chase.</p>
                ) : focus.map((d) => (
                  <div key={d.departmentId} className="rounded-2xl bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-card border border-rose-200/70 dark:border-rose-900/40 p-4">
                    <div className="flex items-center justify-between"><p className="font-semibold truncate">{d.name}</p><span className="text-sm font-bold text-rose-600">{d.efficiency}</span></div>
                    <p className="text-xs text-muted-foreground mt-1">{d.overdue} overdue of {d.total} tasks · {d.completionRate}% done</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )
      )}

      {/* People */}
      {tab === 'employees' && (
        loading ? <div className="h-80 rounded-3xl bg-muted/50 animate-pulse" /> :
        employees.length === 0 ? (
          <Card className={CARD}><CardContent className="py-10 text-center text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No employee task data yet</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Podium */}
            <Card className={cn(CARD, 'self-start overflow-hidden')}>
              <CardContent className="px-6">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Top performers</h3>
                <div className="flex items-end justify-center gap-3 mt-6 min-h-[230px]">
                  {podiumOrder.map((idx) => {
                    const e = podium[idx]; if (!e) return null;
                    const heights = ['h-36', 'h-28', 'h-20'];
                    const grads = ['from-amber-300 to-amber-500', 'from-slate-300 to-slate-500', 'from-orange-300 to-orange-600'];
                    return (
                      <div key={e.userId} className="flex flex-col items-center w-24 text-center">
                        {idx === 0 && <Crown className="w-5 h-5 text-amber-500 mb-1" />}
                        <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center font-bold shadow-lg', grads[idx])}>{initials(e.name)}</div>
                        <p className="text-xs font-semibold mt-2 truncate w-full">{e.name.split(' ')[0]}</p>
                        <p className="text-[11px] text-muted-foreground">{e.completionRate}% done</p>
                        <div className={cn('mt-2 w-full rounded-t-2xl bg-gradient-to-b flex items-start justify-center pt-2 text-white font-bold text-lg', heights[idx], grads[idx])}>{idx + 1}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Ranking table */}
            <Card className={cn(CARD, 'xl:col-span-2')}>
              <CardContent className="px-7 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div><h3 className="text-lg font-semibold">Full ranking</h3><p className="text-sm text-muted-foreground">{visible.length} of {employees.length} people</p></div>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search name or role" className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {levels.map((l) => (
                    <button key={l.label} onClick={() => setLevelFilter(levelFilter === l.label ? null : l.label)}
                      className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition', levelFilter === l.label ? 'text-white border-transparent shadow' : 'hover:border-foreground/30')}
                      style={levelFilter === l.label ? { background: l.color } : undefined}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: levelFilter === l.label ? '#fff' : l.color }} />{l.label}<b className="tabular-nums">{l.count}</b>
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                        <th className="pb-2 pr-3 font-semibold w-10">#</th><th className="pb-2 pr-3 font-semibold">Person</th>
                        <th className="pb-2 px-3 font-semibold text-center">Tasks</th><th className="pb-2 px-3 font-semibold text-center">Done</th>
                        <th className="pb-2 px-3 font-semibold text-center">Active</th><th className="pb-2 px-3 font-semibold text-center">Overdue</th>
                        <th className="pb-2 pl-3 font-semibold text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {visible.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No one matches.</td></tr>}
                      {visible.map((e) => {
                        const l = scoreLevel(e.score);
                        return (
                          <tr key={e.userId} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 pr-3 text-muted-foreground tabular-nums">{employees.indexOf(e) + 1}</td>
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-3">
                                <span className="w-9 h-9 rounded-xl text-xs font-bold text-white flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${l.color}, ${l.color}aa)` }}>{initials(e.name)}</span>
                                <div className="min-w-0"><p className="font-semibold truncate">{e.name}</p><p className="text-xs text-muted-foreground capitalize truncate">{e.role?.replace(/_/g, ' ')}</p></div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center tabular-nums">{e.total}</td>
                            <td className="py-3 px-3 text-center tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">{e.completed}</td>
                            <td className="py-3 px-3 text-center tabular-nums text-sky-600 dark:text-sky-400">{e.inProgress}</td>
                            <td className={cn('py-3 px-3 text-center tabular-nums', e.overdue > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-muted-foreground')}>{e.overdue}</td>
                            <td className="py-3 pl-3 text-right"><span className="inline-block min-w-[48px] text-center rounded-lg px-2.5 py-1 font-bold text-white" style={{ background: l.color }}>{e.score}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">Score = 70% completion rate + 30% on-time (not overdue) work.</p>
              </CardContent>
            </Card>
          </div>
        )
      )}
    </div>
  );
}

function ScoreBadgeLg({ score }: { score: number }) {
  const l = scoreLevel(score);
  return <span className={cn('inline-block rounded-full px-3 py-1 text-xs font-semibold mt-1', l.soft)}>{l.label}</span>;
}

function Chip({ icon: Icon, tint, label, value }: { icon: any; tint: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card/80 p-3 flex items-center gap-3">
      <div className={cn('p-2 rounded-xl', tint)}><Icon className="w-4 h-4" /></div>
      <div className="min-w-0"><p className="font-bold truncate leading-tight">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>
    </div>
  );
}
