/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import { CollectionsPanel } from '@/components/panels/CollectionsPanel';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { MeetingsPanel } from '@/components/panels/MeetingsPanel';
import { CollectionsOverview } from '@/components/panels/CollectionsOverview';

export function ModernCollectionsDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  useEffect(() => { setActiveTab(initialTab || 'overview'); }, [initialTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'meetings': return <MeetingsPanel />;
      case 'overview': return <CollectionsOverview onNavigate={handleNavigate} />;
      case 'collections': return <CollectionsPanel />;
      case 'students': return <StudentsPanel isSalesMode={true} />; // Read/search view for collection follow-ups
      case 'tasks': return <TasksPanel />;
      case 'leaves': return <LeavesPanel />;
      case 'my_leaves': return <LeavesPanel isMyPortal />;
      case 'my_attendance': return <AttendancePanel isMyPortal />;
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

export function getCollectionsNavItems() {
  return [
    { id: '__collections_section', label: 'Collections Department', isSection: true },
    { id: 'overview', label: 'Overview' },
    { id: 'collections', label: 'Collection Panel' },
    { id: 'students', label: 'Student Follow-up' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'leaves', label: 'Leave Approvals' },
    { id: 'my_leaves', label: 'My Leaves' },
    { id: 'my_attendance', label: 'Attendance' },
    { id: 'holidays', label: 'Holiday List' },
    { id: 'notice-board', label: 'Notice Board' },
    { id: 'meetings', label: 'Meetings' },
  ];
}
