/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  TrendingUp 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { CollectionsPanel } from '@/components/panels/CollectionsPanel';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { MeetingsPanel } from '@/components/panels/MeetingsPanel';

export function ModernCollectionsDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const [metrics, setMetrics] = useState<any>({});
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  const fetchCollectionsMetrics = async () => {
    try {
      const response = await api.get('/collections/metrics');
      setMetrics(response.data.data || {});
    } catch (error) {
      console.error('Failed to fetch collections metrics:', error);
    }
  };

  useEffect(() => { setActiveTab(initialTab || 'overview'); }, [initialTab]);
  useEffect(() => { fetchCollectionsMetrics(); }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'meetings': return <MeetingsPanel />;
      case 'overview': return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><OverviewContent metrics={metrics} onNavigate={handleNavigate} /></div>
        </div>
      );
      case 'collections': return <CollectionsPanel />;
      case 'students': return <StudentsPanel isSalesMode={true} />; // Read/search view for collection follow-ups
      case 'tasks': return <TasksPanel />;
      case 'my_leaves': return <LeavesPanel />;
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
    { id: 'my_leaves', label: 'My Leaves' },
    { id: 'my_attendance', label: 'Attendance' },
    { id: 'holidays', label: 'Holiday List' },
    { id: 'notice-board', label: 'Notice Board' },
    { id: 'meetings', label: 'Meetings' },
  ];
}

function OverviewContent({ metrics, onNavigate }: { metrics: any, onNavigate: (tab: string) => void }) {
  const collectionStats = [
    {
      title: 'Collected Today',
      value: `₹${(metrics?.todayCollection || 0).toLocaleString()}`,
      description: 'Total payments received today',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      bg: 'bg-emerald-500/10'
    },
    {
      title: 'Collected This Month',
      value: `₹${(metrics?.monthlyCollection || 0).toLocaleString()}`,
      description: 'Active billing month progress',
      icon: <TrendingUp className="w-5 h-5 text-blue-500" />,
      bg: 'bg-blue-500/10'
    },
    {
      title: 'Total Overdue',
      value: `₹${(metrics?.totalOverdueAmount || 0).toLocaleString()}`,
      description: 'Unpaid past installments',
      icon: <AlertCircle className="w-5 h-5 text-rose-500" />,
      bg: 'bg-rose-500/10'
    },
    {
      title: 'Pending Cases',
      value: (metrics?.overdueSchedulesCount || 0).toString(),
      description: 'Schedules needing follow-up',
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      bg: 'bg-amber-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/10 via-background to-card p-6 md:p-8 shadow-md">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Collections Workspace</h1>
        <p className="text-muted-foreground text-sm mt-1">Track fee recoveries, manage overdue installment logs, and record remarks.</p>
      </div>

      {/* Stats grid */}
      <div className="stat-grid">
        {collectionStats.map((stat, i) => (
          <Card key={i} className="border-none bg-card/60 backdrop-blur-md shadow-sm">
            <CardContent className="p-4 sm:p-6 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">{stat.title}</span>
                <div className="text-lg sm:text-2xl font-bold">{stat.value}</div>
                <p className="text-[10px] text-muted-foreground leading-normal">{stat.description}</p>
              </div>
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Operations Card */}
      <Card className="border-none bg-card/60 backdrop-blur-md shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Quick Operations</CardTitle>
          <CardDescription>Direct navigation shortcuts</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/10 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Collections Panel</div>
              <p className="text-xs text-muted-foreground mt-0.5">Collect installments & record remarks</p>
            </div>
            <Button size="sm" onClick={() => onNavigate('collections')}>Go <ArrowRight className="w-4 h-4 ml-1.5" /></Button>
          </div>

          <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/10 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Student Follow-up</div>
              <p className="text-xs text-muted-foreground mt-0.5">Search student contact details & status</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigate('students')}>Go <ArrowRight className="w-4 h-4 ml-1.5" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
