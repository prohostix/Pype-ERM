import { useState, useEffect } from 'react';
import { RefreshCw, DollarSign, FileText, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { mayOn } from '@/lib/access';
import { Allowed } from '@/components/ui/allowed';

const SERVER_BASE = '';

interface AuthFeeEntry { universityId: string; universityName: string; amount: number | null; }
interface PaymentProof { url: string; uploadedAt: string; remarks?: string; }
interface Center {
  id: string;
  name: string;
  code: string;
  email: string;
  contact: string;
  address: string;
  verifiedBy?: { name: string };
  verifiedAt?: string;
  authFees: AuthFeeEntry[];
  paymentProof?: PaymentProof;
  createdAt: string;
}
interface Credentials { email: string; password: string; }

export function FinanceCenterVerificationPanel() {
  const { user } = useAuth();
  // The role decides unless an Org Admin has set something for this user (the server enforces it)
  const mayApprove = mayOn(user, 'pending_payments', 'approve', true);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<{ center: Center; action: 'approve' | 'reject' } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const loadCenters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/centers/pending-payment');
      setCenters(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load centers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCenters(); }, []);

  const handleAction = async () => {
    if (!dialog) return;
    if (dialog.action === 'reject' && !remarks.trim()) {
      toast.error('Remarks are required when rejecting');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.put(`/finance/centers/${dialog.center.id}/finance-verify`, {
        action: dialog.action,
        remarks,
      });
      setDialog(null);
      setRemarks('');
      loadCenters();
      if (dialog.action === 'approve' && res.data._credentials) {
        setCredentials(res.data._credentials);
      } else {
        toast.success(dialog.action === 'approve' ? 'Center activated' : 'Center rejected');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const totalFee = (fees: AuthFeeEntry[]) =>
    fees.reduce((sum, f) => sum + (f.amount || 0), 0);

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Pending Payment Verification</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Verify authorisation fee payment for academic partners.</p>
        </div>
        <Button variant="outline" onClick={loadCenters} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-3xl animate-pulse" />)}</div>
      ) : centers.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-100 py-16 text-center text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><DollarSign className="w-6 h-6" /></div>
          <p className="text-sm">No centers pending payment verification.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {centers.map(c => (
            <div key={c.id} className="rounded-3xl bg-white border border-slate-100 hover:border-[#8ae47e] transition-colors">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-lg text-slate-900">{c.name}</h4>
                      <Badge variant="outline" className="text-[10px] rounded-full bg-[#f4f6f3] border-0 font-mono">{c.code}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.email} · {c.contact}</p>
                    {c.verifiedBy && (
                      <p className="text-xs text-muted-foreground mt-0.5">Docs verified by: {c.verifiedBy.name}</p>
                    )}
                    <div className="mt-4 space-y-2 rounded-2xl bg-[#f4f6f3] p-4">
                      {c.authFees.map(f => (
                        <div key={f.universityId} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{f.universityName}</span>
                          {f.amount !== null ? (
                            <span className="font-semibold">&#8377;{f.amount.toLocaleString()}</span>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] rounded-full">Fee not configured</Badge>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-slate-200 mt-1">
                        <span>Total</span>
                        <span>&#8377;{totalFee(c.authFees).toLocaleString()}</span>
                      </div>
                    </div>
                    {c.paymentProof ? (
                      <div className="mt-3 p-4 rounded-2xl bg-[#eaf6e6]">
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Payment Proof
                        </p>
                        <a
                          href={`${SERVER_BASE}${c.paymentProof.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#256c1d] flex items-center gap-1 hover:underline"
                        >
                          View Receipt <ExternalLink className="w-3 h-3" />
                        </a>
                        {c.paymentProof.remarks && (
                          <p className="text-xs text-muted-foreground mt-1">{c.paymentProof.remarks}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Uploaded: {new Date(c.paymentProof.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-2 italic">No payment proof uploaded yet.</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Allowed when={mayApprove}><Button variant="outline" className="h-10 rounded-full px-5 text-red-600 border-red-200 bg-white hover:bg-red-50"
                      onClick={() => { setDialog({ center: c, action: 'reject' }); setRemarks(''); }}>
                      Reject
                    </Button></Allowed>
                    <Allowed when={mayApprove}><Button className="h-10 rounded-full px-5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => { setDialog({ center: c, action: 'approve' }); setRemarks(''); }}>
                      Approve
                    </Button></Allowed>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve / Reject dialog */}
      <Dialog open={!!dialog} onOpenChange={() => { setDialog(null); setRemarks(''); }}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {dialog?.action === 'approve' ? 'Approve & Activate' : 'Reject'} — {dialog?.center.name}
            </DialogTitle>
          </DialogHeader>
          {dialog?.action === 'approve' && (
            <p className="text-sm text-muted-foreground">
              Approving will activate the academic partner and generate login credentials.
            </p>
          )}
          <div className="space-y-3 py-2">
            <Label>Remarks {dialog?.action === 'reject' && <span className="text-destructive">*</span>}</Label>
            <Textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder={dialog?.action === 'reject' ? 'Reason for rejection (required)' : 'Optional remarks'}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => { setDialog(null); setRemarks(''); }}>Cancel</Button>
            <Button
              onClick={handleAction}
              disabled={submitting}
              className={cn('h-11 px-6 rounded-full font-semibold', dialog?.action === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14]')}
            >
              {submitting ? 'Processing...' : dialog?.action === 'approve' ? 'Approve & Activate' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials modal — shown once after approval */}
      <Dialog open={!!credentials} onOpenChange={() => setCredentials(null)}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Academic Partner Login Credentials
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Save these credentials — the password will not be shown again.
          </p>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Email / Username</Label>
              <div className="flex gap-2">
                <Input readOnly value={credentials?.email || ''} />
                <Button size="icon" variant="outline" className="h-11 w-11 rounded-full shrink-0" onClick={() => { navigator.clipboard.writeText(credentials?.email || ''); toast.success('Email copied'); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <div className="flex gap-2">
                <Input readOnly value={credentials?.password || ''} />
                <Button size="icon" variant="outline" className="h-11 w-11 rounded-full shrink-0" onClick={() => { navigator.clipboard.writeText(credentials?.password || ''); toast.success('Password copied'); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="h-11 px-7 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
