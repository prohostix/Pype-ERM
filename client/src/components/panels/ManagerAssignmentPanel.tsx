import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, UserCheck, UserX, Building, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { mayOn } from '@/lib/access';

interface User {
  id: string;
  name: string;
  email: string;
  designation?: string;
  role: string;
}

interface SubDepartment {
  id: string;
  name: string;
  parentDeptId: any;
  managerId?: any;
  status: string;
}

interface Department {
  id: string;
  name: string;
  type: string;
  managerId?: any;
  assistantManagerIds?: any[];
  subDepartments?: SubDepartment[];
}

const DEPT_TYPE_COLORS: Record<string, string> = {
  hr: 'bg-orange-100 text-orange-800',
  finance: 'bg-green-100 text-green-800',
  operations: 'bg-blue-100 text-blue-800',
  sales: 'bg-pink-100 text-pink-800',
  ceo: 'bg-indigo-100 text-indigo-800',
  org_admin: 'bg-teal-100 text-teal-800',
  custom: 'bg-purple-100 text-purple-800',
};

export function ManagerAssignmentPanel() {
  const { user } = useAuth();
  const mayEdit = mayOn(user, 'managers', 'edit', true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{
    type: 'department' | 'subdepartment';
    id: string;
    name: string;
    currentManagerId?: string;
  } | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState('none');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [deptsRes, subDeptsRes, usersRes] = await Promise.all([
        api.get('/departments'),
        api.get('/sub-departments'),
        api.get('/users'),
      ]);

      const depts: Department[] = deptsRes.data.data || [];
      const subs: SubDepartment[] = subDeptsRes.data.data || [];
      const allUsers: User[] = usersRes.data.data || [];

      // Attach sub-departments to their parent departments
      const deptsWithSubs = depts.map((dept) => ({
        ...dept,
        subDepartments: subs.filter((s) => {
          const parentId =
            typeof s.parentDeptId === 'object'
              ? s.parentDeptId?.id
              : s.parentDeptId;
          return parentId === dept.id;
        }),
      }));

      setDepartments(deptsWithSubs);
      // Filter out superadmin/org_admin and resigned users for manager candidates
      setUsers(allUsers.filter((u) => !['superadmin', 'org_admin'].includes(u.role) && u.status !== 'resigned'));
    } catch (err) {
      toast.error('Failed to load hierarchy data');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (deptId: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      next.has(deptId) ? next.delete(deptId) : next.add(deptId);
      return next;
    });
  };

  const openAssignDialog = (
    type: 'department' | 'subdepartment',
    id: string,
    name: string,
    currentManager?: any
  ) => {
    const currentId =
      typeof currentManager === 'object'
        ? currentManager?.id
        : currentManager;
    setAssignTarget({ type, id, name, currentManagerId: currentId });
    setSelectedManagerId(currentId || 'none');
    setDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!assignTarget) return;
    const managerId = selectedManagerId === 'none' ? null : selectedManagerId;

    try {
      if (assignTarget.type === 'department') {
        if (managerId) {
          await api.put(`/departments/${assignTarget.id}/assign-manager`, { managerId });
        } else {
          await api.delete(`/departments/${assignTarget.id}/remove-manager`);
        }
      } else {
        await api.patch(`/sub-departments/${assignTarget.id}`, {
          managerId: managerId || null,
        });
      }
      toast.success(`Manager ${managerId ? 'assigned' : 'removed'} for ${assignTarget.name}`);
      setDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign manager');
    }
  };

  const getManagerName = (managerId: any) => {
    if (!managerId) return null;
    if (typeof managerId === 'object') return (managerId as any)?.name || null;
    const user = users.find((u) => u.id === managerId);
    return user?.name || null;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  const ManagerLine = ({ name }: { name: string | null }) =>
    name ? (
      <div className="flex items-center gap-1.5 mt-1">
        <UserCheck className="w-3.5 h-3.5 text-[#256c1d]" />
        <span className="text-xs text-[#256c1d] font-semibold">{name}</span>
      </div>
    ) : (
      <div className="flex items-center gap-1.5 mt-1">
        <UserX className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs text-slate-500">No manager assigned</span>
      </div>
    );

  return (
    <div className="space-y-6 wizard-form">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Manager Assignment — Hierarchy View</h2>
        <p className="text-muted-foreground text-sm mt-1.5">Assign or change managers for departments and their sub-departments</p>
      </div>

      {departments.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-100 py-16 text-center text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Building className="w-6 h-6" /></div>
          <p className="text-sm">No departments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {departments.map((dept) => {
            const isExpanded = expandedDepts.has(dept.id);
            const hasSubs = (dept.subDepartments?.length ?? 0) > 0;
            const managerName = getManagerName(dept.managerId);

            return (
              <div key={dept.id} className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
                {/* Department row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:p-5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => hasSubs && toggleExpand(dept.id)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${hasSubs ? 'bg-[#f4f6f3] hover:bg-[#eaf6e6] text-slate-600' : 'text-transparent'}`}
                      disabled={!hasSubs}
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <div className="w-11 h-11 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                      <Building className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{dept.name}</span>
                        <Badge
                          className={`text-[10px] rounded-full border-0 px-2.5 ${DEPT_TYPE_COLORS[dept.type] || 'bg-slate-100 text-slate-700'}`}
                          variant="outline"
                        >
                          {dept.type}
                        </Badge>
                        {hasSubs && (
                          <span className="text-xs text-muted-foreground">
                            {dept.subDepartments!.length} sub-dept{dept.subDepartments!.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <ManagerLine name={managerName} />
                    </div>
                  </div>

                  {mayEdit && (
                    <Button
                      variant={managerName ? 'outline' : 'default'}
                      className={managerName
                        ? 'h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold'
                        : 'h-10 rounded-full px-5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold'}
                      onClick={() => openAssignDialog('department', dept.id, dept.name, dept.managerId)}
                    >
                      {managerName ? 'Change' : 'Assign'}
                    </Button>
                  )}
                </div>

                {/* Sub-departments */}
                {isExpanded && dept.subDepartments && dept.subDepartments.length > 0 && (
                  <div className="bg-[#f4f6f3] p-3 sm:p-4 space-y-2">
                    {dept.subDepartments.map((sub) => {
                      const subManagerName = getManagerName(sub.managerId);
                      return (
                        <div
                          key={sub.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 sm:ml-10 rounded-2xl bg-white"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#f4f6f3] text-slate-600 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-slate-900">{sub.name}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] rounded-full border-0 px-2.5 capitalize ${sub.status === 'active' ? 'bg-[#dff3da] text-[#256c1d]' : 'bg-slate-200/70 text-slate-600'}`}
                                >
                                  {sub.status}
                                </Badge>
                              </div>
                              <ManagerLine name={subManagerName} />
                            </div>
                          </div>

                          {mayEdit && (
                            <Button
                              variant={subManagerName ? 'outline' : 'default'}
                              className={subManagerName
                                ? 'h-9 rounded-full px-4 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold'
                                : 'h-9 rounded-full px-4 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold'}
                              onClick={() => openAssignDialog('subdepartment', sub.id, sub.name, sub.managerId)}
                            >
                              {subManagerName ? 'Change' : 'Assign'}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Manager Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Assign Manager</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-2xl bg-[#f4f6f3] p-4">
              <p className="text-sm text-muted-foreground">
                {assignTarget?.type === 'department' ? 'Department' : 'Sub-Department'}:{' '}
                <span className="font-semibold text-foreground">{assignTarget?.name}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Select Manager</Label>
              <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Remove Manager —</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                      {' — '}
                      {user.designation || (user.role || '').replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleAssign}>
              {selectedManagerId === 'none' ? 'Remove Manager' : 'Assign Manager'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
