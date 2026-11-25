import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Building, 
  Building2, 
  Users, 
  Layers, 
  Search, 
  X, 
  Filter, 
  Shield, 
  Briefcase, 
  GraduationCap, 
  Wallet, 
  Target, 
  School, 
  UserCheck,
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
import { useAuth } from '@/hooks/useAuth';
import { mayOn } from '@/lib/access';

export interface Department {
  id: string;
  name: string;
  type: string;
  organizationId?: any;
  managerId?: any;
  organization?: { id?: string; name?: string };
  manager?: { id?: string; name?: string; email?: string; designation?: string };
  features?: string[];
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  customLoginSlug?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  designation?: string;
  role: string;
  organizationId?: any;
}

// Department Types metadata & palette
export const DEPT_TYPE_META: Record<string, { label: string; icon: any; badgeClass: string; desc: string }> = {
  operations: {
    label: 'Operations & Academics',
    icon: GraduationCap,
    badgeClass: 'bg-emerald-600 text-white',
    desc: 'Curriculum delivery, exams, admissions review, and academic scheduling',
  },
  finance: {
    label: 'Finance & Accounts',
    icon: Wallet,
    badgeClass: 'bg-emerald-600 text-white',
    desc: 'Fee collections, invoicing, payment reconciliations, and payroll',
  },
  hr: {
    label: 'Human Resources',
    icon: Users,
    badgeClass: 'bg-orange-600 text-white',
    desc: 'Staff onboarding, leave management, biometric attendance, and policies',
  },
  sales: {
    label: 'Sales & Admissions',
    icon: Target,
    badgeClass: 'bg-pink-600 text-white',
    desc: 'Student lead acquisition, counseling, pipeline tracking, and conversions',
  },
  ceo: {
    label: 'Executive (CEO)',
    icon: Shield,
    badgeClass: 'bg-green-600 text-white',
    desc: 'Executive governance, strategic reviews, and institutional approvals',
  },
  general_manager: {
    label: 'General Management',
    icon: Shield,
    badgeClass: 'bg-green-500 text-white',
    desc: 'Cross-functional operational governance and institutional compliance',
  },
  org_admin: {
    label: 'Institutional Administration',
    icon: Building2,
    badgeClass: 'bg-teal-600 text-white',
    desc: 'Tenant-wide configurations, branches, and system settings',
  },
  study_center: {
    label: 'Academic Partners & Centers',
    icon: School,
    badgeClass: 'bg-teal-600 text-white',
    desc: 'External study centers, affiliated campus coordination, and partner seats',
  },
  collections: {
    label: 'Collections & Receivables',
    icon: Wallet,
    badgeClass: 'bg-lime-600 text-white',
    desc: 'Dedicated overdue fee recoveries, installment plans, and receipts',
  },
  custom: {
    label: 'Custom Department',
    icon: Layers,
    badgeClass: 'bg-slate-600 text-white',
    desc: 'Specialized institutional division or internal taskforce',
  },
  staff: {
    label: 'General Staff',
    icon: Briefcase,
    badgeClass: 'bg-gray-600 text-white',
    desc: 'General facility, maintenance, and administrative support',
  },
};

export function DepartmentsPanel() {
  const { user } = useAuth();
  const mayCreate = mayOn(user, 'departments', 'create', true);
  const mayEdit = mayOn(user, 'departments', 'edit', true);
  const mayDelete = mayOn(user, 'departments', 'delete', true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Categorization states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [groupBy, setGroupBy] = useState<'organization' | 'type' | 'none'>('organization');

  // Dialog & Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'operations',
    organizationId: '',
    managerId: 'none',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptsRes, orgsRes, usersRes] = await Promise.all([
        api.get('/departments'),
        api.get('/organizations'),
        api.get('/users'),
      ]);
      setDepartments(deptsRes.data.data || []);
      setOrganizations(orgsRes.data.data || []);
      setUsers((usersRes.data.data || []).filter((u: any) => u.status !== 'resigned'));
    } catch (error: any) {
      toast.error('Failed to fetch departments data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract Organization ID and Name for Department
  const getDeptOrgId = (dept: Department): string => {
    if (typeof dept.organizationId === 'string' && dept.organizationId) return dept.organizationId;
    if (dept.organizationId?.id) return dept.organizationId.id;
    if (dept.organization?.id) return dept.organization.id;
    return 'unassigned';
  };

  const getDeptOrgName = (dept: Department): string => {
    if (dept.organization?.name) return dept.organization.name;
    if (dept.organizationId?.name) return dept.organizationId.name;
    const orgId = getDeptOrgId(dept);
    const found = organizations.find((o) => o.id === orgId);
    if (found) return found.name;
    return 'Global / Unassigned';
  };

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = departments.length;
    const orgCount = new Set(departments.map((d) => getDeptOrgId(d)).filter((id) => id !== 'unassigned')).size;
    const typesCount = new Set(departments.map((d) => d.type)).size;
    const managedCount = departments.filter((d) => Boolean(d.managerId || d.manager)).length;

    return { total, orgCount, typesCount, managedCount };
  }, [departments]);

  // Filtered Departments
  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (dept.name || '').toLowerCase().includes(q);
        const matchesType = (dept.type || '').toLowerCase().includes(q);
        const matchesOrg = getDeptOrgName(dept).toLowerCase().includes(q);
        const matchesManager = (dept.manager?.name || '').toLowerCase().includes(q);

        if (!matchesName && !matchesType && !matchesOrg && !matchesManager) {
          return false;
        }
      }

      // Organization filter
      if (selectedOrgFilter !== 'all') {
        const deptOrgId = getDeptOrgId(dept);
        if (selectedOrgFilter === 'unassigned' && deptOrgId !== 'unassigned') return false;
        if (selectedOrgFilter !== 'unassigned' && deptOrgId !== selectedOrgFilter) return false;
      }

      // Type filter
      if (selectedTypeFilter !== 'all') {
        if (dept.type !== selectedTypeFilter) return false;
      }

      return true;
    });
  }, [departments, searchQuery, selectedOrgFilter, selectedTypeFilter, organizations]);

  // Grouped Departments by Organization
  const departmentsByOrganization = useMemo(() => {
    const groups: Record<string, { orgId: string; orgName: string; departments: Department[] }> = {};

    filteredDepartments.forEach((dept) => {
      const orgId = getDeptOrgId(dept);
      const orgName = getDeptOrgName(dept);

      if (!groups[orgId]) {
        groups[orgId] = { orgId, orgName, departments: [] };
      }
      groups[orgId].departments.push(dept);
    });

    return Object.values(groups).sort((a, b) => {
      if (a.orgId === 'unassigned') return 1;
      if (b.orgId === 'unassigned') return -1;
      return a.orgName.localeCompare(b.orgName);
    });
  }, [filteredDepartments, organizations]);

  // Grouped Departments by Department Type
  const departmentsByType = useMemo(() => {
    const groups: Record<string, { typeKey: string; meta: any; departments: Department[] }> = {};

    filteredDepartments.forEach((dept) => {
      const typeKey = dept.type || 'custom';
      const meta = DEPT_TYPE_META[typeKey] || DEPT_TYPE_META.custom;

      if (!groups[typeKey]) {
        groups[typeKey] = { typeKey, meta, departments: [] };
      }
      groups[typeKey].departments.push(dept);
    });

    return Object.values(groups).sort((a, b) => b.departments.length - a.departments.length);
  }, [filteredDepartments]);

  // Dialog Handlers
  const handleCreate = () => {
    setEditingDept(null);
    setFormData({
      name: '',
      type: 'operations',
      organizationId: organizations[0]?.id || '',
      managerId: 'none',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    const orgId = getDeptOrgId(dept);
    const managerId = typeof dept.managerId === 'string' ? dept.managerId : dept.managerId?.id || dept.manager?.id || 'none';

    setFormData({
      name: dept.name || '',
      type: dept.type || 'operations',
      organizationId: orgId === 'unassigned' ? '' : orgId,
      managerId: managerId || 'none',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (dept: Department) => {
    setDeletingDept(dept);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.organizationId) {
      toast.error('Please specify Department Name and Organization');
      return;
    }

    try {
      setFormSubmitting(true);
      const payload: any = {
        name: formData.name.trim(),
        type: formData.type,
        organizationId: formData.organizationId,
      };

      if (formData.managerId && formData.managerId !== 'none') {
        payload.managerId = formData.managerId;
      } else {
        payload.managerId = null;
      }

      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, payload);
        toast.success('Department updated successfully');
      } else {
        await api.post('/departments', payload);
        toast.success('Department created successfully');
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
    if (!deletingDept) return;
    try {
      await api.delete(`/departments/${deletingDept.id}`);
      toast.success('Department removed successfully');
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete department');
    }
  };

  // Filter users by selected organization for manager dropdown in modal
  const eligibleManagers = useMemo(() => {
    if (!formData.organizationId) return users;
    return users.filter((u) => {
      const uOrgId = typeof u.organizationId === 'string' ? u.organizationId : u.organizationId?.id;
      return uOrgId === formData.organizationId;
    });
  }, [users, formData.organizationId]);

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

  // Render individual department card
  const renderDepartmentCard = (dept: Department) => {
    const meta = DEPT_TYPE_META[dept.type] || DEPT_TYPE_META.custom;
    const TypeIcon = meta.icon;
    const orgName = getDeptOrgName(dept);

    return (
      <Card
        key={dept.id}
        className="group relative rounded-3xl gap-0 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between overflow-hidden"
      >
        <CardHeader className="px-6 pt-6 pb-4 relative z-10 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TypeIcon className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <CardTitle className="text-base font-semibold text-foreground leading-snug line-clamp-1" title={dept.name}>
                  {dept.name}
                </CardTitle>
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  <Badge className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-full border-none", meta.badgeClass)}>
                    {meta.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-5 space-y-2 text-xs text-muted-foreground relative z-10 flex-1">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#f4f6f3] dark:bg-muted/40">
            <Building2 className="w-3.5 h-3.5 text-[#256c1d] shrink-0" />
            <span className="truncate font-medium text-foreground/90" title={orgName}>{orgName}</span>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#f4f6f3] dark:bg-muted/40">
            <UserCheck className="w-3.5 h-3.5 text-[#256c1d] shrink-0" />
            <span className="truncate text-xs font-medium" title={dept.manager?.name || 'Unassigned'}>
              Manager:{' '}
              <strong className="text-foreground">
                {dept.manager?.name ? `${dept.manager.name} (${dept.manager.designation || 'Lead'})` : 'Unassigned'}
              </strong>
            </span>
          </div>

          {dept.features && dept.features.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {dept.features.slice(0, 3).map((f, idx) => (
                <span key={idx} className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 capitalize">
                  {f.replace(/_/g, ' ')}
                </span>
              ))}
              {dept.features.length > 3 && (
                <span className="text-[10px] text-muted-foreground self-center">
                  +{dept.features.length - 3} more
                </span>
              )}
            </div>
          )}
        </CardContent>

        <div className="px-6 pb-6 flex items-center justify-between gap-2">
          {mayEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(dept)}
              className="flex-1 h-10 rounded-full text-xs font-semibold bg-white border-slate-200 hover:bg-[#eaf6e6] hover:text-[#256c1d]"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
          )}
          {mayDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(dept)}
              className="h-10 w-10 p-0 rounded-full bg-white border-slate-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
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
            Department Architecture
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#eaf6e6] dark:bg-emerald-500/10 text-[#256c1d] dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#54b947]" /> Institutional divisions
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Structure operational divisions, faculty bodies, financial units, and leadership hierarchies by organization.
          </p>
        </div>

        {mayCreate && (
          <Button
            onClick={handleCreate}
            className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm shrink-0 self-start lg:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Department</span>
          </Button>
        )}
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <Card className="rounded-3xl gap-0">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Departments</p>
              <p className="text-3xl font-semibold tracking-tight">{metrics.total}</p>
              <p className="text-[11px] text-muted-foreground">Active business divisions</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl gap-0">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Tenants Covered</p>
              <p className="text-3xl font-semibold tracking-tight text-emerald-600">{metrics.orgCount}</p>
              <p className="text-[11px] text-muted-foreground">Institutions with depts</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl gap-0">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Active Types</p>
              <p className="text-3xl font-semibold tracking-tight text-lime-600">{metrics.typesCount}</p>
              <p className="text-[11px] text-muted-foreground">Functional frameworks</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl gap-0">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Managed Units</p>
              <p className="text-3xl font-semibold tracking-tight text-emerald-600">{metrics.managedCount}</p>
              <p className="text-[11px] text-emerald-600 font-medium">With designated lead</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Categorization Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by department name, type, organization, manager..."
              className="pl-11 pr-9 h-11 rounded-full bg-white border-slate-200 shadow-sm text-sm"
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
              <SelectTrigger className="h-11 w-[200px] rounded-full text-sm bg-white border-slate-200 shadow-sm px-4">
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations ({departments.length})</SelectItem>
                <SelectItem value="unassigned">Global / Unassigned</SelectItem>
                {organizations.map((org) => {
                  const count = departments.filter((d) => getDeptOrgId(d) === org.id).length;
                  return (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Filter by Type */}
            <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
              <SelectTrigger className="h-11 w-[190px] rounded-full text-sm bg-white border-slate-200 shadow-sm px-4">
                <Layers className="w-3.5 h-3.5 mr-1.5 text-lime-500" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(DEPT_TYPE_META).map(([typeKey, meta]) => {
                  const count = departments.filter((d) => d.type === typeKey).length;
                  if (count === 0) return null;
                  return (
                    <SelectItem key={typeKey} value={typeKey}>
                      {meta.label} ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Group By Mode Toggle */}
            <div className="flex items-center rounded-full border border-slate-200 bg-white shadow-sm p-1">
              <Button
                variant={groupBy === 'organization' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setGroupBy('organization')}
                className="h-9 px-4 rounded-full text-xs font-semibold"
                title="Group by Organization"
              >
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                <span>By Org</span>
              </Button>
              <Button
                variant={groupBy === 'type' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setGroupBy('type')}
                className="h-9 px-4 rounded-full text-xs font-semibold"
                title="Group by Functional Type"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5 text-lime-500" />
                <span>By Type</span>
              </Button>
              <Button
                variant={groupBy === 'none' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setGroupBy('none')}
                className="h-9 px-4 rounded-full text-xs font-semibold"
                title="Flat All Departments Grid"
              >
                <span>All Depts</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Status Strip */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filteredDepartments.length}</strong> of {departments.length} departments
          </span>
          {(searchQuery || selectedOrgFilter !== 'all' || selectedTypeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedOrgFilter('all');
                setSelectedTypeFilter('all');
              }}
              className="text-primary hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {filteredDepartments.length === 0 ? (
        <Card className="rounded-3xl border border-dashed border-slate-300 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#f4f6f3] flex items-center justify-center text-muted-foreground">
              <Building className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">No departments match your filter</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Try switching the organization or department type filters.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedOrgFilter('all');
                setSelectedTypeFilter('all');
              }}
              className="rounded-full mt-2 bg-white border-slate-200 h-10 px-5"
            >
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      ) : groupBy === 'organization' ? (
        /* Categorized By Organization */
        <div className="space-y-10">
          {departmentsByOrganization.map((group) => {
            const org = organizations.find((o) => o.id === group.orgId);
            return (
              <div key={group.orgId} className="space-y-4">
                {/* Organization Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center font-bold text-sm border border-emerald-500/20">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground tracking-tight">
                          {group.orgName}
                        </h3>
                        <Badge variant="outline" className="bg-[#e3f7dd] text-[#1f6a17] border-none rounded-full text-xs font-semibold px-2.5">
                          {group.departments.length} {group.departments.length === 1 ? 'Department' : 'Departments'}
                        </Badge>
                      </div>
                      {org?.customLoginSlug && (
                        <p className="text-xs text-muted-foreground font-mono">
                          Slug: /@{org.customLoginSlug}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Types present in this organization */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    {Array.from(new Set(group.departments.map((d) => d.type))).map((t) => (
                      <span key={t} className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 font-medium">
                        {DEPT_TYPE_META[t]?.label || t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Departments Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 sm:gap-6">
                  {group.departments.map((dept) => renderDepartmentCard(dept))}
                </div>
              </div>
            );
          })}
        </div>
      ) : groupBy === 'type' ? (
        /* Categorized By Department Type */
        <div className="space-y-10">
          {departmentsByType.map((group) => {
            const TypeIcon = group.meta.icon;
            return (
              <div key={group.typeKey} className="space-y-4">
                {/* Type Category Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center font-bold text-sm border border-lime-500/20">
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground tracking-tight">
                          {group.meta.label}
                        </h3>
                        <Badge variant="outline" className="bg-[#e3f7dd] text-[#1f6a17] border-none rounded-full text-xs font-semibold px-2.5">
                          {group.departments.length} {group.departments.length === 1 ? 'Division' : 'Divisions'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {group.meta.desc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 sm:gap-6">
                  {group.departments.map((dept) => renderDepartmentCard(dept))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 sm:gap-6">
          {filteredDepartments.map((dept) => renderDepartmentCard(dept))}
        </div>
      )}

      {/* Create / Edit Department Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-xl p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
              {editingDept ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground text-left">
                {editingDept ? 'Edit Department' : 'Create New Department'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground text-left">
                {editingDept
                  ? 'Update division name, functional type, or assigned manager.'
                  : 'Define a new departmental unit under an institutional tenant.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-7">
              {/* Basics */}
              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basics</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="deptName" className="text-sm font-semibold">
                    Department name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="deptName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Academic Operations"
                    className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="deptOrg" className="text-sm font-semibold">
                    Organization <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={formData.organizationId}
                    onValueChange={(val) => setFormData({ ...formData, organizationId: val, managerId: 'none' })}
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
              </section>

              {/* Functional type */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Functional type <span className="text-rose-500 normal-case">*</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(DEPT_TYPE_META).map(([key, meta]) => {
                    const Icon = meta.icon;
                    const on = formData.type === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setFormData({ ...formData, type: key })}
                        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left border transition-colors ${on ? 'bg-[#eaf6e6] border-[#54b947]/50' : 'bg-white border-slate-200 hover:bg-[#f4f6f3]'}`}
                      >
                        <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${on ? 'bg-[#8ae47e] text-[#0b1d14]' : 'bg-[#f4f6f3] text-[#256c1d]'}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="text-sm font-medium text-foreground leading-snug">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Management */}
              <section className="space-y-4 pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Management</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="deptManager" className="text-sm font-semibold">
                    Assigned manager <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Select
                    value={formData.managerId}
                    onValueChange={(val) => setFormData({ ...formData, managerId: val })}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="none">No Manager Assigned</SelectItem>
                      {eligibleManagers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.designation || u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {formSubmitting ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
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
              Delete Department?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground space-y-2">
              <p>
                Are you sure you want to delete <strong className="text-foreground">{deletingDept?.name}</strong>?
              </p>
              <p className="p-2.5 rounded-xl bg-destructive/5 text-destructive border border-destructive/20 text-xs">
                Members assigned to this department will remain in the system as unassigned.
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
