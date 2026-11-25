import { useState, useEffect } from 'react';
import { Calendar, Edit, Save, RefreshCw, Plus, Zap, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { ListPagination } from '@/components/ui/list-pagination';
import { confirmDialog } from '@/lib/confirm';

interface LeaveAllocation {
  id?: string;
  userId: any;
  user?: User;
  year: number;
  sickLeave: number;
  casualLeave: number;
  earnedLeave: number;
  complementaryLeave: number;
  wfh: number;
  usedSick?: number;
  usedCasual?: number;
  usedEarned?: number;
  usedComplementary?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
}

export function LeaveAllocationPanel() {
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  // HR tied to a branch only ever initializes (and sees) their own branch's employees.
  const { user: me } = useAuth();
  const myBranchId = (me as any)?.branchId as string | undefined;
  const myBranchName = (me as any)?.branch?.name as string | undefined;
  const [editingUserId, setEditingUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [form, setForm] = useState({
    sickLeave: 0, casualLeave: 0, earnedLeave: 0, complementaryLeave: 0, wfh: 0
  });
  const [bulkForm, setBulkForm] = useState({
    sickLeave: 0, casualLeave: 0, earnedLeave: 0, complementaryLeave: 0, wfh: 0
  });

  useEffect(() => { fetchAll(); }, [year, month]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [allocRes, usersRes] = await Promise.all([
        api.get(`/hr/leave-allocations?year=${year}&month=${month}`),
        api.get('/users'),
      ]);
      setAllocations(allocRes.data.data || []);
      const allUsers: User[] = (usersRes.data.data || []).filter((u: any) => u.status !== 'resigned');
      setUsers(allUsers.filter(u => !['ceo', 'org_admin', 'superadmin'].includes(u.role)));
    } catch {
      toast.error('Failed to load leave allocations');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (alloc?: LeaveAllocation, userId?: string) => {
    if (alloc) {
      setEditingUserId(typeof alloc.userId === 'object' ? alloc.userId.id : alloc.userId);
      setForm({
        sickLeave: alloc.sickLeave ?? 0,
        casualLeave: alloc.casualLeave ?? 0,
        earnedLeave: alloc.earnedLeave ?? 0,
        complementaryLeave: alloc.complementaryLeave ?? 0,
        wfh: (alloc as any).wfh ?? 0,
      });
    } else {
      setEditingUserId(userId || '');
      setForm({ sickLeave: 0, casualLeave: 0, earnedLeave: 0, complementaryLeave: 0, wfh: 0 });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingUserId) { toast.error('Select an employee'); return; }
    setSaving(true);
    try {
      await api.put(`/hr/leave-allocations/${editingUserId}`, { ...form, year, month });
      toast.success('Leave allocation saved');
      setDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!(await confirmDialog({ title: 'Delete leave allocation?', message: `Are you sure you want to delete the leave allocation for ${userName} (${month}/${year})?`, confirmText: 'Delete', tone: 'danger' }))) {
      return;
    }
    try {
      await api.delete(`/hr/leave-allocations/${userId}?year=${year}&month=${month}`);
      toast.success(`Leave allocation deleted for ${userName}`);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete leave allocation');
    }
  };

  const handleBulkInit = async () => {
    setSaving(true);
    try {
      const res = await api.post('/hr/leave-allocations/bulk-init', { ...bulkForm, year, month });
      toast.success(res.data.message);
      setBulkDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to initialize');
    } finally {
      setSaving(false);
    }
  };

  const allocatedUserIds = new Set(allocations.map(a => a.userId));
  const unallocatedUsers = users.filter(u => !allocatedUserIds.has(u.id));

  const filtered = allocations.filter(a => {
    const name = a.user?.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const pagedAllocs = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const remaining = (total: number, used?: number) => Math.max(0, (total || 0) - (used || 0));

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Leave Allocations</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Manage sick, casual, earned & complementary leave per employee</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#54b947]"
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
          >
            {[
              { m: 1, name: 'Jan' }, { m: 2, name: 'Feb' }, { m: 3, name: 'Mar' },
              { m: 4, name: 'Apr' }, { m: 5, name: 'May' }, { m: 6, name: 'Jun' },
              { m: 7, name: 'Jul' }, { m: 8, name: 'Aug' }, { m: 9, name: 'Sep' },
              { m: 10, name: 'Oct' }, { m: 11, name: 'Nov' }, { m: 12, name: 'Dec' },
            ].map(m => <option key={m.m} value={m.m}>{m.name}</option>)}
          </select>
          <select
            className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#54b947]"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="outline" onClick={fetchAll} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" onClick={() => setBulkDialogOpen(true)} className="h-11 px-5 rounded-full bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6]">
            <Zap className="w-4 h-4 mr-2" /> Bulk Init
          </Button>
          <Button onClick={() => openEdit()} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search employee..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-11 h-12 rounded-full bg-[#f4f6f3] border-transparent" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-3xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-100 py-16 text-center text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Calendar className="w-6 h-6" /></div>
          <p className="text-sm">No leave allocations for {year}</p>
          <p className="text-xs mt-1">Use "Bulk Init" to set up all employees at once</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pagedAllocs.map(alloc => {
            const user = alloc.user || null;
            const uid = alloc.userId;

            // Probation calculation
            let probationBadge = <Badge variant="outline" className="text-xs rounded-full bg-white border-0 text-slate-500">Probation Info Missing</Badge>;
            if (user && (user as any).employeeProfileDetail) {
              const profile = (user as any).employeeProfileDetail;
              if (profile.probationEndDate) {
                const today = new Date();
                const probationEnd = new Date(profile.probationEndDate);
                if (probationEnd > today) {
                  const diffTime = Math.abs(probationEnd.getTime() - today.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  probationBadge = <Badge variant="warning" className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs rounded-full border-0">Probation ({diffDays} days left)</Badge>;
                } else {
                  probationBadge = <Badge variant="success" className="bg-[#dff3da] text-[#256c1d] hover:bg-[#dff3da] text-xs rounded-full border-0">Probation Completed</Badge>;
                }
              } else if (profile.joinDate) {
                 // Has join date but no probation end date
                 probationBadge = <Badge variant="outline" className="text-xs rounded-full bg-white border-0 text-slate-500">No Probation End Date</Badge>;
              }
            }

            return (
              <div key={uid} className="rounded-3xl bg-white border border-slate-100 hover:border-[#8ae47e] transition-colors">
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-semibold text-lg text-slate-900">{user?.name || 'Employee'}</span>
                        <Badge variant="outline" className="text-xs capitalize rounded-full bg-[#f4f6f3] border-0">{user?.role?.replace(/_/g, ' ')}</Badge>
                        {user?.designation && <Badge variant="outline" className="text-xs rounded-full bg-[#f4f6f3] border-0">{user.designation}</Badge>}
                        {probationBadge}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                        {[
                          { label: 'Sick', total: alloc.sickLeave, used: alloc.usedSick, color: 'text-red-600' },
                          { label: 'Casual', total: alloc.casualLeave, used: alloc.usedCasual, color: 'text-sky-600' },
                          { label: 'Earned', total: alloc.earnedLeave, used: alloc.usedEarned, color: 'text-[#256c1d]' },
                          { label: 'Comp.', total: alloc.complementaryLeave, used: alloc.usedComplementary, color: 'text-violet-600' },
                          { label: 'WFH', total: (alloc as any).wfh || 0, used: (alloc as any).usedWfh || 0, color: 'text-orange-600' },
                        ].map(({ label, total, used, color }) => (
                          <div key={label} className="rounded-2xl bg-[#f4f6f3] p-3.5">
                            <p className="text-xs font-medium text-slate-500">{label}</p>
                            <p className={`text-xl font-semibold tracking-tight ${color}`}>{remaining(total, used)}<span className="text-muted-foreground font-normal text-xs">/{total}</span></p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="h-10 w-10 p-0 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]" onClick={() => openEdit(alloc)} title="Edit Allocation">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-10 p-0 rounded-full bg-white text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                        onClick={() => handleDelete(uid, user?.name || 'Employee')}
                        title="Delete Allocation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <ListPagination total={filtered.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Leave Allocation — {month}/{year}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {!allocations.find(a => a.userId === editingUserId) && (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={editingUserId} onValueChange={setEditingUserId}>
                  <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                  <SelectContent>
                    {unallocatedUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name} — {(u.role || '').replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { key: 'sickLeave', label: 'Sick Leave (days)' },
                { key: 'casualLeave', label: 'Casual Leave (days)' },
                { key: 'earnedLeave', label: 'Earned Leave (days)' },
                { key: 'complementaryLeave', label: 'Complementary Leave (days)' },
                { key: 'wfh', label: 'Work From Home (days)' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label>{label}</Label>
                  <Input type="number" min="0" value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />{saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Init Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Bulk Initialize Leave — {month}/{year}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sets default leave balances for all active employees{myBranchId ? ` in your branch${myBranchName ? ` (${myBranchName})` : ''}` : ''} who don't have an allocation yet for {month}/{year}.
            Employees who already have one are left unchanged.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {([
              { key: 'sickLeave', label: 'Sick Leave' },
              { key: 'casualLeave', label: 'Casual Leave' },
              { key: 'earnedLeave', label: 'Earned Leave' },
              { key: 'complementaryLeave', label: 'Complementary Leave' },
              { key: 'wfh', label: 'Work From Home' },
            ] as const).map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input type="number" min="0" value={bulkForm[key]}
                  onChange={e => setBulkForm(f => ({ ...f, [key]: Number(e.target.value) }))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleBulkInit} disabled={saving}>
              <Zap className="w-4 h-4 mr-1" />{saving ? 'Initializing...' : myBranchId ? 'Initialize Branch' : 'Initialize All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
