import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Upload, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { uploadFormFile } from '@/lib/uploadFile';
import { PIPELINE_STAGES, apiError, fileHref, fmtDate, money, stageLabel, stageTone } from './shared';

const Tracker = ({ stage }: { stage: string }) => {
  const idx = PIPELINE_STAGES.findIndex(s => s.key === stage);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PIPELINE_STAGES.map((s, i) => (
        <span key={s.key} className={cn('text-[10px] px-2 py-0.5 rounded-full border', idx < 0 ? 'text-muted-foreground' : i < idx ? 'bg-success/10 text-success border-success/30' : i === idx ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground')}>
          {s.label}
        </span>
      ))}
    </div>
  );
};

const Links = ({ docs }: { docs?: any[] }) => (
  <div className="flex flex-wrap gap-2">
    {(docs || []).map((d, i) => (
      <a key={i} href={fileHref(d.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-muted"><FileText className="w-3 h-3" />{d.type || d.label}</a>
    ))}
  </div>
);

/** One application: where it is, and the one thing the partner has to do next (if anything). */
function Row({ a, onChanged }: { a: any; onChanged: () => void }) {
  const sd = a.stageData || {};
  const [busy, setBusy] = useState(false);
  const [pay, setPay] = useState({ amount: '', date: '', receiptUrl: '' });
  const [docs, setDocs] = useState<any[]>(a.documents || []);
  const [visaDocs, setVisaDocs] = useState<{ type: string; url: string }[]>([]);

  const call = async (path: string, body: any, ok: string, method: 'put' = 'put') => {
    setBusy(true);
    try { await api[method](`/study-abroad/me/applications/${a.id}/${path}`, body); toast.success(ok); onChanged(); }
    catch (e) { toast.error(apiError(e, 'Action failed')); }
    finally { setBusy(false); }
  };
  const upload = async (file?: File): Promise<string | null> => {
    if (!file) return null;
    const t = toast.loading('Uploading…');
    try { const u = await uploadFormFile(file); toast.success('Uploaded', { id: t }); return u; }
    catch (e: any) { toast.error(e?.message || 'Upload failed', { id: t }); return null; }
  };

  let action: React.ReactNode = null;
  if (a.stage === 'application' && sd.application?.status === 'rejected') {
    action = (
      <div className="space-y-2">
        <p className="text-sm text-destructive">Documents rejected: {sd.application.remarks}. Replace the documents that need fixing, then resubmit.</p>
        {docs.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
            <a className="text-primary hover:underline inline-flex items-center gap-1.5" href={fileHref(d.url)} target="_blank" rel="noreferrer"><FileText className="w-3.5 h-3.5" />{d.type}</a>
            <label className="text-xs text-primary hover:underline cursor-pointer inline-flex items-center gap-1"><Upload className="w-3.5 h-3.5" />Replace
              <input type="file" accept=".pdf,image/*" className="hidden" onChange={async e => {
                const f = e.target.files?.[0]; e.target.value = '';
                const u = await upload(f); if (u) setDocs(ds => ds.map((x, j) => (j === i ? { ...x, url: u } : x)));
              }} />
            </label>
          </div>
        ))}
        <Button size="sm" disabled={busy} onClick={() => call('documents', { documents: docs }, 'Documents resubmitted')}>Resubmit documents</Button>
      </div>
    );
  } else if (a.stage === 'application') {
    action = <p className="text-sm text-muted-foreground">Documents are being reviewed.</p>;
  } else if (a.stage === 'interview') {
    action = <p className="text-sm text-muted-foreground">{sd.interview?.status === 'scheduled' ? `Interview on ${new Date(sd.interview.scheduledAt).toLocaleString()} (${sd.interview.mode || ''}) ${sd.interview.link || ''}` : 'Waiting for the interview to be scheduled.'}</p>;
  } else if (a.stage === 'offer') {
    action = sd.offer?.status === 'issued' ? (
      <div className="space-y-2">
        <p className="text-sm">Offer received ({sd.offer.offerType}){sd.offer.deadline ? ` — respond by ${fmtDate(sd.offer.deadline)}` : ''}.</p>
        <Links docs={[{ type: 'Offer letter', url: sd.offer.fileUrl }]} />
        {sd.offer.conditions && <p className="text-xs text-muted-foreground">Conditions: {sd.offer.conditions}</p>}
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={() => call('offer-response', { accept: true }, 'Offer accepted')}>Accept offer</Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30" disabled={busy}
            onClick={() => { if (confirm('Decline this offer? The application will be closed.')) call('offer-response', { accept: false }, 'Offer declined'); }}>Decline</Button>
        </div>
      </div>
    ) : <p className="text-sm text-muted-foreground">Waiting for the offer.</p>;
  } else if (a.stage === 'payment') {
    action = sd.payment?.status === 'submitted' ? (
      <p className="text-sm text-muted-foreground">Payment of {money(sd.payment.amount)} submitted — waiting for verification.</p>
    ) : (
      <div className="space-y-2">
        {sd.payment?.status === 'rejected' && <p className="text-sm text-destructive">Payment rejected: {sd.payment.remarks}. Please submit it again.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1"><Label className="text-xs">Amount paid *</Label><Input type="number" min="0" value={pay.amount} onChange={e => setPay(p => ({ ...p, amount: e.target.value }))} /></div>
          <div className="space-y-1"><Label className="text-xs">Payment date *</Label><Input type="date" value={pay.date} onChange={e => setPay(p => ({ ...p, date: e.target.value }))} /></div>
          <div className="space-y-1"><Label className="text-xs">Receipt *</Label>
            <Input type="file" accept=".pdf,image/*" onChange={async e => { const u = await upload(e.target.files?.[0]); if (u) setPay(p => ({ ...p, receiptUrl: u })); }} />
            {pay.receiptUrl && <span className="text-xs text-success">Uploaded</span>}</div>
        </div>
        <Button size="sm" disabled={busy || !(Number(pay.amount) > 0) || !pay.date || !pay.receiptUrl} onClick={() => call('payment', pay, 'Payment submitted')}>Submit payment</Button>
      </div>
    );
  } else if (a.stage === 'visa_documents') {
    action = sd.visaDocuments?.status === 'submitted' ? (
      <p className="text-sm text-muted-foreground">Visa documents submitted — waiting for verification.</p>
    ) : (
      <div className="space-y-2">
        {sd.visaDocuments?.status === 'rejected' && <p className="text-sm text-destructive">Visa documents rejected: {sd.visaDocuments.remarks}. Please upload them again.</p>}
        <Links docs={visaDocs} />
        <label className="text-xs text-primary hover:underline cursor-pointer inline-flex items-center gap-1">
          <Upload className="w-3.5 h-3.5" />Add a visa document
          <input type="file" accept=".pdf,image/*" className="hidden" onChange={async e => {
            const f = e.target.files?.[0]; e.target.value = '';
            const u = await upload(f); if (u && f) setVisaDocs(d => [...d, { type: f.name.replace(/\.[^.]+$/, '').slice(0, 50), url: u }]);
          }} />
        </label>
        <div><Button size="sm" disabled={busy || visaDocs.length === 0} onClick={() => call('visa-documents', { documents: visaDocs }, 'Visa documents submitted')}>Submit visa documents</Button></div>
      </div>
    );
  } else if (a.stage === 'visa_decision') {
    action = <p className="text-sm text-muted-foreground">Visa filed — waiting for the decision{sd.visaDecision?.status === 'pending' ? ' (still pending)' : ''}.</p>;
  } else if (a.stage === 'enrolled') {
    action = <p className="text-sm text-success">Student enrolled. {a.commissionStatus === 'payable' ? `Your commission of ${money(a.commissionAmount)} is payable.` : ''}</p>;
  } else if (a.stage === 'commission_released') {
    action = <p className="text-sm text-success">Commission of {money(a.commissionAmount)} released.</p>;
  } else if (a.stage === 'visa_refused') {
    action = <p className="text-sm text-destructive">Visa refused{sd.visaDecision?.reason ? `: ${sd.visaDecision.reason}` : ''}.</p>;
  }

  const closable = !['withdrawn', 'interview_failed', 'offer_declined', 'visa_refused', 'enrolled', 'commission_released'].includes(a.stage);
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Badge className={cn('text-[10px] uppercase font-bold mb-1', stageTone(a.stage))}>{stageLabel(a.stage)}</Badge>
            <h4 className="font-semibold">{a.studentName}</h4>
            <p className="text-sm text-muted-foreground">{[a.programName, a.universityName, a.country].filter(Boolean).join(' · ')}</p>
            <p className="text-xs text-muted-foreground mt-1">Submitted {fmtDate(a.createdAt)}</p>
          </div>
          {closable && <Button size="sm" variant="ghost" className="text-destructive" disabled={busy}
            onClick={() => { if (confirm('Withdraw this application?')) call('withdraw', {}, 'Application withdrawn'); }}>Withdraw</Button>}
        </div>
        <Tracker stage={a.stage} />
        {action}
      </CardContent>
    </Card>
  );
}

/** The partner's applications in the study abroad pipeline, with the commission they have earned. */
export function PipelineApplications() {
  const [items, setItems] = useState<any[]>([]);
  const [comm, setComm] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([api.get('/study-abroad/me/applications'), api.get('/study-abroad/me/commission')]);
      setItems(a.data.data || []); setComm(c.data.data);
    } catch (e) { toast.error(apiError(e, 'Failed to load applications')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {comm && (comm.payableAmount > 0 || comm.releasedAmount > 0) ? (
          <div className="flex gap-3">
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Commission earned, not yet paid</div><div className="font-bold text-warning">{money(comm.payableAmount)}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Commission received</div><div className="font-bold text-success">{money(comm.releasedAmount)}</div></CardContent></Card>
          </div>
        ) : <span />}
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh</Button>
      </div>
      {loading && items.length === 0 ? <div className="h-24 bg-muted rounded-xl animate-pulse" />
        : items.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">No applications yet.</CardContent></Card>
        : items.map(a => <Row key={a.id} a={a} onChanged={load} />)}
    </div>
  );
}
