import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
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

import { CS, numLocale, compactMoney } from '@/lib/currency';
// Currency Formatter for INR
const formatINR = (val: number) => {
  if (!val && val !== 0) return `${CS()}0`;
  if (numLocale() !== 'en-IN') return compactMoney(val, 2);
  if (val >= 10000000) return `${CS()}${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${CS()}${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `${CS()}${(val / 1000).toFixed(1)}k`;
  return `${CS()}${Number(val).toLocaleString(numLocale(), { maximumFractionDigits: 0 })}`;
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
  create: '#256c1d', // Emerald
  update: '#54b947', // Blue
  delete: '#ef4444', // Red
  login: '#0b1d14', // Purple
  verify: '#8ae47e', // Amber
  export: '#b8d8b0', // Cyan
  other: '#64748b', // Slate
};

const PIE_COLORS = ['#54b947', '#256c1d', '#8ae47e', '#ef4444', '#0b1d14', '#b8d8b0', '#2f8a24'];

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
  });

  // Audit filter states
  const [auditSearch, setAuditSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [inspectAudit, setInspectAudit] = useState<any | null>(null);

  // Paged audit trail (fetched from the server one page at a time)
  const AUDIT_PAGE_SIZE = 10;
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(true);
  const [debouncedAuditSearch, setDebouncedAuditSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAuditSearch(auditSearch.trim()), 350);
    return () => clearTimeout(t);
  }, [auditSearch]);

  // Any change to the filters goes back to the first page
  useEffect(() => {
    setAuditPage(1);
  }, [selectedOrgId, actionFilter, entityFilter, debouncedAuditSearch]);

  const auditQuery = (extra: Record<string, string>) => {
    const params = new URLSearchParams({ organizationId: selectedOrgId, action: actionFilter, entity: entityFilter, ...extra });
    if (debouncedAuditSearch) params.set('search', debouncedAuditSearch);
    return params.toString();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setAuditLoading(true);
        const res = await api.get(`/dashboard/usage/audit-logs?${auditQuery({ page: String(auditPage), limit: String(AUDIT_PAGE_SIZE) })}`);
        if (cancelled || !res.data.success) return;
        setAuditItems(res.data.data.items || []);
        setAuditTotal(res.data.data.total || 0);
      } catch {
        if (!cancelled) toast.error('Failed to load audit logs');
      } finally {
        if (!cancelled) setAuditLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgId, actionFilter, entityFilter, debouncedAuditSearch, auditPage]);

  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / AUDIT_PAGE_SIZE));

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

  // Export Audits to CSV
  const handleExportAudits = async () => {
    let records: any[] = [];
    try {
      const res = await api.get(`/dashboard/usage/audit-logs?${auditQuery({ all: '1' })}`);
      records = res.data?.data?.items || [];
    } catch {
      toast.error('Failed to export audit records');
      return;
    }
    if (records.length === 0) {
      toast.error('No audit records to export');
      return;
    }

    const headers = ['Timestamp (DD/MM/YYYY HH:mm)', 'Operator Name', 'Operator Email', 'Role', 'Organization', 'Action', 'Target Entity', 'Entity ID', 'IP Address'];
    const rows = records.map((a: any) => [
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
    toast.success(`Exported ${records.length} audit records to CSV`);
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
      {/* Header with Organization Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h1 className="flex items-center gap-3 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground whitespace-nowrap">
            Usage &amp; Telemetry
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#eaf6e6] dark:bg-emerald-500/10 text-[#256c1d] dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#54b947] animate-pulse" /> Live
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
            {selectedOrg
              ? `Telemetry, admissions velocity, cashflow and audit trail for ${selectedOrg.name}.`
              : 'Platform analytics aggregated across all institutional tenants and infrastructure.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap lg:flex-nowrap">
          <div className="relative w-[260px] shrink-0">
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="h-11 rounded-full bg-white border-slate-200 shadow-sm text-sm font-medium px-4">
                <Building2 className="w-4 h-4 mr-1.5 text-[#256c1d]" />
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-lg max-h-[300px]">
                <SelectItem value="all" className="font-semibold text-sm">
                  All Organizations
                </SelectItem>
                {usageData.organizations?.map((org: any) => (
                  <SelectItem key={org.id} value={org.id} className="text-sm">
                    {org.name} ({org._count?.students || 0} students)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={() => fetchUsageMetrics(selectedOrgId)}
            disabled={refreshing}
            className="h-11 px-5 rounded-full bg-white border-slate-200 text-sm font-medium gap-2 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            Refresh
          </Button>

          <Button
            onClick={handleExportAudits}
            className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Audits
          </Button>
        </div>
      </div>

      {/* Scope Pill if Filtered */}
      {selectedOrg && (
        <div className="flex items-center justify-between px-5 py-3.5 rounded-full bg-[#eaf6e6] dark:bg-emerald-500/10 text-sm">
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
        <Card className="rounded-3xl gap-0">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Admissions
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-green-600 dark:text-green-400">
                  {summary.totalEnrollments.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">students</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {summary.totalStudents.toLocaleString()} registered student profiles
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="rounded-3xl gap-0">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Fee Collections
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
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
        <Card className="rounded-3xl gap-0">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Audit Events Tracked
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
                  {summary.totalAuditLogs.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">actions</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Logged with IP, user & payload
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Active Workforce */}
        <Card className="rounded-3xl gap-0">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Workforce / Staff
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-lime-600 dark:text-lime-400">
                  {summary.totalUsers.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">accounts</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Active administrative operators
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-lime-500/10 text-lime-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 1: Enrollment Velocity & Revenue Correlation Chart */}
      <Card className="rounded-3xl overflow-hidden">
        <CardHeader className="px-6 sm:px-7 pt-6 sm:pt-7 pb-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Enrollment Velocity &amp; Revenue Correlated
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Monthly admissions volume mapped against total fee cashflow earned on those enrollments.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded-sm bg-green-500" />
                <span>Admissions (Bars)</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-1 rounded-sm bg-emerald-500" />
                <span>Revenue (Line)</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 sm:px-7 pt-5 pb-6 sm:pb-7">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={correlationTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="enrollmentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#54b947" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#54b947" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.15)" vertical={false} />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#54b947" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#256c1d" 
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
                            <span className="text-green-600 font-medium">Admissions:</span>
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
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#256c1d" strokeWidth={3} dot={{ r: 4, fill: '#256c1d' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: User Action Graphs & Activity Dynamics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action Type Distribution (Donut Chart) */}
        <Card className="rounded-3xl flex flex-col justify-between">
          <CardHeader className="px-6 pt-6 pb-0">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Action Type Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of system events by operation category.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pt-5 pb-6">
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
        <Card className="rounded-3xl flex flex-col justify-between">
          <CardHeader className="px-6 pt-6 pb-0">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              Activity by Module / Entity
            </CardTitle>
            <CardDescription className="text-xs">
              Frequency of data modifications across platform components.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pt-5 pb-6">
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
                    <Bar dataKey="count" fill="#54b947" radius={[0, 6, 6, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Active Operators Leaderboard */}
        <Card className="rounded-3xl flex flex-col justify-between">
          <CardHeader className="px-6 pt-6 pb-0">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-lime-500" />
              Most Active Operators
            </CardTitle>
            <CardDescription className="text-xs">
              Personnel generating the highest action volume.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pt-5 pb-6">
            {topOperators.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
                No active operator telemetry
              </div>
            ) : (
              <div className="space-y-3">
                {topOperators.map((item: any, idx: number) => (
                  <div key={item.user.id || idx} className="flex items-center justify-between p-2.5 rounded-2xl bg-[#f4f6f3] dark:bg-muted/30 text-xs">
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
      <Card className="rounded-3xl overflow-hidden">
        <CardHeader className="px-6 sm:px-7 pt-6 sm:pt-7 pb-2 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
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

        <CardContent className="px-3 sm:px-4 pt-2 pb-4">
          <div className={cn("overflow-x-auto transition-opacity", auditLoading && auditItems.length > 0 && "opacity-50")}>
            <Table>
              <TableHeader className="[&_tr]:border-0 [&_th]:bg-[#f4f6f3] [&_th:first-child]:rounded-l-full [&_th:last-child]:rounded-r-full">
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
                {auditLoading && auditItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">Loading audit logs...</TableCell>
                  </TableRow>
                ) : auditItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No audit events match your filter criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  auditItems.map((audit: any) => {
                    const actionLower = (audit.action || '').toLowerCase();
                    const isCreate = actionLower.includes('create') || actionLower.includes('insert');
                    const isDelete = actionLower.includes('delete') || actionLower.includes('remove');
                    const isUpdate = actionLower.includes('update') || actionLower.includes('edit');

                    return (
                      <TableRow key={audit.id} className="text-xs hover:bg-[#f4f6f3] border-0">
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
                            isUpdate ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                            "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isCreate ? "bg-emerald-500" : isDelete ? "bg-rose-500" : isUpdate ? "bg-emerald-500" : "bg-slate-400"
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

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-4 pt-4 text-xs text-muted-foreground">
            <span>
              {auditTotal === 0
                ? 'No records'
                : `Showing ${(auditPage - 1) * AUDIT_PAGE_SIZE + 1}–${Math.min(auditPage * AUDIT_PAGE_SIZE, auditTotal)} of ${auditTotal.toLocaleString()}`}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={auditPage <= 1 || auditLoading}
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                className="h-9 rounded-full px-4 bg-white border-slate-200 gap-1"
              >
                <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Previous
              </Button>
              <span className="px-3 font-medium text-foreground tabular-nums">
                Page {auditPage} of {auditTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={auditPage >= auditTotalPages || auditLoading}
                onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                className="h-9 rounded-full px-4 bg-white border-slate-200 gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspect Audit Log Modal */}
      <Dialog open={Boolean(inspectAudit)} onOpenChange={(open) => !open && setInspectAudit(null)}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Audit Transaction Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cryptographic log entry #{inspectAudit?.id}
            </DialogDescription>
          </DialogHeader>

          {inspectAudit && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[#f4f6f3] dark:bg-muted/40">
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

              <div className="p-3 rounded-2xl bg-[#f4f6f3] dark:bg-muted/40 space-y-1.5">
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

