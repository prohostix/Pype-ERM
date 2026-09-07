import { useState, useEffect } from 'react';
import { 
  BookOpen, Video, FileText, Calendar, GraduationCap, Globe, MapPin, 
  Clock, Users, Play, Download, ExternalLink, CheckCircle2, UserCheck, 
  ClipboardList, Layers, File, FolderOpen, Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { 
  CenterProgram, CenterClassSchedule, CenterMaterial, AcademicCenter, Assessment, CourseModule
} from './types';

export function AcademicStudentPortal() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'course_structure'>('overview');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [classes, setClasses] = useState<CenterClassSchedule[]>([]);
  const [materials, setMaterials] = useState<CenterMaterial[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [markingAttendance, setMarkingAttendance] = useState<string | null>(null);

  const handleRegisterAttendance = async (classId: string) => {
    setMarkingAttendance(classId);
    try {
      const res = await api.post(`/academic-center/student-portal/classes/${classId}/attendance`);
      if (res.data.success) {
        toast.success(res.data.message || 'Attendance registered successfully!');
        setClasses((prev) =>
          prev.map((c) => (c.id === classId ? { ...c, myAttendance: res.data.data } : c))
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register attendance');
    } finally {
      setMarkingAttendance(null);
    }
  };

  useEffect(() => {
    fetchStudentPortalData();
  }, []);

  const fetchStudentPortalData = async () => {
    setLoading(true);
    try {
      const [dashRes, classRes, matRes, assessRes] = await Promise.all([
        api.get('/academic-center/student-portal/dashboard'),
        api.get('/academic-center/student-portal/classes'),
        api.get('/academic-center/student-portal/materials?excludeAssessments=true'),
        api.get('/academic-center/assessments').catch(() => ({ data: { data: [] } })),
      ]);

      if (dashRes.data.success) setDashboardData(dashRes.data.data);
      if (classRes.data.success) setClasses(classRes.data.data || []);
      if (matRes.data.success) setMaterials(matRes.data.data || []);
      if (assessRes.data?.success) setAssessments(assessRes.data.data || []);
    } catch (err: any) {
      console.error('Failed to load student portal:', err);
      toast.error(err.response?.data?.message || 'Failed to load Student Portal');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-sm text-muted-foreground">
        Loading Student Learning Portal...
      </div>
    );
  }

  const student = dashboardData?.student;
  const center: AcademicCenter | undefined = dashboardData?.center;
  const programs: CenterProgram[] = dashboardData?.programs || [];
  const upcomingClasses = dashboardData?.upcomingClasses || [];

  const parseSyllabus = (syllabusString?: string) => {
    try {
      if (!syllabusString) return [];
      const parsed = JSON.parse(syllabusString);
      return Array.isArray(parsed) ? parsed : parsed.modules || [];
    } catch {
      return [];
    }
  };

  const activeProgram = student?.enrollments?.[0]?.program;
  const modules: CourseModule[] = parseSyllabus(activeProgram?.syllabus);

  // --- Sequential Locking Logic ---
  const unlockedClassIds = new Set<string>();
  const unlockedModuleTitles = new Set<string>();

  let unlockNext = true;

  modules.forEach((mod) => {
    const modClasses = classes.filter((c) => c.moduleName === mod.title);
    
    if (modClasses.length > 0) {
      let isModUnlocked = false;
      modClasses.forEach((cls) => {
        if (unlockNext) {
          unlockedClassIds.add(cls.id);
          isModUnlocked = true;
          if (!cls.myAttendance) {
            unlockNext = false;
          }
        }
      });
      if (isModUnlocked) unlockedModuleTitles.add(mod.title);
    } else {
      if (unlockNext) {
        unlockedModuleTitles.add(mod.title);
      }
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      {/* Student Welcome Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-xs py-0.5">
                Student Learning Portal
              </Badge>
              {center?.type === 'ONLINE' ? (
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs gap-1 py-0.5">
                  <Globe className="w-3 h-3" /> Online Center
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs gap-1 py-0.5">
                  <MapPin className="w-3 h-3" /> Offline Campus
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Welcome, {student?.name || 'Student'}!
            </h1>
            <p className="text-sm text-indigo-200/80">
              Roll No: <span className="font-mono font-semibold text-white">{student?.studentCode}</span> • Center: <strong className="text-white">{center?.name}</strong>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs space-y-2 shrink-0 md:max-w-xs">
            <div className="flex items-center gap-2 font-semibold text-indigo-200">
              <UserCheck className="w-4 h-4 text-indigo-300" />
              <span>Academic Center Info</span>
            </div>
            <p className="text-white/90">
              {center?.type === 'OFFLINE' ? (
                <span>Campus: {center.address || center.city || 'Main Campus'}</span>
              ) : (
                <span>Delivery Mode: Recorded Classes & LMS Portal</span>
              )}
            </p>
            {center?.contactEmail && (
              <p className="text-white/70">Helpdesk: {center.contactEmail}</p>
            )}
            {center?.counselors && center.counselors.length > 0 && (
              <p className="text-white/70">
                Lead Counselor: <strong className="text-white">{center.counselors[0].counselor.name}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="bg-muted/70 p-1 flex-wrap">
          <TabsTrigger value="overview" className="gap-2 text-xs py-2 px-4">
            <BookOpen className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="course_structure" className="gap-2 text-xs py-2 px-4">
            <Layers className="w-4 h-4" />
            Course Structure
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Upcoming Classes & Live Sessions
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('course_structure')} className="text-xs">
                View Full Structure
              </Button>
            </div>

            {upcomingClasses.length === 0 ? (
              <Card className="p-6 text-center border-dashed">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium">No upcoming classes scheduled right now.</p>
                <p className="text-xs text-muted-foreground mt-1">Check back soon for new lecture schedules.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingClasses.map((cls: any) => (
                  <Card key={cls.id} className="border-l-4 border-l-primary hover:shadow-md transition-all">
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        {cls.recordingUrl || (!cls.meetingLink && center?.type === 'ONLINE') ? (
                          <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 text-[10px] gap-1">
                            <Video className="w-3 h-3" /> Recorded Lecture
                          </Badge>
                        ) : cls.type === 'ONLINE_LIVE_CLASS' ? (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-[10px] gap-1">
                            <Video className="w-3 h-3" /> Live Online Class
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px] gap-1">
                            <MapPin className="w-3 h-3" /> Offline Lecture
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground font-medium">
                          {new Date(cls.startTime).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="font-semibold text-base leading-snug">{cls.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        Program: {cls.program?.university ? `[${cls.program.university.name}] ` : ''}{cls.program?.name}
                      </p>

                      <div className="pt-2 border-t space-y-2">
                        {cls.type === 'ONLINE_LIVE_CLASS' || cls.meetingLink || cls.recordingUrl || center?.type === 'ONLINE' ? (
                          cls.myAttendance ? (
                            <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                Attendance: Present
                              </span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                {new Date(cls.myAttendance.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={markingAttendance === cls.id}
                              onClick={() => handleRegisterAttendance(cls.id)}
                              className="h-7 text-xs text-primary border-primary/30 hover:bg-primary/10 gap-1.5 w-full font-medium justify-center"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              {markingAttendance === cls.id ? 'Marking...' : 'Register Attendance'}
                            </Button>
                          )
                        ) : (
                          <div className="text-[11px] text-muted-foreground flex items-center justify-between bg-muted/40 px-2 py-1 rounded">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-primary" />
                              {cls.myAttendance ? (
                                <strong className={cls.myAttendance.status === 'PRESENT' ? 'text-emerald-600' : 'text-destructive'}>
                                  Teacher Marked: {cls.myAttendance.status}
                                </strong>
                              ) : (
                                'Campus class (Teacher marks attendance)'
                              )}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs pt-0.5">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            {new Date(cls.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {cls.recordingUrl ? (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1.5 font-medium"
                              onClick={() => {
                                if (!cls.myAttendance) handleRegisterAttendance(cls.id);
                                window.open(cls.recordingUrl, '_blank');
                              }}
                            >
                              <Play className="w-3 h-3 fill-white" />
                              Watch Lecture
                            </Button>
                          ) : cls.meetingLink ? (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 font-medium"
                              onClick={() => {
                                if (!cls.myAttendance) handleRegisterAttendance(cls.id);
                                window.open(cls.meetingLink, '_blank');
                              }}
                            >
                              <Video className="w-3 h-3" />
                              Join Live Class
                            </Button>
                          ) : cls.roomOrLocation ? (
                            <span className="font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Room: {cls.roomOrLocation}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              My Enrolled Programs
            </h3>

            {programs.length === 0 ? (
              <Card className="p-6 text-center border-dashed">
                <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium">You are not enrolled in any programs yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Please contact your academic counselor.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map((prog) => (
                  <Card key={prog.id} className="border hover:shadow-md transition-all">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        {prog.university ? (
                          <Badge variant="outline" className="text-[10px] font-semibold bg-primary/5 text-primary border-primary/20">
                            {prog.university.name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {prog.mode}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{prog.duration}</span>
                      </div>
                      <h4 className="font-semibold text-base mt-2">{prog.name}</h4>
                      <p className="text-xs text-muted-foreground font-mono">Code: {prog.code}</p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* COURSE STRUCTURE TAB */}
        <TabsContent value="course_structure" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Course Structure & Curriculum Modules
              </h3>
              <p className="text-xs text-muted-foreground">
                Access your syllabus units, recorded video lessons, materials, and live classes below. Complete items sequentially to unlock the next!
              </p>
            </div>
          </div>

          {activeProgram ? (
            <Card className="bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border-purple-200/60 dark:border-purple-900/40 p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-sm mt-0.5">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-base text-foreground">
                        {activeProgram.name}
                      </h4>
                      {activeProgram.code && (
                        <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 dark:text-purple-300 font-mono">
                          {activeProgram.code}
                        </Badge>
                      )}
                    </div>
                    {activeProgram.university && (
                      <p className="text-xs text-muted-foreground mt-1">
                        University: <strong className="text-foreground">{activeProgram.university.name}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {modules.length === 0 ? (
            <Card className="border-dashed p-10 text-center">
              <Layers className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <h4 className="text-base font-semibold">No Course Modules Found</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Your coordinator hasn't uploaded any syllabus modules for this program yet.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {modules.map((mod, idx) => {
                const isModuleUnlocked = unlockedModuleTitles.has(mod.title);

                const modClasses = classes.filter((c) => c.moduleName === mod.title);
                const classTitles = new Set(modClasses.map((c) => c.title));
                const modMaterials = materials.filter((m) => m.chapterOrTopic && classTitles.has(m.chapterOrTopic));
                const modAssessments = assessments.filter((a) => a.module === mod.title || (a.module && classTitles.has(a.module)));

                const recordedCount = modClasses.filter((c) => c.recordingUrl && !c.meetingLink).length;
                const liveCount = modClasses.filter((c) => !!c.meetingLink || (!c.recordingUrl && !!c.startTime)).length;

                return (
                  <Card key={mod.id || idx} className={`border transition-all shadow-xs ${isModuleUnlocked ? 'hover:border-purple-500/40' : 'opacity-80 bg-muted/20 grayscale-[20%]'}`}>
                    <CardHeader className="bg-muted/30 p-4 border-b">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] uppercase font-bold border-purple-200 ${isModuleUnlocked ? 'text-purple-700 dark:text-purple-400' : 'text-muted-foreground border-muted-foreground/30'}`}>
                              Module {idx + 1}
                            </Badge>
                            {mod.durationHours && (
                              <Badge variant="secondary" className="text-[10px] text-muted-foreground bg-muted/60">
                                {mod.durationHours} Hours
                              </Badge>
                            )}
                            {!isModuleUnlocked && (
                              <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground gap-1 border-muted-foreground/30">
                                <Lock className="w-3 h-3" /> Locked
                              </Badge>
                            )}
                          </div>
                          <h3 className={`text-lg font-bold leading-snug ${isModuleUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>{mod.title}</h3>
                          {mod.description && (
                            <p className="text-sm text-muted-foreground max-w-3xl">
                              {mod.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
                        <span className={`flex items-center gap-1 font-medium ${isModuleUnlocked ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'}`}>
                          <BookOpen className="w-3.5 h-3.5" />
                          {mod.topics?.length || 0} Topics
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className={`flex items-center gap-1 font-medium ${isModuleUnlocked ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                          <Video className="w-3.5 h-3.5" />
                          {recordedCount} Recorded
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className={`flex items-center gap-1 font-medium ${isModuleUnlocked ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          {liveCount} Live Sessions
                        </span>
                        {(modMaterials.length > 0 || modAssessments.length > 0) && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className={`flex items-center gap-1 font-medium ${isModuleUnlocked ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground'}`}>
                              <FileText className="w-3.5 h-3.5" />
                              {modMaterials.length} Materials
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className={`flex items-center gap-1 font-medium ${isModuleUnlocked ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                              <ClipboardList className="w-3.5 h-3.5" />
                              {modAssessments.length} Assessments
                            </span>
                          </>
                        )}
                      </div>
                    </CardHeader>

                    {mod.topics && mod.topics.length > 0 && isModuleUnlocked && (
                      <div className="px-4 py-3 bg-muted/10 border-b">
                        <h5 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                          Syllabus / Concepts Covered
                        </h5>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                          {mod.topics.map((t, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <div className="w-1 h-1 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                              <span className="leading-relaxed">{t}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <CardContent className="p-0">
                      <div className="flex flex-col">
                        <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center justify-between">
                          <h5 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            Class Sessions & Assets
                          </h5>
                        </div>

                        {modClasses.length === 0 ? (
                          <div className="p-6 text-center">
                            <p className="text-xs text-muted-foreground">No classes scheduled yet.</p>
                          </div>
                        ) : (
                          <div className="divide-y">
                            {modClasses.map((cls, cIdx) => {
                              const isClassUnlocked = unlockedClassIds.has(cls.id);
                              const isRecorded = cls.recordingUrl || (!cls.meetingLink && center?.type === 'ONLINE');
                              const classMats = materials.filter((m) => m.chapterOrTopic === cls.title);
                              const classAsses = assessments.filter((a) => a.module === cls.title);

                              return (
                                <div key={cls.id || cIdx} className={`p-4 transition-colors group ${isClassUnlocked ? 'bg-background hover:bg-muted/10' : 'bg-muted/10 opacity-70 grayscale-[30%]'}`}>
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 overflow-hidden">
                                      {isRecorded ? (
                                        <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${isClassUnlocked ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-muted text-muted-foreground'}`}>
                                          <Play className="w-4 h-4 fill-current" />
                                        </div>
                                      ) : (
                                        <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${isClassUnlocked ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                                          <Video className="w-4 h-4" />
                                        </div>
                                      )}
                                      <div className="truncate">
                                        <p className={`font-medium truncate ${isClassUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>{cls.title}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                          <span className="font-medium">
                                            {isRecorded ? '🎥 Recorded Video' : '📡 Live Interactive Class'}
                                          </span>
                                          {!isRecorded && cls.startTime && (
                                            <span>
                                              • {new Date(cls.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                          )}
                                          {cls.myAttendance && (
                                            <Badge variant="outline" className="text-[9px] h-4 py-0 text-emerald-600 border-emerald-200 bg-emerald-50/50">
                                              Completed
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="shrink-0 ml-2 flex items-center gap-1.5">
                                      {!isClassUnlocked ? (
                                        <Badge variant="outline" className="text-xs gap-1 py-1 px-2 border-muted-foreground/30 text-muted-foreground">
                                          <Lock className="w-3 h-3" /> Locked
                                        </Badge>
                                      ) : isRecorded && cls.recordingUrl ? (
                                        <a
                                          href={cls.recordingUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[11px] text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 font-medium bg-purple-50 dark:bg-purple-950/40 px-2 py-1 rounded ml-1"
                                          onClick={() => {
                                            if (!cls.myAttendance) handleRegisterAttendance(cls.id);
                                          }}
                                        >
                                          Watch Video <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      ) : cls.meetingLink ? (
                                        <a
                                          href={cls.meetingLink}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[11px] text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 font-medium bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded ml-1"
                                          onClick={() => {
                                            if (!cls.myAttendance) handleRegisterAttendance(cls.id);
                                          }}
                                        >
                                          Join Live <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      ) : null}
                                    </div>
                                  </div>

                                  {isClassUnlocked && (classMats.length > 0 || classAsses.length > 0) && (
                                    <div className="mt-3 ml-11 pl-3 border-l-2 border-muted-foreground/10 space-y-2">
                                      {classMats.map((mat) => (
                                        <div key={mat.id} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-muted group/item">
                                          <div className="flex items-center gap-2 truncate text-muted-foreground">
                                            {mat.type === 'VIDEO' ? <Play className="w-3.5 h-3.5 text-blue-500 fill-current" /> : <File className="w-3.5 h-3.5 text-blue-500" />}
                                            <span className="truncate">{mat.title}</span>
                                          </div>
                                          <a href={mat.mediaUrl} target="_blank" rel="noreferrer" className="shrink-0">
                                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-600 px-2 group-hover/item:bg-blue-100">
                                              <Download className="w-3 h-3 mr-1" /> View
                                            </Button>
                                          </a>
                                        </div>
                                      ))}

                                      {classAsses.map((assess) => (
                                        <div key={assess.id} className="flex items-center justify-between text-xs p-2 rounded-md bg-amber-50/50 hover:bg-amber-100/50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border border-transparent hover:border-amber-200/50 group/item">
                                          <div className="flex items-center gap-2 truncate text-amber-700 dark:text-amber-400 font-medium">
                                            <ClipboardList className="w-3.5 h-3.5" />
                                            <span className="truncate">{assess.title}</span>
                                            <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-amber-300">
                                              {assess.assessmentType}
                                            </Badge>
                                          </div>
                                          {assess.questionPaperUrl && (
                                            <a href={assess.questionPaperUrl} target="_blank" rel="noreferrer" className="shrink-0">
                                              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-amber-700 px-2 group-hover/item:bg-amber-200/50">
                                                <ExternalLink className="w-3 h-3 mr-1" /> Open Task
                                              </Button>
                                            </a>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* VIDEO PLAYER MODAL */}
      <Dialog open={!!selectedVideoUrl} onOpenChange={() => setSelectedVideoUrl(null)}>
        <DialogContent className="max-w-4xl p-4">
          <DialogHeader>
            <DialogTitle>Video Lecture Player</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center">
            {selectedVideoUrl?.includes('youtube.com') || selectedVideoUrl?.includes('youtu.be') ? (
              <iframe
                src={selectedVideoUrl.replace('watch?v=', 'embed/')}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={selectedVideoUrl || ''} controls autoPlay className="w-full h-full" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
