import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ClipboardList, FolderOpen, Link as LinkIcon, Search, UserRound, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { SalesInvitePanel } from '@/components/panels/SalesInvitePanel';
import { ProvisionalEnrollmentPanel } from '@/components/panels/ProvisionalEnrollmentPanel';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { SalesStudentPipelinePanel } from '@/components/panels/SalesStudentPipelinePanel';
import { ListPagination } from '@/components/ui/list-pagination';

export interface Person { id: string; name: string; email?: string; designation?: string; branch?: { name: string } | null }
type Method = 'link' | 'provisional' | 'direct' | 'manage';

interface Entry {
  id: string; studentName: string; studentPhone?: string; status: string; isProvisional?: boolean; createdAt: string;
  program?: { name: string } | null; salesUser?: { id: string; name: string } | null;
}

const STATUS_STYLE: Record<string, string> = {
  enrolled: 'bg-[#dff3da] text-[#256c1d]',
  rejected: 'bg-rose-100 text-rose-700', ops_rejected: 'bg-rose-100 text-rose-700', provisional_finance_rejected: 'bg-rose-100 text-rose-700',
};
const statusLabel = (status: string) => status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Everything this person entered, for any sales employee. Opening one goes to that employee's applications. */
export function RecentEntries({ onOpen, group, employeeId, title = 'Entries you made', hint, refreshKey }: {
  onOpen?: (employee: Person) => void; group?: string; employeeId?: string; title?: string; hint?: string; refreshKey?: number;
}) {
  const [rows, setRows] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
    api.get('/sales/entry/entries', { params: { page, limit: pageSize, search: search || undefined, group, salesUserId: employeeId } })
      .then((res) => { if (!outdated) { setRows(res.data.data || []); setTotal(res.data.total || 0); } })
      .catch(() => { if (!outdated) toast.error('Could not load your entries'); })
      .finally(() => { if (!outdated) setLoading(false); });
    return () => { outdated = true; };
  }, [page, pageSize, search, group, employeeId, refreshKey]);

  return (
    <section className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground">{hint || "Every student you entered, for any sales employee. A link only appears here once the student's form is submitted."}</p>
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search student or employee" aria-label="Search entries"
            className="pl-11 h-11 rounded-full bg-[#f4f6f3] border-transparent" />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{search ? 'No entry matches your search.' : 'You have not entered any student yet.'}</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {rows.map((e) => (
              <li key={e.id}>
                <button type="button" disabled={!e.salesUser || !onOpen} onClick={() => e.salesUser && onOpen?.({ id: e.salesUser.id, name: e.salesUser.name })}
                  className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 text-left hover:bg-[#f4f6f3] rounded-2xl px-3 -mx-3 transition-colors">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{e.studentName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{[e.program?.name, e.studentPhone, e.isProvisional ? 'Provisional' : null].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="text-sm text-slate-700 sm:w-48 truncate">For {e.salesUser?.name || 'unknown'}</span>
                  <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold w-fit', STATUS_STYLE[e.status] || 'bg-[#f1f3ef] text-slate-600')}>{statusLabel(e.status)}</span>
                  <span className="text-xs text-muted-foreground sm:w-28 sm:text-right">{new Date(e.createdAt).toLocaleDateString()}</span>
                </button>
              </li>
            ))}
          </ul>
          <ListPagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
        </>
      )}
    </section>
  );
}

const METHODS: { id: Method; title: string; text: string; icon: typeof LinkIcon }[] = [
  { id: 'link', title: 'Generate link', text: 'Make a link for the student to fill in, or open the application form and fill it for them.', icon: LinkIcon },
  { id: 'provisional', title: 'Provisional enrollment', text: 'Quick enrollment with a few details and the payment receipt, sent to Finance to verify.', icon: Zap },
  { id: 'direct', title: 'Direct enrollment', text: 'The full application with documents and payment, sent to Operations for review.', icon: ClipboardList },
  { id: 'manage', title: 'Manage applications', text: 'Follow their applications, re-upload rejected documents and receipts, and complete provisional enrollments.', icon: FolderOpen },
];

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

/**
 * For data-entry staff only. Pick how to enter the student, then the sales employee who gets the
 * credit (always required), then carry on with that method. What happens after is the employee's.
 */
export function SalesEntryEnrollPanel() {
  const [method, setMethod] = useState<Method | null>(null);
  const [chosen, setChosen] = useState<Person | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const picking = method !== null && chosen === null;

  useEffect(() => {
    if (!picking) return;
    let outdated = false;
    setLoading(true);
    api.get('/sales/entry/sales-people', { params: { search: search || undefined } })
      .then((res) => { if (!outdated) setPeople(res.data.data || []); })
      .catch(() => { if (!outdated) toast.error('Could not load the sales employees'); })
      .finally(() => { if (!outdated) setLoading(false); });
    return () => { outdated = true; };
  }, [picking, search]);

  const reset = () => { setMethod(null); setChosen(null); setSearchInput(''); setSearch(''); };
  const current = METHODS.find((m) => m.id === method);

  // 1. How to enter the student
  if (!method || !current) {
    return (
      <div className="space-y-8 max-w-5xl">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Enroll a Student</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Work for a sales employee: enter a new student, or take care of applications already in progress.</p>
        </div>
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Enter a new student</h3>
            <p className="text-xs text-muted-foreground">Pick how the student should be entered. You will choose the sales employee next.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {METHODS.filter((m) => m.id !== 'manage').map(({ id, title, text, icon: Icon }) => (
              <button key={id} type="button" onClick={() => setMethod(id)}
                className="group flex flex-col text-left rounded-3xl bg-white border border-slate-100 p-6 transition-all hover:-translate-y-0.5 hover:border-[#8ae47e] hover:shadow-[0_20px_40px_-24px_rgba(11,29,20,0.35)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf6e6] text-[#256c1d]"><Icon className="w-5 h-5" /></span>
                <span className="mt-4 block text-lg font-semibold tracking-tight">{title}</span>
                <span className="mt-1.5 block flex-1 text-sm text-muted-foreground leading-relaxed">{text}</span>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#256c1d]">Choose<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Applications already in progress</h3>
            <p className="text-xs text-muted-foreground">Follow up on students you or the sales employee already entered.</p>
          </div>
          {METHODS.filter((m) => m.id === 'manage').map(({ id, title, text, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setMethod(id)}
              className="group w-full flex flex-col sm:flex-row sm:items-center gap-4 text-left rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 transition-all hover:border-[#8ae47e] hover:shadow-[0_20px_40px_-24px_rgba(11,29,20,0.35)]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf6e6] text-[#256c1d]"><Icon className="w-5 h-5" /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-semibold tracking-tight">{title}</span>
                <span className="block text-sm text-muted-foreground mt-1 leading-relaxed">{text}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#256c1d]">Choose<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></span>
            </button>
          ))}
        </section>
      </div>
    );
  }

  // 2. Who it is for. Required.
  if (!chosen) {
    return (
      <div className="space-y-6 max-w-3xl">
        <button type="button" onClick={reset} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />Change how to enter
        </button>
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{current.title}</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Which sales employee are you working for? You cannot continue without one. New students count for them.</p>
        </div>
        <section className="rounded-3xl bg-white border-2 border-[#8ae47e] p-5 sm:p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by name or email" aria-label="Search sales employees"
              className="pl-11 h-11 rounded-full bg-[#f4f6f3] border-transparent" autoFocus />
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
          ) : people.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search ? 'No sales employee matches your search.' : 'There is no active sales employee to choose. Ask your Org Admin.'}
            </p>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-2 max-h-[28rem] overflow-y-auto pr-1">
              {people.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setChosen(p)}
                    className="w-full flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-[#eaf6e6] hover:border-[#54b947]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f4f6f3] text-sm font-semibold text-[#256c1d]">{initials(p.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{[p.designation, p.branch?.name].filter(Boolean).join(' · ') || p.email}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  // 3. The chosen method, for that employee
  const employee = { id: chosen.id, name: chosen.name };
  return (
    <div className="space-y-6 max-w-5xl">
      <section className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-3xl bg-[#0b1d14] text-white p-4 shadow-[0_20px_50px_-20px_rgba(4,18,10,0.6)]">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8ae47e] text-sm font-semibold text-[#0b1d14]">{initials(chosen.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/60">{current.title} · working for (gets the credit)</p>
          <p className="truncate font-semibold">{chosen.name}</p>
        </div>
        <Button onClick={() => setChosen(null)} variant="outline" className="h-10 rounded-full bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
          <UserRound className="w-4 h-4 mr-2" />Change employee
        </Button>
        <Button onClick={reset} variant="outline" className="h-10 rounded-full bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
          Change method
        </Button>
      </section>
      {method === 'link' && <SalesInvitePanel key={chosen.id} entryEmployee={employee} />}
      {method === 'provisional' && <ProvisionalEnrollmentPanel key={chosen.id} entryEmployee={employee} />}
      {/* The Direct Enrollment form sales staff use, placed in the page instead of a popup */}
      {method === 'manage' && <SalesStudentPipelinePanel key={chosen.id} forEmployee={employee} />}
      {method === 'direct' && <StudentsPanel key={chosen.id} triggerOpen inline isSalesMode entryEmployee={employee} />}
    </div>
  );
}
