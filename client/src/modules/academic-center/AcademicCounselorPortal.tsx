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
  Pencil,
  Eye,
  Layers,
  CheckSquare,
  History,
  UserCog,
  Radio,
  AlertCircle,
  ArrowRight
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
  CourseModule,
  Assessment,
  TeacherHistoryEntry,
  ModuleClassItem
} from './types';

function getErrorMessage(err: unknown, fallback: string = 'An error occurred'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function AcademicCounselorPortal() {
  const [centers, setCenters] = useState<AcademicCenter[]>([]);
  const [activeCenterId, setActiveCenterId] = useState<string>(
    new URLSearchParams(window.location.search).get('centerId') || ''
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'structure' | 'materials' | 'assessments' | 'classes' | 'teachers' | 'students'>('structure');

  // Module collections
  const [programs, setPrograms] = useState<CenterProgram[]>([]);
  const [teachers, setTeachers] = useState<CenterTeacher[]>([]);
  const [materials, setMaterials] = useState<CenterMaterial[]>([]);
  const [classes, setClasses] = useState<CenterClassSchedule[]>([]);
  const [students, setStudents] = useState<CenterStudent[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  // Filter state for programs
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [studentProgramFilter, setStudentProgramFilter] = useState<string>('ALL');

  // Program selection
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    new URLSearchParams(window.location.search).get('programId') || ''
  );

  // Modals state
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [editProgramModalOpen, setEditProgramModalOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let changed = false;
    
    if (activeCenterId && params.get('centerId') !== activeCenterId) {
      params.set('centerId', activeCenterId);
      changed = true;
    } else if (!activeCenterId && params.has('centerId')) {
      params.delete('centerId');
      changed = true;
    }

    if (selectedProgramId && params.get('programId') !== selectedProgramId) {
      params.set('programId', selectedProgramId);
      changed = true;
    } else if (!selectedProgramId && params.has('programId')) {
      params.delete('programId');
      changed = true;
    }

    if (changed) {
      const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [activeCenterId, selectedProgramId]);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);

  // Teacher Change & History Modal states
  const [changeTeacherModalOpen, setChangeTeacherModalOpen] = useState(false);
  const [teacherHistoryModalOpen, setTeacherHistoryModalOpen] = useState(false);
  const [teacherHistoryLoading, setTeacherHistoryLoading] = useState(false);
  const [teacherHistoryList, setTeacherHistoryList] = useState<TeacherHistoryEntry[]>([]);
  const [changeTeacherForm, setChangeTeacherForm] = useState({
    teacherId: '',
    remarks: '',
  });

  // Delete Module Modal state
  const [deleteModuleModalOpen, setDeleteModuleModalOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<CourseModule | null>(null);
  const [deleteAssociatedClasses, setDeleteAssociatedClasses] = useState(true);
  const [deletingModule, setDeletingModule] = useState(false);

  // Forms
  const [moduleForm, setModuleForm] = useState<{
    title: string;
    description: string;
    topics: string;
    durationHours: number;
    classes: ModuleClassItem[];
  }>({
    title: '',
    description: '',
    topics: '',
    durationHours: 10,
    classes: [],
  });

  const [assessmentForm, setAssessmentForm] = useState({
    title: '',
    assessmentType: 'ASSIGNMENT',
    module: '',
    maxMarks: 100,
    dueDate: '',
    instructions: '',
    questionPaperUrl: '',
  });

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
    moduleName: '',
    title: '',
    type: 'ONLINE_LIVE_CLASS' as 'ONLINE_LIVE_CLASS' | 'OFFLINE_LECTURE',
    startTime: '',
    endTime: '',
    teacherId: '',
    recordingUrl: '',
    meetingLink: '',
    meetingPassword: '',
    roomOrLocation: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  // Attendance Management Modal (View Only for Counselor)
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceClass, setAttendanceClass] = useState<CenterClassSchedule | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
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
        interface AttendanceStudentItem {
          id: string;
          name: string;
          email: string;
          phone?: string;
          studentCode?: string;
          source?: string;
          attendance?: {
            status?: 'PRESENT' | 'ABSENT';
            markedBy?: string;
            markedAt?: string;
            notes?: string;
          };
        }
        const studentData: AttendanceStudentItem[] = res.data.data.students || [];
        setStudentSheet(
          studentData.map((s) => ({
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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to load attendance sheet'));
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialCenters();
  }, []);

  useEffect(() => {
    if (activeCenterId) {
      loadCenterData(activeCenterId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCenterId]);

  const fetchInitialCenters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/academic-center/counselor/my-centers');
      if (res.data.success && res.data.data?.length > 0) {
        setCenters(res.data.data);
        setActiveCenterId((prev) => prev || res.data.data[0].id);
      } else {
        // Fallback: fetch all centers if admin viewing
        const allRes = await api.get('/academic-center/centers');
        if (allRes.data.success && allRes.data.data?.length > 0) {
          setCenters(allRes.data.data);
          setActiveCenterId((prev) => prev || allRes.data.data[0].id);
        }
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to load centers'));
    } finally {
      setLoading(false);
    }
  };

  const loadCenterData = async (centerId: string) => {
    try {
      const centerObj = centers.find((c) => c.id === centerId);
      const [, progRes, teachRes, matRes, clsRes, stuRes, assessRes] = await Promise.all([
        api.get('/academic-center/universities'),
        api.get(`/academic-center/programs?centerId=${centerId}`),
        api.get(`/academic-center/teachers?centerId=${centerId}`),
        api.get(`/academic-center/materials?centerId=${centerId}&excludeAssessments=true`),
        api.get(`/academic-center/classes?centerId=${centerId}`),
        api.get(`/academic-center/students?centerId=${centerId}`),
        api.get(`/academic-center/assessments?centerId=${centerId}`).catch(() => ({ data: { data: [] } })),
      ]);

      const loadedProgs: CenterProgram[] = progRes.data.data || [];
      if (progRes.data.success) setPrograms(loadedProgs);
      if (teachRes.data.success) setTeachers(teachRes.data.data || []);
      if (matRes.data.success) setMaterials(matRes.data.data || []);
      if (clsRes.data.success) setClasses(clsRes.data.data || []);
      if (stuRes.data.success) setStudents(stuRes.data.data || []);
      if (assessRes.data?.data) setAssessments(assessRes.data.data || []);

      const targetProgId = (selectedProgramId && loadedProgs.some((p: CenterProgram) => p.id === selectedProgramId))
        ? selectedProgramId
        : (centerObj?.assignedPrograms?.[0]?.id || loadedProgs[0]?.id || '');
      setSelectedProgramId(targetProgId);

      if (targetProgId) {
        const structRes = await api.get(`/academic-center/programs/${targetProgId}/structure?centerId=${centerId}`).catch(() => null);
        if (structRes?.data?.data) {
          const raw = structRes.data.data;
          const normalized = Array.isArray(raw) ? raw.map((m: CourseModule, idx: number) => ({
            ...m,
            id: m.id || `mod-${idx + 1}`,
          })) : [];
          setModules(normalized);
        } else {
          setModules([]);
        }
      } else {
        setModules([]);
      }
    } catch (err: unknown) {
      console.error('Error fetching center details:', err);
    }
  };

  const currentCenter = centers.find((c) => c.id === activeCenterId);
  const activeProgram = programs.find((p) => p.id === selectedProgramId) || programs[0];
  const activeProgramTeacher = activeProgram?.assignedTeacher || teachers.find((t) => t.id === activeProgram?.teacherId);

  useEffect(() => {
    if (selectedProgramId && activeCenterId) {
      api.get(`/academic-center/programs/${selectedProgramId}/structure?centerId=${activeCenterId}`)
        .then((res) => {
          if (res.data?.data) {
            const raw = res.data.data;
            const normalized = Array.isArray(raw) ? raw.map((m: CourseModule, idx: number) => ({
              ...m,
              id: m.id || `mod-${idx + 1}`,
            })) : [];
            setModules(normalized);
          } else {
            setModules([]);
          }
        })
        .catch(() => setModules([]));
    }
  }, [selectedProgramId, activeCenterId]);

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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to create program'));
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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to update program'));
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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to add teacher'));
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to open Schedule Class modal (automatically selects program from center)
  const openScheduleClassModal = (programId?: string, universityId?: string, teacherId?: string, moduleName?: string) => {
    const resolvedProgId = programId || currentCenter?.assignedPrograms?.[0]?.id || programs[0]?.id || '';
    let uId = universityId || '';
    if (resolvedProgId && !uId) {
      const p = programs.find((item) => item.id === resolvedProgId);
      if (p?.universityId) uId = p.universityId;
    }
    setClassForm({
      universityId: uId,
      programId: resolvedProgId,
      moduleName: moduleName || '',
      title: moduleName ? `${moduleName}: Class Session` : '',
      type: 'ONLINE_LIVE_CLASS',
      startTime: '',
      endTime: '',
      teacherId: teacherId || '',
      meetingLink: '',
      meetingPassword: '',
      roomOrLocation: currentCenter?.address || '',
      recordingUrl: '',
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
      const { universityId: _unusedUni, ...payload } = materialForm;
      void _unusedUni;
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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to upload material'));
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
      const { universityId: _unusedUni, ...payload } = classForm;
      void _unusedUni;
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
        moduleName: classForm.moduleName?.trim() || undefined,
        recordingUrl: classForm.recordingUrl || classForm.meetingLink || undefined,
        teacherId: payload.teacherId && payload.teacherId !== 'none' ? payload.teacherId : undefined,
        centerId: activeCenterId,
      });
      toast.success(res.data?.message || 'Class scheduled successfully! Notifications sent to teacher and students.');
      setClassModalOpen(false);
      setClassForm({
        universityId: '',
        programId: '',
        moduleName: '',
        title: '',
        type: 'ONLINE_LIVE_CLASS',
        startTime: '',
        endTime: '',
        teacherId: '',
        recordingUrl: '',
        meetingLink: '',
        meetingPassword: '',
        roomOrLocation: '',
        notes: '',
      });
      if (activeCenterId) {
        loadCenterData(activeCenterId);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to schedule class'));
    } finally {
      setSubmitting(false);
    }
  };

  // Teacher Assignment Handlers
  const openChangeTeacherModal = (prog?: CenterProgram) => {
    const targetProg = prog || activeProgram;
    if (!targetProg) {
      toast.error('Please select a program first');
      return;
    }
    setChangeTeacherForm({
      teacherId: targetProg.teacherId || '',
      remarks: '',
    });
    setChangeTeacherModalOpen(true);
  };

  const handleChangeTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProg = activeProgram;
    if (!targetProg) return;

    setSubmitting(true);
    try {
      const selectedId = changeTeacherForm.teacherId && changeTeacherForm.teacherId !== 'none'
        ? changeTeacherForm.teacherId
        : null;
      const res = await api.put(`/academic-center/programs/${targetProg.id}/assign-teacher`, {
        teacherId: selectedId,
        remarks: changeTeacherForm.remarks,
        centerId: activeCenterId,
      });
      toast.success(res.data.message || 'Program teacher updated successfully!');
      setChangeTeacherModalOpen(false);
      if (activeCenterId) {
        await loadCenterData(activeCenterId);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to update teacher'));
    } finally {
      setSubmitting(false);
    }
  };

  const openTeacherHistoryModal = async (prog?: CenterProgram) => {
    const targetProg = prog || activeProgram;
    if (!targetProg) return;

    setTeacherHistoryModalOpen(true);
    setTeacherHistoryLoading(true);
    try {
      const res = await api.get(`/academic-center/programs/${targetProg.id}/teacher-history?centerId=${activeCenterId}`);
      if (res.data.success) {
        setTeacherHistoryList(res.data.data || []);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to load teacher history'));
    } finally {
      setTeacherHistoryLoading(false);
    }
  };

  // 5. Course Structure Handlers (Unified Module & Classes Form)
  const handleOpenAddModule = () => {
    setEditingModuleId(null);
    setModuleForm({
      title: '',
      description: '',
      topics: '',
      durationHours: 10,
      classes: [
        {
          title: 'Session 1: Introduction',
          type: 'RECORDED_VIDEO',
          recordingUrl: '',
          durationMins: 45,
        },
      ],
    });
    setModuleModalOpen(true);
  };

  const handleEditModule = (mod: CourseModule) => {
    const targetId = mod.id || `mod-${Date.now()}`;
    setEditingModuleId(targetId);
    const existingClassesForMod = classes.filter((c) => c.moduleName === mod.title);
    const mappedClasses: ModuleClassItem[] = existingClassesForMod.length > 0
      ? existingClassesForMod.map((c) => {
        const isRec = !!c.recordingUrl && !c.meetingLink && (!c.startTime || c.startTime === c.createdAt);
        return {
          id: c.id,
          title: c.title,
          type: isRec ? 'RECORDED_VIDEO' : 'ONLINE_LIVE_CLASS',
          recordingUrl: c.recordingUrl || '',
          startTime: c.startTime ? new Date(c.startTime).toISOString().slice(0, 16) : '',
          endTime: c.endTime ? new Date(c.endTime).toISOString().slice(0, 16) : '',
          meetingLink: c.meetingLink || '',
          meetingPassword: c.meetingPassword || '',
          durationMins: 45,
        };
      })
      : (mod.classes || [
        {
          title: 'Session 1: Introduction',
          type: 'RECORDED_VIDEO',
          recordingUrl: '',
          durationMins: 45,
        },
      ]);

    setModuleForm({
      title: mod.title,
      description: mod.description || '',
      topics: (mod.topics || []).join('\n'),
      durationHours: mod.durationHours || 10,
      classes: mappedClasses,
    });
    setModuleModalOpen(true);
  };

  const handleAddClassRow = (type: 'RECORDED_VIDEO' | 'ONLINE_LIVE_CLASS' = 'RECORDED_VIDEO') => {
    setModuleForm((prev) => ({
      ...prev,
      classes: [
        ...prev.classes,
        {
          title: `Session ${prev.classes.length + 1}`,
          type,
          recordingUrl: '',
          durationMins: 45,
          startTime: '',
          endTime: '',
          meetingLink: '',
        },
      ],
    }));
  };

  const handleRemoveClassRow = (index: number) => {
    setModuleForm((prev) => ({
      ...prev,
      classes: prev.classes.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateClassRow = (index: number, updates: Partial<ModuleClassItem>) => {
    setModuleForm((prev) => ({
      ...prev,
      classes: prev.classes.map((c, i) => (i === index ? { ...c, ...updates } : c)),
    }));
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleForm.title.trim()) {
      toast.error('Module title is required');
      return;
    }
    const effectiveProgId = selectedProgramId || currentCenter?.assignedPrograms?.[0]?.id || programs[0]?.id;
    if (!effectiveProgId) {
      toast.error('No program found for this center to attach module');
      return;
    }

    // Validate classes
    for (let i = 0; i < moduleForm.classes.length; i++) {
      const cls = moduleForm.classes[i];
      if (!cls.title.trim()) {
        toast.error(`Please enter a title for Class #${i + 1}`);
        return;
      }
      if (cls.type === 'RECORDED_VIDEO' && !cls.recordingUrl?.trim()) {
        toast.error(`Please provide a video URL for Class #${i + 1} ("${cls.title}")`);
        return;
      }
      if (cls.type === 'ONLINE_LIVE_CLASS' && !cls.startTime) {
        toast.error(`Please select a start date & time for Live Class #${i + 1} ("${cls.title}")`);
        return;
      }
    }

    const topicsArray = moduleForm.topics
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);

    let updatedModules: CourseModule[];
    let oldModuleTitle: string | undefined;
    if (editingModuleId) {
      oldModuleTitle = modules.find(m => m.id === editingModuleId)?.title;
      updatedModules = modules.map((m) =>
        m.id === editingModuleId
          ? {
            ...m,
            title: moduleForm.title.trim(),
            description: moduleForm.description.trim(),
            topics: topicsArray,
            durationHours: Number(moduleForm.durationHours) || 10,
          }
          : m
      );
    } else {
      const newMod: CourseModule = {
        id: `mod-${Date.now()}`,
        title: moduleForm.title.trim(),
        description: moduleForm.description.trim(),
        topics: topicsArray.length > 0 ? topicsArray : ['Topic 1: Introduction'],
        durationHours: Number(moduleForm.durationHours) || 10,
      };
      updatedModules = [...modules, newMod];
    }

    setSubmitting(true);
    try {
      await api.put(`/academic-center/programs/${effectiveProgId}/structure`, {
        modules: updatedModules,
        centerId: activeCenterId,
        classes: moduleForm.classes,
        moduleTitle: moduleForm.title.trim(),
        oldModuleTitle,
      });
      setModules(updatedModules);
      toast.success(editingModuleId ? 'Module and class sessions updated!' : 'Course module and classes created successfully!');
      setModuleModalOpen(false);
      setEditingModuleId(null);
      setModuleForm({ title: '', description: '', topics: '', durationHours: 10, classes: [] });
      if (activeCenterId) {
        await loadCenterData(activeCenterId);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to save module'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteModuleModal = (mod: CourseModule) => {
    setModuleToDelete(mod);
    setDeleteAssociatedClasses(true);
    setDeleteModuleModalOpen(true);
  };

  const handleConfirmDeleteModule = async () => {
    if (!moduleToDelete) return;
    const effectiveProgId = selectedProgramId || currentCenter?.assignedPrograms?.[0]?.id || programs[0]?.id;
    if (!effectiveProgId) {
      toast.error('No program selected');
      return;
    }

    setDeletingModule(true);
    const updated = modules.filter((m) => m.id !== moduleToDelete.id);
    try {
      await api.put(`/academic-center/programs/${effectiveProgId}/structure`, {
        modules: updated,
        centerId: activeCenterId,
        deleteClassesForModule: deleteAssociatedClasses ? moduleToDelete.title : undefined,
      });
      setModules(updated);
      toast.success(`Module "${moduleToDelete.title}" deleted successfully`);
      setDeleteModuleModalOpen(false);
      setModuleToDelete(null);
      if (editingModuleId === moduleToDelete.id) {
        setModuleModalOpen(false);
        setEditingModuleId(null);
      }
      if (activeCenterId) {
        await loadCenterData(activeCenterId);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to delete module'));
    } finally {
      setDeletingModule(false);
    }
  };

  // 6. Assessment Handlers
  const handleOpenAddAssessment = () => {
    setEditingAssessmentId(null);
    setAssessmentForm({
      title: '',
      assessmentType: 'ASSIGNMENT',
      module: modules[0]?.title || 'General',
      maxMarks: 100,
      dueDate: '',
      instructions: '',
      questionPaperUrl: '',
    });
    setAssessmentModalOpen(true);
  };

  const handleEditAssessment = (assess: Assessment) => {
    setEditingAssessmentId(assess.id);
    setAssessmentForm({
      title: assess.title,
      assessmentType: assess.assessmentType || 'ASSIGNMENT',
      module: assess.module || modules[0]?.title || 'General',
      maxMarks: assess.maxMarks || 100,
      dueDate: assess.dueDate ? assess.dueDate.slice(0, 10) : '',
      instructions: assess.instructions || '',
      questionPaperUrl: assess.questionPaperUrl || '',
    });
    setAssessmentModalOpen(true);
  };

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessmentForm.title.trim() || !assessmentForm.questionPaperUrl.trim()) {
      toast.error('Assessment title and Question Paper / Resource URL are required');
      return;
    }
    const effectiveProgId = currentCenter?.assignedPrograms?.[0]?.id || programs[0]?.id;
    if (!effectiveProgId) {
      toast.error('No program found for this center to attach assessment');
      return;
    }

    setSubmitting(true);
    try {
      if (editingAssessmentId) {
        const res = await api.put(`/academic-center/assessments/${editingAssessmentId}`, {
          ...assessmentForm,
          centerId: activeCenterId,
          programId: effectiveProgId,
        });
        if (res.data.success) {
          setAssessments((prev) =>
            prev.map((a) => (a.id === editingAssessmentId ? res.data.data : a))
          );
          toast.success('Assessment updated successfully!');
        }
      } else {
        const res = await api.post('/academic-center/assessments', {
          ...assessmentForm,
          centerId: activeCenterId,
          programId: effectiveProgId,
        });
        if (res.data.success) {
          setAssessments((prev) => [res.data.data, ...prev]);
          toast.success('Assessment created and published!');
        }
      }
      setAssessmentModalOpen(false);
      setEditingAssessmentId(null);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to save assessment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    try {
      await api.delete(`/academic-center/assessments/${id}`);
      setAssessments((prev) => prev.filter((a) => a.id !== id));
      toast.success('Assessment deleted successfully');
    } catch {
      toast.error('Failed to delete assessment');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!window.confirm('Are you sure you want to delete this class session?')) return;
    try {
      await api.delete(`/academic-center/classes/${classId}`);
      toast.success('Class session deleted successfully');
      setClasses((prev) => prev.filter((c) => c.id !== classId));
    } catch {
      toast.error('Failed to delete class session');
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
      {/* 1. DEDICATED MULTI-CENTER SWITCHER (when user has multiple assigned centers) */}
      {centers.length > 1 && (
        <div className="p-4 rounded-2xl bg-card border-2 border-primary/30 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Your Assigned Academic Centers ({centers.length})
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">• Click any center to switch active workspace</span>
            </div>

            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-medium">
              Currently Managing: <strong>{currentCenter?.name}</strong>
            </Badge>
          </div>

          {/* Center Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {centers.map((c) => {
              const isActive = c.id === activeCenterId;
              const isOnline = c.type === 'ONLINE';
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    if (!isActive) {
                      setActiveCenterId(c.id);
                      toast.success(`Switched active workspace to: ${c.name}`);
                    }
                  }}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 relative ${isActive
                      ? isOnline
                        ? 'border-blue-500 bg-blue-500/10 shadow-md ring-2 ring-blue-500/20'
                        : 'border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-border/80 bg-background/70 hover:bg-muted/50 hover:border-primary/40'
                    }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${isActive
                      ? isOnline ? 'bg-blue-600 text-white shadow-xs' : 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-muted text-muted-foreground'
                    }`}>
                    {isOnline ? <Globe className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="font-bold text-sm leading-tight truncate text-foreground">
                        {c.name}
                      </h4>
                      {isActive && (
                        <Badge className={`text-[10px] px-1.5 py-0 font-bold shrink-0 ${isOnline ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                          }`}>
                          ACTIVE
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-mono font-medium">{c.code}</span>
                      <span>•</span>
                      <span className="font-semibold text-foreground">
                        {isOnline ? 'Recorded & LMS' : (c.city || 'Campus')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. PROMINENT ACTIVE CENTER HERO BANNER */}
      <div className={`p-6 rounded-2xl border-2 shadow-xs transition-all ${currentCenter?.type === 'ONLINE'
          ? 'bg-gradient-to-r from-blue-950/20 via-blue-900/10 to-background border-blue-500/30'
          : 'bg-gradient-to-r from-emerald-950/20 via-emerald-900/10 to-background border-emerald-500/30'
        }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Center:
              </span>
              {currentCenter?.type === 'ONLINE' ? (
                <Badge className="bg-blue-600 text-white border-none text-xs gap-1.5 py-0.5 px-2.5 font-bold shadow-xs">
                  <Globe className="w-3.5 h-3.5" /> Online Center (Recorded LMS)
                </Badge>
              ) : (
                <Badge className="bg-emerald-600 text-white border-none text-xs gap-1.5 py-0.5 px-2.5 font-bold shadow-xs">
                  <MapPin className="w-3.5 h-3.5" /> Offline Campus ({currentCenter?.city || 'Main'})
                </Badge>
              )}
              <Badge variant="outline" className="text-xs font-mono font-semibold bg-background/60">
                Code: {currentCenter?.code}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {currentCenter?.name}
            </h1>

            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
              <span>Delivery Mode: <strong>{currentCenter?.type === 'ONLINE' ? 'Asynchronous Recorded Lectures & Digital Curriculum' : 'Physical Classroom Campus'}</strong></span>
              {currentCenter?.address && (
                <>
                  <span>•</span>
                  <span>Campus Address: {currentCenter.address}</span>
                </>
              )}
              {currentCenter?.assignedPrograms && currentCenter.assignedPrograms.length > 0 && (
                <>
                  <span>•</span>
                  <span>Program: <strong className="text-primary">{currentCenter.assignedPrograms[0].name} ({currentCenter.assignedPrograms[0].code})</strong></span>
                </>
              )}
            </p>
          </div>

          {/* Quick Dropdown Alternative if many centers */}
          {centers.length > 1 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-background/90 p-3 rounded-xl border shrink-0 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Switch to:</span>
              <Select value={activeCenterId} onValueChange={(val) => {
                setActiveCenterId(val);
                const c = centers.find(x => x.id === val);
                if (c) toast.success(`Switched active workspace to: ${c.name}`);
              }}>
                <SelectTrigger className="w-64 h-9 text-xs bg-background font-medium">
                  <SelectValue placeholder="Select center" />
                </SelectTrigger>
                <SelectContent>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} ({c.type === 'ONLINE' ? 'Online LMS' : (c.city || 'Campus')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Quick Stats Banner - 4 Core Pillars */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-border/60">
          <div className="bg-background/80 hover:bg-background p-3.5 rounded-xl border border-border/50 shadow-xs flex items-center gap-3 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Course Modules</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold tracking-tight text-foreground">{modules.length}</span>
                <span className="text-[10px] text-muted-foreground">syllabus units</span>
              </div>
            </div>
          </div>

          <div className="bg-background/80 hover:bg-background p-3.5 rounded-xl border border-border/50 shadow-xs flex items-center gap-3 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Study Materials</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold tracking-tight text-foreground">{materials.length}</span>
                <span className="text-[10px] text-muted-foreground">learning items</span>
              </div>
            </div>
          </div>

          <div className="bg-background/80 hover:bg-background p-3.5 rounded-xl border border-border/50 shadow-xs flex items-center gap-3 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Assessments</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold tracking-tight text-foreground">{assessments.length}</span>
                <span className="text-[10px] text-muted-foreground">tasks/quizzes</span>
              </div>
            </div>
          </div>

          <div className="bg-background/80 hover:bg-background p-3.5 rounded-xl border border-border/50 shadow-xs flex items-center gap-3 transition-all">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Enrolled Students</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold tracking-tight text-foreground">{students.length}</span>
                <span className="text-[10px] text-muted-foreground">admitted</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <TabsList className="bg-muted/70 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="structure" className="gap-2 text-xs py-2 px-3">
              <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Course Structure ({modules.length})
            </TabsTrigger>
                                    <TabsTrigger value="classes" className="gap-2 text-xs py-2 px-3">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Class Schedules ({classes.length})
            </TabsTrigger>
            <TabsTrigger value="teachers" className="gap-2 text-xs py-2 px-3">
              <Users className="w-4 h-4" />
              Teachers ({teachers.length})
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-2 text-xs py-2 px-3">
              <GraduationCap className="w-4 h-4" />
              Students ({students.length})
            </TabsTrigger>
          </TabsList>

          <div className="text-xs text-muted-foreground flex items-center gap-1.5 px-3 py-1.5 bg-muted/40 rounded-lg border self-start sm:self-auto">
            <span className="font-semibold text-foreground">Workspace:</span>
            <span className="font-medium text-primary">{currentCenter?.name}</span>
          </div>
        </div>

        {/* 1. COURSE STRUCTURE TAB */}
        <TabsContent value="structure" className="space-y-4">
          {/* Header & Program Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Course Structure & Curriculum Modules
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure syllabus units, recorded video lessons, and live interactive classes for this program.
              </p>
            </div>

            {programs.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Program:</span>
                <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                  <SelectTrigger className="w-[200px] h-8 text-xs">
                    <SelectValue placeholder="Select Program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} {p.code ? `(${p.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Program & Teacher Info Banner */}
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
                      <Badge variant="secondary" className="text-xs">
                        {activeProgram.mode || 'ONLINE'}
                      </Badge>
                      {activeProgram.duration && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {typeof activeProgram.duration === 'string' ? activeProgram.duration : 'Standard Duration'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 flex-wrap">
                      <span className="font-medium">Program Teacher:</span>
                      {activeProgramTeacher ? (
                        <span className="font-semibold text-foreground flex items-center gap-1.5 bg-background/80 px-2 py-0.5 rounded-md border text-xs">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {activeProgramTeacher.name}
                          {activeProgramTeacher.specialization && (
                            <span className="text-muted-foreground text-[11px] font-normal">
                              ({activeProgramTeacher.specialization})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 text-xs">
                          <AlertCircle className="w-3.5 h-3.5" />
                          No teacher assigned yet (Classes will inherit teacher once assigned)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditProgramModal(activeProgram)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5 text-purple-600" />
                    Edit Program
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openChangeTeacherModal(activeProgram)}
                    className="h-8 text-xs gap-1.5 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                  >
                    <UserCog className="w-3.5 h-3.5 text-purple-600" />
                    {activeProgramTeacher ? 'Change Teacher' : 'Assign Teacher'}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openTeacherHistoryModal(activeProgram)}
                    className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <History className="w-3.5 h-3.5" />
                    Teacher History
                  </Button>

                  <Button
                    onClick={handleOpenAddModule}
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Module & Classes
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center border-dashed">
              <p className="text-sm text-muted-foreground">No program assigned to this center. Please assign or create a program first.</p>
            </Card>
          )}

          {modules.length === 0 ? (
            <Card className="border-dashed p-10 text-center">
              <Layers className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <h4 className="text-base font-semibold">No Course Modules Defined</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Start structuring your curriculum by adding Module 1. In one simple form, you can define the syllabus topics and configure all recorded video lessons and live interactive classes!
              </p>
              <Button onClick={handleOpenAddModule} className="mt-4 gap-2 bg-purple-600 hover:bg-purple-700 text-white" size="sm">
                <Plus className="w-4 h-4" />
                Create First Module & Classes
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {modules.map((mod, idx) => {
                const modClasses = classes.filter((c) => c.moduleName === mod.title);
                const classTitles = new Set(modClasses.map((c) => c.title));
                const modMaterials = materials.filter((m) => m.chapterOrTopic && classTitles.has(m.chapterOrTopic));
                const modAssessments = assessments.filter((a) => a.module === mod.title || (a.module && classTitles.has(a.module)));

                const recordedCount = modClasses.filter((c) => c.recordingUrl && !c.meetingLink).length;
                const liveCount = modClasses.filter((c) => !!c.meetingLink || (!c.recordingUrl && !!c.startTime)).length;

                return (
                  <Card key={mod.id || idx} className="border hover:border-purple-500/40 transition-all shadow-xs">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 text-xs font-semibold">
                              Unit {idx + 1}
                            </Badge>
                            <CardTitle className="text-base font-bold">{mod.title}</CardTitle>
                            {mod.durationHours && (
                              <Badge variant="secondary" className="text-[11px] gap-1 py-0">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                {mod.durationHours} Hours
                              </Badge>
                            )}
                            {modClasses.length > 0 && (
                              <Badge variant="outline" className="text-[11px] border-indigo-200 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20 py-0">
                                {modClasses.length} Sessions ({recordedCount} Recorded, {liveCount} Live)
                              </Badge>
                            )}
                          </div>
                          {mod.description && (
                            <CardDescription className="text-xs text-muted-foreground mt-1">
                              {mod.description}
                            </CardDescription>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditModule(mod)}
                            className="h-8 text-xs gap-1.5 hover:border-primary/50 text-foreground"
                          >
                            <Pencil className="w-3.5 h-3.5 text-purple-600" />
                            Edit Module & Classes
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleOpenDeleteModuleModal(mod)}
                            className="h-8 text-xs gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold shadow-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Module
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-3">
                      {/* Topics / Chapters list */}
                      {mod.topics && mod.topics.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                            Topics / Lessons Included:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {mod.topics.map((t, tIdx) => (
                              <Badge
                                key={tIdx}
                                variant="secondary"
                                className="text-xs font-normal bg-muted/60 hover:bg-muted py-1 px-2.5"
                              >
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Embedded Class Sessions breakdown */}
                      {modClasses.length > 0 && (
                        <div className="pt-2 border-t space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-purple-600" />
                              Class Sessions ({modClasses.length})
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Assigned Teacher: <strong className="text-foreground">{activeProgramTeacher?.name || 'Program Teacher'}</strong>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {modClasses.map((cls) => {
                              const isRecorded = cls.recordingUrl && !cls.meetingLink;
                              return (
                                <div
                                  key={cls.id}
                                  className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 text-xs transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {isRecorded ? (
                                      <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                                        <Video className="w-4 h-4" />
                                      </div>
                                    ) : (
                                      <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                                        <Radio className="w-4 h-4" />
                                      </div>
                                    )}
                                    <div className="truncate">
                                      <p className="font-medium text-foreground truncate">{cls.title}</p>
                                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                        <span className="font-medium">
                                          {isRecorded ? '🎥 Recorded Video' : '📡 Live Interactive Class'}
                                        </span>
                                        {!isRecorded && cls.startTime && (
                                          <span>
                                            • {new Date(cls.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0 ml-2 flex items-center gap-1.5">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setMaterialForm((prev) => ({ ...prev, programId: activeProgram?.id || prev.programId, chapterOrTopic: cls.title }));
                                        setMaterialModalOpen(true);
                                      }}
                                      title="Upload Material"
                                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <BookOpen className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setAssessmentForm((prev) => ({ ...prev, programId: activeProgram?.id || prev.programId, module: cls.title }));
                                        setAssessmentModalOpen(true);
                                        setEditingAssessmentId(null);
                                      }}
                                      title="Add Assessment"
                                      className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                    >
                                      <CheckSquare className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteClass(cls.id)}
                                      title="Delete Class"
                                      className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openAttendanceModal(cls)}
                                      title="View Attendance"
                                      className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    >
                                      <Users className="w-3.5 h-3.5" />
                                    </Button>
                                    {isRecorded && cls.recordingUrl ? (
                                      <a
                                        href={cls.recordingUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 font-medium bg-purple-50 dark:bg-purple-950/40 px-2 py-1 rounded ml-1"
                                      >
                                        Watch Video <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    ) : cls.meetingLink ? (
                                      <a
                                        href={cls.meetingLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 font-medium bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded ml-1"
                                      >
                                        Join Live <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      
                      {/* Render Study Materials */}
                      {modMaterials.length > 0 && (
                        <div className="pt-2 border-t space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                              <BookOpen className="w-3 h-3 text-blue-600" />
                              Study Materials ({modMaterials.length})
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {modMaterials.map((mat) => (
                              <div key={mat.id} className="flex flex-col gap-1.5 p-2.5 rounded-lg border bg-muted/10 hover:bg-muted/30 text-xs transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`p-1.5 rounded-md shrink-0 ${mat.type === 'VIDEO' ? 'bg-rose-500/10 text-rose-600' : 'bg-blue-500/10 text-blue-600'}`}>
                                      {mat.type === 'VIDEO' ? <Video className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="truncate">
                                      <p className="font-medium text-foreground truncate">{mat.title}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">{mat.chapterOrTopic ? `Session: ${mat.chapterOrTopic}` : mat.type}</p>
                                    </div>
                                  </div>
                                  <div className="shrink-0">
                                    {mat.type === 'VIDEO' ? (
                                      <Button size="sm" variant="ghost" onClick={() => setVideoPreviewUrl(mat.mediaUrl)} className="h-6 w-6 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                                        <Play className="w-3 h-3" />
                                      </Button>
                                    ) : (
                                      <a href={mat.mediaUrl} target="_blank" rel="noopener noreferrer">
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                          <Download className="w-3 h-3" />
                                        </Button>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Render Assessments */}
                      {modAssessments.length > 0 && (
                        <div className="pt-2 border-t space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                              <CheckSquare className="w-3 h-3 text-amber-600" />
                              Assessments ({modAssessments.length})
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {modAssessments.map((assess) => (
                              <div key={assess.id} className="flex flex-col gap-1.5 p-2.5 rounded-lg border bg-muted/10 hover:bg-muted/30 text-xs transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground truncate">{assess.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-semibold text-amber-600 border-amber-200 bg-amber-500/10">
                                        {assess.assessmentType}
                                      </Badge>
                                      <span className="text-[10px] text-muted-foreground">Max: {assess.maxMarks}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <a href={assess.questionPaperUrl} target="_blank" rel="noopener noreferrer">
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                        <ExternalLink className="w-3 h-3" />
                                      </Button>
                                    </a>
                                    <Button size="sm" variant="ghost" onClick={() => handleEditAssessment(assess)} className="h-6 w-6 p-0 hover:bg-muted/50">
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteAssessment(assess.id)} className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Module Attachments Summary */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-600" />
                          <strong className="text-foreground">{modClasses.length}</strong> Classes
                        </span>
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                          <strong className="text-foreground">{modMaterials.length}</strong> Study Materials
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                          <strong className="text-foreground">{modAssessments.length}</strong> Assessments
                        </span>
                        <div className="flex items-center gap-2 ml-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openScheduleClassModal(activeProgram?.id, undefined, activeProgram?.teacherId || undefined, mod.title)}
                            className="h-7 text-xs text-purple-600 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 gap-1"
                          >
                            <Calendar className="w-3 h-3" />
                            + Schedule Class
                          </Button>
                          {/* Buttons moved to Class Session cards */}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

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
                        {cls.recordingUrl || currentCenter?.type === 'ONLINE' ? (
                          <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 text-[10px] gap-1">
                            <Video className="w-3 h-3" /> Recorded Class
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
                        <Badge variant="outline" className="text-[10px]">
                          {cls.status}
                        </Badge>
                        {cls.moduleName && (
                          <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 text-[10px] gap-1">
                            <Layers className="w-3 h-3" />
                            {cls.moduleName}
                          </Badge>
                        )}
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
                      {(cls.recordingUrl || (currentCenter?.type === 'ONLINE' && cls.meetingLink)) && (
                        <Button
                          size="sm"
                          onClick={() => setVideoPreviewUrl(cls.recordingUrl || cls.meetingLink || '')}
                          className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Watch Recording
                        </Button>
                      )}
                      {cls.meetingLink && currentCenter?.type !== 'ONLINE' && (
                        <a href={cls.meetingLink} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Join Meeting
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
                  onValueChange={(val: 'VIDEO' | 'DOCUMENT' | 'EBOOK') => setMaterialForm({ ...materialForm, type: val })}
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
                <Label htmlFor="mChapter">Class Session</Label>
                {classes.length > 0 ? (
                  <Select
                    value={materialForm.chapterOrTopic}
                    onValueChange={(val) => setMaterialForm({ ...materialForm, chapterOrTopic: val })}
                  >
                    <SelectTrigger id="mChapter">
                      <SelectValue placeholder="Select Class Session" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.title}>
                          {cls.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="mChapter"
                    placeholder="e.g. Session 1: React Basics"
                    value={materialForm.chapterOrTopic}
                    onChange={(e) => setMaterialForm({ ...materialForm, chapterOrTopic: e.target.value })}
                  />
                )}
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Schedule Class</DialogTitle>
            <DialogDescription>Schedule a curriculum class, link it to a course module, and assign an instructor.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleClass} className="space-y-4 pt-2">
            {/* Center Program Information */}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="clTitle" className="text-xs font-semibold">Class Title *</Label>
                <Input
                  id="clTitle"
                  placeholder="e.g. Unit 1: Foundations & Architecture"
                  value={classForm.title}
                  onChange={(e) => setClassForm({ ...classForm, title: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Module Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="clModule" className="text-xs font-semibold flex items-center gap-1">
                  <Layers className="w-3 h-3 text-purple-600" />
                  Course Module (Optional)
                </Label>
                <Select
                  value={classForm.moduleName || 'none'}
                  onValueChange={(val) => setClassForm({ ...classForm, moduleName: val === 'none' ? '' : val })}
                >
                  <SelectTrigger id="clModule" className="h-9 text-xs">
                    <SelectValue placeholder="Select course module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- General / No Module --</SelectItem>
                    {modules.map((m) => (
                      <SelectItem key={m.id} value={m.title}>
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="clTeacher" className="text-xs font-semibold">Assigned Teacher</Label>
                <Select
                  value={classForm.teacherId || 'none'}
                  onValueChange={(val) => setClassForm({ ...classForm, teacherId: val })}
                >
                  <SelectTrigger id="clTeacher" className="h-9 text-xs">
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

              <div className="space-y-1.5">
                <Label htmlFor="clStart" className="text-xs font-semibold">Start Time *</Label>
                <Input
                  id="clStart"
                  type="datetime-local"
                  value={classForm.startTime}
                  onChange={(e) => setClassForm({ ...classForm, startTime: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clEnd" className="text-xs font-semibold">End Time *</Label>
                <Input
                  id="clEnd"
                  type="datetime-local"
                  value={classForm.endTime}
                  onChange={(e) => setClassForm({ ...classForm, endTime: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Unified Location & Meeting / Video Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl border border-border/80">
              <div className="space-y-1">
                <Label htmlFor="clRoom" className="text-xs font-semibold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Room / Hall Location
                </Label>
                <Input
                  id="clRoom"
                  placeholder="e.g. Room 302, Academic Block"
                  value={classForm.roomOrLocation}
                  onChange={(e) => setClassForm({ ...classForm, roomOrLocation: e.target.value })}
                  className="h-9 text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="clMeetLink" className="text-xs font-semibold flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-blue-600" />
                  Meeting / Video Stream Link
                </Label>
                <Input
                  id="clMeetLink"
                  placeholder="https://zoom.us/... or https://meet.google.com/..."
                  value={classForm.meetingLink || classForm.recordingUrl}
                  onChange={(e) => setClassForm({ ...classForm, meetingLink: e.target.value, recordingUrl: e.target.value })}
                  className="h-9 text-xs bg-background"
                />
              </div>
            </div>

            {/* Session Notes */}
            <div className="space-y-1">
              <Label htmlFor="clNotes" className="text-xs font-semibold">Class Notes / Instructions (Optional)</Label>
              <Input
                id="clNotes"
                placeholder="Topic prerequisites, materials to bring, or guidance..."
                value={classForm.notes}
                onChange={(e) => setClassForm({ ...classForm, notes: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

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
        </DialogContent>
      </Dialog>

      {/* 8. UNIFIED COURSE MODULE & CLASSES MODAL */}
      <Dialog open={moduleModalOpen} onOpenChange={setModuleModalOpen}>
        <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {(() => {
            const currentEditingModule = modules.find(
              (m) => (m.id && m.id === editingModuleId) || (m.title && m.title.trim().toLowerCase() === moduleForm.title.trim().toLowerCase())
            );
            const isEditing = Boolean(editingModuleId || currentEditingModule);

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between gap-3 pr-6">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <Layers className="w-5 h-5 text-purple-600" />
                      {isEditing ? 'Edit Module & Class Structure' : 'Create Course Module & Classes'}
                    </DialogTitle>
                    {isEditing && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const targetMod = currentEditingModule || {
                            id: editingModuleId || `mod-${Date.now()}`,
                            title: moduleForm.title,
                            description: moduleForm.description,
                            topics: moduleForm.topics.split('\n'),
                          };
                          handleOpenDeleteModuleModal(targetMod);
                        }}
                        className="h-8 text-xs gap-1.5 bg-destructive hover:bg-destructive/90 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Module
                      </Button>
                    )}
                  </div>
                  <DialogDescription>
                    Configure this syllabus unit and set up both recorded video lectures and live interactive classes in one single form.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSaveModule} className="space-y-5 pt-2">
                  {/* Section 1: Module Information */}
                  <div className="space-y-3 p-3.5 rounded-xl border bg-muted/20">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                        <BookOpen className="w-4 h-4 text-purple-600" />
                        Module Details
                      </h4>
                      <div className="flex items-center gap-2">
                        {activeProgram && (
                          <Badge variant="outline" className="text-xs">
                            Program: {activeProgram.name}
                          </Badge>
                        )}
                        {isEditing && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const targetMod = currentEditingModule || {
                                id: editingModuleId || `mod-${Date.now()}`,
                                title: moduleForm.title,
                                description: moduleForm.description,
                                topics: moduleForm.topics.split('\n'),
                              };
                              handleOpenDeleteModuleModal(targetMod);
                            }}
                            className="h-7 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete Module
                          </Button>
                        )}
                      </div>
                    </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="modTitle">Module Title *</Label>
                  <Input
                    id="modTitle"
                    placeholder="e.g. Module 1: Core Fundamentals & System Architecture"
                    value={moduleForm.title}
                    onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modHours">Estimated Hours</Label>
                  <Input
                    id="modHours"
                    type="number"
                    placeholder="e.g. 15"
                    value={moduleForm.durationHours}
                    onChange={(e) => setModuleForm({ ...moduleForm, durationHours: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modDesc">Description / Learning Objectives</Label>
                <Textarea
                  id="modDesc"
                  rows={2}
                  placeholder="Overview of this module and key takeaways for students..."
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                />
              </div>
            </div>

            {/* Section 2: Class Sessions (Recorded Videos & Live Classes) */}
            <div className="space-y-3 p-3.5 rounded-xl border bg-gradient-to-b from-purple-50/40 dark:from-purple-950/20 to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    Class Sessions (Recorded & Live)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Assigned Teacher: <strong className="text-foreground">{activeProgramTeacher?.name || 'Program Teacher'}</strong> (Inherited automatically)
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddClassRow('RECORDED_VIDEO')}
                    className="h-7 text-xs gap-1 border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  >
                    <Video className="w-3 h-3" />
                    + Add Recorded Video
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddClassRow('ONLINE_LIVE_CLASS')}
                    className="h-7 text-xs gap-1 border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  >
                    <Radio className="w-3 h-3" />
                    + Add Live Class
                  </Button>
                </div>
              </div>

              {moduleForm.classes.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg bg-background/60">
                  <p className="text-xs text-muted-foreground">No class sessions configured for this module yet.</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddClassRow('RECORDED_VIDEO')}
                      className="text-xs h-7 gap-1"
                    >
                      <Video className="w-3 h-3 text-amber-600" />
                      Add Recorded Video
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddClassRow('ONLINE_LIVE_CLASS')}
                      className="text-xs h-7 gap-1"
                    >
                      <Radio className="w-3 h-3 text-indigo-600" />
                      Add Live Online Class
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {moduleForm.classes.map((cls, idx) => (
                    <Card key={idx} className="p-3 border bg-background/90 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">
                            #{idx + 1}
                          </span>
                          <Select
                            value={cls.type}
                            onValueChange={(val: ModuleClassItem['type']) => handleUpdateClassRow(idx, { type: val })}
                          >
                            <SelectTrigger className="h-7 text-xs w-[170px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RECORDED_VIDEO" className="text-xs">
                                🎥 Recorded Video
                              </SelectItem>
                              <SelectItem value="ONLINE_LIVE_CLASS" className="text-xs">
                                📡 Live Online Class
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveClassRow(idx)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Title row */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Session Title *</Label>
                        <Input
                          placeholder={`e.g. Session ${idx + 1}: Deep Dive into Core Architecture`}
                          value={cls.title}
                          onChange={(e) => handleUpdateClassRow(idx, { title: e.target.value })}
                          className="h-8 text-xs"
                          required
                        />
                      </div>

                      {/* Type-Specific Fields */}
                      {cls.type === 'RECORDED_VIDEO' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                          <div className="sm:col-span-2 space-y-1">
                            <Label className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              Video Stream / Recording URL *
                            </Label>
                            <Input
                              placeholder="https://youtube.com/watch?v=... or Vimeo / Loom / MP4 link"
                              value={cls.recordingUrl || ''}
                              onChange={(e) => handleUpdateClassRow(idx, { recordingUrl: e.target.value })}
                              className="h-8 text-xs"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Duration (Mins)</Label>
                            <Input
                              type="number"
                              placeholder="45"
                              value={cls.durationMins || 45}
                              onChange={(e) => handleUpdateClassRow(idx, { durationMins: Number(e.target.value) })}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5 pt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                              <Label className="text-xs font-medium text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Start Date & Time *
                              </Label>
                              <Input
                                type="datetime-local"
                                value={cls.startTime || ''}
                                onChange={(e) => handleUpdateClassRow(idx, { startTime: e.target.value })}
                                className="h-8 text-xs"
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-medium">End Date & Time</Label>
                              <Input
                                type="datetime-local"
                                value={cls.endTime || ''}
                                onChange={(e) => handleUpdateClassRow(idx, { endTime: e.target.value })}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="sm:col-span-2 space-y-1">
                              <Label className="text-xs font-medium">Meeting Link (Zoom / Google Meet)</Label>
                              <Input
                                placeholder="https://meet.google.com/... or Zoom link"
                                value={cls.meetingLink || ''}
                                onChange={(e) => handleUpdateClassRow(idx, { meetingLink: e.target.value })}
                                className="h-8 text-xs"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Passcode (Optional)</Label>
                              <Input
                                placeholder="Passcode if any"
                                value={cls.meetingPassword || ''}
                                onChange={(e) => handleUpdateClassRow(idx, { meetingPassword: e.target.value })}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>

                  <DialogFooter className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t mt-4">
                    {isEditing ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const targetMod = currentEditingModule || {
                            id: editingModuleId || `mod-${Date.now()}`,
                            title: moduleForm.title,
                            description: moduleForm.description,
                            topics: moduleForm.topics.split('\n'),
                          };
                          handleOpenDeleteModuleModal(targetMod);
                        }}
                        className="gap-1.5 self-start sm:self-auto text-xs h-8 bg-destructive hover:bg-destructive/90 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Module
                      </Button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button type="button" variant="outline" size="sm" onClick={() => setModuleModalOpen(false)} className="text-xs h-8">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-2 text-xs h-8 font-medium">
                        {submitting ? 'Saving Module & Classes...' : isEditing ? 'Save Changes' : 'Create Module & Classes'}
                      </Button>
                    </div>
                  </DialogFooter>
                </form>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* DELETE MODULE CONFIRMATION MODAL */}
      <Dialog open={deleteModuleModalOpen} onOpenChange={setDeleteModuleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Course Module
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this module from <strong className="text-foreground">{activeProgram?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          {moduleToDelete && (
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-lg border bg-destructive/5 border-destructive/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">{moduleToDelete.title}</span>
                  {moduleToDelete.durationHours && (
                    <Badge variant="secondary" className="text-xs">
                      {moduleToDelete.durationHours} Hours
                    </Badge>
                  )}
                </div>
                {moduleToDelete.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {moduleToDelete.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                  <span>Topics: {moduleToDelete.topics?.length || 0} items</span>
                  <span>•</span>
                  <span>Classes Attached: {classes.filter((c) => c.moduleName === moduleToDelete.title).length}</span>
                </div>
              </div>

              {classes.some((c) => c.moduleName === moduleToDelete.title) && (
                <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer pt-1 bg-muted/30 p-2.5 rounded-lg border">
                  <input
                    type="checkbox"
                    checked={deleteAssociatedClasses}
                    onChange={(e) => setDeleteAssociatedClasses(e.target.checked)}
                    className="mt-0.5 rounded border-muted-foreground/30 accent-destructive"
                  />
                  <span>
                    Also delete all <strong className="text-foreground">{classes.filter((c) => c.moduleName === moduleToDelete.title).length} scheduled/recorded classes</strong> associated with this module
                  </span>
                </label>
              )}
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModuleModalOpen(false)}
              disabled={deletingModule}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteModule}
              disabled={deletingModule}
              className="gap-1.5 text-xs h-8"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deletingModule ? 'Deleting Module...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CHANGE PROGRAM TEACHER MODAL */}
      <Dialog open={changeTeacherModalOpen} onOpenChange={setChangeTeacherModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-purple-600" />
              Assign / Change Program Teacher
            </DialogTitle>
            <DialogDescription>
              Assign a qualified instructor for <strong className="text-foreground">{activeProgram?.name}</strong>. The teacher will be automatically applied to all curriculum modules and class sessions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangeTeacher} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="teacherSelect">Select Instructor *</Label>
              <Select
                value={changeTeacherForm.teacherId}
                onValueChange={(val) => setChangeTeacherForm({ ...changeTeacherForm, teacherId: val })}
              >
                <SelectTrigger id="teacherSelect">
                  <SelectValue placeholder="Choose an instructor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- No Teacher Assigned --</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.specialization || t.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="teacherRemarks">Reason / Notes for Assignment</Label>
              <Textarea
                id="teacherRemarks"
                rows={2}
                placeholder="e.g. Assigned for upcoming semester, teacher rotation, schedule update..."
                value={changeTeacherForm.remarks}
                onChange={(e) => setChangeTeacherForm({ ...changeTeacherForm, remarks: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setChangeTeacherModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-purple-600 hover:bg-purple-700 text-white">
                {submitting ? 'Updating Teacher...' : 'Save Teacher Assignment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* TEACHER ASSIGNMENT HISTORY MODAL */}
      <Dialog open={teacherHistoryModalOpen} onOpenChange={setTeacherHistoryModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              Teacher Assignment History
            </DialogTitle>
            <DialogDescription>
              Audit log of instructor assignments and changes for <strong className="text-foreground">{activeProgram?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-2 space-y-3">
            {teacherHistoryLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Loading history...
              </div>
            ) : teacherHistoryList.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg p-6">
                <History className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">No previous teacher changes recorded for this program yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teacherHistoryList.map((entry, idx) => (
                  <Card key={entry.id || idx} className="p-3.5 border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium">
                        {entry.changedAt ? new Date(entry.changedAt).toLocaleString() : 'Date N/A'}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        Changed by: {entry.changedByName || 'Counselor'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {entry.previousTeacherName ? entry.previousTeacherName : 'None'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span className="font-semibold text-foreground bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                        {entry.newTeacherName ? entry.newTeacherName : 'Unassigned'}
                      </span>
                    </div>

                    {entry.remarks && (
                      <p className="text-[11px] text-muted-foreground italic bg-background/60 p-2 rounded border">
                        "{entry.remarks}"
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setTeacherHistoryModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. ASSESSMENT MODAL */}
      <Dialog open={assessmentModalOpen} onOpenChange={setAssessmentModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAssessmentId ? 'Edit Assessment' : 'Create Course Assessment'}</DialogTitle>
            <DialogDescription>
              Assign tests, assignments, quizzes, or projects for students with deadlines and max marks.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAssessment} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="assTitle">Assessment Title *</Label>
              <Input
                id="assTitle"
                placeholder="e.g. Assignment 1: Case Study on System Design"
                value={assessmentForm.title}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assType">Assessment Type</Label>
                <Select
                  value={assessmentForm.assessmentType}
                  onValueChange={(val) => setAssessmentForm({ ...assessmentForm, assessmentType: val })}
                >
                  <SelectTrigger id="assType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSIGNMENT">Assignment</SelectItem>
                    <SelectItem value="QUIZ">Quiz / Online Test</SelectItem>
                    <SelectItem value="PROJECT">Term Project</SelectItem>
                    <SelectItem value="EXAM">Practice Examination</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assModule">Associated Class / Module</Label>
                <Input
                  id="assModule"
                  value={assessmentForm.module}
                  disabled
                  className="bg-muted/50 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assMarks">Maximum Marks</Label>
                <Input
                  id="assMarks"
                  type="number"
                  placeholder="e.g. 50 or 100"
                  value={assessmentForm.maxMarks}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, maxMarks: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assDue">Submission Due Date</Label>
                <Input
                  id="assDue"
                  type="date"
                  value={assessmentForm.dueDate}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assUrl">Question Paper / Assessment URL *</Label>
              <Input
                id="assUrl"
                placeholder="https://.../question-paper.pdf or Google Form / Drive link"
                value={assessmentForm.questionPaperUrl}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, questionPaperUrl: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assInst">Instructions / Evaluation Criteria</Label>
              <Textarea
                id="assInst"
                rows={2}
                placeholder="Explain requirements, submission format (PDF/Doc), and guidelines..."
                value={assessmentForm.instructions}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, instructions: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAssessmentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Publishing...' : editingAssessmentId ? 'Save Changes' : 'Create & Publish Assessment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
