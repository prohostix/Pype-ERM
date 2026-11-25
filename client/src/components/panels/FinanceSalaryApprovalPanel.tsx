import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

import { CS } from '@/lib/currency';
interface SalaryConfig {
  id: string;
  user: { id: string; name: string; email: string; designation?: string; role: string; departmentId?: { name: string } };
  basicSalary: number;
  allowances: { hra: number; transport: number; medical: number; other: number };
  deductions: { pf: number; tax: number; insurance: number; other: number };
  lateDeductionPerMinute: number;
  effectiveFrom: string;
  approvalStatus: 'pending_approval' | 'approved' | 'rejected';
  approvedBy?: { name: string; email: string };
  approvedAt?: string;
  rejectedRemarks?: string;
  createdBy?: { name: string };
  updatedAt: string;
}

interface Summary { pending_approval: number; approved: number; rejected: number }

const STATUS_META = {
  pending_approval: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> },
  approved:         { label: 'Approved', color: 'bg-[#dff3da] text-[#256c1d]', icon: <CheckCircle className="w-3 h-3" /> },
  rejected:         { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
};

const TABS = [
  { key: '', label: 'All' },
  { key: 'pending_approval', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export function FinanceSalaryApprovalPanel() {
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending_approval');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [remarks, setRemarks] = useState('');
  const [detailConfig, setDetailConfig] = useState<SalaryConfig | null>(null);

  const fetchData = async (status = statusFilter) => {
    setLoading(true);
    try {
      const params = status ? `?status=${status}` : '';
      const res = await api.get(`/finance/salary-configs${params}`);
      setConfigs(res.data.data || []);
      setSummary(res.data.summary || null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load salary configs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleTabChange = (key: string) => {
    setStatusFilter(key);
    fetchData(key);
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/finance/salary-configs/${id}/approve`, { action: 'approve' });
      toast.success('Salary config approved');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    try {
      await api.put(`/finance/salary-configs/${rejectDialog.id}/approve`, { action: 'reject', remarks });
      toast.success('Salary config rejected');
      setRejectDialog({ open: false, id: '' });
      setRemarks('');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to reject');
    }
  };

  const gross = (c: SalaryConfig) =>
    c.basicSalary + Object.values(c.allowances).reduce((s, v) => s + (v || 0), 0);
  const net = (c: SalaryConfig) =>
    gross(c) - Object.values(c.deductions).reduce((s, v) => s + (v || 0), 0);

  return (
    <div className="space-y-6 wizard-form">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Salary Config Approvals</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Review and approve salary configurations set by HR.</p>
        </div>
        <Button variant="outline" onClick={() => fetchData()} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { key: 'pending_approval', label: 'Pending', count: summary.pending_approval, icon: Clock, box: 'bg-amber-50 text-amber-600' },
            { key: 'approved', label: 'Approved', count: summary.approved, icon: CheckCircle, box: 'bg-[#eaf6e6] text-[#256c1d]' },
            { key: 'rejected', label: 'Rejected', count: summary.rejected, icon: XCircle, box: 'bg-red-50 text-red-500' },
          ].map(({ key, label, count, icon: Icon, box }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTabChange(key)}
              className={cn('text-left rounded-3xl border p-5 flex items-center justify-between gap-3 transition-all hover:-translate-y-0.5', statusFilter === key ? 'bg-[#eaf6e6] border-[#8ae47e]' : 'bg-white border-slate-100 hover:border-[#cfe9c9]')}
            >
              <div>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-1">{count}</p>
              </div>
              <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', box)}><Icon className="w-5 h-5" /></div>
            </button>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-semibold transition-colors border',
              statusFilter === tab.key
                ? 'bg-[#8ae47e] border-[#8ae47e] text-[#0b1d14]'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-[#eaf6e6] hover:border-[#cfe9c9]'
            )}
          >
            {tab.label}
            {summary && tab.key && (
              <span className="ml-1.5 opacity-70">{summary[tab.key as keyof Summary] ?? 0}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-3xl animate-pulse" />)}</div>
      ) : configs.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-100 py-16 text-center text-muted-foreground">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><DollarSign className="w-6 h-6" /></div>
            <p className="text-sm">No salary configs{statusFilter ? ` with status "${statusFilter.replace('_', ' ')}"` : ''}.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map(config => {
            const meta = STATUS_META[config.approvalStatus];
            const grossAmt = gross(config);
            const netAmt = net(config);
            return (
              <div key={config.id} className="rounded-3xl bg-white border border-slate-100 hover:border-[#8ae47e] transition-colors">
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      {/* Status + name */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold', meta.color)}>
                          {meta.icon}{meta.label}
                        </span>
                        <span className="font-semibold text-lg text-slate-900">{config.user?.name}</span>
                        <Badge variant="outline" className="text-xs capitalize rounded-full bg-[#f4f6f3] border-0">{config.user?.role?.replace(/_/g, ' ')}</Badge>
                        {config.user?.designation && <Badge variant="outline" className="text-xs rounded-full bg-[#f4f6f3] border-0">{config.user.designation}</Badge>}
                        {config.user?.departmentId && <span className="text-xs text-muted-foreground">{config.user.departmentId.name}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{config.user?.email}</p>

                      {/* Salary breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm rounded-2xl bg-[#f4f6f3] p-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Basic</p>
                          <p className="font-semibold">{CS()}{config.basicSalary.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">HRA</p>
                          <p className="font-semibold">{CS()}{(config.allowances.hra || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Gross</p>
                          <p className="font-semibold text-slate-900">{CS()}{grossAmt.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Deductions</p>
                          <p className="font-semibold text-red-600">
                            {CS()}{Object.values(config.deductions).reduce((s, v) => s + (v || 0), 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Net</p>
                          <p className="font-semibold text-[#256c1d]">{CS()}{netAmt.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        {config.createdBy && <span>Set by: {config.createdBy.name}</span>}
                        <span>Updated: {new Date(config.updatedAt).toLocaleDateString()}</span>
                        {config.approvedBy && <span>Reviewed by: {config.approvedBy.name}</span>}
                        {config.rejectedRemarks && (
                          <span className="text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />{config.rejectedRemarks}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      <Button variant="ghost" className="h-10 rounded-full px-4 text-[#256c1d] hover:bg-[#eaf6e6] font-semibold" onClick={() => setDetailConfig(config)}>
                        Details
                      </Button>
                      {config.approvalStatus === 'pending_approval' && (
                        <>
                          <Button className="h-10 rounded-full px-5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => handleApprove(config.id)}>
                            Approve
                          </Button>
                          <Button variant="outline" className="h-10 rounded-full px-5 text-red-600 border-red-200 bg-white hover:bg-red-50" onClick={() => { setRejectDialog({ open: true, id: config.id }); setRemarks(''); }}>
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={o => setRejectDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader><DialogTitle className="text-xl font-semibold tracking-tight">Reject Salary Config</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Reason for rejection (required)</Label>
            <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Basic salary exceeds approved band..." />
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setRejectDialog({ open: false, id: '' })}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold" onClick={handleReject} disabled={!remarks.trim()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailConfig} onOpenChange={o => !o && setDetailConfig(null)}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader><DialogTitle className="text-xl font-semibold tracking-tight">Salary Config — {detailConfig?.userId?.name}</DialogTitle></DialogHeader>
          {detailConfig && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Basic Salary</p><p className="font-semibold">{CS()}{detailConfig.basicSalary.toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Late/min</p><p className="font-semibold">{CS()}{detailConfig.lateDeductionPerMinute}</p></div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Allowances</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(detailConfig.allowances).map(([k, v]) => (
                    <div key={k} className="flex justify-between p-3 rounded-2xl bg-[#f4f6f3]">
                      <span className="capitalize text-muted-foreground">{k}</span>
                      <span className="font-medium">{CS()}{(v || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Deductions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(detailConfig.deductions).map(([k, v]) => (
                    <div key={k} className="flex justify-between p-3 rounded-2xl bg-[#f4f6f3]">
                      <span className="capitalize text-muted-foreground">{k}</span>
                      <span className="font-medium text-red-600">{CS()}{(v || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-[#eaf6e6] font-semibold">
                <div><p className="text-xs text-muted-foreground">Gross</p><p className="text-slate-900">{CS()}{gross(detailConfig).toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Deductions</p><p className="text-red-600">{CS()}{Object.values(detailConfig.deductions).reduce((s, v) => s + (v || 0), 0).toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Net</p><p className="text-[#256c1d]">{CS()}{net(detailConfig).toLocaleString()}</p></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setDetailConfig(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
