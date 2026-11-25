import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Building2, 
  Shield, 
  Search, 
  Filter, 
  Layers, 
  Users as UsersIcon, 
  CheckCircle2, 
  X, 
  MoreVertical,
  Briefcase,
  Phone,
  Mail,
  Fingerprint,
  ChevronRight,
  School,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  organizationId?: any;
  departmentId?: any;
  organization?: { id: string; name: string };
  department?: { id: string; name: string; type?: string };
  biometricId?: string;
  designation?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  customLoginSlug?: string | null;
}

export interface Department {
  id: string;
  name: string;
  type?: string;
  organizationId?: any;
}

// Role meta & badge coloring
export const ROLE_CONFIG: Record<string, { label: string; category: string; badgeClass: string }> = {
  superadmin: { label: 'Superadmin', category: 'Executive', badgeClass: 'bg-lime-600 text-white' },
  org_admin: { label: 'Org Admin', category: 'Executive', badgeClass: 'bg-emerald-600 text-white' },
  ceo: { label: 'Chief Executive (CEO)', category: 'Executive', badgeClass: 'bg-green-600 text-white' },
  general_manager: { label: 'General Manager', category: 'Executive', badgeClass: 'bg-green-500 text-white' },
  branch_manager: { label: 'Branch Manager', category: 'Executive', badgeClass: 'bg-teal-600 text-white' },
  hr_admin: { label: 'HR Admin', category: 'Human Resources', badgeClass: 'bg-orange-600 text-white' },
  hr_sub_admin: { label: 'HR Sub Admin', category: 'Human Resources', badgeClass: 'bg-orange-500 text-white' },
  finance_admin: { label: 'Finance Admin', category: 'Finance', badgeClass: 'bg-emerald-600 text-white' },
  finance_sub_admin: { label: 'Finance Sub Admin', category: 'Finance', badgeClass: 'bg-emerald-500 text-white' },
  ops_admin: { label: 'Operations Admin', category: 'Operations', badgeClass: 'bg-teal-600 text-white' },
  ops_sub_admin: { label: 'Operations Sub Admin', category: 'Operations', badgeClass: 'bg-teal-500 text-white' },
  faculty: { label: 'Faculty / Instructor', category: 'Operations', badgeClass: 'bg-teal-600 text-white' },
  sales_admin: { label: 'Sales Admin', category: 'Sales & Growth', badgeClass: 'bg-pink-600 text-white' },
  sales_sub_admin: { label: 'Sales Sub Admin', category: 'Sales & Growth', badgeClass: 'bg-pink-500 text-white' },
  sales: { label: 'Sales Executive', category: 'Sales & Growth', badgeClass: 'bg-rose-500 text-white' },
  academic_counselor: { label: 'Academic Counselor', category: 'Sales & Growth', badgeClass: 'bg-amber-600 text-white' },
  collections_admin: { label: 'Collections Admin', category: 'Finance', badgeClass: 'bg-lime-600 text-white' },
  center_admin: { label: 'Academic Partner Admin', category: 'Academic Partners', badgeClass: 'bg-amber-500 text-white' },
  study_abroad_admin: { label: 'Study Abroad Partner Admin', category: 'Study Abroad Partners', badgeClass: 'bg-teal-600 text-white' },
  employee: { label: 'Employee', category: 'Workforce', badgeClass: 'bg-slate-600 text-white' },
};

const getInitials = (name?: string): string => {
  if (!name) return 'US';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Partner logins belong to their partner record, so they're edited from the partner pages.
const MANAGED_ELSEWHERE: Record<string, string> = {
  center_admin: 'Manage via Academic Partners',
  study_abroad_admin: 'Manage via Study Abroad Partners',
};

export function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Users are never loaded up front: the page starts with the user types (and their counts),
  // and opening a type or typing a search loads one page of users at a time.
  const PAGE_SIZE = 12;
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string | null>(null); // a user type (role) opened from the overview
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const listMode = selectedRole !== null || debouncedSearch !== '';
  const totalPages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));

  // Dialog & Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    designation: '',
    role: 'employee',
    organizationId: '',
    departmentId: '',
    biometricId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Organizations, departments and the number of users of each type (no user rows)
  const fetchData = async () => {
    try {
      setLoading(true);
      const [orgsRes, deptsRes, countsRes] = await Promise.all([
        api.get('/organizations'),
        api.get('/departments'),
        api.get('/users/stats/departments'),
      ]);
      setOrganizations(orgsRes.data.data || []);
      setDepartments(deptsRes.data.data || []);
      const counts: Record<string, number> = {};
      (countsRes.data.roles || []).forEach((c: any) => { counts[c.role] = c.count; });
      setRoleCounts(counts);
      setTotalUsers(countsRes.data.total || 0);
    } catch (error: any) {
      toast.error('Failed to fetch users data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Filters change the result set, so go back to the first page
  useEffect(() => {
    setPage(1);
  }, [selectedRole, debouncedSearch, selectedRoleFilter]);

  // One page of users, only once a department is opened or a search is typed
  useEffect(() => {
    if (!listMode) { setUsers([]); setListTotal(0); return; }
    let cancelled = false;
    (async () => {
      try {
        setListLoading(true);
        const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (selectedRole && !debouncedSearch) params.set('role', selectedRole);
        else if (selectedRoleFilter !== 'all') params.set('role', selectedRoleFilter);
        const res = await api.get(`/users?${params.toString()}`);
        if (cancelled) return;
        setUsers(res.data.data || []);
        setListTotal(res.data.total || 0);
      } catch (error) {
        if (!cancelled) toast.error('Failed to load users');
        console.error(error);
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listMode, selectedRole, debouncedSearch, selectedRoleFilter, page, reloadKey]);

  const refreshAfterChange = () => {
    fetchData();
    setReloadKey((k) => k + 1);
  };

  // Helper to safely extract Organization ID and Name
  const getUserOrgId = (user: User): string => {
    if (typeof user.organizationId === 'string' && user.organizationId) return user.organizationId;
    if (user.organizationId?.id) return user.organizationId.id;
    if (user.organization?.id) return user.organization.id;
    return 'unassigned';
  };

  const getUserOrgName = (user: User): string => {
    if (user.organization?.name) return user.organization.name;
    if (user.organizationId?.name) return user.organizationId.name;
    const orgId = getUserOrgId(user);
    const found = organizations.find((o) => o.id === orgId);
    if (found) return found.name;
    return 'Global / System';
  };

  const getUserDeptName = (user: User): string => {
    if (user.department?.name) return user.department.name;
    if (user.departmentId?.name) return user.departmentId.name;
    const deptId = typeof user.departmentId === 'string' ? user.departmentId : user.departmentId?.id;
    const found = departments.find((d) => d.id === deptId);
    return found ? found.name : 'Unassigned';
  };

  // Dialog Handlers
  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      designation: '',
      role: 'employee',
      organizationId: organizations[0]?.id || '',
      departmentId: '',
      biometricId: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    const orgId = getUserOrgId(user);
    const deptId = typeof user.departmentId === 'string' ? user.departmentId : user.departmentId?.id || '';

    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      designation: user.designation || '',
      role: user.role || 'employee',
      organizationId: orgId === 'unassigned' ? '' : orgId,
      departmentId: deptId,
      biometricId: user.biometricId || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Please fill in required fields (Name and Email)');
      return;
    }

    try {
      setFormSubmitting(true);
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        phone: formData.phone.trim() || undefined,
        designation: formData.designation.trim() || undefined,
      };

      if (formData.organizationId) {
        payload.organizationId = formData.organizationId;
      }
      if (formData.departmentId) {
        payload.departmentId = formData.departmentId;
      } else {
        payload.departmentId = null;
      }

      if (formData.password) {
        payload.password = formData.password;
      }

      if (formData.biometricId?.trim()) {
        payload.biometricId = formData.biometricId.trim();
      }

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', payload);
        toast.success('User created successfully');
      }

      setIsDialogOpen(false);
      refreshAfterChange();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await api.delete(`/users/${deletingUser.id}`);
      toast.success('User removed successfully');
      setIsDeleteDialogOpen(false);
      refreshAfterChange();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  // Departments filtered by the selected organization in create/edit modal
  const departmentsForSelectedOrg = useMemo(() => {
    if (!formData.organizationId) return departments;
    return departments.filter((d) => {
      const dOrgId = typeof d.organizationId === 'string' ? d.organizationId : d.organizationId?.id;
      return dOrgId === formData.organizationId;
    });
  }, [departments, formData.organizationId]);

  if (loading) {
    return (
      <div className="space-y-6 p-2">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Render individual user card
  const renderUserCard = (user: User) => {
    const roleMeta = ROLE_CONFIG[user.role] || { label: user.role, category: 'Other', badgeClass: 'bg-slate-600 text-white' };
    const orgName = getUserOrgName(user);
    const deptName = getUserDeptName(user);
    const initials = getInitials(user.name);

    return (
      <Card
        key={user.id}
        className="group relative rounded-3xl gap-0 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between overflow-hidden"
      >
        <CardHeader className="px-6 pt-6 pb-4 relative z-10 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center font-semibold text-base">
                  {initials}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-card",
                    user.status === 'active' ? 'bg-[#54b947]' : 'bg-slate-400'
                  )}
                  title={user.status}
                />
              </div>

              <div className="min-w-0">
                <CardTitle className="text-base font-semibold text-foreground leading-snug line-clamp-1" title={user.name}>
                  {user.name}
                </CardTitle>
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  <Badge className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-full border-none", roleMeta.badgeClass)}>
                    {roleMeta.label}
                  </Badge>
                  {user.designation && (
                    <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                      {user.designation}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-5 space-y-2 text-xs text-muted-foreground relative z-10 flex-1">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#f4f6f3] dark:bg-muted/40">
            <Mail className="w-3.5 h-3.5 text-[#256c1d] shrink-0" />
            <span className="truncate font-medium text-foreground/90" title={user.email}>{user.email}</span>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#f4f6f3] dark:bg-muted/40">
            <Building2 className="w-3.5 h-3.5 text-[#256c1d] shrink-0" />
            <span className="truncate font-medium text-foreground/90" title={orgName}>{orgName}</span>
          </div>

          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-[#f4f6f3] dark:bg-muted/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <Shield className="w-3.5 h-3.5 text-[#256c1d] shrink-0" />
              <span className="truncate text-[11px]" title={deptName}>
                Dept: <span className="font-semibold text-foreground">{deptName}</span>
              </span>
            </div>
            {user.biometricId && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-white dark:bg-card px-2 py-0.5 rounded-full shrink-0">
                <Fingerprint className="w-3 h-3 text-amber-500" />
                PIN {user.biometricId}
              </span>
            )}
          </div>
        </CardContent>

        <div className="px-6 pb-6 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(user)}
            disabled={user.role in MANAGED_ELSEWHERE}
            className="flex-1 h-10 rounded-full text-xs font-semibold bg-white border-slate-200 hover:bg-[#eaf6e6] hover:text-[#256c1d]"
            title={MANAGED_ELSEWHERE[user.role] || "Edit User"}
          >
            <Edit className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(user)}
            disabled={user.role in MANAGED_ELSEWHERE}
            className="h-10 w-10 p-0 rounded-full bg-white border-slate-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
            title={MANAGED_ELSEWHERE[user.role] || "Delete User"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h1 className="flex items-center gap-3 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            User Administration
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#eaf6e6] dark:bg-emerald-500/10 text-[#256c1d] dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#54b947]" /> Multi-tenant RBAC
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Categorized directory of institutional leadership, administration, faculty, and operators across all tenants.
          </p>
        </div>

        <Button
          onClick={handleCreate}
          className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm shrink-0 self-start lg:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New User</span>
        </Button>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {[
          { label: 'Total users', value: totalUsers, sub: 'Across all user types', icon: UsersIcon },
          { label: 'User types', value: Object.keys(roleCounts).length, sub: 'Roles in use', icon: Shield },
          { label: 'Departments', value: departments.length, sub: 'Functional business units', icon: Briefcase },
          { label: 'Organizations', value: organizations.length, sub: 'Tenants', icon: Building2 },
        ].map(({ label, value, sub, icon: Icon }) => (
          <Card key={label} className="rounded-3xl gap-0">
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & filters */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all users by name, email, phone, designation or department..."
              className="pl-11 pr-9 h-11 rounded-full bg-white border-slate-200 shadow-sm text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {listMode && (
            <div className="flex flex-wrap items-center gap-2">
              {debouncedSearch && (
                <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
                  <SelectTrigger className="h-11 w-[200px] rounded-full text-sm bg-white border-slate-200 shadow-sm px-4">
                    <Shield className="w-3.5 h-3.5 mr-1.5 text-[#256c1d]" />
                    <SelectValue placeholder="All user types" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="all">All user types</SelectItem>
                    {Object.entries(ROLE_CONFIG).map(([roleKey, meta]) => (
                      <SelectItem key={roleKey} value={roleKey}>{meta.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="outline"
                onClick={() => { setSelectedRole(null); setSearchQuery(''); setSelectedRoleFilter('all'); }}
                className="h-11 px-5 rounded-full bg-white border-slate-200 text-sm font-medium gap-2 shadow-sm hover:bg-slate-50"
              >
                <Layers className="w-4 h-4" /> All user types
              </Button>
            </div>
          )}
        </div>

        {listMode && (
          <p className="text-xs text-muted-foreground">
            {debouncedSearch
              ? <>Search results for <strong className="text-foreground">"{debouncedSearch}"</strong></>
              : <>User type: <strong className="text-foreground">{ROLE_CONFIG[selectedRole || '']?.label || selectedRole}</strong></>}
            {' · '}
            <strong className="text-foreground">{listTotal.toLocaleString()}</strong> {listTotal === 1 ? 'user' : 'users'}
          </p>
        )}
      </div>

      {/* Main Content Area */}
      {!listMode ? (
        /* User types overview: users load only when a type is opened */
        Object.keys(roleCounts).length === 0 ? (
          <Card className="rounded-3xl border border-dashed border-slate-300 shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#f4f6f3] flex items-center justify-center text-muted-foreground">
                <UsersIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No users yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">Create a user to see them listed by type.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
            {Object.entries(roleCounts)
              .map(([role, count]) => ({ role, count, meta: ROLE_CONFIG[role] || { label: role.replace(/_/g, ' '), category: 'Other' } }))
              .sort((a, b) => b.count - a.count)
              .map(({ role, count, meta }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className="text-left rounded-3xl bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.10)] p-6 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-14px_rgba(16,24,40,0.18)] transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#54b947]/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#f1f3ef] text-slate-600 truncate max-w-[55%]">{meta.category}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground truncate" title={meta.label}>{meta.label}</h3>
                  <div className="mt-1 flex items-end justify-between">
                    <p className="text-sm text-muted-foreground">
                      <span className="text-2xl font-semibold text-foreground tracking-tight mr-1.5">{count.toLocaleString()}</span>
                      {count === 1 ? 'user' : 'users'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#256c1d]">
                      View users <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              ))}
          </div>
        )
      ) : listLoading && users.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-[#f4f6f3] animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card className="rounded-3xl border border-dashed border-slate-300 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#f4f6f3] flex items-center justify-center text-muted-foreground">
              <User className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">No users found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {debouncedSearch ? 'Try a different search term.' : 'There are no users of this type yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className={cn("grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 sm:gap-6 transition-opacity", listLoading && "opacity-50")}>
            {users.map((user) => renderUserCard(user))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, listTotal)} of {listTotal.toLocaleString()}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || listLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-9 rounded-full px-4 bg-white border-slate-200 gap-1"
              >
                <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Previous
              </Button>
              <span className="px-3 font-medium text-foreground tabular-nums">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || listLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-9 rounded-full px-4 bg-white border-slate-200 gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create / Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
              {editingUser ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground text-left">
                {editingUser ? 'Edit User' : 'Create New User'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground text-left">
                {editingUser
                  ? 'Update organizational assignment, credentials, and role permissions.'
                  : 'Provision a new team member or administrative account.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-7">
              {/* Account */}
              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-semibold">
                    Full name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-semibold">
                      Email address <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@organization.edu"
                      className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm font-semibold">Phone number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-semibold">
                    Password {editingUser ? <span className="font-normal text-muted-foreground">(leave blank to keep unchanged)</span> : <span className="text-rose-500">*</span>}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"
                    required={!editingUser}
                  />
                </div>
              </section>

              {/* Organization & role */}
              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organization &amp; role</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="organizationId" className="text-sm font-semibold">
                    Assigned organization <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={formData.organizationId}
                    onValueChange={(val) => setFormData({ ...formData, organizationId: val, departmentId: '' })}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-sm font-semibold">
                      Role &amp; permissions <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={formData.role}
                      onValueChange={(val) => setFormData({ ...formData, role: val })}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                      <SelectItem value="org_admin">Organization Admin</SelectItem>
                      <SelectItem value="ceo">Chief Executive (CEO)</SelectItem>
                      <SelectItem value="general_manager">General Manager</SelectItem>
                      <SelectItem value="branch_manager">Branch Manager</SelectItem>
                      <SelectItem value="hr_admin">HR Admin</SelectItem>
                      <SelectItem value="hr_sub_admin">HR Sub Admin</SelectItem>
                      <SelectItem value="finance_admin">Finance Admin</SelectItem>
                      <SelectItem value="finance_sub_admin">Finance Sub Admin</SelectItem>
                      <SelectItem value="ops_admin">Operations Admin</SelectItem>
                      <SelectItem value="ops_sub_admin">Operations Sub-Admin</SelectItem>
                      <SelectItem value="sales_admin">Sales Admin</SelectItem>
                      <SelectItem value="sales_sub_admin">Sales Sub Admin</SelectItem>
                      <SelectItem value="sales">Sales Executive</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Faculty accounts are created in the Faculties panel.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="departmentId" className="text-sm font-semibold">
                      Department <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Select
                      value={formData.departmentId || 'none'}
                      onValueChange={(val) => setFormData({ ...formData, departmentId: val === 'none' ? '' : val })}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="none">No Department</SelectItem>
                        {departmentsForSelectedOrg.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Details */}
              <section className="space-y-4 pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="designation" className="text-sm font-semibold">Designation / title</Label>
                    <Input
                      id="designation"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="e.g. Senior Academic Officer"
                      className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="biometricId" className="text-sm font-semibold">Biometric device PIN</Label>
                    <Input
                      id="biometricId"
                      value={formData.biometricId}
                      onChange={(e) => setFormData({ ...formData, biometricId: e.target.value })}
                      placeholder="e.g. 1042"
                      className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4 font-mono"
                    />
                  </div>
                </div>
              </section>
            </div>

            <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold"
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                disabled={formSubmitting}
              >
                {formSubmitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Delete User Account?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground space-y-2">
              <p>
                Are you sure you want to remove <strong className="text-foreground">{deletingUser?.name}</strong>?
              </p>
              <p className="p-2.5 rounded-xl bg-destructive/5 text-destructive border border-destructive/20 text-xs">
                This action will unlink the user from their assigned organization, departments, and active permissions.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="rounded-xl"
            >
              Confirm Deletion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
