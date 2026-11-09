import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, FileText, Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Mode = 'view' | 'verify' | 'reject';

// statusHistory may be an array or (from older writes) an object of entries.
const historyList = (raw: any): any[] =>
  Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);

const lastRejection = (e: any) =>
  [...historyList(e.statusHistory)].reverse().find((h: any) => h?.status === 'provisional_finance_rejected');

const formatINR = (n: number | null | undefined) =>
  n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`;

export function ProvisionalFinancePanel() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [active, setActive] = useState<any | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/enrollments/provisional');
      setEnrollments(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load provisional enrollments');
    } finally {
      setLoading(false);
    }
  };

  const open = (e: any, m: Mode) => {
    setActive(e);
    setMode(m);
    setAmount(e.initialPaymentAmount != null ? String(e.initialPaymentAmount) : '');
    setRemarks('');
  };

  const close = () => {
    if (submitting) return;
    setActive(null);
  };

  const handleVerify = async () => {
    if (!active) return;
    const value = Number(amount);
    if (!(value > 0)) {
      toast.error('Enter the verified amount (must be greater than 0)');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/finance/enrollments/${active.id}/provisional-verify`, { amount: value });
      toast.success('Provisional receipt verified and invoice generated.');
      setActive(null);
      fetchEnrollments();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Verification failed');
      if (e.response?.status === 409 || e.response?.status === 404) fetchEnrollments();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!active) return;
    if (!remarks.trim()) {
      toast.error('Please enter a reason for rejection');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/finance/enrollments/${active.id}/provisional-reject`, { remarks: remarks.trim() });
      toast.success('Receipt rejected. Sales has been asked to re-upload it.');
      setActive(null);
      fetchEnrollments();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Rejection failed');
      if (e.response?.status === 409 || e.response?.status === 404) fetchEnrollments();
    } finally {
      setSubmitting(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? enrollments.filter((e) =>
        [e.studentName, e.studentEmail, e.studentPhone, e.program?.name, e.salesUser?.name]
          .some((v) => (v || '').toLowerCase().includes(q)))
    : enrollments;

  const receiptUrl = active ? (active.receiptUrl || active.provisionalReceiptUrl) : null;
  const isPdf = !!receiptUrl && /\.pdf(\?|$)/i.test(receiptUrl);
  const activeRejection = active ? lastRejection(active) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Provisional Verifications</h2>
          <p className="text-muted-foreground text-sm mt-1">Verify or reject payment receipts from provisional enrollments.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEnrollments} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Pending Receipts ({enrollments.length})</CardTitle>
            <CardDescription>Review the receipt, then verify it or send it back to Sales</CardDescription>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search student, program, sales…"
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {enrollments.length === 0 ? 'No pending provisional enrollments.' : 'No matches for your search.'}
            </p>
          ) : (
            <div className="space-y-4">
              {filtered.map((e) => {
                const prev = lastRejection(e);
                const hasReceipt = !!(e.receiptUrl || e.provisionalReceiptUrl);
                return (
                  <div key={e.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/30 rounded-xl border">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-sm">{e.studentName}</p>
                        {prev && (
                          <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-700">
                            Re-submitted
                          </Badge>
                        )}
                        {!hasReceipt && (
                          <Badge variant="outline" className="text-[10px] border-red-300 bg-red-50 text-red-700">
                            No receipt
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{e.studentEmail} • {e.studentPhone}</p>
                      <p className="text-xs font-medium bg-primary/10 text-primary w-fit px-2 py-0.5 rounded-full">{e.program?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Claimed <span className="font-semibold text-foreground">{formatINR(e.initialPaymentAmount)}</span>
                        {e.salesUser?.name ? ` • by ${e.salesUser.name}` : ''}
                        {e.createdAt ? ` • ${format(new Date(e.createdAt), 'dd MMM yyyy')}` : ''}
                      </p>
                      {prev?.remarks && (
                        <p className="text-xs text-amber-700">Previously rejected: {prev.remarks}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => open(e, 'view')}>
                        <FileText className="w-4 h-4 mr-2" />
                        View Receipt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => open(e, 'reject')}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={!hasReceipt}
                        title={hasReceipt ? undefined : 'No receipt uploaded — reject it so Sales can upload one'}
                        onClick={() => open(e, 'verify')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className={mode === 'view' ? 'max-w-3xl h-[85vh] flex flex-col' : 'max-w-md'}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'verify' ? 'Verify Receipt' : mode === 'reject' ? 'Reject Receipt' : `Receipt for ${active?.studentName || ''}`}
            </DialogTitle>
          </DialogHeader>

          {active && mode === 'view' && (
            <>
              <div className="text-xs text-muted-foreground">
                Claimed {formatINR(active.initialPaymentAmount)}
                {active.initialPaymentDate ? ` • paid ${format(new Date(active.initialPaymentDate), 'dd MMM yyyy')}` : ''}
                {active.salesUser?.name ? ` • submitted by ${active.salesUser.name}` : ''}
              </div>
              <div className="flex-1 min-h-0 bg-muted rounded-md overflow-hidden relative flex items-center justify-center">
                {receiptUrl ? (
                  isPdf ? (
                    <iframe src={api.getFileUrl(receiptUrl)} className="w-full h-full" />
                  ) : (
                    <img src={api.getFileUrl(receiptUrl)} alt="Receipt" className="max-w-full max-h-full object-contain" />
                  )
                ) : (
                  <p className="text-muted-foreground">No receipt uploaded.</p>
                )}
              </div>
              {receiptUrl && (
                <a href={api.getFileUrl(receiptUrl)} target="_blank" rel="noreferrer" className="text-xs text-primary underline w-fit">
                  Open in new tab
                </a>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setMode('reject')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={!receiptUrl}
                  onClick={() => setMode('verify')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify
                </Button>
              </DialogFooter>
            </>
          )}

          {active && mode === 'verify' && (
            <>
              <div className="space-y-4 py-2">
                <div className="text-sm">
                  <p className="font-medium">{active.studentName}</p>
                  <p className="text-muted-foreground">{active.program?.name}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Verified Amount (₹)</Label>
                  <Input type="number" min="1" value={amount} onChange={(ev) => setAmount(ev.target.value)} autoFocus />
                  <p className="text-xs text-muted-foreground">
                    Sales claimed {formatINR(active.initialPaymentAmount)}. A paid invoice is created for the amount you enter.
                  </p>
                  {active.initialPaymentAmount != null && amount !== '' && Number(amount) !== Number(active.initialPaymentAmount) && (
                    <p className="text-xs text-amber-600">This differs from the amount Sales entered.</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMode('view')} disabled={submitting}>Back to receipt</Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={submitting || !(Number(amount) > 0)}
                  onClick={handleVerify}
                >
                  {submitting ? 'Verifying…' : 'Confirm & Verify'}
                </Button>
              </DialogFooter>
            </>
          )}

          {active && mode === 'reject' && (
            <>
              <div className="space-y-4 py-2">
                <div className="text-sm">
                  <p className="font-medium">{active.studentName}</p>
                  <p className="text-muted-foreground">{active.program?.name} • claimed {formatINR(active.initialPaymentAmount)}</p>
                </div>
                {activeRejection?.remarks && (
                  <p className="text-xs text-amber-700">Previously rejected: {activeRejection.remarks}</p>
                )}
                <div className="space-y-1.5">
                  <Label>Reason for rejection</Label>
                  <Textarea
                    rows={3}
                    placeholder="e.g. Receipt is unreadable / amount does not match / transaction not found"
                    value={remarks}
                    onChange={(ev) => setRemarks(ev.target.value)}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">Sales sees this reason and is asked to re-upload the receipt.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMode('view')} disabled={submitting}>Back to receipt</Button>
                <Button variant="destructive" disabled={submitting || !remarks.trim()} onClick={handleReject}>
                  {submitting ? 'Rejecting…' : 'Reject Receipt'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
