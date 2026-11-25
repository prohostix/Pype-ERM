import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Person { id: string; name: string; email?: string; role?: string }
interface Escalation {
  id: string; status: string; type: string; impact: string; priority: string; reason: string;
  currentLevel: number; maxLevel: number; escalatedAt: string; resolution?: string; resolvedAt?: string;
  chain?: { level?: string | number; action?: string; timestamp?: string; by?: string; note?: string }[];
  employee?: Person; deptAdmin?: Person; handler?: Person; resolver?: Person;
  task?: { id: string; title: string; description?: string; deadline?: string; priority?: string; status?: string } | null;
}
interface WatchTask { id: string; title: string; deadline: string; priority: string; gracePeriodEnd?: string; escalationStatus?: string; assignee?: Person }

const PRIORITY: Record<string, { label: string; color: string; soft: string }> = {
  critical: { label: 'Critical', color: '#ef4444', soft: 'bg-red-100 text-red-700' },
  high: { label: 'High', color: '#f97316', soft: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Medium', color: '#f59e0b', soft: 'bg-amber-100 text-amber-700' },
  low: { label: 'Low', color: '#0ea5e9', soft: 'bg-sky-100 text-sky-700' },
};
const prio = (p?: string) => PRIORITY[(p || '').toLowerCase()] || PRIORITY.medium;
const CARD = 'rounded-3xl bg-white border border-slate-100 shadow-none py-6 gap-4';
const isOpen = (e: Escalation) => e.status !== 'resolved';
const initials = (name?: string) => (name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const ago = (iso?: string) => {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
};
const ageDays = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const fmtDate = (iso?: string, time = false) => (iso ? new Date(iso).toLocaleString('en-IN', time ? { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const countdown = (iso?: string) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { text: 'Grace period over', late: true };
  const h = Math.floor(ms / 3600000);
  return { text: h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h left`, late: h < 12 };
};

export function EscalationsPanel() {
  const [items, setItems] = useState<Escalation[]>([]);
  const [watch, setWatch] = useState<WatchTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'open' | 'resolved' | 'all'>('open');
  const [level, setLevel] = useState('all');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Escalation | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ceo/escalations');
      setItems(res.data?.data || []);
      setWatch(res.data?.watchlist || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const open = items.filter(isOpen);
  const urgent = open.filter((e) => ['critical', 'high'].includes((e.priority || '').toLowerCase()));
  const resolved = items.filter((e) => !isOpen(e));
  const oldest = open.length ? Math.max(...open.map((e) => ageDays(e.escalatedAt))) : 0;
  const q = search.trim().toLowerCase();

  const rows = items
    .filter((e) => (view === 'all' ? true : view === 'open' ? isOpen(e) : !isOpen(e)))
    .filter((e) => level === 'all' || (e.priority || '').toLowerCase() === level)
    .filter((e) => !q || (e.task?.title || '').toLowerCase().includes(q) || (e.employee?.name || '').toLowerCase().includes(q) || (e.reason || '').toLowerCase().includes(q))
    .sort((a, b) => {
      const rank = (x: Escalation) => ['critical', 'high', 'medium', 'low'].indexOf((x.priority || 'medium').toLowerCase());
      return view === 'resolved' ? +new Date(b.resolvedAt || b.escalatedAt) - +new Date(a.resolvedAt || a.escalatedAt) : (rank(a) - rank(b)) || (+new Date(a.escalatedAt) - +new Date(b.escalatedAt));
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Escalations</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Work that could not be settled in the department and needs a decision from you.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"><RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh</Button>
      </div>

      {/* Triage strip */}
      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100">
          <Stat value={open.length} label="Open escalations" />
          <Stat value={urgent.length} label="Critical or high" tone={urgent.length > 0 ? 'bad' : undefined} />
          <Stat value={oldest ? `${oldest}d` : '—'} label="Oldest open" />
          <Stat value={resolved.length} label="Resolved" tone="good" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        {/* Queue */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="inline-flex p-1.5 rounded-full bg-white border border-slate-100 w-fit gap-1">
              {([['open', `Open (${open.length})`], ['resolved', `Resolved (${resolved.length})`], ['all', `All (${items.length})`]] as const).map(([id, text]) => (
                <button key={id} onClick={() => setView(id)} className={cn('rounded-full px-5 py-2 text-sm font-semibold transition', view === id ? 'bg-[#8ae47e] text-[#0b1d14]' : 'text-slate-600 hover:bg-[#eaf6e6]')}>{text}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input className="pl-11 h-11 w-60 rounded-full bg-white border-slate-200" placeholder="Search task or person" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="h-11 w-40 rounded-full bg-white border-slate-200 px-5 text-sm font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {Object.entries(PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading && items.length === 0 ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse" />)}</div>
          ) : rows.length === 0 ? (
            <Card className={CARD}><CardContent className="py-12 text-center">
              <p className="font-semibold">{items.length === 0 ? 'No escalations yet' : view === 'open' ? 'Nothing is waiting for you' : 'No escalations match'}</p>
              <p className="text-sm text-muted-foreground mt-1">{items.length === 0 ? 'When a department cannot settle an overdue task, it lands here.' : 'Try another view or clear the search.'}</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {rows.map((e) => {
                const p = prio(e.priority);
                const done = !isOpen(e);
                const days = ageDays(e.escalatedAt);
                return (
                  <button key={e.id} onClick={() => setPicked(e)} className="w-full text-left rounded-3xl bg-white border border-slate-100 p-5 hover:border-[#8ae47e] transition-colors relative overflow-hidden" style={{ borderLeft: `5px solid ${done ? '#54b947' : p.color}` }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={cn('rounded-full px-3 py-0.5 text-[11px] font-semibold', p.soft)}>{p.label}</span>
                          {done ? <span className="rounded-full px-3 py-0.5 text-[11px] font-semibold bg-[#dff3da] text-[#256c1d]">Resolved</span>
                            : <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', days >= 3 ? 'bg-red-100 text-red-700' : 'bg-slate-200/70 text-slate-600')}>{ago(e.escalatedAt)}{days >= 3 ? ' · overdue for action' : ''}</span>}
                          {e.type && e.type !== 'general' && <span className="rounded-full px-3 py-0.5 text-[11px] font-semibold bg-[#f4f6f3] text-slate-600 capitalize">{e.type.replace(/_/g, ' ')}</span>}
                        </div>
                        <h4 className="font-semibold text-base truncate">{e.task?.title || e.reason || 'Escalation'}</h4>
                        {e.reason && e.task?.title && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{e.reason}</p>}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-xs text-muted-foreground">
                          {e.employee && <span className="inline-flex items-center gap-2"><Avatar name={e.employee.name} />{e.employee.name}</span>}
                          {e.deptAdmin && <span className="inline-flex items-center gap-1.5">→ <Avatar name={e.deptAdmin.name} />{e.deptAdmin.name}</span>}
                          {e.task?.deadline && <span className="inline-flex items-center gap-1.5">Due {fmtDate(e.task.deadline)}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <LevelDots level={e.currentLevel} max={e.maxLevel} color={done ? '#54b947' : p.color} />
                        <span className="inline-flex items-center text-sm font-semibold text-[#256c1d]">{done ? 'View' : 'Take action'}<ChevronRight className="w-4 h-4" /></span>
                      </div>
                    </div>
                    {done && e.resolution && <p className="text-xs text-[#256c1d] mt-3 line-clamp-1">{e.resolution}</p>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Watchlist */}
        <Card className={cn(CARD, 'self-start')}>
          <CardContent className="px-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Watchlist</h3>
              <p className="text-sm text-muted-foreground">Overdue tasks that may be escalated next</p>
            </div>
            {watch.length === 0 ? (
              <p className="text-sm rounded-2xl bg-[#eaf6e6] text-[#256c1d] p-4">No overdue tasks right now.</p>
            ) : (
              <div className="space-y-3">
                {watch.slice(0, 8).map((t) => {
                  const p = prio(t.priority); const c = countdown(t.gracePeriodEnd);
                  return (
                    <div key={t.id} className="rounded-2xl bg-[#f4f6f3] p-3.5" style={{ borderLeft: `4px solid ${p.color}` }}>
                      <p className="font-medium text-sm truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.assignee?.name || 'Unassigned'} · due {fmtDate(t.deadline)}</p>
                      {c && <span className={cn('inline-block mt-2 rounded-full px-2 py-0.5 text-[10px] font-semibold', c.late ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>{c.text}</span>}
                    </div>
                  );
                })}
                {watch.length > 8 && <p className="text-xs text-muted-foreground text-center">+{watch.length - 8} more overdue</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          {picked && <Detail esc={picked} onDone={() => { setPicked(null); load(); }} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Avatar({ name }: { name?: string }) {
  return <span className="w-6 h-6 rounded-full bg-[#eaf6e6] text-[#256c1d] text-[9px] font-semibold flex items-center justify-center shrink-0">{initials(name)}</span>;
}

function Stat({ value, label, tone }: { value: string | number; label: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="p-5 sm:p-6">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={cn('text-3xl font-semibold tracking-tight tabular-nums mt-2', tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-[#256c1d]' : 'text-slate-900')}>{value}</p>
    </div>
  );
}

function LevelDots({ level, max, color }: { level: number; max: number; color: string }) {
  return (
    <div className="text-right">
      <div className="flex gap-1 justify-end">{Array.from({ length: Math.max(1, max || 3) }, (_, i) => <span key={i} className="w-5 h-1.5 rounded-full" style={{ background: i < (level || 1) ? color : '#e5e7e0' }} />)}</div>
      <p className="text-[10px] text-muted-foreground mt-1">Level {level || 1} of {max || 3}</p>
    </div>
  );
}

// ─── Detail + action ──────────────────────────────────────────────────────────
const ACTIONS = [
  { id: 'resolve', label: 'Resolve', hint: 'Close it with a note' },
  { id: 'reassign', label: 'Reassign', hint: 'Give the task to someone else' },
  { id: 'extend', label: 'Extend deadline', hint: 'Give more time' },
  { id: 'justify', label: 'Justify', hint: 'Accept the delay with a reason' },
] as const;

function Detail({ esc, onDone }: { esc: Escalation; onDone: () => void }) {
  const p = prio(esc.priority);
  const done = !isOpen(esc);
  const [action, setAction] = useState<string>('');
  const [resolution, setResolution] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [reassignTo, setReassignTo] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (action !== 'reassign' || people.length) return;
    api.get('/users').then((r) => setPeople((r.data?.data || []).filter((u: any) => u.status !== 'resigned' && u.role !== 'student').map((u: any) => ({ id: u.id, name: u.name, role: u.role })))).catch(() => toast.error('Could not load people'));
  }, [action, people.length]);

  const needsNote = action === 'resolve' || action === 'justify';
  const ready = !!action && (!needsNote || resolution.trim()) && (action !== 'extend' || newDeadline) && (action !== 'reassign' || reassignTo);
  const timeline = useMemo(() => {
    const t = [{ title: 'Escalated', sub: esc.reason, at: esc.escalatedAt }];
    (esc.chain || []).forEach((c) => t.push({ title: c.action || `Level ${c.level ?? ''}`, sub: c.note || (c.by ? `by ${c.by}` : ''), at: c.timestamp || '' }));
    if (esc.resolvedAt) t.push({ title: 'Resolved', sub: esc.resolution || '', at: esc.resolvedAt });
    return t;
  }, [esc]);

  const submit = async () => {
    setBusy(true);
    try {
      await api.patch(`/ceo/escalations/${esc.id}`, { action, resolution, newDeadline, reassignTo });
      toast.success('Escalation handled');
      onDone();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to handle the escalation');
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="p-6 bg-[#f4f6f3] border-b border-slate-100">
        <SheetHeader className="p-0">
          <p className="text-xs font-semibold text-slate-500">{done ? 'Resolved' : `${p.label} priority`} · {ago(esc.escalatedAt)}</p>
          <SheetTitle className="text-xl leading-snug font-semibold tracking-tight text-slate-900">{esc.task?.title || 'Escalation'}</SheetTitle>
          <SheetDescription className="text-slate-600">{esc.reason}</SheetDescription>
        </SheetHeader>
        <div className="mt-4"><LevelDots level={esc.currentLevel} max={esc.maxLevel} color={done ? '#54b947' : p.color} /></div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Who label="Raised for" person={esc.employee} />
          <Who label="Department admin" person={esc.deptAdmin} />
        </div>
        {esc.task && (
          <div className="rounded-2xl bg-[#f4f6f3] p-4 text-sm space-y-1.5">
            <p className="font-semibold">Task</p>
            {esc.task.description && <p className="text-muted-foreground">{esc.task.description}</p>}
            <p className="text-xs text-muted-foreground">{esc.task.deadline ? `Due ${fmtDate(esc.task.deadline)}` : ''}{esc.task.status ? ` · ${esc.task.status.replace(/_/g, ' ')}` : ''}</p>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-3">History</h4>
          <div className="space-y-4 border-l-2 border-slate-200 ml-1.5">
            {timeline.map((t, i) => (
              <div key={i} className="relative pl-5">
                <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full ring-4 ring-background" style={{ background: i === timeline.length - 1 && done ? '#54b947' : p.color }} />
                <p className="text-sm font-semibold capitalize">{t.title}</p>
                {t.sub && <p className="text-sm text-muted-foreground">{t.sub}</p>}
                {t.at && <p className="text-[11px] text-muted-foreground/80 mt-0.5">{fmtDate(t.at, true)}</p>}
              </div>
            ))}
          </div>
        </div>

        {done ? (
          <div className="rounded-2xl bg-[#eaf6e6] text-[#256c1d] p-4 text-sm">
            <p className="font-semibold">Handled{esc.resolver?.name || esc.handler?.name ? ` by ${esc.resolver?.name || esc.handler?.name}` : ''}</p>
            {esc.resolution && <p className="mt-1">{esc.resolution}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-900">Your decision</h4>
            <div className="grid grid-cols-2 gap-2.5">
              {ACTIONS.map((a) => (
                <button key={a.id} onClick={() => setAction(a.id)} className={cn('text-left rounded-2xl p-4 transition border', action === a.id ? 'bg-[#eaf6e6] border-[#8ae47e]' : 'bg-[#f4f6f3] border-transparent hover:bg-[#eef5ec]')}>
                  <p className="font-semibold text-sm">{a.label}</p>
                  <p className="text-[11px] text-muted-foreground">{a.hint}</p>
                </button>
              ))}
            </div>
            {action === 'reassign' && (
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger><SelectValue placeholder="Choose who takes the task" /></SelectTrigger>
                <SelectContent className="max-h-72">{people.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}{u.role ? ` · ${u.role.replace(/_/g, ' ')}` : ''}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {action === 'extend' && <Input type="date" value={newDeadline} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setNewDeadline(e.target.value)} />}
            {needsNote && <Textarea rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder={action === 'resolve' ? 'What was decided or done?' : 'Why is the delay acceptable?'} />}
            <Button className="w-full h-12 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" disabled={!ready || busy} onClick={submit}>{busy ? 'Submitting…' : 'Confirm decision'}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Who({ label, person }: { label: string; person?: Person }) {
  return (
    <div className="rounded-2xl bg-[#f4f6f3] p-3.5">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="font-semibold text-sm mt-1.5 truncate">{person?.name || '—'}</p>
      {person?.role && <p className="text-[11px] text-muted-foreground capitalize truncate">{person.role.replace(/_/g, ' ')}</p>}
    </div>
  );
}
