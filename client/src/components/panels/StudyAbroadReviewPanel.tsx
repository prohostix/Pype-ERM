import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, FileText, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { APPLICATION_STATUS, apiError, fmtDate, fileHref } from './studyabroad/shared';

interface Application {
  id: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  passportNumber?: string | null;
  destinationCountry: string;
  universityName: string;
  courseName: string;
  intake: string;
  intakeYear?: number | null;
  status: string;
  documents?: { name: string; url: string }[];
  opsRemarks?: string | null;
  financeRemarks?: string | null;
  createdAt: string;
  partner?: { id: string; name: string; code: string };
}

/**
 * Application review for Study Abroad Partners.
 *  stage="ops"     — Operations checks documents  (document_review → finance_review)
 *  stage="finance" — Finance enrolls the student, optionally recording a service fee
 */
export function StudyAbroadReviewPanel({ stage }: { stage: 'ops' | 'finance' }) {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<{ mode: 'approve' | 'reject'; item: Application } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [fee, setFee] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/study-abroad/enrollments/review', { params: { stage } });
      setItems(res.data.data || []);
    } catch (e) {
      toast.error(apiError(e, 'Failed to load applications'));
    } finally {
      setLoading(false);
    }
  }, [stage]);

  useEffect(() => { load(); }, [load]);

  const close = () => { setDialog(null); setRemarks(''); setFee(''); };

  const submit = async () => {
    if (!dialog) return;
    const base = `/study-abroad/enrollments/${dialog.item.id}/${stage}-${dialog.mode}`;
    const body: Record<string, unknown> = { remarks: remarks.trim() || undefined };
    if (stage === 'finance' && dialog.mode === 'approve' && fee !== '') body.serviceFee = Number(fee);
    setBusy(true);
    try {
      await api.put(base, body);
      toast.success(dialog.mode === 'approve' ? 'Application approved' : 'Application rejected');
      close();
      load();
    } catch (e) {
      toast.error(apiError(e, 'Action failed'));
    } finally {
      setBusy(false);
    }
  };

  const feeInvalid = stage === 'finance' && dialog?.mode === 'approve' && (fee !== '' && !(Number(fee) >= 0));
  const needsRemarks = dialog?.mode === 'reject';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="w-6 h-6" />Study Abroad Applications</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {stage === 'ops'
              ? 'Verify student documents submitted by study abroad partners.'
              : 'Enroll students whose documents are verified. You can record a service fee.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No applications waiting for review.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map(a => {
            const st = APPLICATION_STATUS[a.status] || { label: a.status, className: 'bg-muted text-muted-foreground' };
            return (
              <Card key={a.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn('text-[10px] uppercase font-bold', st.className)}>{st.label}</Badge>
                        {a.partner && <Badge variant="outline" className="text-xs">{a.partner.name}</Badge>}
                      </div>
                      <h4 className="font-semibold">{a.studentName}</h4>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4">
                        <span>{a.studentEmail}</span><span>{a.studentPhone}</span>
                        {a.passportNumber && <span>Passport: {a.passportNumber}</span>}
                      </div>
                      <p className="text-sm mt-1">
                        <strong>{a.courseName}</strong> · {a.universityName} · {a.destinationCountry} · {a.intake}{a.intakeYear ? ` ${a.intakeYear}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2">
                        {(a.documents || []).length === 0
                          ? <span className="text-xs text-warning">No documents uploaded</span>
                          : (a.documents || []).map((d, i) => (
                            <a key={i} className="text-xs text-primary hover:underline inline-flex items-center gap-1" href={fileHref(d.url)} target="_blank" rel="noreferrer">
                              <FileText className="w-3.5 h-3.5" />{d.name}
                            </a>
                          ))}
                      </div>
                      {a.opsRemarks && stage === 'finance' && <p className="text-xs text-muted-foreground mt-1">Ops note: {a.opsRemarks}</p>}
                      <p className="text-xs text-muted-foreground mt-1">Submitted {fmtDate(a.createdAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10" onClick={() => setDialog({ mode: 'approve', item: a })}>
                        <CheckCircle className="w-4 h-4 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDialog({ mode: 'reject', item: a })}>
                        <XCircle className="w-4 h-4 mr-1" />Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={o => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.mode === 'approve' ? 'Approve application' : 'Reject application'}</DialogTitle>
            <DialogDescription>{dialog?.item.studentName} — {dialog?.item.courseName}, {dialog?.item.destinationCountry}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {stage === 'finance' && dialog?.mode === 'approve' && (
              <div className="space-y-1">
                <Label>Service fee (₹, optional — recorded on the application)</Label>
                <Input type="number" min="0" value={fee} onChange={e => setFee(e.target.value)} placeholder="e.g. 15000" />
              </div>
            )}
            <div className="space-y-1">
              <Label>Remarks{needsRemarks ? ' (required)' : ' (optional)'}</Label>
              <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add a note…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button
              variant={dialog?.mode === 'reject' ? 'destructive' : 'default'}
              onClick={submit}
              disabled={busy || !!feeInvalid || (needsRemarks && !remarks.trim())}
            >Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
