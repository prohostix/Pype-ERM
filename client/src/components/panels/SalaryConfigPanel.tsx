import { useState, useEffect } from 'react';
import { DollarSign, Edit, Save, RefreshCw, Plus, Trash2, Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface SalaryCycle {
  type: 'monthly_day' | 'custom_range';
  startDay: number;
  endDay: number;
  cycleMode: 'previous_to_current' | 'same_month';
  customStartDate?: string;
  customEndDate?: string;
}

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
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string>('');
  const [form, setForm] = useState<any>(EMPTY_CONFIG);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [salaryCycle, setSalaryCycle] = useState<SalaryCycle>({
    type: 'monthly_day',
    startDay: 26,
    endDay: 25,
    cycleMode: 'previous_to_current',
    customStartDate: '',
    customEndDate: '',
  });
  const [cycleSaving, setCycleSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, usersRes, cycleRes] = await Promise.all([
        api.get('/hr/salary-configs'),
        api.get('/users'),
        api.get('/hr/salary-cycle').catch(() => ({ data: { data: null } }))
      ]);
      setConfigs(cfgRes.data.data || []);
      const allUsers: User[] = (usersRes.data.data || []).filter((u: any) => u.status !== 'resigned');
      setUsers(allUsers.filter(u => !['ceo', 'org_admin', 'superadmin'].includes(u.role)));
      if (cycleRes?.data?.data) {
        setSalaryCycle(cycleRes.data.data);
      }
    } catch {
      toast.error('Failed to load salary data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCycle = async () => {
    setCycleSaving(true);
    try {
      await api.put('/hr/salary-cycle', salaryCycle);
      toast.success('Salary calculation date range updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update salary cycle');
    } finally {
      setCycleSaving(false);
    }
  };

  const getCyclePreview = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (salaryCycle.type === 'custom_range') {
      if (salaryCycle.customStartDate && salaryCycle.customEndDate) {
        try {
          const [sy, sm, sd] = salaryCycle.customStartDate.split('-').map(Number);
          const [ey, em, ed] = salaryCycle.customEndDate.split('-').map(Number);
          const sDate = new Date(sy, sm - 1, sd);
          const eDate = new Date(ey, em - 1, ed);
          return `${format(sDate, 'dd MMM yyyy')} — ${format(eDate, 'dd MMM yyyy')}`;
        } catch {
          return `${salaryCycle.customStartDate} to ${salaryCycle.customEndDate}`;
        }
      }
      return 'Dates not set';
    }

    const startDay = Number(salaryCycle.startDay) || 1;
    const endDay = Number(salaryCycle.endDay) || 30;

    if (salaryCycle.cycleMode === 'previous_to_current' || startDay > endDay) {
      const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
      const currMonthLastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const safeStartDay = Math.min(startDay, prevMonthLastDay);
      const safeEndDay = Math.min(endDay, currMonthLastDay);

      const prevMonthDate = new Date(currentYear, currentMonth - 1, safeStartDay);
      const currMonthDate = new Date(currentYear, currentMonth, safeEndDay);
      return `${format(prevMonthDate, 'dd MMM yyyy')} — ${format(currMonthDate, 'dd MMM yyyy')}`;
    } else {
      const currMonthLastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const safeStartDay = Math.min(startDay, currMonthLastDay);
      const safeEndDay = Math.min(endDay, currMonthLastDay);

      const startDate = new Date(currentYear, currentMonth, safeStartDay);
      const endDate = new Date(currentYear, currentMonth, safeEndDay);
      return `${format(startDate, 'dd MMM yyyy')} — ${format(endDate, 'dd MMM yyyy')}`;
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
    if (!confirm('Remove salary config for this employee?')) return;
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

  const gross = (f: any) =>
    (f.basicSalary || 0) + Object.values(f.allowances as Record<string, number>).reduce((s, v) => s + (v || 0), 0);
  const net = (f: any) =>
    gross(f) - Object.values(f.deductions as Record<string, number>).reduce((s, v) => s + (v || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Salary Configuration</h2>
          <p className="text-muted-foreground text-sm mt-1">Set base salary, allowances, deductions and late deduction rate per employee</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => openEdit()}>
            <Plus className="w-4 h-4 mr-1" /> Add Config
          </Button>
        </div>
      </div>

      {/* Salary Cycle / Calculation Date Range */}
      <Card className="border border-border/80 shadow-sm bg-card rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold leading-tight">Salary Calculation Period (Date From – To)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set the organization-wide pay cycle dates used to calculate attendance, late deductions, and payroll.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <Button 
                size="sm" 
                onClick={handleSaveCycle} 
                disabled={cycleSaving}
                className="shadow-sm"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {cycleSaving ? 'Saving...' : 'Save Salary Dates'}
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          {/* Cycle Type Selector & Presets */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">Format:</Label>
              <div className="inline-flex rounded-lg bg-muted p-1 border border-border/50">
                <button
                  type="button"
                  onClick={() => setSalaryCycle(prev => ({ ...prev, type: 'monthly_day' }))}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                    salaryCycle.type === 'monthly_day'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Monthly Day Cycle
                </button>
                <button
                  type="button"
                  onClick={() => setSalaryCycle(prev => ({ ...prev, type: 'custom_range' }))}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                    salaryCycle.type === 'custom_range'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Custom Date Range
                </button>
              </div>
            </div>

            {salaryCycle.type === 'monthly_day' && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">Quick Presets:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5 py-0"
                  onClick={() => setSalaryCycle(prev => ({ ...prev, startDay: 26, endDay: 25, cycleMode: 'previous_to_current' }))}
                >
                  26th — 25th (Standard)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5 py-0"
                  onClick={() => setSalaryCycle(prev => ({ ...prev, startDay: 1, endDay: 30, cycleMode: 'same_month' }))}
                >
                  1st — End of Month
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5 py-0"
                  onClick={() => setSalaryCycle(prev => ({ ...prev, startDay: 21, endDay: 20, cycleMode: 'previous_to_current' }))}
                >
                  21st — 20th
                </Button>
              </div>
            )}
          </div>

          {/* Form Controls */}
          {salaryCycle.type === 'monthly_day' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Salary Date From <span className="text-muted-foreground font-normal">(Start Day)</span>
                </Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    min={1} 
                    max={31} 
                    value={salaryCycle.startDay || ''}
                    onChange={e => {
                      const val = e.target.value === '' ? 1 : Math.min(31, Math.max(1, Number(e.target.value)));
                      setSalaryCycle(prev => ({ ...prev, startDay: val }));
                    }}
                    className="h-9 pr-12 font-medium"
                    placeholder="26"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    th/st
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Day of month (1 to 31)</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Salary Date To <span className="text-muted-foreground font-normal">(End Day)</span>
                </Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    min={1} 
                    max={31} 
                    value={salaryCycle.endDay || ''}
                    onChange={e => {
                      const val = e.target.value === '' ? 25 : Math.min(31, Math.max(1, Number(e.target.value)));
                      setSalaryCycle(prev => ({ ...prev, endDay: val }));
                    }}
                    className="h-9 pr-12 font-medium"
                    placeholder="25"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    th/st
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Day of month (1 to 31)</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Cycle Month Rule</Label>
                <Select 
                  value={salaryCycle.cycleMode} 
                  onValueChange={(val: any) => setSalaryCycle(prev => ({ ...prev, cycleMode: val }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select rule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="previous_to_current">
                      Prev Month to Current Month (e.g. 26th – 25th)
                    </SelectItem>
                    <SelectItem value="same_month">
                      Within Same Month (e.g. 1st – 30th/31st)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Determines calendar month boundary</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Salary Date From (Start Date)</Label>
                <Input 
                  type="date" 
                  value={salaryCycle.customStartDate || ''}
                  onChange={e => setSalaryCycle(prev => ({ ...prev, customStartDate: e.target.value }))}
                  className="h-9"
                />
                <p className="text-[11px] text-muted-foreground">First day of attendance & salary calculation</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Salary Date To (End Date)</Label>
                <Input 
                  type="date" 
                  value={salaryCycle.customEndDate || ''}
                  onChange={e => setSalaryCycle(prev => ({ ...prev, customEndDate: e.target.value }))}
                  className="h-9"
                />
                <p className="text-[11px] text-muted-foreground">Final day included in this salary cycle</p>
              </div>
            </div>
          )}

          {/* Active Preview Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15 text-xs text-primary">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Active Period for Current Month:</strong> {getCyclePreview()}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Attendance, late deductions, and leave deductions will strictly apply to these dates.
            </span>
          </div>
        </CardContent>
      </Card>

      <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No salary configs yet</p>
            <p className="text-xs mt-1">Click "Add Config" to set up an employee's salary</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(config => {
            const user = config.user || null;
            const uid = user?.id || config.userId;
            const grossAmt = config.basicSalary + Object.values(config.allowances).reduce((s, v) => s + (v || 0), 0);
            const netAmt = grossAmt - Object.values(config.deductions).reduce((s, v) => s + (v || 0), 0);
            return (
              <Card key={uid} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold">{user?.name || 'Employee'}</span>
                        <Badge variant="outline" className="text-xs capitalize">{user?.role?.replace(/_/g, ' ')}</Badge>
                        {user?.designation && <Badge variant="outline" className="text-xs">{user.designation}</Badge>}
                        {config.approvalStatus === 'pending_approval' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            <Clock className="w-3 h-3" />Pending Finance Approval
                          </span>
                        )}
                        {config.approvalStatus === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="w-3 h-3" />Approved
                          </span>
                        )}
                        {config.approvalStatus === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <AlertCircle className="w-3 h-3" />Rejected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{user?.email}</p>
                      {config.approvalStatus === 'rejected' && config.rejectedRemarks && (
                        <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />{config.rejectedRemarks}
                        </p>
                      )}                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Basic</p>
                          <p className="font-semibold">₹{config.basicSalary.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Gross</p>
                          <p className="font-semibold text-blue-600">₹{grossAmt.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Net</p>
                          <p className="font-semibold text-green-600">₹{netAmt.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Late/min</p>
                          <p className="font-semibold text-orange-600">₹{config.lateDeductionPerMinute || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Early/min</p>
                          <p className="font-semibold text-amber-600">₹{config.earlyExitDeductionPerMinute ?? config.lateDeductionPerMinute ?? 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openEdit(config)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(uid)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Salary Configuration</DialogTitle>
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
                <Label>Basic Salary (₹)</Label>
                <Input type="number" min="0" value={form.basicSalary}
                  onChange={e => setForm((f: any) => ({ ...f, basicSalary: Number(e.target.value) }))} />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Allowances</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['hra', 'transport', 'medical', 'other'] as const).map(key => (
                  <div key={key} className="space-y-1">
                    <Label className="capitalize">{key} (₹)</Label>
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
                    <Label className="capitalize">{key} (₹)</Label>
                    <Input type="number" min="0" value={form.deductions[key]}
                      onChange={e => setForm((f: any) => ({ ...f, deductions: { ...f.deductions, [key]: Number(e.target.value) } }))} />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Late Deduction (₹/min)</Label>
                <Input type="number" min="0" step="0.01" value={form.lateDeductionPerMinute}
                  onChange={e => setForm((f: any) => ({ ...f, lateDeductionPerMinute: Number(e.target.value) }))} />
                <p className="text-xs text-muted-foreground">Amount per late minute</p>
              </div>

              <div className="space-y-1">
                <Label>Early Exit Deduction (₹/min)</Label>
                <Input type="number" min="0" step="0.01" value={form.earlyExitDeductionPerMinute ?? ''}
                  placeholder={form.lateDeductionPerMinute ? `Default: ₹${form.lateDeductionPerMinute}` : '0'}
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

            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
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
                  <Label>Daily Deduction Amount (₹)</Label>
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
                    <Label>First X Rate (₹)</Label>
                    <Input type="number" min="0" value={form.unpaidLeaveRule?.firstXRate || ''}
                      onChange={e => setForm((f: any) => ({ ...f, unpaidLeaveRule: { ...f.unpaidLeaveRule, firstXRate: Number(e.target.value) } }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Subsequent Rate (₹)</Label>
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
            <div className="p-3 rounded-xl bg-muted/50 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Gross</p>
                <p className="font-bold text-blue-600">₹{gross(form).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deductions</p>
                <p className="font-bold text-red-500">
                  ₹{Object.values(form.deductions as Record<string, number>).reduce((s, v) => s + (v || 0), 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net</p>
                <p className="font-bold text-green-600">₹{net(form).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Saving...' : 'Save Config'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
