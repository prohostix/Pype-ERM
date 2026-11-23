import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Users, IndianRupee, Target, Wallet, GraduationCap, Receipt, Search, AlertTriangle, RefreshCw, UserX, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { StudentProfilePanel } from './StudentProfilePanel';
import { reportParams, type ReportFilter } from './SalesReportFilters';
import { KpiTile, SectionCard, Avatar, ProgressBar, EmptyState, LoadingRows, monthLabel, inr } from './SalesReportKit';

const fmtDate = (d?: string | null) => (d && !isNaN(+new Date(d)) ? format(new Date(d), 'dd MMM yyyy') : '—');
const pretty = (v?: string | null) => (v ? v.replace(/_/g, ' ') : '—');

/** One team member's page: everything they enrolled and collected, for the month chosen on the report. */
export function SalesTeamMemberPage({ member, filter, onBack }: {
  member: { id: string; name: string; designation?: string };
  filter: ReportFilter;
  onBack: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'students' | 'payments'>('students');
  const [onlyPaid, setOnlyPaid] = useState(false);
  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const reqRef = useRef(0);
  const month = monthLabel(filter.month);

  const load = async () => {
    const req = ++reqRef.current; // ignore a slower, older answer
    setLoading(true);
    setError('');
    try {
      // The counselor filter picks who is on the report; this page is already one person
      const { counselorId: _ignored, ...params } = reportParams(filter);
      const res = await api.get(`/sales/reports/team/${member.id}/students`, { params });
      if (req !== reqRef.current) return;
      setData(res.data.data);
    } catch (err: any) {
      if (req !== reqRef.current) return;
      setData(null);
      setError(err.response?.data?.message || 'Failed to load this member');
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => { reqRef.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.id, filter.month]);

  const openStudent = async (id: string) => {
    if (openingId) return;
    setOpeningId(id);
    try {
      const res = await api.get(`/students/${id}`);
      setProfile(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.status === 404
        ? 'Student details are not available to you (the student may have been removed or belongs to another branch)'
        : err.response?.data?.message || 'Failed to open student');
    } finally {
      setOpeningId(null);
    }
  };

  const students: any[] = data?.students || [];
  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  // Every payment, newest first, with the student it belongs to
  const payments = useMemo(
    () => students
      .flatMap((s) => (s.payments || []).map((p: any) => ({ ...p, studentId: s.id, studentName: s.name })))
      .sort((a, b) => +new Date(b.receivedAt) - +new Date(a.receivedAt)),
    [students],
  );

  const byMethod = useMemo(() => {
    const m = new Map<string, number>();
    payments.forEach((p) => m.set(p.method || 'other', (m.get(p.method || 'other') || 0) + p.amount));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [payments]);

  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    students.filter((s) => s.joinedInPeriod).forEach((s) => m.set(s.status || 'unknown', (m.get(s.status || 'unknown') || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [students]);

  const q = search.trim().toLowerCase();
  const matches = (s: any) => !q || [s.name, s.enrollmentNo, s.phone, s.email].some((v) => (v || '').toLowerCase().includes(q));
  const visibleStudents = students.filter((s) => (!onlyPaid || s.revenue > 0) && matches(s));
  const visiblePayments = payments.filter((p) => matches(byId.get(p.studentId) || {}) || (p.invoiceNo || '').toLowerCase().includes(q));

  const totalRevenue = data?.totals.revenue || 0;
  const enrollments = data?.totals.enrollments || 0;
  const payingStudents = students.filter((s) => s.revenue > 0).length;
  const target = data?.member.targetTotal || 0;
  const progress = data?.member.targetProgress || 0;

  if (profile) {
    return <StudentProfilePanel student={profile} onBack={() => setProfile(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1.5" />Team Performance</Button>
          <Avatar name={member.name} />
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">{member.name}</h2>
            <p className="text-xs text-muted-foreground truncate">{member.designation || 'Team Member'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">{month ?? 'All months'}</span>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border bg-card p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-sm">{error}</p>
          <div className="flex justify-center gap-2">
            <Button size="sm" onClick={load}>Retry</Button>
            <Button size="sm" variant="outline" onClick={onBack}>Back</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiTile icon={Users} label="Enrolled students" value={enrollments} hint={month ?? 'all time'} tone="success" loading={loading && !data} />
            <KpiTile icon={IndianRupee} label="Total collected" value={inr(totalRevenue)} hint={`${payments.length} payment${payments.length === 1 ? '' : 's'}`} tone="info" loading={loading && !data} />
            <KpiTile icon={Target} label="Target progress" value={target > 0 ? `${progress}%` : '—'} hint={target > 0 ? `${enrollments} of ${target} target` : 'No target set'} tone="warning" loading={loading && !data} />
            <KpiTile icon={Wallet} label="Avg per paying student" value={payingStudents > 0 ? inr(Math.round(totalRevenue / payingStudents)) : '—'} hint={`${payingStudents} of ${students.length} students paid`} tone="primary" loading={loading && !data} />
          </div>

          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionCard icon={CreditCard} title="Collected by payment method">
                {byMethod.length === 0 ? (
                  <EmptyState icon={Receipt} text="No payments in this period." />
                ) : (
                  <div className="p-5 space-y-3">
                    {byMethod.map(([method, amount]) => (
                      <div key={method}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize font-medium">{pretty(method)}</span>
                          <span className="tabular-nums font-semibold">{inr(amount)}</span>
                        </div>
                        <ProgressBar value={totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0} tone="info" className="h-1.5" />
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
              <SectionCard icon={GraduationCap} title="Enrolled students by status">
                {byStatus.length === 0 ? (
                  <EmptyState icon={UserX} text="No enrollments in this period." />
                ) : (
                  <div className="p-5 flex flex-wrap gap-2">
                    {byStatus.map(([status, n]) => (
                      <span key={status} className="text-xs px-3 py-1.5 rounded-full border bg-muted/30 capitalize">
                        {pretty(status)} <b className="ml-1 tabular-nums">{n}</b>
                      </span>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          )}

          <SectionCard
            icon={tab === 'students' ? GraduationCap : Receipt}
            title={tab === 'students' ? 'Students' : 'Payments received'}
            right={
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border overflow-hidden text-xs font-semibold">
                  {(['students', 'payments'] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={cn('px-3 py-1.5 capitalize', tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                      {t} ({t === 'students' ? students.length : payments.length})
                    </button>
                  ))}
                </div>
                {tab === 'students' && (
                  <button onClick={() => setOnlyPaid(!onlyPaid)} className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg border', onlyPaid ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
                    Paid only
                  </button>
                )}
                <div className="relative w-56">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, no, phone" className="pl-8 h-8 text-xs" />
                </div>
              </div>
            }
          >
            {loading && !data ? (
              <LoadingRows />
            ) : tab === 'students' ? (
              visibleStudents.length === 0 ? (
                <EmptyState icon={GraduationCap} text={students.length === 0 ? 'No students or payments for this member in this period.' : 'No students match this filter.'} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-5 py-3 text-left font-semibold">Student</th>
                        <th className="px-4 py-3 text-left font-semibold">Program</th>
                        <th className="px-4 py-3 text-left font-semibold">Joined</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold">Credit</th>
                        <th className="px-5 py-3 text-right font-semibold">Collected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {visibleStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-muted/30">
                          <td className="px-5 py-3">
                            <button className="font-semibold text-primary hover:underline text-left disabled:opacity-50" disabled={!!openingId} onClick={() => openStudent(s.id)}>
                              {s.name || 'Unnamed student'}{openingId === s.id && ' …'}
                            </button>
                            <p className="text-xs text-muted-foreground">{[s.enrollmentNo, s.phone].filter(Boolean).join(' · ') || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            {s.program || '—'}
                            {s.specialisation && <p className="text-xs text-muted-foreground">{s.specialisation}</p>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {fmtDate(s.joinDate)}
                            {!s.joinedInPeriod && <p className="text-xs text-muted-foreground">joined earlier</p>}
                          </td>
                          <td className="px-4 py-3 capitalize">{pretty(s.status)}</td>
                          <td className="px-4 py-3 capitalize">{s.credit === 'both' ? 'Referred & enrolled' : s.credit}</td>
                          <td className="px-5 py-3 text-right">
                            {s.paymentCount > 0 ? (
                              <>
                                <p className="font-semibold tabular-nums">{inr(s.revenue)}</p>
                                <p className="text-xs text-muted-foreground">{s.paymentCount} payment{s.paymentCount > 1 ? 's' : ''} · last {fmtDate(s.lastPaymentAt)}</p>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">No payment</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 font-semibold">
                        <td className="px-5 py-3" colSpan={5}>Total ({visibleStudents.length} student{visibleStudents.length === 1 ? '' : 's'})</td>
                        <td className="px-5 py-3 text-right tabular-nums">{inr(visibleStudents.reduce((a, s) => a + s.revenue, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            ) : visiblePayments.length === 0 ? (
              <EmptyState icon={Receipt} text={payments.length === 0 ? 'No payments received in this period.' : 'No payments match this search.'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Student</th>
                      <th className="px-4 py-3 text-left font-semibold">Invoice</th>
                      <th className="px-4 py-3 text-left font-semibold">Method</th>
                      <th className="px-4 py-3 text-left font-semibold">Reference</th>
                      <th className="px-5 py-3 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {visiblePayments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-5 py-3 whitespace-nowrap">{fmtDate(p.receivedAt)}</td>
                        <td className="px-4 py-3">
                          <button className="font-semibold text-primary hover:underline text-left disabled:opacity-50" disabled={!!openingId} onClick={() => openStudent(p.studentId)}>
                            {p.studentName || 'Unnamed student'}
                          </button>
                        </td>
                        <td className="px-4 py-3">{p.invoiceNo || '—'}</td>
                        <td className="px-4 py-3 capitalize">{pretty(p.method)}</td>
                        <td className="px-4 py-3">{p.referenceNo || '—'}</td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums">{inr(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 font-semibold">
                      <td className="px-5 py-3" colSpan={5}>Total ({visiblePayments.length} payment{visiblePayments.length === 1 ? '' : 's'})</td>
                      <td className="px-5 py-3 text-right tabular-nums">{inr(visiblePayments.reduce((a, p) => a + p.amount, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            {data?.truncated && (
              <p className="px-5 py-3 text-xs text-muted-foreground border-t">Enrollment list shows the 1,000 most recent students; totals above cover everyone.</p>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
