import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { CS, numLocale } from '@/lib/currency';
import { ListPagination } from '@/components/ui/list-pagination';
type Mode = 'view' | 'verify' | 'reject';

// statusHistory may be an array or (from older writes) an object of entries.
const historyList = (raw: any): any[] =>
  Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);

const lastRejection = (e: any) =>
  [...historyList(e.statusHistory)].reverse().find((h: any) => h?.status === 'provisional_finance_rejected');

const formatINR = (n: number | null | undefined) =>
  n == null ? '—' : `${CS()}${Number(n).toLocaleString(numLocale())}`;

export function ProvisionalFinancePanel() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const pagedRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const receiptUrl = active ? (active.receiptUrl || active.provisionalReceiptUrl) : null;
  const isPdf = !!receiptUrl && /\.pdf(\?|$)/i.test(receiptUrl);
  const activeRejection = active ? lastRejection(active) : null;

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Provisional Verifications</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Verify or reject payment receipts from provisional enrollments.</p>
        </div>
        <Button variant="outline" onClick={fetchEnrollments} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search student, program, sales…"
            value={search}
            onChange={(ev) => { setSearch(ev.target.value); setPage(1); }}
            className="pl-11 h-12 rounded-full bg-[#f4f6f3] border-transparent"
          />
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Pending Receipts ({enrollments.length})</h3>
          <p className="text-sm text-muted-foreground">Review the receipt, then verify it or send it back to Sales</p>
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><FileText className="w-6 h-6" /></div>
              <p className="text-sm">{enrollments.length === 0 ? 'No pending provisional enrollments.' : 'No matches for your search.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagedRows.map((e) => {
                const prev = lastRejection(e);
                const hasReceipt = !!(e.receiptUrl || e.provisionalReceiptUrl);
                return (
                  <div key={e.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors rounded-2xl">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-base text-slate-900">{e.studentName}</p>
                        {prev && (
                          <Badge variant="outline" className="text-[10px] rounded-full border-0 bg-amber-100 text-amber-700">
                            Re-submitted
                          </Badge>
                        )}
                        {!hasReceipt && (
                          <Badge variant="outline" className="text-[10px] rounded-full border-0 bg-red-100 text-red-700">
                            No receipt
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{e.studentEmail} • {e.studentPhone}</p>
                      <p className="text-xs font-semibold bg-white text-[#256c1d] w-fit px-2.5 py-0.5 rounded-full">{e.program?.name}</p>
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
                      <Button variant="outline" className="h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold" onClick={() => open(e, 'view')}>
                        View Receipt
                      </Button>
                      <Button
                        variant="outline"
                        className="h-10 rounded-full px-5 border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => open(e, 'reject')}
                      >
                        Reject
                      </Button>
                      <Button
                        className="h-10 rounded-full px-5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"
                        disabled={!hasReceipt}
                        title={hasReceipt ? undefined : 'No receipt uploaded — reject it so Sales can upload one'}
                        onClick={() => open(e, 'verify')}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>
                );
              })}
              <ListPagination total={filtered.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className={`wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8 ${mode === 'view' ? 'max-w-3xl h-[85vh] flex flex-col' : 'max-w-md'}`} style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
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
              <div className="flex-1 min-h-0 bg-[#f4f6f3] rounded-2xl overflow-hidden relative flex items-center justify-center">
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
                <a href={api.getFileUrl(receiptUrl)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#256c1d] underline w-fit">
                  Open in new tab
                </a>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  className="h-11 rounded-full px-6 border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setMode('reject')}
                >
                  Reject
                </Button>
                <Button
                  className="h-11 rounded-full px-6 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"
                  disabled={!receiptUrl}
                  onClick={() => setMode('verify')}
                >
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
                  <Label>Verified Amount ({CS()})</Label>
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
                <Button variant="outline" className="h-11 rounded-full px-6" onClick={() => setMode('view')} disabled={submitting}>Back to receipt</Button>
                <Button
                  className="h-11 rounded-full px-6 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"
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
                <Button variant="outline" className="h-11 rounded-full px-6" onClick={() => setMode('view')} disabled={submitting}>Back to receipt</Button>
                <Button className="h-11 rounded-full px-6 bg-red-600 hover:bg-red-700 text-white font-semibold" disabled={submitting || !remarks.trim()} onClick={handleReject}>
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
