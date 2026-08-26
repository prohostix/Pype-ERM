/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  FileText,
  PlusCircle,
  Hash,
  AlertTriangle,
  RefreshCw,
  CheckSquare
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { UniversitiesPanel } from '@/components/panels/UniversitiesPanel';
import { ProgramsPanel } from '@/components/panels/ProgramsPanel';
import { StudyCentersPanel } from '@/components/panels/StudyCentersPanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { OpsProgramAllocationPanel } from '@/components/panels/OpsProgramAllocationPanel';
import TeamPermissionsPanel from '@/components/panels/TeamPermissionsPanel';
import { DeptEnrollmentReviewPanel } from '@/components/panels/DeptEnrollmentReviewPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { PlaceholderPanel } from '@/components/panels/PlaceholderPanel';
import { StudentPortalManagementPanel } from '@/components/panels/StudentPortalManagementPanel';
import { EnrollmentNumberUpdatePanel } from '@/components/panels/EnrollmentNumberUpdatePanel';
import { UniversitySubmissionPanel } from '@/components/panels/UniversitySubmissionPanel';
import { ReRegistrationPanel } from '@/components/panels/ReRegistrationPanel';
import { ExamRegistrationPanel } from '@/components/panels/ExamRegistrationPanel';
import { DocumentReceivedPanel } from '@/components/panels/DocumentReceivedPanel';
import { DocumentDispatchPanel } from '@/components/panels/DocumentDispatchPanel';
import { CourierTrackingPanel } from '@/components/panels/CourierTrackingPanel';
import { DeliveryConfirmationPanel } from '@/components/panels/DeliveryConfirmationPanel';
import { BulkSmsPanel } from '@/components/panels/BulkSmsPanel';
import { BulkWhatsAppPanel } from '@/components/panels/BulkWhatsAppPanel';
import { EmailNotificationsPanel } from '@/components/panels/EmailNotificationsPanel';
import { StudentReportPanel } from '@/components/panels/StudentReportPanel';
import { AdmissionReportPanel } from '@/components/panels/AdmissionReportPanel';
import { EnrollmentReportPanel } from '@/components/panels/EnrollmentReportPanel';
import { UniversityReportPanel } from '@/components/panels/UniversityReportPanel';
import { ReRegistrationReportPanel } from '@/components/panels/ReRegistrationReportPanel';
import { MeetingsPanel } from '@/components/panels/MeetingsPanel';

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

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { fetchOpsMetrics(); }, []);

  useEffect(() => { setActiveTab(initialTab || 'overview'); }, [initialTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'meetings': return <MeetingsPanel />;
      case 'team_permissions': return <TeamPermissionsPanel />;
      case 'overview': return <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-3"><OverviewContent metrics={metrics} onNavigate={setActiveTab} /></div></div>;
      
      case 'students': return <StudentsPanel />;
      case 'student_portal_management': return <StudentPortalManagementPanel />;
      
      case 'admission_review': return <DeptEnrollmentReviewPanel />;

      case 'universities': return <UniversitiesPanel />;
      case 'university_submission': return <UniversitySubmissionPanel />;
      case 'enrollment_number_update': return <EnrollmentNumberUpdatePanel />;
      case 're_registration': return <ReRegistrationPanel />;
      case 'exam_registration': return <ExamRegistrationPanel />;

      case 'programs': return <ProgramsPanel />;
      case 'program_allocations': return <OpsProgramAllocationPanel />;
      
      case 'centers': return <StudyCentersPanel />;
      
      case 'document_received': return <DocumentReceivedPanel />;
      case 'document_dispatch': return <DocumentDispatchPanel />;
      case 'courier_tracking': return <CourierTrackingPanel />;
      case 'delivery_confirmation': return <DeliveryConfirmationPanel />;

      case 'announcements': return <AnnouncementsPanel />;
      case 'bulk_sms': return <BulkSmsPanel />;
      case 'bulk_whatsapp': return <BulkWhatsAppPanel />;
      case 'email_notifications': return <EmailNotificationsPanel />;

      case 'tasks': return <TasksPanel />;

      case 'student_report': return <StudentReportPanel />;
      case 'admission_report': return <AdmissionReportPanel />;
      case 'enrollment_report': return <EnrollmentReportPanel />;
      case 'university_report': return <UniversityReportPanel />;
      case 're_registration_report': return <ReRegistrationReportPanel />;

      case 'my_attendance': return <AttendancePanel isMyPortal />;
      case 'my_leaves': return <LeavesPanel isMyPortal />;
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

// eslint-disable-next-line react-refresh/only-export-components
export function getOpsNavItems() {
  return [
    { id: '__dashboard', label: 'Dashboard', isSection: true },
    { id: 'overview', label: 'Overview' },
    { id: 'team_permissions', label: 'Team Permissions' },
    
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
    { id: 'meetings', label: 'Meetings' },
    
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
          onClick={() => onNavigate('admission_review')}
        />
        <OpsMetricCard 
          title="Uni Submission Pending" 
          value={metrics.uniSubmissionsPending || 0} 
          icon={<Building2 className="w-5 h-5 text-warning" />}
          bgColor="bg-warning/10"
          onClick={() => onNavigate('university_submission')}
        />
        <OpsMetricCard 
          title="Enrollment No Pending" 
          value={metrics.enrollmentNumbersPending || 0} 
          icon={<Hash className="w-5 h-5 text-indigo-500" />}
          bgColor="bg-indigo-500/10"
          onClick={() => onNavigate('enrollment_number_update')}
        />
        <OpsMetricCard 
          title="Documents Pending" 
          value={metrics.documentsPending || 0} 
          icon={<FileText className="w-5 h-5 text-rose-500" />}
          bgColor="bg-rose-500/10"
          onClick={() => onNavigate('document_received')}
        />
        <OpsMetricCard 
          title="Re-registration Pending" 
          value={metrics.reRegistrationPending || 0} 
          icon={<RefreshCw className="w-5 h-5 text-amber-600" />}
          bgColor="bg-amber-600/10"
          onClick={() => onNavigate('re_registration')}
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
