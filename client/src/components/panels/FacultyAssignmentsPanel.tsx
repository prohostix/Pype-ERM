import { useState, useEffect } from 'react';
import { BookOpen, BookMarked, User, Clock, Loader2, Folder, ChevronDown, Sparkles, GraduationCap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { toast } from 'sonner';

import { ActiveSessionsPanel } from './ActiveSessionsPanel';

export function FacultyAssignmentsPanel({ onEnterClass }: { onEnterClass?: (sessionId: string, sessionData: any) => void }) {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  const toggleClass = (classId: string) => {
    setExpandedClasses(prev => ({
      ...prev,
      [classId]: !prev[classId]
    }));
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/faculty-portal/my-assignments');
      setLessons(res.data.data || []);
      
      const groups = getGroupedData(res.data.data || []);
      const firstClassId = Object.keys(groups)[0];
      if (firstClassId) {
        setExpandedClasses({ [firstClassId]: true });
      }
    } catch (err) {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const getGroupedData = (data: any[]) => {
    const groupedData: any = {};
    data.forEach(lesson => {
      const className = lesson.classModule?.academicClass?.name || 'Unknown Class';
      const classId = lesson.classModule?.academicClassId || 'unknown_class';
      
      const moduleName = lesson.classModule?.title || 'Unknown Module';
      const moduleId = lesson.classModule?.id || 'unknown_module';

      if (!groupedData[classId]) {
        groupedData[classId] = { name: className, modules: {} };
      }
      
      if (!groupedData[classId].modules[moduleId]) {
        groupedData[classId].modules[moduleId] = { name: moduleName, lessons: [] };
      }

      groupedData[classId].modules[moduleId].lessons.push(lesson);
    });
    return groupedData;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
        <p className="text-lg animate-pulse">Syncing your schedule...</p>
      </div>
    );
  }

  const groupedData = getGroupedData(lessons);

  return (
    <div className="space-y-8 pb-12 w-full max-w-5xl mx-auto">
      {/* Premium Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 shadow-xl shadow-indigo-900/20 p-8 sm:p-10 text-white">
        {/* Abstract Background Orbs */}
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-indigo-300" />
              <span className="text-indigo-200 font-medium tracking-wide uppercase text-sm">Faculty Dashboard</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
              My Teaching Schedule
            </h1>
            <p className="text-indigo-100/80 text-base max-w-lg">
              Here is everything you are scheduled to teach. Click on any academic class below to expand and view your assigned modules and lessons.
            </p>
          </div>
          <div className="shrink-0">
            <Button 
              onClick={fetchAssignments} 
              className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md shadow-sm transition-all"
            >
              <Clock className="w-4 h-4 mr-2" /> Sync Schedule
            </Button>
          </div>
        </div>
      </div>

      {/* Live Sessions Section */}
      {onEnterClass && (
        <div className="bg-background rounded-3xl p-6 sm:p-8 border shadow-sm">
          <ActiveSessionsPanel onEnterClass={onEnterClass} />
        </div>
      )}

      {lessons.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] border-2 border-dashed rounded-3xl bg-background/50 text-muted-foreground shadow-sm mt-8">
          <div className="p-6 bg-muted/50 rounded-full mb-6">
            <BookOpen className="w-12 h-12 text-muted-foreground/50" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">A clean slate!</h3>
          <p className="text-base mt-2 max-w-sm text-center">You have not been assigned to teach any lessons across your classes yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedData).map(([classId, classGroup]: [string, any], idx) => {
            const isExpanded = expandedClasses[classId];
            
            return (
              <div 
                key={idx} 
                className={`group bg-background rounded-2xl overflow-hidden transition-all duration-300 border shadow-sm ${
                  isExpanded 
                    ? 'border-indigo-500/40 shadow-indigo-500/10 shadow-lg' 
                    : 'border-border hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                {/* Accordion Header */}
                <div 
                  className="flex items-center justify-between p-5 sm:p-6 cursor-pointer select-none"
                  onClick={() => toggleClass(classId)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-colors duration-300 ${
                      isExpanded ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100'
                    }`}>
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-indigo-600 transition-colors">
                        {classGroup.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {Object.values(classGroup.modules).reduce((total: number, mod: any) => total + mod.lessons.length, 0)} Assigned Lessons
                      </p>
                    </div>
                  </div>
                  <div className={`p-2 rounded-full transition-all duration-300 ${isExpanded ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-transparent group-hover:bg-muted'}`}>
                    <ChevronDown className={`w-6 h-6 text-indigo-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                  </div>
                </div>

                {/* Accordion Body */}
                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="p-2 sm:p-4 pt-0">
                      <div className="bg-muted/30 dark:bg-muted/10 rounded-xl p-2 sm:p-4 space-y-4">
                        {Object.values(classGroup.modules).map((mod: any, mIdx) => (
                          <div key={mIdx} className="bg-background rounded-xl border shadow-sm overflow-hidden">
                            {/* Module Header */}
                            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 px-5 py-3 flex items-center gap-3 border-b">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                                <Folder className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <h4 className="font-semibold text-foreground text-sm tracking-wide uppercase">{mod.name}</h4>
                            </div>
                            
                            {/* Lessons List */}
                            <div className="divide-y divide-border/50">
                              {mod.lessons.map((lesson: any) => (
                                <div key={lesson.id} className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                  <div>
                                    <h5 className="font-bold text-base text-foreground flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      {lesson.title}
                                    </h5>
                                    {lesson.description && (
                                      <p className="text-sm text-muted-foreground mt-1.5 ml-3.5 leading-relaxed">{lesson.description}</p>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-2 shrink-0 sm:justify-end">
                                    {/* Badges */}
                                    {lesson.facultyId === JSON.parse(localStorage.getItem('user') || '{}').id ? (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-500/20 backdrop-blur-sm transition-all hover:bg-indigo-500/20">
                                        <User className="w-3.5 h-3.5" />
                                        Default Teacher
                                      </span>
                                    ) : null}

                                    {lesson.batchAssignments && lesson.batchAssignments.map((ba: any) => {
                                      const isCompleted = lesson.academicSessions?.some((s: any) => s.academicBatchId === ba.academicBatchId && s.status === 'COMPLETED');
                                      return (
                                        <span key={ba.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${isCompleted ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'} text-xs font-semibold border backdrop-blur-sm transition-all`}>
                                          {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                          {ba.academicBatch?.name} Batch {isCompleted && '(Completed)'}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
