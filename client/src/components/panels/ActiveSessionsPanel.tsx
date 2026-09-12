import { useState, useEffect } from 'react';
import { Loader2, Play, Users, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { toast } from 'sonner';

export function ActiveSessionsPanel({ onEnterClass }: { onEnterClass: (sessionId: string, sessionData: any) => void }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/faculty-portal/sessions/active');
      setSessions(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
        <p>Loading live classes...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-background/50 text-muted-foreground">
        <div className="p-4 bg-muted rounded-full mb-4">
          <Clock className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <p className="text-lg font-medium text-foreground">No Live Classes</p>
        <p className="text-sm mt-1">There are no classes currently running for you.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            Live Classes
          </h2>
          <p className="text-muted-foreground text-sm">Ongoing sessions ready for your attendance input.</p>
        </div>
        <Button variant="outline" onClick={fetchSessions} size="sm" className="rounded-full shadow-sm hover:shadow-md transition-all">
          <Clock className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sessions.map(session => (
          <div key={session.id} className="group relative rounded-3xl overflow-hidden cursor-default border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            {/* Background elements */}
            <div className="absolute inset-0 bg-white dark:bg-slate-900 z-0" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/10 z-0" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 group-hover:scale-150 group-hover:bg-emerald-400/20 transition-all duration-700 ease-out z-0" />
            
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-cyan-500 z-10" />

            <div className="relative z-10 p-6 flex flex-col h-full">
              {/* Header */}
              <div className="flex justify-between items-start gap-4 mb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                    <Play className="w-3 h-3 fill-emerald-600 dark:fill-emerald-400" /> In Progress
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {session.moduleLesson.title}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    {session.classModule.title}
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 backdrop-blur-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Class</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300 line-clamp-1">{session.academicClass.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Batch</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300 line-clamp-1">{session.academicBatch.name}</p>
                </div>
                <div className="col-span-2 pt-2 mt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Started By</p>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 text-[10px] font-bold">
                      {session.startedBy.name.charAt(0)}
                    </div>
                    {session.startedBy.name}
                  </div>
                </div>
              </div>
              
              {/* Action Button */}
              <div className="mt-auto pt-2">
                <Button 
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/25 border-0 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-emerald-500/40" 
                  onClick={() => onEnterClass(session.id, session)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Enter Class & Mark Attendance
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
