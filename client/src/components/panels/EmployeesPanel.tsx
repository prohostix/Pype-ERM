import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Mail, Phone, UserCircle, Users, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
    const variants: any = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      on_leave: 'bg-yellow-100 text-yellow-800'
    };
    return <Badge className={variants[status] || ''}>{status?.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <EmployeeProfilePanel
        userId={profileUserId}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-md rounded-2xl overflow-hidden bg-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 border-b border-border/40 py-5 px-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Employee Directory</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage employee records and information
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {branches.length > 0 && (
              <div className="w-48 sm:w-56">
                <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
                  <SelectTrigger className="w-full h-9">
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
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 rounded-full shadow-sm px-4">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-2xl p-0 gap-0">
                <DialogHeader className="bg-muted/30 p-6 border-b border-border/40 m-0 space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      {editingId ? <Edit className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="text-left">
                      <DialogTitle className="text-xl font-bold">{editingId ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                      <p className="text-xs text-muted-foreground mt-0.5 font-normal">Update the employee's details and roles</p>
                    </div>
                  </div>
                </DialogHeader>
                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input className="mt-1" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input className="mt-1" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input className="mt-1" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    {!editingId && (
                      <div>
                        <Label>Password</Label>
                        <Input
                          className="mt-1"
                          type="password" autoComplete="new-password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          placeholder="Leave blank to use default (password123)"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Role</Label>
                        <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                            {isOrgAdmin && <SelectItem value="center_admin">Center Admin</SelectItem>}
                            <SelectItem value="general_manager">General Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Designation</Label>
                        <Input
                          className="mt-1"
                          value={formData.designation}
                          onChange={(e) => setFormData({...formData, designation: e.target.value})}
                          placeholder="e.g. Branch Manager, CFO"
                        />
                      </div>
                    </div>
                    {/* Branch assignment — makes this user the branch manager */}
                    {branches.length > 0 && (
                      <div>
                        <Label>Assign as Branch Manager (optional)</Label>
                        <Select value={formData.branchId} onValueChange={(value) => setFormData({...formData, branchId: value})}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select branch to manage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— None —</SelectItem>
                            {branches.map((b: any) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name} ({b.code})
                                {b.branchManagerId ? ' · has manager' : ' · vacant'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formData.branchId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            This user will be assigned as the branch manager and get access to all branch departments.
                          </p>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Department</Label>
                        <Select value={formData.departmentId} onValueChange={(value) => setFormData({...formData, departmentId: value})}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.filter(dept => dept && (dept.id || dept.id)).map((dept) => (
                              <SelectItem key={dept.id || dept.id} value={(dept.id || dept.id).toString()}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="on_leave">On Leave</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/40">
                      <Button type="button" className="rounded-full px-6" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" className="rounded-full px-6 shadow-sm">Save Employee</Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border/60">
              <div className="flex justify-center mb-4">
                <Users className="w-8 h-8 opacity-40 animate-pulse" />
              </div>
              Loading employees...
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-2xl border border-dashed border-border/60 bg-muted/10">
              <div className="p-4 bg-muted/30 rounded-full mb-4">
                <Users className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm font-medium">No employees found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {employees
                .filter(emp => emp && (emp.id || emp.id))
                .filter(emp => {
                  if (selectedBranchFilter === 'all') return true;
                  const empBranchId = typeof emp.branchId === 'object' ? emp.branchId?.id : emp.branchId;
                  return empBranchId?.toString() === selectedBranchFilter;
                })
                .map((employee) => {
                  const empId = employee.id || employee.id;
                  return (
                    <div
                      key={empId}
                      className="flex flex-col xl:flex-row xl:items-center justify-between p-6 border border-slate-200/60 dark:border-slate-800/60 rounded-xl hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:bg-muted/20 transition-all duration-300 group bg-card gap-6"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xl text-primary flex-shrink-0">
                          {(employee.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-base mb-1.5">{employee.name || 'Unknown'}</div>
                          <div className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground mb-2">
                            <Badge variant="outline" className="font-medium bg-card">
                              {employee.role}{employee.designation ? ` · ${employee.designation}` : ''}
                            </Badge>
                            {employee.department && (
                              <Badge variant="outline" className="font-medium border-primary/20 text-primary bg-primary/5">
                                {employee.department?.name || (typeof employee.departmentId === 'object' ? employee.departmentId?.name : '')}
                              </Badge>
                            )}
                            {employee.branchId && (
                              <Badge variant="outline" className="font-medium border-blue-500/20 text-blue-600 bg-blue-500/5">
                                {employee.branch?.name || (typeof employee.branchId === 'object' ? employee.branchId?.name : 'Assigned to Branch')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center flex-wrap gap-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 opacity-70" /> {employee.email}
                            </span>
                            {employee.phone && (
                              <span className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 opacity-70" /> {employee.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap xl:justify-end opacity-60 group-hover:opacity-100 transition-opacity mt-4 xl:mt-0 pt-4 xl:pt-0 border-t border-border/50 xl:border-none">
                        <div className="mr-3">
                          {getStatusBadge(employee.status)}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openProfile(empId)} title="View Profile">
                          <UserCircle className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(employee)} title="Edit Employee">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(empId)} title="Delete Employee">
                          <Trash2 className="w-4 h-4" />
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
