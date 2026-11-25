import { useEffect, useState } from 'react';
import { ArrowRight, CalendarCheck, Phone, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListPagination } from '@/components/ui/list-pagination';
import { money } from '@/lib/currency';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

type Bucket = 'overdue' | 'today' | 'upcoming';

const BUCKETS: { id: Bucket; label: string; empty: string }[] = [
  { id: 'overdue', label: 'Overdue', empty: 'No overdue installments. Nothing to chase right now.' },
  { id: 'today', label: 'Due today', empty: 'No installments are due today.' },
  { id: 'upcoming', label: 'Next 7 days', empty: 'No installments are due in the next 7 days.' },
];

const daysOverdue = (due: string) =>
  Math.max(0, Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(due).setHours(0, 0, 0, 0)) / 86400000));

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Landing page for collection staff: today's figures and who to call next. */
export function CollectionsOverview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState('');
  const [bucket, setBucket] = useState<Bucket>('overdue');
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let outdated = false;
    setError('');
    api.get('/collections/metrics')
      .then((res) => { if (!outdated) setMetrics(res.data.data || {}); })
      .catch((e) => { if (!outdated) setError(e.response?.data?.message || 'Failed to load collection figures'); });
    return () => { outdated = true; };
  }, [refreshKey]);

  useEffect(() => {
    let outdated = false;
    setListLoading(true);
    setListError('');
    api.get('/collections/follow-ups', { params: { bucket, page, limit: pageSize } })
      .then((res) => {
        if (outdated) return;
        setRows(res.data.data || []);
        setTotal(res.data.total || 0);
      })
      .catch((e) => {
        if (outdated) return;
        setRows([]);
        setTotal(0);
        setListError(e.response?.data?.message || 'Failed to load installments');
      })
      .finally(() => { if (!outdated) setListLoading(false); });
    return () => { outdated = true; };
  }, [bucket, page, pageSize, refreshKey]);

  const noAccess = metrics?.currentUserOversight?.isOverseer === false && !metrics?.todayCollectingStats;
  const today = metrics?.todayCollectingStats;
  const overdueCount = metrics?.expectedPaymentsStats?.overdueSchedules?.length || 0;
  const counts: Record<Bucket, number | undefined> = {
    overdue: metrics ? overdueCount : undefined,
    today: today?.dueCount,
    upcoming: metrics?.upcomingStats?.dueCount,
  };
  const figure = (value: string | number) => (metrics ? value : '—');

  const stats = [
    { label: 'Collected today', value: figure(money(today?.collectedAmount)), note: `${today?.collectedCount || 0} payments`, tone: 'text-[#256c1d]' },
    { label: 'Collected this month', value: figure(money(today?.monthAmount)), note: `${today?.monthCount || 0} payments`, tone: 'text-slate-900' },
    { label: 'Total overdue', value: figure(money(metrics?.paymentPendingStats?.overdueAmount)), note: 'Unpaid past installments', tone: overdueCount ? 'text-red-600' : 'text-slate-900' },
    { label: 'Pending cases', value: figure(overdueCount.toLocaleString()), note: 'Overdue installments to follow up', tone: overdueCount ? 'text-amber-600' : 'text-slate-900' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Collections Overview</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Track fee recoveries and follow up on pending installments.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setRefreshKey((k) => k + 1)} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className={cn('w-4 h-4 mr-2', listLoading && 'animate-spin')} />Refresh
          </Button>
          <Button variant="outline" onClick={() => onNavigate('students')} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            Student Follow-up
          </Button>
          <Button onClick={() => onNavigate('collections')} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
            Collection Panel<ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {noAccess ? (
        <div className="rounded-3xl bg-white border border-slate-100 flex flex-col items-center text-center py-16 px-6">
          <span className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3"><ShieldAlert className="w-6 h-6" /></span>
          <p className="font-semibold">You don't have access to collection data yet</p>
          <p className="text-sm text-muted-foreground mt-1">Ask your Org Admin to add you as a collections overseer.</p>
        </div>
      ) : (
        <>
          {error && <p className="rounded-2xl bg-red-50 text-red-700 text-sm px-4 py-3">{error}</p>}

          <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
            {/* The 1px gap over a tinted background draws the dividers at every width */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-slate-100">
              {stats.map((s) => (
                <div key={s.label} className="bg-white p-5 sm:p-6">
                  <p className="text-sm font-medium text-slate-500">{s.label}</p>
                  <p className={cn('text-3xl font-semibold tracking-tight mt-2 tabular-nums break-words', s.tone)}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-2">{metrics ? s.note : 'Loading'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Follow-up queue</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Oldest due date first.</p>
              </div>
              <div className="flex flex-wrap gap-1 bg-[#f4f6f3] p-1.5 rounded-3xl w-fit">
                {BUCKETS.map((b) => (
                  <button key={b.id} type="button" onClick={() => { setBucket(b.id); setPage(1); }}
                    className={cn('rounded-full px-4 py-2 text-sm font-semibold transition-colors', bucket === b.id ? 'bg-[#8ae47e] text-[#0b1d14]' : 'text-slate-600 hover:bg-white')}>
                    {b.label}{counts[b.id] !== undefined && <span className="ml-1.5 tabular-nums opacity-70">{counts[b.id]}</span>}
                  </button>
                ))}
              </div>
            </div>

            {listLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
            ) : listError ? (
              <p className="py-10 text-center text-sm text-red-600">{listError}</p>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <span className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mb-3"><CalendarCheck className="w-6 h-6" /></span>
                <p className="text-sm font-medium text-center">{BUCKETS.find((b) => b.id === bucket)?.empty}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((row) => {
                  const student = row.student || {};
                  const parentPhone = student.fatherPhone || student.motherPhone;
                  const late = daysOverdue(row.dueDate);
                  return (
                    <div key={row.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{student.name || 'Unknown student'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {student.enrollmentNo ? `${student.enrollmentNo} · ` : ''}{row.title} · Due {formatDate(row.dueDate)}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {student.phone && (
                            <a href={`tel:${student.phone}`} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[#eaf6e6]">
                              <Phone className="w-3.5 h-3.5" />{student.phone}
                            </a>
                          )}
                          {parentPhone && (
                            <a href={`tel:${parentPhone}`} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[#eaf6e6]">
                              <Phone className="w-3.5 h-3.5" />Parent · {parentPhone}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex md:flex-col items-center md:items-end justify-between gap-1.5">
                        <p className="text-lg font-semibold tabular-nums text-slate-900">{money(row.amount)}</p>
                        <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold', bucket === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                          {bucket === 'overdue' ? `${late} ${late === 1 ? 'day' : 'days'} overdue` : bucket === 'today' ? 'Due today' : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <ListPagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
