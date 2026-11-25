import { useState, useEffect } from 'react';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListPagination } from '@/components/ui/list-pagination';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const PILL_OK = 'bg-[#dff3da] text-[#256c1d]';
const PILL_WARN = 'bg-amber-100 text-amber-700';
const PILL_BAD = 'bg-red-100 text-red-700';
const PILL_INFO = 'bg-sky-100 text-sky-700';
const PILL_NEUTRAL = 'bg-slate-100 text-slate-600';

const statusColor: Record<string, string> = {
  pending_verification: PILL_WARN,
  ops_verified: PILL_INFO,
  pending_payment: PILL_WARN,
  active: PILL_OK,
  rejected: PILL_BAD,
  inactive: PILL_NEUTRAL,
};

const enrollStatusColor: Record<string, string> = {
  payment_pending: PILL_WARN,
  document_review: PILL_INFO,
  finance_review: PILL_WARN,
  enrolled: PILL_OK,
  rejected: PILL_BAD,
  department_rejected: PILL_BAD,
};

const CARD = 'rounded-3xl bg-white border border-slate-100 overflow-hidden';
const ROW = 'rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors';
const initial = (n?: string) => (n || '?')[0].toUpperCase();
const label = (s?: string) => (s || '').replace(/_/g, ' ');

function StatusPill({ status, map }: { status?: string; map: Record<string, string> }) {
  return <span className={cn('rounded-full px-3 py-1 text-xs font-semibold capitalize', map[status || ''] || PILL_NEUTRAL)}>{label(status)}</span>;
}

function PillTabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; text: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex p-1 rounded-full bg-[#f4f6f3] flex-wrap">
      {tabs.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)}
          className={cn('rounded-full px-5 h-9 text-sm font-semibold transition', value === t.id ? 'bg-[#8ae47e] text-[#0b1d14]' : 'text-slate-600 hover:text-slate-900')}>{t.text}</button>
      ))}
    </div>
  );
}

function Paged<T>({ items, children }: { items: T[]; children: (rows: T[]) => React.ReactNode }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  useEffect(() => { setPage(1); }, [items.length, size]);
  return (
    <>
      {children(items.slice((page - 1) * size, page * size))}
      <ListPagination total={items.length} page={page} pageSize={size} onPageChange={setPage} onPageSizeChange={setSize} />
    </>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className={CARD}>
      <div className="px-6 py-5 border-b border-slate-100">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function StatStrip({ items, cols = 'xl:grid-cols-4' }: { items: { label: string; value: React.ReactNode; sub?: string; tone?: string }[]; cols?: string }) {
  return (
    <div className={CARD}>
      <div className={cn('grid grid-cols-2 divide-x divide-y xl:divide-y-0 divide-slate-100', cols)}>
        {items.map((s) => (
          <div key={s.label} className="p-5 sm:p-6">
            <p className="text-sm font-medium text-slate-500">{s.label}</p>
            <p className={cn('text-3xl sm:text-4xl font-semibold tracking-tight mt-2 tabular-nums', s.tone || 'text-slate-900')}>{s.value}</p>
            {s.sub && <p className="text-xs text-muted-foreground mt-2">{s.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CenterDetailView({ centerId, onBack }: { centerId: string; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'programs' | 'students'>('overview');

  useEffect(() => {
    api.get(`/sales/my-centers/${centerId}`)
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [centerId]);

  const BackBtn = <Button variant="outline" onClick={onBack} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">Back to partners</Button>;

  if (loading) {
    return (
      <div className="space-y-4">
        {BackBtn}
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-3xl bg-slate-100 animate-pulse" />)}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        {BackBtn}
        <div className={cn(CARD, 'py-14 text-center')}><p className="font-semibold text-slate-900">Failed to load center details</p></div>
      </div>
    );
  }

  const { center, enrollments, byProgram, stats } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{center.name}</h2>
            <StatusPill status={center.status} map={statusColor} />
          </div>
          <p className="text-muted-foreground text-sm mt-1.5">{center.code}{center.email ? ` · ${center.email}` : ''}{center.city ? ` · ${center.city}` : ''}</p>
        </div>
        {BackBtn}
      </div>

      <StatStrip items={[
        { label: 'Total students', value: stats.totalStudents },
        { label: 'Enrolled', value: stats.enrolled, tone: 'text-[#256c1d]' },
        { label: 'Pending', value: stats.pending, tone: stats.pending > 0 ? 'text-amber-600' : undefined },
        { label: 'Rejected', value: stats.rejected, tone: stats.rejected > 0 ? 'text-red-600' : undefined },
      ]} />

      <PillTabs value={tab} onChange={setTab} tabs={[
        { id: 'overview', text: 'Overview' },
        { id: 'programs', text: `Programs (${byProgram.length})` },
        { id: 'students', text: `All students (${enrollments.length})` },
      ]} />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <Panel title="Associated universities">
            {!center.associatedUniversityIds?.length ? (
              <p className="text-sm text-muted-foreground">No universities assigned yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {center.associatedUniversityIds.map((u: any) => (
                  <span key={u.id} className="rounded-full bg-[#f4f6f3] px-3.5 py-1.5 text-sm font-medium text-slate-800">{u.name}{u.code ? ` (${u.code})` : ''}</span>
                ))}
              </div>
            )}
          </Panel>
          <Panel title="Allowed programs">
            {!center.allowedProgramIds?.length ? (
              <p className="text-sm text-muted-foreground">No programs assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {center.allowedProgramIds.map((p: any) => {
                  const group = byProgram.find((b: any) => b.program?.id?.toString() === p.id?.toString());
                  return (
                    <div key={p.id} className={cn(ROW, 'flex items-center justify-between gap-3 px-4 py-3')}>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.code}{p.duration ? ` · ${p.duration}` : ''}{p.level ? ` · ${p.level}` : ''}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shrink-0">{group?.students?.length || 0} students</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === 'programs' && (
        byProgram.length === 0 ? (
          <div className={cn(CARD, 'py-14 text-center')}><p className="font-semibold text-slate-900">No enrollments yet</p></div>
        ) : (
          <div className="space-y-4">
            {byProgram.map((group: any) => (
              <Panel key={group.program?.id || 'unknown'} title={group.program?.name || 'Unknown program'}
                subtitle={`${group.program?.code || ''}${group.program?.level ? ` · ${group.program.level}` : ''}${group.program?.code || group.program?.level ? ' · ' : ''}${group.students.length} students`}>
                <div className="space-y-2">
                  {group.students.map((s: any) => (
                    <div key={s.id} className={cn(ROW, 'flex items-center justify-between gap-3 px-4 py-3')}>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{s.studentName}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.studentEmail} · {s.enrollmentNumber}</p>
                      </div>
                      <StatusPill status={s.status} map={enrollStatusColor} />
                    </div>
                  ))}
                </div>
              </Panel>
            ))}
          </div>
        )
      )}

      {tab === 'students' && (
        <Panel title="All students" subtitle={`${enrollments.length} enrolled through this partner`}>
          {enrollments.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No students enrolled yet</p>
          ) : (
            <Paged items={enrollments}>
              {(rows: any[]) => (
                <div className="space-y-2">
                  {rows.map((e) => (
                    <div key={e.id} className={cn(ROW, 'flex items-center gap-3 px-4 py-3.5')}>
                      <span className="w-10 h-10 rounded-full bg-white text-sm font-semibold text-slate-700 flex items-center justify-center shrink-0">{initial(e.studentName)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{e.studentName}</p>
                        <p className="text-xs text-muted-foreground truncate">{e.studentEmail} · {e.programId?.name || 'Program'} · {e.enrollmentNumber}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <StatusPill status={e.status} map={enrollStatusColor} />
                        <p className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Paged>
          )}
        </Panel>
      )}
    </div>
  );
}

export function SalesCentersPanel() {
  const [centers, setCenters] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'centers' | 'admissions'>('centers');
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [centersRes, admissionsRes] = await Promise.all([
        api.get('/sales/my-centers'),
        api.get('/sales/my-centers/admissions'),
      ]);
      setCenters(centersRes.data.data || []);
      setAdmissions(admissionsRes.data.data || []);
    } catch {
      setCenters([]);
      setAdmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (selectedCenterId) {
    return <CenterDetailView centerId={selectedCenterId} onBack={() => setSelectedCenterId(null)} />;
  }

  const activeCount = centers.filter(c => c.status === 'active').length;
  const pendingCount = centers.filter(c => c.status === 'pending_verification').length;
  const enrolledCount = admissions.filter(a => a.status === 'enrolled').length;
  const reviewCount = admissions.filter(a => ['payment_pending', 'document_review', 'finance_review'].includes(a.status)).length;
  const v = (n: number) => (loading ? '…' : n);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Academic Partners</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Centers onboarded via your invite links and your team's links</p>
        </div>
        <Button variant="outline" onClick={fetchAll} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      <StatStrip cols="xl:grid-cols-3" items={[
        { label: 'Total centers', value: v(centers.length), sub: `${activeCount} active · ${pendingCount} pending` },
        { label: 'Total admissions', value: v(admissions.length), sub: `${enrolledCount} enrolled` },
        { label: 'Pending review', value: v(reviewCount), sub: 'Awaiting processing', tone: reviewCount > 0 ? 'text-amber-600' : undefined },
      ]} />

      <PillTabs value={tab} onChange={setTab} tabs={[
        { id: 'centers', text: `Academic Partners (${centers.length})` },
        { id: 'admissions', text: `Admissions (${admissions.length})` },
      ]} />

      {tab === 'centers' && (
        <Panel title="Onboarded centers" subtitle="Academic partners registered through your invite links or your team's links">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
          ) : centers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-semibold text-slate-900">No centers yet</p>
              <p className="text-sm text-muted-foreground mt-1">Share invite links to onboard academic partners.</p>
            </div>
          ) : (
            <Paged items={centers}>
              {(rows: any[]) => (
                <div className="space-y-2">
                  {rows.map(c => (
                    <button key={c.id} type="button" onClick={() => setSelectedCenterId(c.id)} className={cn(ROW, 'w-full flex items-center gap-4 px-4 py-3.5 text-left group')}>
                      <span className="w-11 h-11 rounded-full bg-white text-sm font-semibold text-slate-700 flex items-center justify-center shrink-0">{initial(c.name)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{c.name} <span className="font-normal text-muted-foreground">({c.code})</span></p>
                        <p className="text-xs text-muted-foreground truncate">{c.email}{c.city ? ` · ${c.city}` : ''}</p>
                        {c.associatedUniversityIds?.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.associatedUniversityIds.map((u: any) => u.name || u).join(', ')}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right space-y-1">
                        <StatusPill status={c.status} map={statusColor} />
                        <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </Paged>
          )}
        </Panel>
      )}

      {tab === 'admissions' && (
        <Panel title="Admissions" subtitle="Student enrollments from your onboarded centers">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
          ) : admissions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-semibold text-slate-900">No admissions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Admissions from your centers will appear here.</p>
            </div>
          ) : (
            <Paged items={admissions}>
              {(rows: any[]) => (
                <div className="space-y-2">
                  {rows.map(a => (
                    <div key={a.id} className={cn(ROW, 'flex items-center gap-4 px-4 py-3.5')}>
                      <span className="w-10 h-10 rounded-full bg-white text-sm font-semibold text-slate-700 flex items-center justify-center shrink-0">{initial(a.studentName)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{a.studentName}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.programId?.name || 'Program'} · {a.studyCenterId?.name || 'Center'} · {a.enrollmentNumber}</p>
                      </div>
                      <div className="shrink-0 text-right space-y-1">
                        <StatusPill status={a.status} map={enrollStatusColor} />
                        <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Paged>
          )}
        </Panel>
      )}
    </div>
  );
}
