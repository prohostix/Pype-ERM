import { useState, useEffect } from 'react';
import { DollarSign, Play, Send, RefreshCw, Edit, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';
import { mayOn } from '@/lib/access';
import { useAuth } from '@/hooks/useAuth';

import { CS } from '@/lib/currency';
interface Payroll {
  id: string;
  employeeId: any;
  month: string;
  basicSalary: number;
  grossSalary: number;
  netSalary: number;
  status: string;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
  bonus: number;
  overtime: number;
  remarks?: string;
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  processed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  transferred_to_finance: 'bg-purple-100 text-purple-700',
  paid: 'bg-emerald-100 text-emerald-700',
};

export function PayrollPanel() {
  const { user } = useAuth();
  const mayCreate = mayOn(user, 'payroll', 'create', true);
  const mayEdit = mayOn(user, 'payroll', 'edit', true);
  const mayApprove = mayOn(user, 'payroll', 'approve', true);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Generate
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generateMode, setGenerateMode] = useState<'smart' | 'basic'>('smart');

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editPayroll, setEditPayroll] = useState<Payroll | null>(null);
  const [editForm, setEditForm] = useState<any>({
    basicSalary: 0,
    allowances: { hra: 0, transport: 0, medical: 0, other: 0 },
    deductions: { pf: 0, tax: 0, insurance: 0, other: 0 },
    bonus: 0,
    overtime: 0,
    remarks: '',
  });
  const [editSaving, setEditSaving] = useState(false);

  // Transfer
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [transferRemarks, setTransferRemarks] = useState('');

  useEffect(() => { fetchPayrolls(); }, []);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payroll', { params: { team: 1 } });
      setPayrolls(res.data.data || []);
    } catch { toast.error('Failed to fetch payrolls'); }
    finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    try {
      const endpoint = generateMode === 'smart' ? '/hr/payroll/generate-smart' : '/payroll/generate';
      const res = await api.post(endpoint, { month: generateMonth });
      const count = res.data.data?.length || 0;
      toast.success(`Generated ${count} payroll records`);
      if (res.data.errors?.length) toast.error(`${res.data.errors.length} errors — check console`);
      setGenerateOpen(false);
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate');
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await api.put(`/payroll/${id}/confirm`);
      toast.success('Payroll confirmed');
      fetchPayrolls();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openEdit = (p: Payroll) => {
    setEditPayroll(p);
    setEditForm({
      basicSalary: p.basicSalary,
      allowances: { hra: 0, transport: 0, medical: 0, other: 0, ...p.allowances },
      deductions: { pf: 0, tax: 0, insurance: 0, other: 0, ...p.deductions },
      bonus: p.bonus || 0,
      overtime: p.overtime || 0,
      remarks: p.remarks || '',
    });
    setEditOpen(true);
  };

  const calcGross = (f: any) =>
    (f.basicSalary || 0) +
    Object.values((f.allowances || {}) as Record<string, number>).reduce((s, v) => s + (v || 0), 0) +
    (f.bonus || 0) + (f.overtime || 0);

  const calcNet = (f: any) =>
    calcGross(f) - Object.values((f.deductions || {}) as Record<string, number>).reduce((s, v) => s + (v || 0), 0);

  const handleEditSave = async () => {
    if (!editPayroll) return;
    setEditSaving(true);
    try {
      await api.put(`/payroll/${editPayroll.id}`, editForm);
      toast.success('Payroll updated');
      setEditOpen(false);
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setEditSaving(false); }
  };

  const handleTransfer = async () => {
    if (!selectedIds.length) { toast.error('Select at least one confirmed payroll'); return; }
    try {
      const month = payrolls.find(p => selectedIds.includes(p.id))?.month;
      await api.post('/payroll/transfer-to-finance', { payrollIds: selectedIds, month, remarks: transferRemarks });
      toast.success(`Transferred ${selectedIds.length} payrolls to Finance`);
      setTransferOpen(false);
      setSelectedIds([]);
      setTransferRemarks('');
      fetchPayrolls();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Transfer failed'); }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const filtered = activeTab === 'all' ? payrolls : payrolls.filter(p => p.status === activeTab);
  const confirmedPayrolls = payrolls.filter(p => p.status === 'confirmed');

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Payroll Management</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Generate, edit, confirm and submit payroll to Finance</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchPayrolls} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          {mayApprove && confirmedPayrolls.length > 0 && (
            <Button variant="outline" onClick={() => setTransferOpen(true)} className="h-11 px-5 rounded-full bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6]">
              <Send className="w-4 h-4 mr-1" /> Submit to Finance ({confirmedPayrolls.length})
            </Button>
          )}
          {mayCreate && (
            <Button onClick={() => setGenerateOpen(true)} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
              <Play className="w-4 h-4 mr-1" /> Generate Payroll
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1.5 bg-white p-2 rounded-3xl border border-slate-100 w-fit max-w-full">
          <TabsTrigger value="all" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">All ({payrolls.length})</TabsTrigger>
          <TabsTrigger value="draft" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Draft</TabsTrigger>
          <TabsTrigger value="confirmed" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Confirmed</TabsTrigger>
          <TabsTrigger value="transferred_to_finance" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Submitted</TabsTrigger>
          <TabsTrigger value="paid" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Paid</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-6 gap-5">
            <CardHeader className="px-6"><CardTitle className="text-lg font-semibold tracking-tight">Payroll Records</CardTitle></CardHeader>
            <CardContent className="px-6">
              {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><DollarSign className="w-6 h-6" /></div>
                  <p className="font-medium text-slate-900">No payroll records</p>
                  <p className="text-sm">Generate payroll to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(p => {
                    const empName = (p as any).user?.name || p.employeeId?.name || p.employeeId?.userId?.name || 'Employee';
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <div key={p.id} className={`rounded-3xl p-5 sm:p-6 space-y-5 transition-colors ${isSelected ? 'bg-[#eaf6e6] ring-1 ring-[#8ae47e]' : 'bg-[#f4f6f3]'}`}>
                        {/* Top: employee + status + actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {mayApprove && p.status === 'confirmed' && (
                              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)} className="w-4 h-4 shrink-0 accent-[#54b947]" />
                            )}
                            <div className="w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center font-semibold shrink-0">
                              {(empName || '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate uppercase tracking-wide text-sm">{empName}</p>
                              <div className="flex items-center gap-2 flex-wrap mt-1">
                                <Badge variant="outline" className="text-xs rounded-full bg-white border-0 text-slate-600">{p.month}</Badge>
                                <Badge className={`text-xs rounded-full border-0 capitalize ${STATUS_COLOR[p.status] || 'bg-gray-100'}`}>
                                  {p.status.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {mayEdit && (p.status === 'draft' || p.status === 'processed') && (
                              <Button size="sm" variant="outline" className="h-10 w-10 p-0 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]" onClick={() => openEdit(p)} title="Edit">
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {mayApprove && (p.status === 'draft' || p.status === 'processed') && (
                              <Button size="sm" className="h-10 rounded-full px-5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => handleConfirm(p.id)}>
                                Confirm
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Salary summary */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-xs font-medium text-slate-500">Basic</p>
                            <p className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 mt-0.5">{CS()}{p.basicSalary?.toLocaleString()}</p>
                          </div>
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-xs font-medium text-slate-500">Gross</p>
                            <p className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 mt-0.5">{CS()}{p.grossSalary?.toLocaleString()}</p>
                          </div>
                          <div className="rounded-2xl bg-[#8ae47e] p-4">
                            <p className="text-xs font-medium text-[#0b1d14]/70">Net pay</p>
                            <p className="text-lg sm:text-xl font-semibold tracking-tight text-[#0b1d14] mt-0.5">{CS()}{p.netSalary?.toLocaleString()}</p>
                          </div>
                        </div>
                        {p.remarks && <p className="text-xs text-orange-600">{p.remarks}</p>}

                        {/* Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-sm font-semibold text-[#256c1d] mb-2">Earnings</p>
                            <div className="divide-y divide-slate-100 text-sm">
                              {Object.entries(p.allowances || {}).map(([key, val]) => (
                                <div key={key} className="flex justify-between py-2">
                                  <span className="capitalize text-slate-600">{key}</span>
                                  <span className="font-medium text-slate-900 tabular-nums">{CS()}{Number(val).toLocaleString()}</span>
                                </div>
                              ))}
                              {p.bonus > 0 && (
                                <div className="flex justify-between py-2">
                                  <span className="text-slate-600">Bonus</span>
                                  <span className="font-medium text-slate-900 tabular-nums">{CS()}{p.bonus.toLocaleString()}</span>
                                </div>
                              )}
                              {p.overtime > 0 && (
                                <div className="flex justify-between py-2">
                                  <span className="text-slate-600">Overtime</span>
                                  <span className="font-medium text-slate-900 tabular-nums">{CS()}{p.overtime.toLocaleString()}</span>
                                </div>
                              )}
                              {Object.keys(p.allowances || {}).length === 0 && !(p.bonus > 0) && !(p.overtime > 0) && (
                                <p className="py-2 text-slate-400">None</p>
                              )}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-sm font-semibold text-red-600 mb-2">Deductions</p>
                            <div className="divide-y divide-slate-100 text-sm">
                              {Object.entries(p.deductions || {}).map(([key, val]) => (
                                <div key={key} className="flex justify-between py-2">
                                  <span className="capitalize text-slate-600">
                                    {key === 'wfh' ? 'WFH Penalty' :
                                     key === 'lateDeduction' ? 'Late Deduction' :
                                     key === 'earlyExitDeduction' ? 'Early Exit Deduction' :
                                     key === 'leaveDeduction' ? 'Leave / LOP' :
                                     key === 'absentDeduction' ? 'Absent Days' :
                                     key.replace(/([A-Z])/g, ' $1')}
                                  </span>
                                  <span className="font-medium text-slate-900 tabular-nums">{CS()}{Number(val).toLocaleString()}</span>
                                </div>
                              ))}
                              {Object.keys(p.deductions || {}).length === 0 && <p className="py-2 text-slate-400">None</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader><DialogTitle className="text-xl font-semibold tracking-tight">Generate Monthly Payroll</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Month</Label>
              <Input type="month" value={generateMonth} onChange={e => setGenerateMonth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Generation Mode</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setGenerateMode('smart')}
                  className={`p-4 rounded-2xl border text-left text-sm transition-colors ${generateMode === 'smart' ? 'border-[#8ae47e] bg-[#eaf6e6]' : 'border-transparent bg-[#f4f6f3] hover:bg-[#eef5ec]'}`}
                >
                  <p className="font-semibold">Smart Generate</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Uses salary configs + auto late deductions from attendance</p>
                </button>
                <button
                  type="button"
                  onClick={() => setGenerateMode('basic')}
                  className={`p-4 rounded-2xl border text-left text-sm transition-colors ${generateMode === 'basic' ? 'border-[#8ae47e] bg-[#eaf6e6]' : 'border-transparent bg-[#f4f6f3] hover:bg-[#eef5ec]'}`}
                >
                  <p className="font-semibold">Basic Generate</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Uses Employee model salary with default allowances</p>
                </button>
              </div>
            </div>
            {generateMode === 'smart' && (
              <p className="text-xs text-muted-foreground p-3 bg-[#f4f6f3] rounded-2xl">
                Smart mode reads each employee's salary config, calculates late deductions from attendance records, and generates accurate payroll automatically.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleGenerate}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payroll Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="wizard-form max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Edit Payroll — {(editPayroll as any)?.user?.name || editPayroll?.employeeId?.name || 'Employee'} ({editPayroll?.month})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-1">
              <Label>Basic Salary ({CS()})</Label>
              <Input type="number" min="0" value={editForm.basicSalary}
                onChange={e => setEditForm((f: any) => ({ ...f, basicSalary: Number(e.target.value) }))} />
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Allowances</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['hra', 'transport', 'medical', 'other'] as const).map(key => (
                  <div key={key} className="space-y-1">
                    <Label className="capitalize">{key} ({CS()})</Label>
                    <Input type="number" min="0" value={editForm.allowances?.[key] || 0}
                      onChange={e => setEditForm((f: any) => ({ ...f, allowances: { ...f.allowances, [key]: Number(e.target.value) } }))} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Deductions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['pf', 'tax', 'insurance', 'other'] as const).map(key => (
                  <div key={key} className="space-y-1">
                    <Label className="capitalize">{key} ({CS()})</Label>
                    <Input type="number" min="0" value={editForm.deductions?.[key] || 0}
                      onChange={e => setEditForm((f: any) => ({ ...f, deductions: { ...f.deductions, [key]: Number(e.target.value) } }))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Bonus ({CS()})</Label>
                <Input type="number" min="0" value={editForm.bonus || 0}
                  onChange={e => setEditForm((f: any) => ({ ...f, bonus: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Overtime ({CS()})</Label>
                <Input type="number" min="0" value={editForm.overtime || 0}
                  onChange={e => setEditForm((f: any) => ({ ...f, overtime: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Remarks</Label>
              <Textarea value={editForm.remarks || ''} rows={2}
                onChange={e => setEditForm((f: any) => ({ ...f, remarks: e.target.value }))} />
            </div>
            {/* Live preview */}
            <div className="p-4 rounded-2xl bg-[#f4f6f3] grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Gross</p>
                <p className="font-bold text-blue-600">{CS()}{calcGross(editForm).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deductions</p>
                <p className="font-bold text-red-500">
                  {CS()}{Object.values(((editForm.deductions || {}) as Record<string, number>)).reduce((s, v) => s + (v || 0), 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net</p>
                <p className="font-bold text-green-600">{CS()}{calcNet(editForm).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setEditOpen(false)}><X className="w-4 h-4 mr-1" />Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleEditSave} disabled={editSaving}>
              <Save className="w-4 h-4 mr-1" />{editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer to Finance Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader><DialogTitle className="text-xl font-semibold tracking-tight">Submit Payroll to Finance</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Check the boxes next to confirmed payrolls, then submit them to Finance for approval and salary disbursement.
            </p>
            <div className="space-y-1">
              <Label>Remarks (optional)</Label>
              <Input value={transferRemarks} onChange={e => setTransferRemarks(e.target.value)} placeholder="e.g., March 2026 payroll batch" />
            </div>
            <p className="text-sm font-medium">{selectedIds.length} payroll(s) selected</p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleTransfer} disabled={!selectedIds.length}>
              <Send className="w-4 h-4 mr-1" /> Submit to Finance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
