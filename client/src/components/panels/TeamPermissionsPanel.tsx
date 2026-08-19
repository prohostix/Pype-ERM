import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Search, Users, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

import { getFinanceNavItems } from '@/pages/ModernFinanceDashboard';
import { getHRNavItems } from '@/pages/ModernHRDashboard';
import { getOpsNavItems } from '@/pages/ModernOpsDashboard';
import { getCollectionsNavItems } from '@/pages/ModernCollectionsDashboard';

export default function TeamPermissionsPanel() {
  const { user } = useAuth();
  const [subordinates, setSubordinates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [permissionsForm, setPermissionsForm] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const getAvailablePermissions = (u: any) => {
    let items: any[] = [];
    const role = u.role || '';
    const deptType = u.department?.type;
    const isSubDeptManager = Boolean(u.subDepartmentId);

    if (['ops_admin', 'ops_sub_admin'].includes(role)) {
      items = getOpsNavItems();
    } else if (['finance_admin', 'finance'].includes(role)) {
      items = getFinanceNavItems();
    } else if (role === 'hr_admin') {
      items = getHRNavItems();
    } else if (['collections_admin', 'collections'].includes(role)) {
      items = getCollectionsNavItems();
    } else if (role === 'staff') {
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

    if (role !== 'staff' && !items.some(t => t.id === 'meetings')) {
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Team Permissions</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage feature access and module permissions for your subordinates.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> My Team
            </CardTitle>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                className="pl-9 h-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Permissions Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading team...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No team members found.</td></tr>
                ) : (
                  filtered.map(emp => {
                    const isCustom = emp.permissions && emp.permissions.includes('__custom__');
                    return (
                      <tr key={emp.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{emp.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{emp.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs capitalize">
                            {emp.role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isCustom ? (
                            <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
                              <ShieldAlert className="w-3.5 h-3.5" /> Customized
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                              <ShieldCheck className="w-3.5 h-3.5" /> Role Default
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="outline" size="sm" onClick={() => handleManage(emp)}>
                            <Shield className="w-3.5 h-3.5 mr-1.5" /> Manage Access
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>
              Control what {selectedUser?.name} can see and do on their dashboard.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg flex items-start gap-3 border">
              <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Custom Overrides</p>
                <p className="text-muted-foreground mt-0.5 text-xs">Unchecking a module completely hides it from the user's dashboard and navigation menu.</p>
              </div>
            </div>

            <div className="space-y-3 mt-4 h-64 overflow-y-auto pr-2">
              {getModalPermissions().map(perm => (
                <div key={perm.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
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
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={handleResetToDefault} disabled={saving}>
              Reset to Role Defaults
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
