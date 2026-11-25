/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { AssetManagementPanel } from '@/components/panels/AssetManagementPanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { SalaryConfigPanel } from '@/components/panels/SalaryConfigPanel';
import { LeaveAllocationPanel } from '@/components/panels/LeaveAllocationPanel';
import { PollsPanel } from '@/components/panels/PollsPanel';
import { OrgHierarchyPanel } from '@/components/panels/OrgHierarchyPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { MeetingsPanel } from '@/components/panels/MeetingsPanel';

export function ModernHRDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const [metrics, setMetrics] = useState<any>({});
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [tabProps, setTabProps] = useState<any>({});
  const handleNavigate = (tab: string, props?: any) => {
    setActiveTab(tab);
    if (props) setTabProps(props);
    else setTabProps({});
    if (onNavigate) onNavigate(tab);
  };

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
          onNavigate={handleNavigate}
        />
      );
      case 'users': return <HRUsersPanel />;
      case 'employees': return <EmployeesPanel />;
      case 'team_permissions': return <TeamPermissionsPanel />;
      case 'leaves': return <LeavesPanel />;
      case 'my_leaves': return <LeavesPanel isMyPortal />;
      case 'attendance': return <AttendancePanel initialFilter={tabProps.filter} />;
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
      case 'my_payslips': return <PayrollPanel />;
      case 'notice-board': return <NoticeBoardPanel />;
      case 'assets': return <AssetManagementPanel />;
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
    { id: 'assets', label: 'Assets' },
    { id: '__portal_section', label: 'My Portal', isSection: true },
    { id: 'my_leaves', label: 'My Leaves' },
    { id: 'my_attendance', label: 'My Attendance' },
    { id: 'my_payslips', label: 'Pay Slips' },
    { id: 'notice-board', label: 'Notice Board' },
    { id: 'meetings', label: 'Meetings' },
  ];
}

function OverviewContent({ metrics, onNavigate, punchWidget }: { metrics: any; onNavigate: (tab: string, props?: any) => void; punchWidget?: React.ReactNode }) {
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
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">HR Overview</h2>
        <p className="text-muted-foreground text-sm mt-1.5">Headcount, attendance, hiring and leave at a glance.</p>
      </div>

      {/* Core metrics */}
      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-slate-100">
          <HRMetricCard
            title="Total Headcount"
            value={metrics.totalEmployees ?? '—'}
            subtext="Active across all wings"
            onClick={() => onNavigate('users')}
          />
          <HRMetricCard
            title="Open Vacancies"
            value={metrics.totalVacancies ?? vacancies.length}
            subtext={highPriorityVacancies.length > 0 ? `${highPriorityVacancies.length} high priority` : 'No high priority'}
            onClick={() => onNavigate('vacancies')}
          />
          <HRMetricCard
            title="Absent Today"
            value={metrics.absentToday ?? absentToday.length}
            subtext={(metrics.absentToday ?? absentToday.length) > 0 ? `${metrics.absentToday ?? absentToday.length} not checked in` : 'All present'}
            onClick={() => onNavigate('attendance', { filter: 'absent' })}
          />
          <HRMetricCard
            title="Present Today"
            value={metrics.presentToday ?? '—'}
            subtext={metrics.onLeave != null ? `${metrics.onLeave} on leave` : 'Attendance today'}
            onClick={() => onNavigate('attendance', { filter: 'present' })}
          />
          <HRMetricCard
            title="Probation Ended"
            value={metrics.probationEnded ?? '0'}
            subtext="Action needed for Leave Allocation"
            onClick={() => onNavigate('leave-alloc')}
          />
        </div>
      </div>

      {punchWidget && <div>{punchWidget}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Open vacancies */}
        <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-100 overflow-hidden">
          <div className="flex flex-row items-center justify-between gap-3 px-6 py-5 border-b border-slate-100">
            <div className="cursor-pointer" onClick={() => onNavigate('vacancies')}>
              <h3 className="text-lg font-semibold tracking-tight">Open Vacancies</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Live hiring positions across departments</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-[#eaf6e6]" onClick={fetchOverviewData} title="Refresh">
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </Button>
              <Button variant="outline" className="rounded-full px-5 h-10 text-sm font-semibold bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6]" onClick={() => onNavigate('vacancies')}>
                View All <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            {loadingVacancies ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
              </div>
            ) : vacancies.length === 0 ? (
              <button
                className="w-full flex flex-col items-center justify-center py-12 text-muted-foreground hover:bg-[#f4f6f3] transition-colors rounded-2xl"
                onClick={() => onNavigate('vacancies')}
              >
                <p className="text-sm font-medium text-slate-900">No open vacancies</p>
                <p className="text-xs mt-1">Click here to create a new hiring position</p>
              </button>
            ) : (
              <div className="space-y-3">
                {vacancies.slice(0, 5).map(v => (
                  <VacancyItem key={v.id} vacancy={v} onClick={() => onNavigate('vacancies')} />
                ))}
                {vacancies.length > 5 && (
                  <button
                    className="w-full text-xs font-semibold text-[#256c1d] hover:underline pt-2 flex items-center justify-center gap-1"
                    onClick={() => onNavigate('vacancies')}
                  >
                    View {vacancies.length - 5} more positions <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden flex-1">
            <div className="px-6 py-5 border-b border-slate-100 cursor-pointer" onClick={() => onNavigate('leaves')}>
              <h3 className="text-lg font-semibold tracking-tight">Leave Summary</h3>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: 'Pending', value: metrics.pendingLeaves ?? pendingLeaves.length, tab: 'leaves' },
                { label: 'Present Today', value: metrics.presentToday ?? '—', tab: 'attendance' },
                { label: 'On Leave', value: metrics.onLeave ?? '—', tab: 'leaves' },
              ].map(item => (
                <button
                  key={item.label}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors group text-left"
                  onClick={() => onNavigate(item.tab)}
                >
                  <span className="text-sm text-slate-600 font-medium">{item.label}</span>
                  <span className="text-lg font-semibold text-slate-900">{item.value}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-[#eaf6e6] border border-[#cfe9c9] p-6">
            <h4 className="font-semibold text-lg tracking-tight text-[#1d5a17]">Top Employee</h4>
            <p className="text-sm text-[#256c1d]/80 mt-0.5">Recognize excellence</p>
            <Button
              className="mt-5 h-11 rounded-full px-6 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"
              onClick={() => onNavigate('employees')}
            >
              Nominate <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Pending leave approvals */}
      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="flex flex-row items-center justify-between gap-3 px-6 py-5 border-b border-slate-100">
          <div className="cursor-pointer" onClick={() => onNavigate('leaves')}>
            <h3 className="text-lg font-semibold tracking-tight">Pending Leave Approvals</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Review and approve employee time off</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1">{pendingLeaves.length} pending</span>
            {pendingLeaves.length > 0 && (
              <Button variant="outline" className="rounded-full px-5 h-10 text-sm font-semibold bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6]" onClick={() => onNavigate('leaves')}>
                View All <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="p-4 sm:p-5">
          {loadingLeaves ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : pendingLeaves.length === 0 ? (
            <button
              className="w-full flex flex-col items-center justify-center py-12 text-muted-foreground hover:bg-[#f4f6f3] transition-colors rounded-2xl"
              onClick={() => onNavigate('leaves')}
            >
              <p className="text-sm font-medium text-slate-900">All caught up!</p>
              <p className="text-xs mt-1">No pending leave requests to review</p>
            </button>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {pendingLeaves.slice(0, 6).map(leave => (
                <LiveLeaveItem key={leave.id} leave={leave} onRefresh={fetchOverviewData} onViewAll={() => onNavigate('leaves')} />
              ))}
              {pendingLeaves.length > 6 && (
                <button
                  className="lg:col-span-2 w-full text-xs font-semibold text-[#256c1d] hover:underline pt-2 flex items-center justify-center gap-1"
                  onClick={() => onNavigate('leaves')}
                >
                  View {pendingLeaves.length - 6} more requests <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HRMetricCard({ title, value, subtext, onClick }: any) {
  return (
    <button
      type="button"
      className="text-left p-5 sm:p-6 hover:bg-[#f7faf6] transition-colors flex flex-col"
      onClick={onClick}
    >
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-4xl font-semibold tracking-tight text-slate-900 mt-2">{value}</p>
      <p className="text-xs text-muted-foreground mt-2">{subtext}</p>
    </button>
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
    <div className="space-y-3 cursor-pointer group p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors" onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h5 className="text-sm font-semibold text-slate-900 truncate">{vacancy.title}</h5>
          <p className="text-xs text-muted-foreground">
            {deptName} • {total - filled} position{total - filled !== 1 ? 's' : ''} open
          </p>
        </div>
        <Badge variant="outline" className="text-[11px] bg-white border-0 rounded-full px-3 py-0.5 font-semibold capitalize shrink-0 ml-2">
          {stage}
        </Badge>
      </div>
      <div className="h-2 w-full bg-white rounded-full overflow-hidden">
        <div className="h-full bg-[#54b947] rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
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
      className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors group cursor-pointer"
      onClick={onViewAll}
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-sm font-semibold text-slate-700 shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{name}</p>
          <p className="text-[11px] text-muted-foreground">{type} • {dateStr}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Badge className="text-[11px] rounded-full border-0 px-3 py-0.5 font-semibold bg-amber-100 text-amber-700">Pending</Badge>
        <Button
          variant="ghost" size="icon-sm"
          className="h-9 w-9 rounded-full text-[#256c1d] hover:bg-white"
          disabled={acting}
          onClick={(e) => { e.stopPropagation(); handleQuickAction('approve'); }}
          title="Quick approve"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon-sm"
          className="h-9 w-9 rounded-full text-red-500 hover:bg-red-50"
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
