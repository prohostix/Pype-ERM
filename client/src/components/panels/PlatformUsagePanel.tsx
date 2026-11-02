import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  TrendingUp, 
  Building2, 
  Users, 
  GraduationCap, 
  CreditCard, 
  Search, 
  RefreshCw, 
  Download, 
  Filter, 
  Clock, 
  Shield, 
  ArrowUpRight, 
  CheckCircle2, 
  Layers, 
  Calendar, 
  X, 
  Eye, 
  FileSpreadsheet, 
  AlertTriangle,
  ChevronRight,
  Server,
  Zap,
  Globe,
  Lock,
  ArrowUpDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Area, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';

// Currency Formatter for INR
const formatINR = (val: number) => {
  if (!val && val !== 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

// Date Formatter to DD/MM/YYYY
const formatDate = (dateStr?: string | Date): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return 'N/A';
  }
};

const ACTION_COLORS: Record<string, string> = {
  create: '#10b981', // Emerald
  update: '#3b82f6', // Blue
  delete: '#ef4444', // Red
  login: '#8b5cf6', // Purple
  verify: '#f59e0b', // Amber
  export: '#06b6d4', // Cyan
  other: '#64748b', // Slate
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function PlatformUsagePanel() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all');
  const [usageData, setUsageData] = useState<any>({
    organizations: [],
    summary: {
      totalEnrollments: 0,
      totalStudents: 0,
      totalUsers: 0,
      totalAuditLogs: 0,
      totalRevenue: 0,
      paymentsCount: 0,
    },
    correlationTrend: [],
    actionDistribution: [],
    entityDistribution: [],
    topOperators: [],
    auditLogs: [],
  });

  // Audit filter states
  const [auditSearch, setAuditSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [inspectAudit, setInspectAudit] = useState<any | null>(null);

  useEffect(() => {
    fetchUsageMetrics(selectedOrgId);
  }, [selectedOrgId]);

  const fetchUsageMetrics = async (orgId: string) => {
    try {
      setRefreshing(true);
      const url = orgId === 'all' ? '/dashboard/usage' : `/dashboard/usage?organizationId=${orgId}`;
      const res = await api.get(url);
      if (res.data.success) {
        setUsageData(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch platform usage metrics', err);
      toast.error('Failed to load usage telemetry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const selectedOrg = useMemo(() => {
    if (selectedOrgId === 'all') return null;
    return usageData.organizations?.find((o: any) => o.id === selectedOrgId);
  }, [selectedOrgId, usageData.organizations]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    const list = usageData.auditLogs || [];
    return list.filter((a: any) => {
      if (actionFilter !== 'all' && (a.action || '').toLowerCase() !== actionFilter.toLowerCase()) {
        return false;
      }
      if (entityFilter !== 'all' && (a.entityType || '').toLowerCase() !== entityFilter.toLowerCase()) {
        return false;
      }
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        const matchesUser = (a.user?.name || '').toLowerCase().includes(q) || (a.user?.email || '').toLowerCase().includes(q);
        const matchesEntity = (a.entityType || '').toLowerCase().includes(q) || (a.entityId || '').toLowerCase().includes(q);
        const matchesAction = (a.action || '').toLowerCase().includes(q);
        const matchesOrg = (a.organization?.name || '').toLowerCase().includes(q);
        const matchesIp = (a.ipAddress || '').toLowerCase().includes(q);
        if (!matchesUser && !matchesEntity && !matchesAction && !matchesOrg && !matchesIp) {
          return false;
        }
      }
      return true;
    });
  }, [usageData.auditLogs, actionFilter, entityFilter, auditSearch]);

  // Export Audits to CSV
  const handleExportAudits = () => {
    if (filteredAuditLogs.length === 0) {
      toast.error('No audit records to export');
      return;
    }

    const headers = ['Timestamp (DD/MM/YYYY HH:mm)', 'Operator Name', 'Operator Email', 'Role', 'Organization', 'Action', 'Target Entity', 'Entity ID', 'IP Address'];
    const rows = filteredAuditLogs.map((a: any) => [
      `"${formatDate(a.timestamp)}"`,
      `"${(a.user?.name || 'System').replace(/"/g, '""')}"`,
      `"${(a.user?.email || '').replace(/"/g, '""')}"`,
      `"${a.user?.role || ''}"`,
      `"${(a.organization?.name || 'Global').replace(/"/g, '""')}"`,
      `"${a.action || ''}"`,
      `"${a.entityType || ''}"`,
      `"${a.entityId || ''}"`,
      `"${a.ipAddress || 'Internal'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `platform_audits_${selectedOrgId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredAuditLogs.length} audit records to CSV`);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-2">
        <div className="h-12 w-80 bg-muted animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-3xl" />
          ))}
        </div>
        <div className="h-96 bg-muted/50 animate-pulse rounded-3xl" />
      </div>
    );
  }

  const { summary, correlationTrend, actionDistribution, entityDistribution, topOperators } = usageData;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Header with Prominent Organization Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-gradient-to-r from-card via-card/90 to-card/60 rounded-3xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Platform Usage &amp; Analytics
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">
              Live Telemetry
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedOrg
              ? `Displaying dedicated telemetry, admissions velocity, cashflow, and audit trail for ${selectedOrg.name}.`
              : 'Global platform analytics aggregated across all institutional tenants and infrastructure.'}
          </p>
        </div>

        {/* Header Controls: Organization Dropdown & Refresh */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Organization Filter Dropdown */}
          <div className="relative min-w-[240px]">
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="h-10 rounded-xl bg-background border-border shadow-xs text-xs font-semibold">
                <Building2 className="w-4 h-4 mr-1.5 text-primary" />
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg max-h-[300px]">
                <SelectItem value="all" className="font-bold text-xs">
                  🏢 All Organizations (Global Network)
                </SelectItem>
                {usageData.organizations?.map((org: any) => (
                  <SelectItem key={org.id} value={org.id} className="text-xs">
                    {org.name} ({org._count?.students || 0} students)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsageMetrics(selectedOrgId)}
            disabled={refreshing}
            className="h-10 px-3.5 rounded-xl text-xs gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-primary", refreshing && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAudits}
            className="h-10 px-3.5 rounded-xl text-xs gap-1.5 hover:bg-muted"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Audits</span>
          </Button>
        </div>
      </div>

      {/* Scope Pill if Filtered */}
      {selectedOrg && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">Filtered View:</span>
            <strong className="text-foreground text-sm">{selectedOrg.name}</strong>
            {selectedOrg.customLoginSlug && (
              <Badge variant="outline" className="text-[10px] font-mono">
                /@{selectedOrg.customLoginSlug}
              </Badge>
            )}
          </div>
          <button
            onClick={() => setSelectedOrgId('all')}
            className="text-primary hover:underline font-semibold flex items-center gap-1"
          >
            <span>Reset to Global Network</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Metric Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Admissions */}
        <Card className="rounded-3xl border border-border/80 bg-card/60 backdrop-blur shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Admissions
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {summary.totalEnrollments.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">students</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {summary.totalStudents.toLocaleString()} registered student profiles
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="rounded-3xl border border-border/80 bg-card/60 backdrop-blur shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Fee Collections
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatINR(summary.totalRevenue)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {summary.paymentsCount} verified payment entries
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* User Actions & Audits */}
        <Card className="rounded-3xl border border-border/80 bg-card/60 backdrop-blur shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Audit Events Tracked
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {summary.totalAuditLogs.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">actions</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Logged with IP, user & payload
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Active Workforce */}
        <Card className="rounded-3xl border border-border/80 bg-card/60 backdrop-blur shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Workforce / Staff
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
                  {summary.totalUsers.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">accounts</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Active administrative operators
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 1: Enrollment Velocity & Revenue Correlation Chart */}
      <Card className="rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden">
        <CardHeader className="p-6 pb-2 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Enrollment Velocity &amp; Revenue Correlated
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Monthly admissions volume mapped against total fee cashflow earned on those enrollments.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded-sm bg-indigo-500" />
                <span>Admissions (Bars)</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-1 rounded-sm bg-emerald-500" />
                <span>Revenue (Line)</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={correlationTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="enrollmentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.15)" vertical={false} />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#6366f1" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#10b981" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => formatINR(val)}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 bg-popover/95 backdrop-blur-md border rounded-xl shadow-xl text-xs space-y-1.5 min-w-[170px]">
                          <p className="font-bold text-foreground border-b pb-1">{label}</p>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-indigo-600 font-medium">Admissions:</span>
                            <span className="font-bold">{data.enrollments}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-emerald-600 font-medium">Fee Revenue:</span>
                            <span className="font-bold text-foreground">{formatINR(data.revenue)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-[10px] text-muted-foreground pt-1 border-t">
                            <span>Completed:</span>
                            <span>{data.completed}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar yAxisId="left" dataKey="enrollments" fill="url(#enrollmentGrad)" radius={[6, 6, 0, 0]} maxBarSize={45} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: User Action Graphs & Activity Dynamics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action Type Distribution (Donut Chart) */}
        <Card className="rounded-3xl border border-border/80 bg-card shadow-sm flex flex-col justify-between">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Action Type Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of system events by operation category.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {actionDistribution.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
                No action telemetry recorded
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={actionDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="count"
                      >
                        {actionDistribution.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={ACTION_COLORS[entry.action] || PIE_COLORS[index % PIE_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="p-2 bg-popover border rounded-lg shadow-md text-xs">
                                <p className="font-bold capitalize">{d.name}</p>
                                <p className="text-muted-foreground">{d.count} operations</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Micro Legend */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {actionDistribution.slice(0, 4).map((item: any, idx: number) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: ACTION_COLORS[item.action] || PIE_COLORS[idx % PIE_COLORS.length] }} 
                      />
                      <span className="truncate text-muted-foreground capitalize">{item.name}</span>
                      <strong className="ml-auto text-foreground">{item.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entity Activity Breakdown */}
        <Card className="rounded-3xl border border-border/80 bg-card shadow-sm flex flex-col justify-between">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              Activity by Module / Entity
            </CardTitle>
            <CardDescription className="text-xs">
              Frequency of data modifications across platform components.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {entityDistribution.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
                No entity records
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={entityDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(150, 150, 150, 0.15)" />
                    <XAxis type="number" fontSize={11} stroke="#888888" tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" fontSize={11} stroke="#888888" tickLine={false} axisLine={false} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="p-2 bg-popover border rounded-lg shadow-md text-xs">
                              <p className="font-bold">{d.name}</p>
                              <p className="text-muted-foreground">{d.count} operations</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Active Operators Leaderboard */}
        <Card className="rounded-3xl border border-border/80 bg-card shadow-sm flex flex-col justify-between">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-500" />
              Most Active Operators
            </CardTitle>
            <CardDescription className="text-xs">
              Personnel generating the highest action volume.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            {topOperators.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
                No active operator telemetry
              </div>
            ) : (
              <div className="space-y-3">
                {topOperators.map((item: any, idx: number) => (
                  <div key={item.user.id || idx} className="flex items-center justify-between p-2.5 rounded-2xl bg-muted/30 border border-border/50 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                        {item.user.name?.slice(0, 2).toUpperCase() || 'OP'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{item.user.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] font-mono capitalize">
                        {item.user.role?.replace(/_/g, ' ')}
                      </Badge>
                      <span className="font-black text-sm text-primary">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION 3: Audits Overall Data (Live Audit Trail & Stream) */}
      <Card className="rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Comprehensive Platform Audit Trail
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Cryptographic transaction and modification records across institutional tenants, users, and admissions.
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAudits}
              className="h-9 gap-1.5 rounded-xl text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit Trail (CSV)</span>
            </Button>
          </div>

          {/* Audit Search & Filters Strip */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit trail by operator, action, entity, or IP..."
                className="pl-9 pr-8 h-9 text-xs rounded-xl bg-background"
              />
              {auditSearch && (
                <button
                  onClick={() => setAuditSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9 w-[130px] rounded-xl text-xs bg-background">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-9 w-[140px] rounded-xl text-xs bg-background">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="enrollment">Enrollment</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target Entity</TableHead>
                  <TableHead>IP Trace</TableHead>
                  <TableHead className="text-right">Inspection</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAuditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No audit events match your filter criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAuditLogs.slice(0, 50).map((audit: any) => {
                    const actionLower = (audit.action || '').toLowerCase();
                    const isCreate = actionLower.includes('create') || actionLower.includes('insert');
                    const isDelete = actionLower.includes('delete') || actionLower.includes('remove');
                    const isUpdate = actionLower.includes('update') || actionLower.includes('edit');

                    return (
                      <TableRow key={audit.id} className="text-xs hover:bg-muted/30">
                        {/* Timestamp */}
                        <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                          {formatDate(audit.timestamp)}
                        </TableCell>

                        {/* Operator */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                              {audit.user?.name?.slice(0, 2).toUpperCase() || 'SY'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{audit.user?.name || 'System'}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{audit.user?.role || 'Service'}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Organization */}
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] bg-background">
                            {audit.organization?.name || 'Platform Global'}
                          </Badge>
                        </TableCell>

                        {/* Action Badge */}
                        <TableCell>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1",
                            isCreate ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                            isDelete ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" :
                            isUpdate ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" :
                            "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isCreate ? "bg-emerald-500" : isDelete ? "bg-rose-500" : isUpdate ? "bg-blue-500" : "bg-slate-400"
                            )} />
                            {audit.action}
                          </span>
                        </TableCell>

                        {/* Target Entity */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground">{audit.entityType}</span>
                            {audit.entityId && (
                              <p className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                                #{audit.entityId.slice(0, 8)}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* IP Trace */}
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {audit.ipAddress || 'Internal Service'}
                        </TableCell>

                        {/* Inspection Dialog Trigger */}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInspectAudit(audit)}
                            className="h-7 px-2 text-xs hover:bg-muted"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-primary" />
                            Inspect
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Inspect Audit Log Modal */}
      <Dialog open={Boolean(inspectAudit)} onOpenChange={(open) => !open && setInspectAudit(null)}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Audit Transaction Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cryptographic log entry #{inspectAudit?.id}
            </DialogDescription>
          </DialogHeader>

          {inspectAudit && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">Operator</span>
                  <span className="font-semibold text-foreground">{inspectAudit.user?.name || 'System User'}</span>
                  <p className="text-[11px] text-muted-foreground">{inspectAudit.user?.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">Organization</span>
                  <span className="font-semibold text-foreground">{inspectAudit.organization?.name || 'Global'}</span>
                  <p className="text-[11px] text-muted-foreground">IP: {inspectAudit.ipAddress || '127.0.0.1'}</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-muted/40 border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">Action / Entity</span>
                  <Badge variant="outline" className="text-[10px]">
                    {inspectAudit.action} on {inspectAudit.entityType}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Target Entity ID:</span>
                  <span className="font-mono text-foreground">{inspectAudit.entityId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Recorded At:</span>
                  <span className="font-mono text-foreground">{formatDate(inspectAudit.timestamp)}</span>
                </div>
              </div>

              {/* Payload Changes */}
              {(inspectAudit.newValue || inspectAudit.oldValue) && (
                <div className="space-y-2">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">
                    Recorded State Payload
                  </span>
                  <pre className="p-3 rounded-2xl bg-muted/60 border text-[11px] font-mono overflow-x-auto max-h-48 text-foreground">
                    {JSON.stringify(inspectAudit.newValue || inspectAudit.oldValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

