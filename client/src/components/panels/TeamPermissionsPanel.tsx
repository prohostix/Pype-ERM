import { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Search, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import api from '@/lib/api';
import { toast } from 'sonner';

import { getFinanceNavItems } from '@/pages/ModernFinanceDashboard';
import { getHRNavItems } from '@/pages/ModernHRDashboard';
import { getOpsNavItems } from '@/pages/ModernOpsDashboard';
import { getCollectionsNavItems } from '@/pages/ModernCollectionsDashboard';
import { getSalesNavItems } from '@/pages/ModernSalesDashboard';

export default function TeamPermissionsPanel() {
  const [subordinates, setSubordinates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [permissionsForm, setPermissionsForm] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sales Assignment State
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const [allSalesUsers, setAllSalesUsers] = useState<any[]>([]);
  const [assignedSalesForm, setAssignedSalesForm] = useState<string[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  const [opsDialogOpen, setOpsDialogOpen] = useState(false);
  const [allOpsUsers, setAllOpsUsers] = useState<any[]>([]);
  const [assignedOpsForm, setAssignedOpsForm] = useState<string[]>([]);
  const [loadingOps, setLoadingOps] = useState(false);

  useEffect(() => {
    fetchSubordinates();
  }, []);

  const fetchSubordinates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/subordinates/team');
      setSubordinates(res.data.data || []);
    } catch (e: any) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSales = async (u: any) => {
    setSelectedUser(u);
    setAssignedSalesForm(u.assignedSalesUsers || []);
    setSalesDialogOpen(true);
    if (allSalesUsers.length === 0) {
      setLoadingSales(true);
      try {
        const res = await api.get('/users');
        const filtered = (res.data.data || []).filter((user: any) => 
          ['sales_admin', 'sales_sub_admin', 'sales'].includes(user.role) || 
          (user.role === 'employee' && user.department?.type === 'sales')
        );
        setAllSalesUsers(filtered);
      } catch (e: any) {
        toast.error('Failed to load sales users');
      } finally {
        setLoadingSales(false);
      }
    }
  };

  const toggleSalesUser = (userId: string) => {
    setAssignedSalesForm(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveSales = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await api.put(`/users/${selectedUser.id}/sales-assignment`, { assignedSalesUsers: assignedSalesForm });
      toast.success("Sales assignments updated successfully");
      setSalesDialogOpen(false);
      fetchSubordinates();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update assignments');
    } finally {
      setSaving(false);
    }
  };

  const handleManageOps = async (u: any) => {
    setSelectedUser(u);
    setAssignedOpsForm(u.assignedOpsUsers || []);
    setOpsDialogOpen(true);
    if (allOpsUsers.length === 0) {
      setLoadingOps(true);
      try {
        const res = await api.get('/users');
        const filtered = (res.data.data || []).filter((user: any) => 
          ['ops_admin', 'ops_sub_admin'].includes(user.role) || 
          (user.role === 'employee' && user.department?.type === 'operations')
        );
        setAllOpsUsers(filtered);
      } catch (e: any) {
        toast.error('Failed to load operations users');
      } finally {
        setLoadingOps(false);
      }
    }
  };

  const toggleOpsUser = (userId: string) => {
    setAssignedOpsForm(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveOps = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await api.put(`/users/${selectedUser.id}/ops-assignment`, { assignedOpsUsers: assignedOpsForm });
      toast.success("Operations assignments updated successfully");
      setOpsDialogOpen(false);
      fetchSubordinates();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update assignments');
    } finally {
      setSaving(false);
    }
  };

  const getAvailablePermissions = (u: any) => {
    let items: any[] = [];
    const role = u.role || '';
    const deptType = u.department?.type;
    const isSubDeptManager = Boolean(u.subDepartmentId);

    if (['ops_admin', 'ops_sub_admin'].includes(role)) {
      items = getOpsNavItems(role);
    } else if (['finance_admin', 'finance_sub_admin', 'finance'].includes(role)) {
      items = getFinanceNavItems();
    } else if (role === 'hr_admin' || role === 'hr_sub_admin') {
      items = getHRNavItems();
    } else if (['collections_admin', 'collections'].includes(role)) {
      items = getCollectionsNavItems();
    } else if (['sales_admin', 'sales_sub_admin', 'sales'].includes(role)) {
      items = getSalesNavItems();
    } else if (role === 'student') {
      items = [
        { id: 'overview', label: 'Overview' },
        { id: 'notifications', label: 'Notifications' },
        { id: 'materials', label: 'Classes & E-Books' },
        { id: 'fees', label: 'Fee details' },
        { id: 'invoices', label: 'Invoices' },
        { id: 'refer_admission', label: 'Refer Admission' },
        { id: 'terms', label: 'Terms & Conditions' },
        { id: 'help', label: 'Help & Support' },
      ];
    } else if (role === 'employee') {
      if (deptType) {
        if (isSubDeptManager) {
          switch (deptType) {
            case 'operations': items = getOpsNavItems(role); break;
            case 'hr': items = getHRNavItems(); break;
            case 'finance': items = getFinanceNavItems(); break;
            case 'collections': items = getCollectionsNavItems(); break;
            case 'sales': items = getSalesNavItems(); break;
          }
        } else if (deptType === 'collections') {
          items = getCollectionsNavItems();
        }
      }
      if (items.length === 0) {
        items = [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'tasks', label: 'My Tasks' },
          { id: 'leaves', label: 'My Leaves' },
          { id: 'attendance', label: 'Attendance' },
          { id: 'holidays', label: 'Holiday List' },
          { id: 'announcements', label: 'Announcements' },
          { id: 'notice-board', label: 'Notice Board' },
          { id: 'team', label: 'My Team' },
          { id: 'ld-portal', label: 'L&D Portal' },
        ];
      }
    } else {
      // Fallback
      items = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'users', label: 'Users' },
        { id: 'tasks', label: 'Tasks' },
        { id: 'departments', label: 'Departments' },
      ];
    }

    if (role !== 'student' && !items.some(t => t.id === 'meetings')) {
      items.push({ id: 'meetings', label: 'Meetings' });
    }
    
    return items.filter(item => !item.isSection && item.id !== 'overview' && item.id !== 'dashboard' && item.id !== 'team_permissions');
  };

  const getModalPermissions = () => {
    if (!selectedUser) return [];
    const items = getAvailablePermissions(selectedUser);

    const unique: any[] = [];
    const ids = new Set();
    for (const item of items) {
      if (!item.isSection && item.id !== 'dashboard' && item.id !== 'overview' && item.id !== 'team_permissions' && !ids.has(item.id)) {
        unique.push({ id: item.id, label: item.label });
        ids.add(item.id);
      }
    }
    return unique.sort((a, b) => a.label.localeCompare(b.label));
  };

  const handleManage = (u: any) => {
    setSelectedUser(u);
    // Remove __custom__ for UI, we will add it back on save
    const current = (u.permissions || []).filter((p: string) => p !== '__custom__');
    
    if (!u.permissions || u.permissions.length === 0 || !u.permissions.includes('__custom__')) {
       // By default, a user sees all tabs available to their role dashboard
       const allRolePerms = getAvailablePermissions(u).map(p => p.id);
       setPermissionsForm(allRolePerms);
    } else {
       setPermissionsForm(current);
    }
    setDialogOpen(true);
  };

  const togglePermission = (permId: string) => {
    setPermissionsForm(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      // Must include __custom__ to signify it's a manual override!
      const payload = ['__custom__', ...permissionsForm];
      await api.put(`/users/${selectedUser.id}/permissions`, { permissions: payload });
      toast.success("Permissions updated successfully");
      setDialogOpen(false);
      fetchSubordinates();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await api.put(`/users/${selectedUser.id}/permissions`, { permissions: [] });
      toast.success("Reset to default role permissions");
      setDialogOpen(false);
      fetchSubordinates();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to reset permissions');
    } finally {
      setSaving(false);
    }
  };

  const filtered = subordinates.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) || 
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const availableSalesUsers = allSalesUsers.filter(user => {
    return user.branchId === selectedUser?.branchId;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Team Permissions</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Manage feature access for your subordinates.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search team members..."
            className="pl-11 h-11 rounded-full bg-white border-slate-200 focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Team Members</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{filtered.length} total</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
              <div className="w-14 h-14 bg-[#eaf6e6] text-[#256c1d] rounded-2xl mb-3 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">No team members found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(emp => {
                const isCustom = emp.permissions && emp.permissions.includes('__custom__');
                return (
                  <div key={emp.id} className="group flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center font-semibold text-lg text-[#256c1d] flex-shrink-0">
                        {(emp.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-base text-slate-900 mb-1">{emp.name || 'Unknown'}</div>
                        <div className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground mb-1">
                          <span className="px-2.5 py-0.5 bg-white text-slate-700 rounded-full text-xs capitalize font-semibold">
                            {emp.role.replace(/_/g, ' ')}
                          </span>
                          <span className="opacity-50">•</span>
                          <span>{emp.email}</span>
                        </div>
                        <div className="mt-3">
                          {isCustom ? (
                            <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold bg-amber-100 px-3 py-1 rounded-full w-max">
                              <ShieldAlert className="w-3.5 h-3.5" /> Customized Access
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[#256c1d] text-xs font-semibold bg-[#dff3da] px-3 py-1 rounded-full w-max">
                              <ShieldCheck className="w-3.5 h-3.5" /> Role Default
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap xl:justify-end">
                      {['ops_admin', 'ops_sub_admin'].includes(emp.role) && (
                        <Button variant="outline" size="sm" onClick={() => handleManageSales(emp)} className="h-10 rounded-full px-4 bg-white border-slate-200 hover:bg-[#eaf6e6]">
                          <Users className="w-4 h-4 mr-1.5 text-[#256c1d]" /> Assign Sales Users
                        </Button>
                      )}
                      {['finance_admin', 'finance_sub_admin'].includes(emp.role) && (
                        <Button variant="outline" size="sm" onClick={() => handleManageOps(emp)} className="h-10 rounded-full px-4 bg-white border-slate-200 hover:bg-[#eaf6e6]">
                          <Users className="w-4 h-4 mr-1.5 text-[#256c1d]" /> Assign Operations Users
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleManage(emp)} className="h-10 rounded-full px-4 bg-white border-slate-200 hover:bg-[#eaf6e6]">
                        <Shield className="w-4 h-4 mr-1.5 text-[#256c1d]" /> Manage Access
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px] wizard-form border-0 rounded-[2rem] bg-white overflow-hidden p-0 gap-0" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader className="bg-[#f4f6f3] p-6 border-b border-slate-100 m-0 space-y-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-[#256c1d]" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-semibold tracking-tight">Edit Permissions</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Control what {selectedUser?.name} can see and do.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6">
            <div className="bg-[#eaf6e6] p-4 rounded-2xl flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-[#256c1d] shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-[#256c1d]">Custom Overrides</p>
                <p className="text-slate-600 mt-0.5 text-xs">Unchecking a module hides it completely from their dashboard and menu.</p>
              </div>
            </div>

            <div className="space-y-2 mt-4 h-64 overflow-y-auto pr-1">
              {getModalPermissions().map(perm => (
                <div key={perm.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                  <Checkbox 
                    id={`perm-${perm.id}`} 
                    checked={permissionsForm.includes(perm.id)}
                    onCheckedChange={() => togglePermission(perm.id)}
                  />
                  <Label htmlFor={`perm-${perm.id}`} className="flex-1 cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {perm.label}
                  </Label>
                </div>
              ))}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between mt-6 pt-4 border-t border-slate-100">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground text-xs px-2" onClick={handleResetToDefault} disabled={saving}>
                Reset to Defaults
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-11 rounded-full px-6" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                <Button className="h-11 rounded-full px-6 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sales Assignment Dialog */}
      <Dialog open={salesDialogOpen} onOpenChange={setSalesDialogOpen}>
        <DialogContent className="sm:max-w-[500px] wizard-form border-0 rounded-[2rem] bg-white overflow-hidden p-0 gap-0" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader className="bg-[#f4f6f3] p-6 border-b border-slate-100 m-0 space-y-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center">
                <Users className="w-5 h-5 text-[#256c1d]" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-semibold tracking-tight">Assign Sales Users</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  Assign personnel exclusively to {selectedUser?.name}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6">
            <div className="bg-[#eaf6e6] p-4 rounded-2xl flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-[#256c1d] shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-[#256c1d]">Data Visibility</p>
                <p className="text-slate-600 mt-0.5 text-xs">They will only see records from these assigned users or unassigned records.</p>
              </div>
            </div>

            <div className="space-y-2 mt-4 h-64 overflow-y-auto pr-1">
              {loadingSales ? (
                <p className="text-center text-sm text-muted-foreground py-4">Loading sales personnel...</p>
              ) : availableSalesUsers.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No sales users found.</p>
              ) : (
                availableSalesUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                    <Checkbox 
                      id={`sales-${user.id}`} 
                      checked={assignedSalesForm.includes(user.id)}
                      onCheckedChange={() => toggleSalesUser(user.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`sales-${user.id}`} className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {user.name}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        {user.role.replace(/_/g, ' ')} • {user.branch?.name ? (
                          user.branch.name
                        ) : user.department?.name ? (
                          `${user.department.name} (Dept)`
                        ) : (
                          <span className="text-yellow-600 dark:text-yellow-500 font-medium">No Branch</span>
                        )} • <span className="lowercase">{user.email}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-slate-100">
              <Button variant="outline" className="h-11 rounded-full px-6" onClick={() => setSalesDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button className="h-11 rounded-full px-6 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleSaveSales} disabled={saving}>
                {saving ? 'Saving...' : 'Save Assignments'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ops Assignment Dialog */}
      <Dialog open={opsDialogOpen} onOpenChange={setOpsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] wizard-form border-0 rounded-[2rem] bg-white overflow-hidden p-0 gap-0" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader className="bg-[#f4f6f3] p-6 border-b border-slate-100 m-0 space-y-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center">
                <Users className="w-5 h-5 text-[#256c1d]" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-semibold tracking-tight">Assign Operations Users</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  Assign operations personnel exclusively to {selectedUser?.name}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6">
            <div className="bg-[#eaf6e6] p-4 rounded-2xl flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-[#256c1d] shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-[#256c1d]">Data Visibility</p>
                <p className="text-slate-600 mt-0.5 text-xs">They will only see records from these assigned users or unassigned records.</p>
              </div>
            </div>

            <div className="space-y-2 mt-4 h-64 overflow-y-auto pr-1">
              {loadingOps ? (
                <p className="text-center text-sm text-muted-foreground py-4">Loading operations personnel...</p>
              ) : allOpsUsers.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No operations users found.</p>
              ) : (
                allOpsUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                    <Checkbox 
                      id={`ops-${user.id}`} 
                      checked={assignedOpsForm.includes(user.id)}
                      onCheckedChange={() => toggleOpsUser(user.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`ops-${user.id}`} className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {user.name}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        {user.role.replace(/_/g, ' ')} • {user.branch?.name ? (
                          user.branch.name
                        ) : user.department?.name ? (
                          `${user.department.name} (Dept)`
                        ) : (
                          <span className="text-yellow-600 dark:text-yellow-500 font-medium">No Branch</span>
                        )} • <span className="lowercase">{user.email}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-slate-100">
              <Button variant="outline" className="h-11 rounded-full px-6" onClick={() => setOpsDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button className="h-11 rounded-full px-6 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleSaveOps} disabled={saving}>
                {saving ? 'Saving...' : 'Save Assignments'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
