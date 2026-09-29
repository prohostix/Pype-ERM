import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart2, Video, Users, Clock, Eye, PlayCircle, TrendingUp, BookOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function OnlineClassAnalyticsPanel({ academicClass, onBack }: any) {
  const [data, setData] = useState<{ students: any[], modules: any[], logs: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get(`/faculty-portal/classes/${academicClass.id}/video-analytics`);
      setData(res.data.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        <p className="text-muted-foreground animate-pulse font-medium">Crunching analytics data...</p>
      </div>
    );
  }

  const { students, modules, logs } = data;
  const lessons = modules.flatMap(m => m.lessons);

  // Aggregated Stats
  const totalWatchTime = logs.reduce((acc, l) => acc + l.watchDuration, 0);
  const totalViews = logs.reduce((acc, l) => acc + l.viewCount, 0);
  const activeStudents = new Set(logs.map(l => l.studentId)).size;

  return (
    <div className="space-y-8 pb-10">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BarChart2 className="w-64 h-64 transform rotate-12 translate-x-12 -translate-y-12" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/20 -ml-3 mb-2 rounded-full backdrop-blur-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Classes
            </Button>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Watch Analytics
            </h2>
            <p className="text-pink-100 font-medium text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> {academicClass.name}
            </p>
          </div>

          {/* Stats Glassmorphism Box */}
          <div className="grid grid-cols-3 gap-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 w-full md:w-auto shadow-inner">
            <div className="flex flex-col items-center justify-center px-4 border-r border-white/20">
              <Users className="w-5 h-5 text-pink-200 mb-1" />
              <div className="text-2xl font-bold">{students.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-pink-100 font-semibold">Students</div>
            </div>
            <div className="flex flex-col items-center justify-center px-4 border-r border-white/20">
              <Eye className="w-5 h-5 text-purple-200 mb-1" />
              <div className="text-2xl font-bold">{totalViews}</div>
              <div className="text-[10px] uppercase tracking-wider text-purple-100 font-semibold">Total Views</div>
            </div>
            <div className="flex flex-col items-center justify-center px-4">
              <Clock className="w-5 h-5 text-indigo-200 mb-1" />
              <div className="text-2xl font-bold">{formatDuration(totalWatchTime)}</div>
              <div className="text-[10px] uppercase tracking-wider text-indigo-100 font-semibold">Watch Time</div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="students" className="w-full">
        <div className="flex justify-center mb-10">
          <TabsList className="relative flex w-full max-w-md bg-white dark:bg-slate-950 p-1.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 h-14">
            <TabsTrigger 
              value="students" 
              className="relative w-full rounded-full flex items-center justify-center gap-2 text-sm font-bold tracking-wide text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 transition-all duration-500 z-10 data-[state=active]:shadow-md data-[state=active]:scale-[1.02]"
            >
              <Users className="w-4 h-4" /> STUDENTS
            </TabsTrigger>
            <TabsTrigger 
              value="videos" 
              className="relative w-full rounded-full flex items-center justify-center gap-2 text-sm font-bold tracking-wide text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 transition-all duration-500 z-10 data-[state=active]:shadow-md data-[state=active]:scale-[1.02]"
            >
              <Video className="w-4 h-4" /> VIDEO LESSONS
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="students" className="space-y-6">
          {students.length === 0 ? (
             <div className="p-16 text-center text-muted-foreground border-2 border-dashed rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center">
               <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
               <p className="text-lg font-medium">No students enrolled yet.</p>
             </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {students.map(student => {
                const studentLogs = logs.filter(l => l.studentId === student.id);
                const totalStudentWatchTime = studentLogs.reduce((acc, l) => acc + l.watchDuration, 0);
                const watchedLessonIds = new Set(studentLogs.map(l => l.moduleLessonId));
                const progress = lessons.length > 0 ? Math.round((watchedLessonIds.size / lessons.length) * 100) : 0;

                return (
                  <Card key={student.id} className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-950 rounded-2xl">
                    <CardHeader className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-900/50 py-5 px-6 border-b border-slate-100 dark:border-slate-800 relative overflow-hidden">
                      {/* Animated gradient accent */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-400 to-indigo-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                      
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-100 to-indigo-100 dark:from-pink-900/40 dark:to-indigo-900/40 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold text-xl shadow-inner border border-white/50 dark:border-slate-800">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                              {student.name}
                            </CardTitle>
                            <div className="text-sm font-medium text-slate-500">{student.enrollmentNo || student.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Time</div>
                          <div className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-indigo-500 flex items-center justify-end gap-1.5">
                            <Clock className="w-4 h-4 text-pink-500" /> 
                            {formatDuration(totalStudentWatchTime)}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-6 space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course Progress</span>
                          <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                          <div 
                            className="bg-gradient-to-r from-pink-500 to-indigo-500 h-2 rounded-full transition-all duration-1000 ease-out relative" 
                            style={{ width: `${progress}%` }}
                          >
                            <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/30 animate-pulse rounded-full" />
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      {studentLogs.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-3">
                            <Eye className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                          </div>
                          <p className="text-sm font-medium text-slate-400">No videos watched yet</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {modules.map(mod => {
                            const modLessons = mod.lessons;
                            const modLogs = studentLogs.filter(l => modLessons.some((ml:any) => ml.id === l.moduleLessonId));
                            if (modLogs.length === 0) return null;

                            return (
                              <div key={mod.id} className="p-5">
                                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">{mod.title}</h4>
                                <div className="space-y-3">
                                  {modLessons.map((lesson: any) => {
                                    const log = modLogs.find(l => l.moduleLessonId === lesson.id);
                                    if (!log) return null;
                                    return (
                                      <div key={lesson.id} className="group/item flex flex-col sm:flex-row justify-between sm:items-center p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 dark:bg-slate-900/50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800/30 transition-all duration-300 gap-3">
                                        <div className="flex items-start sm:items-center gap-3">
                                          <div className="mt-0.5 sm:mt-0 p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm group-hover/item:text-indigo-500 transition-colors">
                                            <PlayCircle className="w-4 h-4" />
                                          </div>
                                          <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 line-clamp-2">{lesson.title}</span>
                                        </div>
                                        <div className="flex items-center gap-4 sm:gap-6 text-sm ml-12 sm:ml-0">
                                          <div className="flex flex-col items-start sm:items-end">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Views</span>
                                            <span className="font-bold text-slate-600 dark:text-slate-300">{log.viewCount}x</span>
                                          </div>
                                          <div className="flex flex-col items-start sm:items-end">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Duration</span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatDuration(log.watchDuration)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="space-y-6">
           {modules.length === 0 ? (
             <div className="p-16 text-center text-muted-foreground border-2 border-dashed rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center">
               <Video className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
               <p className="text-lg font-medium">No modules or lessons created yet.</p>
             </div>
           ) : (
             <div className="grid gap-8">
                {modules.map(mod => (
                  <div key={mod.id} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent flex-1"></div>
                      <h3 className="font-bold text-xl text-slate-700 dark:text-slate-200 px-4">{mod.title}</h3>
                      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent flex-1"></div>
                    </div>
                    
                    {mod.lessons.length === 0 ? (
                      <div className="text-sm text-center text-slate-400 py-4">No lessons in this module.</div>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-2">
                        {mod.lessons.map((lesson: any) => {
                          const lessonLogs = logs.filter(l => l.moduleLessonId === lesson.id);
                          const uniqueViewers = lessonLogs.length;
                          const lessonTotalTime = lessonLogs.reduce((acc, l) => acc + l.watchDuration, 0);

                          return (
                            <Card key={lesson.id} className="group overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-950 rounded-2xl">
                              <CardHeader className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 py-4 px-5 border-b border-indigo-100/50 dark:border-indigo-900/30 relative">
                                <div className="absolute top-0 right-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-1 p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm">
                                      <Video className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-base font-bold leading-tight pt-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                      {lesson.title}
                                    </CardTitle>
                                  </div>
                                  <div className="flex items-center gap-6 sm:pl-0 pl-14">
                                    <div className="text-right">
                                      <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Viewers</div>
                                      <div className="font-extrabold text-lg text-indigo-700 dark:text-indigo-300 flex items-center justify-end gap-1.5">
                                        <Users className="w-3.5 h-3.5" /> {uniqueViewers}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Total Time</div>
                                      <div className="font-extrabold text-lg text-purple-700 dark:text-purple-300 flex items-center justify-end gap-1.5">
                                        <Clock className="w-3.5 h-3.5" /> {formatDuration(lessonTotalTime)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-0">
                                {lessonLogs.length === 0 ? (
                                  <div className="p-6 text-sm text-center flex flex-col items-center">
                                    <TrendingUp className="w-8 h-8 text-slate-200 dark:text-slate-800 mb-2" />
                                    <span className="font-medium text-slate-400">Waiting for first viewer...</span>
                                  </div>
                                ) : (
                                  <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[250px] overflow-y-auto custom-scrollbar p-2">
                                    {lessonLogs.map(log => {
                                      const student = students.find(s => s.id === log.studentId);
                                      return (
                                        <div key={log.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                                              {student?.name?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex flex-col">
                                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{student?.name || 'Unknown'}</span>
                                              <span className="text-[10px] font-medium text-slate-400 uppercase">Watched {new Date(log.lastWatchedAt).toLocaleDateString()}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-5 text-sm">
                                            <div className="flex flex-col items-end">
                                              <span className="text-[10px] font-bold text-slate-400 uppercase">Views</span>
                                              <span className="font-semibold text-slate-600 dark:text-slate-300">{log.viewCount}</span>
                                            </div>
                                            <div className="flex flex-col items-end w-16">
                                              <span className="text-[10px] font-bold text-slate-400 uppercase">Duration</span>
                                              <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatDuration(log.watchDuration)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
             </div>
           )}
        </TabsContent>
      </Tabs>
      
      {/* Custom Scrollbar Styles for the lists */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.3);
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    </div>
  );
}
