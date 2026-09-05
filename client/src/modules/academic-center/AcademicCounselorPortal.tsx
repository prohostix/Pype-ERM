import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  Video, 
  FileText, 
  Calendar, 
  Plus, 
  Search, 
  Globe, 
  MapPin, 
  Play, 
  Download, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Trash2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Award,
  Pencil,
  Building2,
  Filter,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { 
  AcademicCenter, 
  CenterProgram, 
  CenterTeacher, 
  CenterMaterial, 
  CenterClassSchedule, 
  CenterStudent,
  University
} from './types';

export function AcademicCounselorPortal() {
  const [centers, setCenters] = useState<AcademicCenter[]>([]);
  const [activeCenterId, setActiveCenterId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'classes' | 'teachers' | 'materials' | 'students'>('classes');

  // Module collections
  const [universities, setUniversities] = useState<University[]>([]);
  const [programs, setPrograms] = useState<CenterProgram[]>([]);
  const [teachers, setTeachers] = useState<CenterTeacher[]>([]);
  const [materials, setMaterials] = useState<CenterMaterial[]>([]);
  const [classes, setClasses] = useState<CenterClassSchedule[]>([]);
  const [students, setStudents] = useState<CenterStudent[]>([]);

  // Filter state for programs
  const [selectedUniFilter, setSelectedUniFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [studentProgramFilter, setStudentProgramFilter] = useState<string>('ALL');

  // Modals state
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [editProgramModalOpen, setEditProgramModalOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // Forms
  const [programForm, setProgramForm] = useState({
    name: '',
    code: '',
    mode: 'ONLINE',
    duration: '6 Months',
    teacherId: '',
    description: '',
  });

  const [editProgramForm, setEditProgramForm] = useState({
    name: '',
    duration: '6 Months',
    mode: 'ONLINE',
    teacherId: '',
    description: '',
    status: 'ACTIVE',
  });

  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    specialization: '',
    bio: '',
  });

  const [materialForm, setMaterialForm] = useState({
    universityId: '',
    programId: '',
    title: '',
    type: 'VIDEO' as 'VIDEO' | 'DOCUMENT' | 'EBOOK',
    mediaUrl: '',
    duration: '45',
    chapterOrTopic: 'Module 1: Foundations',
    description: '',
  });

  const [classForm, setClassForm] = useState({
    universityId: '',
    programId: '',
    title: '',
    type: 'ONLINE_LIVE_CLASS' as 'ONLINE_LIVE_CLASS' | 'OFFLINE_LECTURE',
    startTime: '',
    endTime: '',
    teacherId: '',
    meetingLink: '',
    meetingPassword: '',
    roomOrLocation: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  // Attendance Management Modal
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceClass, setAttendanceClass] = useState<CenterClassSchedule | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [studentSheet, setStudentSheet] = useState<Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    studentCode?: string;
    source?: string;
    status: 'PRESENT' | 'ABSENT';
    markedBy?: string;
    markedAt?: string;
    notes?: string;
  }>>([]);
  const [attendanceSearch, setAttendanceSearch] = useState('');

  const openAttendanceModal = async (cls: CenterClassSchedule) => {
    setAttendanceClass(cls);
    setAttendanceModalOpen(true);
    setAttendanceLoading(true);
    setAttendanceSearch('');
    try {
      const res = await api.get(`/academic-center/classes/${cls.id}/attendance`);
      if (res.data.success && res.data.data) {
        const students = res.data.data.students || [];
        setStudentSheet(
          students.map((s: any) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            phone: s.phone,
            studentCode: s.studentCode,
            source: s.source,
            status: s.attendance?.status || 'PRESENT',
            markedBy: s.attendance?.markedBy,
            markedAt: s.attendance?.markedAt,
            notes: s.attendance?.notes || '',
          }))
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load attendance sheet');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!attendanceClass) return;
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
      const res = await api.post(`/academic-center/classes/${attendanceClass.id}/attendance`, payload);
      if (res.data.success) {
        toast.success(res.data.message || 'Attendance saved successfully!');
        setAttendanceModalOpen(false);
        if (activeCenterId) {
          loadCenterData(activeCenterId);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setAttendanceSaving(false);
    }
  };

  const handleMarkAll = (status: 'PRESENT' | 'ABSENT') => {
    setStudentSheet((prev) => prev.map((s) => ({ ...s, status })));
  };

  const toggleStudentAttendance = (email: string, status: 'PRESENT' | 'ABSENT') => {
    setStudentSheet((prev) =>
      prev.map((s) => (s.email.toLowerCase() === email.toLowerCase() ? { ...s, status } : s))
    );
  };

  useEffect(() => {
    fetchInitialCenters();
  }, []);

  useEffect(() => {
    if (activeCenterId) {
      loadCenterData(activeCenterId);
    }
  }, [activeCenterId]);

  const fetchInitialCenters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/academic-center/counselor/my-centers');
      if (res.data.success && res.data.data?.length > 0) {
        setCenters(res.data.data);
        setActiveCenterId(res.data.data[0].id);
      } else {
        // Fallback: fetch all centers if admin viewing
        const allRes = await api.get('/academic-center/centers');
        if (allRes.data.success && allRes.data.data?.length > 0) {
          setCenters(allRes.data.data);
          setActiveCenterId(allRes.data.data[0].id);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load centers');
    } finally {
      setLoading(false);
    }
  };

  const loadCenterData = async (centerId: string) => {
    try {
      const [uniRes, progRes, teachRes, matRes, clsRes, stuRes] = await Promise.all([
        api.get('/academic-center/universities'),
        api.get(`/academic-center/programs?centerId=${centerId}`),
        api.get(`/academic-center/teachers?centerId=${centerId}`),
        api.get(`/academic-center/materials?centerId=${centerId}`),
        api.get(`/academic-center/classes?centerId=${centerId}`),
        api.get(`/academic-center/students?centerId=${centerId}`),
      ]);

      if (uniRes.data.success) setUniversities(uniRes.data.data || []);
      if (progRes.data.success) setPrograms(progRes.data.data || []);
      if (teachRes.data.success) setTeachers(teachRes.data.data || []);
      if (matRes.data.success) setMaterials(matRes.data.data || []);
      if (clsRes.data.success) setClasses(clsRes.data.data || []);
      if (stuRes.data.success) setStudents(stuRes.data.data || []);
    } catch (err: any) {
      console.error('Error fetching center details:', err);
    }
  };

  const currentCenter = centers.find((c) => c.id === activeCenterId);

  // 1. Create Program (Teacher is optional)
  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programForm.name || !programForm.code) {
      toast.error('Program name and code are required');
      return;
    }

    setSubmitting(true);
    try {
      const selectedTeacherId = programForm.teacherId && programForm.teacherId !== 'none' ? programForm.teacherId : undefined;
      await api.post('/academic-center/programs', {
        ...programForm,
        teacherId: selectedTeacherId,
        centerId: activeCenterId,
      });
      toast.success(selectedTeacherId ? 'Program created and teacher assigned successfully!' : 'Program created successfully!');
      setProgramModalOpen(false);
      setProgramForm({
        name: '',
        code: '',
        mode: 'ONLINE',
        duration: '6 Months',
        teacherId: '',
        description: '',
      });
      if (activeCenterId) {
        loadCenterData(activeCenterId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create program');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Program Modal
  const openEditProgramModal = (prog: CenterProgram) => {
    setEditingProgramId(prog.id);
    setEditProgramForm({
      name: prog.name,
      duration: prog.duration || '6 Months',
      mode: prog.mode || 'ONLINE',
      teacherId: prog.teacherId || 'none',
      description: prog.description || '',
      status: prog.status || 'ACTIVE',
    });
    setEditProgramModalOpen(true);
  };

  // Update Program & Teacher Assignment
  const handleUpdateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgramId) return;
    if (!editProgramForm.name) {
      toast.error('Program name is required');
      return;
    }

    setSubmitting(true);
    try {
      const selectedTeacherId = editProgramForm.teacherId && editProgramForm.teacherId !== 'none' ? editProgramForm.teacherId : null;
      await api.put(`/academic-center/programs/${editingProgramId}`, {
        name: editProgramForm.name,
        duration: editProgramForm.duration,
        mode: editProgramForm.mode,
        teacherId: selectedTeacherId,
        description: editProgramForm.description,
        status: editProgramForm.status,
      });
      toast.success('Program details and teacher allocation updated!');
      setEditProgramModalOpen(false);
      setEditingProgramId(null);
      if (activeCenterId) {
        loadCenterData(activeCenterId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update program');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Add Teacher
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name || !teacherForm.email) {
      toast.error('Teacher name and email are required');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/academic-center/teachers', {
        ...teacherForm,
        centerId: activeCenterId,
      });
      toast.success('Teacher added successfully!');
      setTeacherModalOpen(false);
      setTeacherForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        specialization: '',
        bio: '',
      });
      loadCenterData(activeCenterId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add teacher');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to open Schedule Class modal (automatically selects program from center)
  const openScheduleClassModal = (programId?: string, universityId?: string, teacherId?: string) => {
    const resolvedProgId = programId || currentCenter?.assignedPrograms?.[0]?.id || programs[0]?.id || '';
    let uId = universityId || '';
    if (resolvedProgId && !uId) {
      const p = programs.find((item) => item.id === resolvedProgId);
      if (p?.universityId) uId = p.universityId;
    }
    setClassForm({
      universityId: uId,
      programId: resolvedProgId,
      title: '',
      type: currentCenter?.type === 'OFFLINE' ? 'OFFLINE_LECTURE' : 'ONLINE_LIVE_CLASS',
      startTime: '',
      endTime: '',
      teacherId: teacherId || '',
      meetingLink: '',
      meetingPassword: '',
      roomOrLocation: currentCenter?.type === 'OFFLINE' ? (currentCenter.address || currentCenter.name || '') : '',
      notes: '',
    });
    setClassModalOpen(true);
  };

  // Helper to open Add Material modal pre-filled with program & university
  const openAddMaterialModal = (programId?: string, universityId?: string) => {
    let uId = universityId || '';
    if (programId && !uId) {
      const p = programs.find((item) => item.id === programId);
      if (p?.universityId) uId = p.universityId;
    }
    setMaterialForm({
      universityId: uId,
      programId: programId || '',
      title: '',
      type: 'VIDEO',
      mediaUrl: '',
      duration: '45',
      chapterOrTopic: 'Module 1: Foundations',
      description: '',
    });
    setMaterialModalOpen(true);
  };

  // 3. Add Learning Material (Video or Document)
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.programId || !materialForm.title || !materialForm.mediaUrl) {
      toast.error('Program, title, and media URL are required');
      return;
    }

    setSubmitting(true);
    try {
      const { universityId, ...payload } = materialForm;
      await api.post('/academic-center/materials', {
        ...payload,
        duration: payload.duration ? parseInt(payload.duration) : undefined,
        centerId: activeCenterId,
      });
      toast.success(`${materialForm.type === 'VIDEO' ? 'Video Lecture' : 'Document'} uploaded successfully!`);
      setMaterialModalOpen(false);
      setMaterialForm({
        universityId: '',
        programId: '',
        title: '',
        type: 'VIDEO',
        mediaUrl: '',
        duration: '45',
        chapterOrTopic: 'Module 1: Foundations',
        description: '',
      });
      loadCenterData(activeCenterId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload material');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Schedule Class
  const handleScheduleClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.title || !classForm.startTime || !classForm.endTime) {
      toast.error('Class title, start and end times are required');
      return;
    }

    const effectiveProgId = classForm.programId || currentCenter?.assignedPrograms?.[0]?.id || programs[0]?.id;

    setSubmitting(true);
    try {
      const { universityId, ...payload } = classForm;
      const inferredType = classForm.meetingLink && !classForm.roomOrLocation
        ? 'ONLINE_LIVE_CLASS'
        : classForm.roomOrLocation && !classForm.meetingLink
        ? 'OFFLINE_LECTURE'
        : currentCenter?.type === 'OFFLINE'
        ? 'OFFLINE_LECTURE'
        : 'ONLINE_LIVE_CLASS';

      const res = await api.post('/academic-center/classes', {
        ...payload,
        programId: effectiveProgId,
        type: inferredType,
        teacherId: payload.teacherId && payload.teacherId !== 'none' ? payload.teacherId : undefined,
        centerId: activeCenterId,
      });
      toast.success(res.data?.message || 'Class scheduled successfully! Notifications sent to teacher and students.');
      setClassModalOpen(false);
      setClassForm({
        universityId: '',
        programId: '',
        title: '',
        type: 'ONLINE_LIVE_CLASS',
        startTime: '',
        endTime: '',
        teacherId: '',
        meetingLink: '',
        meetingPassword: '',
        roomOrLocation: '',
        notes: '',
      });
      if (activeCenterId) {
        loadCenterData(activeCenterId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to schedule class');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter((stu) => {
    if (studentProgramFilter !== 'ALL') {
      const inProg = stu.enrollments?.some((e) => e.program?.id === studentProgramFilter);
      if (!inProg) return false;
    }
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase().trim();
      const matchName = stu.name?.toLowerCase().includes(q);
      const matchEmail = stu.email?.toLowerCase().includes(q);
      const matchCode = stu.studentCode?.toLowerCase().includes(q);
      const matchPhone = stu.phone?.toLowerCase().includes(q);
      return matchName || matchEmail || matchCode || matchPhone;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-sm text-muted-foreground">
        Loading Counselor Workspace...
      </div>
    );
  }

  if (centers.length === 0) {
    return (
      <Card className="border-dashed p-12 text-center max-w-md mx-auto my-12">
        <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <h3 className="text-lg font-semibold">No Assigned Academic Center</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Your account has not been assigned to an Academic Center yet. Please contact the Organization Administrator.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Banner / Center Switcher */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Academic Counselor Workspace</span>
              {currentCenter?.type === 'ONLINE' ? (
                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 text-[11px] gap-1 py-0.5">
                  <Globe className="w-3 h-3" /> Online Center
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 text-[11px] gap-1 py-0.5">
                  <MapPin className="w-3 h-3" /> Offline Campus
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{currentCenter?.name}</h1>
            <p className="text-xs text-muted-foreground">
              Center Code: <span className="font-mono font-medium text-foreground">{currentCenter?.code}</span>
              {currentCenter?.city && ` • ${currentCenter.city}`}
              {currentCenter?.meetingPlatform && ` • ${currentCenter.meetingPlatform}`}
            </p>
          </div>

          {/* Switch Center if multiple */}
          {centers.length > 1 && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Switch Center:</Label>
              <Select value={activeCenterId} onValueChange={setActiveCenterId}>
                <SelectTrigger className="w-60 h-9 text-xs bg-background">
                  <SelectValue placeholder="Select center" />
                </SelectTrigger>
                <SelectContent>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} ({c.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Quick Stats Banner - Total Students & Scheduled Classes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-5 border-t border-border/60">
          <div className="bg-background/80 hover:bg-background p-4 rounded-xl border border-border/50 shadow-xs flex items-center gap-3.5 transition-all">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Students</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold tracking-tight text-foreground">{students.length}</span>
                <span className="text-[11px] text-muted-foreground">enrolled</span>
              </div>
            </div>
          </div>

          <div className="bg-background/80 hover:bg-background p-4 rounded-xl border border-border/50 shadow-xs flex items-center gap-3.5 transition-all">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Scheduled Classes</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold tracking-tight text-foreground">{classes.length}</span>
                <span className="text-[11px] text-muted-foreground">active sessions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="bg-muted/70 p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="classes" className="gap-2 text-xs py-2 px-3">
            <Calendar className="w-4 h-4" />
            Class Schedules ({classes.length})
          </TabsTrigger>
          <TabsTrigger value="teachers" className="gap-2 text-xs py-2 px-3">
            <Users className="w-4 h-4" />
            Teachers ({teachers.length})
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2 text-xs py-2 px-3">
            <Video className="w-4 h-4" />
            Learning Content ({materials.length})
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2 text-xs py-2 px-3">
            <GraduationCap className="w-4 h-4" />
            Students ({students.length})
          </TabsTrigger>
        </TabsList>

        {/* 2. TEACHERS TAB */}
        <TabsContent value="teachers" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Center Teachers</h3>
              <p className="text-xs text-muted-foreground">Manage instructor profiles for {currentCenter?.name}. Teachers automatically have access to all programs of this center.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setTeacherModalOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Teacher
              </Button>
            </div>
          </div>

          {teachers.length === 0 ? (
            <Card className="border-dashed p-10 text-center">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No teachers added yet</p>
              <Button onClick={() => setTeacherModalOpen(true)} className="mt-3 gap-2" size="sm">
                <Plus className="w-4 h-4" />
                Add First Teacher
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachers.map((t) => (
                <Card key={t.id} className="border hover:shadow-md transition-all">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-base">{t.name}</h4>
                        <p className="text-xs text-primary font-medium mt-0.5">{t.specialization || 'Instructor'}</p>
                      </div>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                        ACTIVE
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Email: <span className="text-foreground">{t.email}</span></p>
                      {t.phone && <p>Phone: <span className="text-foreground">{t.phone}</span></p>}
                    </div>

                    {t.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded">
                        {t.bio}
                      </p>
                    )}

                    <div className="pt-2 border-t space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-primary" />
                          Center Programs:
                        </span>
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium">
                          {programs.length} Assigned to Center
                        </Badge>
                      </div>
                      {programs.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1 max-h-16 overflow-y-auto">
                          {programs.map((p) => (
                            <Badge key={p.id} variant="outline" className="text-[10px] px-1.5 py-0 bg-background">
                              {p.code || p.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">No programs assigned to center</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 3. LEARNING MATERIALS (VIDEOS & DOCUMENTS) TAB */}
        <TabsContent value="materials" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Videos & Learning Documents</h3>
              <p className="text-xs text-muted-foreground">Upload recorded video lectures, PDFs, and study guides for students.</p>
            </div>
            <Button onClick={() => setMaterialModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Content
            </Button>
          </div>

          {materials.length === 0 ? (
            <Card className="border-dashed p-10 text-center">
              <Video className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No learning materials uploaded yet</p>
              <Button onClick={() => setMaterialModalOpen(true)} className="mt-3 gap-2" size="sm">
                <Plus className="w-4 h-4" />
                Upload First Video or Document
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {materials.map((mat) => (
                <Card key={mat.id} className="border hover:shadow-md transition-all flex flex-col justify-between">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${mat.type === 'VIDEO' ? 'bg-rose-500/10 text-rose-600' : 'bg-blue-500/10 text-blue-600'}`}>
                          {mat.type === 'VIDEO' ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium">
                            {mat.type}
                          </Badge>
                          <h4 className="font-semibold text-sm leading-tight mt-0.5">{mat.title}</h4>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        Program: <strong className="text-foreground">{mat.program?.university ? `[${mat.program.university.name}] ` : ''}{mat.program?.name}</strong>
                      </p>
                      {mat.chapterOrTopic && (
                        <p>Module/Topic: <span className="text-primary font-medium">{mat.chapterOrTopic}</span></p>
                      )}
                      {mat.duration && <p>Duration: {mat.duration} mins</p>}
                    </div>

                    {mat.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{mat.description}</p>
                    )}

                    <div className="pt-2 border-t flex items-center justify-between">
                      {mat.type === 'VIDEO' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setVideoPreviewUrl(mat.mediaUrl)}
                          className="text-xs h-7 gap-1.5 text-rose-600 hover:text-rose-700"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Watch Video
                        </Button>
                      ) : (
                        <a href={mat.mediaUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5 text-blue-600 hover:text-blue-700">
                            <Download className="w-3.5 h-3.5" />
                            Open Document
                          </Button>
                        </a>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(mat.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 4. CLASS SCHEDULES TAB */}
        <TabsContent value="classes" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Class Schedules</h3>
              <p className="text-xs text-muted-foreground">Schedule Offline lectures or Online Live Classes with meeting links.</p>
            </div>
            <Button onClick={() => openScheduleClassModal()} className="gap-2">
              <Plus className="w-4 h-4" />
              Schedule Class
            </Button>
          </div>

          {classes.length === 0 ? (
            <Card className="border-dashed p-10 text-center">
              <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No classes scheduled yet</p>
              <Button onClick={() => openScheduleClassModal()} className="mt-3 gap-2" size="sm">
                <Plus className="w-4 h-4" />
                Schedule First Class
              </Button>
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
                          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                            <MapPin className="w-3.5 h-3.5" />
                            Room: {cls.roomOrLocation}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAttendanceModal(cls)}
                        className="gap-1.5 text-xs font-medium h-8 border-primary/40 text-primary hover:bg-primary/10"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        View Attendance {cls.attendances?.length ? `(${cls.attendances.length})` : ''}
                      </Button>
                      {cls.meetingLink && (
                        <a href={cls.meetingLink} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Join Meeting
                          </Button>
                        </a>
                      )}
                      {cls.recordingUrl && (
                        <a href={cls.recordingUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                            <Play className="w-3.5 h-3.5" />
                            Recording
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

        {/* 5. STUDENTS & ENROLLMENTS TAB */}
        <TabsContent value="students" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Center Students</h3>
              <p className="text-xs text-muted-foreground">
                Students enrolled in {currentCenter?.name}'s assigned programs are automatically loaded from the student repository.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1">
                {filteredStudents.length} Students in Center Programs
              </Badge>
            </div>
          </div>

          {/* Search & Program Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search students by name, email, code or phone..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            {programs.length > 0 && (
              <Select value={studentProgramFilter} onValueChange={setStudentProgramFilter}>
                <SelectTrigger className="h-8 text-xs w-full sm:w-56">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Programs ({programs.length})</SelectItem>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {filteredStudents.length === 0 ? (
            <Card className="border-dashed p-10 text-center">
              <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No students found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {students.length === 0
                  ? "No students are currently enrolled in this center's assigned programs."
                  : 'No students match your filter criteria.'}
              </p>
            </Card>
          ) : (
            <Card className="border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b uppercase text-[10px] text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3">Student Code / ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Enrolled Program</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Admission Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredStudents.map((stu) => (
                      <tr key={stu.id} className="hover:bg-muted/20">
                        <td className="p-3 font-mono font-medium text-foreground">{stu.studentCode}</td>
                        <td className="p-3 font-semibold">{stu.name}</td>
                        <td className="p-3 text-muted-foreground">
                          <div>{stu.email}</div>
                          {stu.phone && <div className="text-[11px]">{stu.phone}</div>}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {stu.enrollments && stu.enrollments.length > 0 ? (
                              stu.enrollments.map((e) => (
                                <Badge key={e.id || e.program?.id} variant="secondary" className="text-[10px] py-0 px-1.5">
                                  {e.program?.name} ({e.program?.code})
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground italic">No enrollments</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                            {stu.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {stu.createdAt ? new Date(stu.createdAt).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL 1: CREATE PROGRAM */}
      <Dialog open={programModalOpen} onOpenChange={setProgramModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Academic Program</DialogTitle>
            <DialogDescription>Define course program and assign teacher for {currentCenter?.name}.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProgram} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="pName">Program Name *</Label>
              <Input
                id="pName"
                placeholder="e.g. Full Stack Web Development"
                value={programForm.name}
                onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="pCode">Program Code *</Label>
                <Input
                  id="pCode"
                  placeholder="e.g. FSWD-01"
                  value={programForm.code}
                  onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pDuration">Duration</Label>
                <Input
                  id="pDuration"
                  placeholder="e.g. 6 Months"
                  value={programForm.duration}
                  onChange={(e) => setProgramForm({ ...programForm, duration: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="pMode">Mode</Label>
                <Select
                  value={programForm.mode}
                  onValueChange={(val) => setProgramForm({ ...programForm, mode: val })}
                >
                  <SelectTrigger id="pMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="OFFLINE">Offline</SelectItem>
                    <SelectItem value="HYBRID">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pTeacher" className="flex items-center justify-between">
                  <span>Assign Teacher</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </Label>
                <Select
                  value={programForm.teacherId || 'none'}
                  onValueChange={(val) => setProgramForm({ ...programForm, teacherId: val })}
                >
                  <SelectTrigger id="pTeacher">
                    <SelectValue placeholder="Select teacher (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No Teacher (Assign Later) --</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.specialization || 'Teacher'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pDesc">Description</Label>
              <Textarea
                id="pDesc"
                rows={2}
                placeholder="Program outline and learning outcomes..."
                value={programForm.description}
                onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setProgramModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Program'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 1B: EDIT PROGRAM & ASSIGN TEACHER */}
      <Dialog open={editProgramModalOpen} onOpenChange={setEditProgramModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Program & Teacher Allocation</DialogTitle>
            <DialogDescription>Update program details or assign a designated teacher for {currentCenter?.name}.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateProgram} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="editPName">Program Name *</Label>
              <Input
                id="editPName"
                placeholder="e.g. Full Stack Web Development"
                value={editProgramForm.name}
                onChange={(e) => setEditProgramForm({ ...editProgramForm, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="editPDuration">Duration</Label>
                <Input
                  id="editPDuration"
                  placeholder="e.g. 6 Months"
                  value={editProgramForm.duration}
                  onChange={(e) => setEditProgramForm({ ...editProgramForm, duration: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editPMode">Mode</Label>
                <Select
                  value={editProgramForm.mode}
                  onValueChange={(val) => setEditProgramForm({ ...editProgramForm, mode: val })}
                >
                  <SelectTrigger id="editPMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="OFFLINE">Offline</SelectItem>
                    <SelectItem value="HYBRID">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="editPTeacher" className="flex items-center justify-between">
                  <span>Assign Teacher</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </Label>
                <Select
                  value={editProgramForm.teacherId || 'none'}
                  onValueChange={(val) => setEditProgramForm({ ...editProgramForm, teacherId: val })}
                >
                  <SelectTrigger id="editPTeacher">
                    <SelectValue placeholder="Select teacher (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No Teacher Assigned --</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.specialization || 'Teacher'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editPStatus">Status</Label>
                <Select
                  value={editProgramForm.status}
                  onValueChange={(val) => setEditProgramForm({ ...editProgramForm, status: val })}
                >
                  <SelectTrigger id="editPStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editPDesc">Description</Label>
              <Textarea
                id="editPDesc"
                rows={2}
                placeholder="Program outline and learning outcomes..."
                value={editProgramForm.description}
                onChange={(e) => setEditProgramForm({ ...editProgramForm, description: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditProgramModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ADD TEACHER */}
      <Dialog open={teacherModalOpen} onOpenChange={setTeacherModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Teacher</DialogTitle>
            <DialogDescription>Register an instructor profile in {currentCenter?.name}.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddTeacher} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="tName">Full Name *</Label>
              <Input
                id="tName"
                placeholder="Prof. Jane Doe"
                value={teacherForm.name}
                onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tEmail">Email *</Label>
              <Input
                id="tEmail"
                type="email"
                placeholder="teacher@institution.com"
                value={teacherForm.email}
                onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tPass">Portal Password *</Label>
              <Input
                id="tPass"
                type="password"
                placeholder="Initial password for Teacher Portal"
                value={teacherForm.password}
                onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                required
              />
              <p className="text-[11px] text-muted-foreground">The teacher will use this email & password to sign into the Teacher Portal.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="tPhone">Phone</Label>
                <Input
                  id="tPhone"
                  placeholder="+91 9876543210"
                  value={teacherForm.phone}
                  onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tSpec">Specialization</Label>
                <Input
                  id="tSpec"
                  placeholder="e.g. Mathematics"
                  value={teacherForm.specialization}
                  onChange={(e) => setTeacherForm({ ...teacherForm, specialization: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tBio">Bio / Profile</Label>
              <Textarea
                id="tBio"
                rows={2}
                placeholder="Teacher qualifications and experience..."
                value={teacherForm.bio}
                onChange={(e) => setTeacherForm({ ...teacherForm, bio: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setTeacherModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Teacher'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ADD LEARNING MATERIAL */}
      <Dialog open={materialModalOpen} onOpenChange={setMaterialModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Learning Material</DialogTitle>
            <DialogDescription>Upload video lectures, PDF notes, or e-books for students.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddMaterial} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="mProg">Select Program *</Label>
              <Select
                value={materialForm.programId}
                onValueChange={(val) => setMaterialForm((prev) => ({ ...prev, programId: val }))}
              >
                <SelectTrigger id="mProg">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="mType">Type</Label>
                <Select
                  value={materialForm.type}
                  onValueChange={(val) => setMaterialForm({ ...materialForm, type: val as any })}
                >
                  <SelectTrigger id="mType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIDEO">Video Lecture</SelectItem>
                    <SelectItem value="DOCUMENT">Document / PDF</SelectItem>
                    <SelectItem value="EBOOK">E-Book</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mChapter">Module / Chapter</Label>
                <Input
                  id="mChapter"
                  placeholder="e.g. Chapter 1"
                  value={materialForm.chapterOrTopic}
                  onChange={(e) => setMaterialForm({ ...materialForm, chapterOrTopic: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mTitle">Title *</Label>
              <Input
                id="mTitle"
                placeholder="e.g. React Hooks Deep Dive"
                value={materialForm.title}
                onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mUrl">
                {materialForm.type === 'VIDEO' ? 'Video Stream URL (YouTube, Vimeo, MP4) *' : 'Document URL (PDF / File) *'}
              </Label>
              <Input
                id="mUrl"
                placeholder={materialForm.type === 'VIDEO' ? 'https://www.youtube.com/watch?v=...' : 'https://.../document.pdf'}
                value={materialForm.mediaUrl}
                onChange={(e) => setMaterialForm({ ...materialForm, mediaUrl: e.target.value })}
                required
              />
            </div>

            {materialForm.type === 'VIDEO' && (
              <div className="space-y-1.5">
                <Label htmlFor="mDuration">Duration (Minutes)</Label>
                <Input
                  id="mDuration"
                  type="number"
                  placeholder="e.g. 45"
                  value={materialForm.duration}
                  onChange={(e) => setMaterialForm({ ...materialForm, duration: e.target.value })}
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setMaterialModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Uploading...' : 'Add Material'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: SCHEDULE CLASS */}
      <Dialog open={classModalOpen} onOpenChange={setClassModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Class</DialogTitle>
            <DialogDescription>Schedule an Online Live Class or Offline Lecture.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleClass} className="space-y-3 pt-2">
            {/* Center Program Information (automatically assigned, no selection required) */}
            {(currentCenter?.assignedPrograms?.[0] || programs[0]) && (
              <div className="p-2.5 rounded-lg bg-muted/40 border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                  <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="shrink-0">Program:</span>
                  <span className="font-semibold text-foreground truncate">
                    {currentCenter?.assignedPrograms?.[0]?.name || programs[0]?.name}
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    ({currentCenter?.assignedPrograms?.[0]?.code || programs[0]?.code})
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0 bg-primary/10 text-primary">
                  Auto-Assigned
                </Badge>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="clTitle">Class Title *</Label>
                <Input
                  id="clTitle"
                  placeholder="e.g. State Management & Hooks Q&A"
                  value={classForm.title}
                  onChange={(e) => setClassForm({ ...classForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clTeacher">Instructor</Label>
                <Select
                  value={classForm.teacherId || 'none'}
                  onValueChange={(val) => setClassForm({ ...classForm, teacherId: val })}
                >
                  <SelectTrigger id="clTeacher">
                    <SelectValue placeholder="Select instructor (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No Instructor (Assign Later) --</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.specialization || 'Teacher'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="clStart">Start Time *</Label>
                <Input
                  id="clStart"
                  type="datetime-local"
                  value={classForm.startTime}
                  onChange={(e) => setClassForm({ ...classForm, startTime: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clEnd">End Time *</Label>
                <Input
                  id="clEnd"
                  type="datetime-local"
                  value={classForm.endTime}
                  onChange={(e) => setClassForm({ ...classForm, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Location / Meeting Details (Automatically tailored to Center) */}
            {currentCenter?.type === 'ONLINE' ? (
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-blue-500/5 rounded-lg border border-blue-500/20">
                <div className="space-y-1">
                  <Label htmlFor="clMeetLink">Meeting Link (Zoom / Meet)</Label>
                  <Input
                    id="clMeetLink"
                    placeholder="https://zoom.us/j/..."
                    value={classForm.meetingLink}
                    onChange={(e) => setClassForm({ ...classForm, meetingLink: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="clPass">Meeting Password</Label>
                  <Input
                    id="clPass"
                    placeholder="Passcode"
                    value={classForm.meetingPassword}
                    onChange={(e) => setClassForm({ ...classForm, meetingPassword: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                <div className="space-y-1">
                  <Label htmlFor="clRoom">Room / Hall Location</Label>
                  <Input
                    id="clRoom"
                    placeholder="e.g. Room 302, Main Academic Block"
                    value={classForm.roomOrLocation}
                    onChange={(e) => setClassForm({ ...classForm, roomOrLocation: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="clMeetLink">Live Stream Link (Optional)</Label>
                  <Input
                    id="clMeetLink"
                    placeholder="https://..."
                    value={classForm.meetingLink}
                    onChange={(e) => setClassForm({ ...classForm, meetingLink: e.target.value })}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setClassModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Scheduling...' : 'Schedule Class'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIDEO PREVIEW MODAL */}
      <Dialog open={!!videoPreviewUrl} onOpenChange={() => setVideoPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-4">
          <DialogHeader>
            <DialogTitle>Video Lecture Player</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
            {videoPreviewUrl?.includes('youtube.com') || videoPreviewUrl?.includes('youtu.be') ? (
              <iframe
                src={videoPreviewUrl.replace('watch?v=', 'embed/')}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={videoPreviewUrl || ''} controls className="w-full h-full" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ATTENDANCE SHEET MODAL */}
      {/* ATTENDANCE SHEET MODAL (VIEW ONLY FOR COUNSELOR) */}
      <Dialog open={attendanceModalOpen} onOpenChange={setAttendanceModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b pb-4">
            <div className="flex items-center justify-between gap-2 pr-4">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Eye className="w-5 h-5 text-primary" />
                  Class Attendance Records
                  <Badge variant="secondary" className="text-[10px] font-normal">View Only</Badge>
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  {attendanceClass?.type === 'OFFLINE_LECTURE'
                    ? 'Offline campus class attendance is marked directly by the teacher.'
                    : 'Online live class attendance is registered by students upon check-in.'}
                </DialogDescription>
              </div>
              <Badge variant="outline" className={cn(
                "text-xs px-2 py-0.5 font-medium shrink-0",
                attendanceClass?.type === 'ONLINE_LIVE_CLASS'
                  ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
              )}>
                {attendanceClass?.type === 'ONLINE_LIVE_CLASS' ? 'Online Class' : 'Offline Campus'}
              </Badge>
            </div>

            {/* Class Details Banner */}
            {attendanceClass && (
              <div className="mt-3 p-3 rounded-lg bg-muted/40 border text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Class Subject / Topic</span>
                  <span className="font-semibold text-foreground">{attendanceClass.title}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Program / University</span>
                  <span className="font-semibold text-primary">
                    {attendanceClass.program?.university ? `[${attendanceClass.program.university.name}] ` : ''}
                    {attendanceClass.program?.name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Date & Time</span>
                  <span>{new Date(attendanceClass.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Location / Instructor</span>
                  <span>{attendanceClass.roomOrLocation || 'Campus Classroom'} {attendanceClass.teacher ? `• ${attendanceClass.teacher.name}` : ''}</span>
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Attendance Stats & Source Info */}
          <div className="px-5 py-3 bg-muted/20 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium">
                Total: {studentSheet.length}
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-medium">
                Present: {studentSheet.filter(s => s.status === 'PRESENT').length}
              </Badge>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs font-medium">
                Absent: {studentSheet.filter(s => s.status === 'ABSENT').length}
              </Badge>
            </div>

            <div className="text-[11px] text-muted-foreground italic flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
              {attendanceClass?.type === 'OFFLINE_LECTURE'
                ? 'Teacher marks attendance at the center'
                : 'Students mark attendance online'}
            </div>
          </div>

          {/* Search Input */}
          <div className="px-5 py-2.5 border-b bg-background">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search student by name, email, or code..."
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/20"
              />
            </div>
          </div>

          {/* Students List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
            {attendanceLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Loading enrolled students and attendance sheet...
              </div>
            ) : studentSheet.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No students enrolled in this university program yet.
              </div>
            ) : (
              studentSheet
                .filter(s =>
                  !attendanceSearch ||
                  s.name.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
                  s.email.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
                  (s.studentCode && s.studentCode.toLowerCase().includes(attendanceSearch.toLowerCase()))
                )
                .map((student, idx) => (
                  <div
                    key={student.email || idx}
                    className={cn(
                      "p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                      student.status === 'PRESENT' ? "bg-emerald-500/5 border-emerald-500/30" : "bg-destructive/5 border-destructive/30"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{student.name}</span>
                        {student.studentCode && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                            {student.studentCode}
                          </Badge>
                        )}
                        {student.markedBy === 'STUDENT' && (
                          <Badge variant="secondary" className="text-[10px] text-blue-600 dark:text-blue-400 py-0 px-1 bg-blue-500/10 border-blue-500/20">
                            Online Check-in
                          </Badge>
                        )}
                        {student.markedBy === 'TEACHER' && (
                          <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400 py-0 px-1 bg-emerald-500/10 border-emerald-500/20">
                            Teacher Marked
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{student.email} {student.phone ? `• ${student.phone}` : ''}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {student.status === 'PRESENT' ? (
                        <div className="text-right">
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            Present
                          </Badge>
                          <span className="block text-[10px] text-muted-foreground mt-0.5">
                            {student.markedBy === 'STUDENT'
                              ? 'Student Check-in'
                              : student.markedBy === 'TEACHER'
                              ? 'Marked by Teacher'
                              : 'Recorded'}
                            {student.markedAt ? ` • ${new Date(student.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </span>
                        </div>
                      ) : (
                        <div className="text-right">
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[11px] font-semibold">
                            Absent
                          </Badge>
                          <span className="block text-[10px] text-muted-foreground mt-0.5">
                            Not checked in
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAttendanceModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
