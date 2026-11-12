import { useState, useEffect, useCallback } from 'react';
import { Globe2, Upload, RefreshCw, FileText, XCircle, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PARTNER_STATUS, APPLICATION_STATUS, apiError, fmtDate, money, fileHref } from '@/components/panels/studyabroad/shared';

interface Me {
  id: string;
  name: string;
  status: string;
  destinationCountries: string[];
  enrollmentCounts: Record<string, number>;
}

const NavTabs: Record<string, string> = { overview: 'dashboard', apply: 'apply', applications: 'applications' };

export function ModernStudyAbroadPartnerDashboard({ initialTab, onNavigate }: { initialTab?: string; onNavigate?: (tab: string) => void }) {
  const [activeTab, setActiveTab] = useState(initialTab && initialTab !== 'dashboard' ? initialTab : 'overview');
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);

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
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2"><Globe2 className="w-8 h-8" />Study Abroad Partner Portal</h1>
          <p className="text-muted-foreground mt-1">{me?.name ? `${me.name} — ` : ''}submit student applications and track their progress.</p>
        </div>
        {me && <Badge className={cn('uppercase text-[10px] font-bold', PARTNER_STATUS[me.status]?.className)}>{PARTNER_STATUS[me.status]?.label || me.status}</Badge>}
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
          <TabsList className="flex w-max space-x-1.5 bg-transparent p-1 h-auto border-b border-border/30">
            {([['overview', 'Overview'], ['apply', 'New Application'], ['applications', 'My Applications']] as const).map(([v, label]) => (
              <TabsTrigger
                key={v} value={v} disabled={!isActive && v !== 'overview'}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-5 py-2 text-sm font-medium"
              >{label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="overview"><Overview me={me} onGo={go} /></TabsContent>
          <TabsContent value="apply"><ApplyForm me={me} onDone={() => { loadMe(); go('applications'); }} /></TabsContent>
          <TabsContent value="applications"><Applications /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── Overview ───────────────────────────────────────────────────────────────

function Overview({ me, onGo }: { me: Me; onGo: (t: string) => void }) {
  if (me.status === 'suspended') {
    return (
      <Card><CardContent className="p-6 text-center space-y-2">
        <XCircle className="w-10 h-10 text-destructive mx-auto" />
        <h3 className="font-semibold">Account suspended</h3>
        <p className="text-sm text-muted-foreground">Please contact the organization to reactivate your account.</p>
      </CardContent></Card>
    );
  }
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="In review" value={String((me.enrollmentCounts.document_review || 0) + (me.enrollmentCounts.finance_review || 0))} onClick={() => onGo('applications')} />
        <Stat label="Enrolled" value={String(me.enrollmentCounts.enrolled || 0)} onClick={() => onGo('applications')} />
        <Stat label="Needs attention" value={String((me.enrollmentCounts.ops_rejected || 0) + (me.enrollmentCounts.finance_rejected || 0))} onClick={() => onGo('applications')} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Destination countries</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {me.destinationCountries.length === 0
            ? <span className="text-sm text-muted-foreground">All destination countries are open to you.</span>
            : me.destinationCountries.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  return (
    <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={onClick}>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

// ─── New application ────────────────────────────────────────────────────────

const emptyApp = {
  studentName: '', studentEmail: '', studentPhone: '', studentAddress: '', dateOfBirth: '', passportNumber: '',
  destinationCountry: '', universityName: '', courseName: '', intake: '', intakeYear: '',
};

function ApplyForm({ me, onDone }: { me: Me; onDone: () => void }) {
  const [form, setForm] = useState(emptyApp);
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof emptyApp) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const required: (keyof typeof emptyApp)[] = ['studentName', 'studentEmail', 'studentPhone', 'destinationCountry', 'universityName', 'courseName', 'intake'];
  const valid = required.every(k => form[k].trim());

  const submit = async () => {
    setBusy(true);
    try {
      const res = await api.post('/study-abroad/me/enrollments', {
        ...form,
        intakeYear: form.intakeYear ? Number(form.intakeYear) : undefined,
        dateOfBirth: form.dateOfBirth || undefined,
      });
      const id = res.data.data.id;
      if (files && files.length > 0) {
        const fd = new FormData();
        Array.from(files).forEach(f => fd.append('documents', f));
        try {
          await api.post(`/study-abroad/me/enrollments/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch (e) {
          toast.error(apiError(e, 'Application saved, but documents failed to upload. Add them from My Applications.'));
        }
      }
      toast.success('Application submitted');
      setForm(emptyApp); setFiles(null);
      onDone();
    } catch (e) { toast.error(apiError(e, 'Failed to submit application')); } finally { setBusy(false); }
  };

  const field = (k: keyof typeof emptyApp, label: string, type = 'text') => (
    <div className="space-y-1" key={k}>
      <Label>{label}{required.includes(k) ? ' *' : ''}</Label>
      <Input type={type} value={form[k]} onChange={set(k)} />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>New student application</CardTitle>
        <CardDescription>Operations reviews the documents first, then Finance confirms the service fee.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {field('studentName', 'Student name')}
          {field('studentEmail', 'Student email', 'email')}
          {field('studentPhone', 'Student phone')}
          {field('dateOfBirth', 'Date of birth', 'date')}
          {field('passportNumber', 'Passport number')}
          {field('studentAddress', 'Address')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Destination country *</Label>
            {me.destinationCountries.length > 0 ? (
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.destinationCountry} onChange={set('destinationCountry')}>
                <option value="">Select country…</option>
                {me.destinationCountries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : <Input value={form.destinationCountry} onChange={set('destinationCountry')} />}
          </div>
          {field('universityName', 'University')}
          {field('courseName', 'Course')}
          {field('intake', 'Intake (e.g. September)')}
          {field('intakeYear', 'Intake year', 'number')}
        </div>
        <div className="space-y-1">
          <Label>Documents (passport, transcripts, etc.)</Label>
          <input type="file" multiple onChange={e => setFiles(e.target.files)} className="block text-sm" />
        </div>
        <Button onClick={submit} disabled={busy || !valid}><Plus className="w-4 h-4 mr-2" />Submit application</Button>
      </CardContent>
    </Card>
  );
}

// ─── My applications ────────────────────────────────────────────────────────

function Applications() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  const resubmit = async (id: string) => {
    try {
      await api.put(`/study-abroad/me/enrollments/${id}/resubmit`, {});
      toast.success('Application resubmitted');
      load();
    } catch (e) { toast.error(apiError(e, 'Failed to resubmit')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No applications yet.</CardContent></Card>
      ) : items.map(a => {
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
                  <p className="text-xs text-muted-foreground mt-1">Submitted {fmtDate(a.createdAt)}{a.serviceFee != null ? ` · Service fee ${money(a.serviceFee)}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {editable && (
                    <label className="text-xs text-primary hover:underline cursor-pointer inline-flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />Add documents
                      <input type="file" multiple className="hidden" onChange={e => addDocs(a.id, e.target.files)} />
                    </label>
                  )}
                  {rejected && <Button size="sm" onClick={() => resubmit(a.id)}>Resubmit</Button>}
                </div>
              </div>
              {note && <p className="text-sm text-destructive">Reason: {note}</p>}
              <div className="flex flex-wrap gap-3">
                {(a.documents || []).map((d: any, i: number) => (
                  <a key={i} className="text-xs text-primary hover:underline inline-flex items-center gap-1" href={fileHref(d.url)} target="_blank" rel="noreferrer">
                    <FileText className="w-3.5 h-3.5" />{d.name}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
