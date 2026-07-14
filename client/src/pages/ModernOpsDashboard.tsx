import { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Search,
  FileText,
  PlusCircle,
  Hash,
  AlertTriangle,
  RefreshCw,
  CheckSquare
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { UniversitiesPanel } from '@/components/panels/UniversitiesPanel';
import { ProgramsPanel } from '@/components/panels/ProgramsPanel';
import { StudyCentersPanel } from '@/components/panels/StudyCentersPanel';
import { AdmissionSessionsPanel } from '@/components/panels/AdmissionSessionsPanel';
import { InternalMarksPanel } from '@/components/panels/InternalMarksPanel';
import { CollectionsPanel } from '@/components/panels/CollectionsPanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { OpsProgramAllocationPanel } from '@/components/panels/OpsProgramAllocationPanel';
import { DeptEnrollmentReviewPanel } from '@/components/panels/DeptEnrollmentReviewPanel';
import { PunchWidget } from '@/components/attendance/PunchWidget';
import { SubOpsPortalPanel } from '@/components/panels/SubOpsPortalPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { PollsPanel } from '@/components/panels/PollsPanel';
import { PayrollPanel } from '@/components/panels/PayrollPanel';
import { useAuth } from '@/hooks/useAuth';

export function ModernOpsDashboard({ initialTab }: { initialTab?: string }) {
  const { user } = useAuth();
  const isSubDeptManager = Boolean((user as any)?.subDepartmentId);
  const [metrics, setMetrics] = useState<any>({});
  const [activeTab, setActiveTab] = useState(initialTab || (isSubDeptManager ? 'my_subdept' : 'overview'));

  const fetchOpsMetrics = async () => {
    try {
      const response = await api.get('/dashboard/metrics');
      setMetrics(response.data.data || {});
    } catch (error) {
      console.error('Failed to fetch ops metrics:', error);
    }
  };

  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
  useEffect(() => { fetchOpsMetrics(); }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-3"><OverviewContent metrics={metrics} onNavigate={setActiveTab} /></div>
        </div>
      );
      case 'my_subdept': return <SubOpsPortalPanel />;
      case 'students': return <StudentsPanel />;
      case 'collections': return <CollectionsPanel />;
      case 'universities': return <UniversitiesPanel />;
      case 'programs': return <ProgramsPanel />;
      case 'centers': return <StudyCentersPanel />;
      case 'program_allocations': return <OpsProgramAllocationPanel />;
      case 'enrollment_review': return <DeptEnrollmentReviewPanel />;
      case 'sessions': return <AdmissionSessionsPanel />;
      case 'marks': return <InternalMarksPanel />;
      case 'announcements': return <AnnouncementsPanel />;
      case 'tasks': return <TasksPanel />;
      case 'my_leaves': return <LeavesPanel />;
      case 'my_attendance': return <AttendancePanel isMyPortal />;
      case 'my_payslips': return <PayrollPanel />;
      case 'holidays': return <HolidaysPanel />;
      case 'notice-board': return <NoticeBoardPanel />;
      case 'polls': return <PollsPanel />;
      default: return null;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {renderContent()}
    </div>
  );
}

export function getOpsNavItems(isSubDeptManager: boolean) {
  return [
    { id: '__ops_section', label: 'Operations', isSection: true },
    { id: 'overview', label: 'Overview' },
    ...(isSubDeptManager ? [{ id: 'my_subdept', label: 'My Sub-Dept' }] : []),
    { id: 'students', label: 'Students' },
    { id: 'collections', label: 'Collections' },
    { id: 'universities', label: 'Universities' },
    { id: 'programs', label: 'Programs' },
    { id: 'centers', label: 'Study Centers' },
    { id: 'program_allocations', label: 'Program Allocations' },
    { id: 'enrollment_review', label: 'Enrollment Review' },
    { id: 'sessions', label: 'Admission Sessions' },
    { id: 'marks', label: 'Internal Marks' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'tasks', label: 'Tasks' },
    { id: '__portal_section', label: 'My Portal', isSection: true },
    { id: 'my_leaves', label: 'My Leaves' },
    { id: 'my_attendance', label: 'Attendance' },
    { id: 'my_payslips', label: 'Pay Slips' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'notice-board', label: 'Notice Board' },
    { id: 'polls', label: 'Polls' },
  ];
}

function OverviewContent({ metrics, onNavigate }: { metrics: any; onNavigate: (tab: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
        <div>
          <h2 className="text-xl font-bold">Operations Overview</h2>
          <p className="text-sm text-muted-foreground">Monitor and manage daily operations</p>
        </div>
        <PunchWidget />
      </div>

      {/* Top Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <select className="h-9 px-3 py-1 bg-background border border-input rounded-md text-sm">
          <option>All Branches</option>
          <option>Main Campus</option>
        </select>
        <select className="h-9 px-3 py-1 bg-background border border-input rounded-md text-sm">
          <option>All Universities</option>
        </select>
        <select className="h-9 px-3 py-1 bg-background border border-input rounded-md text-sm">
          <option>All Batches</option>
          <option>2026</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search Student..." className="h-9 pl-9 w-full bg-background" />
        </div>
      </div>

      {/* Operations Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <OpsMetricCard 
          title="Total Active Students" 
          value={metrics.totalStudents || 0} 
          icon={<Users className="w-5 h-5 text-primary" />}
          bgColor="bg-primary/10"
          onClick={() => onNavigate('students')}
        />
        <OpsMetricCard 
          title="New Admissions Received" 
          value={metrics.pendingApplications || 0} 
          icon={<PlusCircle className="w-5 h-5 text-success" />}
          bgColor="bg-success/10"
          onClick={() => onNavigate('students')}
        />
        <OpsMetricCard 
          title="Uni Submission Pending" 
          value={metrics.uniSubmissionsPending || 0} 
          icon={<Building2 className="w-5 h-5 text-warning" />}
          bgColor="bg-warning/10"
          onClick={() => onNavigate('students')}
        />
        <OpsMetricCard 
          title="Enrollment No Pending" 
          value={metrics.enrollmentNumbersPending || 0} 
          icon={<Hash className="w-5 h-5 text-indigo-500" />}
          bgColor="bg-indigo-500/10"
          onClick={() => onNavigate('students')}
        />
        <OpsMetricCard 
          title="Documents Pending" 
          value={metrics.documentsPending || 0} 
          icon={<FileText className="w-5 h-5 text-rose-500" />}
          bgColor="bg-rose-500/10"
          onClick={() => onNavigate('students')}
        />
        <OpsMetricCard 
          title="Re-registration Pending" 
          value={metrics.reRegistrationPending || 0} 
          icon={<RefreshCw className="w-5 h-5 text-amber-600" />}
          bgColor="bg-amber-600/10"
          onClick={() => onNavigate('students')}
        />
        <OpsMetricCard 
          title="Admission Closing Alerts" 
          value={metrics.admissionAlerts || 0} 
          icon={<AlertTriangle className="w-5 h-5 text-destructive" />}
          bgColor="bg-destructive/10"
          onClick={() => onNavigate('sessions')}
        />
        <OpsMetricCard 
          title="Today's Tasks" 
          value={metrics.todaysTasks || 0} 
          icon={<CheckSquare className="w-5 h-5 text-emerald-600" />}
          bgColor="bg-emerald-600/10"
          onClick={() => onNavigate('tasks')}
        />
      </div>
    </div>
  );
}

function OpsMetricCard({ title, value, icon, bgColor, onClick }: any) {
  return (
    <Card className="group hover:border-primary/50 transition-all duration-300 cursor-pointer" onClick={onClick}>
      <CardContent className="p-5 flex flex-col items-center justify-center text-center space-y-3">
        <div className={cn("p-3 rounded-full transition-all duration-300", bgColor)}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</p>
          <p className="text-xs font-medium text-muted-foreground mt-1 leading-tight">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
