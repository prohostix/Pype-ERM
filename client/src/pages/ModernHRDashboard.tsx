/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  Clock,
  Heart,
  Award,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { VacanciesPanel } from '@/components/panels/VacanciesPanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { EmployeesPanel } from '@/components/panels/EmployeesPanel';
import { ComplaintsPanel } from '@/components/panels/ComplaintsPanel';
import { HRUsersPanel } from '@/components/panels/HRUsersPanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import TeamPermissionsPanel from '@/components/panels/TeamPermissionsPanel';
import { PayrollPanel } from '@/components/panels/PayrollPanel';
import { PayrollBatchesPanel } from '@/components/panels/PayrollBatchesPanel';
import { ManagerAssignmentPanel } from '@/components/panels/ManagerAssignmentPanel';
import { HRSettingsPanel } from '@/components/attendance/HRSettingsPanel';
import { BiometricDevicesPanel } from '@/components/panels/BiometricDevicesPanel';
import { AssetManagementPanel } from '@/components/panels/AssetManagementPanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { SalaryConfigPanel } from '@/components/panels/SalaryConfigPanel';
import { LeaveAllocationPanel } from '@/components/panels/LeaveAllocationPanel';
import { PollsPanel } from '@/components/panels/PollsPanel';
import { OrgHierarchyPanel } from '@/components/panels/OrgHierarchyPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { EmployeeActivityReportPanel } from '@/components/panels/EmployeeActivityReportPanel';
import { DeleteRequestsPanel } from '@/components/panels/DeleteRequestsPanel';
import { MeetingsPanel } from '@/components/panels/MeetingsPanel';

export function ModernHRDashboard({ initialTab }: { initialTab?: string }) {
  const [metrics, setMetrics] = useState<any>({});
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');

  useEffect(() => { setActiveTab(initialTab || 'overview'); }, [initialTab]);
  useEffect(() => {
    api.get('/dashboard/metrics').then(r => setMetrics(r.data.data || {})).catch(() => { });
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'meetings': return <MeetingsPanel />;
      case 'overview': return (
        <OverviewContent
          metrics={metrics}
          onNavigate={setActiveTab}
        />
      );
      case 'users': return <HRUsersPanel />;
      case 'employees': return <EmployeesPanel />;
      case 'team_permissions': return <TeamPermissionsPanel />;
      case 'leaves': return <LeavesPanel />;
      case 'my_leaves': return <LeavesPanel isMyPortal />;
      case 'attendance': return <AttendancePanel />;
      case 'my_attendance': return <AttendancePanel isMyPortal />;
      case 'vacancies': return <VacanciesPanel />;
      case 'holidays': return <HolidaysPanel />;
      case 'complaints': return <ComplaintsPanel />;
      case 'tasks': return <TasksPanel />;
      case 'payroll': return <PayrollPanel />;
      case 'payroll-batches': return <PayrollBatchesPanel />;
      case 'salary-config': return <SalaryConfigPanel />;
      case 'leave-alloc': return <LeaveAllocationPanel />;
      case 'announcements': return <AnnouncementsPanel />;
      case 'polls': return <PollsPanel />;
      case 'org-chart': return <OrgHierarchyPanel />;
      case 'managers': return <ManagerAssignmentPanel />;
      case 'att-settings': return <HRSettingsPanel />;
      case 'biometric-devices': return <BiometricDevicesPanel />;
      case 'activity_report': return <EmployeeActivityReportPanel />;
      case 'my_payslips': return <PayrollPanel />;
      case 'notice-board': return <NoticeBoardPanel />;
      case 'assets': return <AssetManagementPanel />;
      case 'delete_approvals': return <DeleteRequestsPanel />;
      default: return null;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {renderContent()}
    </div>
  );
}

export function getHRNavItems() {
  return [
    { id: '__hr_section', label: 'HR Management', isSection: true },
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'employees', label: 'Employees' },
    { id: 'team_permissions', label: 'Team Permissions' },
    { id: 'leaves', label: 'Leave Requests' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'vacancies', label: 'Vacancies' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'complaints', label: 'Complaints' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'payroll-batches', label: 'Payroll Batches' },
    { id: 'salary-config', label: 'Salary Config' },
    { id: 'leave-alloc', label: 'Leave Allocation' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'polls', label: 'Polls' },
    { id: 'org-chart', label: 'Org Chart' },
    { id: 'managers', label: 'Managers' },
    { id: 'att-settings', label: 'Att. Settings' },
    { id: 'biometric-devices', label: 'Biometric Devices' },
    { id: 'assets', label: 'Assets' },
    { id: 'activity_report', label: 'Activity Report' },
    { id: 'delete_approvals', label: 'Delete Approvals' },
    { id: '__portal_section', label: 'My Portal', isSection: true },
    { id: 'my_leaves', label: 'My Leaves' },
    { id: 'my_attendance', label: 'My Attendance' },
    { id: 'my_payslips', label: 'Pay Slips' },
    { id: 'notice-board', label: 'Notice Board' },
    { id: 'meetings', label: 'Meetings' },
  ];
}

function OverviewContent({ metrics, onNavigate, punchWidget }: { metrics: any; onNavigate: (tab: string) => void; punchWidget?: React.ReactNode }) {
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [absentToday, setAbsentToday] = useState<any[]>([]);
  const [loadingVacancies, setLoadingVacancies] = useState(true);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  const fetchOverviewData = () => {
    setLoadingVacancies(true);
    setLoadingLeaves(true);
    api.get('/hr/vacancies?status=open')
      .then(r => setVacancies(r.data.data || []))
      .catch(() => setVacancies([]))
      .finally(() => setLoadingVacancies(false));
    api.get('/hr/leaves?status=pending')
      .then(r => setPendingLeaves(r.data.data || []))
      .catch(() => setPendingLeaves([]))
      .finally(() => setLoadingLeaves(false));
    // Fetch today's absent employees
    const today = new Date().toISOString().split('T')[0];
    api.get(`/hr/attendance?date=${today}&status=absent`)
      .then(r => setAbsentToday(r.data.data || []))
      .catch(() => setAbsentToday([]));
  };

  useEffect(() => { fetchOverviewData(); }, []);

  const highPriorityVacancies = vacancies.filter(v => v.priority === 'high' || v.priority === 'urgent');

  return (
    <div className="space-y-6">
      {/* Core Metrics & Attendance Widget Top Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-4">
        <div className="xl:col-span-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <HRMetricCard
              title="Total Headcount"
              value={metrics.totalEmployees ?? '—'}
              icon={<Users className="w-5 h-5" />}
              subtext="Active across all wings"
              color="primary"
              onClick={() => onNavigate('users')}
            />
            <HRMetricCard
              title="Open Vacancies"
              value={metrics.totalVacancies ?? vacancies.length}
              icon={<Briefcase className="w-5 h-5" />}
              subtext={highPriorityVacancies.length > 0 ? `${highPriorityVacancies.length} high priority` : 'No high priority'}
              color="info"
              onClick={() => onNavigate('vacancies')}
            />
            <HRMetricCard
              title="Absent Today"
              value={metrics.absentToday ?? absentToday.length}
              icon={<Clock className="w-5 h-5" />}
              subtext={(metrics.absentToday ?? absentToday.length) > 0 ? `${metrics.absentToday ?? absentToday.length} not checked in` : 'All present'}
              color="warning"
              onClick={() => onNavigate('attendance')}
            />
            <HRMetricCard
              title="Present Today"
              value={metrics.presentToday ?? '—'}
              icon={<Heart className="w-5 h-5" />}
              subtext={metrics.onLeave != null ? `${metrics.onLeave} on leave` : 'Attendance today'}
              color="success"
              onClick={() => onNavigate('attendance')}
            />
          </div>
        </div>
        {punchWidget && (
          <div className="xl:col-span-1">
            {punchWidget}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recruitment Pipeline — live vacancies */}
        <Card className="lg:col-span-2 border border-slate-200/60 dark:border-slate-800/60 shadow-md rounded-2xl overflow-hidden bg-card">
          <CardHeader className="flex flex-row items-center justify-between bg-muted/30 border-b border-border/40 py-5 px-6">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('vacancies')}>
              <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">Open Vacancies</CardTitle>
                <CardDescription className="text-xs mt-0.5">Live hiring positions across departments</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={fetchOverviewData}>
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-full px-4 h-8 text-xs font-semibold hover:bg-primary hover:text-primary-foreground border-slate-200/60 transition-all duration-300" onClick={() => onNavigate('vacancies')}>
                View All <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loadingVacancies ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />)}
              </div>
            ) : vacancies.length === 0 ? (
              <button
                className="w-full flex flex-col items-center justify-center py-12 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all rounded-xl border border-dashed border-border/60"
                onClick={() => onNavigate('vacancies')}
              >
                <div className="p-4 bg-muted/30 rounded-full mb-3">
                  <Briefcase className="w-8 h-8 opacity-40" />
                </div>
                <p className="text-sm font-medium">No open vacancies</p>
                <p className="text-xs opacity-60 mt-1">Click here to create a new hiring position</p>
              </button>
            ) : (
              <div className="space-y-4">
                {vacancies.slice(0, 5).map(v => (
                  <VacancyItem key={v.id} vacancy={v} onClick={() => onNavigate('vacancies')} />
                ))}
                {vacancies.length > 5 && (
                  <button
                    className="w-full text-xs font-semibold text-muted-foreground hover:text-primary transition-colors pt-2 flex items-center justify-center gap-1 group"
                    onClick={() => onNavigate('vacancies')}
                  >
                    View {vacancies.length - 5} more positions <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-md rounded-2xl bg-card overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4 px-5">
              <CardTitle className="text-sm font-bold flex items-center gap-2 cursor-pointer hover:text-primary transition-colors" onClick={() => onNavigate('leaves')}>
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                Leave Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-2">
                {[
                  { label: 'Pending', value: metrics.pendingLeaves ?? pendingLeaves.length, color: 'bg-yellow-500', tab: 'leaves' },
                  { label: 'Present Today', value: metrics.presentToday ?? '—', color: 'bg-green-500', tab: 'attendance' },
                  { label: 'On Leave', value: metrics.onLeave ?? '—', color: 'bg-blue-500', tab: 'leaves' },
                ].map(item => (
                  <button
                    key={item.label}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-all group text-left border border-transparent hover:border-border/50"
                    onClick={() => onNavigate(item.tab)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('w-2 h-2 rounded-full shadow-sm', item.color)} />
                      <span className="text-sm text-muted-foreground font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground">{item.value}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="relative border border-success/20 shadow-md rounded-2xl overflow-hidden bg-gradient-to-br from-success to-success/80 text-success-foreground group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
              <Award className="w-24 h-24 text-white" />
            </div>
            <CardContent className="relative z-10 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-lg text-white">Top Employee</h4>
                  <p className="text-xs text-white/90 mt-0.5 font-medium tracking-wide">Recognize excellence</p>
                </div>
              </div>
              
              <div className="mt-6 pt-5 border-t border-white/20 flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-success/50 bg-white/40 backdrop-blur-sm" />
                  <div className="w-8 h-8 rounded-full border-2 border-success/50 bg-white/60 backdrop-blur-sm" />
                  <div className="w-8 h-8 rounded-full border-2 border-success/50 bg-white shadow-sm flex items-center justify-center">
                    <span className="text-[10px] font-bold text-success">+</span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="h-8 rounded-full text-xs font-bold bg-white text-success hover:bg-white/90 shadow-sm transition-all hover:shadow-md px-4"
                  onClick={() => onNavigate('employees')}
                >
                  Nominate <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pending Leave Approvals — live data */}
      <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-md rounded-2xl overflow-hidden bg-card">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/30 border-b border-border/40 py-5 px-6">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('leaves')}>
            <div className="p-2.5 bg-yellow-500/10 rounded-xl group-hover:bg-yellow-500/20 transition-colors">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">Pending Leave Approvals</CardTitle>
              <CardDescription className="text-xs mt-0.5">Review and approve employee time off</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs rounded-full px-3 py-1 border-yellow-500/30 text-yellow-600 dark:text-yellow-500 bg-yellow-500/5">{pendingLeaves.length} pending</Badge>
            {pendingLeaves.length > 0 && (
              <Button variant="outline" size="sm" className="rounded-full px-4 h-8 text-xs font-semibold hover:bg-yellow-500 hover:text-white hover:border-yellow-500 border-slate-200/60 transition-all duration-300" onClick={() => onNavigate('leaves')}>
                View All <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loadingLeaves ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />)}
            </div>
          ) : pendingLeaves.length === 0 ? (
            <button
              className="w-full flex flex-col items-center justify-center py-12 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all rounded-xl border border-dashed border-border/60"
              onClick={() => onNavigate('leaves')}
            >
              <div className="p-4 bg-muted/30 rounded-full mb-3">
                <CheckCircle2 className="w-8 h-8 opacity-40 text-success" />
              </div>
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs opacity-60 mt-1">No pending leave requests to review</p>
            </button>
          ) : (
            <div className="space-y-4">
              {pendingLeaves.slice(0, 5).map(leave => (
                <LiveLeaveItem key={leave.id} leave={leave} onRefresh={fetchOverviewData} onViewAll={() => onNavigate('leaves')} />
              ))}
              {pendingLeaves.length > 5 && (
                <button
                  className="w-full text-xs font-semibold text-muted-foreground hover:text-yellow-600 dark:hover:text-yellow-500 transition-colors pt-2 flex items-center justify-center gap-1 group"
                  onClick={() => onNavigate('leaves')}
                >
                  View {pendingLeaves.length - 5} more requests <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HRMetricCard({ title, value, icon, subtext, color, onClick }: any) {
  const gradientMap: any = {
    primary: "from-primary/10 via-primary/5 to-transparent",
    info: "from-info/10 via-info/5 to-transparent",
    warning: "from-warning/10 via-warning/5 to-transparent",
    success: "from-success/10 via-success/5 to-transparent",
  };

  const iconMap: any = {
    primary: "bg-primary/20 text-primary group-hover:bg-primary group-hover:text-white",
    info: "bg-info/20 text-info group-hover:bg-info group-hover:text-white",
    warning: "bg-warning/20 text-warning group-hover:bg-warning group-hover:text-white",
    success: "bg-success/20 text-success group-hover:bg-success group-hover:text-white",
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden group shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-pointer border border-slate-200/60 dark:border-slate-800/60 rounded-2xl bg-card"
      )}
      onClick={onClick}
    >
      {/* Subtle background gradient overlay based on the metric's color */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", gradientMap[color])} />
      
      <CardContent className="relative p-6 z-10 flex flex-col h-full justify-between">
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div className={cn("p-3 rounded-xl transition-all duration-300 w-fit", iconMap[color])}>
              {icon}
            </div>
            <div>
              <p className="text-4xl font-extrabold tracking-tight text-foreground">{value}</p>
              <p className="text-sm font-semibold text-muted-foreground mt-1 tracking-wide">{title}</p>
            </div>
          </div>
          
          {/* Slide-in arrow animation */}
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0">
            <div className="p-2 bg-background/50 backdrop-blur-sm rounded-full">
              <ArrowRight className="w-4 h-4 text-foreground" />
            </div>
          </div>
        </div>
        
        {/* Divider and Subtext */}
        <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/5">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", color === 'success' ? 'bg-success' : color === 'warning' ? 'bg-warning' : color === 'info' ? 'bg-info' : 'bg-primary')} />
            {subtext}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

const STAGE_PROGRESS: Record<string, number> = {
  open: 5,
  shortlisting: 20,
  interviewing: 50,
  'technical review': 65,
  'offer extended': 90,
  closed: 100,
};

function VacancyItem({ vacancy, onClick }: { vacancy: any; onClick?: () => void }) {
  const stage = vacancy.stage || vacancy.status || 'open';
  const progress = STAGE_PROGRESS[stage.toLowerCase()] ?? 10;
  const deptName = typeof vacancy.departmentId === 'object' ? vacancy.departmentId?.name : 'General';
  const filled = vacancy.filled ?? 0;
  const total = vacancy.count ?? 1;

  return (
    <div className="space-y-2 cursor-pointer group" onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h5 className="text-sm font-bold truncate group-hover:text-primary transition-colors">{vacancy.title}</h5>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
            {deptName} • {total - filled} position{total - filled !== 1 ? 's' : ''} open
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] bg-muted py-0.5 font-bold uppercase capitalize shrink-0 ml-2">
          {stage}
        </Badge>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function LiveLeaveItem({ leave, onRefresh, onViewAll }: { leave: any; onRefresh: () => void; onViewAll?: () => void }) {
  const [acting, setActing] = useState(false);

  const handleQuickAction = async (action: 'approve' | 'reject') => {
    setActing(true);
    try {
      const endpoint = leave.status === 'dept_approved' ? 'hr-approve' : 'dept-approve';
      await api.patch(`/hr/leaves/${leave.id}/${endpoint}`, { action, remarks: action === 'approve' ? 'Approved from overview' : 'Rejected from overview' });
      toast.success(action === 'approve' ? 'Leave approved' : 'Leave rejected');
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const name = leave.user?.name || leave.employee?.name || leave.employeeId?.name || 'Employee';
  const type = leave.type ? leave.type.charAt(0).toUpperCase() + leave.type.slice(1) + ' Leave' : 'Leave';
  const start = new Date(leave.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const end = new Date(leave.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const dateStr = start === end ? start : `${start} – ${end}`;

  return (
    <div
      className="flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-border hover:bg-muted/30 transition-all group cursor-pointer"
      onClick={onViewAll}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold group-hover:text-primary transition-colors">{name}</p>
          <p className="text-[11px] text-muted-foreground">{type} • {dateStr}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Badge className="text-[10px] py-0.5 uppercase font-bold bg-warning/10 text-warning">Pending</Badge>
        <Button
          variant="ghost" size="icon-sm"
          className="opacity-0 group-hover:opacity-100 h-7 w-7 text-green-600 hover:bg-green-50"
          disabled={acting}
          onClick={(e) => { e.stopPropagation(); handleQuickAction('approve'); }}
          title="Quick approve"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon-sm"
          className="opacity-0 group-hover:opacity-100 h-7 w-7 text-red-500 hover:bg-red-50"
          disabled={acting}
          onClick={(e) => { e.stopPropagation(); handleQuickAction('reject'); }}
          title="Quick reject"
        >
          <XCircle className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
