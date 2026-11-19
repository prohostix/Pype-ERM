import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowUpRight,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { CEOTasksPanel } from '@/components/panels/CEOTasksPanel';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { InvoicesPanel } from '@/components/panels/InvoicesPanel';
import { LeadsPanel } from '@/components/panels/LeadsPanel';
import { UsersPanel } from '@/components/panels/UsersPanel';
import { DepartmentsPanel } from '@/components/panels/DepartmentsPanel';
import { PerformancePanel } from '@/components/panels/PerformancePanel';
import { ExecutiveOverviewPanel } from '@/components/panels/ExecutiveOverviewPanel';
import { EscalationsPanel } from '@/components/panels/EscalationsPanel';
import { CEOKPIReportPanel } from '@/components/panels/CEOKPIReportPanel';
import { EmployeeActivityReportPanel } from '@/components/panels/EmployeeActivityReportPanel';
import { DeptEnrollmentReviewPanel } from '@/components/panels/DeptEnrollmentReviewPanel';
import { UniversityCommissionsPanel } from '@/components/panels/UniversityCommissionsPanel';
import { CollectionsPanel } from '@/components/panels/CollectionsPanel';
import { DeleteRequestsPanel } from '@/components/panels/DeleteRequestsPanel';
import { MeetingsPanel } from '@/components/panels/MeetingsPanel';
import { ActivityLogPanel } from '@/components/panels/ActivityLogPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { BranchHierarchyPanel } from '@/components/panels/BranchHierarchyPanel';
import { TargetsPanel } from '@/components/panels/TargetsPanel';
import { SalesInvitePanel } from '@/components/panels/SalesInvitePanel';
import { TeamPerformancePanel } from '@/components/panels/TeamPerformancePanel';
import { SalesCentersPanel } from '@/components/panels/SalesCentersPanel';
import { UniversitiesPanel } from '@/components/panels/UniversitiesPanel';
import { ProgramsPanel } from '@/components/panels/ProgramsPanel';
import { StudyCentersPanel } from '@/components/panels/StudyCentersPanel';
import { AdmissionSessionsPanel } from '@/components/panels/AdmissionSessionsPanel';
import { PaymentsPanel } from '@/components/panels/PaymentsPanel';
import { ExpensesPanel } from '@/components/panels/ExpensesPanel';
import { FinanceEnrollmentsPanel } from '@/components/panels/FinanceEnrollmentsPanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { AssetManagementPanel } from '@/components/panels/AssetManagementPanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { PayrollPanel } from '@/components/panels/PayrollPanel';

/**
 * Sidebar for the CEO and the General Manager: the executive items plus the
 * same Branch Overview / Sales / Operations / Finance / Management / My Portal
 * groups the Branch Manager has. Delete Approvals and Activity Logs are CEO-only.
 */
export function getExecutiveNavItems(role?: string) {
  const isCeo = role === 'ceo';
  return [
    { id: '__exec_section', label: 'Executive', isSection: true },
    { id: 'dashboard', label: 'Executive Overview' },
    { id: 'ai_reports', label: '✨ AI Reports' },
    { id: 'performance', label: 'Performance' },
    { id: 'kpi-kra', label: 'KPI / KRA Report' },
    { id: 'escalations', label: 'Escalations' },
    { id: 'activity_report', label: 'Activity Report' },
    ...(isCeo
      ? [
          { id: 'delete_approvals', label: 'Delete Approvals' },
          { id: 'activity-logs', label: 'Activity Logs' },
        ]
      : []),
    { id: '__branch_section', label: 'Branch Overview', isSection: true },
    { id: 'hierarchy', label: 'Organization Hierarchy' },
    { id: '__sales_section', label: 'Sales', isSection: true },
    { id: 'leads', label: 'Leads' },
    { id: 'targets', label: 'Targets' },
    { id: 'invite_links', label: 'Invite Links' },
    { id: 'my_team', label: 'My Team' },
    { id: 'branch_centers_sales', label: 'Academic Partners (Sales)' },
    { id: 'university_commissions', label: 'Commissions' },
    { id: '__ops_section', label: 'Operations', isSection: true },
    { id: 'students', label: 'Students' },
    { id: 'enrollment_review', label: 'Enrollment Review' },
    { id: 'universities', label: 'Universities' },
    { id: 'programs', label: 'Programs' },
    { id: 'centers', label: 'Academic Partners' },
    { id: 'sessions', label: 'Admission Sessions' },
    { id: 'attendance', label: 'Team Attendance' },
    { id: 'leaves', label: 'Leave Approvals' },
    { id: '__finance_section', label: 'Finance', isSection: true },
    { id: 'invoices', label: 'Invoices' },
    { id: 'payments', label: 'Payments' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'finance_enrollments', label: 'Finance Enrollments' },
    { id: 'collections', label: 'Collections' },
    { id: '__shared_section', label: 'Management', isSection: true },
    { id: 'users', label: 'Users' },
    { id: 'departments', label: 'Departments' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'assets', label: 'Assets' },
    { id: '__portal_section', label: 'My Portal', isSection: true },
    { id: 'my_leaves', label: 'My Leaves' },
    { id: 'my_attendance', label: 'My Attendance' },
    { id: 'my_payslips', label: 'Pay Slips' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'notice-board', label: 'Notice Board' },
    { id: 'meetings', label: 'Meetings' },
  ];
}

/** Panels shared with the Branch Manager dashboard, keyed by sidebar id. */
function renderSharedPanel(tab: string) {
  switch (tab) {
    case 'hierarchy': return <BranchHierarchyPanel />;
    case 'targets': return <TargetsPanel endpoint="/sales/targets" title="Targets" />;
    case 'invite_links': return <SalesInvitePanel />;
    case 'team':
    case 'my_team': return <TeamPerformancePanel />;
    case 'branch_centers_sales': return <SalesCentersPanel />;
    case 'universities': return <UniversitiesPanel />;
    case 'programs': return <ProgramsPanel />;
    case 'centers': return <StudyCentersPanel />;
    case 'sessions': return <AdmissionSessionsPanel />;
    case 'payments': return <PaymentsPanel />;
    case 'expenses': return <ExpensesPanel />;
    case 'finance_enrollments': return <FinanceEnrollmentsPanel />;
    case 'announcements': return <AnnouncementsPanel />;
    case 'assets': return <AssetManagementPanel />;
    case 'my_leaves': return <LeavesPanel isMyPortal />;
    case 'my_attendance': return <AttendancePanel isMyPortal />;
    case 'my_payslips': return <PayrollPanel />;
    case 'holidays': return <HolidaysPanel />;
    case 'notice-board': return <NoticeBoardPanel />;
    case 'meetings': return <MeetingsPanel />;
    default: return null;
  }
}


export function ModernCEODashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const { user } = useAuth();
  const [pendingDeletes, setPendingDeletes] = useState<number>(0);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  useEffect(() => {
    setActiveTab(initialTab || 'overview');
  }, [initialTab]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoadingMetrics(true);
    try {
      const deleteStatsRes = await api.get('/edit-delete/stats').catch(() => ({ data: { data: { pendingCeo: 0, pendingManager: 0 } } }));
      const stats = deleteStatsRes.data?.data;
      if (stats) setPendingDeletes((stats.pendingCeo || 0) + (stats.pendingManager || 0));
    } catch (e) {
      console.error('Failed to fetch CEO metrics:', e);
    } finally {
      setLoadingMetrics(false);
    }
  };


  // Branch Overview / Sales / Operations / Finance / Management / My Portal items
  // use the same panels as the Branch Manager dashboard.
  const sharedPanel = renderSharedPanel(activeTab);
  if (sharedPanel) {
    return <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">{sharedPanel}</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {activeTab === 'overview' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Executive Overview</h1>
            <p className="text-muted-foreground mt-1">Real-time institutional performance and strategic metrics.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => { fetchAll(); setRefreshKey((k) => k + 1); }} disabled={loadingMetrics}>
              <RefreshCw className={cn('w-4 h-4 mr-2', loadingMetrics && 'animate-spin')} />
              Refresh
            </Button>
            <Button variant="default" onClick={() => handleNavigate('kpi-kra')}>
              <Target className="w-4 h-4 mr-2" />
              KPI / KRA Report
            </Button>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleNavigate} className="space-y-6">
        <div className="hidden">
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            <TabsList className="flex w-max space-x-1.5 bg-transparent p-1 h-auto border-b border-border/30">
              <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Overview</TabsTrigger>
              <TabsTrigger value="performance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Performance</TabsTrigger>
              <TabsTrigger value="kpi-kra" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">KPI / KRA</TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Users</TabsTrigger>
              <TabsTrigger value="departments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Departments</TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Tasks</TabsTrigger>
              <TabsTrigger value="escalations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Escalations</TabsTrigger>
              <TabsTrigger value="students" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Students</TabsTrigger>
              <TabsTrigger value="enrollment_review" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Enrollment Review</TabsTrigger>
              <TabsTrigger value="leaves" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Leave Requests</TabsTrigger>
              <TabsTrigger value="attendance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Attendance</TabsTrigger>
              <TabsTrigger value="invoices" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Invoices</TabsTrigger>
              <TabsTrigger value="collections" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Collections</TabsTrigger>
              <TabsTrigger value="leads" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Leads</TabsTrigger>
              <TabsTrigger value="university_commissions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Commissions</TabsTrigger>
              <TabsTrigger value="activity_report" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Activity Report</TabsTrigger>
              {user?.role === 'ceo' && (
                <>
                  <TabsTrigger value="delete_approvals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5">
                    <span>Delete Approvals</span>
                    {pendingDeletes > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] font-bold rounded-full">
                        {pendingDeletes}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="meetings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Meetings</TabsTrigger>
                  <TabsTrigger value="activity-logs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Activity Logs</TabsTrigger>
                </>
              )}
            </TabsList>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-8">
          <ExecutiveOverviewPanel onNavigate={handleNavigate} refreshKey={refreshKey} />
          {/* Live Escalations Preview */}
          <EscalationPreview onViewAll={() => handleNavigate('escalations')} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformancePanel />
        </TabsContent>

        <TabsContent value="kpi-kra">
          <CEOKPIReportPanel />
        </TabsContent>

        <TabsContent value="users">
          <UsersPanel />
        </TabsContent>

        <TabsContent value="departments">
          <DepartmentsPanel />
        </TabsContent>

        <TabsContent value="tasks">
          <CEOTasksPanel />
        </TabsContent>

        <TabsContent value="escalations">
          <EscalationsPanel />
        </TabsContent>

        <TabsContent value="students">
          <StudentsPanel />
        </TabsContent>

        <TabsContent value="enrollment_review">
          <DeptEnrollmentReviewPanel />
        </TabsContent>

        <TabsContent value="leaves">
          <LeavesPanel />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendancePanel />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesPanel />
        </TabsContent>

        <TabsContent value="leads">
          <LeadsPanel />
        </TabsContent>

        <TabsContent value="activity_report">
          <EmployeeActivityReportPanel />
        </TabsContent>

        <TabsContent value="university_commissions">
          <UniversityCommissionsPanel />
        </TabsContent>

        <TabsContent value="collections">
          <CollectionsPanel />
        </TabsContent>

        {user?.role === 'ceo' && (
          <>
            <TabsContent value="delete_approvals">
              <DeleteRequestsPanel />
            </TabsContent>

            <TabsContent value="meetings">
              <MeetingsPanel />
            </TabsContent>

            <TabsContent value="activity-logs">
              <ActivityLogPanel />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function EscalationPreview({ onViewAll }: { onViewAll: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ceo/escalations')
      .then(r => setItems((r.data.data || []).filter((e: any) => e.status !== 'resolved').slice(0, 3)))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="rounded-3xl border-0 shadow-md ring-1 ring-border/60 py-6 gap-4">
      <CardHeader className="px-7 flex flex-row items-center justify-between">
        <div>
          <CardTitle>Live Escalations</CardTitle>
          <CardDescription>Pending items requiring your attention</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onViewAll}>
          View All <ArrowUpRight className="ml-1 w-3 h-3" />
        </Button>
      </CardHeader>
      <CardContent className="px-7 space-y-3">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No pending escalations</p>
          </div>
        ) : (
          items.map(esc => (
            <div key={esc.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer" onClick={onViewAll}>
              <div className={cn("mt-0.5 p-1.5 rounded-md", (esc.priority === 'critical' || esc.priority === 'high') ? 'bg-red-500/10 text-red-500' : 'bg-warning/10 text-warning')}>
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{esc.task?.title || esc.reason || 'Escalation'}</p>
                <p className="text-xs text-muted-foreground">{esc.employee?.name || 'Unknown'} · {timeAgo(esc.escalatedAt)}</p>
              </div>
              <Badge className={cn('text-[10px] uppercase font-bold shrink-0', (esc.priority === 'critical' || esc.priority === 'high') ? 'bg-red-500/10 text-red-500' : 'bg-warning/10 text-warning')}>
                {esc.priority}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
