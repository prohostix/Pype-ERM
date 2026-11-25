import { useState, useEffect } from 'react';
import { RefreshCw, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

import { CS } from '@/lib/currency';
interface TopUp {
  id: string;
  studyCenterId: { name?: string } | string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  status: string;
  createdAt: string;
  remarks?: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

export function WalletTopUpsPanel() {
  const [topUps, setTopUps] = useState<TopUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [remarks, setRemarks] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/wallet-topups');
      setTopUps(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/finance/wallet-topups/${id}/approve`);
      toast.success('Top-up approved');
      fetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    try {
      await api.put(`/finance/wallet-topups/${rejectDialog.id}/reject`, { remarks });
      toast.success('Top-up rejected');
      setRejectDialog({ open: false, id: '' });
      setRemarks('');
      fetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to reject');
    }
  };

  const getCenterName = (t: TopUp) =>
    (t.studyCenterId && typeof t.studyCenterId === 'object') ? t.studyCenterId.name || 'Unknown' : t.studyCenterId;

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Wallet Top-Up Requests</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Approve or reject academic partner wallet top-up requests.</p>
        </div>
        <Button variant="outline" onClick={fetch} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />)}</div>
      ) : topUps.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-100 py-16 text-center text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Wallet className="w-6 h-6" /></div>
          <p className="text-sm">No top-up requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topUps.map(t => (
            <div key={t.id} className="rounded-3xl bg-white border border-slate-100 hover:border-[#8ae47e] transition-colors">
              <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn('text-[10px] uppercase font-bold rounded-full px-2.5 border-0', STATUS_COLOR[t.status] || 'bg-slate-100 text-slate-600')}>
                      {t.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs rounded-full bg-[#f4f6f3] border-0">{t.paymentMethod}</Badge>
                  </div>
                  <h4 className="font-semibold text-lg text-slate-900">{getCenterName(t)}</h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                    <span>Amount: <strong className="text-foreground">{CS()}{t.amount.toLocaleString()}</strong></span>
                    {t.referenceNumber && <span>Ref: {t.referenceNumber}</span>}
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {t.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button className="h-10 rounded-full px-5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => handleApprove(t.id)}>
                      Approve
                    </Button>
                    <Button variant="outline" className="h-10 rounded-full px-5 text-red-600 border-red-200 bg-white hover:bg-red-50" onClick={() => { setRejectDialog({ open: true, id: t.id }); setRemarks(''); }}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={rejectDialog.open} onOpenChange={o => setRejectDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader><DialogTitle className="text-xl font-semibold tracking-tight">Reject Top-Up</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Remarks (required)</Label>
            <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Reason for rejection..." />
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setRejectDialog({ open: false, id: '' })}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold" onClick={handleReject} disabled={!remarks.trim()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
