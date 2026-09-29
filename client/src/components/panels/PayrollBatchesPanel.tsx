import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, CreditCard, RefreshCw } from 'lucide-react';
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
      pending_finance_approval: 'bg-yellow-100 text-yellow-800',
      approved_by_finance: 'bg-blue-100 text-blue-800',
      payment_in_progress: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredBatches = activeTab === 'all'
    ? batches
    : batches.filter(b => b.status === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payroll Batches</h2>
          <p className="text-muted-foreground">Review and process payroll batches from HR</p>
        </div>
        <Button variant="outline" onClick={fetchBatches}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending_finance_approval">Pending Approval</TabsTrigger>
          <TabsTrigger value="approved_by_finance">Approved</TabsTrigger>
          <TabsTrigger value="payment_in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Payroll Batches</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : filteredBatches.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No payroll batches found</p>
                  <p className="text-sm">HR will transfer payroll batches here for approval</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBatches.map((batch) => {
                    const bid = batch.id || batch.id || '';
                    return (
                      <div key={bid} className="border rounded-lg hover:border-primary/30 transition-colors overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold">Month: {batch.month}</span>
                            <Badge className={getStatusColor(batch.status)}>
                              {batch.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground flex gap-4">
                            <span>{batch.employeeCount} employees</span>
                            <span className="font-medium text-foreground">
                              Total: ₹{batch.totalAmount?.toLocaleString()}
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
                        <div className="flex gap-2">
                          {isFinance && batch.status === 'pending_finance_approval' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600"
                                onClick={() => handleApprove(bid)}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedBatch(batch);
                                  setRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {isFinance && batch.status === 'approved_by_finance' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartPayment(bid)}
                            >
                              <CreditCard className="w-3 h-3 mr-1" />
                              Start Payment
                            </Button>
                          )}
                          {isFinance && batch.status === 'payment_in_progress' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedBatch(batch);
                                setPaymentDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complete Payment
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setExpandedBatch(expandedBatch === bid ? null : bid)}>
                            {expandedBatch === bid ? 'Hide Details' : 'View Details'}
                          </Button>
                        </div>
                      </div>
                      
                      {expandedBatch === bid && (batch as any).payrolls && (
                        <div className="p-4 bg-muted/20 border-t space-y-3">
                          <h4 className="font-semibold text-sm mb-2 border-b pb-2">Employee Breakdown</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                            {(batch as any).payrolls.map((p: any) => (
                              <div key={p.id} className="bg-background p-3 rounded-md border text-xs">
                                <div className="flex justify-between font-semibold mb-2">
                                  <span>{p.user?.name || 'Employee'} ({p.user?.employeeProfile?.employeeId || p.employeeId})</span>
                                  <span className="text-primary">Net: ₹{p.netSalary?.toLocaleString()}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-emerald-600 font-medium border-b mb-1 pb-0.5">Earnings</p>
                                    <div className="flex justify-between"><span>Basic:</span><span>₹{p.basicSalary?.toLocaleString()}</span></div>
                                    {Object.entries(p.allowances || {}).map(([k, v]) => (
                                      <div key={k} className="flex justify-between"><span className="capitalize">{k}:</span><span>₹{Number(v).toLocaleString()}</span></div>
                                    ))}
                                    {p.bonus > 0 && <div className="flex justify-between"><span>Bonus:</span><span>₹{p.bonus.toLocaleString()}</span></div>}
                                    {p.overtime > 0 && <div className="flex justify-between"><span>Overtime:</span><span>₹{p.overtime.toLocaleString()}</span></div>}
                                  </div>
                                  <div>
                                    <p className="text-rose-600 font-medium border-b mb-1 pb-0.5">Deductions</p>
                                    {Object.entries(p.deductions || {}).map(([k, v]) => (
                                      <div key={k} className="flex justify-between"><span className="capitalize">{k}:</span><span>₹{Number(v).toLocaleString()}</span></div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payroll Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason *</Label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this batch is being rejected"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject}>Reject Batch</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Batch Payment</DialogTitle>
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
                className="w-full border rounded-md px-3 py-2 text-sm"
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
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCompletePayment}>Mark as Paid</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
