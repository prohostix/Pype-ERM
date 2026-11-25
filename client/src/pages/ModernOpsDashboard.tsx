/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
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

export function ModernOpsDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const [metrics, setMetrics] = useState<any>({});
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate(tab);
  };

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
      case 'overview': return <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-3"><OverviewContent metrics={metrics} onNavigate={handleNavigate} /></div></div>;

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
      case 'leaves': return <LeavesPanel />;

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
export function getOpsNavItems(role?: string) {
  const items = [
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

    { id: '__study_centers', label: 'Academic Partners', isSection: true },
    { id: 'centers', label: 'Academic Partners' },

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
    { id: 'leaves', label: 'Leave Requests' },
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

  if (role === 'ops_sub_admin') {
    return items.filter(item => item.id !== 'team_permissions');
  }

  return items;
}

function OverviewContent({ metrics, onNavigate }: { metrics: any; onNavigate: (tab: string) => void }) {
  const docsPending = Array.isArray(metrics.documentsPending) ? metrics.documentsPending.length : (metrics.documentsPending || 0);
  const rejectedStudents = Array.isArray(metrics.documentsPending)
    ? metrics.documentsPending.filter((s: any) => s.photoStatus === 'rejected' || s.unapprovedDocs?.some((d: any) => d.status === 'rejected'))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Operations Overview</h2>
        <p className="text-muted-foreground text-sm mt-1.5">Monitor and manage daily operations</p>
      </div>

      {/* Operations metrics */}
      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-slate-100 [&>*:nth-child(-n+2)]:border-t-0">
          <OpsMetricCard title="Total Students" value={metrics.totalStudents || 0} onClick={() => onNavigate('students')} />
          <OpsMetricCard
            title="Verification Pendings"
            value={metrics.pendingApplications || 0}
            note={metrics.pendingApplications > 0 ? 'Needs review' : 'All clear'}
            tone={metrics.pendingApplications > 0 ? 'warn' : undefined}
            onClick={() => onNavigate('admission_review')}
          />
          <OpsMetricCard title="Uni Submission Pending" value={metrics.uniSubmissionsPending || 0} onClick={() => onNavigate('university_submission')} />
          <OpsMetricCard title="Enrollment No Pending" value={metrics.enrollmentNumbersPending || 0} onClick={() => onNavigate('enrollment_number_update')} />
          <OpsMetricCard title="Documents Pending" value={docsPending} onClick={() => onNavigate('document_received')} />
          <OpsMetricCard title="Re-registration Pending" value={metrics.reRegistrationPending || 0} onClick={() => onNavigate('re_registration')} />
          <OpsMetricCard
            title="Admission Closing Alerts"
            value={metrics.admissionAlerts || 0}
            tone={(metrics.admissionAlerts || 0) > 0 ? 'bad' : undefined}
            onClick={() => onNavigate('sessions')}
          />
          <OpsMetricCard title="Today's Tasks" value={metrics.todaysTasks || 0} onClick={() => onNavigate('tasks')} />
        </div>
      </div>

      {rejectedStudents.length > 0 && (
        <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight">Students with Rejected Documents</h3>
            <span className="rounded-full bg-red-100 text-red-700 text-xs font-semibold px-3 py-1">{rejectedStudents.length}</span>
          </div>
          <div className="p-4 sm:p-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {rejectedStudents.map((student: any) => (
              <div key={student.id} className="rounded-2xl bg-[#f4f6f3] p-4">
                <div className="font-semibold text-slate-900">{student.name}</div>
                <div className="text-xs text-muted-foreground mb-3">{student.enrollmentNo || 'No Enrollment No'}</div>
                <div className="flex flex-wrap gap-1.5">
                  {student.photoStatus === 'rejected' && (
                    <span className="rounded-full bg-red-100 text-red-700 text-xs font-semibold px-3 py-1">Photo rejected</span>
                  )}
                  {student.unapprovedDocs?.filter((d: any) => d.status === 'rejected').map((doc: any, i: number) => (
                    <span key={i} className="rounded-full bg-red-100 text-red-700 text-xs font-semibold px-3 py-1">{doc.name || doc.type || 'Document'} rejected</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OpsMetricCard({ title, value, note, tone, onClick }: { title: string; value: number | string; note?: string; tone?: 'warn' | 'bad'; onClick?: () => void }) {
  return (
    <button type="button" className="text-left p-5 sm:p-6 hover:bg-[#f7faf6] transition-colors flex flex-col" onClick={onClick}>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className={cn('text-3xl font-semibold tracking-tight mt-2', tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-slate-900')}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {note && <p className="text-xs text-muted-foreground mt-2">{note}</p>}
    </button>
  );
}
