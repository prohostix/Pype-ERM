/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { TargetsPanel } from '@/components/panels/TargetsPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { SalesInvitePanel } from '@/components/panels/SalesInvitePanel';
import { SalesStudentPipelinePanel } from '@/components/panels/SalesStudentPipelinePanel';
import { SalesAdminReviewPanel } from '@/components/panels/SalesAdminReviewPanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { SubSalesPortalPanel } from '@/components/panels/SubSalesPortalPanel';
import { TeamPerformancePanel } from '@/components/panels/TeamPerformancePanel';
import { EnrollStudentPanel } from '@/components/panels/EnrollStudentPanel';
import { ProvisionalEnrollmentPanel } from '@/components/panels/ProvisionalEnrollmentPanel';
import { LeadsPanel } from '@/components/panels/LeadsPanel';
import { MyProfilePanel } from '@/components/panels/MyProfilePanel';
import { SalesTeamReportPanel } from '@/components/panels/SalesTeamReportPanel';
import { SalesCounselorReportPanel } from '@/components/panels/SalesCounselorReportPanel';
import { SalesAdmissionReportPanel } from '@/components/panels/SalesAdmissionReportPanel';
import { SalesConversionReportPanel } from '@/components/panels/SalesConversionReportPanel';
import { ProgramsPanel } from '@/components/panels/ProgramsPanel';
import { FeeStructuresPanel } from '@/components/panels/FeeStructuresPanel';
import { UniversitiesPanel } from '@/components/panels/UniversitiesPanel';
import { EscalationsPanel } from '@/components/panels/EscalationsPanel';
import { ComplaintsPanel } from '@/components/panels/ComplaintsPanel';
import { ImportantUpdatesPanel } from '@/components/panels/ImportantUpdatesPanel';
import { ComingSoonPanel } from '@/components/panels/ComingSoonPanel';
import { MeetingsPanel } from '@/components/panels/MeetingsPanel';
import { PaymentsPanel } from '@/components/panels/PaymentsPanel';
import TeamPermissionsPanel from '@/components/panels/TeamPermissionsPanel';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

import { CS, numLocale } from '@/lib/currency';
export function ModernSalesDashboard({ initialTab, isSubDeptManager, onNavigate }: { initialTab?: string; isSubDeptManager?: boolean; onNavigate?: (tab: string) => void }) {
  const { user } = useAuth();
  const isDeptSales = user?.department?.type === 'sales' || user?.department?.name?.toLowerCase().includes('sales');
  const isSalesAdmin = user?.role === 'sales_admin' || (user?.role === 'employee' && isSubDeptManager && isDeptSales);

  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>({});
  const [students, setStudents] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setActiveTab(initialTab || 'overview'); }, [initialTab]);
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [metricsRes, studentsRes, targetsRes] = await Promise.all([
        api.get('/dashboard/metrics').catch(() => ({ data: { data: {} } })),
        api.get('/students').catch(() => ({ data: { data: [] } })),
        api.get('/sales/targets').catch(() => ({ data: { data: [] } })),
      ]);
      setMetrics(metricsRes.data.data || {});
      setStudents(studentsRes.data.data || []);
      setTargets(targetsRes.data.data || []);
    } catch (e) {
      console.error('Sales fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Sub-dept manager (employee in sales dept) or sales employee — scoped personal view
  if (!isSalesAdmin) {
    return <SalesEmployeePortal initialTab={initialTab} user={user} onNavigate={handleNavigate} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'team_permissions': return <TeamPermissionsPanel />;
      case 'meetings': return <MeetingsPanel />;
      case 'overview': return (
        <OverviewContent metrics={metrics} students={students} targets={targets} loading={loading} onNavigate={handleNavigate} />
      );

      // Enrollment
      case 'team_student_registration': return <EnrollStudentPanel />;
      case 'provisional_enrollment': return <ProvisionalEnrollmentPanel />;
      case 'team_enrolled_students':
      case 'enrolled_students':
      case 'student_status': return <StudentsPanel />;
      case 'student_applications':
      case 'pending_admissions':
      case 'admission_status_overview':
      case 'admission_pipeline': return <SalesStudentPipelinePanel />;
      case 'invite_links': return <SalesInvitePanel />;

      // Payments
      case 'payments':
      case 'payment':
      case 'payment_status':
      case 'pending_payment': return <PaymentsPanel />;

      // My Team
      case 'team_members':
      case 'todays_performance':
      case 'my_team': return <TeamPerformancePanel />;

      // Target Management
      case 'targets':
      case 'target_vs_achievement':
      case 'individual_target':
      case 'achievement_tracking':
      case 'incentive_status':
      case 'target_history': return <TargetsPanel endpoint="/sales/targets" title="Sales Targets" />;

      // Lead & Follow-up
      case 'leads':
      case 'lead_management':
      case 'total_leads':
      case 'follow_up_status':
      case 'hot_leads': return <LeadsPanel />;

      // Task Management
      case 'tasks':
      case 'pending_actions':
      case 'lead_pending_actions':
      case 'assign_tasks':
      case 'task_status':
      case 'completed_tasks': return <TasksPanel />;

      // Performance & Reports
      case 'team_reports': return <SalesTeamReportPanel />;
      case 'counselor_reports':
      case 'performance_reports': return <SalesCounselorReportPanel />;
      case 'admission_reports':
      case 'counselor_admission_reports': return <SalesAdmissionReportPanel />;
      case 'conversion_report': return <SalesConversionReportPanel />;

      // Team Communication
      case 'team_announcements':
      case 'announcements': return <AnnouncementsPanel />;
      case 'team_notes': return <ComingSoonPanel title="Team Notes" description="Shared notes for your sales team." note="Team notes aren't available yet. You'll be able to write and share notes with your team here once this module launches." />;
      case 'important_updates': return <ImportantUpdatesPanel />;
      case 'notice-board': return <NoticeBoardPanel />;

      // Sales Resources
      case 'course_details':
      case 'course_details_dash':
      case 'course_details_res':
      case 'programs': return <ProgramsPanel />;
      case 'fee_structure':
      case 'fee_structure_res': return <FeeStructuresPanel />;
      case 'university_details':
      case 'university_details_res':
      case 'universities': return <UniversitiesPanel />;
      case 'sales_materials':
      case 'brochures': return <ComingSoonPanel title="Sales Materials" description="Brochures and materials your team can share with students." note="Sales materials aren't available yet. Brochures and shareable files will be listed here once this module launches." />;

      // Requests & Approvals
      case 'team_requests':
      case 'approval_requests': return <EscalationsPanel />;
      case 'admission_approval': return <SalesAdminReviewPanel />;
      case 'support_requests': return <ComplaintsPanel />;
      case 'leaves': return <LeavesPanel />;

      // My Portal
      case 'my_profile': return <MyProfilePanel />;
      case 'my_leaves': return <LeavesPanel />;
      case 'my_attendance': return <AttendancePanel isMyPortal />;
      case 'holidays': return <HolidaysPanel />;

      default: return (
        <OverviewContent metrics={metrics} students={students} targets={targets} loading={loading} onNavigate={handleNavigate} />
      );
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {renderContent()}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function getSalesNavItems(isSalesAdmin?: boolean) {
  if (isSalesAdmin) {
    return [
      { id: '__dashboard', label: 'Dashboard', isSection: true },
      { id: 'overview', label: 'Team Summary' },
      { id: 'todays_performance', label: 'Today\'s Performance' },
      { id: 'target_vs_achievement', label: 'Target vs Achievement' },
      { id: 'pending_actions', label: 'Pending Actions' },

      { id: '__enrollment', label: 'Enrollment', isSection: true },
      { id: 'invite_links', label: 'Generate Student Link' },
      { id: 'provisional_enrollment', label: 'Provisional Enrollment' },
      { id: 'admission_pipeline', label: 'Admission Pipeline' },
      { id: 'student_status', label: 'Student Status' },
      { id: 'payment_status', label: 'Payment Status' },
      { id: 'leads', label: 'Lead Management' },

      { id: '__my_team', label: 'My Team', isSection: true },
      { id: 'team_members', label: 'Team Members' },
      { id: 'team_permissions', label: 'Team Permissions' },

      { id: '__tasks', label: 'Task Management', isSection: true },
      { id: 'assign_tasks', label: 'Assign Tasks' },

      { id: '__targets', label: 'Target Management', isSection: true },
      { id: 'targets', label: 'Team Target' },
      { id: 'individual_target', label: 'Individual Target' },

      { id: '__reports', label: 'Performance & Reports', isSection: true },
      { id: 'team_reports', label: 'Team Reports' },
      { id: 'admission_reports', label: 'Admission Reports' },
      { id: 'conversion_report', label: 'Conversion Report' },

      { id: '__communication', label: 'Team Communication', isSection: true },
      { id: 'team_announcements', label: 'Team Announcements' },
      { id: 'team_notes', label: 'Team Notes' },
      { id: 'important_updates', label: 'Important Updates' },

      { id: '__resources', label: 'Sales Resources', isSection: true },
      { id: 'course_details', label: 'Course Details' },
      { id: 'university_details', label: 'University Details' },
      { id: 'sales_materials', label: 'Sales Materials' },

      { id: '__requests', label: 'Requests & Approvals', isSection: true },
      { id: 'team_requests', label: 'Team Requests' },
      { id: 'admission_approval', label: 'Admission Approval' },
      { id: 'support_requests', label: 'Support Requests' },
      { id: 'leaves', label: 'Leave Approvals' },

      { id: '__portal_section', label: 'My Portal', isSection: true },
      { id: 'my_profile', label: 'My Profile' },
      { id: 'my_attendance', label: 'Attendance' },
      { id: 'my_leaves', label: 'Leave' },
      { id: 'holidays', label: 'Holidays' },
      { id: 'announcements', label: 'Announcements' },
      { id: 'notice-board', label: 'Notifications' },
      { id: 'meetings', label: 'Meetings' },
    ];
  }

  return [
    { id: '__dashboard', label: 'Dashboard', isSection: true },
    { id: 'overview', label: 'Overview' },
    { id: 'enrolled_students', label: 'Enrolled Students' },
    { id: 'payment_status', label: 'Payment Status' },

    { id: '__pipeline', label: 'Student Pipeline', isSection: true },
    { id: 'invite_links', label: 'Generate Student Link' },
    { id: 'provisional_enrollment', label: 'Provisional Enrollment' },
    { id: 'admission_status_overview', label: 'Admission Status Overview' },

    { id: '__tasks', label: 'Tasks', isSection: true },
    { id: 'tasks', label: 'My Tasks' },

    { id: '__performance', label: 'My Performance', isSection: true },
    { id: 'targets', label: 'Target' },
    { id: 'incentive_status', label: 'Incentive Status' },

    { id: '__resources', label: 'Sales Resources', isSection: true },
    { id: 'course_details_res', label: 'Course Details' },
    { id: 'university_details_res', label: 'University Details' },
    { id: 'brochures', label: 'Brochures & Materials' },

    { id: '__requests', label: 'Requests', isSection: true },
    { id: 'approval_requests', label: 'Approval Requests' },
    { id: 'support_requests', label: 'Support Requests' },

    { id: '__portal_section', label: 'My Portal', isSection: true },
    { id: 'my_profile', label: 'My Profile' },
    { id: 'my_attendance', label: 'Attendance' },
    { id: 'my_leaves', label: 'Leave' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'notice-board', label: 'Notifications' },

    { id: '__admission_flow', label: 'Admission Flow', isSection: true },
    { id: 'lead_management', label: 'Lead Management Flow' },
    { id: 'meetings', label: 'Meetings' },
  ];
}

function OverviewContent({ metrics, students, targets, loading, onNavigate }: any) {
  const totalStudents = students.length;
  const activeStudents = students.filter((s: any) => s.status === 'active').length;
  const pendingStudents = students.filter((s: any) => s.status === 'pending').length;

  const tally = (keyOf: (s: any) => string) => {
    const m: Record<string, number> = {};
    students.forEach((s: any) => { const k = keyOf(s); m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(k => ({ name: k, value: m[k] })).sort((x, y) => y.value - x.value);
  };
  const programRows = tally((s) => s.program?.name || 'Unknown Program').slice(0, 8);
  const universityRows = tally((s) => s.university?.name || s.program?.university?.name || 'Unknown').slice(0, 8);
  const PALETTE = ['#54b947', '#8ae47e', '#256c1d', '#b8d8b0', '#0b1d14', '#64748b'];

  // Target progress — compute from achieved/target since model has no status/progress fields
  const activeTargets = targets.filter((t: any) => (t.achieved || 0) < t.target);
  const avgProgress = activeTargets.length
    ? Math.round(activeTargets.reduce((sum: number, t: any) => {
        const pct = t.target > 0 ? Math.round((t.achieved / t.target) * 100) : 0;
        return sum + pct;
      }, 0) / activeTargets.length)
    : 0;

  const statusData = [
    { label: 'Active', value: activeStudents },
    { label: 'Pending', value: pendingStudents },
    { label: 'Inactive', value: students.filter((s: any) => s.status === 'inactive').length },
    { label: 'Completed', value: students.filter((s: any) => s.status === 'completed').length },
  ];

  // New admissions per month, last 6 months
  const today = new Date();
  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, name: d.toLocaleDateString('en-US', { month: 'short' }), count: 0 };
  });
  students.forEach((s: any) => {
    if (!s.createdAt) return;
    const d = new Date(s.createdAt);
    const m = trend.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) m.count++;
  });
  const thisMonth = trend[5].count;
  const lastMonth = trend[4].count;

  const recentStudents = [...students]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const tip = { backgroundColor: '#fff', border: '1px solid #e8ece6', borderRadius: '16px', fontSize: 12 };
  const statusPill = (st: string) =>
    st === 'active' || st === 'admitted' ? 'bg-[#dff3da] text-[#256c1d]' : st === 'cancelled' || st === 'inactive' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';

  const stats = [
    { title: 'Total Students Enrolled', value: loading ? '...' : totalStudents, note: `${activeStudents} active`, tab: 'enrolled_students' },
    { title: 'Pending Verification', value: loading ? '...' : pendingStudents, note: 'Awaiting review', tab: 'enrolled_students' },
    { title: 'Joined This Month', value: loading ? '...' : thisMonth, note: lastMonth > 0 ? `${thisMonth >= lastMonth ? '+' : ''}${Math.round(((thisMonth - lastMonth) / lastMonth) * 100)}% vs last month` : 'No previous month', tab: 'enrolled_students' },
    { title: 'Active Targets', value: loading ? '...' : activeTargets.length, note: avgProgress > 0 ? `${avgProgress}% avg progress` : 'No targets yet', tab: 'targets' },
    { title: 'Pending Tasks', value: loading ? '...' : (metrics.pendingTasks || 0), note: metrics.overdueTasks ? `${metrics.overdueTasks} overdue` : 'On track', tab: 'tasks' },
  ];

  const RankRows = ({ rows }: { rows: { name: string; value: number }[] }) => {
    if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>;
    const max = Math.max(...rows.map(r => r.value), 1);
    const total = rows.reduce((n, r) => n + r.value, 0) || 1;
    return (
      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.name} className="rounded-2xl bg-[#f4f6f3] px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-900 truncate">{r.name}</span>
              <span className="shrink-0 text-slate-600"><span className="font-semibold text-slate-900">{r.value}</span> · {Math.round((r.value / total) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white mt-2 overflow-hidden">
              <div className="h-full rounded-full bg-[#54b947]" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const Panel = ({ title, subtitle, action, children, className = '' }: any) => (
    <div className={`rounded-3xl bg-white border border-slate-100 overflow-hidden ${className}`}>
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );

  const viewAll = (tab: string) => (
    <Button variant="outline" className="h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold" onClick={() => onNavigate(tab)}>
      View All <ArrowUpRight className="ml-1 w-3.5 h-3.5" />
    </Button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Team Summary</h2>
        <p className="text-muted-foreground text-sm mt-1.5">Admissions, targets and tasks for your sales team at a glance.</p>
      </div>

      {/* Stats strip */}
      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-slate-100">
          {stats.map(st => (
            <button key={st.title} type="button" onClick={() => onNavigate(st.tab)} className="text-left p-5 sm:p-6 hover:bg-[#f7faf6] transition-colors">
              <p className="text-sm font-medium text-slate-500">{st.title}</p>
              <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-2">{st.value}</p>
              <p className="text-xs text-muted-foreground mt-1.5">{st.note}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel className="lg:col-span-2" title="New Admissions" subtitle="Last 6 months">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ece6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f4f6f3' }} contentStyle={tip} />
                <Bar dataKey="count" name="Admissions" fill="#54b947" radius={[10, 10, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Student Status" subtitle="Live breakdown">
          {students.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="label" cx="50%" cy="46%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {statusData.map((_e, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tip} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No students registered yet</p>
          )}
        </Panel>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Program Distribution" subtitle="Top programs by students" action={viewAll('enrolled_students')}>
          <RankRows rows={programRows} />
        </Panel>
        <Panel title="University Distribution" subtitle="Top universities by students">
          <RankRows rows={universityRows} />
        </Panel>
      </div>

      {/* Recent enrollments + targets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Recent Enrollments" action={viewAll('enrolled_students')}>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : recentStudents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No students yet</p>
          ) : (
            <div className="space-y-3">
              {recentStudents.map((student: any) => (
                <div key={student.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#f4f6f3]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-white text-slate-700 flex items-center justify-center font-semibold text-sm shrink-0">
                      {(student.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{student.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">{student.program?.name || 'N/A'} · {new Date(student.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize shrink-0 ${statusPill(student.status)}`}>{student.status}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Active Targets" action={viewAll('targets')}>
          {loading ? (
            <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : activeTargets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No active targets</p>
          ) : (
            <div className="space-y-3">
              {activeTargets.slice(0, 5).map((t: any) => {
                const pct = t.target > 0 ? Math.round((t.achieved / t.target) * 100) : 0;
                const label = typeof t.employeeId === 'object' ? t.employeeId?.name
                  : typeof t.departmentId === 'object' ? t.departmentId?.name
                  : t.type || 'Target';
                return (
                  <div key={t.id} className="rounded-2xl bg-[#f4f6f3] px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-900 truncate">{label} <span className="text-muted-foreground font-normal">({t.period})</span></span>
                      <span className="font-semibold text-slate-900 shrink-0">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white mt-2 overflow-hidden">
                      <div className="h-full rounded-full bg-[#54b947]" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ─── Sales Employee Portal (sub-dept managers, sales employees) ───────────────
function SalesEmployeePortal({ initialTab, user, onNavigate }: { initialTab?: string; user: any; onNavigate?: (tab: string) => void }) {
  const isSubDeptManager = Boolean(user?.subDepartmentId);
  const [activeTab, setActiveTab] = useState(initialTab || (isSubDeptManager ? 'my_subdept' : 'overview'));
  const [students, setStudents] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // Overview cards follow one month ('YYYY-MM') or 'all' for every month together
  const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(() => monthKeyOf(new Date()));
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
    return { value: monthKeyOf(d), label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) };
  });

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/students').catch(() => ({ data: { data: [] } })),
      api.get('/sales/targets').catch(() => ({ data: { data: [] } })),
    ]).then(([studentsRes, targetsRes]) => {
      setStudents(studentsRes.data.data || []);
      setTargets(targetsRes.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const subDeptName = typeof user?.subDepartmentId === 'object'
    ? user.subDepartmentId?.name
    : user?.designation || 'Sales';

  const myStudents = students.filter((s: any) => {
    const enrollId = typeof s.enrolledBy === 'object' ? s.enrolledBy?.id : s.enrolledBy;
    const refId = typeof s.referredBy === 'object' ? s.referredBy?.id : s.referredBy;
    const activeUserId = user?.id?.toString();
    return enrollId?.toString() === activeUserId || refId?.toString() === activeUserId;
  });

  const myTargets = targets.filter((t: any) => {
    const empId = typeof t.employeeId === 'object' ? t.employeeId?.id : t.employeeId;
    return empId?.toString() === user?.id?.toString();
  });

  const inMonth = (d: any) => month === 'all' || (!!d && monthKeyOf(new Date(d)) === month);

  // Admission counts follow the month the admission was created in
  const monthStudents = myStudents.filter((s: any) => inMonth(s.createdAt));

  // Collection follows the date the payment was made (falls back to the admission date)
  const collectionOf = (s: any) => {
    const entries: { amount: number; date: any }[] = [];
    if (s.enrollments && s.enrollments.length > 0) {
      for (const e of s.enrollments) {
        entries.push({
          amount: Number(e.payment?.amount || e.initialPaymentAmount || 0),
          date: e.payment?.debitedAt || e.admissionProgress?.initialPaymentDate || s.admissionProgress?.initialPaymentDate || e.createdAt || s.createdAt,
        });
      }
    } else if (s.admissionProgress?.initialPaymentAmount) {
      entries.push({ amount: Number(s.admissionProgress.initialPaymentAmount), date: s.admissionProgress.initialPaymentDate || s.createdAt });
    }
    return entries.filter((e) => inMonth(e.date)).reduce((sum, e) => sum + e.amount, 0);
  };
  const actualCollection = myStudents.reduce((sum: number, s: any) => sum + collectionOf(s), 0);

  // A monthly target applies to every month. For a chosen month, achievement is that month's
  // collection (revenue targets) or admissions (other targets); "all" keeps the stored value.
  const achievedFor = (t: any) => {
    if (month === 'all') return Number(t.achieved || 0);
    return t.type === 'revenue' ? actualCollection : monthStudents.length;
  };
  const targetTotal = myTargets.reduce((sum: number, t: any) => sum + (t.target || 0), 0);
  const achievementPct = myTargets.length > 0
    ? Math.round(myTargets.reduce((sum: number, t: any) => sum + (t.target > 0 ? (achievedFor(t) / t.target) * 100 : 0), 0) / myTargets.length)
    : 0;
  const expectedIncentive = myTargets.reduce((sum: number, t: any) => sum + (achievedFor(t) >= t.target ? (t.incentive || 0) : 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Summary strips: Overview page only */}
      {activeTab === 'overview' && (<>
      <StatStrip title="Performance" loading={loading} onNavigate={handleNavigate} action={
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-44 h-10 rounded-full bg-white border-slate-200 px-4 text-sm"><SelectValue placeholder="Select month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            {monthOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      } items={[
        { label: 'My admissions', value: monthStudents.length, tab: 'enrolled_students' },
        { label: 'My target', value: targetTotal, tab: 'targets' },
        { label: 'Achievement', value: `${achievementPct}%`, tab: 'targets', tone: 'text-[#256c1d]' },
        { label: 'My collection', value: `${CS()}${actualCollection.toLocaleString(numLocale())}`, tab: 'enrolled_students' },
        { label: 'Expected incentive', value: `${CS()}${expectedIncentive.toLocaleString(numLocale())}`, tab: 'targets' },
      ]} />

      <StatStrip title="Admission status" loading={loading} onNavigate={handleNavigate} items={[
        { label: 'Verification pending', value: monthStudents.filter((s: any) => s.status === 'pending').length, tab: 'enrolled_students', tone: 'text-amber-600' },
        { label: 'Payment pending', value: monthStudents.filter((s: any) => s.status === 'payment_pending').length, tab: 'enrolled_students', tone: 'text-amber-600' },
        { label: 'Ops handover pending', value: monthStudents.filter((s: any) => s.status === 'ops_pending').length, tab: 'admission_status_overview' },
        { label: 'Ops accepted', value: monthStudents.filter((s: any) => s.status === 'active').length, tab: 'enrolled_students', tone: 'text-[#256c1d]' },
        { label: 'Cancelled admissions', value: monthStudents.filter((s: any) => s.status === 'cancelled').length, tab: 'enrolled_students', tone: 'text-red-600' },
      ]} />
      </>)}

      {/* Content rendered by active tab — tabs are in the sidebar */}
      {(() => {
        switch (activeTab) {
          case 'overview': return (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
              <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">Recent enrollments</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Your latest admissions</p>
                  </div>
                  <Button variant="outline" onClick={() => handleNavigate('enrolled_students')} className="h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold">View all</Button>
                </div>
                <div className="p-5 sm:p-6 space-y-2">
                  {loading ? [1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />) :
                    myStudents.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No enrollments yet</p> :
                    myStudents.slice(0, 5).map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{s.name || 'Student'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.program?.name || 'N/A'} · {new Date(s.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-slate-700 shrink-0">{String(s.status || '').replace(/_/g, ' ')}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">My targets</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Progress against what you were assigned</p>
                  </div>
                  <Button variant="outline" onClick={() => handleNavigate('targets')} className="h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold">View all</Button>
                </div>
                <div className="p-5 sm:p-6 space-y-2">
                  {loading ? [1, 2].map(i => <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />) :
                    myTargets.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No targets assigned</p> :
                    myTargets.slice(0, 4).map((t: any) => {
                      const pct = t.target > 0 ? Math.min(100, Math.round((t.achieved / t.target) * 100)) : 0;
                      const remaining = Math.max(0, t.target - t.achieved);
                      return (
                        <div key={t.id} className="rounded-2xl bg-[#f4f6f3] px-4 py-3.5">
                          <div className="flex justify-between items-center gap-3 text-sm mb-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="font-semibold text-slate-900 capitalize">{t.type} · {t.period}</span>
                              {t.incentive > 0 && (
                                <span className="rounded-full bg-[#dff3da] text-[#256c1d] px-2.5 py-0.5 text-xs font-semibold">
                                  Incentive {CS()}{t.incentive.toLocaleString(numLocale())}
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-[#256c1d] tabular-nums">{pct}%</span>
                          </div>
                          <div className="h-2.5 bg-white rounded-full overflow-hidden">
                            <div className="h-full bg-[#54b947] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {t.achieved >= t.target ? (
                              <span className="text-[#256c1d] font-semibold">Target completed</span>
                            ) : t.type === 'revenue' ? (
                              `${CS()}${remaining.toLocaleString(numLocale())} left to achieve`
                            ) : (
                              `${remaining} ${t.type} left`
                            )}
                          </p>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </div>
          );
          case 'my_subdept': return isSubDeptManager ? <SubSalesPortalPanel /> : null;
          
          // Enrollment & Students
          case 'enrolled_students':
          case 'team_enrolled_students':
          case 'student_status':
          case 'student_details_status':
          case 'my_total_admissions': return <StudentsPanel />;

          // Payments
          case 'payments':
          case 'payment':
          case 'payment_status':
          case 'pending_payment': return <PaymentsPanel />;

          // Pipeline & Invites
          case 'invite_links': return <SalesInvitePanel />;
          case 'student_applications':
          case 'pending_admissions':
          case 'admission_pipeline':
          case 'admission_status_overview':
          case 'document_status': return <SalesStudentPipelinePanel />;
          case 'create_student':
          case 'team_student_registration': return <EnrollStudentPanel />;
          case 'provisional_enrollment': return <ProvisionalEnrollmentPanel />;

          // Targets & Performance
          case 'targets':
          case 'target_vs_achievement':
          case 'individual_target':
          case 'achievement':
          case 'admission_count':
          case 'incentive_status': return <TargetsPanel endpoint="/sales/targets" title="My Targets" />;

          // Tasks
          case 'tasks':
          case 'pending_actions':
          case 'lead_pending_actions':
          case 'assign_tasks':
          case 'task_status':
          case 'pending_tasks':
          case 'completed_tasks':
          case 'completed_tasks_counselor': return <TasksPanel />;

          // Leads
          case 'leads':
          case 'lead_management':
          case 'total_leads':
          case 'follow_up_status':
          case 'hot_leads': return <LeadsPanel />;


          // Resources
          case 'course_details':
          case 'course_details_dash':
          case 'course_details_res':
          case 'programs': return <ProgramsPanel />;
          case 'university_details':
          case 'university_details_res':
          case 'universities': return <UniversitiesPanel />;
          case 'fee_structure':
          case 'fee_structure_res': return <FeeStructuresPanel />;
          case 'brochures':
          case 'sales_materials': return <ComingSoonPanel title="Sales Materials" description="Brochures and materials your team can share with students." note="Sales materials aren't available yet. Brochures and shareable files will be listed here once this module launches." />;

          // Requests & Approvals
          case 'team_requests':
          case 'approval_requests': return <EscalationsPanel />;
          case 'admission_approval': return <SalesAdminReviewPanel />;
          case 'support_requests': return <ComplaintsPanel />;

          // Team & Meetings
          case 'my_team':
          case 'team_members':
          case 'todays_performance': return <TeamPerformancePanel />;
          case 'meetings': return <MeetingsPanel />;

          // My Portal
          case 'my_profile': return <MyProfilePanel />;
          case 'my_attendance': return <AttendancePanel isMyPortal />;
          case 'my_leaves': return <LeavesPanel />;
          case 'holidays': return <HolidaysPanel />;
          case 'announcements':
          case 'team_announcements': return <AnnouncementsPanel />;
          case 'notice-board': return <NoticeBoardPanel />;
          case 'team_notes': return <ComingSoonPanel title="Team Notes" description="Shared notes for your sales team." note="Team notes aren't available yet. You'll be able to write and share notes with your team here once this module launches." />;
          case 'important_updates': return <ImportantUpdatesPanel />;

          default: return null;
        }
      })()}
    </div>
  );
}

function StatStrip({ title, items, onNavigate, action, loading }: { title: string; action?: React.ReactNode; loading?: boolean; items: { label: string; value: any; tab: string; tone?: string }[]; onNavigate: (tab: string) => void }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3"><h3 className="text-lg font-semibold tracking-tight">{title}</h3>{action}</div>
      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 divide-x divide-y xl:divide-y-0 divide-slate-100">
          {items.map((k) => (
            <button key={k.label} type="button" onClick={() => onNavigate(k.tab)} className="text-left p-5 sm:p-6 hover:bg-[#f7faf6] transition-colors">
              <p className="text-sm font-medium text-slate-500">{k.label}</p>
              {loading
                ? <div className="mt-3 h-8 w-20 rounded-full bg-slate-100 animate-pulse" aria-label="Loading" />
                : <p className={`text-2xl sm:text-3xl font-semibold tracking-tight mt-2 tabular-nums ${k.tone || 'text-slate-900'}`}>{k.value}</p>}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
