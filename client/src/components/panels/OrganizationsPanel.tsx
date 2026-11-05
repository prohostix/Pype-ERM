import { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Shield, 
  Search, 
  Download, 
  RefreshCw, 
  Users, 
  GraduationCap, 
  School, 
  MapPin, 
  Mail, 
  Phone, 
  ExternalLink, 
  Copy, 
  Check, 
  MoreVertical, 
  LayoutGrid, 
  List, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Globe, 
  FileSpreadsheet,
  ArrowUpDown,
  Upload,
  X,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { uploadFormFile } from '@/lib/uploadFile';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';

// Interface definitions
export interface OrganizationLicense {
  id: string;
  name: string;
  type?: string;
  tag?: string | null;
  price?: number;
  perEnrollmentFee?: number;
  features?: string[];
  status?: string;
  maxUsers?: number;
  maxStorage?: number;
  durationMonths?: number;
}

export interface OrganizationCounts {
  students?: number;
  enrollments?: number;
  users?: number;
  academicCenters?: number;
  studyCenters?: number;
}

export interface Organization {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string | null;
  customLoginSlug?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  licenseId?: any;
  license?: OrganizationLicense | null;
  licenseExpiry?: string | null;
  createdAt: string;
  updatedAt?: string;
  metadata?: any;
  _count?: OrganizationCounts;
}

// Deterministic gradient palettes for organization avatars
const AVATAR_GRADIENTS = [
  'from-blue-600 to-indigo-600 text-white',
  'from-emerald-600 to-teal-700 text-white',
  'from-purple-600 to-violet-700 text-white',
  'from-amber-500 to-orange-600 text-white',
  'from-rose-600 to-pink-600 text-white',
  'from-cyan-600 to-blue-600 text-white',
  'from-fuchsia-600 to-rose-600 text-white',
  'from-slate-700 to-zinc-900 text-white',
];

const getInitials = (name: string): string => {
  if (!name) return 'OR';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getGradientForOrg = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return 'N/A';
  }
};

const getLicenseExpiryInfo = (expiryStr?: string | null) => {
  if (!expiryStr) {
    return { status: 'none', label: 'No expiry set', days: null, badgeVariant: 'secondary' as const };
  }
  const expiry = new Date(expiryStr);
  if (isNaN(expiry.getTime())) {
    return { status: 'none', label: 'Invalid date', days: null, badgeVariant: 'secondary' as const };
  }
  
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { 
      status: 'expired', 
      label: `Expired (${formatDate(expiryStr)})`, 
      days: diffDays, 
      badgeVariant: 'destructive' as const 
    };
  }
  if (diffDays <= 30) {
    return { 
      status: 'expiring_soon', 
      label: `${diffDays}d left (${formatDate(expiryStr)})`, 
      days: diffDays, 
      badgeVariant: 'outline' as const 
    };
  }
  return { 
    status: 'active', 
    label: `Valid till ${formatDate(expiryStr)}`, 
    days: diffDays, 
    badgeVariant: 'default' as const 
  };
};

export function OrganizationsPanel() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [availableLicenses, setAvailableLicenses] = useState<OrganizationLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [licenseFilter, setLicenseFilter] = useState<'all' | 'licensed' | 'unlicensed' | 'expiring_soon' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'students-desc' | 'users-desc' | 'expiry-soonest' | 'created-desc'>('name-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Dialog & Modal states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [selectedOrgForView, setSelectedOrgForView] = useState<Organization | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    logo: '',
    customLoginSlug: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    licenseId: '',
    licenseExpiry: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchOrganizations(), fetchLicenses()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/organizations');
      const rawData = response.data.data || [];
      const normalizedData = rawData.map((org: any) => {
        const studentCount = Math.max(org._count?.students || 0, org._count?.enrollments || 0);
        return {
          ...org,
          _count: {
            ...org._count,
            students: studentCount,
            enrollments: studentCount,
          }
        };
      });
      setOrganizations(normalizedData);
    } catch (error: any) {
      console.error('Fetch organizations error:', error);
      toast.error('Failed to fetch organizations');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchLicenses = async () => {
    try {
      const response = await api.get('/licenses');
      setAvailableLicenses(response.data.data || []);
    } catch (error) {
      console.error('Fetch licenses error:', error);
    }
  };

  // Quick action: Copy text with toast feedback
  const handleCopy = (text: string, label: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    const total = organizations.length;
    const active = organizations.filter(o => o.status === 'active').length;
    const inactive = organizations.filter(o => o.status === 'inactive').length;
    const suspended = organizations.filter(o => o.status === 'suspended').length;
    const licensed = organizations.filter(o => Boolean(o.license || o.licenseId)).length;
    const totalStudents = organizations.reduce((acc, o) => acc + (o._count?.students ?? o._count?.enrollments ?? 0), 0);
    const totalUsers = organizations.reduce((acc, o) => acc + (o._count?.users || 0), 0);
    const totalCenters = organizations.reduce((acc, o) => acc + (o._count?.studyCenters || 0) + (o._count?.academicCenters || 0), 0);
    const totalEnrollments = totalStudents;

    return {
      total,
      active,
      inactive,
      suspended,
      licensed,
      totalStudents,
      totalUsers,
      totalCenters,
      totalEnrollments,
      activeRatio: total > 0 ? Math.round((active / total) * 100) : 0
    };
  }, [organizations]);

  // Filtered & Sorted Organizations
  const filteredOrganizations = useMemo(() => {
    return organizations
      .filter((org) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = (org.name || '').toLowerCase().includes(q);
          const matchesEmail = (org.email || '').toLowerCase().includes(q);
          const matchesPhone = (org.phone || '').toLowerCase().includes(q);
          const matchesSlug = (org.customLoginSlug || '').toLowerCase().includes(q);
          const matchesAddress = (org.address || '').toLowerCase().includes(q);
          const matchesId = (org.id || '').toLowerCase().includes(q);
          if (!matchesName && !matchesEmail && !matchesPhone && !matchesSlug && !matchesAddress && !matchesId) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all' && org.status !== statusFilter) {
          return false;
        }

        // License filter
        if (licenseFilter !== 'all') {
          const expiryInfo = getLicenseExpiryInfo(org.licenseExpiry);
          const hasLicense = Boolean(org.license || org.licenseId);
          if (licenseFilter === 'licensed' && !hasLicense) return false;
          if (licenseFilter === 'unlicensed' && hasLicense) return false;
          if (licenseFilter === 'expiring_soon' && expiryInfo.status !== 'expiring_soon') return false;
          if (licenseFilter === 'expired' && expiryInfo.status !== 'expired') return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
        if (sortBy === 'students-desc') return (b._count?.students || 0) - (a._count?.students || 0);
        if (sortBy === 'users-desc') return (b._count?.users || 0) - (a._count?.users || 0);
        if (sortBy === 'created-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'expiry-soonest') {
          const dateA = a.licenseExpiry ? new Date(a.licenseExpiry).getTime() : Infinity;
          const dateB = b.licenseExpiry ? new Date(b.licenseExpiry).getTime() : Infinity;
          return dateA - dateB;
        }
        return 0;
      });
  }, [organizations, searchQuery, statusFilter, licenseFilter, sortBy]);

  // Logo Upload Handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo file size must be less than 5MB');
      return;
    }

    try {
      setUploadingLogo(true);
      const toastId = toast.loading('Uploading organization logo...');
      const uploadedUrl = await uploadFormFile(file);
      setFormData(prev => ({ ...prev, logo: uploadedUrl }));
      toast.success('Logo uploaded successfully!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  // Dialog Handlers
  const handleCreate = () => {
    setEditingOrg(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      logo: '',
      customLoginSlug: '',
      status: 'active',
      licenseId: '',
      licenseExpiry: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (org: Organization, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingOrg(org);
    setFormData({
      name: org.name || '',
      email: org.email || '',
      phone: org.phone || '',
      address: org.address || '',
      logo: org.logo || '',
      customLoginSlug: org.customLoginSlug || '',
      status: org.status || 'active',
      licenseId: typeof org.licenseId === 'string' ? org.licenseId : org.license?.id || '',
      licenseExpiry: org.licenseExpiry ? new Date(org.licenseExpiry).toISOString().slice(0, 10) : '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (org: Organization, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingOrg(org);
    setIsDeleteDialogOpen(true);
  };

  const handleQuickStatusChange = async (org: Organization, newStatus: 'active' | 'inactive' | 'suspended', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (org.status === newStatus) return;

    try {
      await api.put(`/organizations/${org.id}`, { status: newStatus });
      toast.success(`Organization marked as ${newStatus}`);
      setOrganizations(prev => prev.map(item => item.id === org.id ? { ...item, status: newStatus } : item));
      if (selectedOrgForView?.id === org.id) {
        setSelectedOrgForView(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update organization status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast.error('Please fill in required fields (Name, Email, Phone)');
      return;
    }

    try {
      setFormSubmitting(true);
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        logo: formData.logo || null,
        customLoginSlug: formData.customLoginSlug.trim() || null,
        status: formData.status,
      };

      if (formData.licenseId) {
        payload.licenseId = formData.licenseId;
      }
      if (formData.licenseExpiry) {
        payload.licenseExpiry = new Date(formData.licenseExpiry).toISOString();
      }

      if (editingOrg) {
        await api.put(`/organizations/${editingOrg.id}`, payload);
        toast.success('Organization updated successfully');
      } else {
        await api.post('/organizations', payload);
        toast.success('Organization created successfully');
      }

      setIsDialogOpen(false);
      await fetchOrganizations();
    } catch (error: any) {
      console.error('Error saving organization:', error);
      toast.error(error.response?.data?.message || 'Failed to save organization details');
    } finally {
      setFormSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingOrg) return;

    try {
      await api.delete(`/organizations/${deletingOrg.id}`);
      toast.success('Organization removed successfully');
      setIsDeleteDialogOpen(false);
      if (selectedOrgForView?.id === deletingOrg.id) {
        setSelectedOrgForView(null);
      }
      await fetchOrganizations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete organization');
      console.error('Delete error:', error);
    }
  };

  // CSV Export with formatted DD/MM/YYYY dates
  const handleExportCSV = () => {
    if (filteredOrganizations.length === 0) {
      toast.error('No organization records to export');
      return;
    }

    const headers = [
      'Organization Name',
      'Tenant ID',
      'Status',
      'Custom Login Slug',
      'Contact Email',
      'Contact Phone',
      'Address',
      'License Plan',
      'License Expiry (DD/MM/YYYY)',
      'Total Students',
      'Staff / Workforce',
      'Academic Centers',
      'Study Centers',
      'Onboarded Date (DD/MM/YYYY)'
    ];

    const rows = filteredOrganizations.map(org => [
      `"${(org.name || '').replace(/"/g, '""')}"`,
      `"${org.id}"`,
      `"${org.status}"`,
      `"${org.customLoginSlug || ''}"`,
      `"${(org.email || '').replace(/"/g, '""')}"`,
      `"${(org.phone || '').replace(/"/g, '""')}"`,
      `"${(org.address || '').replace(/"/g, '""')}"`,
      `"${(org.license?.name || (typeof org.licenseId === 'object' && org.licenseId?.name) || 'Unassigned').replace(/"/g, '""')}"`,
      `"${formatDate(org.licenseExpiry)}"`,
      org._count?.students || org._count?.enrollments || 0,
      org._count?.users || 0,
      org._count?.academicCenters || 0,
      org._count?.studyCenters || 0,
      `"${formatDate(org.createdAt)}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pype_organizations_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredOrganizations.length} organizations to CSV`);
  };

  // Loading skeleton screen
  if (loading) {
    return (
      <div className="space-y-6 p-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-44 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-muted/60 animate-pulse rounded-2xl border" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-72 bg-muted/40 animate-pulse rounded-3xl border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Organizations & Institutional Tenants
            </h1>
            <Badge variant="outline" className="hidden sm:inline-flex bg-primary/5 text-primary border-primary/20 text-xs font-semibold">
              Multi-Tenant Cluster
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure tenant instances, license entitlements, dedicated login slugs, and institutional operational scale.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrganizations}
            disabled={refreshing}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-1.5 hover:bg-muted"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </Button>

          <Button
            onClick={handleCreate}
            size="sm"
            className="h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Organization</span>
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Organizations */}
        <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Tenants
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight">{metrics.total}</span>
                <span className="text-xs text-emerald-600 font-medium">
                  {metrics.activeRatio}% active
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {metrics.active} active • {metrics.inactive + metrics.suspended} inactive
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Enrolled Students */}
        <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Students Enrolled
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
                  {metrics.totalStudents.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">students</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Active institutional students
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Team Members & Staff */}
        <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Platform Workforce
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-violet-600 dark:text-violet-400">
                  {metrics.totalUsers.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">staff</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Admins, faculties & operators
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Campuses & Centers */}
        <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Campuses & Centers
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
                  {metrics.totalCenters.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">sites</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Study & academic centers
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <School className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter, Search & Layout Control Toolbar */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl border bg-card/40 backdrop-blur">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone, slug or ID..."
              className="pl-9 pr-8 h-10 rounded-xl bg-background border-border/80 text-sm"
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

          {/* Quick Filter Selects & Mode Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* License Filter */}
            <Select value={licenseFilter} onValueChange={(val: any) => setLicenseFilter(val)}>
              <SelectTrigger className="h-10 w-[150px] rounded-xl text-xs bg-background">
                <Shield className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Licenses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Licenses</SelectItem>
                <SelectItem value="licensed">Licensed Only</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="unlicensed">Unlicensed</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-10 w-[160px] rounded-xl text-xs bg-background">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A → Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z → A)</SelectItem>
                <SelectItem value="students-desc">Most Students</SelectItem>
                <SelectItem value="users-desc">Most Workforce</SelectItem>
                <SelectItem value="expiry-soonest">License Expiry</SelectItem>
                <SelectItem value="created-desc">Newest First</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle (Grid vs Table) */}
            <div className="flex items-center rounded-xl border bg-background p-0.5">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8.5 px-3 rounded-lg text-xs"
                title="Card Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                <span>Cards</span>
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8.5 px-3 rounded-lg text-xs"
                title="Table View"
              >
                <List className="w-3.5 h-3.5 mr-1.5" />
                <span>Table</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Status Filter Badges Strip */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="font-medium mr-1 text-foreground/80">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'bg-muted/60 hover:bg-muted text-muted-foreground'
              }`}
            >
              All ({metrics.total})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-full font-medium inline-flex items-center gap-1.5 transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active ({metrics.active})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-500/10 text-slate-700 dark:text-slate-400 hover:bg-slate-500/20'
              }`}
            >
              Inactive ({metrics.inactive})
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                statusFilter === 'suspended'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20'
              }`}
            >
              Suspended ({metrics.suspended})
            </button>
          </div>

          <div className="text-xs">
            Showing <strong className="text-foreground">{filteredOrganizations.length}</strong> of {organizations.length}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredOrganizations.length === 0 ? (
        /* Empty State */
        <Card className="rounded-3xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Building2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">No organizations match your filters</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Try clearing your search query or switching your status and license filters.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              {(searchQuery || statusFilter !== 'all' || licenseFilter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setLicenseFilter('all');
                  }}
                  className="rounded-xl"
                >
                  Reset Filters
                </Button>
              )}
              <Button onClick={handleCreate} className="rounded-xl gap-1.5">
                <Plus className="w-4 h-4" />
                Add New Organization
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Cards Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredOrganizations.map((org) => {
            const expiryInfo = getLicenseExpiryInfo(org.licenseExpiry);
            const licenseName = org.license?.name || (typeof org.licenseId === 'object' && org.licenseId?.name) || 'Standard Plan';
            const initials = getInitials(org.name);
            const gradient = getGradientForOrg(org.name);

            return (
              <Card 
                key={org.id} 
                className="group relative rounded-3xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Top Subtle Status Line */}
                <div 
                  className={`h-1.5 w-full ${
                    org.status === 'active' 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                      : org.status === 'suspended'
                      ? 'bg-gradient-to-r from-rose-500 to-red-600'
                      : 'bg-gradient-to-r from-slate-400 to-zinc-500'
                  }`} 
                />

                <div>
                  {/* Card Header & Identity */}
                  <CardHeader className="pb-3 pt-5 px-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      {/* Avatar & Title */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {org.logo ? (
                          <img
                            src={api.getFileUrl(org.logo)}
                            alt={org.name}
                            className="w-12 h-12 rounded-2xl object-contain bg-background border p-1 shadow-xs shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          style={{ display: org.logo ? 'none' : 'flex' }}
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-base shadow-sm shrink-0 tracking-tight ring-2 ring-background`}
                        >
                          {initials}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <CardTitle 
                            className="text-base font-bold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors cursor-pointer"
                            onClick={() => setSelectedOrgForView(org)}
                            title={org.name}
                          >
                            {org.name}
                          </CardTitle>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {org.customLoginSlug ? (
                              <button
                                onClick={(e) => handleCopy(org.customLoginSlug!, 'Login slug', e)}
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md transition-colors"
                                title="Click to copy custom slug"
                              >
                                <Globe className="w-3 h-3 text-primary" />
                                <span>/@{org.customLoginSlug}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[140px]">
                                ID: {org.id.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status & Options Menu */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={`capitalize font-semibold text-[11px] px-2.5 py-0.5 rounded-full ${
                            org.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : org.status === 'suspended'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                              : 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30'
                          }`}
                        >
                          <span 
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              org.status === 'active' ? 'bg-emerald-500 animate-pulse' : org.status === 'suspended' ? 'bg-rose-500' : 'bg-slate-400'
                            }`} 
                          />
                          {org.status}
                        </Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
                            <DropdownMenuLabel className="text-xs">Organization Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setSelectedOrgForView(org)} className="cursor-pointer text-xs">
                              <Eye className="w-3.5 h-3.5 mr-2 text-primary" />
                              View Deep Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleEdit(org, e)} className="cursor-pointer text-xs">
                              <Edit className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                              Edit Configuration
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleCopy(org.id, 'Organization ID', e)} className="cursor-pointer text-xs">
                              <Copy className="w-3.5 h-3.5 mr-2 text-slate-500" />
                              Copy Tenant ID
                            </DropdownMenuItem>
                            {org.customLoginSlug && (
                              <DropdownMenuItem 
                                onClick={(e) => handleCopy(`${window.location.origin}/login/${org.customLoginSlug}`, 'Portal URL', e)}
                                className="cursor-pointer text-xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-2 text-blue-500" />
                                Copy Portal Link
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase">Change Status</DropdownMenuLabel>
                            {org.status !== 'active' && (
                              <DropdownMenuItem onClick={(e) => handleQuickStatusChange(org, 'active', e)} className="text-xs text-emerald-600 cursor-pointer">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                Activate Tenant
                              </DropdownMenuItem>
                            )}
                            {org.status !== 'inactive' && (
                              <DropdownMenuItem onClick={(e) => handleQuickStatusChange(org, 'inactive', e)} className="text-xs text-slate-600 cursor-pointer">
                                <Clock className="w-3.5 h-3.5 mr-2 text-slate-600" />
                                Deactivate Tenant
                              </DropdownMenuItem>
                            )}
                            {org.status !== 'suspended' && (
                              <DropdownMenuItem onClick={(e) => handleQuickStatusChange(org, 'suspended', e)} className="text-xs text-rose-600 cursor-pointer">
                                <AlertTriangle className="w-3.5 h-3.5 mr-2 text-rose-600" />
                                Suspend Tenant
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => handleDelete(org, e)} className="text-xs text-destructive cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete Tenant
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Metrics Footprint Grid */}
                  <div className="px-5 py-1">
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-muted/40 border border-border/50">
                      {/* Students */}
                      <div className="text-center space-y-0.5">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Students
                        </span>
                        <div className="flex items-center justify-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-xs font-bold text-foreground">
                            {org._count?.students || org._count?.enrollments || 0}
                          </span>
                        </div>
                      </div>

                      {/* Staff */}
                      <div className="text-center space-y-0.5 border-l border-border/50">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Staff
                        </span>
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="text-xs font-bold text-foreground">
                            {org._count?.users || 0}
                          </span>
                        </div>
                      </div>

                      {/* Centers */}
                      <div className="text-center space-y-0.5 border-l border-border/50">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Centers
                        </span>
                        <div className="flex items-center justify-center gap-1">
                          <School className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-xs font-bold text-foreground">
                            {(org._count?.studyCenters || 0) + (org._count?.academicCenters || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* License & Expiry Strip */}
                  <div className="px-5 py-2.5">
                    <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-background border border-border/60">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-semibold text-foreground truncate">
                          {licenseName}
                        </span>
                      </div>
                      
                      <div className="shrink-0">
                        {org.licenseExpiry ? (
                          <span className={`inline-flex items-center gap-1 font-medium text-[11px] ${
                            expiryInfo.status === 'expired'
                              ? 'text-rose-600 dark:text-rose-400'
                              : expiryInfo.status === 'expiring_soon'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-muted-foreground'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            {expiryInfo.label}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Perpetual</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Coordinates */}
                  <CardContent className="px-5 py-1 text-xs space-y-1.5 text-muted-foreground">
                    <div className="flex items-center justify-between group/email">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate" title={org.email}>{org.email || 'No email provided'}</span>
                      </div>
                      {org.email && (
                        <button
                          onClick={(e) => handleCopy(org.email, 'Email address', e)}
                          className="opacity-0 group-hover/email:opacity-100 hover:text-foreground p-0.5 transition-opacity"
                          title="Copy email"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between group/phone">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{org.phone || 'No phone recorded'}</span>
                      </div>
                      {org.phone && (
                        <button
                          onClick={(e) => handleCopy(org.phone, 'Phone number', e)}
                          className="opacity-0 group-hover/phone:opacity-100 hover:text-foreground p-0.5 transition-opacity"
                          title="Copy phone"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="line-clamp-1" title={org.address}>
                        {org.address || 'Address not registered'}
                      </span>
                    </div>
                  </CardContent>
                </div>

                {/* Card Action Footer */}
                <div className="px-5 py-3 mt-3 border-t bg-muted/15 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Onboarded: {formatDate(org.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrgForView(org)}
                      className="h-8 px-2.5 rounded-xl text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleEdit(org, e)}
                      className="h-8 px-2.5 rounded-xl text-xs font-medium hover:bg-muted"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Dense Multi-Tenant Table View */
        <Card className="rounded-2xl border overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[280px]">Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>License Plan</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Staff</TableHead>
                <TableHead className="text-center">Centers</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Onboarded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.map((org) => {
                const expiryInfo = getLicenseExpiryInfo(org.licenseExpiry);
                const licenseName = org.license?.name || (typeof org.licenseId === 'object' && org.licenseId?.name) || 'Standard';
                const initials = getInitials(org.name);
                const gradient = getGradientForOrg(org.name);

                return (
                  <TableRow key={org.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => setSelectedOrgForView(org)}>
                    {/* Organization Identity */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {org.logo ? (
                          <img
                            src={api.getFileUrl(org.logo)}
                            alt={org.name}
                            className="w-9 h-9 rounded-xl object-contain bg-background border p-0.5 shadow-xs shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          style={{ display: org.logo ? 'none' : 'flex' }}
                          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-xs shadow-xs shrink-0`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground line-clamp-1">{org.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {org.customLoginSlug ? `/@${org.customLoginSlug}` : org.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize font-semibold text-[11px] rounded-full px-2.5 py-0.5 ${
                          org.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            : org.status === 'suspended'
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                            : 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30'
                        }`}
                      >
                        <span 
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            org.status === 'active' ? 'bg-emerald-500 animate-pulse' : org.status === 'suspended' ? 'bg-rose-500' : 'bg-slate-400'
                          }`} 
                        />
                        {org.status}
                      </Badge>
                    </TableCell>

                    {/* License */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-medium text-xs text-foreground">
                          <Shield className="w-3 h-3 text-primary" />
                          <span>{licenseName}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {expiryInfo.label}
                        </p>
                      </div>
                    </TableCell>

                    {/* Counts */}
                    <TableCell className="text-center font-semibold text-xs">
                      {org._count?.students || org._count?.enrollments || 0}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-xs">
                      {org._count?.users || 0}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-xs">
                      {(org._count?.studyCenters || 0) + (org._count?.academicCenters || 0)}
                    </TableCell>

                    {/* Contact */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        <p className="truncate max-w-[150px]">{org.email}</p>
                        <p>{org.phone}</p>
                      </div>
                    </TableCell>

                    {/* Onboarded Date */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(org.createdAt)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedOrgForView(org)}
                          className="h-8 w-8 rounded-lg hover:text-primary"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleEdit(org, e)}
                          className="h-8 w-8 rounded-lg hover:text-primary"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(org, e)}
                          className="h-8 w-8 rounded-lg hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Slide-out Sheet: Organization Deep Profile View */}
      <Sheet open={Boolean(selectedOrgForView)} onOpenChange={(open) => !open && setSelectedOrgForView(null)}>
        <SheetContent className="sm:max-w-md p-0 overflow-y-auto">
          {selectedOrgForView && (
            <div className="flex flex-col h-full">
              {/* Sheet Header Banner */}
              <div className="p-6 pb-4 bg-muted/30 border-b space-y-4">
                <div className="flex items-center gap-3.5">
                  {selectedOrgForView.logo ? (
                    <img
                      src={api.getFileUrl(selectedOrgForView.logo)}
                      alt={selectedOrgForView.name}
                      className="w-14 h-14 rounded-2xl object-contain bg-background border p-1 shadow-md shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    style={{ display: selectedOrgForView.logo ? 'none' : 'flex' }}
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGradientForOrg(selectedOrgForView.name)} flex items-center justify-center font-bold text-lg shadow-md shrink-0`}
                  >
                    {getInitials(selectedOrgForView.name)}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-lg font-bold text-foreground leading-tight">
                      {selectedOrgForView.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`capitalize text-xs font-semibold ${
                          selectedOrgForView.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            : selectedOrgForView.status === 'suspended'
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                            : 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30'
                        }`}
                      >
                        {selectedOrgForView.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Since {formatDate(selectedOrgForView.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tenant ID & Portal Slug Copy Chips */}
                <div className="grid grid-cols-1 gap-2 pt-1 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-background border">
                    <span className="text-muted-foreground font-medium">Tenant ID:</span>
                    <button
                      onClick={() => handleCopy(selectedOrgForView.id, 'Tenant ID')}
                      className="flex items-center gap-1 font-mono text-[11px] text-foreground hover:text-primary transition-colors"
                    >
                      <span>{selectedOrgForView.id.slice(0, 16)}...</span>
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>

                  {selectedOrgForView.customLoginSlug && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-background border">
                      <span className="text-muted-foreground font-medium">Dedicated Slug:</span>
                      <button
                        onClick={() => handleCopy(selectedOrgForView.customLoginSlug!, 'Custom Slug')}
                        className="flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                      >
                        <Globe className="w-3 h-3" />
                        <span>/@{selectedOrgForView.customLoginSlug}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sheet Body Details */}
              <div className="p-6 space-y-6 flex-1">
                {/* Metrics Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Institutional Footprint
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 text-center space-y-0.5">
                      <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {selectedOrgForView._count?.students || selectedOrgForView._count?.enrollments || 0}
                      </span>
                      <p className="text-xs font-medium text-muted-foreground">Students</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-violet-500/5 border border-violet-500/20 text-center space-y-0.5">
                      <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
                        {selectedOrgForView._count?.users || 0}
                      </span>
                      <p className="text-xs font-medium text-muted-foreground">Team / Staff</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center space-y-0.5">
                      <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                        {(selectedOrgForView._count?.studyCenters || 0) + (selectedOrgForView._count?.academicCenters || 0)}
                      </span>
                      <p className="text-xs font-medium text-muted-foreground">Centers & Sites</p>
                    </div>
                  </div>
                </div>

                {/* License Information */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    License & Subscription
                  </h4>
                  <div className="p-4 rounded-2xl bg-muted/40 border space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Plan Tier:</span>
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-primary" />
                        {selectedOrgForView.license?.name || (typeof selectedOrgForView.licenseId === 'object' && selectedOrgForView.licenseId?.name) || 'Standard Enterprise'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Expiration:</span>
                      <span className="font-medium text-foreground">
                        {selectedOrgForView.licenseExpiry ? formatDate(selectedOrgForView.licenseExpiry) : 'Perpetual (No Expiry)'}
                      </span>
                    </div>
                    {selectedOrgForView.license?.maxUsers && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Allowed Seats:</span>
                        <span className="font-medium text-foreground">{selectedOrgForView.license.maxUsers} Users</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Contact Coordinates */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Contact Coordinates
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-background border">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-muted-foreground text-[10px] block">Primary Email</span>
                        <span className="font-medium text-foreground select-all">{selectedOrgForView.email || 'None'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-background border">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-muted-foreground text-[10px] block">Phone Number</span>
                        <span className="font-medium text-foreground select-all">{selectedOrgForView.phone || 'None'}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-background border">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-muted-foreground text-[10px] block">Physical Address</span>
                        <span className="font-medium text-foreground">{selectedOrgForView.address || 'None'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sheet Footer Actions */}
              <div className="p-4 bg-muted/20 border-t flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const org = selectedOrgForView;
                    setSelectedOrgForView(null);
                    handleEdit(org);
                  }}
                  className="flex-1 rounded-xl gap-1.5"
                >
                  <Edit className="w-4 h-4" />
                  Edit Configuration
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const org = selectedOrgForView;
                    setSelectedOrgForView(null);
                    handleDelete(org);
                  }}
                  className="rounded-xl px-3"
                  title="Delete Tenant"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create / Edit Organization Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                {editingOrg ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <DialogTitle className="text-xl font-bold">
                {editingOrg ? 'Edit Organization' : 'Create New Organization'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingOrg
                ? 'Update tenant identity, domain routing, contacts, and license details.'
                : 'Provision a new multi-tenant organization instance with individual database tenancy.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Section 1: Institutional Identity */}
            <div className="space-y-3">
              {/* Organization Logo Upload */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-muted/40 border border-border/60">
                <div className="relative group shrink-0">
                  {formData.logo ? (
                    <img
                      src={api.getFileUrl(formData.logo)}
                      alt="Organization Logo"
                      className="w-14 h-14 rounded-2xl object-contain bg-background border p-1 shadow-xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center font-bold text-lg border border-primary/20">
                      {formData.name ? getInitials(formData.name) : <Building2 className="w-6 h-6" />}
                    </div>
                  )}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Organization Logo
                    </Label>
                    {formData.logo && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                        className="text-[11px] text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Upload institutional emblem (PNG, JPG, SVG, WebP)
                  </p>
                  <div className="pt-0.5">
                    <input
                      id="org-logo-upload-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('org-logo-upload-input')?.click()}
                      disabled={uploadingLogo}
                      className="h-7 text-xs rounded-lg gap-1.5"
                    >
                      {uploadingLogo ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3" />
                          <span>{formData.logo ? 'Change Logo' : 'Upload Logo'}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">
                  Organization Legal Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. TIMS Educational Trust"
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="customLoginSlug" className="text-xs font-semibold">
                    Portal Login Slug (Optional)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">/@</span>
                    <Input
                      id="customLoginSlug"
                      value={formData.customLoginSlug}
                      onChange={(e) => setFormData({ ...formData, customLoginSlug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                      placeholder="tims"
                      className="pl-8 rounded-xl font-mono text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Custom URL subdomain for institutional portal</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-xs font-semibold">
                    Operational Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                  >
                    <SelectTrigger className="rounded-xl h-9.5 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Operational)</SelectItem>
                      <SelectItem value="inactive">Inactive (Paused)</SelectItem>
                      <SelectItem value="suspended">Suspended (Restricted)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 2: Contact Information */}
            <div className="pt-2 border-t space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Contact & Headquarters
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Contact Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="admin@institution.edu"
                    className="rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold">
                    Contact Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-semibold">
                  Physical Address
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street Address, City, State, ZIP code"
                  rows={2}
                  className="rounded-xl text-xs resize-none"
                />
              </div>
            </div>

            {/* Section 3: License & Expiration */}
            <div className="pt-2 border-t space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                License Entitlement
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="licenseId" className="text-xs font-semibold">
                    License Plan
                  </Label>
                  <Select
                    value={formData.licenseId || 'unassigned'}
                    onValueChange={(val) => setFormData({ ...formData, licenseId: val === 'unassigned' ? '' : val })}
                  >
                    <SelectTrigger className="rounded-xl h-9.5 text-xs">
                      <SelectValue placeholder="Select license tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned (Default Tier)</SelectItem>
                      {availableLicenses.map((lic) => (
                        <SelectItem key={lic.id} value={lic.id}>
                          {lic.name} {lic.price ? `(₹${lic.price.toLocaleString()})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="licenseExpiry" className="text-xs font-semibold">
                    License Expiry Date
                  </Label>
                  <Input
                    id="licenseExpiry"
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                    className="rounded-xl text-xs"
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
                {formSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </span>
                ) : editingOrg ? (
                  'Update Organization'
                ) : (
                  'Create Organization'
                )}
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
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Permanently Delete Organization?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground space-y-2">
              <p>
                Are you sure you want to delete <strong className="text-foreground">{deletingOrg?.name}</strong>?
              </p>
              <p className="p-2.5 rounded-xl bg-destructive/5 text-destructive border border-destructive/20 text-xs">
                ⚠️ This action is irreversible. All branches, academic records, and users under this tenant will be unlinked or removed.
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
