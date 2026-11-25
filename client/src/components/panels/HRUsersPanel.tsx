import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Key, Users, ArrowRightLeft, TrendingUp, TrendingDown, Ban, CheckCircle2, UserMinus, UserCheck, Building2 } from 'lucide-react';
import { ListPagination } from '@/components/ui/list-pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  UserFormDialog,
  isStaffUser,
  type StaffUser as User,
  type Department,
  type SubDepartment,
  type DesignationOption,
} from '@/components/panels/UserFormDialog';
import { confirmDialog } from '@/lib/confirm';
import { isGiven, mayOn } from '@/lib/access';

export function HRUsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const { user: currentUser } = useAuth();
  // Added by an Org Admin: may only manage ordinary staff, so role and department moves are not offered
  const given = isGiven(currentUser, 'users');
  const mayCreate = mayOn(currentUser, 'users', 'create', true);
  const mayEdit = mayOn(currentUser, 'users', 'edit', true);
  const mayDelete = mayOn(currentUser, 'users', 'delete', true);
  const mayAppoint = !given || mayOn(currentUser, 'branches', 'edit', false);
  const isOrgAdmin = currentUser?.role === 'org_admin' || currentUser?.role === 'superadmin' || currentUser?.role === 'ceo';
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [transferData, setTransferData] = useState({
    departmentId: '',
    subDepartmentId: '',
    reason: '',
  });

  const [promotionData, setPromotionData] = useState({
    newDesignation: '',
    newRole: 'employee',
    reportingTo: '',
    type: 'promotion' as 'promotion' | 'demotion',
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [managerUser, setManagerUser] = useState<User | null>(null);
  const [managerBranchId, setManagerBranchId] = useState('');
  const [assigningManager, setAssigningManager] = useState(false);

  const [activeTab, setActiveTab] = useState('active');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchSubDepartments();
    fetchDesignations();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/org/branches');
      setBranches(res.data.data || []);
    } catch { /* non-critical */ }
  };

  useEffect(() => {
    // Fetch sub-departments when transfer department changes
    if (transferData.departmentId) {
      fetchSubDepartmentsByParent(transferData.departmentId);
    }
  }, [transferData.departmentId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      const allUsers = response.data.data || response.data || [];
      // Exclude top-level admin roles — everyone else is headcount
      setUsers(allUsers.filter((u: User) => isStaffUser(u, isOrgAdmin)));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchSubDepartments = async () => {
    try {
      const response = await api.get('/sub-departments');
      setSubDepartments(response.data.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch sub-departments:', error);
    }
  };

  const fetchDesignations = async () => {
    try {
      const response = await api.get('/org/designations');
      setDesignations(response.data.data || []);
    } catch (error) {
      // Designations may not exist yet — that's fine
    }
  };

  const fetchSubDepartmentsByParent = async (parentId: string) => {
    try {
      const response = await api.get(`/sub-departments?parentDeptId=${parentId}`);
      setSubDepartments(response.data.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch sub-departments:', error);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) return;

    try {
      const userId = selectedUser.id || selectedUser.id;
      await api.put(`/users/${userId}`, {
        departmentId: (transferData.departmentId && transferData.departmentId !== 'none') ? transferData.departmentId : undefined,
        subDepartmentId: (transferData.subDepartmentId && transferData.subDepartmentId !== 'none') ? transferData.subDepartmentId : undefined,
      });

      setTransferDialogOpen(false);
      setTransferData({ departmentId: '', subDepartmentId: '', reason: '' });
      setSelectedUser(null);
      fetchUsers();
      toast.success('Employee transferred successfully!');
    } catch (error) {
      console.error('Failed to transfer employee:', error);
      toast.error((error as any).response?.data?.message || 'Failed to transfer employee. Please try again.');
    }
  };

  const handlePromotionDemotion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) return;

    try {
      const userId = selectedUser.id || selectedUser.id;
      await api.put(`/users/${userId}`, {
        designation: promotionData.newDesignation,
        role: promotionData.newRole,
        reportingTo: (promotionData.reportingTo && promotionData.reportingTo !== 'none') ? promotionData.reportingTo : undefined,
      });

      setPromotionDialogOpen(false);
      setPromotionData({ newDesignation: '', newRole: 'employee', reportingTo: '', type: 'promotion' });
      setSelectedUser(null);
      fetchUsers();
      toast.success(`Employee ${promotionData.type === 'promotion' ? 'promoted' : 'demoted'} successfully!`);
    } catch (error) {
      console.error(`Failed to ${promotionData.type} employee:`, error);
      toast.error((error as any).response?.data?.message || `Failed to ${promotionData.type} employee. Please try again.`);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long!');
      return;
    }

    try {
      await api.put(`/users/${selectedUserId}`, {
        password: passwordData.newPassword,
      });
      setPasswordDialogOpen(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setSelectedUserId(null);
      toast.success('Password updated successfully!');
    } catch (error) {
      console.error('Failed to update password:', error);
      toast.error((error as any).response?.data?.message || 'Failed to update password. Please try again.');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!(await confirmDialog({ title: 'Delete user?', message: 'Are you sure you want to delete this user?', confirmText: 'Delete', tone: 'danger' }))) return;

    try {
      await api.delete(`/users/${userId}`);
      fetchUsers();
    } catch (error: any) {
      // DELETE_REQUESTED_NOT_COMPLETED means the server accepted the request (202)
      // and it's pending approval — the toast is already shown, so suppress the alert.
      if (error?.message === 'DELETE_REQUESTED_NOT_COMPLETED' || error?.isDeleteRequest) return;
      console.error('Failed to delete user:', error);
      toast.error((error as any).response?.data?.message || 'Failed to delete user. Please try again.');
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      const userId = user.id || user.id;
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      if (!(await confirmDialog({ title: newStatus === 'active' ? 'Activate user?' : 'Suspend user?', message: `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'suspend'} this user?`, confirmText: newStatus === 'active' ? 'Activate' : 'Suspend', tone: newStatus === 'active' ? 'default' : 'danger' }))) {
        return;
      }
      await api.put(`/users/${userId}`, { status: newStatus });
      fetchUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      toast.error((error as any).response?.data?.message || 'Failed to update user status. Please try again.');
    }
  };

  const handleResign = async (user: any) => {
    const newStatus = user.status === 'resigned' ? 'active' : 'resigned';
    const action = newStatus === 'resigned' ? 'resign' : 're-activate';
    try {
      const userId = user.id || user.id;
      if (!(await confirmDialog({ title: newStatus === 'resigned' ? 'Resign employee?' : 'Re-activate employee?', message: `Are you sure you want to ${action} this employee?`, confirmText: newStatus === 'resigned' ? 'Resign' : 'Re-activate', tone: newStatus === 'resigned' ? 'danger' : 'default' }))) {
        return;
      }
      await api.put(`/users/${userId}`, { status: newStatus });
      fetchUsers();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      toast.error((error as any).response?.data?.message || 'Failed to process action. Please try again.');
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const openManagerDialog = (user: User) => {
    setManagerUser(user);
    setManagerBranchId(branches.some((b) => b.id === user.branchId) ? user.branchId! : '');
    fetchBranches();
  };

  const targetBranch = branches.find((b) => b.id === managerBranchId);
  const alreadyManages = branches.find((b) => managerUser && b.branchManagerId === managerUser.id);

  const handleAssignManager = async () => {
    if (!managerUser || !targetBranch) return;
    setAssigningManager(true);
    try {
      await api.patch(`/org/branches/${targetBranch.id}/manager`, { userId: managerUser.id });
      setManagerUser(null);
      fetchBranches();
      fetchUsers();
      toast.success(`${managerUser.name} is now the manager of ${targetBranch.name}.`);
    } catch (error: any) {
      console.error('Failed to assign branch manager:', error);
      toast.error(error.response?.data?.message || 'Failed to assign branch manager. Please try again.');
    } finally {
      setAssigningManager(false);
    }
  };

  const openTransferDialog = (user: User) => {
    setSelectedUser(user);
    setTransferData({
      departmentId: user.departmentId || '',
      subDepartmentId: user.subDepartmentId || '',
      reason: '',
    });
    setTransferDialogOpen(true);
  };

  const openPromotionDialog = (user: User, type: 'promotion' | 'demotion') => {
    setSelectedUser(user);
    setPromotionData({
      newDesignation: user.designation || '',
      newRole: user.role,
      reportingTo: user.reportingTo || '',
      type,
    });
    setPromotionDialogOpen(true);
  };

  const openPasswordDialog = (userId: string) => {
    setSelectedUserId(userId);
    setPasswordData({ newPassword: '', confirmPassword: '' });
    setPasswordDialogOpen(true);
  };

  const getRoleBadgeColor = (_role: string) => 'bg-white text-slate-700 border-0 rounded-full px-3 capitalize';

  const displayedUsers = users.filter((user) => {
    const isResigned = user.status === 'resigned';
    if (activeTab === 'active' && isResigned) return false;
    if (activeTab === 'resigned' && !isResigned) return false;

    if (selectedBranchFilter === 'all') return true;
    const empBranchId = typeof user.branchId === 'object' ? (user.branchId as any)?.id : (user.branchId || (user as any).branch?.id);
    return empBranchId?.toString() === selectedBranchFilter;
  });
  const currentPage = Math.min(page, Math.max(1, Math.ceil(displayedUsers.length / pageSize)));
  const pagedUsers = displayedUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return (
      <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />)}</div>
    );
  }

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">User Management</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Manage all staff accounts — HR, Finance, Ops, Sales, and Employees</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {branches.length > 0 && (
            <div className="w-48 sm:w-56">
              <Select value={selectedBranchFilter} onValueChange={(v) => { setSelectedBranchFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full h-11 rounded-full px-5 bg-white border-slate-200 font-semibold">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {mayCreate && (
            <Button
              onClick={() => { setEditingUser(null); setDialogOpen(true); }}
              className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Employee User
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-5">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }} className="mb-6">
          <TabsList className="h-auto bg-[#f4f6f3] p-1.5 rounded-full gap-1 w-fit">
            <TabsTrigger value="active" className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Active Staff</TabsTrigger>
            <TabsTrigger value="resigned" className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Resigned Staff</TabsTrigger>
          </TabsList>
        </Tabs>

        {displayedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="w-14 h-14 bg-[#eaf6e6] text-[#256c1d] rounded-2xl mb-3 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">No users found in this category.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pagedUsers
              .map((user) => {
                const userId = user.id || user.id || '';
                return (
                  <div
                    key={userId}
                    className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg text-slate-900">{user.name}</h3>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                        {user.branchId && (
                          <Badge variant="outline" className="border-0 rounded-full px-3 text-[#256c1d] bg-[#dff3da]">
                            {user.branch?.name || (typeof user.branchId === 'object' ? (user.branchId as any)?.name : 'Assigned to Branch')}
                          </Badge>
                        )}
                        {user.status === 'inactive' && (
                          <Badge variant="outline" className="border-0 rounded-full px-3 bg-amber-100 text-amber-700">
                            Inactive
                          </Badge>
                        )}
                        {user.status === 'resigned' && (
                          <Badge variant="outline" className="border-0 rounded-full px-3 bg-red-100 text-red-700">
                            Resigned
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                      {user.biometricId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Biometric ID: {user.biometricId}
                        </p>
                      )}
                      {user.designation && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Designation: {user.designation}
                        </p>
                      )}
                      {user.department && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Department: {user.department.name}
                          {user.subDepartment && ` → ${user.subDepartment.name}`}
                        </p>
                      )}
                      {user.additionalDepartments && user.additionalDepartments.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Also: {user.additionalDepartments.map((d: any) => d.name || d).join(', ')}
                        </p>
                      )}
                      {user.reportingToUser && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reports to: {user.reportingToUser.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap xl:justify-end pt-3 xl:pt-0 border-t border-slate-200/70 xl:border-none">
                      {!given && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"
                          onClick={() => openTransferDialog(user)}
                          title="Transfer Employee"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                      )}
                      {!given && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"
                          onClick={() => openPromotionDialog(user, 'promotion')}
                          title="Promote Employee"
                        >
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                      )}
                      {!given && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"
                          onClick={() => openPromotionDialog(user, 'demotion')}
                          title="Demote Employee"
                        >
                          <TrendingDown className="w-4 h-4" />
                        </Button>
                      )}
                      {mayAppoint && branches.length > 0 && user.status !== 'resigned' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"
                          onClick={() => openManagerDialog(user)}
                          title="Assign as Branch Manager"
                        >
                          <Building2 className="w-4 h-4" />
                        </Button>
                      )}
                      {mayEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"
                          onClick={() => openPasswordDialog(userId)}
                          title="Change Password"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                      )}
                      {mayEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"
                          onClick={() => openEditDialog(user)}
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {mayEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(user)}
                          title={user.status === 'active' ? 'Suspend User' : 'Activate User'}
                          className={`h-10 w-10 p-0 rounded-full bg-white ${user.status === 'active' ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-[#256c1d] border-[#cfe9c9] hover:bg-[#eaf6e6]'}`}
                        >
                          {user.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </Button>
                      )}
                      {mayEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResign(user)}
                          title={user.status === 'resigned' ? 'Re-activate Employee' : 'Resign Employee'}
                          className={`h-10 w-10 p-0 rounded-full bg-white ${user.status === 'resigned' ? 'text-sky-600 border-sky-200 hover:bg-sky-50' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
                        >
                          {user.status === 'resigned' ? <UserCheck className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                        </Button>
                      )}
                      {mayDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0 rounded-full bg-white text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleDelete(userId)}
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            <ListPagination total={displayedUsers.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
          </div>
        )}
      </div>

      <UserFormDialog
        open={dialogOpen}
        editingUser={editingUser}
        onClose={() => { setDialogOpen(false); setEditingUser(null); }}
        onSaved={() => fetchUsers()}
      />

      {/* Branch Manager Dialog */}
      <Dialog open={!!managerUser} onOpenChange={(open) => { if (!open) setManagerUser(null); }}>
        <DialogContent className="sm:max-w-[450px] wizard-form border-0 rounded-[2rem] bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Assign Branch Manager</DialogTitle>
            <p className="text-sm text-muted-foreground">Make {managerUser?.name} the manager of a branch.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Branch</Label>
              <Select value={managerBranchId} onValueChange={setManagerBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} {b.branchManager?.name ? `(manager: ${b.branchManager.name})` : '(vacant)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {alreadyManages ? (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-2xl p-3">
                {managerUser?.name} already manages {alreadyManages.name}. A person can manage only one branch.
              </p>
            ) : targetBranch && (
              <p className="text-sm text-slate-600 bg-[#f4f6f3] rounded-2xl p-3">
                {targetBranch.branchManager?.name ? `${targetBranch.branchManager.name} will be replaced. ` : ''}
                {managerUser?.name} will be moved to {targetBranch.name} and will see the Branch Manager menu.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setManagerUser(null)}>Cancel</Button>
              <Button type="button" onClick={handleAssignManager} disabled={!targetBranch || !!alreadyManages || assigningManager}>
                {assigningManager ? 'Assigning...' : 'Assign Manager'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px] wizard-form border-0 rounded-[2rem] overflow-hidden p-0 gap-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader className="bg-[#f4f6f3] p-6 border-b border-slate-100 m-0 space-y-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center">
                <Key className="w-5 h-5 text-[#256c1d]" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-semibold tracking-tight">Change Password</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 font-normal">Securely update credentials</p>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6">
            <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password" autoComplete="new-password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password" autoComplete="new-password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                minLength={6}
                placeholder="Re-enter password"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPasswordDialogOpen(false);
                  setPasswordData({ newPassword: '', confirmPassword: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-full shadow-sm">Update Password</Button>
            </div>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Employee Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-[450px] wizard-form border-0 rounded-[2rem] overflow-hidden p-0 gap-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader className="bg-[#f4f6f3] p-6 border-b border-slate-100 m-0 space-y-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <ArrowRightLeft className="w-5 h-5 text-blue-600 dark:text-blue-500" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-semibold tracking-tight">Transfer Employee</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 font-normal">Reassign to a new department</p>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6">
            {selectedUser && (
              <div className="mb-6 p-4 border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex flex-shrink-0 items-center justify-center text-blue-600 dark:text-blue-500 font-bold text-lg">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-base">{selectedUser.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Current: {selectedUser.department?.name || 'No Department'}
                  </p>
                </div>
              </div>
            )}
            <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <Label htmlFor="transferDepartment">New Department</Label>
              <Select
                value={transferData.departmentId}
                onValueChange={(value) => {
                  setTransferData({ ...transferData, departmentId: value, subDepartmentId: '' });
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id || dept.id} value={(dept.id || dept.id)!}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {transferData.departmentId && subDepartments.length > 0 && (
              <div>
                <Label htmlFor="transferSubDepartment">Sub-Department</Label>
                <Select
                  value={transferData.subDepartmentId}
                  onValueChange={(value) => setTransferData({ ...transferData, subDepartmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Sub-Department</SelectItem>
                    {subDepartments.map((subDept) => (
                      <SelectItem key={subDept.id || subDept.id} value={(subDept.id || subDept.id)!}>
                        {subDept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="transferReason">Reason for Transfer</Label>
              <Input
                id="transferReason"
                value={transferData.reason}
                onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTransferDialogOpen(false);
                  setTransferData({ departmentId: '', subDepartmentId: '', reason: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-full shadow-sm bg-blue-600 hover:bg-blue-700 text-white">Transfer Employee</Button>
            </div>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promotion/Demotion Dialog */}
      <Dialog open={promotionDialogOpen} onOpenChange={setPromotionDialogOpen}>
        <DialogContent className="sm:max-w-[450px] wizard-form border-0 rounded-[2rem] overflow-hidden p-0 gap-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader className="bg-[#f4f6f3] p-6 border-b border-slate-100 m-0 space-y-0">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${promotionData.type === 'promotion' ? "bg-green-500/10" : "bg-orange-500/10"}`}>
                {promotionData.type === 'promotion' ? 
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-500" /> : 
                  <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                }
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {promotionData.type === 'promotion' ? 'Promote' : 'Demote'} Employee
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 font-normal">Update designation and role</p>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6">
            {selectedUser && (
              <div className={`mb-6 p-4 border rounded-xl flex items-center gap-4 ${promotionData.type === 'promotion' ? "border-green-100 dark:border-green-900/50 bg-green-50/50 dark:bg-green-900/10" : "border-orange-100 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-900/10"}`}>
                <div className={`w-12 h-12 rounded-full flex flex-shrink-0 items-center justify-center font-bold text-lg ${promotionData.type === 'promotion' ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-500" : "bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-500"}`}>
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-base">{selectedUser.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${promotionData.type === 'promotion' ? "bg-green-500" : "bg-orange-500"}`}></span> 
                    Current: {selectedUser.designation || 'No Designation'} ({selectedUser.role})
                  </p>
                </div>
              </div>
            )}
            <form onSubmit={handlePromotionDemotion} className="space-y-4">
            <div>
              <Label htmlFor="newDesignation">New Designation</Label>
              {designations.length > 0 ? (
                <Select
                  value={promotionData.newDesignation}
                  onValueChange={(value) => setPromotionData({ ...promotionData, newDesignation: value })}
                >
                  <SelectTrigger className="truncate">
                    <SelectValue placeholder="Select from org chart..." className="truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.map(d => {
                      const filled = d.filledBy?.length || 0;
                      const vacant = d.maxHeadcount - filled;
                      const label = `${d.title}${d.departmentId ? ` — ${d.departmentId.name}` : ''}${vacant <= 0 ? ' (Full)' : ` (${vacant} open)`}`;
                      return (
                        <SelectItem key={d.id} value={d.title}>
                          <span className="block max-w-[340px] truncate">{label}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="newDesignation"
                  value={promotionData.newDesignation}
                  onChange={(e) => setPromotionData({ ...promotionData, newDesignation: e.target.value })}
                  required
                  placeholder="e.g., Senior Manager, Team Lead"
                />
              )}
            </div>
            <div>
              <Label htmlFor="newRole">New Role</Label>
              <Select
                value={promotionData.newRole}
                onValueChange={(value) => setPromotionData({ ...promotionData, newRole: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee / Staff</SelectItem>
                  <SelectItem value="hr_admin">HR Admin</SelectItem>
                  <SelectItem value="hr_sub_admin">HR Sub Admin</SelectItem>
                  <SelectItem value="finance_admin">Finance Admin</SelectItem>
                  <SelectItem value="finance_sub_admin">Finance Sub Admin</SelectItem>
                  <SelectItem value="ops_admin">Operations Admin</SelectItem>
                  <SelectItem value="ops_sub_admin">Operations Sub-Admin</SelectItem>
                  <SelectItem value="sales_admin">Sales Admin</SelectItem>
                  <SelectItem value="sales_sub_admin">Sales Sub Admin</SelectItem>
                  <SelectItem value="collections_admin">Collections Admin</SelectItem>
                  {isOrgAdmin && <SelectItem value="center_admin">Center Admin</SelectItem>}
                  <SelectItem value="general_manager">General Manager</SelectItem>
                  <SelectItem value="branch_manager">Branch Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="newReportingTo">Reports To</Label>
              <Select
                value={promotionData.reportingTo}
                onValueChange={(value) => setPromotionData({ ...promotionData, reportingTo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reporting manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {users.filter(u => (u.id || u.id) !== (selectedUser?.id || selectedUser?.id)).map((user) => (
                    <SelectItem key={user.id || user.id} value={(user.id || user.id)!}>
                      {user.name} {user.designation ? `(${user.designation})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPromotionDialogOpen(false);
                  setPromotionData({ newDesignation: '', newRole: 'employee', reportingTo: '', type: 'promotion' });
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className={`rounded-full shadow-sm text-white ${promotionData.type === 'promotion' ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}`}>
                {promotionData.type === 'promotion' ? 'Promote' : 'Demote'} Employee
              </Button>
            </div>
          </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
