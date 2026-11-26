import { useState, useEffect } from 'react';
import { DollarSign, Edit, Save, RefreshCw, Plus, Trash2, Clock, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { mayOn } from '@/lib/access';
import { useAuth } from '@/hooks/useAuth';

import { CS } from '@/lib/currency';
import { ListPagination } from '@/components/ui/list-pagination';
import { confirmDialog } from '@/lib/confirm';
interface SalaryConfig {
  id?: string;
  userId: any;
  user?: User;
  basicSalary: number;
  allowances: { hra: number; transport: number; medical: number; other: number };
  deductions: { pf: number; tax: number; insurance: number; other: number };
  lateDeductionPerMinute: number;
  earlyExitDeductionPerMinute?: number;
  effectiveFrom?: string;
  approvalStatus?: 'pending_approval' | 'approved' | 'rejected';
  rejectedRemarks?: string;
  unpaidLeaveRule?: { type: string; dailyRate?: number; firstXDays?: number; firstXRate?: number; subsequentRate?: number };
  wfhDeductionPerDay?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  designation?: string;
  role: string;
  departmentId?: any;
}

const EMPTY_CONFIG = {
  basicSalary: 0,
  allowances: { hra: 0, transport: 0, medical: 0, other: 0 },
  deductions: { pf: 0, tax: 0, insurance: 0, other: 0 },
  lateDeductionPerMinute: 0,
  earlyExitDeductionPerMinute: 0,
  unpaidLeaveRule: { type: 'standard' },
  wfhDeductionPerDay: 0,
  effectiveFrom: new Date().toISOString().split('T')[0],
};

export function SalaryConfigPanel() {
  const { user: me } = useAuth();
  const mayEdit = mayOn(me, 'salary_config', 'edit', true);
  const mayDelete = mayOn(me, 'salary_config', 'delete', true);
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string>('');
  const [form, setForm] = useState<any>(EMPTY_CONFIG);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, usersRes] = await Promise.all([
        api.get('/hr/salary-configs'),
        api.get('/users')
      ]);
      setConfigs(cfgRes.data.data || []);
      const allUsers: User[] = (usersRes.data.data || []).filter((u: any) => u.status !== 'resigned');
      setUsers(allUsers.filter(u => !['ceo', 'org_admin', 'superadmin'].includes(u.role)));
    } catch {
      toast.error('Failed to load salary data');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (config?: SalaryConfig, userId?: string) => {
    if (config) {
      setEditingUserId(config.userId);
      setForm({
        basicSalary: config.basicSalary,
        allowances: { ...config.allowances },
        deductions: { ...config.deductions },
        lateDeductionPerMinute: config.lateDeductionPerMinute || 0,
        earlyExitDeductionPerMinute: config.earlyExitDeductionPerMinute || 0,
        unpaidLeaveRule: config.unpaidLeaveRule || { type: 'standard' },
        wfhDeductionPerDay: config.wfhDeductionPerDay || 0,
        effectiveFrom: config.effectiveFrom ? config.effectiveFrom.split('T')[0] : new Date().toISOString().split('T')[0],
      });
    } else {
      setEditingUserId(userId || '');
      setForm({ ...EMPTY_CONFIG });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingUserId) { toast.error('Select an employee'); return; }
    setSaving(true);
    try {
      await api.put(`/hr/salary-configs/${editingUserId}`, form);
      toast.success('Salary config saved');
      setDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!(await confirmDialog({ title: 'Remove salary config?', message: 'Remove salary config for this employee?', confirmText: 'Remove', tone: 'danger' }))) return;
    try {
      await api.delete(`/hr/salary-configs/${userId}`);
      toast.success('Salary config removed');
      fetchAll();
    } catch {
      toast.error('Failed to remove');
    }
  };

  const configuredUserIds = new Set(configs.map(c =>
    c.userId
  ));
  const unconfiguredUsers = users.filter(u => !configuredUserIds.has(u.id));

  const filtered = configs.filter(c => {
    const name = c.user?.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const pagedConfigs = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const gross = (f: any) =>
    (f.basicSalary || 0) + Object.values(f.allowances as Record<string, number>).reduce((s, v) => s + (v || 0), 0);
  const net = (f: any) =>
    gross(f) - Object.values(f.deductions as Record<string, number>).reduce((s, v) => s + (v || 0), 0);

  return (
    <div className="space-y-6 wizard-form fee-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Salary Configuration</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Set base salary, allowances, deductions and late deduction rate per employee</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          {mayEdit && (
            <Button onClick={() => openEdit()} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
              <Plus className="w-4 h-4 mr-2" /> Add Config
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search employee..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-11 h-12 rounded-full bg-[#f4f6f3] border-transparent" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-3xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-100 py-16 text-center text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><DollarSign className="w-6 h-6" /></div>
          <p className="text-sm">No salary configs yet</p>
          <p className="text-xs mt-1">Click "Add Config" to set up an employee's salary</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pagedConfigs.map(config => {
            const user = config.user || null;
            const uid = user?.id || config.userId;
            const grossAmt = config.basicSalary + Object.values(config.allowances).reduce((s, v) => s + (v || 0), 0);
            const netAmt = grossAmt - Object.values(config.deductions).reduce((s, v) => s + (v || 0), 0);
            return (
              <div key={uid} className="rounded-3xl bg-white border border-slate-100 hover:border-[#8ae47e] transition-colors">
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-lg text-slate-900">{user?.name || 'Employee'}</span>
                        <Badge variant="outline" className="text-xs capitalize rounded-full bg-[#f4f6f3] border-0">{user?.role?.replace(/_/g, ' ')}</Badge>
                        {user?.designation && <Badge variant="outline" className="text-xs rounded-full bg-[#f4f6f3] border-0">{user.designation}</Badge>}
                        {config.approvalStatus === 'pending_approval' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
                            <Clock className="w-3 h-3" />Pending Finance Approval
                          </span>
                        )}
                        {config.approvalStatus === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#dff3da] text-[#256c1d]">
                            <CheckCircle className="w-3 h-3" />Approved
                          </span>
                        )}
                        {config.approvalStatus === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">
                            <AlertCircle className="w-3 h-3" />Rejected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{user?.email}</p>
                      {config.approvalStatus === 'rejected' && config.rejectedRemarks && (
                        <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />{config.rejectedRemarks}
                        </p>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                        <div className="rounded-2xl bg-[#f4f6f3] p-3.5">
                          <p className="text-xs font-medium text-slate-500">Basic</p>
                          <p className="font-semibold">{CS()}{config.basicSalary.toLocaleString()}</p>
                        </div>
                        <div className="rounded-2xl bg-[#f4f6f3] p-3.5">
                          <p className="text-xs font-medium text-slate-500">Gross</p>
                          <p className="font-semibold text-slate-900">{CS()}{grossAmt.toLocaleString()}</p>
                        </div>
                        <div className="rounded-2xl bg-[#f4f6f3] p-3.5">
                          <p className="text-xs font-medium text-slate-500">Net</p>
                          <p className="font-semibold text-[#256c1d]">{CS()}{netAmt.toLocaleString()}</p>
                        </div>
                        <div className="rounded-2xl bg-[#f4f6f3] p-3.5">
                          <p className="text-xs font-medium text-slate-500">Late/min</p>
                          <p className="font-semibold text-slate-900">{CS()}{config.lateDeductionPerMinute || 0}</p>
                        </div>
                        <div className="rounded-2xl bg-[#f4f6f3] p-3.5">
                          <p className="text-xs font-medium text-slate-500">Early/min</p>
                          <p className="font-semibold text-slate-900">{CS()}{config.earlyExitDeductionPerMinute ?? config.lateDeductionPerMinute ?? 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {mayEdit && (
                        <Button size="sm" variant="outline" className="h-10 w-10 p-0 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]" onClick={() => openEdit(config)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {mayDelete && (
                        <Button size="sm" variant="ghost" className="h-10 w-10 p-0 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(uid)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <ListPagination total={filtered.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="wizard-form fee-form max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Salary Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Employee selector (only when creating new) */}
            {!configs.find(c => c.userId === editingUserId) && (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={editingUserId} onValueChange={setEditingUserId}>
                  <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                  <SelectContent>
                    {unconfiguredUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} — {(u.role || '').replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label>Basic Salary ({CS()})</Label>
                <Input type="number" min="0" value={form.basicSalary}
                  onChange={e => setForm((f: any) => ({ ...f, basicSalary: Number(e.target.value) }))} />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Allowances</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['hra', 'transport', 'medical', 'other'] as const).map(key => (
                  <div key={key} className="space-y-1">
                    <Label className="capitalize">{key} ({CS()})</Label>
                    <Input type="number" min="0" value={form.allowances[key]}
                      onChange={e => setForm((f: any) => ({ ...f, allowances: { ...f.allowances, [key]: Number(e.target.value) } }))} />
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
                    <Input type="number" min="0" value={form.deductions[key]}
                      onChange={e => setForm((f: any) => ({ ...f, deductions: { ...f.deductions, [key]: Number(e.target.value) } }))} />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Late Deduction ({CS()}/min)</Label>
                <Input type="number" min="0" step="0.01" value={form.lateDeductionPerMinute}
                  onChange={e => setForm((f: any) => ({ ...f, lateDeductionPerMinute: Number(e.target.value) }))} />
                <p className="text-xs text-muted-foreground">Amount per late minute</p>
              </div>

              <div className="space-y-1">
                <Label>Early Exit Deduction ({CS()}/min)</Label>
                <Input type="number" min="0" step="0.01" value={form.earlyExitDeductionPerMinute ?? ''}
                  placeholder={form.lateDeductionPerMinute ? `Default: ${CS()}${form.lateDeductionPerMinute}` : '0'}
                  onChange={e => setForm((f: any) => ({ ...f, earlyExitDeductionPerMinute: Number(e.target.value) }))} />
                <p className="text-xs text-muted-foreground">Amount per early exit minute</p>
              </div>

              <div className="space-y-1">
                <Label>WFH Deduction (%/day)</Label>
                <Input type="number" min="0" max="100" value={form.wfhDeductionPerDay}
                  onChange={e => setForm((f: any) => ({ ...f, wfhDeductionPerDay: Number(e.target.value) }))} />
                <p className="text-xs text-muted-foreground">% of daily salary per WFH day</p>
              </div>
            </div>

            <div className="space-y-3 p-4 bg-[#f4f6f3] rounded-2xl">
              <Label className="font-semibold text-base">Unpaid Leave Deduction Rule</Label>
              <Select 
                value={form.unpaidLeaveRule?.type || 'standard'} 
                onValueChange={(val) => setForm((f: any) => ({ ...f, unpaidLeaveRule: { ...f.unpaidLeaveRule, type: val } }))}
              >
                <SelectTrigger><SelectValue placeholder="Select rule type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard: (Gross Salary / 30) per day</SelectItem>
                  <SelectItem value="fixed">Fixed: Custom amount per day</SelectItem>
                  <SelectItem value="progressive">Progressive: First X days vs subsequent days</SelectItem>
                </SelectContent>
              </Select>

              {form.unpaidLeaveRule?.type === 'fixed' && (
                <div className="space-y-1 mt-2">
                  <Label>Daily Deduction Amount ({CS()})</Label>
                  <Input type="number" min="0" value={form.unpaidLeaveRule?.dailyRate || ''}
                    onChange={e => setForm((f: any) => ({ ...f, unpaidLeaveRule: { ...f.unpaidLeaveRule, dailyRate: Number(e.target.value) } }))} />
                </div>
              )}

              {form.unpaidLeaveRule?.type === 'progressive' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  <div className="space-y-1">
                    <Label>First X Days</Label>
                    <Input type="number" min="0" value={form.unpaidLeaveRule?.firstXDays || ''}
                      onChange={e => setForm((f: any) => ({ ...f, unpaidLeaveRule: { ...f.unpaidLeaveRule, firstXDays: Number(e.target.value) } }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>First X Rate ({CS()})</Label>
                    <Input type="number" min="0" value={form.unpaidLeaveRule?.firstXRate || ''}
                      onChange={e => setForm((f: any) => ({ ...f, unpaidLeaveRule: { ...f.unpaidLeaveRule, firstXRate: Number(e.target.value) } }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Subsequent Rate ({CS()})</Label>
                    <Input type="number" min="0" value={form.unpaidLeaveRule?.subsequentRate || ''}
                      onChange={e => setForm((f: any) => ({ ...f, unpaidLeaveRule: { ...f.unpaidLeaveRule, subsequentRate: Number(e.target.value) } }))} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Effective From</Label>
              <Input type="date" value={form.effectiveFrom}
                onChange={e => setForm((f: any) => ({ ...f, effectiveFrom: e.target.value }))} />
            </div>

            {/* Live preview */}
            <div className="p-4 rounded-2xl bg-[#eaf6e6] grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Gross</p>
                <p className="font-semibold text-slate-900">{CS()}{gross(form).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deductions</p>
                <p className="font-semibold text-red-600">
                  {CS()}{Object.values(form.deductions as Record<string, number>).reduce((s, v) => s + (v || 0), 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net</p>
                <p className="font-semibold text-[#256c1d]">{CS()}{net(form).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Saving...' : 'Save Config'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
