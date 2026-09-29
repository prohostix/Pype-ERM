import { useState, useEffect } from 'react';
import { Calendar, Edit, Save, RefreshCw, Plus, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';

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
  const [editingUserId, setEditingUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    sickLeave: 12, casualLeave: 12, earnedLeave: 15, complementaryLeave: 0, wfh: 0
  });
  const [bulkForm, setBulkForm] = useState({
    sickLeave: 12, casualLeave: 12, earnedLeave: 15, complementaryLeave: 0, wfh: 0
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
        sickLeave: alloc.sickLeave,
        casualLeave: alloc.casualLeave,
        earnedLeave: alloc.earnedLeave,
        complementaryLeave: alloc.complementaryLeave,
        wfh: (alloc as any).wfh || 0,
      });
    } else {
      setEditingUserId(userId || '');
      setForm({ sickLeave: 12, casualLeave: 12, earnedLeave: 15, complementaryLeave: 0, wfh: 0 });
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

  const remaining = (total: number, used?: number) => Math.max(0, (total || 0) - (used || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Leave Allocations</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage sick, casual, earned & complementary leave per employee</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
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
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)}>
            <Zap className="w-4 h-4 mr-1" /> Bulk Init
          </Button>
          <Button size="sm" onClick={() => openEdit()}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No leave allocations for {year}</p>
            <p className="text-xs mt-1">Use "Bulk Init" to set up all employees at once</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(alloc => {
            const user = alloc.user || null;
            const uid = alloc.userId;

            // Probation calculation
            let probationBadge = <Badge variant="outline" className="text-xs">Probation Info Missing</Badge>;
            if (user && (user as any).employeeProfileDetail) {
              const profile = (user as any).employeeProfileDetail;
              if (profile.probationEndDate) {
                const today = new Date();
                const probationEnd = new Date(profile.probationEndDate);
                if (probationEnd > today) {
                  const diffTime = Math.abs(probationEnd.getTime() - today.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  probationBadge = <Badge variant="warning" className="bg-amber-100 text-amber-700 hover:bg-amber-200 text-xs">Probation ({diffDays} days left)</Badge>;
                } else {
                  probationBadge = <Badge variant="success" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs">Probation Completed</Badge>;
                }
              } else if (profile.joinDate) {
                 // Has join date but no probation end date
                 probationBadge = <Badge variant="outline" className="text-xs">No Probation End Date</Badge>;
              }
            }

            return (
              <Card key={uid} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-semibold">{user?.name || 'Employee'}</span>
                        <Badge variant="outline" className="text-xs capitalize">{user?.role?.replace(/_/g, ' ')}</Badge>
                        {user?.designation && <Badge variant="outline" className="text-xs">{user.designation}</Badge>}
                        {probationBadge}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                        {[
                          { label: 'Sick', total: alloc.sickLeave, used: alloc.usedSick, color: 'text-red-500' },
                          { label: 'Casual', total: alloc.casualLeave, used: alloc.usedCasual, color: 'text-blue-500' },
                          { label: 'Earned', total: alloc.earnedLeave, used: alloc.usedEarned, color: 'text-green-500' },
                          { label: 'Comp.', total: alloc.complementaryLeave, used: alloc.usedComplementary, color: 'text-purple-500' },
                          { label: 'WFH', total: (alloc as any).wfh || 0, used: (alloc as any).usedWfh || 0, color: 'text-pink-500' },
                        ].map(({ label, total, used, color }) => (
                          <div key={label}>
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className={`font-semibold ${color}`}>{remaining(total, used)}<span className="text-muted-foreground font-normal text-xs">/{total}</span></p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openEdit(alloc)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Allocation — {month}/{year}</DialogTitle>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />{saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Init Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Initialize Leave — {month}/{year}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Sets default leave balances for all active employees who don't have an allocation yet for {month}/{year}.</p>
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
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkInit} disabled={saving}>
              <Zap className="w-4 h-4 mr-1" />{saving ? 'Initializing...' : 'Initialize All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
