import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Copy, Link as LinkIcon, Plus, Sun, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { ListPagination } from '@/components/ui/list-pagination';
import { RecentEntries } from '@/components/panels/SalesEntryEnrollPanel';

interface LinkRow {
  id: string; token: string; status: string; expiresAt: string; usedAt?: string | null; createdAt: string;
  programCount: number; referrer?: { id: string; name: string } | null;
}
type LinkState = '' | 'pending' | 'used' | 'expired';

const linkState = (l: LinkRow): Exclude<LinkState, ''> =>
  l.status === 'used' ? 'used' : new Date(l.expiresAt) <= new Date() ? 'expired' : 'pending';
const LINK_STYLE = { pending: 'bg-[#fff6dd] text-[#7a5b00]', used: 'bg-[#dff3da] text-[#256c1d]', expired: 'bg-[#f1f3ef] text-slate-500' };
const LINK_TEXT = { pending: 'Waiting for student', used: 'Form submitted', expired: 'Expired' };

/** Links this person generated, for any sales employee, and whether the student has filled them. */
function GeneratedLinks({ refreshKey }: { refreshKey?: number }) {
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [state, setState] = useState<LinkState>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => { if (searchInput.trim() !== search) { setSearch(searchInput.trim()); setPage(1); } }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    let outdated = false;
    setLoading(true);
    api.get('/sales/entry/links', { params: { page, limit: pageSize, state: state || undefined, search: search || undefined } })
      .then((res) => { if (!outdated) { setRows(res.data.data || []); setTotal(res.data.total || 0); } })
      .catch(() => { if (!outdated) toast.error('Could not load your links'); })
      .finally(() => { if (!outdated) setLoading(false); });
    return () => { outdated = true; };
  }, [page, pageSize, state, search, refreshKey]);

  const copy = async (token: string) => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/student-apply?token=${token}`); toast.success('Link copied'); }
    catch { toast.error('Could not copy the link'); }
  };

  return (
    <section className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold tracking-tight">Generated links</h3>
          <p className="text-xs text-muted-foreground">Links you made for sales employees. Once the student submits, the entry moves to the lists above.</p>
        </div>
        <div className="relative sm:w-72">
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by employee" aria-label="Search links"
            className="h-11 rounded-full bg-[#f4f6f3] border-transparent px-5" />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {([['', 'All'], ['pending', 'Waiting'], ['used', 'Submitted'], ['expired', 'Expired']] as [LinkState, string][]).map(([v, label]) => (
          <button key={v} type="button" onClick={() => { setState(v); setPage(1); }}
            className={cn('rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap', state === v ? 'bg-slate-900 text-white' : 'bg-[#f4f6f3] text-slate-600')}>{label}</button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{search || state ? 'No link matches.' : 'You have not generated any link yet.'}</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {rows.map((l) => {
              const st = linkState(l);
              return (
                <li key={l.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">For {l.referrer?.name || 'unknown'}</span>
                    <span className="block text-xs text-muted-foreground">{l.programCount} program{l.programCount === 1 ? '' : 's'} · made {new Date(l.createdAt).toLocaleDateString()}</span>
                  </span>
                  <span className="text-xs text-muted-foreground sm:w-44">
                    {st === 'used' && l.usedAt ? `Submitted ${new Date(l.usedAt).toLocaleDateString()}` : `${st === 'expired' ? 'Expired' : 'Expires'} ${new Date(l.expiresAt).toLocaleDateString()}`}
                  </span>
                  <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold w-fit', LINK_STYLE[st])}>{LINK_TEXT[st]}</span>
                  {st === 'pending' && <Button type="button" size="sm" variant="outline" className="rounded-full w-fit" onClick={() => copy(l.token)}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>}
                </li>
              );
            })}
          </ul>
          <ListPagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
        </>
      )}
    </section>
  );
}

interface Overview {
  total: number; enrolled: number; pending: number; rejected: number; today: number; pendingLinks: number;
  employees: { id: string; name: string; total: number; pending: number; rejected: number; enrolled: number }[];
}

type Tab = 'pending' | 'rejected' | 'enrolled' | 'all';

/** Home page for data-entry staff: totals, what is still pending, and a breakdown by sales employee. */
export function SalesEntryOverviewPanel({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');
  const [employeeId, setEmployeeId] = useState<string | undefined>();

  useEffect(() => {
    let outdated = false;
    api.get('/sales/entry/overview')
      .then((res) => { if (!outdated) setData(res.data.data); })
      .catch(() => { if (!outdated) toast.error('Could not load the overview'); })
      .finally(() => { if (!outdated) setLoading(false); });
    return () => { outdated = true; };
  }, []);

  const cards = data ? [
    { key: 'all' as const, label: 'Total entered', hint: 'All students you entered', value: data.total, icon: Users, chip: 'bg-slate-100 text-slate-700' },
    { key: 'pending' as const, label: 'Pending', hint: 'In review or verification', value: data.pending, icon: Clock, chip: 'bg-[#fff1c9] text-[#7a5b00]' },
    { key: 'rejected' as const, label: 'Needs action', hint: 'Rejected, re-upload needed', value: data.rejected, icon: AlertTriangle, chip: 'bg-rose-100 text-rose-700' },
    { key: 'enrolled' as const, label: 'Enrolled', hint: 'Fully enrolled', value: data.enrolled, icon: CheckCircle2, chip: 'bg-[#dff3da] text-[#256c1d]' },
  ] : [];

  const tabTitle: Record<Tab, string> = {
    pending: 'Pending students', rejected: 'Students that need action', enrolled: 'Enrolled students', all: 'All students you entered',
  };
  const tabHint: Record<Tab, string> = {
    pending: 'Entered by you and still moving through review, payment or verification.',
    rejected: 'Rejected during review. Open Enroll a Student, then Manage applications to re-upload documents.',
    enrolled: 'Fully enrolled.',
    all: 'Every student you entered, for any sales employee.',
  };
  const tabLabel: Record<Tab, string> = { pending: 'Pending', rejected: 'Needs action', enrolled: 'Enrolled', all: 'All' };
  const pct = (n: number) => (data && data.total ? Math.round((n / data.total) * 100) : 0);
  const selectedEmployee = data?.employees.find((e) => e.id === employeeId);

  return (
    <div className="space-y-8 pb-10 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Everything you entered for sales employees, and what is still pending.</p>
        </div>
        <Button className="h-11 px-5 rounded-full text-sm font-semibold bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm" onClick={() => onNavigate?.('enroll')}><Plus className="h-4 w-4 mr-1" /> Enroll a student</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse" />)}</div>
      ) : data && (
        <>
          <section className="space-y-3" aria-label="Totals">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {cards.map((c) => (
                <button key={c.key} type="button" onClick={() => { setTab(c.key); setEmployeeId(undefined); }}
                  className={cn('rounded-3xl bg-white border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-28px_rgba(11,29,20,0.35)]', tab === c.key ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-100')}>
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', c.chip)}><c.icon className="h-4 w-4" /></span>
                  <span className="mt-4 block text-3xl font-semibold tabular-nums tracking-tight">{c.value}</span>
                  <span className="mt-0.5 block text-sm font-medium">{c.label}</span>
                  <span className="block text-xs text-muted-foreground">{c.hint}</span>
                </button>
              ))}
            </div>
            {data.total > 0 && (
              <div className="rounded-3xl bg-white border border-slate-100 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-slate-700">Progress of everything you entered</span>
                  <span>{pct(data.enrolled)}% enrolled</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${data.enrolled} enrolled, ${data.pending} pending, ${data.rejected} need action`}>
                  <div className="bg-[#4caf3f]" style={{ width: `${pct(data.enrolled)}%` }} />
                  <div className="bg-[#f2c744]" style={{ width: `${pct(data.pending)}%` }} />
                  <div className="bg-rose-500" style={{ width: `${pct(data.rejected)}%` }} />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#4caf3f]" />Enrolled</span>
                  <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#f2c744]" />Pending</span>
                  <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-rose-500" />Needs action</span>
                  <span className="ml-auto inline-flex items-center gap-1.5"><Sun className="h-3.5 w-3.5" />{data.today} entered today</span>
                  <span className="inline-flex items-center gap-1.5"><LinkIcon className="h-3.5 w-3.5" />{data.pendingLinks} links waiting for the student</span>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold tracking-tight">By sales employee</h3>
                <p className="text-xs text-muted-foreground">Choose an employee to filter the student list below.</p>
              </div>
              {employeeId && <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setEmployeeId(undefined)}>Clear filter</Button>}
            </div>
            {data.employees.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No entries yet. Use Enroll a student to get started.</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.employees.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => setEmployeeId(employeeId === e.id ? undefined : e.id)}
                      className={cn('w-full rounded-2xl border p-4 text-left space-y-3 transition-colors hover:bg-[#f4f6f3]', employeeId === e.id ? 'border-slate-900 bg-[#f4f6f3]' : 'border-slate-100')}>
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf6e6] text-xs font-semibold text-[#256c1d]">{e.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{e.name}</span>
                          <span className="block text-xs text-muted-foreground">{e.total} student{e.total === 1 ? '' : 's'}</span>
                        </span>
                      </span>
                      <span className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                        <span className="bg-[#4caf3f]" style={{ width: `${e.total ? (e.enrolled / e.total) * 100 : 0}%` }} />
                        <span className="bg-[#f2c744]" style={{ width: `${e.total ? (e.pending / e.total) * 100 : 0}%` }} />
                        <span className="bg-rose-500" style={{ width: `${e.total ? (e.rejected / e.total) * 100 : 0}%` }} />
                      </span>
                      <span className="flex justify-between text-xs">
                        <span className="text-[#256c1d]">{e.enrolled} enrolled</span>
                        <span className="text-[#7a5b00]">{e.pending} pending</span>
                        <span className={e.rejected ? 'text-rose-700 font-medium' : 'text-muted-foreground'}>{e.rejected} action</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full bg-white border border-slate-100 p-1 overflow-x-auto" role="tablist">
                {(['pending', 'rejected', 'enrolled', 'all'] as Tab[]).map((t) => (
                  <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                    className={cn('rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors', tab === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900')}>
                    {tabLabel[t]}
                  </button>
                ))}
              </div>
              {selectedEmployee && <span className="rounded-full bg-[#eaf6e6] px-3 py-1.5 text-xs font-medium text-[#256c1d]">Showing {selectedEmployee.name}</span>}
            </div>
            <RecentEntries group={tab === 'all' ? undefined : tab} employeeId={employeeId} title={tabTitle[tab]} hint={tabHint[tab]} />
          </section>

          <GeneratedLinks />
        </>
      )}
    </div>
  );
}
