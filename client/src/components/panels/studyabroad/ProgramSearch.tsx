import { useEffect, useMemo, useState } from 'react';
import { Search, GraduationCap, Globe2, Clock, CalendarDays, SlidersHorizontal, X, ChevronDown, ChevronUp, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { apiError, fmtMonths, MONTHS, type CatalogCountry, type CatalogProgram, type Prefill } from './shared';

type Row = CatalogProgram & { country: string; university: string };

const DURATIONS: { key: string; label: string; min: number; max: number }[] = [
  { key: '1', label: 'Up to 1 year', min: 0, max: 12 },
  { key: '2', label: '1 to 2 years', min: 13, max: 24 },
  { key: '3', label: '2 to 4 years', min: 25, max: 48 },
  { key: '4', label: 'More than 4 years', min: 49, max: 1200 },
];

const SORTS: Record<string, string> = {
  name: 'Program name (A–Z)',
  university: 'University (A–Z)',
  short: 'Duration: shortest first',
  long: 'Duration: longest first',
  intake: 'Earliest intake',
};

const NONE = { text: '', country: 'all', type: 'all', university: 'all', duration: 'all', session: 'all', year: 'all', spec: '', withSpecs: false, openNow: false };
type Filters = typeof NONE;

// Declared at module level on purpose: defined inside the page component they would be re-created on every
// keystroke, which remounts the inputs and drops focus after one character.
const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
    {children}
  </div>
);
const Option = ({ on, label, n, onClick }: { on: boolean; label: string; n: number; onClick: () => void }) => (
  <button type="button" onClick={onClick} disabled={n === 0 && !on}
    className={cn('w-full flex items-center justify-between gap-2 text-sm px-2.5 py-1.5 rounded-md text-left transition-colors disabled:opacity-40',
      on ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted')}>
    <span className="truncate">{label}</span><span className="text-xs text-muted-foreground shrink-0">{n}</span>
  </button>
);
const Pick = ({ value, onChange, all, options }: { value: string; onChange: (v: string) => void; all: string; options: string[] }) => (
  <select className="w-full h-9 border rounded-md px-2.5 text-sm bg-background" value={value} onChange={e => onChange(e.target.value)}>
    <option value="all">{all}</option>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

/** Program search for study abroad partners: filter sidebar with live counts, sortable results. */
export function ProgramSearch({ onApply }: { onApply: (p: Prefill) => void }) {
  const [data, setData] = useState<CatalogCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [f, setF] = useState<Filters>(NONE);
  const [sort, setSort] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [shown, setShown] = useState(10);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.get('/study-abroad/me/catalog')
      .then(r => setData(r.data.data || []))
      .catch(e => toast.error(apiError(e, 'Failed to load programs')))
      .finally(() => setLoading(false));
  }, []);

  const rows: Row[] = useMemo(
    () => data.flatMap(c => c.universities.flatMap(u => u.programs.map(p => ({ ...p, country: c.country, university: u.name })))),
    [data],
  );

  const set = (patch: Partial<Filters>) => { setF(prev => ({ ...prev, ...patch })); setShown(10); };
  const apply = (r: Row, x: Filters, skip?: keyof Filters) => {
    const t = x.text.trim().toLowerCase();
    return (skip === 'country' || x.country === 'all' || r.country === x.country)
      && (skip === 'type' || x.type === 'all' || r.courseType === x.type)
      && (skip === 'university' || x.university === 'all' || r.university === x.university)
      && (skip === 'duration' || x.duration === 'all' || (() => { const d = DURATIONS.find(d => d.key === x.duration)!; return r.duration >= d.min && r.duration <= d.max; })())
      && (skip === 'session' || x.session === 'all' || r.intakes.some(i => i.session === x.session))
      && (skip === 'year' || x.year === 'all' || r.intakes.some(i => String(i.year) === x.year))
      && (!x.spec.trim() || r.specialisations.some(s => s.toLowerCase().includes(x.spec.trim().toLowerCase())))
      && (!x.withSpecs || r.specialisations.length > 0)
      && (!x.openNow || r.intakes.some(i => i.open))
      && (!t || r.name.toLowerCase().includes(t) || r.university.toLowerCase().includes(t) || r.specialisations.some(s => s.toLowerCase().includes(t)));
  };

  const results = useMemo(() => {
    const list = rows.filter(r => apply(r, f));
    const firstIntake = (r: Row) => r.intakes.length ? Math.min(...r.intakes.map(i => i.year * 12 + i.month)) : Infinity;
    return list.sort((a, b) =>
      sort === 'university' ? a.university.localeCompare(b.university) || a.name.localeCompare(b.name)
      : sort === 'short' ? a.duration - b.duration
      : sort === 'long' ? b.duration - a.duration
      : sort === 'intake' ? firstIntake(a) - firstIntake(b)
      : a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, f, sort]);

  // Counts shown next to each option: how many programs it would give with the other filters kept.
  const count = (key: keyof Filters, value: string) => rows.filter(r => apply(r, { ...f, [key]: value }, undefined)).length;
  const countries = data.map(c => c.country);
  const types = Array.from(new Set(rows.map(r => r.courseType))).sort();
  const universities = Array.from(new Set(rows.filter(r => f.country === 'all' || r.country === f.country).map(r => r.university))).sort();
  const sessions = Array.from(new Set(rows.flatMap(r => r.intakes.map(i => i.session)))).sort();
  const years = Array.from(new Set(rows.flatMap(r => r.intakes.map(i => i.year)))).sort();
  const durations = DURATIONS.filter(d => rows.some(r => r.duration >= d.min && r.duration <= d.max));
  const anyIntake = rows.some(r => r.intakes.length > 0);
  const anyOpen = rows.some(r => r.intakes.some(i => i.open));
  const anySpec = rows.some(r => r.specialisations.length > 0);

  const chips: { label: string; clear: () => void }[] = [
    f.text.trim() && { label: `“${f.text.trim()}”`, clear: () => { setText(''); set({ text: '' }); } },
    f.country !== 'all' && { label: f.country, clear: () => set({ country: 'all', university: 'all' }) },
    f.type !== 'all' && { label: f.type, clear: () => set({ type: 'all' }) },
    f.university !== 'all' && { label: f.university, clear: () => set({ university: 'all' }) },
    f.duration !== 'all' && { label: DURATIONS.find(d => d.key === f.duration)!.label, clear: () => set({ duration: 'all' }) },
    f.session !== 'all' && { label: f.session, clear: () => set({ session: 'all' }) },
    f.year !== 'all' && { label: f.year, clear: () => set({ year: 'all' }) },
    f.spec.trim() && { label: `Specialisation: ${f.spec.trim()}`, clear: () => set({ spec: '' }) },
    f.withSpecs && { label: 'Has specialisations', clear: () => set({ withSpecs: false }) },
    f.openNow && { label: 'Admissions open', clear: () => set({ openNow: false }) },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const reset = () => { setText(''); setF(NONE); setShown(10); };

  if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}</div>;

  const sidebar = (
    <Card className="lg:sticky lg:top-4">
      <CardContent className="p-4 space-y-5">
        <div className="flex items-center justify-between">
          <p className="font-semibold flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" />Filters</p>
          {chips.length > 0 && <button className="text-xs text-primary hover:underline" onClick={reset}>Clear all</button>}
        </div>

        {countries.length > 0 && (
          <Group title="Country">
            <Option on={f.country === 'all'} label="All countries" n={rows.length} onClick={() => set({ country: 'all', university: 'all' })} />
            {countries.map(c => <Option key={c} on={f.country === c} label={c} n={count('country', c)} onClick={() => set({ country: c, university: 'all' })} />)}
          </Group>
        )}
        {types.length > 0 && (
          <Group title="Course type">
            <Option on={f.type === 'all'} label="All types" n={count('type', 'all')} onClick={() => set({ type: 'all' })} />
            {types.map(t => <Option key={t} on={f.type === t} label={t} n={count('type', t)} onClick={() => set({ type: t })} />)}
          </Group>
        )}
        {durations.length > 0 && (
          <Group title="Duration">
            <Option on={f.duration === 'all'} label="Any duration" n={count('duration', 'all')} onClick={() => set({ duration: 'all' })} />
            {durations.map(d => <Option key={d.key} on={f.duration === d.key} label={d.label} n={count('duration', d.key)} onClick={() => set({ duration: d.key })} />)}
          </Group>
        )}
        {universities.length > 1 && (
          <Group title="University"><Pick value={f.university} onChange={v => set({ university: v })} all="All universities" options={universities} /></Group>
        )}
        {sessions.length > 0 && (
          <Group title="Intake"><Pick value={f.session} onChange={v => set({ session: v })} all="All intakes" options={sessions} /></Group>
        )}
        {years.length > 0 && (
          <Group title="Year"><Pick value={f.year} onChange={v => set({ year: v })} all="All years" options={years.map(String)} /></Group>
        )}
        {anySpec && (
          <Group title="Specialisation">
            <Input className="h-9" placeholder="e.g. Finance" value={f.spec} onChange={e => set({ spec: e.target.value })} />
          </Group>
        )}
        {(anyOpen || anySpec) && (
          <Group title="Quick">
            {anyOpen && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={f.openNow} onChange={e => set({ openNow: e.target.checked })} />Admissions open
              </label>
            )}
            {anySpec && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={f.withSpecs} onChange={e => set({ withSpecs: e.target.checked })} />Has specialisations
              </label>
            )}
          </Group>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5">
      {/* Search */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
              <Input className="pl-10 h-11 rounded-lg text-base" placeholder="Search by program, university or specialisation"
                value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && set({ text })} />
            </div>
            <Button className="h-11 px-6" onClick={() => set({ text })}>Search</Button>
            <Button variant="outline" className="h-11 lg:hidden" onClick={() => setShowFilters(s => !s)}><SlidersHorizontal className="w-4 h-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground pt-1">{rows.length} {rows.length === 1 ? 'program' : 'programs'} across {data.filter(c => c.universities.length > 0).length} {data.filter(c => c.universities.length > 0).length === 1 ? 'country' : 'countries'}</p>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr] items-start">
        <div className={cn(!showFilters && 'hidden lg:block')}>{sidebar}</div>

        <div className="space-y-4 min-w-0">
          {/* Result bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{results.length} {results.length === 1 ? 'program' : 'programs'} found</span>
              {chips.map(c => (
                <button key={c.label} type="button" onClick={c.clear}
                  className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full pl-3 pr-2 py-1 hover:bg-primary/20">
                  {c.label}<X className="w-3 h-3" />
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sort by</span>
              <select className="h-9 border rounded-md px-2.5 text-sm bg-background" value={sort} onChange={e => setSort(e.target.value)}>
                {Object.entries(SORTS).filter(([k]) => k !== 'intake' || anyIntake).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>

          {/* Results */}
          {results.length === 0 ? (
            <Card><CardContent className="py-14 text-center space-y-3">
              <Sparkles className="w-8 h-8 mx-auto text-muted-foreground" />
              {rows.length === 0 ? (
                <>
                  <p className="font-medium">No programs are listed yet</p>
                  <p className="text-sm text-muted-foreground">Programs appear here once the organization adds universities and programs.</p>
                </>
              ) : (
                <>
                  <p className="font-medium">No programs match your filters</p>
                  <Button variant="outline" size="sm" onClick={reset}>Clear all filters</Button>
                </>
              )}
            </CardContent></Card>
          ) : results.slice(0, shown).map(p => {
            const isOpen = !!open[p.id];
            const specs = isOpen ? p.specialisations : p.specialisations.slice(0, 5);
            const intakes = isOpen ? p.intakes : p.intakes.slice(0, 3);
            return (
              <Card key={p.id} role="button" tabIndex={0} title="Open the application for this program"
                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => onApply({ country: p.country, university: p.university, programId: p.id })}
                onKeyDown={e => e.key === 'Enter' && onApply({ country: p.country, university: p.university, programId: p.id })}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary text-lg font-bold flex items-center justify-center shrink-0">{p.university.slice(0, 1).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base leading-snug">{p.name}</h4>
                      <p className="text-sm text-muted-foreground">{p.university}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Globe2 className="w-3.5 h-3.5" />{p.country}</span>
                        <span className="inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{p.courseType}</span>
                        {p.duration > 0 && <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtMonths(p.duration)}</span>}
                        {p.intakes.some(i => i.open) && <span className="inline-flex items-center gap-1 text-emerald-600 font-medium"><CalendarDays className="w-3.5 h-3.5" />Admissions open</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                  </div>

                  {p.specialisations.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Specialisations — click one to apply for it</p>
                      <div className="flex flex-wrap gap-1.5">
                        {specs.map(sp => (
                          <button key={sp} type="button"
                            className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                            onClick={e => { e.stopPropagation(); onApply({ country: p.country, university: p.university, programId: p.id, specialisation: sp }); }}>{sp}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {p.intakes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground mr-1">Intakes</span>
                      {intakes.map((i, k) => <Badge key={k} variant="outline" className="text-[11px] font-normal">{i.session} · {MONTHS[i.month - 1]} {i.year}</Badge>)}
                    </div>
                  )}

                  {(p.specialisations.length > 5 || p.intakes.length > 3) && (
                    <button type="button" className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      onClick={e => { e.stopPropagation(); setOpen(o => ({ ...o, [p.id]: !isOpen })); }}>
                      {isOpen ? <>Show less<ChevronUp className="w-3 h-3" /></> : <>Show all details<ChevronDown className="w-3 h-3" /></>}
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {results.length > shown && (
            <div className="text-center"><Button variant="outline" onClick={() => setShown(n => n + 10)}>Show more ({results.length - shown} left)</Button></div>
          )}
        </div>
      </div>
    </div>
  );
}
