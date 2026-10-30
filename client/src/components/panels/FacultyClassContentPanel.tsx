import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Folder, FileText, Upload, Loader2, Download, BookOpen, ChevronDown, ChevronUp, User, UserPlus, Clock, Play, Users, CheckSquare, Layers, Video, AlertTriangle, AlertCircle, CheckCircle2, FileSpreadsheet, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { shrinkImage } from '@/lib/uploadFile';

export function FacultyClassContentPanel({ academicClass, onBack }: { academicClass: any; onBack: () => void }) {
  const [modules, setModules] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedSubModules, setExpandedSubModules] = useState<Record<string, boolean>>({});

  // Module Modal
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: '', description: '', order: '' });

  // Sub-Module Modal
  const [subModuleDialogOpen, setSubModuleDialogOpen] = useState(false);
  const [activeModuleForSubModuleId, setActiveModuleForSubModuleId] = useState<string | null>(null);
  const [editingSubModuleId, setEditingSubModuleId] = useState<string | null>(null);
  const [subModuleForm, setSubModuleForm] = useState({ title: '', description: '', order: '' });

  // Lesson Modal
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeSubModuleId, setActiveSubModuleId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({ title: '', description: '', order: '', videoUrl: '' });

  // Assign Teacher Modal
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignLesson, setAssignLesson] = useState<any>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('default');
  const [assignReason, setAssignReason] = useState('');

  // History Modal
  // Start Class Modal
  const [startClassDialogOpen, setStartClassDialogOpen] = useState(false);
  const [startClassLesson, setStartClassLesson] = useState<any>(null);
  const [startClassBatchId, setStartClassBatchId] = useState<string>('');
  
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [lessonHistory, setLessonHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Sessions Modal
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);
  const [lessonSessions, setLessonSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // View Attendance Modal
  const [viewAttendanceDialogOpen, setViewAttendanceDialogOpen] = useState(false);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);


  // Material Modal
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [materialForm, setMaterialForm] = useState({ title: '', description: '' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const materialExt = (uploadFile?.name.split('.').pop() || '').toLowerCase();
  const isMaterialImage = ['jpeg', 'jpg', 'png', 'webp', 'gif'].includes(materialExt);
  const MAX_MATERIAL_BYTES = 5 * 1024 * 1024; // 5 MB limit
  const isMaterialOverSize = uploadFile ? uploadFile.size > MAX_MATERIAL_BYTES : false;
  const materialSizeFormatted = uploadFile
    ? uploadFile.size > 1024 * 1024
      ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB`
      : `${(uploadFile.size / 1024).toFixed(1)} KB`
    : '';

  // Assessment Modal
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [existingAssessment, setExistingAssessment] = useState<any | null>(null);
  const assessmentFileInputRef = useRef<HTMLInputElement>(null);
  const [assessmentForm, setAssessmentForm] = useState({
    title: 'Lesson Assessment',
    description: '',
    passingScore: '50',
    questions: [] as any[]
  });

  useEffect(() => {
    fetchModules();
    fetchFaculty();
    fetchBatches();
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/faculty-portal/classes/${academicClass.id}/modules`);
      const fetchedModules = res.data.data || [];
      setModules(fetchedModules);
      
      if (fetchedModules.length > 0 && Object.keys(expandedModules).length === 0) {
        setExpandedModules({ [fetchedModules[0].id]: true });
      }

      setExpandedSubModules(prev => {
        const next = { ...prev };
        fetchedModules.forEach((m: any) => {
          m.subModules?.forEach((s: any) => {
            if (next[s.id] === undefined) {
              next[s.id] = true;
            }
          });
        });
        return next;
      });
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

  const fetchBatches = async () => {
    try {
      const res = await api.get(`/faculty-portal/classes/${academicClass.id}/batches`);
      setBatches(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch batches');
    }
  };
  const toggleModule = (id: string) => {
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSubModule = (id: string) => {
    setExpandedSubModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- MODULE ACTIONS ---
  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...moduleForm, order: moduleForm.order ? parseInt(moduleForm.order) : 0 };
      if (editingModuleId) {
        await api.put(`/faculty-portal/modules/${editingModuleId}`, payload);
        toast.success('Module updated');
      } else {
        await api.post(`/faculty-portal/classes/${academicClass.id}/modules`, payload);
        toast.success('Module created');
      }
      setModuleDialogOpen(false);
      fetchModules();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save module');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and ALL its sub-modules, lessons and materials?')) return;
    try {
      await api.delete(`/faculty-portal/modules/${moduleId}`);
      toast.success('Module deleted');
      fetchModules();
    } catch (err: any) {
      if (!err.isDeleteRequest) {
        toast.error('Failed to delete module');
      }
    }
  };

  // --- SUB-MODULE ACTIONS ---
  const handleSubModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...subModuleForm, order: subModuleForm.order ? parseInt(subModuleForm.order) : 0 };
      if (editingSubModuleId) {
        await api.put(`/faculty-portal/submodules/${editingSubModuleId}`, payload);
        toast.success('Sub-module updated');
      } else {
        await api.post(`/faculty-portal/modules/${activeModuleForSubModuleId}/submodules`, payload);
        toast.success('Sub-module created');
      }
      setSubModuleDialogOpen(false);
      fetchModules();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save sub-module');
    }
  };

  const handleDeleteSubModule = async (subModuleId: string) => {
    if (!confirm('Delete this sub-module and all its lessons and materials?')) return;
    try {
      await api.delete(`/faculty-portal/submodules/${subModuleId}`);
      toast.success('Sub-module deleted');
      fetchModules();
    } catch (err: any) {
      if (!err.isDeleteRequest) {
        toast.error('Failed to delete sub-module');
      }
    }
  };

  // --- HELPERS FOR OPENING MODALS ---
  const openAddLesson = (moduleId: string, subModuleId: string | null = null) => {
    setActiveModuleId(moduleId);
    setActiveSubModuleId(subModuleId);
    setEditingLessonId(null);
    setLessonForm({ title: '', description: '', order: '', videoUrl: '' });
    setLessonDialogOpen(true);
  };

  const openAddSubModule = (moduleId: string) => {
    setActiveModuleForSubModuleId(moduleId);
    setEditingSubModuleId(null);
    setSubModuleForm({ title: '', description: '', order: '' });
    setSubModuleDialogOpen(true);
  };

  // --- LESSON ACTIONS ---
  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleId && !activeSubModuleId) {
      toast.error('Module is required');
      return;
    }
    try {
      const payload = { 
        ...lessonForm, 
        order: lessonForm.order ? parseInt(lessonForm.order) : 0,
        classSubModuleId: activeSubModuleId ? activeSubModuleId : null
      };
      
      if (editingLessonId) {
        await api.put(`/faculty-portal/lessons/${editingLessonId}`, payload);
        toast.success('Lesson updated');
      } else {
        const endpoint = activeSubModuleId 
          ? `/faculty-portal/submodules/${activeSubModuleId}/lessons` 
          : `/faculty-portal/modules/${activeModuleId}/lessons`;
        await api.post(endpoint, payload);
        toast.success('Lesson created');
      }
      setLessonDialogOpen(false);
      fetchModules();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save lesson');
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await api.delete(`/faculty-portal/lessons/${id}`);
      fetchModules();
      toast.success('Lesson deleted successfully');
    } catch (err: any) {
      if (!err.isDeleteRequest) {
        toast.error(err.response?.data?.message || 'Failed to delete lesson');
      }
    }
  };

  // --- MATERIAL ACTIONS ---
  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !activeLessonId) return toast.error('Please select a file');

    let fileToUpload = uploadFile;

    // Auto-compress image files if they exceed budget
    if (isMaterialImage && uploadFile.size > MAX_MATERIAL_BYTES) {
      setCompressing(true);
      try {
        fileToUpload = await shrinkImage(uploadFile, MAX_MATERIAL_BYTES);
      } catch (err) {
        console.warn('Image shrink fallback:', err);
      } finally {
        setCompressing(false);
      }
    }

    // Hard block if file is still over size limit (e.g., large PDF or document)
    if (fileToUpload.size > MAX_MATERIAL_BYTES) {
      const sizeMB = (fileToUpload.size / (1024 * 1024)).toFixed(2);
      return toast.error(`File is too large (${sizeMB} MB). Maximum allowed size is 5 MB. Please compress your document before uploading.`);
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', fileToUpload);
      fd.append('title', materialForm.title);
      fd.append('description', materialForm.description);

      await api.post(`/faculty-portal/lessons/${activeLessonId}/materials`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Material uploaded successfully');
      setMaterialDialogOpen(false);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchModules();
    } catch (err: any) {
      if (err?.response?.status === 413 || err?.message?.includes('413') || err?.response?.data?.message?.includes('too large')) {
        toast.error('The file exceeds the 5 MB server limit. Please compress or select a smaller file.');
      } else {
        toast.error(err.response?.data?.message || 'Upload failed');
      }
    } finally {
      setUploading(false);
      setCompressing(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('Delete this material?')) return;
    try {
      await api.delete(`/faculty-portal/materials/${materialId}`);
      toast.success('Material deleted');
      fetchModules();
    } catch (err: any) {
      if (!err.isDeleteRequest) {
        toast.error('Failed to delete material');
      }
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const url = api.getFileUrl(fileUrl);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const openAssessmentDialog = async (lesson: any) => {
    setActiveLessonId(lesson.id);
    setAssessmentForm({ title: `${lesson.title} - Assessment`, description: '', passingScore: '50', questions: [] });
    setExistingAssessment(null);
    setAssessmentDialogOpen(true);
    try {
      setLoadingAssessment(true);
      const res = await api.get(`/faculty-portal/lessons/${lesson.id}/assessment`);
      if (res.data?.data) {
        setExistingAssessment(res.data.data);
        setAssessmentForm({
          title: res.data.data.title || `${lesson.title} - Assessment`,
          description: res.data.data.description || '',
          passingScore: String(res.data.data.passingScore ?? 50),
          questions: (res.data.data.questions || []).map((q: any) => ({
            questionText: q.questionText,
            options: Array.isArray(q.options) ? q.options : ['', '', '', ''],
            correctIndex: q.correctIndex ?? 0
          }))
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAssessment(false);
    }
  };

  const handleAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLessonId) return;
    if (assessmentForm.questions.length === 0) {
      return toast.error('Please add or bulk upload at least one question before saving.');
    }
    for (let i = 0; i < assessmentForm.questions.length; i++) {
      const q = assessmentForm.questions[i];
      if (!q.questionText?.trim()) {
        return toast.error(`Question ${i + 1} is missing question text.`);
      }
      const filledOptions = (q.options || []).filter((opt: string) => opt && opt.trim() !== '');
      if (filledOptions.length < 2) {
        return toast.error(`Question ${i + 1} must have at least 2 options.`);
      }
    }
    try {
      setLoadingAssessment(true);
      await api.post(`/faculty-portal/lessons/${activeLessonId}/assessment`, assessmentForm);
      toast.success('Assessment configured successfully');
      setAssessmentDialogOpen(false);
      await fetchModules();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to configure assessment');
    } finally {
      setLoadingAssessment(false);
    }
  };

  const handleDeleteAssessment = async () => {
    if (!activeLessonId) return;
    if (!confirm('Are you sure you want to delete this assessment? All associated questions and student attempts will be permanently removed.')) return;
    try {
      setLoadingAssessment(true);
      await api.delete(`/faculty-portal/lessons/${activeLessonId}/assessment`);
      toast.success('Assessment deleted successfully');
      setAssessmentDialogOpen(false);
      await fetchModules();
    } catch (err: any) {
      if (err?.isDeleteRequest) {
        setAssessmentDialogOpen(false);
      } else {
        toast.error(err.response?.data?.message || 'Failed to delete assessment');
      }
    } finally {
      setLoadingAssessment(false);
    }
  };

  const handleDownloadAssessmentTemplate = () => {
    const csvContent =
      "Question,Option A,Option B,Option C,Option D,Correct Option (A/B/C/D)\n" +
      '"What is the primary function of DNA?","Energy storage","Genetic blueprint","Cell structure","Enzyme catalyst","B"\n' +
      '"Which of the following is an example of an operating system?","Python","Linux","Google Chrome","HTML","B"\n' +
      '"Which protocol is used for secure web browsing?","HTTP","FTP","HTTPS","SMTP","C"\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'assessment_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Assessment template downloaded!');
  };

  const handleBulkUploadAssessment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();

      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

          if (!rows || rows.length === 0) {
            toast.error('The uploaded file contains no data.');
            return;
          }

          const parsedQuestions: any[] = [];
          const errors: string[] = [];

          rows.forEach((row, idx) => {
            const getCol = (names: string[]) => {
              for (const key of Object.keys(row)) {
                const cleanKey = key.trim().toLowerCase();
                if (names.some(n => n.toLowerCase() === cleanKey)) {
                  return String(row[key] ?? '').trim();
                }
              }
              return '';
            };

            const question = getCol(['question', 'question text', 'question_text']);
            const optA = getCol(['option a', 'option_a', 'option1', 'a']);
            const optB = getCol(['option b', 'option_b', 'option2', 'b']);
            const optC = getCol(['option c', 'option_c', 'option3', 'c']);
            const optD = getCol(['option d', 'option_d', 'option4', 'd']);
            const rawCorrect = getCol([
              'correct option (a/b/c/d)',
              'correct option',
              'correct_option',
              'correct option(a/b/c/d)',
              'correct',
              'answer'
            ]);

            // Skip empty rows
            if (!question && !optA && !optB && !optC && !optD) return;

            if (!question) {
              errors.push(`Row ${idx + 2}: Missing Question text`);
              return;
            }

            const options = [optA, optB, optC, optD];
            const filledOptions = options.filter(Boolean);
            if (filledOptions.length < 2) {
              errors.push(`Row ${idx + 2}: At least 2 options are required for "${question.slice(0, 25)}..."`);
              return;
            }

            let correctIndex = -1;
            const cleanCorrect = rawCorrect.toUpperCase();
            if (cleanCorrect.startsWith('A') || cleanCorrect === '1') correctIndex = 0;
            else if (cleanCorrect.startsWith('B') || cleanCorrect === '2') correctIndex = 1;
            else if (cleanCorrect.startsWith('C') || cleanCorrect === '3') correctIndex = 2;
            else if (cleanCorrect.startsWith('D') || cleanCorrect === '4') correctIndex = 3;
            else {
              const match = options.findIndex(opt => opt && opt.toLowerCase() === rawCorrect.toLowerCase());
              if (match !== -1) correctIndex = match;
            }

            if (correctIndex === -1 || !options[correctIndex]) {
              errors.push(`Row ${idx + 2}: Invalid Correct Option "${rawCorrect}" (must be A, B, C, or D matching an option)`);
              return;
            }

            parsedQuestions.push({
              questionText: question,
              options,
              correctIndex
            });
          });

          if (parsedQuestions.length === 0) {
            toast.error(errors.length > 0 ? errors[0] : 'No valid questions found in file.');
            return;
          }

          setAssessmentForm(prev => ({
            ...prev,
            questions: [...prev.questions, ...parsedQuestions]
          }));

          if (errors.length > 0) {
            toast.warning(`Imported ${parsedQuestions.length} questions. ${errors.length} invalid row(s) were skipped.`);
          } else {
            toast.success(`Successfully imported ${parsedQuestions.length} question${parsedQuestions.length > 1 ? 's' : ''}!`);
          }
        } catch (parseErr) {
          console.error(parseErr);
          toast.error('Failed to parse file. Please verify it matches the template.');
        } finally {
          if (assessmentFileInputRef.current) assessmentFileInputRef.current.value = '';
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      toast.error('Error reading the uploaded file.');
    }
  };

  const renderLessonRow = (lesson: any) => (
    <div key={lesson.id} className="bg-background">
      <div className="flex items-center justify-between p-3 px-5 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-100/60 dark:hover:bg-slate-900 transition-colors">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h5 className="font-semibold text-sm leading-tight">{lesson.title}</h5>
              {lesson.videoUrl && (
                <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 gap-1 border-indigo-200 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 font-normal">
                  <Video className="w-3 h-3" /> Video
                </Badge>
              )}
            </div>
            {lesson.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{lesson.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {lesson.assessment ? (
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => openAssessmentDialog(lesson)} 
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs border border-emerald-500/30 gap-1.5 transition-all"
              title="Assessment is configured for this lesson"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-100" />
              <span>Assessment ({lesson.assessment._count?.questions ?? '✓'})</span>
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => openAssessmentDialog(lesson)} 
              className="h-7 text-xs text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:text-indigo-600 hover:border-indigo-300 gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Assessment
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => { 
            setActiveLessonId(lesson.id); 
            setMaterialForm({ title: '', description: '' }); 
            setUploadFile(null); 
            if (fileInputRef.current) fileInputRef.current.value = '';
            setMaterialDialogOpen(true); 
          }} className="h-7 text-xs">
            <Upload className="w-3 h-3 mr-1" /> Material
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { 
            setActiveModuleId(lesson.classModuleId);
            setActiveSubModuleId(lesson.classSubModuleId || null);
            setEditingLessonId(lesson.id); 
            setLessonForm({ title: lesson.title, description: lesson.description || '', order: String(lesson.order), videoUrl: lesson.videoUrl || '' }); 
            setLessonDialogOpen(true); 
          }} className="h-7 w-7">
            <Edit className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDeleteLesson(lesson.id)} className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <div className="px-9 py-2">
        {lesson.materials && lesson.materials.length > 0 ? (
          <div className="space-y-1 my-1.5">
            {lesson.materials.map((mat: any) => (
              <div key={mat.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="font-medium text-sm leading-tight">{mat.title}</p>
                    <p className="text-[10px] text-muted-foreground">{mat.fileName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(mat.fileUrl, mat.fileName)} className="h-7 w-7 text-indigo-600">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteMaterial(mat.id)} className="h-7 w-7 text-red-500 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-1.5 italic">No materials uploaded for this lesson.</p>
        )}
      </div>
    </div>
  );

  const currentModuleForDialog = modules.find(m => m.id === activeModuleId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Folder className="w-5 h-5 text-indigo-500" />
            Class Content: {academicClass?.name}
          </h2>
          <p className="text-muted-foreground text-sm">Manage curriculum modules, sub-modules, lessons, and upload materials</p>
        </div>
        <Button onClick={() => { setEditingModuleId(null); setModuleForm({ title: '', description: '', order: '' }); setModuleDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Module
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading modules...</div>
        ) : modules.length === 0 ? (
          <div className="p-12 text-center border rounded-lg bg-background shadow-sm">
            <Folder className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium text-lg">No modules found</p>
            <p className="text-muted-foreground/80 text-sm mt-1">Create your first module to start organizing your syllabus.</p>
          </div>
        ) : (
          modules.map((mod) => {
            const directLessons = (mod.lessons || []).filter((l: any) => !l.classSubModuleId);
            const subModules = mod.subModules || [];
            const subModuleLessonsCount = subModules.reduce((acc: number, s: any) => acc + (s.lessons?.length || 0), 0);
            const totalLessons = directLessons.length + subModuleLessonsCount;

            return (
              <Card key={mod.id} className="overflow-hidden border-border/60 shadow-sm">
                <div className="bg-muted/30 p-4 border-b flex justify-between items-start hover:bg-muted/50 cursor-pointer" onClick={() => toggleModule(mod.id)}>
                  <div className="flex items-center gap-2">
                    {expandedModules[mod.id] ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                    <div>
                      <h3 className="font-bold text-lg">{mod.title}</h3>
                      {mod.description && <p className="text-sm text-muted-foreground mt-0.5">{mod.description}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {subModules.length > 0 && (
                          <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 gap-1 font-normal text-violet-600 bg-violet-50/50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800">
                            <Layers className="w-3 h-3" /> {subModules.length} Sub-Module{subModules.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 gap-1 font-normal">
                          <BookOpen className="w-3 h-3" /> {totalLessons} Lesson{totalLessons !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => openAddLesson(mod.id, null)}>
                      <Plus className="w-4 h-4 mr-1" /> Add Direct Lesson
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openAddSubModule(mod.id)}>
                      <Plus className="w-4 h-4 mr-1" /> Add Sub-Module
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditingModuleId(mod.id); setModuleForm({ title: mod.title, description: mod.description || '', order: String(mod.order) }); setModuleDialogOpen(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteModule(mod.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {expandedModules[mod.id] && (
                  <CardContent className="p-4 space-y-5 bg-muted/10">
                    {/* If module is completely empty (no submodules and no direct lessons) */}
                    {subModules.length === 0 && directLessons.length === 0 ? (
                      <div className="p-8 text-center border border-dashed rounded-lg bg-background/50">
                        <Folder className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm font-medium text-foreground">No lessons or sub-modules yet</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">
                          You can upload direct module lessons or create sub-modules to organize your topics.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          <Button variant="default" size="sm" onClick={() => openAddLesson(mod.id, null)}>
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Direct Lesson
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openAddSubModule(mod.id)}>
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Sub-Module
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Direct Module Lessons Section (Rendered on top) */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-indigo-500" />
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Direct Module Lessons
                              </h4>
                              <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-normal">
                                {directLessons.length} Lessons
                              </Badge>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={() => openAddLesson(mod.id, null)}
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add Direct Lesson
                            </Button>
                          </div>

                          {directLessons.length > 0 ? (
                            <div className="divide-y divide-border/50 border rounded-lg overflow-hidden bg-background shadow-xs">
                              {directLessons.map((lesson: any) => renderLessonRow(lesson))}
                            </div>
                          ) : (
                            <div className="p-4 text-center border border-dashed rounded-lg bg-background/40 text-xs text-muted-foreground">
                              No direct lessons in this module. Click "+ Add Direct Lesson" above to add one directly under the module.
                            </div>
                          )}
                        </div>

                        {/* Sub-Modules list (Rendered below direct lessons) */}
                        {subModules.length > 0 && (
                          <div className={cn("space-y-3", "mt-4 pt-4 border-t border-border/60")}>
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-violet-500" />
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  Sub-Modules ({subModules.length})
                                </h4>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/50"
                                onClick={() => openAddSubModule(mod.id)}
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Sub-Module
                              </Button>
                            </div>

                            <div className="space-y-3">
                              {subModules.map((sub: any) => (
                                <div key={sub.id} className="border border-border/80 rounded-lg overflow-hidden bg-background shadow-xs">
                                  {/* Sub-Module Header */}
                                  <div 
                                    className="p-3 px-4 bg-slate-50/70 dark:bg-slate-900/70 border-b flex items-center justify-between cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-900 transition-colors"
                                    onClick={() => toggleSubModule(sub.id)}
                                  >
                                    <div className="flex items-center gap-3">
                                      {expandedSubModules[sub.id] ? (
                                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                      )}
                                      <div className="w-7 h-7 rounded-md bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                        <Layers className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-semibold text-sm text-foreground">{sub.title}</h4>
                                          <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-normal">
                                            {sub.lessons?.length || 0} Lessons
                                          </Badge>
                                        </div>
                                        {sub.description && (
                                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sub.description}</p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 text-xs"
                                        onClick={() => openAddLesson(mod.id, sub.id)}
                                      >
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Lesson
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7"
                                        onClick={() => {
                                          setActiveModuleForSubModuleId(mod.id);
                                          setEditingSubModuleId(sub.id);
                                          setSubModuleForm({ title: sub.title, description: sub.description || '', order: String(sub.order) });
                                          setSubModuleDialogOpen(true);
                                        }}
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDeleteSubModule(sub.id)}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Lessons within this Sub-Module */}
                                  {expandedSubModules[sub.id] && (
                                    <div className="p-0">
                                      {sub.lessons && sub.lessons.length > 0 ? (
                                        <div className="divide-y divide-border/50">
                                          {sub.lessons.map((lesson: any) => renderLessonRow(lesson))}
                                        </div>
                                      ) : (
                                        <div className="p-5 text-center text-xs text-muted-foreground bg-background">
                                          No lessons added to this sub-module yet. Click "+ Add Lesson" to start.
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Module Modal */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingModuleId ? 'Edit Module' : 'Create Module'}</DialogTitle></DialogHeader>
          <form onSubmit={handleModuleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Module Title</Label>
              <Input value={moduleForm.title} onChange={e => setModuleForm({ ...moduleForm, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={moduleForm.description} onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input type="number" value={moduleForm.order} onChange={e => setModuleForm({ ...moduleForm, order: e.target.value })} />
            </div>
            <Button type="submit" className="w-full">{editingModuleId ? 'Save Changes' : 'Create Module'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-Module Modal */}
      <Dialog open={subModuleDialogOpen} onOpenChange={setSubModuleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSubModuleId ? 'Edit Sub-Module' : 'Create Sub-Module'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubModuleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Sub-Module Title</Label>
              <Input 
                placeholder="e.g. 1.1 Variables and Data Types"
                value={subModuleForm.title} 
                onChange={e => setSubModuleForm({ ...subModuleForm, title: e.target.value })} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea 
                placeholder="Brief summary of topics covered in this sub-module"
                value={subModuleForm.description} 
                onChange={e => setSubModuleForm({ ...subModuleForm, description: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input 
                type="number" 
                value={subModuleForm.order} 
                onChange={e => setSubModuleForm({ ...subModuleForm, order: e.target.value })} 
              />
            </div>
            <Button type="submit" className="w-full">{editingSubModuleId ? 'Save Changes' : 'Create Sub-Module'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lesson Modal */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingLessonId ? 'Edit Lesson' : 'Create Lesson'}</DialogTitle></DialogHeader>
          <form onSubmit={handleLessonSubmit} className="space-y-4 pt-4">
            {currentModuleForDialog?.subModules && currentModuleForDialog.subModules.length > 0 && (
              <div className="space-y-2">
                <Label>Lesson Placement</Label>
                <Select value={activeSubModuleId || 'none'} onValueChange={val => setActiveSubModuleId(val === 'none' ? null : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Placement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Direct Lesson (Directly Under Module) --</SelectItem>
                    {currentModuleForDialog.subModules.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>Sub-Module: {s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Select whether this lesson belongs directly to the module or inside a specific sub-module.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Lesson Title</Label>
              <Input value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={lessonForm.description} onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Video URL {academicClass?.academicCenter?.type !== 'online' && '(Optional)'}</Label>
              <Input 
                placeholder="e.g. YouTube or Vimeo link" 
                value={lessonForm.videoUrl} 
                onChange={e => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} 
                required={academicClass?.academicCenter?.type === 'online'}
              />
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input type="number" value={lessonForm.order} onChange={e => setLessonForm({ ...lessonForm, order: e.target.value })} />
            </div>
            <Button type="submit" className="w-full">{editingLessonId ? 'Save Changes' : 'Create Lesson'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              Upload Lesson Material
            </DialogTitle>
          </DialogHeader>

          {/* Persistent File Size & Format Notice */}
          <div className="rounded-lg border border-amber-200/90 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-300">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-950 dark:text-amber-200">
                  Maximum File Size Limit: 5 MB
                </p>
                <p className="text-amber-800/90 dark:text-amber-400/90 leading-relaxed text-[11px]">
                  Files larger than 5 MB will be rejected by the server. Please compress PDF documents before uploading. Images (JPG/PNG) will be compressed automatically.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleMaterialSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                value={materialForm.title} 
                onChange={e => setMaterialForm({ ...materialForm, title: e.target.value })} 
                placeholder="e.g. Chapter 1 Notes, Reference Slides" 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea 
                value={materialForm.description} 
                onChange={e => setMaterialForm({ ...materialForm, description: e.target.value })} 
                placeholder="Brief summary of this study material..." 
                rows={2} 
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>File Attachment</Label>
                <span className="text-[11px] font-medium text-slate-500">Max: 5 MB</span>
              </div>
              <Input 
                type="file" 
                ref={fileInputRef} 
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
                onChange={e => setUploadFile(e.target.files?.[0] || null)} 
                required 
              />
              <p className="text-[11px] text-muted-foreground">
                Supported: PDF, Word (DOC/DOCX), Excel, CSV, Images (JPG, PNG, WebP)
              </p>
            </div>

            {/* Selected File Status and Warnings */}
            {uploadFile && (
              <div className="space-y-2">
                {isMaterialOverSize && !isMaterialImage && (
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-400">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">
                          File size exceeds 5 MB limit ({materialSizeFormatted})
                        </p>
                        <p className="text-red-600/90 dark:text-red-400/90 text-[11px] leading-relaxed">
                          This document exceeds the server&apos;s 5 MB upload limit and cannot be uploaded. Please compress your PDF/document or select a file under 5 MB.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isMaterialOverSize && isMaterialImage && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30 p-2.5 text-xs text-blue-800 dark:text-blue-300">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-[11px]">
                        Image is {materialSizeFormatted}. It will be automatically compressed to under 5 MB during upload.
                      </span>
                    </div>
                  </div>
                )}

                {!isMaterialOverSize && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium truncate max-w-[260px]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{uploadFile.name}</span>
                      <span className="text-[11px] text-emerald-700 font-normal">({materialSizeFormatted})</span>
                    </span>
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-100/50 border-emerald-300 text-[10px] h-5 shrink-0">
                      Within Limit
                    </Badge>
                  </div>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              className={cn("w-full transition-all", isMaterialOverSize && !isMaterialImage && "opacity-60 cursor-not-allowed")} 
              disabled={uploading || compressing || (isMaterialOverSize && !isMaterialImage)}
            >
              {uploading || compressing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {compressing ? 'Optimizing Image...' : 'Uploading File...'}
                </>
              ) : isMaterialOverSize && !isMaterialImage ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  File Exceeds 5 MB Limit
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assessment Modal */}
      <Dialog open={assessmentDialogOpen} onOpenChange={setAssessmentDialogOpen}>
        <DialogContent className="max-w-5xl sm:max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                <DialogTitle>Configure Lesson Assessment</DialogTitle>
                {existingAssessment && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Configured
                  </Badge>
                )}
              </div>
              {existingAssessment && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDeleteAssessment}
                  className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  disabled={loadingAssessment}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Assessment
                </Button>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={handleAssessmentSubmit} className="space-y-6 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assessment Title</Label>
                <Input 
                  value={assessmentForm.title} 
                  onChange={e => setAssessmentForm({ ...assessmentForm, title: e.target.value })} 
                  placeholder="e.g. Lesson Quiz"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={assessmentForm.passingScore} 
                  onChange={e => setAssessmentForm({ ...assessmentForm, passingScore: e.target.value })} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea 
                value={assessmentForm.description} 
                onChange={e => setAssessmentForm({ ...assessmentForm, description: e.target.value })} 
                placeholder="Instructions or remarks for students taking this assessment"
                rows={2}
              />
            </div>

            {/* Bulk Upload Section */}
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-r from-indigo-50/70 to-blue-50/50 dark:from-indigo-950/30 dark:to-slate-900/40 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      Bulk Upload Questions
                      <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-normal">CSV / Excel</Badge>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Import multiple questions at once using the template format.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadAssessmentTemplate}
                    className="h-8 text-xs bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" /> Download Template
                  </Button>

                  <input 
                    ref={assessmentFileInputRef} 
                    type="file" 
                    accept=".csv, .xlsx, .xls" 
                    onChange={handleBulkUploadAssessment} 
                    className="hidden" 
                  />
                  <Button 
                    type="button" 
                    variant="default" 
                    size="sm" 
                    onClick={() => assessmentFileInputRef.current?.click()}
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" /> Bulk Upload
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-[11px] text-indigo-800/80 dark:text-indigo-300/80 pt-2 border-t border-indigo-200/50 dark:border-indigo-900/50">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span>
                  Template Columns: <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded text-[10px] font-mono">Question</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded text-[10px] font-mono">Option A</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded text-[10px] font-mono">Option B</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded text-[10px] font-mono">Option C</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded text-[10px] font-mono">Option D</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded text-[10px] font-mono">Correct Option (A/B/C/D)</code>
                </span>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">Questions ({assessmentForm.questions.length})</h3>
                  {assessmentForm.questions.length > 0 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[11px] text-muted-foreground hover:text-red-500"
                      onClick={() => {
                        if (confirm('Clear all questions currently in the list?')) {
                          setAssessmentForm({ ...assessmentForm, questions: [] });
                        }
                      }}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setAssessmentForm({
                      ...assessmentForm,
                      questions: [...assessmentForm.questions, { questionText: '', options: ['', '', '', ''], correctIndex: 0 }]
                    });
                  }}
                  className="h-8 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Question Manually
                </Button>
              </div>

              {assessmentForm.questions.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/30 text-muted-foreground space-y-2">
                  <FileSpreadsheet className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm font-medium text-foreground">No questions added yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Click <strong>Bulk Upload</strong> above to upload questions from CSV/Excel, or click <strong>Add Question Manually</strong> to enter questions one by one.
                  </p>
                </div>
              ) : (
                assessmentForm.questions.map((q, qIndex) => (
                  <Card key={qIndex} className="relative border-border/80 shadow-xs">
                    <CardContent className="p-4 space-y-3">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 text-red-500 hover:bg-red-50 h-7 w-7" 
                        onClick={() => {
                          const newQs = [...assessmentForm.questions];
                          newQs.splice(qIndex, 1);
                          setAssessmentForm({ ...assessmentForm, questions: newQs });
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Question {qIndex + 1}</Label>
                        <Textarea 
                          value={q.questionText} 
                          onChange={e => {
                            const newQs = [...assessmentForm.questions];
                            newQs[qIndex].questionText = e.target.value;
                            setAssessmentForm({ ...assessmentForm, questions: newQs });
                          }} 
                          required 
                          placeholder="Enter question text..."
                          className="mr-8 min-h-[60px]" 
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">Select the radio button for the correct option:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {q.options.map((opt: string, oIndex: number) => {
                            const letter = ['A', 'B', 'C', 'D'][oIndex] || `${oIndex + 1}`;
                            const isCorrect = q.correctIndex === oIndex;
                            return (
                              <div 
                                key={oIndex} 
                                className={`flex items-center gap-2 p-1.5 rounded-lg border transition-colors ${
                                  isCorrect 
                                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' 
                                    : 'border-border/60 bg-background'
                                }`}
                              >
                                <input 
                                  type="radio" 
                                  name={`correct-${qIndex}`} 
                                  checked={isCorrect} 
                                  onChange={() => {
                                    const newQs = [...assessmentForm.questions];
                                    newQs[qIndex].correctIndex = oIndex;
                                    setAssessmentForm({ ...assessmentForm, questions: newQs });
                                  }} 
                                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer ml-1" 
                                  required 
                                />
                                <span className={`text-xs font-bold w-4 text-center ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                  {letter}
                                </span>
                                <Input 
                                  value={opt} 
                                  onChange={e => {
                                    const newQs = [...assessmentForm.questions];
                                    newQs[qIndex].options[oIndex] = e.target.value;
                                    setAssessmentForm({ ...assessmentForm, questions: newQs });
                                  }} 
                                  placeholder={`Option ${letter}`} 
                                  className="h-8 text-xs flex-1"
                                  required 
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loadingAssessment}>
              {loadingAssessment ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckSquare className="w-4 h-4 mr-2" />}
              {loadingAssessment ? 'Saving...' : `Save Assessment (${assessmentForm.questions.length} Question${assessmentForm.questions.length !== 1 ? 's' : ''})`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
