import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, FileText, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { uploadFormFile } from '@/lib/uploadFile';
import {
  PIPELINE_STAGES, TERMINAL_LABELS, apiError, fileHref, fmtDate, money, stageLabel, stageTone, waitingFor, COMMISSION_STATUS,
} from './shared';

const FILTERS = [{ key: 'all', label: 'All' }, ...PIPELINE_STAGES, ...Object.entries(TERMINAL_LABELS).map(([key, label]) => ({ key, label }))];

function DocLinks({ docs }: { docs?: any[] }) {
  if (!docs?.length) return <p className="text-xs text-muted-foreground">No files.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {docs.map((d, i) => (
        <a key={i} href={fileHref(d.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-muted">
          <FileText className="w-3 h-3" />{d.type || d.label}
        </a>
      ))}
    </div>
  );
}

function Tracker({ stage }: { stage: string }) {
  const idx = PIPELINE_STAGES.findIndex(s => s.key === stage);
  const closed = idx < 0;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PIPELINE_STAGES.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <span className={cn('text-[11px] px-2 py-1 rounded-full border', closed ? 'text-muted-foreground' : i < idx ? 'bg-success/10 text-success border-success/30' : i === idx ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground')}>
            {i < idx && !closed ? '✓ ' : ''}{s.label}
          </span>
          {i < PIPELINE_STAGES.length - 1 && <span className="text-muted-foreground text-xs">›</span>}
        </div>
      ))}
    </div>
  );
}

/** Approve/Reject with remarks, used by the three review steps. */
function ReviewActions({ busy, approveLabel, onApprove, onReject }: { busy: boolean; approveLabel: string; onApprove: (remarks: string) => void; onReject: (remarks: string) => void }) {
  const [remarks, setRemarks] = useState('');
  return (
    <div className="space-y-2">
      <Textarea rows={2} placeholder="Remarks (required to reject)" value={remarks} onChange={e => setRemarks(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => onApprove(remarks)}><Check className="w-4 h-4 mr-1" />{approveLabel}</Button>
        <Button size="sm" variant="outline" className="text-destructive border-destructive/30" disabled={busy || !remarks.trim()} onClick={() => onReject(remarks)}><X className="w-4 h-4 mr-1" />Reject</Button>
      </div>
    </div>
  );
}

export function StudyAbroadApplicationsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [app, setApp] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/study-abroad/applications', { params: { ...(stage !== 'all' ? { stage } : {}), ...(q.trim() ? { q: q.trim() } : {}) } });
      setRows(res.data.data || []);
      setCounts(res.data.counts || {});
    } catch (e) { toast.error(apiError(e, 'Failed to load applications')); }
    finally { setLoading(false); }
  }, [stage, q]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  const open = async (id: string) => {
    setOpenId(id);
    try { setApp((await api.get(`/study-abroad/applications/${id}`)).data.data); }
    catch (e) { toast.error(apiError(e, 'Failed to open application')); setOpenId(null); }
  };

  /** Run a stage action, then refresh the dialog and the list. */
  const act = async (method: 'put' | 'post', path: string, body: any, ok: string) => {
    if (!app) return;
    setBusy(true);
    try {
      const res = await (api as any)[method](`/study-abroad/applications/${app.id}/${path}`, body);
      toast.success(ok);
      if (method === 'put') setApp(res.data.data); else await open(app.id);
      load();
    } catch (e) { toast.error(apiError(e, 'Action failed')); }
    finally { setBusy(false); }
  };

  const upload = async (file: File | undefined): Promise<string | null> => {
    if (!file) return null;
    const t = toast.loading('Uploading…');
    try { const url = await uploadFormFile(file); toast.success('Uploaded', { id: t }); return url; }
    catch (e: any) { toast.error(e?.message || 'Upload failed', { id: t }); return null; }
  };

  // local form state for the stage forms
  const [iv, setIv] = useState({ scheduledAt: '', mode: 'Online', link: '', remarks: '' });
  const [offer, setOffer] = useState({ offerType: 'unconditional', fileUrl: '', conditions: '', deadline: '' });
  const [visa, setVisa] = useState({ outcome: 'approved', reference: '', decisionDate: '', reason: '' });
  const [rel, setRel] = useState({ reference: '', notes: '' });
  useEffect(() => { setIv({ scheduledAt: '', mode: 'Online', link: '', remarks: '' }); setOffer({ offerType: 'unconditional', fileUrl: '', conditions: '', deadline: '' }); setVisa({ outcome: 'approved', reference: '', decisionDate: '', reason: '' }); setRel({ reference: '', notes: '' }); }, [openId]);

  const sd = app?.stageData || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search student name or email" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh</Button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setStage(f.key)}
            className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors', stage === f.key ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
            {f.label}{f.key !== 'all' && counts[f.key] ? ` (${counts[f.key]})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No applications in this view.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <Card key={r.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => open(r.id)}>
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn('text-[10px] uppercase font-bold', stageTone(r.stage))}>{stageLabel(r.stage)}</Badge>
                    {r.commissionStatus === 'payable' && <Badge className={cn('text-[10px]', COMMISSION_STATUS.payable.className)}>Commission payable</Badge>}
                  </div>
                  <div className="font-semibold">{r.studentName}</div>
                  <div className="text-xs text-muted-foreground">{[r.universityName, r.programName, r.country].filter(Boolean).join(' · ')}</div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>Partner: <strong className="text-foreground">{r.partnerName}</strong></div>
                  <div>{waitingFor(r)} · updated {fmtDate(r.updatedAt)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!openId} onOpenChange={o => { if (!o) { setOpenId(null); setApp(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {!app ? <div className="py-10 text-center text-muted-foreground">Loading…</div> : (
            <>
              <DialogHeader>
                <DialogTitle>{app.studentName}</DialogTitle>
                <DialogDescription>{[app.studentEmail, app.studentPhone].join(' · ')} — {[app.universityName, app.programName].filter(Boolean).join(' · ')} — via {app.partnerName}</DialogDescription>
              </DialogHeader>
              <Tracker stage={app.stage} />
              <p className="text-sm"><span className="text-muted-foreground">Next:</span> <strong>{waitingFor(app) || stageLabel(app.stage)}</strong></p>

              <div className="space-y-4">
                {app.stage === 'application' && (
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold">Review documents</h4>
                    <DocLinks docs={[...(app.details?.photo ? [{ type: 'Photo', url: app.details.photo }] : []), ...(app.documents || [])]} />
                    {sd.application?.status === 'rejected'
                      ? <p className="text-xs text-destructive">Rejected: {sd.application.remarks}. Waiting for the partner to fix and resubmit.</p>
                      : <ReviewActions busy={busy} approveLabel="Approve documents"
                          onApprove={r => act('put', 'review', { approve: true, remarks: r }, 'Documents approved')}
                          onReject={r => act('put', 'review', { approve: false, remarks: r }, 'Documents rejected')} />}
                  </section>
                )}

                {app.stage === 'interview' && (
                  <section className="space-y-3">
                    <h4 className="text-sm font-semibold">Interview</h4>
                    {sd.interview?.status === 'scheduled' && <p className="text-sm">Scheduled for <strong>{new Date(sd.interview.scheduledAt).toLocaleString()}</strong> ({sd.interview.mode}){sd.interview.link ? ` — ${sd.interview.link}` : ''}</p>}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Date & time</Label><Input type="datetime-local" value={iv.scheduledAt} onChange={e => setIv(v => ({ ...v, scheduledAt: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Mode</Label><Input value={iv.mode} onChange={e => setIv(v => ({ ...v, mode: e.target.value }))} /></div>
                      <div className="space-y-1 col-span-2"><Label>Link / venue</Label><Input value={iv.link} onChange={e => setIv(v => ({ ...v, link: e.target.value }))} /></div>
                      <div className="space-y-1 col-span-2"><Label>Remarks</Label><Input value={iv.remarks} onChange={e => setIv(v => ({ ...v, remarks: e.target.value }))} /></div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" disabled={busy || !iv.scheduledAt} onClick={() => act('put', 'interview', { ...iv, scheduledAt: iv.scheduledAt }, 'Interview scheduled')}>Schedule</Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act('put', 'interview', { ...iv, scheduledAt: iv.scheduledAt || undefined, result: 'passed' }, 'Interview cleared')}>Mark cleared</Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30" disabled={busy} onClick={() => act('put', 'interview', { ...iv, scheduledAt: iv.scheduledAt || undefined, result: 'failed' }, 'Interview not cleared')}>Not cleared</Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => act('put', 'interview', { required: false }, 'Interview skipped')}>No interview needed</Button>
                    </div>
                  </section>
                )}

                {app.stage === 'offer' && (
                  <section className="space-y-3">
                    <h4 className="text-sm font-semibold">Offer</h4>
                    {sd.offer?.status === 'issued' ? (
                      <div className="space-y-1 text-sm">
                        <p>{sd.offer.offerType === 'conditional' ? 'Conditional' : 'Unconditional'} offer recorded{sd.offer.deadline ? ` — respond by ${fmtDate(sd.offer.deadline)}` : ''}. Waiting for the partner to accept.</p>
                        <DocLinks docs={[{ type: 'Offer letter', url: sd.offer.fileUrl }]} />
                        {sd.offer.conditions && <p className="text-xs text-muted-foreground">Conditions: {sd.offer.conditions}</p>}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label>Type</Label>
                          <select className="border rounded-md px-3 py-2 text-sm bg-background w-full" value={offer.offerType} onChange={e => setOffer(o => ({ ...o, offerType: e.target.value }))}>
                            <option value="unconditional">Unconditional</option><option value="conditional">Conditional</option>
                          </select></div>
                        <div className="space-y-1"><Label>Respond by</Label><Input type="date" value={offer.deadline} onChange={e => setOffer(o => ({ ...o, deadline: e.target.value }))} /></div>
                        <div className="space-y-1 col-span-2"><Label>Offer letter *</Label>
                          <Input type="file" accept=".pdf,image/*" onChange={async e => { const u = await upload(e.target.files?.[0]); if (u) setOffer(o => ({ ...o, fileUrl: u })); }} />
                          {offer.fileUrl && <p className="text-xs text-success">Uploaded</p>}</div>
                        <div className="space-y-1 col-span-2"><Label>Conditions</Label><Textarea rows={2} value={offer.conditions} onChange={e => setOffer(o => ({ ...o, conditions: e.target.value }))} /></div>
                        <div className="col-span-2 flex gap-2">
                          <Button size="sm" disabled={busy || !offer.fileUrl} onClick={() => act('put', 'offer', offer, 'Offer recorded')}>Record offer</Button>
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/30" disabled={busy} onClick={() => act('put', 'offer', { universityRejected: true }, 'Application closed')}>University did not offer</Button>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {app.stage === 'payment' && (
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold">Payment</h4>
                    {sd.payment?.status === 'submitted' ? (
                      <>
                        <p className="text-sm"><strong>{money(sd.payment.amount)}</strong> paid on {fmtDate(sd.payment.date)}</p>
                        <DocLinks docs={[{ type: 'Receipt', url: sd.payment.receiptUrl }]} />
                        <ReviewActions busy={busy} approveLabel="Verify payment"
                          onApprove={r => act('put', 'verify-payment', { approve: true, remarks: r }, 'Payment verified')}
                          onReject={r => act('put', 'verify-payment', { approve: false, remarks: r }, 'Payment rejected')} />
                      </>
                    ) : <p className="text-sm text-muted-foreground">{sd.payment?.status === 'rejected' ? `Rejected: ${sd.payment.remarks}. ` : ''}Waiting for the partner to submit the payment and receipt.</p>}
                  </section>
                )}

                {app.stage === 'visa_documents' && (
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold">Visa documents</h4>
                    {sd.visaDocuments?.status === 'submitted' ? (
                      <>
                        <DocLinks docs={sd.visaDocuments.documents} />
                        <ReviewActions busy={busy} approveLabel="Approve documents"
                          onApprove={r => act('put', 'verify-visa-documents', { approve: true, remarks: r }, 'Visa documents approved')}
                          onReject={r => act('put', 'verify-visa-documents', { approve: false, remarks: r }, 'Visa documents rejected')} />
                      </>
                    ) : <p className="text-sm text-muted-foreground">{sd.visaDocuments?.status === 'rejected' ? `Rejected: ${sd.visaDocuments.remarks}. ` : ''}Waiting for the partner to upload the visa documents.</p>}
                  </section>
                )}

                {app.stage === 'visa_decision' && (
                  <section className="space-y-3">
                    <h4 className="text-sm font-semibold">Visa decision</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Outcome</Label>
                        <select className="border rounded-md px-3 py-2 text-sm bg-background w-full" value={visa.outcome} onChange={e => setVisa(v => ({ ...v, outcome: e.target.value }))}>
                          <option value="approved">Approved</option><option value="refused">Refused</option><option value="pending">Still pending</option>
                        </select></div>
                      <div className="space-y-1"><Label>Decision date</Label><Input type="date" value={visa.decisionDate} onChange={e => setVisa(v => ({ ...v, decisionDate: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Reference number</Label><Input value={visa.reference} onChange={e => setVisa(v => ({ ...v, reference: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>{visa.outcome === 'refused' ? 'Reason' : 'Notes'}</Label><Input value={visa.reason} onChange={e => setVisa(v => ({ ...v, reason: e.target.value }))} /></div>
                    </div>
                    {visa.outcome === 'approved' && <p className="text-xs text-muted-foreground">Approving creates the student account and portal login, and makes the partner's commission payable.</p>}
                    <Button size="sm" disabled={busy} onClick={() => act('put', 'visa-decision', visa, visa.outcome === 'approved' ? 'Visa approved — student enrolled' : 'Visa decision saved')}>Save decision</Button>
                  </section>
                )}

                {(app.stage === 'enrolled' || app.stage === 'commission_released') && (
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold">Student enrolled {fmtDate(app.enrolledAt)}</h4>
                    <p className="text-sm">Commission: <Badge className={cn('text-[10px]', (COMMISSION_STATUS[app.commissionStatus] || COMMISSION_STATUS.not_eligible).className)}>{(COMMISSION_STATUS[app.commissionStatus] || COMMISSION_STATUS.not_eligible).label}</Badge> <strong>{money(app.commissionAmount)}</strong>
                      {app.commissionTerms?.type === 'percentage' && <span className="text-xs text-muted-foreground"> ({app.commissionTerms.value}% of {money(app.commissionTerms.paidAmount)})</span>}</p>
                    {app.stage === 'enrolled' && app.commissionStatus === 'payable' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label>Payment reference</Label><Input value={rel.reference} onChange={e => setRel(r => ({ ...r, reference: e.target.value }))} /></div>
                        <div className="space-y-1"><Label>Notes</Label><Input value={rel.notes} onChange={e => setRel(r => ({ ...r, notes: e.target.value }))} /></div>
                        <div className="col-span-2"><Button size="sm" disabled={busy} onClick={() => act('post', 'release-commission', rel, 'Commission released')}>Release {money(app.commissionAmount)}</Button></div>
                      </div>
                    )}
                  </section>
                )}

                {!(['withdrawn', 'interview_failed', 'offer_declined', 'visa_refused', 'enrolled', 'commission_released'].includes(app.stage)) && (
                  <div className="pt-2 border-t"><Button size="sm" variant="ghost" className="text-destructive" disabled={busy}
                    onClick={() => { if (confirm('Close this application? This cannot be undone.')) act('put', 'withdraw', {}, 'Application closed'); }}>Close application</Button></div>
                )}

                <section>
                  <h4 className="text-sm font-semibold mb-1">History</h4>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {[...(app.stageHistory || [])].reverse().map((h: any, i: number) => (
                      <li key={i}>{new Date(h.changedAt).toLocaleString()} — <strong className="text-foreground">{stageLabel(h.stage)}</strong>: {h.note} ({h.actorName})</li>
                    ))}
                  </ul>
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
