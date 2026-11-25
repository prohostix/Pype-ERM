import { useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Check, ChevronRight, Filter, Pencil, Plus, Sparkles, Tags, Trash2, Users, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface FilterOption { id: string; label: string; color?: string | null; isArchived: boolean; studentCount: number }
interface FilterType { id: string; name: string; isActive: boolean; options: FilterOption[] }

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];
const FALLBACK = '#94a3b8';
const SUGGESTIONS = [
  { name: 'Follow-up stage', options: ['Hot', 'Warm', 'Cold'] },
  { name: 'Lead source', options: ['Walk-in', 'Social media', 'Referral', 'Campaign'] },
  { name: 'Document status', options: ['Complete', 'Partial', 'Missing'] },
];

const errorOf = (e: any, fallback: string) => e?.response?.data?.message || fallback;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Org admin: define the custom dropdown filters used in the student directory. */
export function StudentFiltersPanel() {
  const [types, setTypes] = useState<FilterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ name: string; options: string[] } | null>(null);

  const load = async (selectId?: string) => {
    try {
      const res = await api.get('/student-filters', { params: { all: true } });
      const data: FilterType[] = res.data?.data || [];
      setTypes(data);
      setSelectedId((cur) => selectId || (cur && data.some((t) => t.id === cur) ? cur : data[0]?.id || null));
    } catch (e) {
      toast.error(errorOf(e, 'Could not load the filters'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const live = types.flatMap((t) => t.options.filter((o) => !o.isArchived));
    return {
      filters: types.length,
      active: types.filter((t) => t.isActive).length,
      options: live.length,
      tagged: types.reduce((s, t) => Math.max(s, t.options.reduce((n, o) => n + o.studentCount, 0)), 0),
    };
  }, [types]);

  const selected = types.find((t) => t.id === selectedId) || null;
  const openCreate = (p: { name: string; options: string[] } | null = null) => { setPrefill(p); setCreateOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Student Filters</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Create your own dropdown filters, for example <span className="font-medium text-foreground">Follow-up stage: Hot, Warm, Cold</span>. Staff set a value on each student, the filter appears in the student directory, and every change is kept in the student's history.
          </p>
        </div>
        <Button onClick={() => openCreate()} className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm shrink-0 self-start lg:self-auto"><Plus className="w-4 h-4" />New filter</Button>
      </div>

      {/* Stats */}
      {types.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <StatTile icon={Filter} label="Filters" value={stats.filters} hint={`${stats.active} turned on`} />
          <StatTile icon={Tags} label="Options" value={stats.options} hint="across all filters" />
          <StatTile icon={Users} label="Students tagged" value={stats.tagged} hint="in the busiest filter" />
          <StatTile icon={Sparkles} label="Limits" value="10 / 30" hint="filters / options each" />
        </div>
      )}

      {loading ? (
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-3xl bg-[#f4f6f3] animate-pulse" />)}</div>
          <div className="h-80 rounded-3xl bg-[#f4f6f3] animate-pulse" />
        </div>
      ) : types.length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <div className="grid lg:grid-cols-[320px_1fr] gap-5 sm:gap-6 items-start">
          {/* Filter list */}
          <div className="space-y-2.5">
            {types.map((t) => <FilterListItem key={t.id} type={t} active={t.id === selectedId} onSelect={() => setSelectedId(t.id)} />)}
          </div>
          {/* Detail */}
          {selected && <FilterDetail key={selected.id} type={selected} onChanged={load} onDeleted={() => { setSelectedId(null); load(); }} />}
        </div>
      )}

      <CreateDialog open={createOpen} prefill={prefill} onOpenChange={setCreateOpen} onCreated={(id) => { setCreateOpen(false); load(id); }} />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-3xl bg-card p-6 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.10)]">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold tracking-tight mt-1">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{hint}</p>
      </div>
      <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: (p?: { name: string; options: string[] }) => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center"><Filter className="w-6 h-6" /></div>
      <h3 className="text-lg font-semibold mt-4">No student filters yet</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Start from an idea below, or build your own. You can rename and recolour everything later.</p>
      <div className="grid sm:grid-cols-3 gap-3 mt-6 max-w-3xl mx-auto text-left">
        {SUGGESTIONS.map((s) => (
          <button key={s.name} onClick={() => onCreate(s)} className="rounded-3xl bg-[#f4f6f3] p-5 hover:bg-[#eaf6e6] transition-colors">
            <p className="font-semibold text-sm">{s.name}</p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {s.options.map((o, i) => (
                <span key={o} className="inline-flex items-center gap-1.5 text-xs rounded-full bg-white px-2.5 py-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{o}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
      <Button className="mt-6 h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => onCreate()}><Plus className="w-4 h-4 mr-1.5" />Create your own</Button>
    </div>
  );
}

function FilterListItem({ type, active, onSelect }: { type: FilterType; active: boolean; onSelect: () => void }) {
  const live = type.options.filter((o) => !o.isArchived);
  const tagged = type.options.reduce((s, o) => s + o.studentCount, 0);
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-3xl p-5 transition-colors flex items-center gap-3',
        active ? 'bg-[#eaf6e6] ring-2 ring-[#54b947]/40' : 'bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-14px_rgba(16,24,40,0.10)] hover:bg-[#f4f6f3]',
        !type.isActive && 'opacity-70'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{type.name}</p>
          {!type.isActive && <Badge variant="outline" className="text-[10px] shrink-0 rounded-full">Off</Badge>}
        </div>
        <div className="flex items-center gap-1 mt-2">
          {live.slice(0, 8).map((o) => <span key={o.id} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: o.color || FALLBACK }} />)}
          {live.length === 0 && <span className="text-xs text-muted-foreground">No options</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{plural(live.length, 'option')} · {plural(tagged, 'student')}</p>
      </div>
      <ChevronRight className={cn('w-4 h-4 shrink-0 text-muted-foreground transition', active && 'text-[#256c1d] translate-x-0.5')} />
    </button>
  );
}

function FilterDetail({ type, onChanged, onDeleted }: { type: FilterType; onChanged: () => void; onDeleted: () => void }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(type.name);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const live = type.options.filter((o) => !o.isArchived);
  const archived = type.options.filter((o) => o.isArchived);
  const tagged = type.options.reduce((s, o) => s + o.studentCount, 0);
  const max = Math.max(1, ...type.options.map((o) => o.studentCount));

  const run = async (fn: () => Promise<any>, ok?: string): Promise<boolean> => {
    try { await fn(); if (ok) toast.success(ok); await onChanged(); return true; }
    catch (e) { toast.error(errorOf(e, 'Something went wrong')); return false; }
  };

  const addOption = async () => {
    if (!label.trim()) return;
    const done = await run(() => api.post(`/student-filters/${type.id}/options`, { label, ...(color ? { color } : {}) }));
    if (done) { setLabel(''); setColor(null); }
  };

  return (
    <div className="rounded-3xl bg-card overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.10)]">
      {/* Title bar */}
      <div className="p-6 sm:p-7 pb-5 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-start justify-between gap-4">
          {renaming ? (
            <div className="flex items-center gap-1.5 flex-1">
              <Input autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="h-10 text-base font-semibold rounded-full bg-[#f4f6f3] border-transparent px-4"
                onKeyDown={(e) => { if (e.key === 'Enter') run(() => api.put(`/student-filters/${type.id}`, { name }), 'Renamed').then((ok) => ok && setRenaming(false)); }} />
              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => run(() => api.put(`/student-filters/${type.id}`, { name }), 'Renamed').then((ok) => ok && setRenaming(false))}><Check className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => { setRenaming(false); setName(type.name); }}><X className="w-4 h-4" /></Button>
            </div>
          ) : (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-semibold tracking-tight truncate">{type.name}</h3>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => setRenaming(true)} title="Rename filter"><Pencil className="w-4 h-4" /></button>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{plural(live.length, 'option')} · {plural(tagged, 'student')} tagged</p>
            </div>
          )}
          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-2 text-sm">
              <span className={cn('font-medium', type.isActive ? 'text-[#256c1d]' : 'text-muted-foreground')}>{type.isActive ? 'On' : 'Off'}</span>
              <Switch checked={type.isActive} onCheckedChange={(v) => run(() => api.put(`/student-filters/${type.id}`, { isActive: v }))} />
            </label>
            {tagged === 0 && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" title="Delete filter"
                onClick={() => window.confirm(`Delete the filter "${type.name}"?`) && run(() => api.deleteWithoutApproval(`/student-filters/${type.id}`), 'Filter deleted').then((ok) => ok && onDeleted())}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {!type.isActive && <p className="text-xs text-amber-600 mt-3">This filter is off: it is hidden from the directory and from student profiles. Values and history are kept.</p>}

        {/* Distribution bar */}
        {tagged > 0 && (
          <div className="mt-4">
            <div className="flex h-2.5 rounded-full overflow-hidden bg-[#f1f3ef]">
              {type.options.filter((o) => o.studentCount > 0).map((o) => (
                <div key={o.id} title={`${o.label}: ${o.studentCount}`} style={{ width: `${(o.studentCount / tagged) * 100}%`, backgroundColor: o.color || FALLBACK }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="p-6 sm:p-7 space-y-2.5">
        {live.length === 0 && <p className="text-sm text-muted-foreground py-2">No options yet. Add the first one below.</p>}
        {live.map((o) => <OptionRow key={o.id} option={o} max={max} run={run} />)}

        {/* Add */}
        <div className="flex items-center gap-2 pt-3">
          <ColorDot color={color || COLORS[live.length % COLORS.length]} onPick={setColor} />
          <Input placeholder="Add an option and press Enter" value={label} maxLength={80} className="h-11 rounded-full bg-[#f4f6f3] border-transparent px-5"
            onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addOption(); }} />
          <Button onClick={addOption} disabled={!label.trim()} className="h-11 px-6 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold"><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>

        {archived.length > 0 && (
          <div className="pt-4">
            <button className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5" onClick={() => setShowArchived((v) => !v)}>
              <Archive className="w-3.5 h-3.5" />{showArchived ? 'Hide' : 'Show'} {plural(archived.length, 'archived option')}
            </button>
            {showArchived && <div className="mt-2 space-y-2">{archived.map((o) => <OptionRow key={o.id} option={o} max={max} run={run} />)}</div>}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground pt-2">Archived options can't be given to anyone new, but students who already have them keep them. An option can be deleted only when no student uses it.</p>
      </div>
    </div>
  );
}

function ColorDot({ color, onPick }: { color: string; onPick: (c: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" title="Choose colour" className="w-6 h-6 rounded-full border-2 border-white shadow ring-1 ring-black/10 shrink-0 hover:scale-110 transition" style={{ backgroundColor: color }} />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2.5" align="start">
        <div className="grid grid-cols-5 gap-2">
          {COLORS.map((c) => (
            <button key={c} type="button" title={c} onClick={() => onPick(c)}
              className={cn('w-6 h-6 rounded-full border-2 transition hover:scale-110', color === c ? 'border-foreground' : 'border-transparent')} style={{ backgroundColor: c }} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OptionRow({ option, max, run }: { option: FilterOption; max: number; run: (fn: () => Promise<any>, ok?: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(option.label);
  const color = option.color || FALLBACK;
  const save = () => run(() => api.put(`/student-filters/options/${option.id}`, { label }), 'Renamed').then((ok) => ok && setEditing(false));

  return (
    <div className={cn('group relative rounded-2xl bg-[#f4f6f3] dark:bg-muted/30 px-4 py-3 flex items-center gap-3 overflow-hidden', option.isArchived && 'opacity-60')}>
      {/* usage bar behind the row */}
      <div className="absolute inset-y-0 left-0 opacity-[0.08] pointer-events-none" style={{ width: `${(option.studentCount / max) * 100}%`, backgroundColor: color }} />
      <ColorDot color={color} onPick={(c) => run(() => api.put(`/student-filters/options/${option.id}`, { color: c }))} />
      {editing ? (
        <div className="flex items-center gap-1 flex-1 relative">
          <Input autoFocus value={label} maxLength={80} className="h-9 rounded-full bg-white border-transparent px-4" onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={save}><Check className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(false); setLabel(option.label); }}><X className="w-4 h-4" /></Button>
        </div>
      ) : (
        <>
          <span className={cn('flex-1 min-w-0 truncate font-medium text-sm relative', option.isArchived && 'line-through')}>
            {option.label}
            {option.isArchived && <Badge variant="outline" className="ml-2 text-[10px] no-underline">Archived</Badge>}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums relative">{plural(option.studentCount, 'student')}</span>
          <div className="flex items-center gap-0.5 relative sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
            <button className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white" title="Rename" onClick={() => setEditing(true)}><Pencil className="w-3.5 h-3.5" /></button>
            <button className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white" title={option.isArchived ? 'Restore' : 'Archive'}
              onClick={() => run(() => api.put(`/student-filters/options/${option.id}`, { isArchived: !option.isArchived }))}>
              {option.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            </button>
            {option.studentCount === 0 && (
              <button className="p-2 rounded-full text-muted-foreground hover:text-rose-600 hover:bg-white" title="Delete"
                onClick={() => run(() => api.deleteWithoutApproval(`/student-filters/options/${option.id}`))}><Trash2 className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CreateDialog({ open, prefill, onOpenChange, onCreated }: { open: boolean; prefill: { name: string; options: string[] } | null; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setName(prefill?.name || ''); setOptions(prefill?.options || []); setDraft(''); }
  }, [open, prefill]);

  const addDraft = () => {
    const parts = draft.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setOptions((prev) => [...prev, ...parts.filter((p) => !prev.some((x) => x.toLowerCase() === p.toLowerCase()))]);
    setDraft('');
  };

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const pending = draft.trim() ? [...options, ...draft.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)] : options;
      const res = await api.post('/student-filters', { name, options: pending });
      toast.success('Filter created');
      onCreated(res.data?.data?.id);
    } catch (e) {
      toast.error(errorOf(e, 'Failed to create the filter'));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-xl p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col">
        <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0"><Filter className="w-5 h-5" /></div>
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground text-left">New student filter</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-left">Give it a name and its options. Colours are assigned automatically and can be changed later.</DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-5">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Filter name</p>
            <Input autoFocus className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" placeholder="e.g. Follow-up stage" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Options</p>
            <div className="flex flex-wrap gap-2 min-h-[2rem]">
              {options.map((o, i) => (
                <span key={o} className="inline-flex items-center gap-2 text-sm rounded-full bg-[#f4f6f3] pl-3 pr-1.5 py-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{o}
                  <button className="p-1 rounded-full hover:bg-white" onClick={() => setOptions(options.filter((x) => x !== o))}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {options.length === 0 && <span className="text-xs text-muted-foreground">No options yet</span>}
            </div>
            <div className="flex gap-2">
              <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" placeholder="Type an option, press Enter (or paste a comma list)" value={draft} maxLength={200}
                onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDraft(); } }} />
              <Button variant="outline" onClick={addDraft} disabled={!draft.trim()} className="h-11 rounded-full px-5 bg-white border-slate-200 font-semibold">Add</Button>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
          <Button onClick={create} disabled={saving || !name.trim()} className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold">{saving ? 'Creating…' : 'Create filter'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
