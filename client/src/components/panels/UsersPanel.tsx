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
  superadmin: { label: 'Superadmin', category: 'Executive', badgeClass: 'bg-purple-600 text-white' },
  org_admin: { label: 'Org Admin', category: 'Executive', badgeClass: 'bg-blue-600 text-white' },
  ceo: { label: 'Chief Executive (CEO)', category: 'Executive', badgeClass: 'bg-indigo-600 text-white' },
  general_manager: { label: 'General Manager', category: 'Executive', badgeClass: 'bg-indigo-500 text-white' },
  branch_manager: { label: 'Branch Manager', category: 'Executive', badgeClass: 'bg-sky-600 text-white' },
  hr_admin: { label: 'HR Admin', category: 'Human Resources', badgeClass: 'bg-orange-600 text-white' },
  hr_sub_admin: { label: 'HR Sub Admin', category: 'Human Resources', badgeClass: 'bg-orange-500 text-white' },
  finance_admin: { label: 'Finance Admin', category: 'Finance', badgeClass: 'bg-emerald-600 text-white' },
  finance_sub_admin: { label: 'Finance Sub Admin', category: 'Finance', badgeClass: 'bg-emerald-500 text-white' },
  ops_admin: { label: 'Operations Admin', category: 'Operations', badgeClass: 'bg-cyan-600 text-white' },
  ops_sub_admin: { label: 'Operations Sub Admin', category: 'Operations', badgeClass: 'bg-cyan-500 text-white' },
  faculty: { label: 'Faculty / Instructor', category: 'Operations', badgeClass: 'bg-teal-600 text-white' },
  sales_admin: { label: 'Sales Admin', category: 'Sales & Growth', badgeClass: 'bg-pink-600 text-white' },
  sales_sub_admin: { label: 'Sales Sub Admin', category: 'Sales & Growth', badgeClass: 'bg-pink-500 text-white' },
  sales: { label: 'Sales Executive', category: 'Sales & Growth', badgeClass: 'bg-rose-500 text-white' },
  academic_counselor: { label: 'Academic Counselor', category: 'Sales & Growth', badgeClass: 'bg-amber-600 text-white' },
  collections_admin: { label: 'Collections Admin', category: 'Finance', badgeClass: 'bg-violet-600 text-white' },
  center_admin: { label: 'Academic Partner Admin', category: 'Academic Partners', badgeClass: 'bg-amber-500 text-white' },
  employee: { label: 'Employee', category: 'Workforce', badgeClass: 'bg-slate-600 text-white' },
};

const AVATAR_GRADIENTS = [
  'from-blue-600 to-indigo-600 text-white',
  'from-emerald-600 to-teal-700 text-white',
  'from-violet-600 to-purple-700 text-white',
  'from-amber-500 to-orange-600 text-white',
  'from-rose-600 to-pink-600 text-white',
  'from-cyan-600 to-blue-600 text-white',
];

const getInitials = (name?: string): string => {
  if (!name) return 'US';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getGradientForName = (str?: string): string => {
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = (str || '').charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

export function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Categorization states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [groupBy, setGroupBy] = useState<'organization' | 'type' | 'none'>('organization');

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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, orgsRes, deptsRes] = await Promise.all([
        api.get('/users'),
        api.get('/organizations'),
        api.get('/departments'),
      ]);
      setUsers((usersRes.data.data || []).filter((u: any) => u.status !== 'resigned'));
      setOrganizations(orgsRes.data.data || []);
      setDepartments(deptsRes.data.data || []);
    } catch (error: any) {
      toast.error('Failed to fetch users data');
      console.error(error);
    } finally {
      setLoading(false);
    }
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

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'active').length;
    const orgCount = new Set(users.map((u) => getUserOrgId(u)).filter((id) => id !== 'unassigned')).size;
    const rolesCount = new Set(users.map((u) => u.role)).size;

    return { total, active, orgCount, rolesCount };
  }, [users, organizations]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (user.name || '').toLowerCase().includes(q);
        const matchesEmail = (user.email || '').toLowerCase().includes(q);
        const matchesPhone = (user.phone || '').toLowerCase().includes(q);
        const matchesRole = (user.role || '').toLowerCase().includes(q);
        const matchesOrg = getUserOrgName(user).toLowerCase().includes(q);
        const matchesDept = getUserDeptName(user).toLowerCase().includes(q);
        const matchesBio = (user.biometricId || '').toLowerCase().includes(q);

        if (!matchesName && !matchesEmail && !matchesPhone && !matchesRole && !matchesOrg && !matchesDept && !matchesBio) {
          return false;
        }
      }

      // Organization filter
      if (selectedOrgFilter !== 'all') {
        const userOrgId = getUserOrgId(user);
        if (selectedOrgFilter === 'unassigned' && userOrgId !== 'unassigned') return false;
        if (selectedOrgFilter !== 'unassigned' && userOrgId !== selectedOrgFilter) return false;
      }

      // Role / Type filter
      if (selectedRoleFilter !== 'all') {
        if (user.role !== selectedRoleFilter) return false;
      }

      // Department filter
      if (selectedDeptFilter !== 'all') {
        const deptId = typeof user.departmentId === 'string' ? user.departmentId : user.departmentId?.id;
        if (deptId !== selectedDeptFilter) return false;
      }

      return true;
    });
  }, [users, searchQuery, selectedOrgFilter, selectedRoleFilter, selectedDeptFilter, organizations, departments]);

  // Grouped Users by Organization
  const usersByOrganization = useMemo(() => {
    const groups: Record<string, { orgName: string; orgId: string; users: User[] }> = {};

    filteredUsers.forEach((user) => {
      const orgId = getUserOrgId(user);
      const orgName = getUserOrgName(user);

      if (!groups[orgId]) {
        groups[orgId] = { orgId, orgName, users: [] };
      }
      groups[orgId].users.push(user);
    });

    return Object.values(groups).sort((a, b) => {
      if (a.orgId === 'unassigned') return 1;
      if (b.orgId === 'unassigned') return -1;
      return a.orgName.localeCompare(b.orgName);
    });
  }, [filteredUsers, organizations]);

  // Grouped Users by Role Category / Type
  const usersByType = useMemo(() => {
    const groups: Record<string, { categoryName: string; users: User[] }> = {
      'Executive & Leadership': { categoryName: 'Executive & Leadership', users: [] },
      'Operations & Academics': { categoryName: 'Operations & Academics', users: [] },
      'Finance & Accounting': { categoryName: 'Finance & Accounting', users: [] },
      'Human Resources': { categoryName: 'Human Resources', users: [] },
      'Sales & Admissions': { categoryName: 'Sales & Admissions', users: [] },
      'Academic Partner Admins': { categoryName: 'Academic Partner Admins', users: [] },
      'Workforce & Staff': { categoryName: 'Workforce & Staff', users: [] },
    };

    filteredUsers.forEach((user) => {
      const roleMeta = ROLE_CONFIG[user.role];
      const cat = roleMeta?.category || 'Workforce & Staff';
      if (groups[cat]) {
        groups[cat].users.push(user);
      } else {
        groups['Workforce & Staff'].users.push(user);
      }
    });

    return Object.values(groups).filter((g) => g.users.length > 0);
  }, [filteredUsers]);

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
      fetchData();
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
      fetchData();
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
    const gradient = getGradientForName(user.name);

    return (
      <Card
        key={user.id}
        className="group relative rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden"
      >
        <CardHeader className="p-5 pb-3 relative z-10 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-base shadow-sm shrink-0 ring-2 ring-background`}>
                  {initials}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background",
                    user.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  )}
                  title={user.status}
                />
              </div>

              <div className="min-w-0">
                <CardTitle className="text-base font-bold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors" title={user.name}>
                  {user.name}
                </CardTitle>
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  <Badge className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs border-none", roleMeta.badgeClass)}>
                    {roleMeta.label}
                  </Badge>
                  {user.designation && (
                    <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                      • {user.designation}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-4 space-y-2.5 text-xs text-muted-foreground relative z-10 flex-1">
          {/* Email */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30">
            <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate font-medium text-foreground/90" title={user.email}>
              {user.email}
            </span>
          </div>

          {/* Organization */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30">
            <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate font-medium text-foreground/90" title={orgName}>
              {orgName}
            </span>
          </div>

          {/* Department */}
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-3.5 h-3.5 text-violet-500 shrink-0" />
              <span className="truncate text-[11px]" title={deptName}>
                Dept: <span className="font-semibold text-foreground">{deptName}</span>
              </span>
            </div>
            {user.biometricId && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border">
                <Fingerprint className="w-3 h-3 text-amber-500" />
                PIN: {user.biometricId}
              </span>
            )}
          </div>
        </CardContent>

        <div className="px-5 py-3 border-t bg-muted/15 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(user)}
            disabled={user.role === 'center_admin'}
            className="flex-1 h-8 rounded-xl text-xs font-semibold hover:bg-muted"
            title={user.role === 'center_admin' ? "Manage via Academic Partners" : "Edit User"}
          >
            <Edit className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(user)}
            disabled={user.role === 'center_admin'}
            className="h-8 px-3 rounded-xl text-xs text-destructive hover:bg-destructive/10 hover:border-destructive/30"
            title={user.role === 'center_admin' ? "Manage via Academic Partners" : "Delete User"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-card via-card/90 to-card/60 rounded-3xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <UsersIcon className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              User Administration
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">
              Multi-Tenant RBAC
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Categorized directory of institutional leadership, administration, faculty, and operators across all tenants.
          </p>
        </div>

        <Button
          onClick={handleCreate}
          className="shadow-sm hover:shadow-md transition-all rounded-xl px-5 bg-primary hover:bg-primary/90 gap-2 h-10"
        >
          <Plus className="w-4 h-4" />
          <span>Create New User</span>
        </Button>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Users</p>
              <p className="text-2xl font-black">{metrics.total}</p>
              <p className="text-[11px] text-emerald-600 font-medium">{metrics.active} active accounts</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UsersIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground uppercase">Organizations</p>
              <p className="text-2xl font-black text-blue-600">{metrics.orgCount}</p>
              <p className="text-[11px] text-muted-foreground">Tenants with users</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground uppercase">Distinct Roles</p>
              <p className="text-2xl font-black text-violet-600">{metrics.rolesCount}</p>
              <p className="text-[11px] text-muted-foreground">Active RBAC assignments</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground uppercase">Departments</p>
              <p className="text-2xl font-black text-amber-600">{departments.length}</p>
              <p className="text-[11px] text-muted-foreground">Functional business units</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Categorization Toolbar */}
      <div className="p-4 rounded-2xl border bg-card/40 backdrop-blur space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone, role, organization..."
              className="pl-9 pr-8 h-10 rounded-xl bg-background text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Categorization & Filtering Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Organization */}
            <Select value={selectedOrgFilter} onValueChange={setSelectedOrgFilter}>
              <SelectTrigger className="h-10 w-[180px] rounded-xl text-xs bg-background">
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations ({users.length})</SelectItem>
                <SelectItem value="unassigned">Global / Unassigned</SelectItem>
                {organizations.map((org) => {
                  const count = users.filter((u) => getUserOrgId(u) === org.id).length;
                  return (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Filter by Role / Type */}
            <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
              <SelectTrigger className="h-10 w-[170px] rounded-xl text-xs bg-background">
                <Shield className="w-3.5 h-3.5 mr-1.5 text-violet-500" />
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {Object.entries(ROLE_CONFIG).map(([roleKey, meta]) => {
                  const count = users.filter((u) => u.role === roleKey).length;
                  if (count === 0) return null;
                  return (
                    <SelectItem key={roleKey} value={roleKey}>
                      {meta.label} ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Group By Mode Toggle */}
            <div className="flex items-center rounded-xl border bg-background p-0.5">
              <Button
                variant={groupBy === 'organization' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setGroupBy('organization')}
                className="h-8.5 px-3 rounded-lg text-xs font-semibold"
                title="Group by Organization"
              >
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                <span>By Org</span>
              </Button>
              <Button
                variant={groupBy === 'type' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setGroupBy('type')}
                className="h-8.5 px-3 rounded-lg text-xs font-semibold"
                title="Group by Role Category"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5 text-violet-500" />
                <span>By Role</span>
              </Button>
              <Button
                variant={groupBy === 'none' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setGroupBy('none')}
                className="h-8.5 px-3 rounded-lg text-xs font-semibold"
                title="Flat All Users Grid"
              >
                <span>All Users</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Status Strip */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span>
            Showing <strong className="text-foreground">{filteredUsers.length}</strong> of {users.length} users
          </span>
          {(searchQuery || selectedOrgFilter !== 'all' || selectedRoleFilter !== 'all' || selectedDeptFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedOrgFilter('all');
                setSelectedRoleFilter('all');
                setSelectedDeptFilter('all');
              }}
              className="text-primary hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {filteredUsers.length === 0 ? (
        <Card className="rounded-3xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <User className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">No users match your criteria</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Try switching the organization or role filters to display accounts.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedOrgFilter('all');
                setSelectedRoleFilter('all');
              }}
              className="rounded-xl mt-2"
            >
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      ) : groupBy === 'organization' ? (
        /* Categorized By Organization */
        <div className="space-y-8">
          {usersByOrganization.map((group) => {
            const org = organizations.find((o) => o.id === group.orgId);
            return (
              <div key={group.orgId} className="space-y-4">
                {/* Organization Section Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-500/20">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-foreground tracking-tight">
                          {group.orgName}
                        </h3>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 text-xs font-bold">
                          {group.users.length} {group.users.length === 1 ? 'User' : 'Users'}
                        </Badge>
                      </div>
                      {org?.customLoginSlug && (
                        <p className="text-xs text-muted-foreground font-mono">
                          Slug: /@{org.customLoginSlug}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Summary of Roles in this organization */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    {Array.from(new Set(group.users.map((u) => u.role))).slice(0, 4).map((r) => (
                      <span key={r} className="px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-medium">
                        {ROLE_CONFIG[r]?.label || r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Users Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {group.users.map((user) => renderUserCard(user))}
                </div>
              </div>
            );
          })}
        </div>
      ) : groupBy === 'type' ? (
        /* Categorized By Role Category / Type */
        <div className="space-y-8">
          {usersByType.map((group) => (
            <div key={group.categoryName} className="space-y-4">
              {/* Category Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-border/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center font-bold text-sm border border-violet-500/20">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground tracking-tight">
                        {group.categoryName}
                      </h3>
                      <Badge variant="outline" className="bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20 text-xs font-bold">
                        {group.users.length} {group.users.length === 1 ? 'Member' : 'Members'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {group.users.map((user) => renderUserCard(user))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredUsers.map((user) => renderUserCard(user))}
        </div>
      )}

      {/* Create / Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold">
              {editingUser ? 'Edit User Configuration' : 'Create New User Account'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingUser
                ? 'Update organizational assignment, credentials, and role permissions.'
                : 'Provision a new team member or administrative account.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@organization.edu"
                    className="rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">
                  Password {editingUser ? '(leave blank to keep unchanged)' : '*'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="rounded-xl text-xs"
                  required={!editingUser}
                />
              </div>

              {/* Organization Selection */}
              <div className="space-y-1.5 pt-2 border-t">
                <Label htmlFor="organizationId" className="text-xs font-semibold">
                  Assigned Organization <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.organizationId}
                  onValueChange={(val) => setFormData({ ...formData, organizationId: val, departmentId: '' })}
                >
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-xs font-semibold">
                    Role & Permissions <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(val) => setFormData({ ...formData, role: val })}
                  >
                    <SelectTrigger className="rounded-xl h-10 text-xs">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <p className="text-[10px] text-muted-foreground">
                    Faculty accounts are created in the Faculties panel.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="departmentId" className="text-xs font-semibold">
                    Department (Optional)
                  </Label>
                  <Select
                    value={formData.departmentId || 'none'}
                    onValueChange={(val) => setFormData({ ...formData, departmentId: val === 'none' ? '' : val })}
                  >
                    <SelectTrigger className="rounded-xl h-10 text-xs">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departmentsForSelectedOrg.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="designation" className="text-xs font-semibold">
                    Designation / Title
                  </Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Senior Academic Officer"
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biometricId" className="text-xs font-semibold">
                    Biometric Device PIN
                  </Label>
                  <Input
                    id="biometricId"
                    value={formData.biometricId}
                    onChange={(e) => setFormData({ ...formData, biometricId: e.target.value })}
                    placeholder="e.g. 1042"
                    className="rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl"
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-primary text-primary-foreground"
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
