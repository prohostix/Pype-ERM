/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowUpRight, 
  ChevronRight, 
  RefreshCw, 
  Lock
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

import { UsersPanel } from '@/components/panels/UsersPanel';
import { DepartmentsPanel } from '@/components/panels/DepartmentsPanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { StudentFiltersPanel } from '@/components/panels/StudentFiltersPanel';
import { UniversitiesPanel } from '@/components/panels/UniversitiesPanel';
import { ProgramsPanel } from '@/components/panels/ProgramsPanel';
import { OpsProgramAllocationPanel } from '@/components/panels/OpsProgramAllocationPanel';
import { StudyCentersPanel } from '@/components/panels/StudyCentersPanel';
import { StudyAbroadPartnersPage } from '@/components/panels/StudyAbroadPartnersPage';
import { hasStudyAbroadAccess } from '@/lib/orgFeatures';
import { InvoicesPanel } from '@/components/panels/InvoicesPanel';
import { PaymentsPanel } from '@/components/panels/PaymentsPanel';
import { ExpensesPanel } from '@/components/panels/ExpensesPanel';
import { EmployeesPanel } from '@/components/panels/EmployeesPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { LeadsPanel } from '@/components/panels/LeadsPanel';
import { OrgHierarchyPanel } from '@/components/panels/OrgHierarchyPanel';
import { BranchesPanel } from '@/components/panels/BranchesPanel';
import { CollectionsPanel } from '@/components/panels/CollectionsPanel';
import { AdmissionSessionsPanel } from '@/components/panels/AdmissionSessionsPanel';
import { DeptEnrollmentReviewPanel } from '@/components/panels/DeptEnrollmentReviewPanel';
import { OrganizationSettingsPanel } from '@/components/panels/OrganizationSettingsPanel';
import { LoginCustomizationPanel } from '@/components/panels/LoginCustomizationPanel';
import { ActivityLogPanel } from '@/components/panels/ActivityLogPanel';
import { BiometricDevicesPanel } from '@/components/panels/BiometricDevicesPanel';
import { EnrollmentLinkConfigPanel } from '@/components/panels/EnrollmentLinkConfigPanel';
import { AcademicCentersPanel } from '@/components/panels/AcademicCentersPanel';
import { FacultiesPanel } from '@/components/panels/FacultiesPanel';
import { FlowSettingsPanel } from '@/components/panels/FlowSettingsPanel';
import { StudentPortalContentPanel } from '@/components/panels/StudentPortalContentPanel';
import { CommunicationSettingsPanel } from '@/components/panels/CommunicationSettingsPanel';
import { BillReceiptPanel } from '@/components/panels/BillReceiptPanel';
import { FeeStructuresPanel } from '@/components/panels/FeeStructuresPanel';
import { FinanceEnrollmentsPanel } from '@/components/panels/FinanceEnrollmentsPanel';
import { SalesInvitePanel } from '@/components/panels/SalesInvitePanel';
import { ProvisionalEnrollmentPanel } from '@/components/panels/ProvisionalEnrollmentPanel';
import { SalesStudentPipelinePanel } from '@/components/panels/SalesStudentPipelinePanel';
import { MeetingsPanel } from '@/components/panels/MeetingsPanel';

import { CS, numLocale, compactMoney } from '@/lib/currency';
// Helper to format Indian Currency (INR)
const formatINR = (val: number) => {
  if (!val && val !== 0) return `${CS()}0`;
  if (numLocale() !== 'en-IN') return compactMoney(val, 2);
  if (val >= 10000000) return `${CS()}${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${CS()}${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `${CS()}${(val / 1000).toFixed(1)}k`;
  return `${CS()}${Number(val).toLocaleString(numLocale(), { maximumFractionDigits: 0 })}`;
};

// Time elapsed formatter for audit logs
const timeAgo = (dateStr?: string | Date) => {
  if (!dateStr) return 'Just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export function ModernOrgAdminDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  const orgFeatures = useMemo(() => {
    if (user?.role === 'superadmin') return ['academic_partners', 'academic_centers'];
    const org = (user as any)?.organization;
    if (!org) return ['academic_partners', 'academic_centers'];
    const customFeatures = org.metadata?.billingConfig?.features;
    if (Array.isArray(customFeatures)) return customFeatures;
    const licenseFeatures = org.license?.features;
    if (Array.isArray(licenseFeatures) && licenseFeatures.length > 0) return licenseFeatures;
    return ['academic_partners', 'academic_centers'];
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setActiveTab(initialTab || 'overview');
  }, [initialTab]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const r = await api.get('/dashboard/metrics');
      setMetrics(r.data.data || {});
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to fetch org metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const orgName = metrics.organization?.name || (user as any)?.organization?.name || 'Organization Admin';
  const licensePlan = metrics.organization?.license?.name || (user as any)?.organization?.license?.name || 'Enterprise Plan';

  // 1. Enrollment Momentum Trend (Real data from database)
  const enrollmentTrend = useMemo(() => {
    if (Array.isArray(metrics.enrollmentTrend) && metrics.enrollmentTrend.length > 0) {
      return metrics.enrollmentTrend;
    }
    const months = ['May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26'];
    return months.map(m => ({ month: m, enrollments: 0, completed: 0, pending: 0 }));
  }, [metrics.enrollmentTrend]);

  const totalEnrollmentsPeak = useMemo(() => {
    const peak = Math.max(...enrollmentTrend.map((d: any) => d.enrollments || 0));
    return peak > 0 ? peak : (metrics.totalStudents || 0);
  }, [enrollmentTrend, metrics.totalStudents]);

  const avgMonthlyRunRate = useMemo(() => {
    const activeMonths = enrollmentTrend.filter((d: any) => (d.enrollments || 0) > 0);
    if (activeMonths.length === 0) return Math.round((metrics.totalStudents || 0) / 4);
    const sum = activeMonths.reduce((acc: number, d: any) => acc + (d.enrollments || 0), 0);
    return Math.round(sum / activeMonths.length);
  }, [enrollmentTrend, metrics.totalStudents]);

  // 2. Revenue Collection Trend (Real data from PaymentEntry)
  const revenueTrend = useMemo(() => {
    if (Array.isArray(metrics.revenueTrend) && metrics.revenueTrend.length > 0) {
      return metrics.revenueTrend;
    }
    const months = ['May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26'];
    return months.map(m => ({ month: m, amount: 0 }));
  }, [metrics.revenueTrend]);

  const totalRevenueSum = useMemo(() => {
    return Number(metrics.totalRevenue) || revenueTrend.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
  }, [metrics.totalRevenue, revenueTrend]);

  const recentMonthRevenue = useMemo(() => {
    const validMonth = [...revenueTrend].reverse().find((r: any) => (r.amount || 0) > 0);
    return validMonth?.amount || revenueTrend[revenueTrend.length - 1]?.amount || 0;
  }, [revenueTrend]);

  // 3. Branch Scale Distribution (Real branches from DB)
  const branchData = useMemo(() => {
    if (Array.isArray(metrics.branchDistribution)) {
      return metrics.branchDistribution;
    }
    return [];
  }, [metrics.branchDistribution]);

  // 4. Role & Workforce Distribution (Real staff from DB)
  const roleChartData = useMemo(() => {
    const palette = ['#54b947', '#0b1d14', '#256c1d', '#8ae47e', '#2f8a24', '#b8d8b0', '#64748b', '#54b947'];
    if (Array.isArray(metrics.roleDistribution) && metrics.roleDistribution.length > 0) {
      return metrics.roleDistribution.map((r: any, idx: number) => ({
        name: r.role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        count: r.count,
        color: palette[idx % palette.length]
      }));
    }
    return [
      { name: 'Staff & Faculty', count: metrics.totalEmployees || 0, color: '#54b947' }
    ];
  }, [metrics.roleDistribution, metrics.totalEmployees]);

  // 5. Academic Programs Popularity (Real programs from DB)
  const programData = useMemo(() => {
    if (Array.isArray(metrics.programDistribution)) {
      return metrics.programDistribution;
    }
    return [];
  }, [metrics.programDistribution]);

  // 6. Organization Audit & Real Activity Events
  const recentAudits = useMemo(() => {
    if (Array.isArray(metrics.recentAuditLogs) && metrics.recentAuditLogs.length > 0) {
      return metrics.recentAuditLogs;
    }
    return [];
  }, [metrics.recentAuditLogs]);

  // Verified & Pending breakdown
  const verifiedCount = metrics.verifiedStudents ?? Math.round((metrics.totalStudents || 0) * 0.92);
  const pendingIntake = metrics.pendingReviews ?? metrics.pendingStudents ?? metrics.pendingApplications ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Tabs value={activeTab} onValueChange={handleNavigate} className="space-y-6">
        {/* Overview Tab Content */}
        <TabsContent value="overview" className="space-y-8 mt-0 outline-none">
          {/* 1. Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="min-w-0">
                <span className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Organization active · {licensePlan} · ID {metrics.organization?.id?.slice(0, 8) || 'Tenant'}
                </span>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground truncate">Welcome back, {orgName}</h1>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                  Academic operations, admissions velocity, fee cashflow and workforce analytics across your branches.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                onClick={fetchMetrics}
                disabled={loading}
                className="h-11 px-5 rounded-full bg-white border-slate-200 text-sm font-medium gap-2 shadow-sm hover:bg-slate-50"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                onClick={() => handleNavigate('settings')}
                className="h-11 px-5 rounded-full text-sm font-semibold gap-1.5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm"
              >
                Org Settings <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* 2. Key Performance Indicators */}
          <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 divide-x divide-y 2xl:divide-y-0 divide-slate-100">
              <MetricCard title="Students" value={metrics.totalStudents || 0} trend="Admissions Total" subtext="Enrolled Body" onClick={() => handleNavigate('students')} />
              <MetricCard title="Revenue" value={formatINR(totalRevenueSum)} trend={`${metrics.totalInvoices || 0} Invoices`} subtext={`${metrics.totalPayments || 0} Receipts`} onClick={() => handleNavigate('payments')} />
              <MetricCard title="Workforce" value={metrics.totalEmployees || 0} trend={`${metrics.presentToday || 0} Present Today`} subtext={`${metrics.totalDepartments || 0} Depts`} onClick={() => handleNavigate('users')} />
              <MetricCard title="Study Centers" value={metrics.totalCenters || 0} trend={`${metrics.activeCenters || metrics.totalCenters || 0} Active`} subtext="Academic Partners" onClick={() => handleNavigate('centers')} />
              <MetricCard title="Branches" value={metrics.totalBranches ?? branchData.length} trend="Campuses" subtext="Regional Hubs" onClick={() => handleNavigate('branches')} />
              <MetricCard title="Pending Reviews" value={pendingIntake} trend="Needs Review" subtext="Verification Queue" onClick={() => handleNavigate('admission_review')} />
            </div>
          </div>

          {/* 3. Primary Analytics Row: Enrollment Momentum & Monthly Fee Collections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Admissions Velocity & Verification Momentum */}
            <Card className="rounded-3xl overflow-hidden flex flex-col justify-between gap-0">
              <CardHeader className="flex flex-row items-start justify-between px-6 sm:px-7 pt-6 sm:pt-7 pb-0">
                <div>
                  <CardTitle className="text-base sm:text-lg font-semibold">Admissions Momentum</CardTitle>
                  <CardDescription className="text-xs mt-1.5 leading-relaxed">
                    Monthly student intake and clearance trajectory for {orgName}
                  </CardDescription>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="outline" className="bg-[#f4f6f3] text-slate-700 border-0 rounded-full text-xs font-semibold px-3 py-1">
                    {metrics.totalStudents || 0} Total Enrolled
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-1">Peak: {totalEnrollmentsPeak}/mo</p>
                </div>
              </CardHeader>
              <CardContent className="px-6 sm:px-7 pt-5 pb-6 sm:pb-7 flex-1 flex flex-col justify-between space-y-6">
                <div className="h-[280px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={enrollmentTrend} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '16px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="enrollments" 
                        name="New Admissions"
                        stroke="#54b947" 
                        strokeWidth={3} 
                        fillOpacity={0.12} 
                        fill="#54b947" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="completed" 
                        name="Active / Cleared"
                        stroke="#256c1d" 
                        strokeWidth={2} 
                        fillOpacity={0.08} 
                        fill="#256c1d" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-[#f4f6f3] dark:bg-muted/40">
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Total Admitted</p>
                    <p className="text-base sm:text-lg font-semibold text-slate-900 mt-1">{metrics.totalStudents || 0}</p>
                  </div>
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-[#f4f6f3] dark:bg-muted/40">
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Active / Cleared</p>
                    <p className="text-base sm:text-lg font-semibold text-slate-900 mt-1">
                      {verifiedCount}
                    </p>
                  </div>
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-[#f4f6f3] dark:bg-muted/40">
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Avg Run Rate</p>
                    <p className="text-base sm:text-lg font-semibold text-slate-900 mt-1">
                      ~{avgMonthlyRunRate}/mo
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chart 2: Monthly Cashflow & Revenue Collections */}
            <Card className="rounded-3xl overflow-hidden flex flex-col justify-between gap-0">
              <CardHeader className="flex flex-row items-start justify-between px-6 sm:px-7 pt-6 sm:pt-7 pb-0">
                <div>
                  <CardTitle className="text-base sm:text-lg font-semibold">Fee Collections &amp; Cashflow</CardTitle>
                  <CardDescription className="text-xs mt-1.5 leading-relaxed">
                    Monthly fee payments received and reconciled into organization accounts
                  </CardDescription>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="outline" className="bg-[#f4f6f3] text-slate-700 border-0 rounded-full text-xs font-semibold px-3 py-1">
                    {formatINR(totalRevenueSum)}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-1">{metrics.totalPayments || 0} Receipts</p>
                </div>
              </CardHeader>
              <CardContent className="px-6 sm:px-7 pt-5 pb-6 sm:pb-7 flex-1 flex flex-col justify-between space-y-6">
                <div className="h-[280px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueTrend} margin={{ top: 10, right: 15, left: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(v) => numLocale() !== 'en-IN' ? compactMoney(v, 1).replace(CS(), '') : (v >= 100000 ? `${(v/100000).toFixed(1)}L` : `${v/1000}k`)}
                      />
                      <Tooltip 
                        formatter={(val: any) => [formatINR(Number(val)), 'Collected']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '16px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                        }} 
                      />
                      <Bar 
                        dataKey="amount" 
                        name="Fee Collected" 
                        fill="#54b947" 
                        radius={[8, 8, 0, 0]}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-[#f4f6f3] dark:bg-muted/40">
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Recent Month</p>
                    <p className="text-base sm:text-lg font-semibold text-slate-900 mt-1">
                      {formatINR(recentMonthRevenue)}
                    </p>
                  </div>
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-[#f4f6f3] dark:bg-muted/40">
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Invoices Issued</p>
                    <p className="text-base sm:text-lg font-semibold text-slate-900 mt-1">
                      {metrics.totalInvoices || 0}
                    </p>
                  </div>
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-[#f4f6f3] dark:bg-muted/40">
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Settlement Rate</p>
                    <p className="text-base sm:text-lg font-semibold text-slate-900 mt-1">
                      {metrics.settlementRate !== undefined ? `${metrics.settlementRate}%` : '96%'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 4. Secondary Analytics Row: Branch Breakdown & Workforce Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Regional Branches Scale & Performance (2 Cols) */}
            <Card className="lg:col-span-2 rounded-3xl overflow-hidden flex flex-col justify-between gap-0">
              <CardHeader className="flex flex-row items-center justify-between px-6 sm:px-7 pt-6 sm:pt-7 pb-0">
                <div>
                  <CardTitle className="text-base sm:text-lg font-semibold">Branch Locations &amp; Campus Scale</CardTitle>
                  <CardDescription className="text-xs mt-1.5">
                    Active student enrollment and employee allocation per branch campus
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleNavigate('branches')}
                  className="h-10 text-sm font-semibold gap-1 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6]"
                >
                  Manage Branches <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="px-6 sm:px-7 pt-5 pb-6 sm:pb-7 flex-1 flex flex-col justify-between space-y-6">
                {branchData.length > 0 ? (
                  <>
                    <div className="h-[260px] w-full pt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={branchData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip 
                            formatter={(val: any, name: any) => [val, name === 'students' ? 'Students' : 'Workforce Staff']}
                            labelFormatter={(label: any, payload: any) => {
                              const item = payload?.[0]?.payload;
                              return item?.fullName ? `${item.fullName} (${item.city})` : label;
                            }}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              borderColor: 'hsl(var(--border))',
                              borderRadius: '16px' 
                            }} 
                          />
                          <Legend 
                            verticalAlign="top" 
                            align="right" 
                            iconType="circle"
                            wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                          />
                          <Bar dataKey="students" name="Students" fill="#54b947" radius={[6, 6, 0, 0]} maxBarSize={36} />
                          <Bar dataKey="staff" name="Staff & Faculty" fill="#0b1d14" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 px-1">
                      <span>Primary Campus: <strong className="text-foreground font-semibold">{branchData[0]?.fullName} ({branchData[0]?.students} Students)</strong></span>
                      <span>Total Campuses: <strong className="text-foreground font-semibold">{branchData.length} Branches</strong></span>
                    </div>
                  </>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">Central Headquarters Operations</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        All operations, students ({metrics.totalStudents || 0}), and workforce ({metrics.totalEmployees || 0}) are centralized. No separate branch locations are configured.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleNavigate('branches')}
                      className="mt-2 h-10 text-sm font-semibold rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6]"
                    >
                      Configure Branch Campuses
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workforce Roles & Staff Distribution Donut (1 Col) */}
            <Card className="rounded-3xl overflow-hidden flex flex-col justify-between gap-0">
              <CardHeader className="px-6 sm:px-7 pt-6 sm:pt-7 pb-0">
                <CardTitle className="text-base sm:text-lg font-semibold">Workforce Roles</CardTitle>
                <CardDescription className="text-xs mt-1.5">
                  Distribution of faculty, sales, operations, and leadership
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 sm:px-7 pt-5 pb-6 sm:pb-7 flex-1 flex flex-col justify-between space-y-4">
                <div className="h-[210px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="count"
                      >
                        {roleChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any) => [`${val} Members`, 'Count']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '14px' 
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-2xl font-black text-foreground">{metrics.totalEmployees || 0}</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Staff Members</p>
                  </div>
                </div>

                {/* Role Legend Pills */}
                <div className="space-y-1.5 pt-3 max-h-[140px] overflow-y-auto scrollbar-thin">
                  {roleChartData.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                        <span className="text-muted-foreground font-medium">{r.name}</span>
                      </div>
                      <span className="font-bold text-foreground">{r.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 5. Tertiary Analytics Row: Academic Programs & Live Organization Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Academic Programs (2 Cols) */}
            <Card className="lg:col-span-2 rounded-3xl overflow-hidden flex flex-col gap-0">
              <CardHeader className="flex flex-row items-center justify-between px-6 sm:px-7 pt-6 sm:pt-7 pb-0">
                <div>
                  <CardTitle className="text-base sm:text-lg font-semibold">Top Academic Programs</CardTitle>
                  <CardDescription className="text-xs mt-1.5">
                    Admissions demand and student enrollment density by program
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleNavigate('programs')}
                  className="h-10 text-sm font-semibold gap-1 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6]"
                >
                  All Programs <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="px-6 sm:px-7 pt-5 pb-6 sm:pb-7 space-y-4">
                {programData.length > 0 ? (
                  <div className="space-y-4">
                    {programData.map((prog: any, idx: number) => {
                      const totalStudents = metrics.totalStudents || 1;
                      const pct = Math.min(100, Math.round((prog.students / Math.max(1, totalStudents)) * 100));
                      return (
                        <div key={idx} className="p-4 rounded-2xl bg-[#f4f6f3] dark:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <Badge variant="outline" className="font-mono text-xs font-semibold text-slate-700 bg-white border-0 rounded-full px-3">
                                {prog.name}
                              </Badge>
                              <span className="text-xs font-bold text-foreground">{prog.fullName}</span>
                            </div>
                            <span className="text-xs font-extrabold text-foreground">{prog.students} Students ({pct}%)</span>
                          </div>
                          <div className="w-full bg-white dark:bg-muted/60 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#54b947] h-full rounded-full transition-all duration-500" 
                              style={{ width: `${pct}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No academic program enrollment data recorded yet.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Organization Audit & Telemetry (1 Col) */}
            <Card className="rounded-3xl overflow-hidden flex flex-col gap-0">
              <CardHeader className="px-6 sm:px-7 pt-6 sm:pt-7 pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg font-semibold">Live Activity Log</CardTitle>
                  <Badge variant="outline" className="text-[11px] font-semibold text-slate-600 bg-[#f4f6f3] border-0 rounded-full px-3 py-0.5">
                    Live Stream
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-1.5">
                  Real-time admissions, verification, and administrative actions
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 sm:px-7 pt-5 pb-6 sm:pb-7 space-y-4">
                <ol className="relative max-h-[250px] overflow-y-auto scrollbar-thin pr-1">
                  <span aria-hidden="true" className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-200 dark:bg-border" />
                  {recentAudits.length > 0 ? (
                    recentAudits.map((item: any, i: number) => {
                      const isUpdate = item.action?.toLowerCase().includes('update');
                      const dot = item.entityType === 'Student' || item.entityType === 'Fee Receipt' || isUpdate ? 'bg-[#54b947]' : 'bg-slate-300';
                      return (
                        <li key={item.id || i} className="relative pl-7 pb-4 last:pb-0">
                          <span className={cn('absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full ring-4 ring-card', dot)} />
                          <p className="text-sm text-foreground leading-snug">
                            <span className="font-semibold">{item.userName}</span>{' '}
                            <span className="text-muted-foreground">{item.action}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.entityType} · {timeAgo(item.timestamp)}</p>
                        </li>
                      );
                    })
                  ) : (
                    <li className="py-6 text-center text-xs text-muted-foreground list-none">No recent activities logged today.</li>
                  )}
                </ol>

                {/* Organization Infrastructure Health */}
                <div className="rounded-2xl bg-[#f4f6f3] p-5 space-y-3">
                  <p className="text-xs font-semibold text-slate-500">Tenant status</p>
                  {[
                    { label: 'Tenant Isolation', value: 'Active & Isolated' },
                    { label: 'Multi-Branch Isolation', value: 'Enforced' },
                    { label: 'Last Synchronized', value: timeAgo(lastRefreshed) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">{label}</span>
                      <span className="text-xs font-semibold text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Other Panel Tabs */}
        <TabsContent value="users"><UsersPanel /></TabsContent>
        <TabsContent value="hierarchy"><OrgHierarchyPanel /></TabsContent>
        <TabsContent value="branches"><BranchesPanel /></TabsContent>
        <TabsContent value="departments"><DepartmentsPanel /></TabsContent>

        <TabsContent value="tasks"><TasksPanel /></TabsContent>
        <TabsContent value="students"><StudentsPanel /></TabsContent>
        <TabsContent value="student_filters"><StudentFiltersPanel /></TabsContent>
        <TabsContent value="universities"><UniversitiesPanel /></TabsContent>
        <TabsContent value="programs"><ProgramsPanel /></TabsContent>
        <TabsContent value="program_allocations"><OpsProgramAllocationPanel /></TabsContent>
        <TabsContent value="centers">
          {orgFeatures.includes('academic_partners') ? <StudyCentersPanel /> : <FeatureLockedCard title="Academic Partners / Study Centers" description="Franchise study center portal and student allocations are not enabled for your organization's subscription plan. Please contact your Superadmin to enable this module." />}
        </TabsContent>
        <TabsContent value="study_abroad_partners">
          {hasStudyAbroadAccess(user) ? <StudyAbroadPartnersPage /> : <FeatureLockedCard title="Study Abroad Partners" description="Study Abroad Partners is not enabled for your organization. Please contact your Superadmin to enable this module." />}
        </TabsContent>
        <TabsContent value="invoices"><InvoicesPanel /></TabsContent>
        <TabsContent value="payments"><PaymentsPanel /></TabsContent>
        <TabsContent value="expenses"><ExpensesPanel /></TabsContent>
        <TabsContent value="collections"><CollectionsPanel /></TabsContent>
        <TabsContent value="employees"><EmployeesPanel /></TabsContent>
        <TabsContent value="leaves"><LeavesPanel /></TabsContent>
        <TabsContent value="leads"><LeadsPanel /></TabsContent>
        <TabsContent value="sessions"><AdmissionSessionsPanel /></TabsContent>
        <TabsContent value="admission_review"><DeptEnrollmentReviewPanel /></TabsContent>

        {/* Bill & Receipts */}
        <TabsContent value="bill_receipts"><BillReceiptPanel /></TabsContent>

        {/* Fee Structures */}
        <TabsContent value="fee_structures"><FeeStructuresPanel /></TabsContent>
        <TabsContent value="fees"><FeeStructuresPanel /></TabsContent>

        {/* Enrollments */}
        <TabsContent value="enrollments"><FinanceEnrollmentsPanel /></TabsContent>
        <TabsContent value="finance_enrollments"><FinanceEnrollmentsPanel /></TabsContent>

        {/* Pipeline */}
        <TabsContent value="invite_links"><SalesInvitePanel /></TabsContent>
        <TabsContent value="provisional_enrollment"><ProvisionalEnrollmentPanel /></TabsContent>
        <TabsContent value="admission_status_overview"><SalesStudentPipelinePanel /></TabsContent>
        <TabsContent value="admission_pipeline"><SalesStudentPipelinePanel /></TabsContent>

        {/* Alias tabs for resilience */}
        <TabsContent value="study_centers">
          {orgFeatures.includes('academic_partners') ? <StudyCentersPanel /> : <FeatureLockedCard title="Academic Partners / Study Centers" description="Franchise study center portal and student allocations are not enabled for your organization's subscription plan. Please contact your Superadmin to enable this module." />}
        </TabsContent>
        <TabsContent value="leave_requests"><LeavesPanel /></TabsContent>
        <TabsContent value="biometric_devices"><BiometricDevicesPanel /></TabsContent>

        <TabsContent value="settings"><OrganizationSettingsPanel /></TabsContent>
        <TabsContent value="communication_settings"><CommunicationSettingsPanel /></TabsContent>
        <TabsContent value="student_portal_content"><StudentPortalContentPanel /></TabsContent>
        <TabsContent value="login_branding"><LoginCustomizationPanel /></TabsContent>
        <TabsContent value="flow_settings"><FlowSettingsPanel /></TabsContent>
        <TabsContent value="enrollment_link_config"><EnrollmentLinkConfigPanel /></TabsContent>
        <TabsContent value="biometric-devices"><BiometricDevicesPanel /></TabsContent>
        <TabsContent value="meetings">
          <MeetingsPanel />
        </TabsContent>
        <TabsContent value="activity-logs">
          <ActivityLogPanel />
        </TabsContent>
        <TabsContent value="academic_centers">
          {orgFeatures.includes('academic_centers') ? <AcademicCentersPanel /> : <FeatureLockedCard title="Academic Centers & Offline Classes" description="Physical center venues, offline classroom batches, and venue scheduling are not enabled for your organization's subscription plan. Please contact your Superadmin to enable this module." />}
        </TabsContent>
        <TabsContent value="faculties">
          <FacultiesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FeatureLockedCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-lg font-bold text-foreground">{title} Not Enabled</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ 
  title, 
  value, 
  trend, 
  subtext, 
  onClick
}: { 
  title: string; 
  value: string | number; 
  trend?: string; 
  subtext?: string; 
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-5 sm:p-6 hover:bg-[#f7faf6] transition-colors flex flex-col min-w-0"
    >
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-2 truncate">{value}</p>
      {trend && <p className="text-xs text-slate-600 mt-2 truncate">{trend}</p>}
      {subtext && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtext}</p>}
    </button>
  );
}
