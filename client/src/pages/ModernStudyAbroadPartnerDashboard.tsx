import { useState, useEffect, useCallback } from 'react';
import { Globe2, Upload, RefreshCw, FileText, XCircle, Plus, Search, GraduationCap, Check } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { uploadFormFile } from '@/lib/uploadFile';
import { toast } from 'sonner';
import { ApplyWizard } from '@/components/panels/studyabroad/ApplyWizard';
import { EnrolledStudents } from '@/components/panels/studyabroad/EnrolledStudents';
import { ProgramSearch } from '@/components/panels/studyabroad/ProgramSearch';
import { type Prefill } from '@/components/panels/studyabroad/shared';
import { PARTNER_STATUS, APPLICATION_STATUS, apiError, fmtDate, money, fileHref } from '@/components/panels/studyabroad/shared';

interface Me {
  id: string;
  name: string;
  status: string;
  destinationCountries: string[];
  enrollmentCounts: Record<string, number>;
}

const NavTabs: Record<string, string> = { overview: 'dashboard', catalog: 'catalog', apply: 'apply', applications: 'applications', enrolled: 'enrolled' };

export function ModernStudyAbroadPartnerDashboard({ initialTab, onNavigate }: { initialTab?: string; onNavigate?: (tab: string) => void }) {
  const [activeTab, setActiveTab] = useState(initialTab && initialTab !== 'dashboard' ? initialTab : 'overview');
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [prefill, setPrefill] = useState<Prefill | null>(null);

  useEffect(() => { setActiveTab(initialTab && initialTab !== 'dashboard' ? initialTab : 'overview'); }, [initialTab]);

  const loadMe = useCallback(async () => {
    try {
      const res = await api.get('/study-abroad/me');
      setMe(res.data.data);
    } catch (e: any) {
      if (e?.response?.data?.code === 'FEATURE_DISABLED') setDisabled(true);
      else toast.error(apiError(e, 'Failed to load your partner account'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const go = (tab: string) => {
    setActiveTab(tab);
    onNavigate?.(NavTabs[tab] || tab);
  };

  const isActive = me?.status === 'active';
  const shown = isActive ? activeTab : 'overview';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-6 sm:p-8">
        <Globe2 className="absolute -right-6 -top-6 w-40 h-40 opacity-10" />
        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] opacity-80">Study Abroad Partner Portal</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{me?.name ? `Welcome, ${me.name}` : 'Welcome'}</h1>
            <p className="text-sm opacity-90">Find programs, submit student applications and track every one in one place.</p>
          </div>
          {me && <Badge className="uppercase text-[10px] font-bold bg-white/20 text-white hover:bg-white/20">{PARTNER_STATUS[me.status]?.label || me.status}</Badge>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : disabled ? (
        <Card><CardContent className="py-16 text-center space-y-2">
          <XCircle className="w-10 h-10 text-destructive mx-auto" />
          <h3 className="font-semibold">Portal unavailable</h3>
          <p className="text-sm text-muted-foreground">Study Abroad Partner access is currently turned off for this organization. Please contact them.</p>
        </CardContent></Card>
      ) : !me ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Your partner account could not be loaded.</CardContent></Card>
      ) : (
        <Tabs value={shown} onValueChange={go} className="space-y-6">
          <TabsContent value="overview"><Overview me={me} onGo={go} /></TabsContent>
          <TabsContent value="catalog"><ProgramSearch onApply={p => { setPrefill(p); go('apply'); }} /></TabsContent>
          <TabsContent value="apply"><ApplyWizard prefill={prefill} onDone={() => { loadMe(); go('applications'); }} /></TabsContent>
          <TabsContent value="applications"><Applications /></TabsContent>
          <TabsContent value="enrolled"><EnrolledStudents /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── Overview ───────────────────────────────────────────────────────────────

function Overview({ me, onGo }: { me: Me; onGo: (t: string) => void }) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (me.status !== 'active') { setLoading(false); return; }
    api.get('/study-abroad/me/enrollments').then(r => setApps(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [me.status]);

  if (me.status === 'suspended') {
    return (
      <Card><CardContent className="p-6 text-center space-y-2">
        <XCircle className="w-10 h-10 text-destructive mx-auto" />
        <h3 className="font-semibold">Account suspended</h3>
        <p className="text-sm text-muted-foreground">Please contact the organization to reactivate your account.</p>
      </CardContent></Card>
    );
  }

  const c = me.enrollmentCounts;
  const total = Object.values(c).reduce((n, v) => n + v, 0);
  const inReview = (c.document_review || 0) + (c.finance_review || 0);
  const rejected = (c.ops_rejected || 0) + (c.finance_rejected || 0);
  const byCountry = Object.entries(apps.reduce<Record<string, number>>((m, a) => { m[a.destinationCountry] = (m[a.destinationCountry] || 0) + 1; return m; }, {}))
    .sort((x, y) => y[1] - x[1]).slice(0, 6);
  const topCountry = byCountry[0]?.[1] || 1;
  const stages: [string, number, string][] = [
    ['Document review', c.document_review || 0, 'bg-warning'],
    ['Finance review', c.finance_review || 0, 'bg-primary'],
    ['Enrolled', c.enrolled || 0, 'bg-success'],
    ['Needs attention', rejected, 'bg-destructive'],
  ];

  return (
    <div className="space-y-6">
      {/* Primary actions */}
      <div className="flex gap-2 flex-wrap justify-end">
        <Button variant="outline" onClick={() => onGo('catalog')}><Search className="w-4 h-4 mr-2" />Search programs</Button>
        <Button onClick={() => onGo('apply')}><Plus className="w-4 h-4 mr-2" />New application</Button>
      </div>

      {/* Counters */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Stat label="All applications" value={total} tone="border-l-primary" onClick={() => onGo('applications')} />
        <Stat label="In review" value={inReview} tone="border-l-warning" onClick={() => onGo('applications')} />
        <Stat label="Enrolled" value={c.enrolled || 0} tone="border-l-success" onClick={() => onGo('applications')} />
        <Stat label="Needs attention" value={rejected} tone="border-l-destructive" onClick={() => onGo('applications')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent applications */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Recent applications</CardTitle>
            {apps.length > 0 && <button className="text-xs text-primary hover:underline" onClick={() => onGo('applications')}>View all</button>}
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? <div className="h-32 bg-muted rounded-lg animate-pulse" />
            : apps.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-sm text-muted-foreground">No applications yet. Start with a program search.</p>
                <Button size="sm" onClick={() => onGo('catalog')}>Search programs</Button>
              </div>
            ) : apps.slice(0, 5).map(a => {
              const st = APPLICATION_STATUS[a.status] || { label: a.status, className: 'bg-muted text-muted-foreground' };
              return (
                <button key={a.id} type="button" onClick={() => onGo('applications')}
                  className="w-full text-left flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{a.studentName}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.courseName} · {a.universityName} · {a.destinationCountry}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className={cn('text-[10px] uppercase font-bold', st.className)}>{st.label}</Badge>
                    <p className="text-[11px] text-muted-foreground mt-1">{fmtDate(a.createdAt)}</p>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {/* Pipeline */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Application pipeline</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {stages.map(([label, n, bar]) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{n}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={cn('h-full rounded-full', bar)} style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* By country */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Applications by country</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {byCountry.length === 0 ? <p className="text-sm text-muted-foreground">Country totals appear once you have applications.</p>
              : byCountry.map(([country, n]) => (
                <div key={country} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5 text-muted-foreground" />{country}</span><span className="font-semibold">{n}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(n / topCountry) * 100}%` }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, onClick }: { label: string; value: number; tone: string; onClick?: () => void }) {
  return (
    <Card className={cn('cursor-pointer hover:shadow-md transition-shadow border-l-4', tone)} onClick={onClick}>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function Stepper({ status }: { status: string }) {
  const steps = ['Submitted', 'Document review', 'Finance review', 'Enrolled'];
  // How many steps are complete for each status; rejected ones stop at the step that rejected.
  const done: Record<string, number> = { document_review: 2, ops_rejected: 2, finance_review: 3, finance_rejected: 3, enrolled: 4 };
  const n = done[status] ?? 1;
  const rejected = status === 'ops_rejected' || status === 'finance_rejected';
  return (
    <div className="flex items-center pt-2">
      {steps.map((label, i) => {
        const complete = i < n;
        const current = i === n - 1 && status !== 'enrolled';
        return (
          <div key={label} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1">
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2',
                complete ? (current && rejected ? 'bg-destructive border-destructive text-white' : 'bg-primary border-primary text-primary-foreground') : 'border-muted-foreground/30 text-muted-foreground')}>
                {complete && !(current && rejected) ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{label}</span>
            </div>
            {i < steps.length - 1 && <div className={cn('h-0.5 flex-1 mx-2 mb-4 rounded', i < n - 1 ? 'bg-primary' : 'bg-muted')} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── My applications ────────────────────────────────────────────────────────

function Applications() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [intake, setIntake] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/study-abroad/me/enrollments');
      setItems(res.data.data || []);
    } catch (e) { toast.error(apiError(e, 'Failed to load applications')); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addDocs = async (id: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('documents', f));
      await api.post(`/study-abroad/me/enrollments/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Documents added');
      load();
    } catch (e) { toast.error(apiError(e, 'Upload failed')); }
  };

  // Replace one rejected document, the photo, or the receipt (Academic-Partner style re-upload).
  const replace = async (kind: 'doc' | 'photo' | 'receipt', id: string, file?: File, index?: number) => {
    if (!file) return;
    const tid = toast.loading('Compressing & uploading...');
    try {
      const url = await uploadFormFile(file);
      const path = kind === 'doc' ? `documents/${index}` : kind;
      await api.put(`/study-abroad/me/enrollments/${id}/${path}`, { url });
      toast.success('Uploaded', { id: tid });
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || 'Upload failed', { id: tid }); }
  };

  const resubmit = async (id: string) => {
    try {
      await api.put(`/study-abroad/me/enrollments/${id}/resubmit`, {});
      toast.success('Application resubmitted');
      load();
    } catch (e) { toast.error(apiError(e, 'Failed to resubmit')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3 flex-wrap">
        <div className="flex gap-3 flex-wrap flex-1">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search student, email, university or course…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.entries(APPLICATION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={intake} onChange={e => setIntake(e.target.value)}>
          <option value="all">All intakes</option>
          {Array.from(new Set(items.map(a => `${a.intake}${a.intakeYear ? ` ${a.intakeYear}` : ''}`))).sort().map(x => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={country} onChange={e => setCountry(e.target.value)}>
          <option value="all">All countries</option>
          {Array.from(new Set(items.map(a => a.destinationCountry))).sort().map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No applications yet.</CardContent></Card>
      ) : items.filter(a => (country === 'all' || a.destinationCountry === country)
        && (status === 'all' || a.status === status)
        && (intake === 'all' || `${a.intake}${a.intakeYear ? ` ${a.intakeYear}` : ''}` === intake)
        && (!search.trim() || [a.studentName, a.studentEmail, a.universityName, a.courseName].some((v: string) => (v || '').toLowerCase().includes(search.trim().toLowerCase())))).map(a => {
        const st = APPLICATION_STATUS[a.status] || { label: a.status, className: 'bg-muted text-muted-foreground' };
        const rejected = a.status === 'ops_rejected' || a.status === 'finance_rejected';
        const editable = a.status === 'document_review' || rejected;
        const note = a.status === 'ops_rejected' ? a.opsRemarks : a.status === 'finance_rejected' ? a.financeRemarks : null;
        return (
          <Card key={a.id}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <Badge className={cn('text-[10px] uppercase font-bold mb-1', st.className)}>{st.label}</Badge>
                  <h4 className="font-semibold">{a.studentName}</h4>
                  <p className="text-sm text-muted-foreground">{a.courseName} · {a.universityName} · {a.destinationCountry} · {a.intake}{a.intakeYear ? ` ${a.intakeYear}` : ''}</p>
                  <p className="text-xs text-muted-foreground mt-1">Submitted {fmtDate(a.createdAt)}{a.initialPaymentAmount ? ` · Paid ${money(a.initialPaymentAmount)}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {editable && (
                    <label className="text-xs text-primary hover:underline cursor-pointer inline-flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />Add documents
                      <input type="file" multiple className="hidden" onChange={e => addDocs(a.id, e.target.files)} />
                    </label>
                  )}
                  {rejected && <Button size="sm" disabled={a.status === 'ops_rejected' && ((a.documents || []).some((d: any) => d.status === 'rejected') || a.photoStatus === 'rejected')} onClick={() => resubmit(a.id)}>Resubmit</Button>}
                </div>
              </div>
              <Stepper status={a.status} />
              {note && <p className="text-sm text-destructive">Reason: {note}</p>}
              {(() => {
                const canEditDocs = a.status === 'document_review' || a.status === 'ops_rejected';
                const canEditReceipt = ['document_review', 'finance_review', 'finance_rejected'].includes(a.status);
                const docs: any[] = a.documents || [];
                const badge = (st?: string) => st === 'rejected'
                  ? <Badge className="bg-destructive/10 text-destructive text-[10px] uppercase font-bold">Rejected</Badge>
                  : st === 'approved' ? <Badge className="bg-success/10 text-success text-[10px] uppercase font-bold">Approved</Badge>
                  : <Badge variant="outline" className="text-[10px] uppercase font-bold">Pending</Badge>;
                const upload = (kind: 'doc' | 'photo' | 'receipt', label: string, index?: number, strong = false) => (
                  <label className={cn('text-xs cursor-pointer inline-flex items-center gap-1', strong ? 'px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold' : 'text-primary hover:underline')}>
                    <Upload className="w-3.5 h-3.5" />{label}
                    <input type="file" className="hidden" onChange={e => { replace(kind, a.id, e.target.files?.[0], index); e.target.value = ''; }} />
                  </label>
                );
                return (
                  <div className="space-y-2 pt-1">
                    {docs.map((d: any, i: number) => (
                      <div key={i} className={cn('flex items-center justify-between gap-3 flex-wrap rounded-lg border px-3 py-2', d.status === 'rejected' && 'border-destructive/40 bg-destructive/5')}>
                        <div className="min-w-0">
                          <a className="text-sm text-primary hover:underline inline-flex items-center gap-1.5" href={fileHref(d.url)} target="_blank" rel="noreferrer">
                            <FileText className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{d.name}</span>
                          </a>
                          {d.status === 'rejected' && d.remarks && <p className="text-xs text-destructive mt-0.5">Rejected: {d.remarks}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {badge(d.status)}
                          {canEditDocs && d.status === 'rejected' && upload('doc', 'Re-upload', i, true)}
                        </div>
                      </div>
                    ))}
                    {a.photoStatus === 'rejected' && (
                      <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
                        <p className="text-sm">Student photo <span className="text-xs text-destructive">— rejected, please upload a clearer one</span></p>
                        {canEditDocs && upload('photo', 'Re-upload photo', undefined, true)}
                      </div>
                    )}
                    {(a.receiptUrl || a.initialPaymentAmount) && (
                      <div className={cn('flex items-center justify-between gap-3 flex-wrap rounded-lg border px-3 py-2', a.status === 'finance_rejected' && 'border-destructive/40 bg-destructive/5')}>
                        <div className="min-w-0 text-sm">
                          <span className="font-medium">Payment receipt</span>
                          <span className="text-xs text-muted-foreground"> · {money(a.initialPaymentAmount)}{a.initialPaymentDate ? ` · paid ${fmtDate(a.initialPaymentDate)}` : ''}</span>
                          {a.receiptUrl && <a className="text-xs text-primary hover:underline ml-2" href={fileHref(a.receiptUrl)} target="_blank" rel="noreferrer">View</a>}
                          {a.status === 'finance_rejected' && a.financeRemarks && <p className="text-xs text-destructive mt-0.5">Rejected by Finance: {a.financeRemarks}</p>}
                        </div>
                        {canEditReceipt && upload('receipt', a.status === 'finance_rejected' ? 'Re-upload receipt' : 'Replace receipt', undefined, a.status === 'finance_rejected')}
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
