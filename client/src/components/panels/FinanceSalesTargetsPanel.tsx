import { useState, useEffect } from 'react';
import { Target, Plus, RefreshCw, Users, TrendingUp, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

import { CS } from '@/lib/currency';
interface SalesUser {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  status: string;
}

interface SalesTarget {
  id: string;
  employeeId: { id: string; name: string; email: string } | null;
  type: 'revenue' | 'students' | 'centers';
  period: string;
  target: number;
  achieved: number;
  incentive?: number;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  revenue: 'Revenue',
  students: 'Per Admission',
  centers: 'Centers',
};

const progressColor = (pct: number) => {
  if (pct >= 100) return 'bg-[#54b947]';
  if (pct >= 60) return 'bg-[#8ae47e]';
  if (pct >= 30) return 'bg-amber-400';
  return 'bg-red-400';
};

export function FinanceSalesTargetsPanel() {
  const [users, setUsers] = useState<SalesUser[]>([]);
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<SalesTarget | null>(null);
  const [form, setForm] = useState({
    employeeId: '',
    type: 'revenue' as 'revenue' | 'students' | 'centers',
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
    target: '',
    achieved: '',
    incentive: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, targetsRes] = await Promise.all([
        api.get('/finance/sales-users'),
        api.get('/finance/targets'),
      ]);
      setUsers((usersRes.data.data || []).filter((u: any) => u.status !== 'resigned'));
      // Filter out resigned when creating set
      const salesUserIds = new Set((usersRes.data.data || []).filter((u: any) => u.status !== 'resigned').map((u: SalesUser) => u.id));
      const allTargets: SalesTarget[] = (targetsRes.data.data || []).map((t: any) => ({
        ...t,
        employeeId: t.employee || t.employeeId
      }));
      setTargets(allTargets.filter(t => t.employeeId && (typeof t.employeeId === 'object' ? salesUserIds.has(t.employeeId.id) : salesUserIds.has(t.employeeId))));
    } catch (e: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ employeeId: '', type: 'revenue', period: new Date().toISOString().slice(0, 7), target: '', achieved: '', incentive: '' });
    setShowForm(true);
  };

  const openEdit = (t: SalesTarget) => {
    setEditTarget(t);
    setForm({
      employeeId: t.employeeId?.id || '',
      type: t.type,
      period: t.period,
      target: String(t.target),
      achieved: String(t.achieved),
      incentive: t.incentive != null ? String(t.incentive) : '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.employeeId || !form.target || !form.period) {
      toast.error('Employee, period and target value are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        employeeId: form.employeeId,
        type: form.type,
        period: form.period,
        target: Number(form.target),
        achieved: Number(form.achieved || 0),
        ...(form.incentive ? { incentive: Number(form.incentive) } : {}),
      };
      if (editTarget) {
        await api.put(`/finance/targets/${editTarget.id}`, payload);
        toast.success('Target updated');
      } else {
        await api.post('/finance/targets', payload);
        toast.success('Target assigned');
      }
      setShowForm(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save target');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this target?')) return;
    try {
      await api.delete(`/finance/targets/${id}`);
      toast.success('Target deleted');
      fetchAll();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const totalTargets = targets.length;
  const achieved100 = targets.filter(t => t.target > 0 && t.achieved >= t.target).length;
  const avgProgress = targets.length
    ? Math.round(targets.reduce((s, t) => s + (t.target > 0 ? Math.min(100, (t.achieved / t.target) * 100) : 0), 0) / targets.length)
    : 0;

  return (
    <div className="space-y-6 wizard-form fee-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Sales Targets</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Assign and track targets for the sales team</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={openCreate} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Assign Target
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Targets', value: String(totalTargets), icon: Target, box: 'bg-[#f4f6f3] text-slate-600' },
          { label: 'Achieved 100%', value: String(achieved100), icon: TrendingUp, box: 'bg-[#eaf6e6] text-[#256c1d]' },
          { label: 'Avg Progress', value: `${avgProgress}%`, icon: Users, box: 'bg-amber-50 text-amber-600' },
        ].map(({ label, value, icon: Icon, box }) => (
          <div key={label} className="rounded-3xl bg-white border border-slate-100 p-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-1">{value}</p>
            </div>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${box}`}><Icon className="w-5 h-5" /></div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="rounded-3xl bg-white border border-[#cfe9c9] shadow-none py-7 gap-5">
          <CardHeader className="px-7">
            <CardTitle className="text-lg font-semibold tracking-tight">{editTarget ? 'Edit Target' : 'Assign New Target'}</CardTitle>
          </CardHeader>
          <CardContent className="px-7">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Sales User</label>
                <select
                  className="w-full h-11 rounded-xl border border-transparent bg-[#f4f6f3] px-3 text-sm outline-none focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
                  value={form.employeeId}
                  onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                >
                  <option value="">Select user...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Type</label>
                <select
                  className="w-full h-11 rounded-xl border border-transparent bg-[#f4f6f3] px-3 text-sm outline-none focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                >
                  <option value="revenue">Revenue</option>
                  <option value="students">Per Admission</option>
                  <option value="centers">Centers</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Period (YYYY-MM)</label>
                <input
                  type="month"
                  className="w-full h-11 rounded-xl border border-transparent bg-[#f4f6f3] px-3 text-sm outline-none focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
                  value={form.period}
                  onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Target Value</label>
                <input
                  type="number"
                  min="0"
                  className="w-full h-11 rounded-xl border border-transparent bg-[#f4f6f3] px-3 text-sm outline-none focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
                  placeholder="e.g. 100000"
                  value={form.target}
                  onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Achieved (optional)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full h-11 rounded-xl border border-transparent bg-[#f4f6f3] px-3 text-sm outline-none focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
                  placeholder="0"
                  value={form.achieved}
                  onChange={e => setForm(f => ({ ...f, achieved: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Incentive (optional)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full h-11 rounded-xl border border-transparent bg-[#f4f6f3] px-3 text-sm outline-none focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
                  placeholder="e.g. 5000"
                  value={form.incentive}
                  onChange={e => setForm(f => ({ ...f, incentive: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} disabled={saving} className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
                {saving ? 'Saving...' : editTarget ? 'Update' : 'Assign'}
              </Button>
              <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Targets list */}
      <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
        <CardHeader className="px-7">
          <CardTitle className="text-lg font-semibold tracking-tight">Assigned Targets</CardTitle>
          <CardDescription>All targets assigned to sales team members</CardDescription>
        </CardHeader>
        <CardContent className="px-7">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : targets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Target className="w-6 h-6" /></div>
              <p className="font-medium text-slate-900">No targets assigned yet</p>
              <p className="text-sm mt-1">Click "Assign Target" to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {targets.map(t => {
                const pct = t.target > 0 ? Math.min(100, Math.round((t.achieved / t.target) * 100)) : 0;
                return (
                  <div key={t.id} className="flex items-center gap-4 p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-slate-900">{t.employeeId?.name || 'Unknown'}</span>
                        <Badge variant="outline" className="text-[10px] uppercase rounded-full bg-white border-slate-200">{TYPE_LABELS[t.type]}</Badge>
                        <Badge variant="outline" className="text-[10px] rounded-full bg-white border-slate-200">{t.period}</Badge>
                        {t.incentive ? <Badge variant="outline" className="text-[10px] rounded-full bg-[#dff3da] text-[#256c1d] border-0">{CS()}{t.incentive.toLocaleString()} incentive</Badge> : null}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-2.5 bg-white rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', progressColor(pct))} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold shrink-0 w-10 text-right">{pct}%</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {t.achieved.toLocaleString()} / {t.target.toLocaleString()} ({t.achieved >= t.target ? 'Completed' : `${(t.target - t.achieved).toLocaleString()} left`})
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-white" onClick={() => openEdit(t)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
