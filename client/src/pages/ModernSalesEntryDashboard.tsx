/* eslint-disable react-refresh/only-export-components */
import { SalesEntryOverviewPanel } from '@/components/panels/SalesEntryOverviewPanel';
import { SalesEntryEnrollPanel } from '@/components/panels/SalesEntryEnrollPanel';
import { MyProfilePanel } from '@/components/panels/MyProfilePanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { ImportantUpdatesPanel } from '@/components/panels/ImportantUpdatesPanel';

/** Data-entry staff: enter students for a sales employee. What happens next is the sales employee's. */
export function ModernSalesEntryDashboard({ initialTab, onNavigate }: { initialTab?: string; onNavigate?: (tab: string) => void }) {
  switch (initialTab) {
    case 'tasks': return <TasksPanel />;
    case 'my_profile': return <MyProfilePanel />;
    case 'my_attendance': return <AttendancePanel isMyPortal />;
    case 'my_leaves': return <LeavesPanel isMyPortal />;
    case 'holidays': return <HolidaysPanel />;
    case 'important_updates': return <ImportantUpdatesPanel />;
    case 'notice-board': return <NoticeBoardPanel />;
    case 'enroll': return <SalesEntryEnrollPanel />;
    case 'overview':
    default: return <SalesEntryOverviewPanel onNavigate={onNavigate} />;
  }
}

export function getSalesEntryNavItems() {
  return [
    { id: '__entry', label: 'Student Entry', isSection: true },
    { id: 'overview', label: 'Overview' },
    { id: 'enroll', label: 'Enroll a Student' },

    { id: '__tasks', label: 'Tasks', isSection: true },
    { id: 'tasks', label: 'My Tasks' },

    { id: '__portal_section', label: 'My Portal', isSection: true },
    { id: 'my_profile', label: 'My Profile' },
    { id: 'my_attendance', label: 'Attendance' },
    { id: 'my_leaves', label: 'Leave' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'important_updates', label: 'Important Updates' },
    { id: 'notice-board', label: 'Notifications' },
  ];
}
