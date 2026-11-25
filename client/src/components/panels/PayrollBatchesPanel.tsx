import { useState, useEffect } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

import { CS } from '@/lib/currency';
interface PayrollBatch {
  id?: string;
  month: string;
  totalAmount: number;
  employeeCount: number;
  status: string;
  transferer?: { name: string };
  approver?: { name: string };
  rejector?: { name: string };
  rejectionReason?: string;
  remarks?: string;
  createdAt: string;
}

export function PayrollBatchesPanel() {
  const { user } = useAuth();
  const isFinance = ['finance_admin', 'finance_sub_admin'].includes(user?.role || '');
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [paymentData, setPaymentData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    paymentReference: '',
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await api.get('/finance/payroll-batches');
      setBatches(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch payroll batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/finance/payroll-batches/${id}/approve`);
      toast.success('Payroll batch approved');
      fetchBatches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!selectedBatch || !rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    const id = selectedBatch.id || selectedBatch.id;
    try {
      await api.post(`/finance/payroll-batches/${id}/reject`, { rejectionReason });
      toast.success('Payroll batch rejected');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedBatch(null);
      fetchBatches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    }
  };

  const handleStartPayment = async (id: string) => {
    try {
      await api.put(`/finance/payroll-batches/${id}/payment-in-progress`);
      toast.success('Payment marked as in progress');
      fetchBatches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCompletePayment = async () => {
    if (!selectedBatch) return;
    const id = selectedBatch.id || selectedBatch.id;
    try {
      await api.put(`/finance/payroll-batches/${id}/complete-payment`, paymentData);
      toast.success('Payment completed — salaries disbursed');
      setPaymentDialogOpen(false);
      setSelectedBatch(null);
      fetchBatches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete payment');
    }
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending_finance_approval: 'bg-amber-100 text-amber-700',
      approved_by_finance: 'bg-sky-100 text-sky-700',
      payment_in_progress: 'bg-orange-100 text-orange-700',
      completed: 'bg-[#dff3da] text-[#256c1d]',
      rejected: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredBatches = activeTab === 'all'
    ? batches
    : batches.filter(b => b.status === activeTab);

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Payroll Batches</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Review and process payroll batches from HR</p>
        </div>
        <Button variant="outline" onClick={fetchBatches} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1.5 bg-white p-2 rounded-3xl border border-slate-100 w-fit max-w-full">
          <TabsTrigger value="all" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">All</TabsTrigger>
          <TabsTrigger value="pending_finance_approval" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Pending Approval</TabsTrigger>
          <TabsTrigger value="approved_by_finance" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Approved</TabsTrigger>
          <TabsTrigger value="payment_in_progress" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">In Progress</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Completed</TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card className="mt-4 rounded-3xl bg-white border border-slate-100 shadow-none py-6 gap-5">
            <CardHeader className="px-6">
              <CardTitle className="text-lg font-semibold tracking-tight">Payroll Batches</CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
              ) : filteredBatches.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><CreditCard className="w-6 h-6" /></div>
                  <p className="font-medium text-slate-900">No payroll batches found</p>
                  <p className="text-sm">HR will transfer payroll batches here for approval</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBatches.map((batch) => {
                    const bid = batch.id || batch.id || '';
                    return (
                      <div key={bid} className="rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors overflow-hidden">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold text-slate-900">Month: {batch.month}</span>
                            <Badge className={`rounded-full border-0 px-3 ${getStatusColor(batch.status)}`}>
                              {batch.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                            <span>{batch.employeeCount} employees</span>
                            <span className="font-medium text-foreground">
                              Total: {CS()}{batch.totalAmount?.toLocaleString()}
                            </span>
                            {batch.transferer && (
                              <span>Transferred by: {batch.transferer.name}</span>
                            )}
                          </div>
                          {batch.rejectionReason && (
                            <p className="text-xs text-red-600 mt-1">
                              Rejection: {batch.rejectionReason}
                            </p>
                          )}
                          {batch.remarks && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Remarks: {batch.remarks}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {isFinance && batch.status === 'pending_finance_approval' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 rounded-full px-4 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold border-0"
                                onClick={() => handleApprove(bid)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 rounded-full px-4 text-red-600 border-red-200 bg-white hover:bg-red-50"
                                onClick={() => {
                                  setSelectedBatch(batch);
                                  setRejectDialogOpen(true);
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {isFinance && batch.status === 'approved_by_finance' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 rounded-full px-4 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold"
                              onClick={() => handleStartPayment(bid)}
                            >
                              Start Payment
                            </Button>
                          )}
                          {isFinance && batch.status === 'payment_in_progress' && (
                            <Button
                              size="sm"
                              className="h-9 rounded-full px-4 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"
                              onClick={() => {
                                setSelectedBatch(batch);
                                setPaymentDialogOpen(true);
                              }}
                            >
                              Complete Payment
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-9 rounded-full px-4 text-[#256c1d] hover:bg-white font-semibold" onClick={() => setExpandedBatch(expandedBatch === bid ? null : bid)}>
                            {expandedBatch === bid ? 'Hide Details' : 'View Details'}
                          </Button>
                        </div>
                      </div>
                      
                      {expandedBatch === bid && (batch as any).payrolls && (
                        <div className="p-4 bg-white/60 border-t border-slate-200/60 space-y-3">
                          <h4 className="font-semibold text-sm mb-2 border-b border-slate-200 pb-2">Employee Breakdown</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                            {(batch as any).payrolls.map((p: any) => (
                              <div key={p.id} className="bg-white p-4 rounded-2xl text-xs">
                                <div className="flex justify-between font-semibold mb-2">
                                  <span>{p.user?.name || 'Employee'} ({p.user?.employeeProfile?.employeeId || p.employeeId})</span>
                                  <span className="text-[#256c1d]">Net: {CS()}{p.netSalary?.toLocaleString()}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-[#256c1d] font-medium border-b border-slate-100 mb-1 pb-0.5">Earnings</p>
                                    <div className="flex justify-between"><span>Basic:</span><span>{CS()}{p.basicSalary?.toLocaleString()}</span></div>
                                    {Object.entries(p.allowances || {}).map(([k, v]) => (
                                      <div key={k} className="flex justify-between"><span className="capitalize">{k}:</span><span>{CS()}{Number(v).toLocaleString()}</span></div>
                                    ))}
                                    {p.bonus > 0 && <div className="flex justify-between"><span>Bonus:</span><span>{CS()}{p.bonus.toLocaleString()}</span></div>}
                                    {p.overtime > 0 && <div className="flex justify-between"><span>Overtime:</span><span>{CS()}{p.overtime.toLocaleString()}</span></div>}
                                  </div>
                                  <div>
                                    <p className="text-red-600 font-medium border-b border-slate-100 mb-1 pb-0.5">Deductions</p>
                                    {Object.entries(p.deductions || {}).map(([k, v]) => (
                                      <div key={k} className="flex justify-between"><span className="capitalize">{k}:</span><span>{CS()}{Number(v).toLocaleString()}</span></div>
                                    ))}
                                    {Object.keys(p.deductions || {}).length === 0 && <div className="text-muted-foreground">None</div>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Reject Payroll Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Rejection Reason *</Label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this batch is being rejected"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button className="h-11 px-6 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold" onClick={handleReject}>Reject Batch</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Complete Batch Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <select
                className="w-full h-11 rounded-xl border border-transparent bg-[#f4f6f3] px-3 text-sm outline-none focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
                value={paymentData.paymentMethod}
                onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div>
              <Label>Payment Reference</Label>
              <Input
                value={paymentData.paymentReference}
                onChange={(e) => setPaymentData({ ...paymentData, paymentReference: e.target.value })}
                placeholder="Transaction ID / Reference number"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleCompletePayment}>Mark as Paid</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
