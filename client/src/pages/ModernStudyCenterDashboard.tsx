/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Wallet, GraduationCap, ClipboardList, School } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { StudyCenterWalletPanel } from '@/components/panels/StudyCenterWalletPanel';
import { EnrollStudentPanel } from '@/components/panels/EnrollStudentPanel';
import { StudyCenterEnrollmentsPanel } from '@/components/panels/StudyCenterEnrollmentsPanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { InternalMarksPanel } from '@/components/panels/InternalMarksPanel';
import { ProgramsPanel } from '@/components/panels/ProgramsPanel';
import { MeetingsPanel } from '@/components/panels/MeetingsPanel';
import api from '@/lib/api';

export function ModernStudyCenterDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate(tab);
  };
  const [metrics, setMetrics] = useState<any>({});

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setActiveTab(initialTab || (typeof isSubDeptManager !== 'undefined' && isSubDeptManager ? 'my_subdept' : 'overview'));
  }, [initialTab]);
  useEffect(() => {
    api.get('/enrollment/wallet').then(r => setMetrics(r.data.data || {})).catch(() => {});
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Study Center Portal</h1>
        <p className="text-muted-foreground mt-1">Manage enrollments, wallet, and daily operations.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleNavigate} className="space-y-6">
        <div className="relative w-full max-w-full">
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            <TabsList className="flex w-max space-x-1.5 bg-transparent p-1 h-auto border-b border-border/30">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Overview</TabsTrigger>
          <TabsTrigger value="wallet" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Wallet</TabsTrigger>
          <TabsTrigger value="enroll" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Enroll Student</TabsTrigger>
          <TabsTrigger value="enrollments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">My Enrollments</TabsTrigger>
          <TabsTrigger value="marks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Internal Marks</TabsTrigger>
          <TabsTrigger value="programs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Programs & Materials</TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Tasks</TabsTrigger>
        </TabsList>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <OverviewCard
                  icon={<Wallet className="w-5 h-5 text-primary" />}
                  label="Wallet Balance"
                  value={`₹${(metrics.balance || 0).toLocaleString()}`}
                />
                <OverviewCard
                  icon={<GraduationCap className="w-5 h-5 text-success" />}
                  label="Total Enrollments"
                  value="—"
                />
                <OverviewCard
                  icon={<ClipboardList className="w-5 h-5 text-warning" />}
                  label="Pending Review"
                  value="—"
                />
              </div>
              <div className="mt-6 p-6 rounded-xl border border-border bg-card/60">
                <div className="flex items-center gap-3 mb-4">
                  <School className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Quick Actions</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button onClick={() => handleNavigate('enroll')} className="p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left">
                    <GraduationCap className="w-5 h-5 text-primary mb-2" />
                    <p className="text-sm font-semibold">Enroll Student</p>
                    <p className="text-xs text-muted-foreground">Submit a new enrollment</p>
                  </button>
                  <button onClick={() => handleNavigate('wallet')} className="p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left">
                    <Wallet className="w-5 h-5 text-success mb-2" />
                    <p className="text-sm font-semibold">Top Up Wallet</p>
                    <p className="text-xs text-muted-foreground">Request balance top-up</p>
                  </button>
                </div>              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="wallet"><StudyCenterWalletPanel /></TabsContent>
        <TabsContent value="enroll"><EnrollStudentPanel /></TabsContent>
        <TabsContent value="enrollments"><StudyCenterEnrollmentsPanel /></TabsContent>
        <TabsContent value="marks"><InternalMarksPanel /></TabsContent>
        <TabsContent value="programs"><ProgramsPanel /></TabsContent>
        <TabsContent value="tasks"><TasksPanel /></TabsContent>
              <TabsContent value="meetings">
          <MeetingsPanel />
        </TabsContent>
</Tabs>
    </div>
  );
}

function OverviewCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-muted">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
