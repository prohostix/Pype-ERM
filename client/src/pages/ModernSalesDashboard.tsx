import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Target, 
  GraduationCap, 
  Zap, 
  ArrowUpRight,
  BarChart3,
  Users
} from 'lucide-react';
import { SalesEnrolledStudentsPanel } from '@/components/panels/SalesEnrolledStudentsPanel';
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
import { PunchWidget } from '@/components/attendance/PunchWidget';
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

export function ModernSalesDashboard({ initialTab, isSubDeptManager }: { initialTab?: string; isSubDeptManager?: boolean }) {
  const { user } = useAuth();
  const isSalesAdmin = user?.role === 'sales_admin' || user?.role === 'bde' || isSubDeptManager;

  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>({});
  const [students, setStudents] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');

  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [metricsRes, studentsRes, targetsRes] = await Promise.all([
        api.get('/dashboard/metrics'),
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

  // Sub-dept manager (employee in sales dept) — scoped personal view
  if (!isSalesAdmin) {
    return <SalesEmployeePortal initialTab={initialTab} user={user} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return (
        <OverviewContent metrics={metrics} students={students} targets={targets} loading={loading} onNavigate={setActiveTab} />
      );
      case 'enrolled_students': return <SalesEnrolledStudentsPanel />;
      case 'targets': return <TargetsPanel endpoint="/sales/targets" title="Sales Targets" />;
      case 'invite_links': return <SalesInvitePanel />;
      case 'student_applications': return <SalesStudentPipelinePanel />;
      case 'my_team': return <TeamPerformancePanel />;
      case 'tasks': return <TasksPanel />;
      case 'my_leaves': return <LeavesPanel />;
      case 'my_attendance': return <AttendancePanel />;
      case 'my_payslips': return <PayrollPanel />;
      case 'holidays': return <HolidaysPanel />;
      case 'announcements': return <AnnouncementsPanel />;
      case 'notice-board': return <NoticeBoardPanel />;
      default: return null;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {renderContent()}
    </div>
  );
}

export function getSalesNavItems() {
  return [
    { id: '__sales_section', label: 'Sales Management', isSection: true },
    { id: 'overview', label: 'Overview' },
    { id: 'enrolled_students', label: 'Total Student Enrolled' },
    { id: 'targets', label: 'Targets' },
    { id: 'invite_links', label: 'Invite Links' },
    { id: 'student_applications', label: 'Student Pipeline' },
    { id: 'my_team', label: 'My Team' },
    { id: 'tasks', label: 'Tasks' },
    { id: '__portal_section', label: 'My Portal', isSection: true },
    { id: 'my_leaves', label: 'My Leaves' },
    { id: 'my_attendance', label: 'Attendance' },
    { id: 'my_payslips', label: 'Pay Slips' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'notice-board', label: 'Notice Board' },
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <PunchWidget />
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
function SalesEmployeePortal({ initialTab, user }: { initialTab?: string; user: any }) {
  const isSubDeptManager = Boolean(user?.subDepartmentId);
  const [activeTab, setActiveTab] = useState(initialTab || (isSubDeptManager ? 'my_subdept' : 'overview'));
  const [students, setStudents] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

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
    const refId = typeof s.referredBy === 'object' ? s.referredBy?.id : s.referredBy;
    return refId?.toString() === (user?.id || user?.id)?.toString();
  });

  const myTargets = targets.filter((t: any) => {
    const empId = typeof t.employeeId === 'object' ? t.employeeId?.id : t.employeeId;
    return empId?.toString() === (user?.id || user?.id)?.toString();
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales Portal</h1>
          <p className="text-muted-foreground mt-1">{subDeptName} — {user?.designation || 'Sales Manager'}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground uppercase font-medium">My Enrolled Students</p>
          <p className="text-3xl font-bold mt-1">{loading ? '...' : myStudents.length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {myStudents.filter((s: any) => s.status === 'active').length} active
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground uppercase font-medium">Pending Verification</p>
          <p className="text-3xl font-bold mt-1 text-warning">
            {loading ? '...' : myStudents.filter((s: any) => s.status === 'pending').length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Awaiting operations</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground uppercase font-medium">My Targets</p>
          <p className="text-3xl font-bold mt-1">{loading ? '...' : myTargets.length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{myTargets.filter((t:any) => (t.achieved||0) < t.target).length} active</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground uppercase font-medium">Avg Progress</p>
          <p className="text-3xl font-bold mt-1 text-primary">
            {loading ? '...' : (myTargets.length > 0
              ? Math.round(myTargets.reduce((s:number, t:any) => s + (t.target > 0 ? (t.achieved/t.target)*100 : 0), 0) / myTargets.length)
              : 0)}%
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">across all targets</p>
        </CardContent></Card>
      </div>

      {/* Content rendered by active tab — tabs are in the sidebar */}
      {(() => {
        switch (activeTab) {
          case 'overview': return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Recent Enrollments</CardTitle>
                  <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => setActiveTab('enrolled_students')}>
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
                    <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => setActiveTab('targets')}>
                      View All <ArrowUpRight className="ml-1 w-3 h-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {loading ? [1,2].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />) :
                      myTargets.length === 0 ? <p className="text-sm text-muted-foreground text-center py-2">No targets assigned</p> :
                      myTargets.slice(0, 3).map((t: any) => {
                        const pct = t.target > 0 ? Math.min(100, Math.round((t.achieved / t.target) * 100)) : 0;
                        return (
                          <div key={t.id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium">{t.type} · {t.period}</span>
                              <span className="font-bold text-primary">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    }
                  </CardContent>
                </Card>
                <PunchWidget />
              </div>
            </div>
          );
          case 'my_subdept': return isSubDeptManager ? <SubSalesPortalPanel /> : null;
          case 'enrolled_students': return <SalesEnrolledStudentsPanel />;
          case 'targets': return <TargetsPanel endpoint="/sales/targets" title="My Targets" />;
          case 'invite_links': return <SalesInvitePanel />;
          case 'student_applications': return <SalesStudentPipelinePanel />;
          case 'my_team': return <TeamPerformancePanel />;
          case 'my_attendance': return <AttendancePanel />;
          case 'my_leaves': return <LeavesPanel />;
          case 'my_payslips': return <PayrollPanel />;
          case 'tasks': return <TasksPanel />;
          case 'announcements': return <AnnouncementsPanel />;
          case 'notice-board': return <NoticeBoardPanel />;
          case 'holidays': return <HolidaysPanel />;
          case 'ld-portal': return (
            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Learning &amp; Development Portal</CardTitle>
                <CardDescription>Courses, certifications and growth resources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <p className="font-medium">Courses will be assigned by HR. Check back regularly.</p>
                </div>
              </CardContent>
            </Card>
          );
          default: return null;
        }
      })()}
    </div>
  );
}
