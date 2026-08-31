import { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Search, Users, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        const salesRoles = ['sales_admin', 'sales_sub_admin', 'sales', 'employee'];
        const filtered = (res.data.data || []).filter((user: any) => salesRoles.includes(user.role));
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

  const getAvailablePermissions = (u: any) => {
    let items: any[] = [];
    const role = u.role || '';
    const deptType = u.department?.type;
    const isSubDeptManager = Boolean(u.subDepartmentId);

    if (['ops_admin', 'ops_sub_admin'].includes(role)) {
      items = getOpsNavItems();
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
            case 'operations': items = getOpsNavItems(); break;
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

  return (
    <div className="space-y-6">
      <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-md rounded-2xl overflow-hidden bg-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 border-b border-border/40 py-5 px-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Team Permissions</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Manage feature access for your subordinates.</p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              className="pl-9 h-9 rounded-full bg-background border-slate-200/60 dark:border-slate-800/60"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border/60">
              <div className="flex justify-center mb-4">
                <Users className="w-8 h-8 opacity-40 animate-pulse" />
              </div>
              Loading team...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-2xl border border-dashed border-border/60 bg-muted/10">
              <div className="p-4 bg-muted/30 rounded-full mb-4">
                <Users className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm font-medium">No team members found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(emp => {
                const isCustom = emp.permissions && emp.permissions.includes('__custom__');
                return (
                  <div key={emp.id} className="flex flex-col xl:flex-row xl:items-center justify-between p-6 border border-slate-200/60 dark:border-slate-800/60 rounded-xl hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:bg-muted/20 transition-all duration-300 group bg-card gap-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xl text-primary flex-shrink-0">
                        {(emp.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-base mb-1">{emp.name || 'Unknown'}</div>
                        <div className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground mb-1">
                          <span className="px-2.5 py-0.5 bg-secondary text-secondary-foreground rounded-md text-xs capitalize font-medium">
                            {emp.role.replace(/_/g, ' ')}
                          </span>
                          <span className="opacity-50">•</span>
                          <span>{emp.email}</span>
                        </div>
                        <div className="mt-3">
                          {isCustom ? (
                            <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-md w-max border border-amber-200/50 dark:border-amber-900/50">
                              <ShieldAlert className="w-3.5 h-3.5" /> Customized Access
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md w-max border border-slate-200 dark:border-slate-700">
                              <ShieldCheck className="w-3.5 h-3.5" /> Role Default
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap xl:justify-end opacity-60 group-hover:opacity-100 transition-opacity mt-4 xl:mt-0 pt-4 xl:pt-0 border-t border-border/50 xl:border-none">
                      {emp.role === 'ops_sub_admin' && (
                        <Button variant="outline" size="sm" onClick={() => handleManageSales(emp)} className="rounded-full shadow-sm px-4">
                          <Users className="w-4 h-4 mr-1.5 text-blue-500" /> Assign Sales Users
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleManage(emp)} className="rounded-full shadow-sm px-4">
                        <Shield className="w-4 h-4 mr-1.5 text-primary" /> Manage Access
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px] border-none shadow-2xl rounded-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="bg-muted/30 p-6 border-b border-border/40 m-0 space-y-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-bold">Edit Permissions</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Control what {selectedUser?.name} can see and do.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6">
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/50 mb-4">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-700 dark:text-blue-400">Custom Overrides</p>
                <p className="text-blue-600/80 dark:text-blue-300/80 mt-0.5 text-xs">Unchecking a module hides it completely from their dashboard and menu.</p>
              </div>
            </div>

            <div className="space-y-2 mt-4 h-64 overflow-y-auto pr-2">
              {getModalPermissions().map(perm => (
                <div key={perm.id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-slate-800/60">
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

            <DialogFooter className="flex items-center justify-between sm:justify-between mt-6 pt-4 border-t border-border/40">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground text-xs px-2" onClick={handleResetToDefault} disabled={saving}>
                Reset to Defaults
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="rounded-full px-5" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                <Button className="rounded-full px-5 shadow-sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sales Assignment Dialog */}
      <Dialog open={salesDialogOpen} onOpenChange={setSalesDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="bg-muted/30 p-6 border-b border-border/40 m-0 space-y-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-500" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-bold">Assign Sales Users</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  Assign personnel exclusively to {selectedUser?.name}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6">
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/50 mb-4">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-700 dark:text-blue-400">Data Visibility</p>
                <p className="text-blue-600/80 dark:text-blue-300/80 mt-0.5 text-xs">They will only see records from these assigned users or unassigned records.</p>
              </div>
            </div>

            <div className="space-y-2 mt-4 h-64 overflow-y-auto pr-2">
              {loadingSales ? (
                <p className="text-center text-sm text-muted-foreground py-4">Loading sales personnel...</p>
              ) : allSalesUsers.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No sales users found.</p>
              ) : (
                allSalesUsers.map(user => (
                  <div key={user.id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-slate-800/60">
                    <Checkbox 
                      id={`sales-${user.id}`} 
                      checked={assignedSalesForm.includes(user.id)}
                      onCheckedChange={() => toggleSalesUser(user.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`sales-${user.id}`} className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {user.name}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{user.role.replace(/_/g, ' ')} • {user.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-border/40">
              <Button variant="outline" className="rounded-full px-5" onClick={() => setSalesDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button className="rounded-full px-5 shadow-sm bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveSales} disabled={saving}>
                {saving ? 'Saving...' : 'Save Assignments'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
