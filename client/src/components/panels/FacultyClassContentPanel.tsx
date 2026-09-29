import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Folder, FileText, Upload, Loader2, Download, BookOpen, ChevronDown, ChevronUp, User, UserPlus, Clock, Play, Users, CheckSquare } from 'lucide-react';
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

export function FacultyClassContentPanel({ academicClass, onBack }: { academicClass: any; onBack: () => void }) {
  const [modules, setModules] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Module Modal
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: '', description: '', order: '' });

  // Lesson Modal
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
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
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [materialForm, setMaterialForm] = useState({ title: '', description: '' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assessment Modal
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
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
    if (!confirm('Delete this module and ALL its lessons and materials?')) return;
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

  // --- LESSON ACTIONS ---
  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        ...lessonForm, 
        order: lessonForm.order ? parseInt(lessonForm.order) : 0
      };
      
      if (editingLessonId) {
        await api.put(`/faculty-portal/lessons/${editingLessonId}`, payload);
        toast.success('Lesson updated');
      } else {
        await api.post(`/faculty-portal/modules/${activeModuleId}/lessons`, payload);
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

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('title', materialForm.title);
      fd.append('description', materialForm.description);

      await api.post(`/faculty-portal/lessons/${activeLessonId}/materials`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Material uploaded');
      setMaterialDialogOpen(false);
      fetchModules();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
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
    setAssessmentForm({ title: 'Lesson Assessment', description: '', passingScore: '50', questions: [] });
    setAssessmentDialogOpen(true);
    try {
      setLoadingAssessment(true);
      const res = await api.get(`/faculty-portal/lessons/${lesson.id}/assessment`);
      if (res.data?.data) {
        setAssessmentForm({
          title: res.data.data.title,
          description: res.data.data.description || '',
          passingScore: String(res.data.data.passingScore),
          questions: res.data.data.questions.map((q: any) => ({
            questionText: q.questionText,
            options: q.options,
            correctIndex: q.correctIndex
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
    try {
      setLoadingAssessment(true);
      await api.post(`/faculty-portal/lessons/${activeLessonId}/assessment`, assessmentForm);
      toast.success('Assessment configured successfully');
      setAssessmentDialogOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to configure assessment');
    } finally {
      setLoadingAssessment(false);
    }
  };

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
          <p className="text-muted-foreground text-sm">Manage curriculum modules, lessons, and upload materials</p>
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
          modules.map((mod) => (
            <Card key={mod.id} className="overflow-hidden border-border/60 shadow-sm">
              <div className="bg-muted/30 p-4 border-b flex justify-between items-start hover:bg-muted/50 cursor-pointer" onClick={() => toggleModule(mod.id)}>
                <div className="flex items-center gap-2">
                  {expandedModules[mod.id] ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  <div>
                    <h3 className="font-bold text-lg">{mod.title}</h3>
                    {mod.description && <p className="text-sm text-muted-foreground mt-0.5">{mod.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <Button variant="outline" size="sm" onClick={() => { setActiveModuleId(mod.id); setEditingLessonId(null); setLessonForm({ title: '', description: '', order: '', videoUrl: '' }); setLessonDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-1" /> Add Lesson
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
                <CardContent className="p-0">
                  {mod.lessons && mod.lessons.length > 0 ? (
                    <div className="divide-y divide-border/50">
                      {mod.lessons.map((lesson: any) => (
                        <div key={lesson.id} className="bg-background">
                          <div className="flex items-center justify-between p-3 px-6 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-indigo-400" />
                              <h4 className="font-semibold text-sm">{lesson.title}</h4>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openAssessmentDialog(lesson)} className="h-7 text-xs">
                                <CheckSquare className="w-3 h-3 mr-1" /> Assessment
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setActiveLessonId(lesson.id); setMaterialForm({ title: '', description: '' }); setUploadFile(null); setMaterialDialogOpen(true); }} className="h-7 text-xs">
                                <Upload className="w-3 h-3 mr-1" /> Material
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => { setEditingLessonId(lesson.id); setLessonForm({ title: lesson.title, description: lesson.description || '', order: String(lesson.order), videoUrl: lesson.videoUrl || '' }); setLessonDialogOpen(true); }} className="h-7 w-7">
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteLesson(lesson.id)} className="h-7 w-7 text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="px-10 py-2">
                            {lesson.materials && lesson.materials.length > 0 ? (
                              <div className="space-y-1 my-2">
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
                              <p className="text-xs text-muted-foreground py-2 italic">No materials uploaded for this lesson.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground bg-background">
                      No lessons added to this module yet. Click "Add Lesson" to start.
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Module and Material Dialogs */}
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

      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingLessonId ? 'Edit Lesson' : 'Create Lesson'}</DialogTitle></DialogHeader>
          <form onSubmit={handleLessonSubmit} className="space-y-4 pt-4">
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
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Material</DialogTitle></DialogHeader>
          <form onSubmit={handleMaterialSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={materialForm.title} onChange={e => setMaterialForm({ ...materialForm, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea value={materialForm.description} onChange={e => setMaterialForm({ ...materialForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <Input type="file" ref={fileInputRef} onChange={e => setUploadFile(e.target.files?.[0] || null)} required />
            </div>
            <Button type="submit" className="w-full" disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assessment Modal */}
      <Dialog open={assessmentDialogOpen} onOpenChange={setAssessmentDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Configure Lesson Assessment</DialogTitle></DialogHeader>
          <form onSubmit={handleAssessmentSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assessment Title</Label>
                <Input value={assessmentForm.title} onChange={e => setAssessmentForm({ ...assessmentForm, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <Input type="number" min="0" max="100" value={assessmentForm.passingScore} onChange={e => setAssessmentForm({ ...assessmentForm, passingScore: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={assessmentForm.description} onChange={e => setAssessmentForm({ ...assessmentForm, description: e.target.value })} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Questions ({assessmentForm.questions.length})</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  setAssessmentForm({
                    ...assessmentForm,
                    questions: [...assessmentForm.questions, { questionText: '', options: ['', '', '', ''], correctIndex: 0 }]
                  });
                }}>
                  <Plus className="w-4 h-4 mr-2" /> Add Question
                </Button>
              </div>

              {assessmentForm.questions.map((q, qIndex) => (
                <Card key={qIndex} className="relative">
                  <CardContent className="p-4 space-y-4">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-red-500" onClick={() => {
                      const newQs = [...assessmentForm.questions];
                      newQs.splice(qIndex, 1);
                      setAssessmentForm({ ...assessmentForm, questions: newQs });
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="space-y-2">
                      <Label>Question {qIndex + 1}</Label>
                      <Textarea value={q.questionText} onChange={e => {
                        const newQs = [...assessmentForm.questions];
                        newQs[qIndex].questionText = e.target.value;
                        setAssessmentForm({ ...assessmentForm, questions: newQs });
                      }} required className="mr-8" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {q.options.map((opt: string, oIndex: number) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input type="radio" name={`correct-${qIndex}`} checked={q.correctIndex === oIndex} onChange={() => {
                            const newQs = [...assessmentForm.questions];
                            newQs[qIndex].correctIndex = oIndex;
                            setAssessmentForm({ ...assessmentForm, questions: newQs });
                          }} className="w-4 h-4 text-primary" required />
                          <Input value={opt} onChange={e => {
                            const newQs = [...assessmentForm.questions];
                            newQs[qIndex].options[oIndex] = e.target.value;
                            setAssessmentForm({ ...assessmentForm, questions: newQs });
                          }} placeholder={`Option ${oIndex + 1}`} required />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={loadingAssessment}>
              {loadingAssessment ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckSquare className="w-4 h-4 mr-2" />}
              {loadingAssessment ? 'Saving...' : 'Save Assessment'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
