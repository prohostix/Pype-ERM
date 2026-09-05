import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Users,
  Calendar,
  Clock,
  BookOpen,
  UserCheck,
  Video,
  MapPin,
  Globe,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  RefreshCw,
  Building2,
  Filter,
  Check,
  X,
  MessageSquare,
  Tag,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  CheckCheck,
  FileText,
  UserX,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface TeacherStats {
  totalPrograms: number;
  totalClasses: number;
  todayClassesCount: number;
  totalMonitoredStudents: number;
  overallAttendanceRate: number;
}

interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  specialization?: string | null;
  bio?: string | null;
  center?: {
    id: string;
    name: string;
    code: string;
    type: 'OFFLINE' | 'ONLINE';
    city?: string;
    state?: string;
  };
}

interface ClassItem {
  id: string;
  title: string;
  type: 'ONLINE_LIVE_CLASS' | 'OFFLINE_LECTURE';
  startTime: string;
  endTime: string;
  meetingLink?: string;
  meetingPassword?: string;
  roomOrLocation?: string;
  recordingUrl?: string;
  notes?: string;
  status: string;
  program?: {
    id: string;
    name: string;
    code: string;
    university?: {
      id: string;
      name: string;
      code: string;
    };
  };
  attendances?: Array<{
    id: string;
    status: 'PRESENT' | 'ABSENT';
    studentEmail: string;
    markedBy: string;
  }>;
}

interface MonitoredStudent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  studentCode: string;
  source: string;
  programName: string;
  programCode: string;
  universityName?: string;
  enrolledAt: string;
  totalClassesConducted: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
  status: string;
}

export default function TeacherPortal() {
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'students' | 'programs'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [stats, setStats] = useState<TeacherStats>({
    totalPrograms: 0,
    totalClasses: 0,
    todayClassesCount: 0,
    totalMonitoredStudents: 0,
    overallAttendanceRate: 100,
  });
  const [upcomingClasses, setUpcomingClasses] = useState<ClassItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<MonitoredStudent[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);

  // Class filtering
  const [classFilter, setClassFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');
  const [classSearch, setClassSearch] = useState('');

  // Student filtering
  const [studentSearch, setStudentSearch] = useState('');
  const [studentAttendanceFilter, setStudentAttendanceFilter] = useState<'all' | 'good' | 'at_risk'>('all');

  // Attendance Sheet Modal
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [studentSheet, setStudentSheet] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalStatusFilter, setModalStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'WITH_NOTES'>('ALL');
  const [modalSortBy, setModalSortBy] = useState<'name' | 'code' | 'status'>('name');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const QUICK_REMARKS = ['Late (10m)', 'Late (15m+)', 'Medical Leave', 'Permitted', 'Informed Faculty', 'Left Early'];

  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-violet-500 to-purple-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-cyan-500 to-blue-600',
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const getInitials = (name: string) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const loadDashboard = async () => {
    try {
      const res = await api.get('/academic-center/teacher-portal/dashboard');
      if (res.data.success) {
        setTeacher(res.data.data.teacher);
        setStats(res.data.data.stats);
        setUpcomingClasses(res.data.data.upcomingClasses || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load teacher dashboard');
    }
  };

  const loadClasses = async () => {
    try {
      const res = await api.get('/academic-center/teacher-portal/classes', {
        params: { filter: classFilter },
      });
      if (res.data.success) {
        setClasses(res.data.data);
      }
    } catch (err: any) {
      console.error('Error loading classes:', err);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await api.get('/academic-center/teacher-portal/students');
      if (res.data.success) {
        setStudents(res.data.data);
      }
    } catch (err: any) {
      console.error('Error loading students:', err);
    }
  };

  const loadPrograms = async () => {
    try {
      const res = await api.get('/academic-center/teacher-portal/programs');
      if (res.data.success) {
        setPrograms(res.data.data);
      }
    } catch (err: any) {
      console.error('Error loading programs:', err);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboard(), loadClasses(), loadStudents(), loadPrograms()]);
    setRefreshing(false);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadDashboard(), loadClasses(), loadStudents(), loadPrograms()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadClasses();
    }
  }, [classFilter]);

  // Open Attendance Sheet
  const handleOpenAttendance = async (cls: ClassItem) => {
    setSelectedClass(cls);
    setAttendanceModalOpen(true);
    setAttendanceLoading(true);
    setModalSearch('');
    setModalStatusFilter('ALL');
    setModalSortBy('name');
    setExpandedNotes({});
    try {
      const res = await api.get(`/academic-center/teacher-portal/classes/${cls.id}/attendance`);
      if (res.data.success) {
        setStudentSheet(res.data.data.students || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load attendance sheet');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleMarkAll = (status: 'PRESENT' | 'ABSENT') => {
    setStudentSheet((prev) => prev.map((s) => ({ ...s, status })));
    toast.info(`Marked all students as ${status.toLowerCase()}`);
  };

  const handleInvertAttendance = () => {
    setStudentSheet((prev) =>
      prev.map((s) => ({
        ...s,
        status: s.status === 'PRESENT' ? 'ABSENT' : 'PRESENT',
      }))
    );
    toast.info('Attendance selection inverted');
  };

  const toggleStudentStatus = (email: string, status: 'PRESENT' | 'ABSENT') => {
    setStudentSheet((prev) =>
      prev.map((s) => (s.email.toLowerCase() === email.toLowerCase() ? { ...s, status } : s))
    );
  };

  const updateStudentNote = (email: string, notes: string) => {
    setStudentSheet((prev) =>
      prev.map((s) => (s.email.toLowerCase() === email.toLowerCase() ? { ...s, notes } : s))
    );
  };

  const appendQuickRemark = (email: string, remark: string) => {
    setStudentSheet((prev) =>
      prev.map((s) => {
        if (s.email.toLowerCase() !== email.toLowerCase()) return s;
        const currentNote = s.notes ? s.notes.trim() : '';
        const newNote = currentNote ? `${currentNote}, ${remark}` : remark;
        return { ...s, notes: newNote };
      })
    );
  };

  const toggleExpandNote = (email: string) => {
    setExpandedNotes((prev) => ({
      ...prev,
      [email]: !prev[email],
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass) return;
    setAttendanceSaving(true);
    try {
      const payload = {
        attendances: studentSheet.map((s) => ({
          studentId: s.id,
          studentEmail: s.email,
          studentName: s.name,
          status: s.status,
          notes: s.notes,
        })),
      };
      const res = await api.post(`/academic-center/teacher-portal/classes/${selectedClass.id}/attendance`, payload);
      if (res.data.success) {
        toast.success(res.data.message || 'Attendance saved successfully!');
        setAttendanceModalOpen(false);
        refreshAll();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setAttendanceSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading Teacher Portal & Student Monitoring...</p>
      </div>
    );
  }

  // Filtered lists
  const filteredClasses = classes.filter((c) => {
    if (!classSearch) return true;
    const q = classSearch.toLowerCase().trim();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.program?.name && c.program.name.toLowerCase().includes(q)) ||
      (c.roomOrLocation && c.roomOrLocation.toLowerCase().includes(q))
    );
  });

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      !studentSearch ||
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.programName.toLowerCase().includes(studentSearch.toLowerCase());

    const matchesAttendance =
      studentAttendanceFilter === 'all' ||
      (studentAttendanceFilter === 'good' && s.attendanceRate >= 75) ||
      (studentAttendanceFilter === 'at_risk' && s.attendanceRate < 75);

    return matchesSearch && matchesAttendance;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. TEACHER HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-background border p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
              {teacher?.name?.slice(0, 2).toUpperCase() || 'TR'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{teacher?.name}</h1>
                <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                  {teacher?.specialization || 'Faculty Instructor'}
                </Badge>
                {teacher?.center && (
                  <Badge variant="outline" className="text-xs gap-1 py-0.5">
                    {teacher.center.type === 'ONLINE' ? (
                      <Globe className="w-3 h-3 text-blue-500" />
                    ) : (
                      <MapPin className="w-3 h-3 text-emerald-600" />
                    )}
                    {teacher.center.name} ({teacher.center.type === 'ONLINE' ? 'Online Center' : 'Campus'})
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                <span>{teacher?.email}</span>
                {teacher?.phone && <span>• {teacher.phone}</span>}
                {teacher?.center?.city && <span>• {teacher.center.city}, {teacher.center.state}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              disabled={refreshing}
              className="gap-2 text-xs"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border shadow-sm hover:border-primary/40 transition-all">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Monitored Students</p>
              <h3 className="text-2xl font-bold">{stats.totalMonitoredStudents}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm hover:border-primary/40 transition-all">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Assigned Programs</p>
              <h3 className="text-2xl font-bold">{stats.totalPrograms}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm hover:border-primary/40 transition-all">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Today's Classes</p>
              <h3 className="text-2xl font-bold">{stats.todayClassesCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm hover:border-primary/40 transition-all">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Class Attendance Rate</p>
              <h3 className="text-2xl font-bold">{stats.overallAttendanceRate}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. MAIN NAVIGATION TABS */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
        <TabsList className="grid grid-cols-4 max-w-2xl bg-muted/40 p-1 border">
          <TabsTrigger value="overview" className="text-xs gap-1.5 py-2">
            <Building2 className="w-3.5 h-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="classes" className="text-xs gap-1.5 py-2">
            <Calendar className="w-3.5 h-3.5" />
            Classes & Attendance
          </TabsTrigger>
          <TabsTrigger value="students" className="text-xs gap-1.5 py-2">
            <Users className="w-3.5 h-3.5" />
            Student Monitoring
          </TabsTrigger>
          <TabsTrigger value="programs" className="text-xs gap-1.5 py-2">
            <BookOpen className="w-3.5 h-3.5" />
            My Programs
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          {/* Today & Upcoming Classes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Upcoming Classes
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('classes')} className="text-xs text-primary">
                  View All Classes →
                </Button>
              </div>

              {upcomingClasses.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <Calendar className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium">No upcoming classes scheduled</p>
                  <p className="text-xs text-muted-foreground mt-1">Check the Classes tab or consult the counselor.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {upcomingClasses.map((cls) => {
                    const isOnline = cls.type === 'ONLINE_LIVE_CLASS';
                    const presentCount = cls.attendances?.filter((a) => a.status === 'PRESENT').length || 0;

                    return (
                      <Card key={cls.id} className="p-4 border hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm">{cls.title}</h4>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] py-0 px-1.5",
                                isOnline
                                  ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              )}
                            >
                              {isOnline ? 'Online Class' : 'Campus Lecture'}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            {cls.program?.university && `[${cls.program.university.name}] `}
                            {cls.program?.name} ({cls.program?.code})
                          </p>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <Calendar className="w-3.5 h-3.5 text-primary" />
                              {new Date(cls.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(cls.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(cls.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span>
                              {isOnline ? 'Zoom / Meet' : (cls.roomOrLocation || 'Campus Classroom')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isOnline && cls.meetingLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(cls.meetingLink, '_blank')}
                              className="h-8 text-xs gap-1.5 text-blue-600 hover:bg-blue-50"
                            >
                              <Video className="w-3.5 h-3.5" />
                              Start Class
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleOpenAttendance(cls)}
                            className="h-8 text-xs gap-1.5 bg-primary text-white"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {presentCount > 0 ? `Attendance (${presentCount})` : 'Take Attendance'}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Student Health Snapshot */}
            <div className="space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Student Health Overview
              </h3>

              <Card className="p-4 border space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Good Attendance (&gt;= 75%)</span>
                  <span className="font-semibold text-emerald-600">
                    {students.filter((s) => s.attendanceRate >= 75).length} students
                  </span>
                </div>
                <Progress
                  value={students.length > 0 ? (students.filter((s) => s.attendanceRate >= 75).length / students.length) * 100 : 100}
                  className="h-2 bg-muted"
                />

                <div className="flex items-center justify-between text-xs pt-2 border-t">
                  <span className="text-muted-foreground">Attention Needed (&lt; 75%)</span>
                  <span className="font-semibold text-destructive">
                    {students.filter((s) => s.attendanceRate < 75).length} students
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStudentAttendanceFilter('at_risk');
                    setActiveTab('students');
                  }}
                  className="w-full text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  View At-Risk Students →
                </Button>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: CLASSES & ATTENDANCE */}
        <TabsContent value="classes" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant={classFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setClassFilter('all')}
                className="h-7 text-xs"
              >
                All Classes
              </Button>
              <Button
                size="sm"
                variant={classFilter === 'today' ? 'default' : 'outline'}
                onClick={() => setClassFilter('today')}
                className="h-7 text-xs"
              >
                Today
              </Button>
              <Button
                size="sm"
                variant={classFilter === 'upcoming' ? 'default' : 'outline'}
                onClick={() => setClassFilter('upcoming')}
                className="h-7 text-xs"
              >
                Upcoming
              </Button>
              <Button
                size="sm"
                variant={classFilter === 'past' ? 'default' : 'outline'}
                onClick={() => setClassFilter('past')}
                className="h-7 text-xs"
              >
                Past / Completed
              </Button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search class or program..."
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          </div>

          {filteredClasses.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No classes found matching criteria</p>
              <p className="text-xs text-muted-foreground mt-1">Try changing your search or filter.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClasses.map((cls) => {
                const isOnline = cls.type === 'ONLINE_LIVE_CLASS';
                const presentCount = cls.attendances?.filter((a) => a.status === 'PRESENT').length || 0;
                const totalAttendanceRecords = cls.attendances?.length || 0;

                return (
                  <Card key={cls.id} className="border hover:shadow-md transition-all flex flex-col justify-between">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] mb-1 font-semibold",
                              isOnline
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            )}
                          >
                            {isOnline ? 'Online Live Class' : 'Campus Classroom'}
                          </Badge>
                          <h4 className="font-semibold text-base leading-snug">{cls.title}</h4>
                          <p className="text-xs text-primary font-medium mt-0.5">
                            {cls.program?.university && `[${cls.program.university.name}] `}
                            {cls.program?.name}
                          </p>
                        </div>

                        {totalAttendanceRecords > 0 && (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            {presentCount} Present
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      <div className="p-2.5 rounded-lg bg-muted/40 border text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            {new Date(cls.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(cls.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(cls.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          {isOnline ? (
                            <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          <span className="truncate">
                            {isOnline ? (cls.meetingLink ? 'Online Link Provided' : 'Live Platform') : (cls.roomOrLocation || 'Physical Campus Room')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {isOnline && cls.meetingLink && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(cls.meetingLink, '_blank')}
                            className="h-8 text-xs flex-1 gap-1 text-blue-600 hover:bg-blue-50"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Open Class
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOpenAttendance(cls)}
                          className={cn(
                            "h-8 text-xs flex-1 gap-1.5 text-white",
                            totalAttendanceRecords > 0 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary"
                          )}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          {totalAttendanceRecords > 0 ? 'Edit Attendance' : 'Mark Attendance'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: STUDENT MONITORING */}
        <TabsContent value="students" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant={studentAttendanceFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStudentAttendanceFilter('all')}
                className="h-7 text-xs"
              >
                All Students ({students.length})
              </Button>
              <Button
                size="sm"
                variant={studentAttendanceFilter === 'good' ? 'default' : 'outline'}
                onClick={() => setStudentAttendanceFilter('good')}
                className="h-7 text-xs text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30"
              >
                Good (&gt;= 75%)
              </Button>
              <Button
                size="sm"
                variant={studentAttendanceFilter === 'at_risk' ? 'default' : 'outline'}
                onClick={() => setStudentAttendanceFilter('at_risk')}
                className="h-7 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                At Risk (&lt; 75%)
              </Button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student name, code, email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No students found matching filter</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((s) => {
                const isGood = s.attendanceRate >= 75;
                const isWarning = s.attendanceRate >= 50 && s.attendanceRate < 75;

                return (
                  <Card key={s.id + s.email} className="border hover:shadow-md transition-all flex flex-col justify-between">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <h4 className="font-semibold text-sm text-foreground">{s.name}</h4>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                              {s.studentCode}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">{s.source}</span>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold py-0.5 px-2",
                            isGood
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : isWarning
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : "bg-destructive/10 text-destructive border-destructive/30"
                          )}
                        >
                          {s.attendanceRate}% Attendance
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      {/* Attendance Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Attended: {s.presentCount} of {s.totalClassesConducted} classes</span>
                          <span>{isGood ? 'Good Standing' : isWarning ? 'Needs Attention' : 'Critical'}</span>
                        </div>
                        <Progress
                          value={s.attendanceRate}
                          className={cn(
                            "h-1.5",
                            isGood ? "[&>div]:bg-emerald-500" : isWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-destructive"
                          )}
                        />
                      </div>

                      <div className="p-2.5 rounded-lg bg-muted/30 border text-xs space-y-1">
                        <p className="text-muted-foreground truncate">
                          <span className="font-medium text-foreground">Program: </span>
                          {s.universityName ? `[${s.universityName}] ` : ''}{s.programName}
                        </p>
                        <p className="text-muted-foreground truncate">
                          <span className="font-medium text-foreground">Email: </span>
                          {s.email}
                        </p>
                        {s.phone && (
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Phone: </span>
                            {s.phone}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 4: MY PROGRAMS */}
        <TabsContent value="programs" className="space-y-4">
          {programs.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No programs assigned to your instructor profile</p>
              <p className="text-xs text-muted-foreground mt-1">Contact the Academic Counselor to allocate programs to your profile.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map((prog) => (
                <Card key={prog.id} className="border hover:shadow-md transition-all flex flex-col justify-between">
                  <CardHeader className="p-4 pb-2">
                    {prog.university && (
                      <Badge variant="outline" className="text-[10px] w-fit mb-1 bg-primary/5 text-primary border-primary/20">
                        {prog.university.name}
                      </Badge>
                    )}
                    <h4 className="font-semibold text-base leading-snug">{prog.name}</h4>
                    <p className="text-xs text-muted-foreground font-mono">Code: {prog.code}</p>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-muted/40 rounded-lg border">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Classes</span>
                        <span className="font-bold text-foreground">{prog._count?.centerClassSchedules ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Direct Students</span>
                        <span className="font-bold text-foreground">{prog._count?.students ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Center Enrolled</span>
                        <span className="font-bold text-foreground">{prog._count?.centerEnrollments ?? 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 4. INTERACTIVE ATTENDANCE SHEET MODAL */}
      <Dialog open={attendanceModalOpen} onOpenChange={setAttendanceModalOpen}>
        <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl border">
          {/* Header */}
          <DialogHeader className="p-5 border-b pb-4 bg-gradient-to-r from-background via-muted/20 to-background">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                    <UserCheck className="w-5 h-5 text-primary" />
                    {selectedClass?.type === 'OFFLINE_LECTURE' ? 'Offline Campus Attendance Sheet' : 'Class Attendance Sheet'}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs px-2.5 py-0.5 font-medium shrink-0",
                      selectedClass?.type === 'ONLINE_LIVE_CLASS'
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    )}
                  >
                    {selectedClass?.type === 'ONLINE_LIVE_CLASS' ? (
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3" /> Online Class
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Campus Lecture
                      </span>
                    )}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  {selectedClass?.type === 'OFFLINE_LECTURE'
                    ? 'Mark in-person classroom attendance for your faculty records.'
                    : 'Review student attendance records or update status.'}
                </DialogDescription>
              </div>

              {/* Attendance Meter Pill */}
              <div className="flex items-center gap-3 bg-muted/40 p-2.5 rounded-xl border shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Attendance Rate</span>
                  <span className={cn(
                    "text-lg font-extrabold leading-none",
                    studentSheet.length > 0 && Math.round((studentSheet.filter((s) => s.status === 'PRESENT').length / studentSheet.length) * 100) >= 75
                      ? "text-emerald-600 dark:text-emerald-400"
                      : studentSheet.length > 0 && Math.round((studentSheet.filter((s) => s.status === 'PRESENT').length / studentSheet.length) * 100) >= 50
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}>
                    {studentSheet.length > 0 ? Math.round((studentSheet.filter((s) => s.status === 'PRESENT').length / studentSheet.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-16 sm:w-24 space-y-1">
                  <Progress
                    value={studentSheet.length > 0 ? Math.round((studentSheet.filter((s) => s.status === 'PRESENT').length / studentSheet.length) * 100) : 0}
                    className={cn(
                      "h-2.5 bg-muted",
                      studentSheet.length > 0 && Math.round((studentSheet.filter((s) => s.status === 'PRESENT').length / studentSheet.length) * 100) >= 75
                        ? "[&>div]:bg-emerald-500"
                        : studentSheet.length > 0 && Math.round((studentSheet.filter((s) => s.status === 'PRESENT').length / studentSheet.length) * 100) >= 50
                        ? "[&>div]:bg-amber-500"
                        : "[&>div]:bg-rose-500"
                    )}
                  />
                  <span className="text-[10px] text-muted-foreground block text-center font-medium">
                    {studentSheet.filter((s) => s.status === 'PRESENT').length}/{studentSheet.length} Present
                  </span>
                </div>
              </div>
            </div>

            {selectedClass && (
              <div className="mt-3.5 p-3 rounded-xl bg-muted/30 border text-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Class Title</span>
                  <span className="font-semibold text-foreground truncate block">{selectedClass.title}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Program</span>
                  <span className="font-semibold text-primary truncate block">
                    {selectedClass.program?.university ? `[${selectedClass.program.university.name}] ` : ''}
                    {selectedClass.program?.name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Date & Time</span>
                  <span className="text-foreground font-medium">
                    {new Date(selectedClass.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Location / Venue</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedClass.roomOrLocation || 'Campus Classroom'}
                  </span>
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Quick Actions & Filter Bar */}
          <div className="px-5 py-3 bg-muted/20 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant={modalStatusFilter === 'ALL' ? 'default' : 'outline'}
                onClick={() => setModalStatusFilter('ALL')}
                className="h-7 text-xs px-2.5 gap-1 font-medium"
              >
                All ({studentSheet.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={modalStatusFilter === 'PRESENT' ? 'default' : 'outline'}
                onClick={() => setModalStatusFilter('PRESENT')}
                className={cn(
                  "h-7 text-xs px-2.5 gap-1 font-medium",
                  modalStatusFilter === 'PRESENT'
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                )}
              >
                <Check className="w-3 h-3" />
                Present ({studentSheet.filter((s) => s.status === 'PRESENT').length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={modalStatusFilter === 'ABSENT' ? 'default' : 'outline'}
                onClick={() => setModalStatusFilter('ABSENT')}
                className={cn(
                  "h-7 text-xs px-2.5 gap-1 font-medium",
                  modalStatusFilter === 'ABSENT'
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                )}
              >
                <X className="w-3 h-3" />
                Absent ({studentSheet.filter((s) => s.status === 'ABSENT').length})
              </Button>
              {studentSheet.filter((s) => s.notes && s.notes.trim().length > 0).length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant={modalStatusFilter === 'WITH_NOTES' ? 'default' : 'outline'}
                  onClick={() => setModalStatusFilter('WITH_NOTES')}
                  className="h-7 text-xs px-2.5 gap-1 font-medium text-primary border-primary/30"
                >
                  <MessageSquare className="w-3 h-3" />
                  With Notes ({studentSheet.filter((s) => s.notes && s.notes.trim().length > 0).length})
                </Button>
              )}
            </div>

            {/* Bulk Fast Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                type="button"
                onClick={() => handleMarkAll('PRESENT')}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1 px-3 shadow-xs"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark All Present
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => handleMarkAll('ABSENT')}
                className="h-7 text-xs text-rose-600 dark:text-rose-400 border-rose-500/40 hover:bg-rose-500/10 font-medium gap-1 px-3"
              >
                <UserX className="w-3.5 h-3.5" />
                Mark All Absent
              </Button>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                onClick={handleInvertAttendance}
                title="Invert Present / Absent status"
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
              >
                <RotateCcw className="w-3 h-3" />
                Invert
              </Button>
            </div>
          </div>

          {/* Search Bar & Sort Dropdown */}
          <div className="px-5 py-2.5 border-b bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student name, code, phone, email, or remarks..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="h-8 pl-8 pr-8 text-xs bg-muted/20"
              />
              {modalSearch && (
                <button
                  type="button"
                  onClick={() => setModalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                <ArrowUpDown className="w-3 h-3" /> Sort:
              </span>
              <div className="inline-flex rounded-md p-0.5 bg-muted/40 border">
                <button
                  type="button"
                  onClick={() => setModalSortBy('name')}
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded font-medium transition-colors",
                    modalSortBy === 'name' ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Name
                </button>
                <button
                  type="button"
                  onClick={() => setModalSortBy('code')}
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded font-medium transition-colors",
                    modalSortBy === 'code' ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Roll No
                </button>
                <button
                  type="button"
                  onClick={() => setModalSortBy('status')}
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded font-medium transition-colors",
                    modalSortBy === 'status' ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Status
                </button>
              </div>

              <span className="text-[11px] text-muted-foreground font-medium pl-1">
                Showing{' '}
                {
                  studentSheet
                    .filter((student) => {
                      if (modalSearch.trim()) {
                        const q = modalSearch.toLowerCase().trim();
                        const matchName = student.name?.toLowerCase().includes(q);
                        const matchEmail = student.email?.toLowerCase().includes(q);
                        const matchCode = student.studentCode?.toLowerCase().includes(q);
                        const matchPhone = student.phone?.toLowerCase().includes(q);
                        const matchNotes = student.notes?.toLowerCase().includes(q);
                        if (!matchName && !matchEmail && !matchCode && !matchPhone && !matchNotes) return false;
                      }
                      if (modalStatusFilter === 'PRESENT') return student.status === 'PRESENT';
                      if (modalStatusFilter === 'ABSENT') return student.status === 'ABSENT';
                      if (modalStatusFilter === 'WITH_NOTES') return !!student.notes && student.notes.trim().length > 0;
                      return true;
                    }).length
                }{' '}
                of {studentSheet.length}
              </span>
            </div>
          </div>

          {/* Students List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {attendanceLoading ? (
              <div className="py-16 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                <p className="text-xs text-muted-foreground">Loading enrolled students...</p>
              </div>
            ) : studentSheet.length === 0 ? (
              <div className="py-16 text-center space-y-2 border border-dashed rounded-xl bg-muted/10">
                <Users className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-semibold">No students found</p>
                <p className="text-xs text-muted-foreground">No students enrolled in this program yet.</p>
              </div>
            ) : (
              studentSheet
                .filter((student) => {
                  if (modalSearch.trim()) {
                    const q = modalSearch.toLowerCase().trim();
                    const matchName = student.name?.toLowerCase().includes(q);
                    const matchEmail = student.email?.toLowerCase().includes(q);
                    const matchCode = student.studentCode?.toLowerCase().includes(q);
                    const matchPhone = student.phone?.toLowerCase().includes(q);
                    const matchNotes = student.notes?.toLowerCase().includes(q);
                    if (!matchName && !matchEmail && !matchCode && !matchPhone && !matchNotes) return false;
                  }
                  if (modalStatusFilter === 'PRESENT') return student.status === 'PRESENT';
                  if (modalStatusFilter === 'ABSENT') return student.status === 'ABSENT';
                  if (modalStatusFilter === 'WITH_NOTES') return !!student.notes && student.notes.trim().length > 0;
                  return true;
                })
                .sort((a, b) => {
                  if (modalSortBy === 'name') return (a.name || '').localeCompare(b.name || '');
                  if (modalSortBy === 'code') return (a.studentCode || '').localeCompare(b.studentCode || '');
                  if (modalSortBy === 'status') {
                    if (a.status === b.status) return (a.name || '').localeCompare(b.name || '');
                    return a.status === 'PRESENT' ? -1 : 1;
                  }
                  return 0;
                })
                .map((student) => {
                  const isPresent = student.status === 'PRESENT';
                  const hasNote = !!student.notes && student.notes.trim().length > 0;
                  const isExpanded = expandedNotes[student.email] || false;

                  return (
                    <div
                      key={student.email}
                      className={cn(
                        "p-3.5 rounded-xl border transition-all duration-200 bg-card hover:shadow-xs",
                        isPresent
                          ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                          : "border-rose-500/30 bg-rose-500/[0.02]"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left: Student Avatar and Info */}
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs bg-gradient-to-br",
                              getAvatarGradient(student.name)
                            )}
                          >
                            {getInitials(student.name)}
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-foreground truncate">{student.name}</span>
                              {student.studentCode && (
                                <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 bg-muted/60">
                                  {student.studentCode}
                                </Badge>
                              )}
                              {student.markedBy === 'STUDENT' ? (
                                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 text-[10px] py-0 px-1.5 gap-1">
                                  <Globe className="w-2.5 h-2.5" /> Online Check-in
                                </Badge>
                              ) : isPresent && student.markedBy === 'TEACHER' ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px] py-0 px-1.5 gap-1">
                                  <ShieldCheck className="w-2.5 h-2.5" /> Verified
                                </Badge>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
                              <span className="truncate">{student.email}</span>
                              {student.phone && <span>• {student.phone}</span>}
                              {student.markedAt && (
                                <span className="text-[11px] text-muted-foreground/80">
                                  • {new Date(student.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Tactile Segmented Toggle & Note trigger */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <div className="inline-flex rounded-lg p-0.5 bg-muted/50 border">
                            <button
                              type="button"
                              onClick={() => toggleStudentStatus(student.email, 'PRESENT')}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                isPresent
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                              )}
                            >
                              <Check className="w-3.5 h-3.5" />
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleStudentStatus(student.email, 'ABSENT')}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                !isPresent
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              )}
                            >
                              <X className="w-3.5 h-3.5" />
                              Absent
                            </button>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleExpandNote(student.email)}
                            className={cn(
                              "h-8 px-2.5 text-xs gap-1",
                              hasNote
                                ? "text-primary font-semibold bg-primary/10 hover:bg-primary/20"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {hasNote ? 'Remark' : '+ Remark'}
                          </Button>
                        </div>
                      </div>

                      {/* Expandable Remarks & Notes */}
                      {(isExpanded || hasNote) && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                            <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium">
                              <Tag className="w-3 h-3 text-primary" /> Quick Remarks:
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {QUICK_REMARKS.map((remark) => (
                                <button
                                  key={remark}
                                  type="button"
                                  onClick={() => appendQuickRemark(student.email, remark)}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors border"
                                >
                                  + {remark}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Input
                            value={student.notes || ''}
                            onChange={(e) => updateStudentNote(student.email, e.target.value)}
                            placeholder="Add specific remarks (e.g. excused absence reason, arrived 15 min late)..."
                            className="h-8 text-xs bg-muted/20"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>

          {/* Sticky Dialog Footer */}
          <DialogFooter className="p-4 border-t bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="font-semibold text-foreground">Summary:</span>
              <span>{studentSheet.filter((s) => s.status === 'PRESENT').length} Present</span>
              <span>•</span>
              <span>{studentSheet.filter((s) => s.status === 'ABSENT').length} Absent</span>
              <span>•</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {studentSheet.length > 0 ? Math.round((studentSheet.filter((s) => s.status === 'PRESENT').length / studentSheet.length) * 100) : 0}% Rate
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAttendanceModalOpen(false)}
                disabled={attendanceSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveAttendance}
                disabled={attendanceSaving || studentSheet.length === 0}
                className="bg-primary hover:bg-primary/90 text-white font-semibold gap-1.5 shadow-sm px-5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {attendanceSaving ? 'Saving Attendance...' : 'Save Attendance Sheet'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
