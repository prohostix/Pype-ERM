import { ComingSoonPanel } from '@/components/panels/ComingSoonPanel';
import { useState, useEffect } from 'react';
import { RefreshCw, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { TeamPerformancePanel } from '@/components/panels/TeamPerformancePanel';
import { SubOpsPortalPanel } from '@/components/panels/SubOpsPortalPanel';
import { SubSalesPortalPanel } from '@/components/panels/SubSalesPortalPanel';
import { EmployeeEscalationsPanel } from '@/components/panels/EmployeeEscalationsPanel';
import { CollectionsPanel } from '@/components/panels/CollectionsPanel';
import { MeetingsPanel } from '@/components/panels/MeetingsPanel';

export function ModernEmployeeDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const { user } = useAuth();
  const isSubDeptManager = Boolean((user as any)?.subDepartmentId);
  // Determine sub-dept type from populated subDepartmentId object
  const subDeptObj = typeof (user as any)?.subDepartmentId === 'object' ? (user as any).subDepartmentId : null;
  const parentDeptType = subDeptObj?.parentDeptId?.type || null;
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>({});
  const [tasks, setTasks] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>({});
  const [activeTab, setActiveTab] = useState(initialTab || (isSubDeptManager ? 'my_subdept' : 'overview'));
  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  const [isCollectionsOverseer, setIsCollectionsOverseer] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab || (typeof isSubDeptManager !== 'undefined' && isSubDeptManager ? 'my_subdept' : 'overview'));
  }, [initialTab]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Check collections permission
      const isSales = ['sales_admin', 'sales_sub_admin'].includes(user?.role || '');
      if (!isSales) {
        api.get('/collections/metrics')
          .then(res => {
            if (res.data.success && res.data.data?.currentUserOversight?.isOverseer) {
              setIsCollectionsOverseer(true);
            }
          })
          .catch(() => {});
      }

      const [metricsRes, tasksRes, leavesRes, attendanceRes] = await Promise.all([
        api.get('/dashboard/metrics'),
        api.get('/tasks').catch(() => ({ data: { data: [] } })),
        api.get('/hr/leaves/my').catch(() => ({ data: { data: [] } })),
        api.get('/hr/attendance/my-summary').catch(() => ({ data: { data: {} } })),
      ]);
      setMetrics(metricsRes.data.data || {});
      setTasks((tasksRes.data.data || []).filter((t: any) => t.status !== 'completed').slice(0, 5));
      setLeaves(leavesRes.data.data || []);
      setAttendance(attendanceRes.data.data || {});
    } catch (e) {
      console.error('Employee metrics fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Compute leave balance
  const approvedLeaves = leaves.filter((l: any) => l.status === 'approved');
  const usedDays = approvedLeaves.reduce((s: number, l: any) => {
    if (!l.startDate || !l.endDate) return s;
    const diff = Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1;
    return s + diff;
  }, 0);
  const totalLeaveAllowance = 21; // standard annual
  const remainingLeaves = Math.max(0, totalLeaveAllowance - usedDays);

  // Work hours this week from attendance
  const weekHours = attendance.weekHours ?? null;

  // Pending tasks count
  const pendingTaskCount = tasks.length;
  const dueSoonCount = tasks.filter((t: any) => {
    if (!t.deadline) return false;
    const diff = new Date(t.deadline).getTime() - Date.now();
    return diff > 0 && diff < 7 * 86400000;
  }).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {activeTab === 'overview' && (
      <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Welcome back, {user?.name?.split(' ')[0] || 'there'}</h2>
            <p className="text-muted-foreground text-sm mt-1.5">
              {pendingTaskCount > 0 ? `You have ${pendingTaskCount} task${pendingTaskCount > 1 ? 's' : ''} pending.` : 'All caught up for today.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchAll} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
            </Button>
            <Button variant="outline" onClick={() => handleNavigate('notice-board')} className="h-11 px-5 rounded-full bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold">Notices</Button>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleNavigate} className="space-y-6">
        <div className="hidden">
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            <TabsList className="flex w-max space-x-1.5 bg-transparent p-1 h-auto">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none rounded-full px-5 h-10 transition-colors text-sm font-semibold text-slate-600 hover:bg-[#f4f6f3]">Overview</TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none rounded-full px-5 h-10 transition-colors text-sm font-semibold text-slate-600 hover:bg-[#f4f6f3]">My Tasks</TabsTrigger>
          <TabsTrigger value="leaves" className="data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none rounded-full px-5 h-10 transition-colors text-sm font-semibold text-slate-600 hover:bg-[#f4f6f3]">My Leaves</TabsTrigger>
          <TabsTrigger value="attendance" className="data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none rounded-full px-5 h-10 transition-colors text-sm font-semibold text-slate-600 hover:bg-[#f4f6f3]">Attendance</TabsTrigger>
          <TabsTrigger value="notice-board" className="data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none rounded-full px-5 h-10 transition-colors text-sm font-semibold text-slate-600 hover:bg-[#f4f6f3]">Notice Board</TabsTrigger>
          <TabsTrigger value="announcements" className="data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none rounded-full px-5 h-10 transition-colors text-sm font-semibold text-slate-600 hover:bg-[#f4f6f3]">Announcements</TabsTrigger>
          <TabsTrigger value="holidays" className="data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none rounded-full px-5 h-10 transition-colors text-sm font-semibold text-slate-600 hover:bg-[#f4f6f3]">Holiday List</TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none rounded-full px-5 h-10 transition-colors text-sm font-semibold text-slate-600 hover:bg-[#f4f6f3]">My Team</TabsTrigger>
          {isSubDeptManager && <TabsTrigger value="my_subdept" className="data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none rounded-full px-5 h-10 transition-colors text-sm font-semibold text-slate-600 hover:bg-[#f4f6f3]">My Sub-Dept</TabsTrigger>}
          <TabsTrigger value="ld-portal" className="data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none rounded-full px-5 h-10 transition-colors text-sm font-semibold text-slate-600 hover:bg-[#f4f6f3]">L&amp;D Portal</TabsTrigger>
          <TabsTrigger value="escalations" className="data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none rounded-full px-5 h-10 transition-colors text-sm font-semibold text-slate-600 hover:bg-[#f4f6f3]">Escalations</TabsTrigger>
          {isCollectionsOverseer && <TabsTrigger value="collections" className="data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none rounded-full px-5 h-10 transition-colors text-sm font-semibold text-slate-600 hover:bg-[#f4f6f3]">Collections</TabsTrigger>}
          <TabsTrigger value="meetings" className="data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none rounded-full px-5 h-10 transition-colors text-sm font-semibold text-slate-600 hover:bg-[#f4f6f3]">Meetings</TabsTrigger>
        </TabsList>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* Stat strip */}
          <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-2 xl:grid-cols-4 divide-x divide-y xl:divide-y-0 divide-slate-100">
              {[
                { title: 'Assigned tasks', value: loading ? '…' : pendingTaskCount, sub: dueSoonCount > 0 ? `${dueSoonCount} due this week` : 'No urgent deadlines', tab: 'tasks', warn: dueSoonCount > 0 },
                { title: 'Efficiency score', value: metrics.efficiencyScore ? `${metrics.efficiencyScore}%` : 'N/A', sub: 'Based on task completion', tab: 'tasks' },
                { title: 'Leaves remaining', value: loading ? '…' : `${remainingLeaves} days`, sub: `${usedDays} used of ${totalLeaveAllowance}`, tab: 'leaves' },
                { title: 'Work hours', value: loading ? '…' : (weekHours != null ? `${weekHours}h` : 'N/A'), sub: 'Current week', tab: 'attendance' },
              ].map((k) => (
                <button key={k.title} type="button" onClick={() => handleNavigate(k.tab)} className="text-left p-5 sm:p-6 hover:bg-[#f7faf6] transition-colors">
                  <p className="text-sm font-medium text-slate-500">{k.title}</p>
                  <p className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2 text-slate-900">{k.value}</p>
                  <p className={cn('text-xs mt-2', k.warn ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>{k.sub}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
            {/* Priority tasks */}
            <div className="xl:col-span-2 rounded-3xl bg-white border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">Priority tasks</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Your pending assignments</p>
                </div>
                <Button variant="outline" onClick={() => handleNavigate('tasks')} className="h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold">View board</Button>
              </div>
              <div className="p-5 sm:p-6 space-y-2">
                {loading ? (
                  [1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />)
                ) : tasks.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">No pending tasks</p>
                ) : (
                  tasks.map((task: any) => (
                    <TaskItem
                      key={task.id}
                      title={task.title}
                      priority={task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low'}
                      due={task.deadline ? new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No deadline'}
                      progress={task.progress || 0}
                      onClick={() => handleNavigate('tasks')}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Performance tier */}
              <div className="rounded-3xl bg-white border border-slate-100 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Performance tier</p>
                    <p className="text-2xl font-semibold tracking-tight mt-1">Gold</p>
                  </div>
                  <span className="rounded-full bg-[#dff3da] text-[#256c1d] px-3 py-1 text-xs font-semibold">Keep up the great work!</span>
                </div>
                <div className="mt-5">
                  <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                    <span>Current progress</span>
                    <span className="tabular-nums text-slate-900">{pendingTaskCount > 0 ? `${Math.max(0, 10 - pendingTaskCount) * 100} / 1000 XP` : '1000 / 1000 XP'}</span>
                  </div>
                  <div className="h-2.5 w-full bg-[#f4f6f3] rounded-full overflow-hidden">
                    <div className="h-full bg-[#54b947] rounded-full transition-all" style={{ width: `${Math.max(10, 100 - pendingTaskCount * 10)}%` }} />
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                  <h3 className="text-lg font-semibold tracking-tight">Quick actions</h3>
                </div>
                <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
                  {[
                    { label: 'Apply for Leave', tab: 'leaves' },
                    { label: 'View Attendance', tab: 'attendance' },
                    { label: 'Notice Board', tab: 'notice-board' },
                    { label: 'Announcements', tab: 'announcements' },
                    { label: 'My Team', tab: 'team' },
                    { label: 'Raise Escalation', tab: 'escalations' },
                    { label: 'Pay Slips', tab: 'payslips' },
                    { label: 'Holiday List', tab: 'holidays' },
                    { label: 'L&D Portal', tab: 'ld-portal' },
                  ].map(item => (
                    <button
                      key={item.tab}
                      type="button"
                      className="w-full text-left text-sm px-4 py-3 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors flex items-center justify-between"
                      onClick={() => handleNavigate(item.tab)}
                    >
                      <span className="font-semibold text-slate-900">{item.label}</span>
                      <ArrowUpRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <TasksPanel />
        </TabsContent>

        <TabsContent value="leaves">
          <LeavesPanel />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendancePanel isMyPortal />
        </TabsContent>

        <TabsContent value="notice-board">
          <NoticeBoardPanel />
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementsPanel />
        </TabsContent>

        <TabsContent value="holidays">
          <HolidaysPanel />
        </TabsContent>

        <TabsContent value="team">
          <TeamPerformancePanel />
        </TabsContent>

        {isSubDeptManager && (
          <TabsContent value="my_subdept">
            {parentDeptType === 'sales' ? <SubSalesPortalPanel /> : <SubOpsPortalPanel />}
          </TabsContent>
        )}

        <TabsContent value="payslips">
          <ComingSoonPanel title="Pay Slips" description="Your monthly salary statements." note="Pay slips will appear here once payroll is processed. Contact HR or Finance for your salary details." />
        </TabsContent>

        <TabsContent value="ld-portal" className="space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Learning &amp; Development</h2>
            <p className="text-muted-foreground text-sm mt-1.5">Courses, certifications and growth resources</p>
          </div>
          <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
            <div className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { title: 'Onboarding Essentials', category: 'Mandatory', status: 'Completed', pill: 'bg-[#dff3da] text-[#256c1d]' },
                  { title: 'Communication Skills', category: 'Soft Skills', status: 'In Progress', pill: 'bg-amber-100 text-amber-700' },
                  { title: 'Data Privacy & Compliance', category: 'Compliance', status: 'Not Started', pill: 'bg-slate-100 text-slate-600' },
                ].map((course) => (
                  <div key={course.title} className="rounded-2xl bg-[#f4f6f3] p-5">
                    <p className="text-xs font-medium text-slate-500">{course.category}</p>
                    <h4 className="font-semibold text-slate-900 mt-1">{course.title}</h4>
                    <span className={cn('inline-block rounded-full px-3 py-0.5 text-xs font-semibold mt-3', course.pill)}>{course.status}</span>
                  </div>
                ))}
              </div>
              <p className="pt-4 border-t border-slate-100 text-center text-sm text-muted-foreground">More courses will be assigned by HR. Check back regularly.</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="escalations">
          <EmployeeEscalationsPanel />
        </TabsContent>

        <TabsContent value="collections">
          <CollectionsPanel />
        </TabsContent>
              <TabsContent value="meetings">
          <MeetingsPanel />
        </TabsContent>
</Tabs>
    </div>
  );
}

function TaskItem({ title, priority, due, progress, onClick }: any) {
  const pill: any = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-amber-100 text-amber-700',
    Low: 'bg-[#dff3da] text-[#256c1d]',
  };

  return (
    <button type="button" className="w-full text-left rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors px-4 py-3.5" onClick={onClick}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h5 className="text-sm font-semibold text-slate-900 line-clamp-1">{title}</h5>
        <span className={cn('rounded-full px-3 py-0.5 text-xs font-semibold shrink-0', pill[priority])}>{priority}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="h-2 flex-1 bg-white rounded-full overflow-hidden">
          <div className="h-full bg-[#54b947] rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">{due}</span>
      </div>
    </button>
  );
}
