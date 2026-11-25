import { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2, Mail, Phone, UserCircle, Users, UserPlus, Search, X, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { EmployeeProfilePanel } from '@/components/panels/EmployeeProfilePanel';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
export function EmployeesPanel() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();
  const isOrgAdmin = currentUser?.role === 'org_admin' || currentUser?.role === 'superadmin' || currentUser?.role === 'ceo';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'on_leave'>('all');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    departmentId: '',
    role: 'employee',
    designation: '',
    branchId: '',
    status: 'active'
  });

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/org/branches');
      setBranches(res.data.data || []);
    } catch { /* non-critical */ }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      // Filter out admin roles - HR should only see regular employees
      const allUsers = response.data.data || [];
      // Only exclude ceo and org_admin — all other roles (including *_admin) are employees
      // Also exclude resigned employees
      const employeesOnly = allUsers.filter((user: any) => {
        const role = user.role?.toLowerCase() || '';
        if (role === 'ceo' || role === 'org_admin' || role === 'student' || user.status === 'resigned') return false;
        if (role === 'center_admin' && !isOrgAdmin) return false;
        return true;
      });
      setEmployees(employeesOnly);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        departmentId: formData.departmentId || undefined,
        role: formData.role,
        designation: formData.designation,
        ...(editingId ? {} : { password: formData.password || 'password123' })
      };
      
      let userId = editingId;
      if (editingId) {
        await api.put(`/users/${editingId}`, payload);
      } else {
        const res = await api.post('/users', payload);
        userId = res.data.data?.id || res.data.data?.id;
      }

      // If a branch was selected, assign this user as branch manager
      if (formData.branchId && formData.branchId !== 'none' && userId) {
        await api.patch(`/org/branches/${formData.branchId}/manager`, { userId });
      }

      setDialogOpen(false);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      console.error('Failed to save employee:', error);
      alert(error.response?.data?.message || 'Failed to save employee');
    }
  };

  const handleEdit = (employee: any) => {
    const empId = employee.id || employee.id;
    const rawDept = employee.departmentId;
    const deptId = typeof rawDept === 'object' && rawDept !== null
      ? (rawDept.id || rawDept.id)
      : (rawDept || employee.department?.id || employee.department?.id);
    setEditingId(empId);
    setFormData({
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      password: '',
      departmentId: deptId?.toString() || '',
      role: employee.role || 'employee',
      designation: employee.designation || '',
      branchId: typeof employee.branchId === 'object' ? (employee.branchId?.id || '') : (employee.branchId || ''),
      status: employee.status || 'active'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchEmployees();
    } catch (error) {
      console.error('Failed to delete employee:', error);
    }
  };

  const openProfile = (id: string) => {
    setProfileUserId(id);
    setProfileOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      departmentId: '',
      role: 'employee',
      designation: '',
      branchId: '',
      status: 'active'
    });
  };

  const getStatusBadge = (status: string) => {
    const label = (status || 'active').replace('_', ' ');
    const styles: Record<string, string> = {
      active: 'bg-[#e3f7dd] text-[#1f6a17]',
      inactive: 'bg-slate-100 text-slate-600',
      on_leave: 'bg-amber-50 text-amber-700',
    };
    const dots: Record<string, string> = { active: 'bg-[#54b947]', inactive: 'bg-slate-400', on_leave: 'bg-amber-500' };
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize', styles[status] || styles.active)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', dots[status] || dots.active)} /> {label}
      </span>
    );
  };

  const branchIdOf = (emp: any) => (typeof emp.branchId === 'object' ? emp.branchId?.id : emp.branchId)?.toString();

  const visibleEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees
      .filter(emp => emp && emp.id)
      .filter(emp => selectedBranchFilter === 'all' || branchIdOf(emp) === selectedBranchFilter)
      .filter(emp => statusFilter === 'all' || (emp.status || 'active') === statusFilter)
      .filter(emp => !q || [emp.name, emp.email, emp.phone, emp.role, emp.designation, emp.department?.name].some((v: any) => (v || '').toString().toLowerCase().includes(q)));
  }, [employees, searchQuery, statusFilter, selectedBranchFilter]);

  const statusCounts = useMemo(() => ({
    all: employees.length,
    active: employees.filter(e => (e.status || 'active') === 'active').length,
    inactive: employees.filter(e => e.status === 'inactive').length,
    on_leave: employees.filter(e => e.status === 'on_leave').length,
  }), [employees]);

  return (
    <div className="space-y-6">
      <EmployeeProfilePanel
        userId={profileUserId}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Employee Directory</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Manage employee records and information</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm shrink-0 self-start lg:self-auto">
              <UserPlus className="w-4 h-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col">
            <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                {editingId ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              </div>
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground text-left">{editingId ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground text-left">Update the employee's details and roles</DialogDescription>
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-7">
                <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</h3>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Full name</Label>
                    <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Email</Label>
                      <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Phone</Label>
                      <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                  </div>
                  {!editingId && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Password</Label>
                      <Input
                        className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"
                        type="password" autoComplete="new-password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Leave blank to use default (password123)"
                      />
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role &amp; placement</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Role</Label>
                      <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                        <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="employee">Employee / Staff</SelectItem>
                          <SelectItem value="hr_admin">HR Admin</SelectItem>
                          <SelectItem value="hr_sub_admin">HR Sub Admin</SelectItem>
                          <SelectItem value="finance_admin">Finance Admin</SelectItem>
                          <SelectItem value="finance_sub_admin">Finance Sub Admin</SelectItem>
                          <SelectItem value="ops_admin">Operations Admin</SelectItem>
                          <SelectItem value="ops_sub_admin">Operations Sub-Admin</SelectItem>
                          <SelectItem value="sales_admin">Sales Admin</SelectItem>
                          <SelectItem value="sales_sub_admin">Sales Sub Admin</SelectItem>
                          {isOrgAdmin && <SelectItem value="center_admin">Center Admin</SelectItem>}
                          <SelectItem value="general_manager">General Manager</SelectItem>
                          <SelectItem value="branch_manager">Branch Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Designation</Label>
                      <Input
                        className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"
                        value={formData.designation}
                        onChange={(e) => setFormData({...formData, designation: e.target.value})}
                        placeholder="e.g. Branch Manager, CFO"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Department</Label>
                      <Select value={formData.departmentId} onValueChange={(value) => setFormData({...formData, departmentId: value})}>
                        <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {departments.filter(dept => dept && dept.id).map((dept) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Status</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                        <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="on_leave">On Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Branch assignment — makes this user the branch manager */}
                  {branches.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Assign as branch manager <span className="font-normal text-muted-foreground">(optional)</span></Label>
                      <Select value={formData.branchId} onValueChange={(value) => setFormData({...formData, branchId: value})}>
                        <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4">
                          <SelectValue placeholder="Select branch to manage" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="none">— None —</SelectItem>
                          {branches.map((b: any) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name} ({b.code})
                              {b.branchManagerId ? ' · has manager' : ' · vacant'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.branchId && formData.branchId !== 'none' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          This user will be assigned as the branch manager and get access to all branch departments.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </div>

              <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
                <Button type="button" variant="ghost" className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold">Save Employee</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {[
          { label: 'Total employees', value: statusCounts.all, icon: Users },
          { label: 'Active', value: statusCounts.active, icon: UserCircle },
          { label: 'On leave or inactive', value: statusCounts.on_leave + statusCounts.inactive, icon: UserPlus },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-3xl gap-0">
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="text-3xl font-semibold tracking-tight mt-1">{value.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative w-full lg:max-w-md">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, role or department..."
            className="pl-11 pr-9 h-11 rounded-full bg-white border-slate-200 shadow-sm text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {branches.length > 0 && (
            <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
              <SelectTrigger className="h-11 w-[200px] rounded-full text-sm bg-white border-slate-200 shadow-sm px-4">
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-[#256c1d]" />
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {([
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'on_leave', label: 'On leave' },
            { id: 'inactive', label: 'Inactive' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn('px-4 py-2 rounded-full text-xs font-semibold transition-colors', statusFilter === f.id ? 'bg-[#0b1d14] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}
            >
              {f.label} ({statusCounts[f.id]})
            </button>
          ))}
        </div>
      </div>

      {/* Directory */}
      <Card className="rounded-3xl gap-0 overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          {loading ? (
            <div className="space-y-3 p-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-2xl bg-[#f4f6f3] animate-pulse" />)}
            </div>
          ) : visibleEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <span className="w-14 h-14 rounded-full bg-[#f4f6f3] flex items-center justify-center mb-3"><Users className="w-6 h-6 opacity-50" /></span>
              <p className="text-sm font-medium text-foreground">{employees.length === 0 ? 'No employees found.' : 'No employees match your filters.'}</p>
            </div>
          ) : (
            <div>
              {visibleEmployees.map((employee) => {
                const empId = employee.id;
                const deptName = employee.department?.name || (typeof employee.departmentId === 'object' ? employee.departmentId?.name : '');
                const branchName = employee.branch?.name || (typeof employee.branchId === 'object' ? employee.branchId?.name : employee.branchId ? 'Assigned to Branch' : '');
                return (
                  <div
                    key={empId}
                    className="group flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-4 sm:px-5 py-4 rounded-2xl hover:bg-[#f4f6f3] transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center font-semibold text-lg shrink-0">
                        {(employee.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-base text-foreground truncate">{employee.name || 'Unknown'}</p>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1">
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#f1f3ef] text-slate-600 capitalize">
                            {(employee.role || '').replace(/_/g, ' ')}{employee.designation ? ` · ${employee.designation}` : ''}
                          </span>
                          {deptName && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#e3f7dd] text-[#1f6a17]">{deptName}</span>}
                          {branchName && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">{branchName}</span>}
                        </div>
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                          <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {employee.email}</span>
                          {employee.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {employee.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap xl:justify-end shrink-0">
                      <div className="mr-2">{getStatusBadge(employee.status)}</div>
                      <button onClick={() => openProfile(empId)} title="View Profile" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-[#eaf6e6] hover:text-[#256c1d] transition-colors">
                        <UserCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(employee)} title="Edit Employee" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-[#eaf6e6] hover:text-[#256c1d] transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(empId)} title="Delete Employee" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
