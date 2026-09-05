/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { 
  Target, 
  GraduationCap, 
  Zap, 
  ArrowUpRight,
  BarChart3,
  Clock
} from 'lucide-react';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { TargetsPanel } from '@/components/panels/TargetsPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { SalesInvitePanel } from '@/components/panels/SalesInvitePanel';
import { SalesStudentPipelinePanel } from '@/components/panels/SalesStudentPipelinePanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { SubSalesPortalPanel } from '@/components/panels/SubSalesPortalPanel';
import { TeamPerformancePanel } from '@/components/panels/TeamPerformancePanel';
import { PayrollPanel } from '@/components/panels/PayrollPanel';
import { EnrollStudentPanel } from '@/components/panels/EnrollStudentPanel';
import { EmployeeActivityReportPanel } from '@/components/panels/EmployeeActivityReportPanel';
import { LeadsPanel } from '@/components/panels/LeadsPanel';
import { CEOKPIReportPanel } from '@/components/panels/CEOKPIReportPanel';
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
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

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
      case 'attendance_overview':
      case 'activity_monitoring':
      case 'team_availability':
      case 'daily_activity_report': return <EmployeeActivityReportPanel />;

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
      case 'team_notes':
      case 'important_updates':
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
      case 'brochures': return <NoticeBoardPanel />;

      // Requests & Approvals
      case 'team_requests':
      case 'approval_requests': return <EscalationsPanel />;
      case 'admission_approval': return <SalesStudentPipelinePanel />;
      case 'support_requests': return <ComplaintsPanel />;

      // My Portal
      case 'my_profile': return <MyProfilePanel />;
      case 'my_leaves': return <LeavesPanel />;
      case 'my_attendance': return <AttendancePanel isMyPortal />;
      case 'my_payslips': return <PayrollPanel />;
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
      { id: 'admission_pipeline', label: 'Admission Pipeline' },
      { id: 'student_status', label: 'Student Status' },
      { id: 'payment_status', label: 'Payment Status' },
      { id: 'leads', label: 'Lead Management' },

      { id: '__my_team', label: 'My Team', isSection: true },
      { id: 'team_members', label: 'Team Members' },
      { id: 'attendance_overview', label: 'Attendance Overview' },
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
      { id: 'daily_activity_report', label: 'Daily Activity Report' },

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

      { id: '__portal_section', label: 'My Portal', isSection: true },
      { id: 'my_profile', label: 'My Profile' },
      { id: 'my_attendance', label: 'Attendance' },
      { id: 'my_leaves', label: 'Leave' },
      { id: 'my_payslips', label: 'Payslip' },
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
    { id: 'course_details_dash', label: 'Course Details' },

    { id: '__pipeline', label: 'Student Pipeline', isSection: true },
    { id: 'invite_links', label: 'Generate Student Link' },
    { id: 'admission_status_overview', label: 'Admission Status Overview' },

    { id: '__tasks', label: 'Tasks', isSection: true },
    { id: 'tasks', label: 'My Tasks' },

    { id: '__performance', label: 'My Performance', isSection: true },
    { id: 'targets', label: 'Target' },
    { id: 'incentive_status', label: 'Incentive Status' },

    { id: '__reports', label: 'Reports', isSection: true },
    { id: 'counselor_admission_reports', label: 'Admission Reports' },
    { id: 'performance_reports', label: 'Performance Reports' },

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
    { id: 'my_payslips', label: 'Payslip' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'notice-board', label: 'Notifications' },

    { id: '__admission_flow', label: 'Admission Flow', isSection: true },
    { id: 'lead_management', label: 'Lead Management Flow' },
    { id: 'meetings', label: 'Meetings' },
  ];
}

function OverviewContent({ metrics, students, targets, loading, onNavigate }: any) {
  // Compute live stats
  const totalStudents = students.length;
  const activeStudents = students.filter((s: any) => s.status === 'active').length;
  const pendingStudents = students.filter((s: any) => s.status === 'pending').length;

  // Student Program breakdown from real data
  const programCounts: Record<string, number> = {};
  students.forEach((s: any) => {
    const prog = s.program?.name || 'Unknown Program';
    programCounts[prog] = (programCounts[prog] || 0) + 1;
  });
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--error))'];
  const programData = Object.entries(programCounts).map(([name, value], i) => ({
    name, value, color: COLORS[i % COLORS.length],
  }));

  // Target progress — compute from achieved/target since model has no status/progress fields
  const activeTargets = targets.filter((t: any) => (t.achieved || 0) < t.target);
  const avgProgress = activeTargets.length
    ? Math.round(activeTargets.reduce((s: number, t: any) => {
        const pct = t.target > 0 ? Math.round((t.achieved / t.target) * 100) : 0;
        return s + pct;
      }, 0) / activeTargets.length)
    : 0;

  // Student status bar chart
  const statusData = [
    { label: 'Active', value: activeStudents, color: 'hsl(var(--success))' },
    { label: 'Pending', value: pendingStudents, color: 'hsl(var(--warning))' },
    { label: 'Inactive', value: students.filter((s: any) => s.status === 'inactive').length, color: 'hsl(var(--error))' },
    { label: 'Completed', value: students.filter((s: any) => s.status === 'completed').length, color: 'hsl(var(--info))' },
  ];

  const recentStudents = [...students]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <>
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SalesMetric
          title="Total Students Enrolled"
          value={loading ? '...' : totalStudents}
          trend={`${activeStudents} active`}
          icon={<GraduationCap className="w-5 h-5" />}
          color="primary"
          onClick={() => onNavigate('enrolled_students')}
        />
        <SalesMetric
          title="Pending Verification"
          value={loading ? '...' : pendingStudents}
          trend="Awaiting review"
          icon={<Clock className="w-5 h-5" />}
          color="success"
          onClick={() => onNavigate('enrolled_students')}
        />
        <SalesMetric
          title="Active Targets"
          value={loading ? '...' : activeTargets.length}
          trend={avgProgress > 0 ? `${avgProgress}% avg progress` : 'No targets yet'}
          icon={<Target className="w-5 h-5" />}
          color="warning"
          onClick={() => onNavigate('targets')}
        />
        <SalesMetric
          title="Pending Tasks"
          value={loading ? '...' : (metrics.pendingTasks || 0)}
          trend={metrics.overdueTasks ? `${metrics.overdueTasks} overdue` : 'On track'}
          icon={<Zap className="w-5 h-5" />}
          color="info"
          onClick={() => onNavigate('tasks')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Student Status Chart */}
        <Card
          className="lg:col-span-2 border-none shadow-xl bg-card/60 backdrop-blur-xl cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => onNavigate('enrolled_students')}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Student Status Distribution</CardTitle>
              <CardDescription>Live database breakdown — click to manage students</CardDescription>
            </div>
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-[260px]">
            {students.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={36}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <GraduationCap className="w-10 h-10 opacity-20" />
                <p className="text-sm">No students registered yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Programs */}
        <Card
          className="border-none shadow-xl bg-card/60 backdrop-blur-xl cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => onNavigate('enrolled_students')}
        >
          <CardHeader>
            <CardTitle>Program Distribution</CardTitle>
            <CardDescription>Academic course breakdown</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {programData.length > 0 ? (
              <>
                <div className="h-[160px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={programData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                        {programData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full grid grid-cols-2 gap-2 mt-2">
                  {programData.map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                      <span className="text-xs font-bold ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <GraduationCap className="w-8 h-8 opacity-20" />
                <p className="text-sm">No course data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Students */}
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate('enrolled_students')}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Enrollments</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary font-bold" onClick={e => { e.stopPropagation(); onNavigate('enrolled_students'); }}>
              View All <ArrowUpRight className="ml-1 w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)
            ) : recentStudents.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No active students</p>
              </div>
            ) : (
              recentStudents.map((student: any) => (
                <div key={student.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {(student.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold">{student.name || 'Unknown'}</h5>
                      <p className="text-[10px] text-muted-foreground">{student.program?.name || 'N/A'} · {new Date(student.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold bg-green-50 text-green-700 border-green-200">{student.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Targets + Punch */}
        <div className="space-y-4">
          <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate('targets')}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Active Targets</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary font-bold" onClick={e => { e.stopPropagation(); onNavigate('targets'); }}>
                View All <ArrowUpRight className="ml-1 w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                [1,2].map(i => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)
              ) : activeTargets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active targets</p>
              ) : (
              activeTargets.slice(0, 3).map((t: any) => {
                  const pct = t.target > 0 ? Math.round((t.achieved / t.target) * 100) : 0;
                  const label = typeof t.employeeId === 'object' ? t.employeeId?.name
                    : typeof t.departmentId === 'object' ? t.departmentId?.name
                    : t.type || 'Target';
                  return (
                  <div key={t.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium truncate max-w-[180px]">{label} ({t.period})</span>
                      <span className="font-bold text-primary">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function SalesMetric({ title, value, trend, icon, color, onClick }: any) {
  const colorMap: any = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
  };

  return (
    <Card
      className={cn('group transition-all duration-300 hover:border-primary/50', onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn('p-2.5 rounded-xl transition-transform group-hover:scale-110', colorMap[color])}>
            {icon}
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">{trend}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{title}</p>
          <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sales Employee Portal (sub-dept managers, sales employees) ───────────────
function SalesEmployeePortal({ initialTab, user, onNavigate }: { initialTab?: string; user: any; onNavigate?: (tab: string) => void }) {
  const isSubDeptManager = Boolean(user?.subDepartmentId);
  const [activeTab, setActiveTab] = useState(initialTab || (isSubDeptManager ? 'my_subdept' : 'overview'));
  const [students, setStudents] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  const actualCollection = myStudents.reduce((sum: number, s: any) => {
    let studentSum = 0;
    if (s.enrollments && s.enrollments.length > 0) {
      studentSum = s.enrollments.reduce((eSum: number, e: any) => eSum + Number(e.payment?.amount || e.initialPaymentAmount || 0), 0);
    } else if (s.admissionProgress?.initialPaymentAmount) {
      studentSum = Number(s.admissionProgress.initialPaymentAmount);
    }
    return sum + studentSum;
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{user?.name || 'Sales Dashboard'}</h1>
          <p className="text-muted-foreground mt-1">{user?.designation || (user?.role === 'sales_sub_admin' ? 'Sales Sub Admin' : 'Sales Professional')}</p>
        </div>
      </div>

      {/* Executive Overview Row 1: Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleNavigate('enrolled_students')}><CardContent className="p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">My Admissions</p>
          <p className="text-2xl font-bold mt-1 text-primary">{loading ? '...' : myStudents.length}</p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleNavigate('targets')}><CardContent className="p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">My Target</p>
          <p className="text-2xl font-bold mt-1">
            {loading ? '...' : myTargets.reduce((s: number, t: any) => s + (t.target || 0), 0)}
          </p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleNavigate('targets')}><CardContent className="p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Achievement %</p>
          <p className="text-2xl font-bold mt-1 text-info">
            {loading ? '...' : (myTargets.length > 0
              ? Math.round(myTargets.reduce((s:number, t:any) => s + (t.target > 0 ? (t.achieved/t.target)*100 : 0), 0) / myTargets.length)
              : 0)}%
          </p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleNavigate('enrolled_students')}><CardContent className="p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">My Collection</p>
          <p className="text-2xl font-bold mt-1 text-success">
            {loading ? '...' : `₹${actualCollection.toLocaleString('en-IN')}`}
          </p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleNavigate('targets')}><CardContent className="p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Expected Incentive</p>
          <p className="text-2xl font-bold mt-1 text-warning">
            {loading ? '...' : `₹${myTargets.reduce((s: number, t: any) => s + (t.achieved >= t.target ? (t.incentive || 0) : 0), 0).toLocaleString('en-IN')}`}
          </p>
        </CardContent></Card>
      </div>

      {/* Executive Overview Row 2: Admission Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleNavigate('enrolled_students')}><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-full text-yellow-500"><Clock className="w-4 h-4" /></div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Verification Pending</p>
            <p className="text-xl font-bold">{loading ? '...' : myStudents.filter((s: any) => s.status === 'pending').length}</p>
          </div>
        </CardContent></Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleNavigate('enrolled_students')}><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-full text-orange-500"><Zap className="w-4 h-4" /></div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Payment Pending</p>
            <p className="text-xl font-bold">{loading ? '...' : myStudents.filter((s: any) => s.status === 'payment_pending').length}</p>
          </div>
        </CardContent></Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleNavigate('admission_status_overview')}><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-full text-blue-500"><ArrowUpRight className="w-4 h-4" /></div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Ops Handover Pending</p>
            <p className="text-xl font-bold">{loading ? '...' : myStudents.filter((s: any) => s.status === 'ops_pending').length}</p>
          </div>
        </CardContent></Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleNavigate('enrolled_students')}><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-full text-green-500"><Target className="w-4 h-4" /></div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Ops Accepted</p>
            <p className="text-xl font-bold">{loading ? '...' : myStudents.filter((s: any) => s.status === 'active').length}</p>
          </div>
        </CardContent></Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleNavigate('enrolled_students')}><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-full text-red-500"><BarChart3 className="w-4 h-4" /></div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Cancelled Admissions</p>
            <p className="text-xl font-bold">{loading ? '...' : myStudents.filter((s: any) => s.status === 'cancelled').length}</p>
          </div>
        </CardContent></Card>
      </div>

      {/* Content rendered by active tab — tabs are in the sidebar */}
      {(() => {
        switch (activeTab) {
          case 'overview': return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Recent Enrollments</CardTitle>
                  <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => handleNavigate('enrolled_students')}>
                    View All <ArrowUpRight className="ml-1 w-3 h-3" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {loading ? [1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />) :
                    myStudents.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No enrollments yet</p> :
                    myStudents.slice(0, 4).map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">{s.name || 'Student'}</p>
                          <p className="text-[10px] text-muted-foreground">{s.program?.name || 'N/A'} · {new Date(s.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase bg-green-50 text-green-700 border-green-200">{s.status}</Badge>
                      </div>
                    ))
                  }
                </CardContent>
              </Card>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">My Targets</CardTitle>
                    <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => handleNavigate('targets')}>
                      View All <ArrowUpRight className="ml-1 w-3 h-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {loading ? [1,2].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />) :
                      myTargets.length === 0 ? <p className="text-sm text-muted-foreground text-center py-2">No targets assigned</p> :
                      myTargets.slice(0, 3).map((t: any) => {
                        const pct = t.target > 0 ? Math.min(100, Math.round((t.achieved / t.target) * 100)) : 0;
                        const remaining = Math.max(0, t.target - t.achieved);
                        return (
                          <div key={t.id} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium capitalize">{t.type} · {t.period}</span>
                                {t.incentive > 0 && (
                                  <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full font-bold">
                                    Incentive: ₹{t.incentive.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-primary">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {t.achieved >= t.target ? (
                                <span className="text-emerald-500 font-bold">✓ Target Completed!</span>
                              ) : (
                                <span>
                                  {t.type === 'revenue' ? (
                                    `₹${remaining.toLocaleString('en-IN')} left to achieve`
                                  ) : (
                                    `${remaining} ${t.type} left`
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    }
                  </CardContent>
                </Card>
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

          // Reports
          case 'counselor_admission_reports':
          case 'admission_reports': return <SalesAdmissionReportPanel />;
          case 'performance_reports':
          case 'counselor_reports': return <SalesCounselorReportPanel />;
          case 'team_reports': return <SalesTeamReportPanel />;
          case 'conversion_report': return <SalesConversionReportPanel />;
          case 'daily_activity_report':
          case 'attendance_overview': return <EmployeeActivityReportPanel />;

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
          case 'sales_materials': return <NoticeBoardPanel />;

          // Requests & Approvals
          case 'team_requests':
          case 'approval_requests': return <EscalationsPanel />;
          case 'admission_approval': return <SalesStudentPipelinePanel />;
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
          case 'my_payslips': return <PayrollPanel />;
          case 'holidays': return <HolidaysPanel />;
          case 'announcements':
          case 'team_announcements': return <AnnouncementsPanel />;
          case 'notice-board':
          case 'team_notes':
          case 'important_updates': return <NoticeBoardPanel />;

          default: return null;
        }
      })()}
    </div>
  );
}
