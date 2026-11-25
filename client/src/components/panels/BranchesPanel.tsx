import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, RefreshCw, Edit2, Trash2, UserPlus, MapPin, Building2, TrendingUp, Settings, Layers, Search, X } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Dept { id: string; name: string; type: string; }

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city?: string;
  state?: string;
  status: 'active' | 'inactive';
  branchManagerId?: { id: string; name: string; email: string; role: string; userId?: string; designation?: string };
  salesDeptId?: Dept;
  operationsDeptId?: Dept;
  additionalDeptIds?: Dept[];
}

interface OrgUser {
  id: string; name: string; email: string; role: string; userId?: string; designation?: string;
}

const DEPT_TYPE_COLORS: Record<string, string> = {
  sales: '#ca8a04', operations: '#ea580c', finance: '#16a34a',
  hr: '#db2777', ceo: '#2563eb', custom: '#6366f1',
};

export function BranchesPanel() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allUsers, setAllUsers] = useState<OrgUser[]>([]);
  const [allDepts, setAllDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create / Edit dialog
  const [branchDialog, setBranchDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState({
    name: '', code: '', address: '', city: '', state: '', branchManagerId: '',
  });

  // Assign manager dialog (includes dept selection)
  const [managerDialog, setManagerDialog] = useState(false);
  const [managerTarget, setManagerTarget] = useState<Branch | null>(null);
  const [managerUserId, setManagerUserId] = useState('');
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);

  // Manage departments dialog (for existing branch, no manager change)
  const [deptDialog, setDeptDialog] = useState(false);
  const [deptTarget, setDeptTarget] = useState<Branch | null>(null);
  const [deptSelection, setDeptSelection] = useState<string[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [branchRes, userRes, deptRes] = await Promise.all([
        api.get('/org/branches'),
        api.get('/users'),
        api.get('/departments'),
      ]);
      setBranches(branchRes.data.data || []);
      setAllUsers((userRes.data.data || []).filter((u: any) => u.status !== 'resigned'));
      setAllDepts(deptRes.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Depts available as "additional" — excludes auto-created branch depts AND finance/hr (those are org-wide)
  const RESTRICTED_TYPES = new Set(['finance', 'hr']);

  const getAvailableExtraDepts = (branch: Branch | null) => {
    const autoIds = new Set<string>();
    branches.forEach(b => {
      if (b.salesDeptId) autoIds.add(b.salesDeptId.id);
      if (b.operationsDeptId) autoIds.add(b.operationsDeptId.id);
    });
    if (branch?.salesDeptId) autoIds.add(branch.salesDeptId.id);
    if (branch?.operationsDeptId) autoIds.add(branch.operationsDeptId.id);
    return allDepts.filter(d => !autoIds.has(d.id) && !RESTRICTED_TYPES.has(d.type));
  };

  const toggleDept = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  // ── Create / Edit ──
  const openCreate = () => {
    setEditingBranch(null);
    setForm({ name: '', code: '', address: '', city: '', state: '', branchManagerId: '' });
    setBranchDialog(true);
  };

  const openEdit = (b: Branch) => {
    setEditingBranch(b);
    setForm({ name: b.name, code: b.code, address: b.address, city: b.city || '', state: b.state || '', branchManagerId: '' });
    setBranchDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code || !form.address) {
      toast.error('Name, branch code, and address are required'); return;
    }
    setSaving(true);
    try {
      if (editingBranch) {
        await api.patch(`/org/branches/${editingBranch.id}`, {
          name: form.name, address: form.address, city: form.city, state: form.state,
        });
      } else {
        await api.post('/org/branches', {
          name: form.name, code: form.code, address: form.address,
          city: form.city, state: form.state,
          branchManagerId: form.branchManagerId || undefined,
        });
      }
      toast.success(editingBranch ? 'Branch updated' : 'Branch created with Sales & Operations departments');
      setBranchDialog(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: Branch) => {
    if (!confirm(`Delete branch "${b.name}"? This will also remove its associated departments.`)) return;
    try {
      await api.delete(`/org/branches/${b.id}`);
      toast.success('Branch deleted');
      fetchAll();
    } catch (e: any) {
      if (e.isDeleteRequest) {
        return;
      }
      toast.error(e.response?.data?.message || 'Failed to delete branch');
    }
  };

  // ── Assign Manager ──
  const openAssignManager = (b: Branch) => {
    setManagerTarget(b);
    setManagerUserId(b.branchManagerId?.id || '');
    setSelectedDeptIds((b.additionalDeptIds || []).filter(Boolean).map(d => typeof d === 'string' ? d : (d as any).id));
    setManagerDialog(true);
  };

  const handleAssignManager = async () => {
    if (!managerTarget) return;
    setSaving(true);
    try {
      await api.patch(`/org/branches/${managerTarget.id}/manager`, {
        userId: managerUserId || null,
        additionalDeptIds: selectedDeptIds,
      });
      toast.success('Branch manager updated');
      setManagerDialog(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to assign manager');
    } finally {
      setSaving(false);
    }
  };

  // ── Manage Departments (no manager change) ──
  const openManageDepts = (b: Branch) => {
    setDeptTarget(b);
    setDeptSelection((b.additionalDeptIds || []).filter(Boolean).map(d => typeof d === 'string' ? d : (d as any).id));
    setDeptDialog(true);
  };

  const handleSaveDepts = async () => {
    if (!deptTarget) return;
    setSaving(true);
    try {
      await api.patch(`/org/branches/${deptTarget.id}/departments`, {
        additionalDeptIds: deptSelection,
      });
      toast.success('Branch departments updated');
      setDeptDialog(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update departments');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (b: Branch) => {
    try {
      await api.patch(`/org/branches/${b.id}`, { status: b.status === 'active' ? 'inactive' : 'active' });
      fetchAll();
    } catch { toast.error('Failed to update status'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading branches...</div>;
  }

  const q = search.trim().toLowerCase();
  const filteredBranches = branches.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (!q) return true;
    const mgr = ((b as any).branchManager?.name || (b.branchManagerId as any)?.name || '').toLowerCase();
    return [b.name, b.code, b.address, b.city, b.state].some(v => (v || '').toLowerCase().includes(q)) || mgr.includes(q);
  });
  const activeCount = branches.filter(b => b.status === 'active').length;
  const withoutManager = branches.filter(b => !b.branchManagerId).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Branches</h2>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-2xl">
            Manage organization branches and departments
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" onClick={fetchAll} className="h-11 px-5 rounded-full bg-white border-slate-200 text-sm font-medium gap-2 shadow-sm hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={() => setBranchDialog(true)} className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm">
            <Plus className="w-4 h-4" />
            New Branch
          </Button>
        </div>
      </div>

      {/* Summary */}
      {branches.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {[
            { label: 'Total branches', value: branches.length, icon: Building2 },
            { label: 'Active', value: activeCount, icon: TrendingUp },
            { label: 'Without a manager', value: withoutManager, icon: UserPlus },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-3xl bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.10)] p-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="text-3xl font-semibold tracking-tight mt-1">{value}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search & filters */}
      {branches.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by branch, code, location or manager..."
              className="pl-11 pr-9 h-11 rounded-full bg-white border-slate-200 shadow-sm text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {([
              { id: 'all', label: 'All', count: branches.length },
              { id: 'active', label: 'Active', count: activeCount },
              { id: 'inactive', label: 'Inactive', count: branches.length - activeCount },
            ] as const).map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${statusFilter === f.id ? 'bg-[#0b1d14] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Branch cards */}
      {branches.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-3xl p-16 text-center bg-white">
          <div className="w-14 h-14 rounded-full bg-[#f4f6f3] flex items-center justify-center mx-auto mb-3">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium mb-1">No branches yet</p>
          <p className="text-sm text-muted-foreground mb-6">Create your first branch to start organising departments.</p>
          <Button onClick={openCreate} className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"><Plus className="h-4 w-4 mr-2" /> Create First Branch</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 sm:gap-6 items-stretch">
          {filteredBranches.length === 0 && (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-muted-foreground">No branches match your search or filter.</div>
          )}
          {filteredBranches.map(b => (
            <div key={b.id}
              className={`rounded-3xl bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.10)] p-6 flex flex-col gap-5 hover:-translate-y-0.5 transition-all duration-300 ${b.status === 'inactive' ? 'opacity-70' : ''}`}>
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base text-foreground truncate" title={b.name}>{b.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[11px] font-mono bg-[#f1f3ef] text-slate-600 px-2.5 py-0.5 rounded-full">{b.code}</span>
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${b.status === 'active' ? 'bg-[#e3f7dd] text-[#1f6a17]' : 'bg-slate-100 text-slate-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'active' ? 'bg-[#54b947]' : 'bg-slate-400'}`} />
                        {b.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => openEdit(b)} title="Edit branch" className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-[#eaf6e6] text-[#256c1d] transition-colors">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(b)} title="Delete branch" className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-rose-50 text-rose-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground -mt-2">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{b.address}{b.city ? `, ${b.city}` : ''}{b.state ? `, ${b.state}` : ''}</span>
              </div>

              {/* Branch Manager */}
              <div className="rounded-2xl bg-[#f4f6f3] p-4 min-h-[112px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Branch manager</span>
                  <button onClick={() => openAssignManager(b)} className="text-xs font-semibold text-[#256c1d] hover:underline flex items-center gap-1">
                    <UserPlus className="h-3 w-3" />{b.branchManagerId ? 'Change' : 'Assign'}
                  </button>
                </div>
                {b.branchManagerId ? (
                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-10 h-10 rounded-full bg-[#0b1d14] flex items-center justify-center text-[#8ae47e] text-sm font-semibold shrink-0">
                      {((b.branchManager as any)?.name || (b.branchManagerId as any)?.name || 'Unknown').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{((b.branchManager as any)?.name || (b.branchManagerId as any)?.name || 'Unknown')}</p>
                      <p className="text-xs text-muted-foreground">{(b.branchManager as any)?.designation || (b.branchManagerId as any)?.designation || ((b.branchManager as any)?.role || (b.branchManagerId as any)?.role || '').replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-3 py-1.5 mt-3 inline-block">No manager assigned</p>
                )}
              </div>

              {/* Departments */}
              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Departments</p>
                  <button onClick={() => openManageDepts(b)} className="text-xs font-semibold text-[#256c1d] hover:underline flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Manage
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {b.salesDeptId && (
                    <div className="flex items-center gap-2.5 p-3 rounded-2xl"
                      style={{ background: DEPT_TYPE_COLORS.sales + '14' }}>
                      <TrendingUp className="h-4 w-4 shrink-0" style={{ color: DEPT_TYPE_COLORS.sales }} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold" style={{ color: DEPT_TYPE_COLORS.sales }}>Sales</p>
                        <p className="text-[11px] text-muted-foreground truncate">{(b as any).salesDept?.name || (b.salesDeptId as any)?.name}</p>
                      </div>
                    </div>
                  )}
                  {b.operationsDeptId && (
                    <div className="flex items-center gap-2.5 p-3 rounded-2xl"
                      style={{ background: DEPT_TYPE_COLORS.operations + '14' }}>
                      <Settings className="h-4 w-4 shrink-0" style={{ color: DEPT_TYPE_COLORS.operations }} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold" style={{ color: DEPT_TYPE_COLORS.operations }}>Operations</p>
                        <p className="text-[11px] text-muted-foreground truncate">{(b as any).operationsDept?.name || (b.operationsDeptId as any)?.name}</p>
                      </div>
                    </div>
                  )}
                </div>

                {(b.additionalDeptIds || []).filter(Boolean).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(b.additionalDeptIds || []).filter(Boolean).map(d => (
                      <span key={d.id} className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                        style={{
                          background: (DEPT_TYPE_COLORS[d.type] || '#6366f1') + '14',
                          color: DEPT_TYPE_COLORS[d.type] || '#6366f1',
                        }}>
                        {d.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => toggleStatus(b)}
                className="mt-auto w-full text-xs font-medium text-slate-600 hover:text-foreground bg-white border border-slate-200 hover:bg-[#f4f6f3] rounded-full py-2.5 transition-colors">
                {b.status === 'active' ? 'Deactivate branch' : 'Activate branch'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={branchDialog} onOpenChange={setBranchDialog}>
        <DialogContent className="w-[95vw] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col">
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
              {editingBranch ? <Edit2 className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            </div>
            <DialogHeader className="space-y-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground text-left">{editingBranch ? 'Edit Branch' : 'Create Branch'}</DialogTitle>
              <p className="text-sm text-muted-foreground">{editingBranch ? 'Update the branch name and location.' : 'Add a branch with its location and an optional manager.'}</p>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Branch name <span className="text-rose-500">*</span></Label>
              <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" placeholder="e.g. Delhi North Branch" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            {!editingBranch && (
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Branch code <span className="text-rose-500">*</span></Label>
                <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4 font-mono" placeholder="e.g. DEL-N" value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Location / address <span className="text-rose-500">*</span></Label>
              <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" placeholder="Street address or area" value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">City</Label>
                <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" placeholder="City" value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">State</Label>
                <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" placeholder="State" value={form.state}
                  onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
              </div>
            </div>
            {!editingBranch && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Branch manager <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Select value={form.branchManagerId || '__none__'}
                    onValueChange={v => setForm(p => ({ ...p, branchManagerId: v === '__none__' ? '' : v }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue placeholder="Assign later..." /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="__none__">Assign later</SelectItem>
                      {allUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} — {(u.role || '').replace(/_/g, ' ')} {u.userId ? `(${u.userId})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-[#eaf6e6] p-4 text-sm text-[#1f4f19]">
                  <Layers className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>Creating this branch will automatically generate a <strong>Sales</strong> and <strong>Operations</strong> department for it.</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
            <Button variant="ghost" onClick={() => setBranchDialog(false)} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.code || !form.address} className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
              {saving ? 'Saving...' : editingBranch ? 'Save Changes' : 'Create Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Manager Dialog ── */}
      <Dialog open={managerDialog} onOpenChange={setManagerDialog}>
        <DialogContent className="w-[95vw] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col">
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <DialogHeader className="space-y-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground text-left">Assign Branch Manager</DialogTitle>
              <p className="text-sm text-muted-foreground">{managerTarget?.name}</p>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-6">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Manager</Label>
              <Select value={managerUserId || '__none__'}
                onValueChange={v => setManagerUserId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue placeholder="Choose a person..." /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="__none__">Remove manager</SelectItem>
                  {allUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} — {(u.role || '').replace(/_/g, ' ')} {u.userId ? `(${u.userId})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">Additional department access</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Sales and Operations are always included. Select any extra departments this manager should access.
                </p>
              </div>
              <ScrollArea className="h-52 -mr-3 pr-3">
              <div className="space-y-2">
                {managerTarget?.salesDeptId && (
                  <div className="flex items-center gap-3 rounded-2xl bg-[#f4f6f3] px-4 py-3 opacity-70">
                    <Checkbox checked disabled />
                    <span className="text-sm font-medium flex-1 truncate">{managerTarget.salesDeptId.name}</span>
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white text-slate-500">Included</span>
                  </div>
                )}
                {managerTarget?.operationsDeptId && (
                  <div className="flex items-center gap-3 rounded-2xl bg-[#f4f6f3] px-4 py-3 opacity-70">
                    <Checkbox checked disabled />
                    <span className="text-sm font-medium flex-1 truncate">{managerTarget.operationsDeptId.name}</span>
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white text-slate-500">Included</span>
                  </div>
                )}
                {getAvailableExtraDepts(managerTarget).map(d => {
                  const on = selectedDeptIds.includes(d.id);
                  return (
                    <div key={d.id}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer border transition-colors ${on ? 'bg-[#eaf6e6] border-[#54b947]/40' : 'bg-white border-slate-200 hover:bg-[#f4f6f3]'}`}
                      onClick={() => toggleDept(d.id, selectedDeptIds, setSelectedDeptIds)}>
                      <Checkbox checked={on}
                        onCheckedChange={() => toggleDept(d.id, selectedDeptIds, setSelectedDeptIds)} />
                      <span className="text-sm font-medium flex-1 truncate">{d.name}</span>
                      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white text-slate-500 capitalize">{d.type}</span>
                    </div>
                  );
                })}
                {getAvailableExtraDepts(managerTarget).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">No other departments available</p>
                )}
              </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
            <Button variant="ghost" onClick={() => setManagerDialog(false)} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
            <Button onClick={handleAssignManager} disabled={saving} className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
              {saving ? 'Saving...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manage Departments Dialog ── */}
      <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
        <DialogContent className="w-[95vw] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col">
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <DialogHeader className="space-y-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground text-left">Manage Departments</DialogTitle>
              <p className="text-sm text-muted-foreground">{deptTarget?.name}</p>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Select which additional departments the branch manager can access beyond Sales and Operations.
            </p>
            <ScrollArea className="h-64 -mr-3 pr-3">
              <div className="space-y-2">
                {deptTarget?.salesDeptId && (
                  <div className="flex items-center gap-3 rounded-2xl bg-[#f4f6f3] px-4 py-3 opacity-70">
                    <Checkbox checked disabled />
                    <span className="text-sm font-medium flex-1 truncate">{deptTarget.salesDeptId.name}</span>
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white text-slate-500">Included</span>
                  </div>
                )}
                {deptTarget?.operationsDeptId && (
                  <div className="flex items-center gap-3 rounded-2xl bg-[#f4f6f3] px-4 py-3 opacity-70">
                    <Checkbox checked disabled />
                    <span className="text-sm font-medium flex-1 truncate">{deptTarget.operationsDeptId.name}</span>
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white text-slate-500">Included</span>
                  </div>
                )}
                {getAvailableExtraDepts(deptTarget).map(d => {
                  const on = deptSelection.includes(d.id);
                  return (
                    <div key={d.id}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer border transition-colors ${on ? 'bg-[#eaf6e6] border-[#54b947]/40' : 'bg-white border-slate-200 hover:bg-[#f4f6f3]'}`}
                      onClick={() => toggleDept(d.id, deptSelection, setDeptSelection)}>
                      <Checkbox checked={on}
                        onCheckedChange={() => toggleDept(d.id, deptSelection, setDeptSelection)} />
                      <span className="text-sm font-medium flex-1 truncate">{d.name}</span>
                      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white text-slate-500 capitalize">{d.type}</span>
                    </div>
                  );
                })}
                {getAvailableExtraDepts(deptTarget).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">No other departments available</p>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
            <Button variant="ghost" onClick={() => setDeptDialog(false)} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
            <Button onClick={handleSaveDepts} disabled={saving} className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
              {saving ? 'Saving...' : 'Save Departments'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
