import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

import { CS, numLocale } from '@/lib/currency';
import { confirmDialog } from '@/lib/confirm';
interface TargetsPanelProps {
  endpoint: string; // '/finance/targets' or '/sales/targets'
  title?: string;
}

export function TargetsPanel({ endpoint, title = 'Target Management' }: TargetsPanelProps) {
  const { user } = useAuth();
  const canManage = (user?.role === 'sales_admin' || user?.role === 'sales_sub_admin') || user?.role === 'ceo' || user?.role === 'org_admin' || user?.role === 'superadmin';

  const [targets, setTargets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    departmentId: '',
    target: '',
    achieved: '0',
    period: 'monthly',
    type: 'revenue',
    incentive: ''
  });

  useEffect(() => {
    fetchTargets();
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchTargets = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoint);
      setTargets(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch targets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/users');
      setEmployees((res.data.data || []).filter((u: any) => u.status !== 'resigned'));
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      target: Number(formData.target),
      achieved: Number(formData.achieved),
      period: formData.period,
      type: formData.type
    };
    if (formData.incentive) payload.incentive = Number(formData.incentive);
    if (formData.employeeId && formData.employeeId !== 'none') payload.employeeId = formData.employeeId;
    if (formData.departmentId && formData.departmentId !== 'none') payload.departmentId = formData.departmentId;

    try {
      if (editingId) {
        await api.put(`${endpoint}/${editingId}`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchTargets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save target');
    }
  };

  const handleEdit = (t: any) => {
    const empId = typeof t.employeeId === 'object' ? (t.employeeId?.id || t.employeeId?.id) : t.employeeId;
    const deptId = typeof t.departmentId === 'object' ? (t.departmentId?.id || t.departmentId?.id) : t.departmentId;
    setEditingId(t.id || t.id);
    setFormData({
      employeeId: empId?.toString() || '',
      departmentId: deptId?.toString() || '',
      target: t.target?.toString() || '',
      achieved: t.achieved?.toString() || '0',
      period: t.period || 'monthly',
      type: t.type || 'revenue',
      incentive: t.incentive?.toString() || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete target?', message: 'Delete this target?', confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.delete(`${endpoint}/${id}`);
      fetchTargets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete target');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ employeeId: '', departmentId: '', target: '', achieved: '0', period: 'monthly', type: 'revenue', incentive: '' });
  };

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Set and track performance targets</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          {canManage && (
          <DialogTrigger asChild>
            <Button className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"><Plus className="w-4 h-4 mr-2" />Add Target</Button>
          </DialogTrigger>
          )}
          <DialogContent className="wizard-form max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">{editingId ? 'Edit Target' : 'Add New Target'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Employee (optional)</Label>
                  <Select value={formData.employeeId} onValueChange={(v) => setFormData({ ...formData, employeeId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {employees.filter(e => e && (e.id || e.id)).map((e) => (
                        <SelectItem key={e.id || e.id} value={(e.id || e.id).toString()}>
                          {e.name || e.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department (optional)</Label>
                  <Select value={formData.departmentId} onValueChange={(v) => setFormData({ ...formData, departmentId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.filter(d => d && (d.id || d.id)).map((d) => (
                        <SelectItem key={d.id || d.id} value={(d.id || d.id).toString()}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Target Amount</Label>
                  <Input type="number" min="0" value={formData.target} onChange={(e) => setFormData({ ...formData, target: e.target.value })} required />
                </div>
                <div>
                  <Label>Achieved Amount</Label>
                  <Input type="number" min="0" value={formData.achieved} onChange={(e) => setFormData({ ...formData, achieved: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Period</Label>
                  <Select value={formData.period} onValueChange={(v) => setFormData({ ...formData, period: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="students">Per Admission</SelectItem>
                      <SelectItem value="centers">Centers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Incentive Amount ({CS()}, optional)</Label>
                <Input type="number" min="0" value={formData.incentive} onChange={(e) => setFormData({ ...formData, incentive: e.target.value })} placeholder="e.g. 5000" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 h-11 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">Save</Button>
                <Button type="button" variant="outline" className="h-11 px-6 rounded-full" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
        <CardHeader className="px-7"><CardTitle className="text-lg font-semibold tracking-tight">Targets</CardTitle></CardHeader>
        <CardContent className="px-7">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : targets.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Target className="w-6 h-6" /></div>
              <p className="text-sm">No targets found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {targets.filter(t => t && (t.id || t.id)).map((t) => {
                const tid = t.id || t.id;
                const pct = t.target ? Math.min(100, ((t.achieved || 0) / t.target) * 100) : 0;
                const empName = typeof t.employeeId === 'object' ? t.employeeId?.name : '';
                const deptName = typeof t.departmentId === 'object' ? t.departmentId?.name : '';
                return (
                  <div key={tid} className="p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center shrink-0">
                          <Target className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{empName || deptName || 'General Target'}</div>
                          <div className="text-sm text-muted-foreground">{t.type} • {t.period}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canManage && (
                          <>
                            <Button variant="ghost" size="sm" className="rounded-full hover:bg-white" onClick={() => handleEdit(t)}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(tid)}><Trash2 className="w-4 h-4" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm items-center">
                        <span className="font-semibold text-slate-900">
                          {t.type === 'revenue' ? `${CS()}${(t.achieved || 0).toLocaleString(numLocale())}` : t.achieved || 0} / {t.type === 'revenue' ? `${CS()}${(t.target).toLocaleString(numLocale())}` : t.target}
                        </span>
                        <div className="text-right flex items-center gap-2">
                          {t.incentive > 0 && (
                            <span className="text-xs bg-[#dff3da] text-[#256c1d] px-2.5 py-0.5 rounded-full font-semibold">
                              Incentive: {CS()}{t.incentive.toLocaleString(numLocale())}
                            </span>
                          )}
                          <span className="font-bold text-foreground">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <Progress value={pct} />
                      <div className="text-xs text-muted-foreground pt-0.5">
                        {t.achieved >= t.target ? (
                          <span className="text-[#256c1d] font-semibold">✓ Target Completed!</span>
                        ) : (
                          <span>
                            {t.type === 'revenue' ? (
                              `${CS()}${Math.max(0, t.target - t.achieved).toLocaleString(numLocale())} left to complete`
                            ) : (
                              `${Math.max(0, t.target - t.achieved)} ${t.type} left to complete`
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
