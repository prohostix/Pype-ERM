import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Clock, Play, UserPlus, Users, Loader2, User, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import api from '@/lib/api';
import { toast } from 'sonner';

export function FacultyBatchDashboardPanel({ academicClass, academicBatch, onBack }: { academicClass: any; academicBatch: any; onBack: () => void }) {
  const [modules, setModules] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Modals state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignLesson, setAssignLesson] = useState<any>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('none');
  const [assignReason, setAssignReason] = useState('');

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [lessonHistory, setLessonHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [startClassDialogOpen, setStartClassDialogOpen] = useState(false);
  const [startClassLesson, setStartClassLesson] = useState<any>(null);

  // Sessions and Attendance (reusing logic from FacultyClassesPanel)
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);
  const [batchSessions, setBatchSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeLessonForSessions, setActiveLessonForSessions] = useState<any>(null);

  const [viewAttendanceDialogOpen, setViewAttendanceDialogOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
    fetchFaculty();
  }, [academicClass.id]);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/faculty-portal/classes/${academicClass.id}/modules`);
      setModules(res.data.data || []);
      if (res.data.data?.length > 0 && Object.keys(expandedModules).length === 0) {
        setExpandedModules({ [res.data.data[0].id]: true });
      }
    } catch (err) {
      toast.error('Failed to fetch class modules');
    } finally {
      setLoading(false);
    }
  };

  const fetchFaculty = async () => {
    try {
      const res = await api.get('/faculty-portal/organization/faculty');
      setFacultyList(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch faculty list');
    }
  };

  const toggleModule = (id: string) => {
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Assign Teacher
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignLesson) return;
    if (!assignReason.trim()) return toast.error('A reason is required');
    
    try {
      const payload = {
        facultyId: selectedFacultyId === 'none' ? null : selectedFacultyId,
        batchId: academicBatch.id, // STICK TO THIS BATCH
        reason: assignReason
      };
      
      await api.put(`/faculty-portal/lessons/${assignLesson.id}/assign`, payload);
      toast.success('Teacher assigned successfully to this batch');
      setAssignDialogOpen(false);
      fetchModules();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign teacher');
    }
  };

  // Start Session
  const handleStartClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startClassLesson) return;

    // determine faculty for this batch
    const existingAssignment = startClassLesson?.batchAssignments?.find((ba: any) => ba.academicBatchId === academicBatch.id);
    const facultyId = existingAssignment?.facultyId || startClassLesson?.facultyId;
    
    if (!facultyId) return toast.error('No teacher assigned to this lesson/batch');

    try {
      await api.post('/faculty-portal/sessions/start', {
        academicClassId: academicClass.id,
        classModuleId: startClassLesson.classModuleId,
        moduleLessonId: startClassLesson.id,
        academicBatchId: academicBatch.id,
        facultyId: facultyId
      });
      toast.success('Class session started successfully!');
      setStartClassDialogOpen(false);
      fetchModules();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start class');
    }
  };

  // History
  const fetchHistory = async (lesson: any) => {
    setAssignLesson(lesson);
    setHistoryDialogOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/faculty-portal/lessons/${lesson.id}/history`);
      // Optional: filter history to only show this batch's history
      const batchHistory = (res.data.data || []).filter((h: any) => !h.batchId || h.batchId === academicBatch.id);
      setLessonHistory(batchHistory);
    } catch (err: any) {
      toast.error('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Sessions and Attendance (for specific lesson in this batch)
  const fetchSessionsForLesson = async (lesson: any) => {
    setActiveLessonForSessions(lesson);
    setSessionsDialogOpen(true);
    setLoadingSessions(true);
    try {
      const res = await api.get(`/faculty-portal/batches/${academicBatch.id}/sessions`);
      // Filter sessions for this specific lesson
      const lessonSessions = (res.data.data || []).filter((s: any) => s.moduleLessonId === lesson.id);
      setBatchSessions(lessonSessions);
    } catch (err: any) {
      toast.error('Failed to load sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchAttendance = async (sessionId: string) => {
    setAttendanceSessionId(sessionId);
    setViewAttendanceDialogOpen(true);
    setLoadingAttendance(true);
    try {
      const res = await api.get(`/faculty-portal/sessions/${sessionId}/students`);
      setAttendanceRecords(res.data.data || []);
    } catch (err: any) {
      toast.error('Failed to load attendance');
    } finally {
      setLoadingAttendance(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Batch Dashboard: {academicBatch.name}
          </h2>
          <p className="text-muted-foreground text-sm">Class: {academicClass.name}</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading curriculum...</div>
        ) : modules.length > 0 ? (
          modules.map((mod, index) => (
            <Card key={mod.id} className="overflow-hidden border-indigo-100 dark:border-indigo-900/30">
              <div 
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleModule(mod.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-bold">{mod.title}</h3>
                    <p className="text-xs text-muted-foreground">{mod.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">{mod.lessons?.length || 0} Lessons</Badge>
                </div>
              </div>

              {expandedModules[mod.id] && (
                <CardContent className="p-0 border-t">
                  {mod.lessons && mod.lessons.length > 0 ? (
                    <div className="divide-y">
                      {mod.lessons.map((lesson: any) => {
                        // determine teacher for this batch
                        const batchAssignment = lesson.batchAssignments?.find((ba: any) => ba.academicBatchId === academicBatch.id);
                        const teacherId = batchAssignment?.facultyId || lesson.facultyId;
                        const teacher = facultyList.find(f => f.id === teacherId);
                        const isOngoing = lesson.academicSessions?.some((s: any) => s.academicBatchId === academicBatch.id && s.status === 'IN_PROGRESS');
                        const isCompleted = lesson.academicSessions?.some((s: any) => s.academicBatchId === academicBatch.id && s.status === 'COMPLETED');

                        return (
                          <div key={lesson.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-indigo-100 flex items-center justify-center">
                                  <BookOpen className="w-4 h-4 text-indigo-400" />
                                </div>
                                <h4 className="font-semibold text-sm">{lesson.title}</h4>
                                {isOngoing && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200 uppercase font-bold tracking-wider">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    Live
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 uppercase font-bold tracking-wider">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Completed
                                  </span>
                                )}
                              </div>
                              {lesson.description && (
                                <p className="text-xs text-muted-foreground ml-8">{lesson.description}</p>
                              )}
                            </div>
                            
                            <div className="flex flex-col sm:items-end gap-3 shrink-0">
                              <div className="flex items-center gap-3 text-xs">
                                <div className="flex items-center gap-1 text-slate-500">
                                  <span className="font-medium">
                                    Teacher: 
                                  </span>
                                  {teacher ? (
                                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                                      {teacher.name} {batchAssignment ? '(Assigned to Batch)' : '(Default)'}
                                    </span>
                                  ) : (
                                    <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                      Unassigned
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => fetchHistory(lesson)} className="h-8 text-xs text-slate-600">
                                  <Clock className="w-3.5 h-3.5 mr-1" /> History
                                </Button>
                                {isCompleted && (
                                  <Button variant="outline" size="sm" onClick={() => {
                                    const session = lesson.academicSessions?.find((s: any) => s.academicBatchId === academicBatch.id && s.status === 'COMPLETED');
                                    if (session) fetchAttendance(session.id);
                                  }} className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                                    <Users className="w-3.5 h-3.5 mr-1" /> Attendance
                                  </Button>
                                )}
                                <Button 
                                  variant={isCompleted ? "secondary" : "outline"} 
                                  size="sm" 
                                  onClick={() => { 
                                    setStartClassLesson(lesson); 
                                    setStartClassDialogOpen(true); 
                                  }} 
                                  disabled={isOngoing || isCompleted} 
                                  className={`h-8 text-xs ${isCompleted ? 'bg-slate-100 text-slate-500 hover:bg-slate-100' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                                >
                                  {isCompleted ? (
                                    <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Completed</>
                                  ) : isOngoing ? (
                                    <><Play className="w-3.5 h-3.5 mr-1" /> Live Session</>
                                  ) : (
                                    <><Play className="w-3.5 h-3.5 mr-1" /> Start Lesson</>
                                  )}
                                </Button>
                                <Button variant="default" size="sm" onClick={() => { 
                                  setAssignLesson(lesson); 
                                  setSelectedFacultyId(teacherId || 'none');
                                  setAssignReason(''); 
                                  setAssignDialogOpen(true); 
                                }} className="h-8 text-xs">
                                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Assign Teacher
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground bg-background">
                      No lessons added to this module yet. (Go to Module Configuration to add lessons).
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        ) : (
          <div className="p-12 text-center border rounded-lg bg-background">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No curriculum modules found for this class.</p>
          </div>
        )}
      </div>

      {/* Start Class Dialog */}
      <Dialog open={startClassDialogOpen} onOpenChange={setStartClassDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start Live Class</DialogTitle></DialogHeader>
          <form onSubmit={handleStartClassSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <p className="text-sm">You are about to start a live session for:</p>
              <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-sm border">
                <p><span className="text-muted-foreground">Class:</span> <span className="font-semibold">{academicClass.name}</span></p>
                <p><span className="text-muted-foreground">Batch:</span> <span className="font-semibold">{academicBatch.name}</span></p>
                <p><span className="text-muted-foreground">Lesson:</span> <span className="font-semibold">{startClassLesson?.title}</span></p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setStartClassDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Start Session</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Teacher Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Teacher to Lesson (This Batch Only)</DialogTitle></DialogHeader>
          <form onSubmit={handleAssignSubmit} className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Teacher for {academicBatch.name} *</Label>
                <Select value={selectedFacultyId} onValueChange={setSelectedFacultyId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select a teacher" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="italic text-muted-foreground">-- Fallback to Default Teacher --</SelectItem>
                    {facultyList.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">This will override the default teacher for this specific batch only.</p>
              </div>

              <div className="space-y-2">
                <Label>Reason for Assignment / Change *</Label>
                <Textarea 
                  required 
                  value={assignReason} 
                  onChange={e => setAssignReason(e.target.value)} 
                  placeholder="e.g., Original teacher is on leave..." 
                  className="h-24 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="ghost" onClick={() => setAssignDialogOpen(false)}>Cancel</Button><Button type="submit">Save Assignment</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Assignment History</DialogTitle>
            <p className="text-sm text-muted-foreground">History for: <span className="font-semibold text-foreground">{assignLesson?.title}</span> in {academicBatch.name}</p>
          </DialogHeader>
          <div className="pt-4 pb-2 px-1">
            {loadingHistory ? (
              <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading...
              </div>
            ) : lessonHistory.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No assignment history found.</div>
            ) : (
              <div className="relative border-l border-muted-foreground/30 ml-3 pl-6 space-y-6">
                {lessonHistory.map((record, index) => (
                  <div key={record.id} className="relative">
                    <div className="absolute -left-[29px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-background" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground">{record.newFaculty?.name || 'Unassigned'}</span>
                        <span className="text-muted-foreground text-xs">was assigned</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.createdAt).toLocaleString()} • by {record.changedBy?.name || 'Unknown'}
                      </p>
                      <div className="mt-2 text-sm text-foreground bg-muted/40 p-2.5 rounded-md border">
                        <span className="font-medium mr-2 text-xs uppercase text-muted-foreground">Reason:</span>
                        {record.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Sessions Dialog */}
      <Dialog open={sessionsDialogOpen} onOpenChange={setSessionsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lesson Sessions</DialogTitle>
            <p className="text-sm text-muted-foreground">Sessions for: <span className="font-semibold text-foreground">{activeLessonForSessions?.title}</span> in {academicBatch.name}</p>
          </DialogHeader>
          <div className="pt-4 pb-2 px-1 space-y-3">
            {loadingSessions ? (
              <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading sessions...
              </div>
            ) : batchSessions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>No sessions recorded yet.</p>
              </div>
            ) : (
              batchSessions.map(session => (
                <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border rounded-lg gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={session.status === 'COMPLETED' ? 'outline' : 'default'} className={session.status === 'IN_PROGRESS' ? 'bg-red-500 text-white animate-pulse' : ''}>
                        {session.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Teacher: {session.faculty?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(session.createdAt).toLocaleDateString()} at {new Date(session.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    {session.status === 'COMPLETED' && (
                      <Button variant="outline" size="sm" onClick={() => fetchAttendance(session.id)}>
                        View Attendance
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Attendance Dialog */}
      <Dialog open={viewAttendanceDialogOpen} onOpenChange={setViewAttendanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Session Attendance</DialogTitle>
          </DialogHeader>
          <div className="pt-4 pb-2 px-1 space-y-2">
            {loadingAttendance ? (
              <div className="py-12 text-center flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No students found.</div>
            ) : (
              attendanceRecords.map((record: any) => (
                <div key={record.student?.id} className="flex items-center justify-between p-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{record.student?.studentName || record.student?.name}</p>
                    <p className="text-xs text-muted-foreground">{record.student?.admissionNumber || record.student?.enrollmentNo}</p>
                  </div>
                  <Badge variant={
                    record.attendance?.status === 'PRESENT' ? 'default' :
                    record.attendance?.status === 'ABSENT' ? 'destructive' :
                    record.attendance?.status === 'LATE' ? 'secondary' : 'outline'
                  }>
                    {record.attendance?.status || 'UNMARKED'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
