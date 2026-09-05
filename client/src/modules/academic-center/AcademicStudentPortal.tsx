import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Video, 
  FileText, 
  Calendar, 
  GraduationCap, 
  Globe, 
  MapPin, 
  Clock, 
  Users, 
  Play, 
  Download, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  UserCheck, 
  Mail, 
  Phone,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { 
  CenterProgram, 
  CenterClassSchedule, 
  CenterMaterial, 
  AcademicCenter 
} from './types';

export function AcademicStudentPortal() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'videos' | 'materials'>('overview');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [classes, setClasses] = useState<CenterClassSchedule[]>([]);
  const [materials, setMaterials] = useState<CenterMaterial[]>([]);
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
      const [dashRes, classRes, matRes] = await Promise.all([
        api.get('/academic-center/student-portal/dashboard'),
        api.get('/academic-center/student-portal/classes'),
        api.get('/academic-center/student-portal/materials'),
      ]);

      if (dashRes.data.success) {
        setDashboardData(dashRes.data.data);
      }
      if (classRes.data.success) {
        setClasses(classRes.data.data || []);
      }
      if (matRes.data.success) {
        setMaterials(matRes.data.data || []);
      }
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

  const videoMaterials = materials.filter((m) => m.type === 'VIDEO' || m.type === 'RECORDED_CLASS');
  const documentMaterials = materials.filter((m) => m.type === 'DOCUMENT' || m.type === 'EBOOK' || m.type === 'SYLLABUS');

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

          {/* Center Details / Counselor Card */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs space-y-2 shrink-0 md:max-w-xs">
            <div className="flex items-center gap-2 font-semibold text-indigo-200">
              <UserCheck className="w-4 h-4 text-indigo-300" />
              <span>Academic Center Info</span>
            </div>
            <p className="text-white/90">
              {center?.type === 'OFFLINE' ? (
                <span>Campus: {center.address || center.city || 'Main Campus'}</span>
              ) : (
                <span>Platform: {center?.meetingPlatform || 'Online Portal'}</span>
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
        <TabsList className="bg-muted/70 p-1">
          <TabsTrigger value="overview" className="gap-2 text-xs py-2 px-4">
            <BookOpen className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="classes" className="gap-2 text-xs py-2 px-4">
            <Calendar className="w-4 h-4" />
            My Classes ({classes.length})
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-2 text-xs py-2 px-4">
            <Video className="w-4 h-4" />
            Video Lectures ({videoMaterials.length})
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2 text-xs py-2 px-4">
            <FileText className="w-4 h-4" />
            Study Materials ({documentMaterials.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Upcoming Classes Banner */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Upcoming Classes & Live Sessions
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('classes')} className="text-xs">
                View All
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
                        {cls.type === 'ONLINE_LIVE_CLASS' ? (
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
                        {cls.type === 'ONLINE_LIVE_CLASS' || cls.meetingLink ? (
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
                              {markingAttendance === cls.id ? 'Marking...' : 'Register Attendance (Online)'}
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

                          {cls.meetingLink ? (
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

          {/* Enrolled Programs */}
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

                    <CardContent className="p-4 pt-2 space-y-3">
                      {prog.teacher && (
                        <div className="p-2.5 rounded-lg bg-muted/40 border text-xs flex items-center gap-2.5">
                          <div className="p-2 bg-primary/10 rounded-full text-primary">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Instructor</p>
                            <p className="font-semibold text-foreground">{prog.teacher.name}</p>
                            {prog.teacher.specialization && (
                              <p className="text-[11px] text-muted-foreground">{prog.teacher.specialization}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                        <span>{prog._count?.materials || 0} Learning Materials</span>
                        <span>{prog._count?.schedules || 0} Classes</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 2. MY CLASSES TAB */}
        <TabsContent value="classes" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Class Schedule</h3>
              <p className="text-xs text-muted-foreground">Access your online live classes or find your offline lecture rooms.</p>
            </div>
          </div>

          {classes.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No classes scheduled yet.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {classes.map((cls) => (
                <Card key={cls.id} className="border hover:border-primary/40 transition-all">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {cls.type === 'ONLINE_LIVE_CLASS' ? (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-[10px] gap-1">
                            <Video className="w-3 h-3" /> Live Online Class
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px] gap-1">
                            <MapPin className="w-3 h-3" /> Offline Lecture
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {cls.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          • {cls.program?.university ? `[${cls.program.university.name}] ` : ''}{cls.program?.name}
                        </span>
                      </div>

                      <h4 className="font-semibold text-base">{cls.title}</h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          {new Date(cls.startTime).toLocaleString()} - {new Date(cls.endTime).toLocaleTimeString()}
                        </span>
                        {cls.teacher && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            Instructor: {cls.teacher.name}
                          </span>
                        )}
                        {cls.roomOrLocation && (
                          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                            <MapPin className="w-3.5 h-3.5" />
                            Classroom: {cls.roomOrLocation}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {cls.type === 'ONLINE_LIVE_CLASS' ? (
                        cls.myAttendance ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs gap-1 py-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Attendance: {cls.myAttendance.status}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={markingAttendance === cls.id}
                            onClick={() => handleRegisterAttendance(cls.id)}
                            className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10 font-medium"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {markingAttendance === cls.id ? 'Marking...' : 'Register Attendance'}
                          </Button>
                        )
                      ) : (
                        cls.myAttendance ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs gap-1 py-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Teacher Marked: {cls.myAttendance.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[11px] font-normal py-1">
                            <MapPin className="w-3 h-3 mr-1 text-primary" />
                            Campus Class (Teacher Marks)
                          </Badge>
                        )
                      )}

                      {cls.meetingLink && (
                        <a
                          href={cls.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            if (!cls.myAttendance) handleRegisterAttendance(cls.id);
                          }}
                        >
                          <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Join Live Class
                          </Button>
                        </a>
                      )}
                      {cls.meetingPassword && (
                        <div className="text-[11px] bg-muted/60 px-2 py-1 rounded border">
                          Pass: <strong>{cls.meetingPassword}</strong>
                        </div>
                      )}
                      {cls.recordingUrl && (
                        <a href={cls.recordingUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                            <Play className="w-3.5 h-3.5" />
                            Watch Recording
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 3. VIDEO LECTURES TAB */}
        <TabsContent value="videos" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Recorded Video Lectures</h3>
              <p className="text-xs text-muted-foreground">Watch on-demand lectures and course tutorials anytime.</p>
            </div>
          </div>

          {videoMaterials.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Video className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No video lectures available yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videoMaterials.map((vid) => (
                <Card key={vid.id} className="border hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
                  <div className="aspect-video bg-muted/70 relative flex items-center justify-center cursor-pointer group" onClick={() => setSelectedVideoUrl(vid.mediaUrl)}>
                    <div className="w-12 h-12 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                      <Play className="w-5 h-5 ml-0.5 fill-white" />
                    </div>
                    {vid.duration && (
                      <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                        {vid.duration} mins
                      </span>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-2">
                    <span className="text-[11px] text-primary font-medium">{vid.chapterOrTopic || 'Lecture'}</span>
                    <h4 className="font-semibold text-base leading-snug">{vid.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      Course: {vid.program?.university ? `[${vid.program.university.name}] ` : ''}{vid.program?.name}
                    </p>
                    {vid.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{vid.description}</p>
                    )}

                    <div className="pt-2 border-t flex items-center justify-between">
                      <Button
                        size="sm"
                        onClick={() => setSelectedVideoUrl(vid.mediaUrl)}
                        className="w-full text-xs h-8 gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Watch Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 4. STUDY MATERIALS & DOCUMENTS TAB */}
        <TabsContent value="materials" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Study Materials & Notes</h3>
              <p className="text-xs text-muted-foreground">Download lecture notes, PDFs, syllabus, and e-books.</p>
            </div>
          </div>

          {documentMaterials.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No study documents uploaded yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentMaterials.map((doc) => (
                <Card key={doc.id} className="border hover:shadow-md transition-all">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">{doc.type}</span>
                        <h4 className="font-semibold text-sm leading-tight">{doc.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {doc.program?.university ? `[${doc.program.university.name}] ` : ''}{doc.program?.name}
                        </p>
                      </div>
                    </div>

                    {doc.chapterOrTopic && (
                      <Badge variant="secondary" className="text-[10px]">
                        {doc.chapterOrTopic}
                      </Badge>
                    )}

                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                      <a href={doc.mediaUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5 text-blue-600">
                          <Download className="w-3.5 h-3.5" />
                          View / Download
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
