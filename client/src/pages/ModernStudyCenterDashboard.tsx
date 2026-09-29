/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { GraduationCap, ClipboardList, School, BookOpen, Users, TrendingUp, Sparkles, PlusCircle, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { EnrollStudentPanel } from '@/components/panels/EnrollStudentPanel';
import { StudyCenterEnrollmentsPanel } from '@/components/panels/StudyCenterEnrollmentsPanel';
import { ProgramsPanel } from '@/components/panels/ProgramsPanel';
import api from '@/lib/api';

export function ModernStudyCenterDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) {
      const TAB_TO_TABLE: Record<string, string> = {
        overview: 'dashboard',
        enroll: 'enroll_student',
        enrollments: 'center_enrollments',
        programs: 'center_programs',
      };
      if (TAB_TO_TABLE[tab]) {
        onNavigate(TAB_TO_TABLE[tab]);
      }
    }
  };
  const [metrics, setMetrics] = useState<any>({});
  const [enrollments, setEnrollments] = useState<any[]>([]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setActiveTab(initialTab || 'overview');
  }, [initialTab]);
  
  useEffect(() => {
    api.get('/enrollment/my-enrollments').then(r => setEnrollments(r.data.data || [])).catch(() => {});
    api.get('/enrollment/my-center-status').then(r => setMetrics(r.data.data || {})).catch(() => {});
  }, []);

  const totalEnrollments = enrollments.length;
  const pendingReview = enrollments.filter(e => e.status?.includes('pending')).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Academic Partner Portal</h1>
        <p className="text-muted-foreground mt-1">Manage enrollments, wallet, and daily operations.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleNavigate} className="space-y-6">
        <div className="relative w-full max-w-full">
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            <TabsList className="flex w-max space-x-1.5 bg-transparent p-1 h-auto border-b border-border/30">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Overview</TabsTrigger>
          <TabsTrigger value="enroll" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Enroll Student</TabsTrigger>
          <TabsTrigger value="enrollments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">My Enrollments</TabsTrigger>
          <TabsTrigger value="programs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-full px-5 py-2 transition-all duration-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Programs & Materials</TabsTrigger>
        </TabsList>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* Top Row: Welcome Banner & Center Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary text-primary-foreground p-8 shadow-lg">
              <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
                <Sparkles className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-2">Welcome Back, {metrics?.name || 'Center Admin'}!</h2>
                <p className="text-primary-foreground/80 max-w-md">Ready to shape the future? Manage your students, track enrollments, and explore top-tier programs all from your dashboard.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => handleNavigate('enroll')} className="bg-white text-primary px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-white/90 transition-all shadow-md flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" /> New Enrollment
                  </button>
                  <button onClick={() => handleNavigate('programs')} className="bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-foreground/20 transition-all flex items-center gap-2">
                    Explore Programs <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {metrics?.code && (
              <Card className="lg:col-span-1 border-none shadow-md overflow-hidden relative h-full flex flex-col justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 z-0"></div>
                <CardContent className="p-8 relative z-10 text-white">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-white/10 rounded-xl"><School className="w-6 h-6 text-emerald-400" /></div>
                    <h3 className="font-bold text-xl text-white">Center Details</h3>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wider mb-1.5 font-medium">Center Code</p>
                      <p className="font-mono text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">{metrics.code}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wider mb-1.5 font-medium">Status</p>
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span> {metrics.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              {/* Dynamic Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-none shadow-md bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/20"></div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                        <Users className="w-5 h-5" />
                      </div>
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Students</p>
                    <h4 className="text-3xl font-bold">{totalEnrollments}</h4>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/20"></div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Active Enrollments</p>
                    <h4 className="text-3xl font-bold">{totalEnrollments - pendingReview}</h4>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-amber-500/20"></div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Pending Review</p>
                    <h4 className="text-3xl font-bold">{pendingReview}</h4>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Side Panel: Quick Actions & Status */}
            <div className="space-y-6">
              <Card className="border-none shadow-md bg-card/60 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary/10 rounded-lg"><School className="w-4 h-4 text-primary" /></div>
                    <h3 className="font-semibold text-lg">Quick Actions</h3>
                  </div>
                  <div className="space-y-3">
                    <button onClick={() => handleNavigate('enroll')} className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm transition-all group text-left">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform"><GraduationCap className="w-4 h-4" /></div>
                        <div>
                          <p className="text-sm font-semibold">Enroll Student</p>
                          <p className="text-xs text-muted-foreground">Start a new application</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                    
                    <button onClick={() => handleNavigate('programs')} className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm transition-all group text-left">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg group-hover:scale-110 transition-transform"><BookOpen className="w-4 h-4" /></div>
                        <div>
                          <p className="text-sm font-semibold">View Programs</p>
                          <p className="text-xs text-muted-foreground">Browse all available courses</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>

                    <button onClick={() => handleNavigate('enrollments')} className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm transition-all group text-left">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform"><ClipboardList className="w-4 h-4" /></div>
                        <div>
                          <p className="text-sm font-semibold">My Enrollments</p>
                          <p className="text-xs text-muted-foreground">Track student progress</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="enroll"><EnrollStudentPanel /></TabsContent>
        <TabsContent value="enrollments"><StudyCenterEnrollmentsPanel /></TabsContent>
        <TabsContent value="programs"><ProgramsPanel /></TabsContent>
</Tabs>
    </div>
  );
}

