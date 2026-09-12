import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Users, 
  LayoutDashboard, 
  ChevronRight,
  ExternalLink,
  BookMarked,
  Clock,
  PlayCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { FacultyClassesPanel } from '../components/panels/FacultyClassesPanel';
import { FacultyAssignmentsPanel } from '../components/panels/FacultyAssignmentsPanel';
import { ActiveSessionsPanel } from '../components/panels/ActiveSessionsPanel';
import { AttendanceManager } from '../components/panels/AttendanceManager';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { io, Socket } from 'socket.io-client';
import { useRef } from 'react';

interface FacultyPortalProps {
  onNavigate?: (tab: string) => void;
  initialTab?: string;
}

export function ModernFacultyPortal({ initialTab, onNavigate }: FacultyPortalProps) {
  const activeTab = !initialTab || initialTab === 'dashboard' ? 'overview' : initialTab;
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionData, setActiveSessionData] = useState<any>(null);

    const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const rawUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
    const socket = io(rawUrl && rawUrl !== '' ? rawUrl : window.location.origin, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      socket.emit('join-user', user.id);
    });
    
    socket.on('session-started', (sessionData: any) => {
      toast.success('Your Principal just started a Live Class for you!', { duration: 5000 });
      // If we are on the live tab, we might want to refresh, but the child handles its own fetch.
      // So we can just show a badge or notify.
    });
    
    socket.on('session-ended', (sessionId: string) => {
      toast.info('A Live Class was ended.', { duration: 3000 });
    });
    
    return () => {
      socket.disconnect();
    };
  }, [user]);

  const [metrics, setMetrics] = useState({
    totalClasses: 0,
    totalBatches: 0,
    totalAssignedLessons: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchMetrics();
    }
  }, [activeTab]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const classRes = await api.get('/faculty-portal/classes');
      const classes = classRes.data.data || [];
      
      const totalClasses = classes.length;
      const totalBatches = classes.reduce((sum: number, c: any) => sum + (c._count?.batches || 0), 0);
      
      const assignmentRes = await api.get('/faculty-portal/my-assignments');
      const totalAssignedLessons = assignmentRes.data.data?.length || 0;
      
      setMetrics(prev => ({ ...prev, totalClasses, totalBatches, totalAssignedLessons }));
    } catch (err) {
      console.error('Failed to fetch faculty metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'assignments', label: 'My Schedule', icon: Clock },
    { id: 'classes', label: 'My Classes', icon: BookOpen },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveSessionId(null);
    setActiveSessionData(null);
    if (onNavigate) {
      onNavigate(tabId === 'overview' ? 'dashboard' : tabId);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-muted/5">
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            
            
            {/* Removed standalone Live Classes sections - now integrated into Assignments */}

            {activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Modern Hero Section */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 p-8 md:p-10 text-white shadow-2xl border border-indigo-500/20">
                  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/20 to-blue-500/20 blur-3xl rounded-full transform translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-purple-500/20 to-transparent blur-2xl rounded-full transform -translate-x-1/3 translate-y-1/3 pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-sm font-medium text-indigo-200">Faculty Portal Active</span>
                      </div>
                      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-blue-200">
                        Welcome back, {user?.name?.split(' ')[0] || 'Professor'}!
                      </h1>
                      <p className="text-lg text-indigo-200/80 leading-relaxed">
                        Your central hub for academic management, live classes, and student interactions.
                      </p>
                      
                      {!loading && metrics.totalClasses > 0 && (
                        <div className="pt-2">
                          <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-orange-500/25 px-4 py-1.5 text-sm font-semibold border-0">
                            Principal In-Charge
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className="hidden lg:flex items-center justify-center p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
                      <div className="text-center">
                        <div className="text-sm font-medium text-indigo-300 uppercase tracking-wider mb-1">Current Date</div>
                        <div className="text-2xl font-bold text-white">
                          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1 */}
                  <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-700" />
                    
                    <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          <BookOpen className="w-6 h-6" />
                        </div>
                      </div>
                      <div>
                        <div className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-1 tracking-tight">
                          {loading ? '...' : metrics.totalClasses}
                        </div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">My Classes</h3>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Card 2 */}
                  <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-700" />
                    
                    <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                          <BookMarked className="w-6 h-6" />
                        </div>
                      </div>
                      <div>
                        <div className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-1 tracking-tight">
                          {loading ? '...' : metrics.totalBatches}
                        </div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active Batches</h3>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 3 */}
                  <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-700" />
                    
                    <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          <Clock className="w-6 h-6" />
                        </div>
                      </div>
                      <div>
                        <div className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-1 tracking-tight">
                          {loading ? '...' : metrics.totalAssignedLessons}
                        </div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Assigned Lessons</h3>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Navigation Banners */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div 
                    onClick={() => handleTabChange('assignments')}
                    className="group cursor-pointer rounded-3xl overflow-hidden relative bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 p-8 flex items-center justify-between transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/20"
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                    <div className="absolute right-0 inset-y-0 w-1/2 bg-gradient-to-l from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
                          <Clock className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-white">My Schedule</h3>
                      </div>
                      <p className="text-slate-400 font-medium">View all the lessons you have been assigned to teach.</p>
                    </div>
                    
                    <div className="relative z-10 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md group-hover:bg-indigo-500 transition-colors duration-300 group-hover:translate-x-2">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  </div>

                  <div 
                    onClick={() => handleTabChange('classes')}
                    className="group cursor-pointer rounded-3xl overflow-hidden relative bg-gradient-to-r from-indigo-600 to-blue-700 dark:from-indigo-900 dark:to-blue-900 p-8 flex items-center justify-between transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/20"
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                    <div className="absolute right-0 inset-y-0 w-1/2 bg-gradient-to-l from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-white/20 text-white backdrop-blur-sm">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Academic Management</h3>
                      </div>
                      <p className="text-indigo-100 font-medium">Manage your assigned classes and enrolled students.</p>
                    </div>
                    
                    <div className="relative z-10 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md group-hover:bg-white group-hover:text-blue-700 transition-colors duration-300 group-hover:translate-x-2">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'classes' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                <FacultyClassesPanel />
              </div>
            )}

            {activeTab === 'assignments' && !activeSessionId && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                <FacultyAssignmentsPanel onEnterClass={(id, data) => {
                  setActiveSessionId(id);
                  setActiveSessionData(data);
                }} />
              </div>
            )}
            
            {activeSessionId && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                <AttendanceManager 
                  sessionId={activeSessionId} 
                  sessionData={activeSessionData} 
                  onBack={() => {
                    setActiveSessionId(null);
                    setActiveSessionData(null);
                  }} 
                />
              </div>
            )}

          </div>
        </main>
    </div>
  );
}
