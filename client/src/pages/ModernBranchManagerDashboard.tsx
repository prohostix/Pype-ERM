import { useState, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// Sales panels
import { LeadsPanel } from '@/components/panels/LeadsPanel';
import { TargetsPanel } from '@/components/panels/TargetsPanel';
import { SalesInvitePanel } from '@/components/panels/SalesInvitePanel';
import { TeamPerformancePanel } from '@/components/panels/TeamPerformancePanel';
import { SalesCentersPanel } from '@/components/panels/SalesCentersPanel';

// Ops panels
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { UniversitiesPanel } from '@/components/panels/UniversitiesPanel';
import { ProgramsPanel } from '@/components/panels/ProgramsPanel';
import { StudyCentersPanel } from '@/components/panels/StudyCentersPanel';
import { AdmissionSessionsPanel } from '@/components/panels/AdmissionSessionsPanel';
import { DeptEnrollmentReviewPanel } from '@/components/panels/DeptEnrollmentReviewPanel';

// Shared panels
import { TasksPanel } from '@/components/panels/TasksPanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { PayrollPanel } from '@/components/panels/PayrollPanel';
import { MeetingsPanel } from '@/components/panels/MeetingsPanel';
import { BranchHierarchyPanel } from '@/components/panels/BranchHierarchyPanel';

// Finance panels
import { InvoicesPanel } from '@/components/panels/InvoicesPanel';
import { PaymentsPanel } from '@/components/panels/PaymentsPanel';
import { ExpensesPanel } from '@/components/panels/ExpensesPanel';
import { FinanceEnrollmentsPanel } from '@/components/panels/FinanceEnrollmentsPanel';

export function getBranchManagerNavItems() {
  return [
    { id: '__branch_section', label: 'Branch Overview', isSection: true },
    { id: 'overview', label: 'Overview' },
    { id: 'hierarchy', label: 'Organization Hierarchy' },
    { id: '__sales_section', label: 'Sales', isSection: true },
    { id: 'leads', label: 'Leads' },
    { id: 'targets', label: 'Targets' },
    { id: 'invite_links', label: 'Invite Links' },
    { id: 'my_team', label: 'My Team' },
    { id: 'branch_centers_sales', label: 'Academic Partners (Sales)' },
    { id: '__ops_section', label: 'Operations', isSection: true },
    { id: 'students', label: 'Students' },
    { id: 'universities', label: 'Universities' },
    { id: 'programs', label: 'Programs' },
    { id: 'centers', label: 'Academic Partners' },
    { id: 'enrollment_review', label: 'Enrollment Review' },
    { id: 'sessions', label: 'Admission Sessions' },
    { id: 'attendance', label: 'Team Attendance' },
    { id: 'leaves', label: 'Leave Approvals' },
    { id: '__finance_section', label: 'Finance', isSection: true },
    { id: 'invoices', label: 'Invoices' },
    { id: 'payments', label: 'Payments' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'finance_enrollments', label: 'Finance Enrollments' },
    { id: '__shared_section', label: 'Management', isSection: true },
    { id: 'tasks', label: 'Tasks' },
    { id: 'announcements', label: 'Announcements' },
    { id: '__portal_section', label: 'My Portal', isSection: true },
    { id: 'my_leaves', label: 'My Leaves' },
    { id: 'my_attendance', label: 'My Attendance' },
    { id: 'my_payslips', label: 'Pay Slips' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'notice-board', label: 'Notice Board' },
    { id: 'meetings', label: 'Meetings' },
  ];
}

export function ModernBranchManagerDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  useAuth();
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate(tab);
  };
  const [branch, setBranch] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>({});
  const [leads, setLeads] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setActiveTab(initialTab || 'overview'); }, [initialTab]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [branchRes, metricsRes, leadsRes, targetsRes] = await Promise.all([
          api.get('/org/branches/my').catch(() => ({ data: { data: null } })),
          api.get('/dashboard/metrics').catch(() => ({ data: { data: {} } })),
          api.get('/sales/leads').catch(() => ({ data: { data: [] } })),
          api.get('/sales/targets').catch(() => ({ data: { data: [] } })),
        ]);
        setBranch(branchRes.data.data);
        setMetrics(metricsRes.data.data || {});
        setLeads(leadsRes.data.data || []);
        setTargets(targetsRes.data.data || []);
      } catch (e) {
        console.error('Branch manager fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'meetings': return <MeetingsPanel />;
      case 'hierarchy': return <BranchHierarchyPanel />;
      case 'overview': return <BranchOverview branch={branch} metrics={metrics} leads={leads} targets={targets} loading={loading} onNavigate={handleNavigate} />;
      // Sales
      case 'leads': return <LeadsPanel />;
      case 'targets': return <TargetsPanel endpoint="/sales/targets" title="Branch Targets" />;
      case 'invite_links': return <SalesInvitePanel />;
      // The page URL maps the "My Team" menu item (my_team) to the tab name "team".
      case 'team':
      case 'my_team': return <TeamPerformancePanel />;
      case 'branch_centers_sales': return <SalesCentersPanel />;
      // Ops
      case 'students': return <StudentsPanel />;
      case 'universities': return <UniversitiesPanel />;
      case 'programs': return <ProgramsPanel />;
      case 'centers': return <StudyCentersPanel />;
      case 'enrollment_review': return <DeptEnrollmentReviewPanel />;
      case 'sessions': return <AdmissionSessionsPanel />;
      case 'attendance': return <AttendancePanel />;
      case 'leaves': return <LeavesPanel />;
      // Finance
      case 'invoices': return <InvoicesPanel />;
      case 'payments': return <PaymentsPanel />;
      case 'expenses': return <ExpensesPanel />;
      case 'finance_enrollments': return <FinanceEnrollmentsPanel />;
      // Shared
      case 'tasks': return <TasksPanel />;
      case 'announcements': return <AnnouncementsPanel />;
      // Portal
      case 'my_leaves': return <LeavesPanel isMyPortal />; // her own leaves only
      case 'my_attendance': return <AttendancePanel isMyPortal />;
      case 'my_payslips': return <PayrollPanel />;
      case 'holidays': return <HolidaysPanel />;
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

function BranchOverview({ branch, metrics, leads, targets, loading, onNavigate }: any) {
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l: any) => l.status === 'converted').length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
  const activeTargets = targets.filter((t: any) => (t.achieved || 0) < t.target);
  const v = (n: any) => (loading ? '…' : n);
  const where = branch ? [branch.location, branch.city, branch.state].filter(Boolean).join(', ') : '';

  const team = [
    { title: 'Total headcount', value: v(metrics.totalEmployees || 0), sub: 'Active in branch', tab: 'my_team' },
    { title: 'Present today', value: v(metrics.presentToday || 0), sub: 'Checked in', tab: 'attendance' },
    { title: 'On leave', value: v(metrics.onLeave || 0), sub: 'Approved leave', tab: 'attendance' },
    { title: 'Pending tasks', value: v(metrics.pendingTasks || 0), sub: metrics.overdueTasks ? `${metrics.overdueTasks} overdue` : 'On track', tab: 'tasks', bad: !!metrics.overdueTasks },
  ];
  const sales = [
    { title: 'Total leads', value: v(totalLeads), sub: `${leads.filter((l: any) => l.status === 'new').length} new`, tab: 'leads' },
    { title: 'Conversions', value: v(convertedLeads), sub: `${conversionRate}% rate`, tab: 'leads' },
    { title: 'Active targets', value: v(activeTargets.length), sub: 'In progress', tab: 'targets' },
    { title: 'Students', value: v(metrics.totalStudents || 0), sub: 'Enrolled', tab: 'students' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{branch?.name || 'Branch Overview'}</h2>
          <p className="text-muted-foreground text-sm mt-1.5">{where || 'Team, sales and operations for your branch.'}</p>
        </div>
        {branch && (
          <div className="flex items-center gap-2">
            {branch.code && <span className="rounded-full bg-[#f4f6f3] px-3.5 py-1.5 text-xs font-semibold font-mono text-slate-700">{branch.code}</span>}
            <span className={cn('rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize', branch.status === 'active' ? 'bg-[#dff3da] text-[#256c1d]' : 'bg-slate-100 text-slate-600')}>{branch.status}</span>
          </div>
        )}
      </div>

      <StatStrip title="Team & attendance" items={team} onNavigate={onNavigate} />
      <StatStrip title="Sales & targets" items={sales} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        {/* Sales pipeline */}
        <div className="xl:col-span-2 rounded-3xl bg-white border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Sales pipeline</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Recent leads activity</p>
            </div>
            <Button variant="outline" onClick={() => onNavigate('leads')} className="h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold">View all</Button>
          </div>
          <div className="p-5 sm:p-6 space-y-2">
            {loading ? [1, 2, 3].map((i) => <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />) :
              leads.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No leads yet</p> :
              leads.slice(0, 5).map((l: any) => (
                <div key={l.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{l.name || l.contactName || 'Lead'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{l.source || 'Direct'} · {new Date(l.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-slate-700 shrink-0">{String(l.status || '').replace(/_/g, ' ')}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Operations */}
        <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-semibold tracking-tight">Operations</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Quick access</p>
          </div>
          <div className="p-5 sm:p-6 grid grid-cols-1 gap-2">
            {[
              { label: 'Students', tab: 'students' },
              { label: 'Academic Partners', tab: 'centers' },
              { label: 'Programs', tab: 'programs' },
              { label: 'Universities', tab: 'universities' },
            ].map((item) => (
              <button key={item.tab} type="button" onClick={() => onNavigate(item.tab)}
                className="flex items-center justify-between rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors px-4 py-3.5 text-left">
                <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active targets */}
      {activeTargets.length > 0 && (
        <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight">Active targets</h3>
            <Button variant="outline" onClick={() => onNavigate('targets')} className="h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold">View all</Button>
          </div>
          <div className="p-5 sm:p-6 space-y-2">
            {activeTargets.slice(0, 3).map((t: any) => {
              const pct = t.target > 0 ? Math.min(100, Math.round((t.achieved / t.target) * 100)) : 0;
              const label = typeof t.employeeId === 'object' ? t.employeeId?.name
                : typeof t.departmentId === 'object' ? t.departmentId?.name
                : t.type || 'Target';
              return (
                <div key={t.id} className="rounded-2xl bg-[#f4f6f3] px-4 py-3.5">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-slate-900">{label} <span className="font-normal text-muted-foreground">· {t.period}</span></span>
                    <span className="font-semibold text-[#256c1d] tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-2.5 bg-white rounded-full overflow-hidden">
                    <div className="h-full bg-[#54b947] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatStrip({ title, items, onNavigate }: { title: string; items: { title: string; value: any; sub: string; tab: string; bad?: boolean }[]; onNavigate: (tab: string) => void }) {
  return (
    <section>
      <h3 className="text-lg font-semibold tracking-tight mb-3">{title}</h3>
      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-2 xl:grid-cols-4 divide-x divide-y xl:divide-y-0 divide-slate-100">
          {items.map((k) => (
            <button key={k.title} type="button" onClick={() => onNavigate(k.tab)} className="text-left p-5 sm:p-6 hover:bg-[#f7faf6] transition-colors">
              <p className="text-sm font-medium text-slate-500">{k.title}</p>
              <p className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2 text-slate-900">{k.value}</p>
              <p className={cn('text-xs mt-2', k.bad ? 'text-red-600 font-medium' : 'text-muted-foreground')}>{k.sub}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
