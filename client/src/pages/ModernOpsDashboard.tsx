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
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { OpsProgramAllocationPanel } from '@/components/panels/OpsProgramAllocationPanel';
import { DeptEnrollmentReviewPanel } from '@/components/panels/DeptEnrollmentReviewPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { PlaceholderPanel } from '@/components/panels/PlaceholderPanel';

export function ModernOpsDashboard({ initialTab }: { initialTab?: string }) {
  const [metrics, setMetrics] = useState<any>({});
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');

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
      case 'overview': return <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-3"><OverviewContent metrics={metrics} onNavigate={setActiveTab} /></div></div>;
      
      case 'students': return <StudentsPanel />;
      case 'student_verification': return <PlaceholderPanel title="Student Verification" description="Verify student documents and credentials." />;
      case 'student_portal_management': return <PlaceholderPanel title="Student Portal Management" description="Manage student portal access and settings." />;
      case 'student_documents': return <PlaceholderPanel title="Student Documents" description="Manage and verify all student documents." />;
      case 'student_timeline': return <PlaceholderPanel title="Student Timeline" description="View complete timeline of student activities." />;
      
      case 'new_admissions': return <PlaceholderPanel title="New Admissions" description="Process new student admissions." />;
      case 'admission_review': return <DeptEnrollmentReviewPanel />;
      case 'pending_admissions': return <PlaceholderPanel title="Pending Admissions" description="Review admissions waiting for approval." />;
      case 'admission_verification': return <PlaceholderPanel title="Admission Verification" description="Verify admission details and documents." />;

      case 'universities': return <UniversitiesPanel />;
      case 'university_submission': return <PlaceholderPanel title="University Submission" description="Manage submissions to universities." />;
      case 'enrollment_management': return <PlaceholderPanel title="Enrollment Management" description="Manage university enrollments." />;
      case 'enrollment_number_update': return <PlaceholderPanel title="Enrollment Number Update" description="Update student enrollment numbers." />;
      case 're_registration': return <PlaceholderPanel title="Re-registration" description="Manage student re-registrations." />;
      case 'exam_registration': return <PlaceholderPanel title="Exam Registration" description="Manage student exam registrations." />;

      case 'programs': return <ProgramsPanel />;
      case 'program_allocations': return <OpsProgramAllocationPanel />;
      
      case 'centers': return <StudyCentersPanel />;
      
      case 'document_received': return <PlaceholderPanel title="Document Received" description="Log received documents." />;
      case 'document_dispatch': return <PlaceholderPanel title="Document Dispatch" description="Manage document dispatch." />;
      case 'courier_tracking': return <PlaceholderPanel title="Courier Tracking" description="Track couriered documents." />;
      case 'delivery_confirmation': return <PlaceholderPanel title="Delivery Confirmation" description="Confirm document deliveries." />;

      case 'announcements': return <AnnouncementsPanel />;
      case 'bulk_sms': return <PlaceholderPanel title="Bulk SMS" description="Send bulk SMS to students/staff." />;
      case 'bulk_whatsapp': return <PlaceholderPanel title="Bulk WhatsApp" description="Send bulk WhatsApp messages." />;
      case 'email_notifications': return <PlaceholderPanel title="Email Notifications" description="Manage email notifications." />;

      case 'tasks': return <TasksPanel />;
      case 'pending_tasks': return <PlaceholderPanel title="Pending Tasks" description="View your pending tasks." />;
      case 'completed_tasks': return <PlaceholderPanel title="Completed Tasks" description="View your completed tasks." />;
      case 'follow_up_reminders': return <PlaceholderPanel title="Follow-up Reminders" description="Manage your follow-ups." />;

      case 'student_report': return <PlaceholderPanel title="Student Report" description="Generate student reports." />;
      case 'admission_report': return <PlaceholderPanel title="Admission Report" description="Generate admission reports." />;
      case 'enrollment_report': return <PlaceholderPanel title="Enrollment Report" description="Generate enrollment reports." />;
      case 'university_report': return <PlaceholderPanel title="University Report" description="Generate university reports." />;
      case 're_registration_report': return <PlaceholderPanel title="Re-registration Report" description="Generate re-registration reports." />;

      case 'my_attendance': return <AttendancePanel isMyPortal />;
      case 'my_leaves': return <LeavesPanel />;
      case 'holidays': return <HolidaysPanel />;
      case 'notice-board': return <NoticeBoardPanel />;
      
      default: return <PlaceholderPanel title="Feature Upcoming" />;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {renderContent()}
    </div>
  );
}

export function getOpsNavItems() {
  return [
    { id: '__dashboard', label: 'Dashboard', isSection: true },
    { id: 'overview', label: 'Overview' },
    
    { id: '__students', label: 'Students', isSection: true },
    { id: 'students', label: 'Student List' },
    { id: 'student_portal_management', label: 'Student Portal Management' },
    
    { id: '__admissions', label: 'Admissions', isSection: true },
    { id: 'admission_review', label: 'Admission Review' },
    
    { id: '__universities', label: 'Universities', isSection: true },
    { id: 'universities', label: 'University List' },
    { id: 'university_submission', label: 'University Submission' },
    { id: 'enrollment_number_update', label: 'Enrollment Number Update' },
    { id: 're_registration', label: 'Re-registration' },
    { id: 'exam_registration', label: 'Exam Registration' },
    
    { id: '__programs', label: 'Programs', isSection: true },
    { id: 'programs', label: 'Programs' },
    { id: 'program_allocations', label: 'Program Allocation' },
    
    { id: '__study_centers', label: 'Study Centers', isSection: true },
    { id: 'centers', label: 'Study Centers' },
    
    { id: '__document_management', label: 'Document Management', isSection: true },
    { id: 'document_received', label: 'Document Received' },
    { id: 'document_dispatch', label: 'Document Dispatch' },
    { id: 'courier_tracking', label: 'Courier Tracking' },
    { id: 'delivery_confirmation', label: 'Delivery Confirmation' },
    
    { id: '__communication', label: 'Communication', isSection: true },
    { id: 'announcements', label: 'Announcements' },
    { id: 'bulk_sms', label: 'Bulk SMS' },
    { id: 'bulk_whatsapp', label: 'Bulk WhatsApp' },
    { id: 'email_notifications', label: 'Email Notifications' },
    
    { id: '__tasks', label: 'Tasks', isSection: true },
    { id: 'tasks', label: 'My Tasks' },
    
    { id: '__reports', label: 'Reports', isSection: true },
    { id: 'student_report', label: 'Student Report' },
    { id: 'admission_report', label: 'Admission Report' },
    { id: 'enrollment_report', label: 'Enrollment Report' },
    { id: 'university_report', label: 'University Report' },
    { id: 're_registration_report', label: 'Re-registration Report' },
    
    { id: '__portal_section', label: 'My Portal', isSection: true },
    { id: 'my_attendance', label: 'Attendance' },
    { id: 'my_leaves', label: 'Leave Request' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'notice-board', label: 'Notice Board' },
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
      </div>

      {/* Top Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <select className="h-9 px-3 py-1 bg-background border border-input rounded-md text-sm">
          <option>Branch</option>
          <option>Main Campus</option>
        </select>
        <select className="h-9 px-3 py-1 bg-background border border-input rounded-md text-sm">
          <option>University</option>
        </select>
        <select className="h-9 px-3 py-1 bg-background border border-input rounded-md text-sm">
          <option>Batch</option>
          <option>2026</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search Student..." className="h-9 pl-9 w-full bg-background" />
        </div>
      </div>

      {/* Operations Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
