import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Upload, FileText, BookOpen, File, Trash2, Download,
  Clock, GraduationCap, Layers, Tag, Search,
  Loader2, Eye, Edit,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';



import { CS } from '@/lib/currency';
interface Program {
  id: string; name: string; code: string; courseType: string;
  duration: number; hasSemesters: boolean; semesters: { number: number; name: string; durationMonths: number }[];
  status: string; universityId: any; subDepartmentId?: any;
  syllabus?: string; feeStructures?: any[];
}

interface Material {
  id: string; title: string; description: string;
  category: string; fileUrl: string; fileName: string;
  fileSize: number; mimeType: string; semesterNumber?: number;
  uploadedBy: { id: string; name: string; email: string };
  createdAt: string;
}

const CATEGORIES = [
  { value: 'syllabus', label: 'Syllabus', icon: '📋', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'study_material', label: 'Study Material', icon: '📚', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { value: 'question_paper', label: 'Question Paper', icon: '📝', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { value: 'reference', label: 'Reference', icon: '🔗', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { value: 'other', label: 'Other', icon: '📁', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
];

const COURSE_COLORS: Record<string, { color: string; bg: string }> = {
  'SkillCourse': { color: '#7c3aed', bg: '#f5f3ff' },
  'OnlineDegree': { color: '#2563eb', bg: '#eff6ff' },
  'BVocDegree': { color: '#0891b2', bg: '#ecfeff' },
  'CreditTransfer': { color: '#16a34a', bg: '#f0fdf4' },
  'Yearly': { color: '#d97706', bg: '#fffbeb' },
  'OneSitting': { color: '#e11d48', bg: '#fff1f2' },
};

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(months: number) {
  if (months < 12) return `${months} months`;
  if (months % 12 === 0) return `${months / 12} year${months / 12 > 1 ? 's' : ''}`;
  return `${Math.floor(months / 12)}y ${months % 12}m`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
  if (mimeType.includes('image')) return <Eye className="w-5 h-5 text-blue-500" />;
  if (mimeType.includes('word') || mimeType.includes('doc')) return <FileText className="w-5 h-5 text-blue-700" />;
  if (mimeType.includes('sheet') || mimeType.includes('xls')) return <FileText className="w-5 h-5 text-green-600" />;
  return <File className="w-5 h-5 text-gray-500" />;
}

/**
 * Program Detail Panel — shows a single program's information and its materials.
 * - Ops/admin users can upload, edit, and delete materials.
 * - Center admins can view and download materials.
 */
export function ProgramDetailPanel({
  programId,
  onBack,
}: {
  programId: string;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const canManage = ['ops_admin', 'ops_sub_admin', 'org_admin', 'superadmin', 'employee'].includes(user?.role || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [program, setProgram] = useState<Program | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, Material[]>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '', description: '', category: 'study_material', semesterNumber: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/operations/programs/${programId}/detail`);
      const data = res.data.data;
      setProgram(data.program);
      setMaterials(data.materials || []);
      setByCategory(data.byCategory || {});
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load program detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [programId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile && !editingId) { toast.error('Please select a file'); return; }
    if (!uploadForm.title.trim()) { toast.error('Title is required'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', uploadForm.title);
      fd.append('description', uploadForm.description);
      fd.append('category', uploadForm.category);
      if (uploadForm.semesterNumber) fd.append('semesterNumber', uploadForm.semesterNumber);
      if (uploadFile) fd.append('file', uploadFile);

      if (editingId) {
        await api.put(`/operations/programs/${programId}/materials/${editingId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Material updated');
      } else {
        await api.post(`/operations/programs/${programId}/materials`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Material uploaded');
      }

      setUploadDialogOpen(false);
      resetUploadForm();
      fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (materialId: string) => {
    if (!confirm('Delete this material?')) return;
    try {
      await api.delete(`/operations/programs/${programId}/materials/${materialId}`);
      toast.success('Material deleted');
      fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleEdit = (m: Material) => {
    setEditingId(m.id);
    setUploadForm({
      title: m.title,
      description: m.description,
      category: m.category,
      semesterNumber: m.semesterNumber ? String(m.semesterNumber) : '',
    });
    setUploadFile(null);
    setUploadDialogOpen(true);
  };

  const resetUploadForm = () => {
    setEditingId(null);
    setUploadForm({ title: '', description: '', category: 'study_material', semesterNumber: '' });
    setUploadFile(null);
  };

  const handleDownload = (m: Material) => {
    const url = api.getFileUrl(m.fileUrl);
    const a = document.createElement('a');
    a.href = url;
    a.download = m.fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Filter materials
  const filtered = materials.filter(m => {
    const matchSearch = !searchTerm ||
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = activeTab === 'all' || m.category === activeTab;
    return matchSearch && matchCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#256c1d]" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Program not found</p>
        <Button variant="ghost" className="mt-4" onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  const ctMeta = COURSE_COLORS[program.courseType] || COURSE_COLORS['OnlineDegree'];
  const uniName = typeof program.universityId === 'object' ? program.universityId?.name : '';
  const programFee = (program.feeStructures || []).find((f: any) => f.feeLevel === 'program');
  const subDeptName = program.subDepartmentId ? (typeof program.subDepartmentId === 'object' ? (program.subDepartmentId as any)?.name : program.subDepartmentId) : '';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground min-w-0">
          <Button variant="outline" size="icon" onClick={onBack} className="h-10 w-10 shrink-0 rounded-full bg-white border-slate-200 shadow-sm hover:bg-[#eaf6e6]" aria-label="Back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span>Programs</span><span>/</span><span className="font-semibold text-foreground truncate text-base">{program.name}</span>
        </div>
        {canManage && (
          <Button onClick={() => { resetUploadForm(); setUploadDialogOpen(true); }} className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm shrink-0">
            <Upload className="w-4 h-4" /> Upload Material
          </Button>
        )}
      </div>

      {/* Program header */}
      <Card className="rounded-3xl gap-0 py-0">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{program.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-[11px] font-mono text-slate-600 bg-[#f1f3ef] px-2.5 py-1 rounded-full">{program.code}</span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: ctMeta.bg, color: ctMeta.color }}>{program.courseType}</span>
              </div>
            </div>
            <span className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full capitalize shrink-0 self-start sm:self-center ${program.status === 'active' ? 'bg-[#e3f7dd] text-[#1f6a17]' : 'bg-slate-100 text-slate-600'}`}>
              <span className={`w-2 h-2 rounded-full ${program.status === 'active' ? 'bg-[#54b947]' : 'bg-slate-400'}`} />{program.status}
            </span>
          </div>

          <div className="my-6 h-px bg-slate-100 dark:bg-white/10" />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              uniName ? { icon: GraduationCap, label: 'University', value: uniName } : null,
              { icon: Clock, label: 'Duration', value: formatDuration(program.duration) },
              { icon: Layers, label: 'Semesters', value: program.hasSemesters && program.semesters?.length > 0 ? String(program.semesters.length) : 'None' },
              subDeptName ? { icon: Tag, label: 'Sub-department', value: subDeptName } : null,
            ].filter(Boolean).map((it: any) => (
              <div key={it.label} className="flex items-center gap-3 rounded-2xl bg-[#f4f6f3] dark:bg-muted/30 px-4 py-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0"><it.icon className="w-4 h-4 text-[#256c1d]" /></div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground font-medium">{it.label}</p>
                  <p className="text-sm font-semibold truncate" title={String(it.value)}>{it.value}</p>
                </div>
              </div>
            ))}
          </div>

          {program.hasSemesters && program.semesters?.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-muted-foreground mb-2.5">Semester breakdown</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {program.semesters.map(s => (
                  <div key={s.number} className="rounded-2xl bg-[#eaf6e6] px-4 py-2.5 text-center shrink-0 min-w-[110px]">
                    <p className="text-xs font-semibold text-[#1f6a17]">{s.name}</p>
                    <p className="text-[11px] text-[#256c1d]/80">{s.durationMonths} months</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Syllabus and fees */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-start">
        <Card className="lg:col-span-2 rounded-3xl gap-0 py-0">
          <CardContent className="p-6 sm:p-7">
            <h3 className="text-xl font-semibold mb-3">Syllabus</h3>
            {program.syllabus ? (
              <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{program.syllabus}</div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No syllabus provided.</p>
            )}
          </CardContent>
        </Card>

        <div className="rounded-3xl bg-[#0b1d14] text-white p-6 sm:p-7 relative overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(70% 60% at 50% 0%, rgba(84,185,71,.35), transparent 70%)' }} />
          <div className="relative space-y-4">
            <p className="text-xs font-medium text-emerald-100/70">Program fees</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[11px] text-emerald-100/70">Registration</p>
                <p className="text-lg font-semibold mt-0.5">{CS()}{(programFee?.registrationFee || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[11px] text-emerald-100/70">Tuition</p>
                <p className="text-lg font-semibold mt-0.5">{CS()}{(programFee?.tuitionFee || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-end justify-between pt-3 border-t border-white/15">
              <span className="text-xs font-medium text-emerald-100/70">Combined</span>
              <span className="text-2xl font-semibold text-[#8ae47e] tracking-tight">{CS()}{((programFee?.registrationFee || 0) + (programFee?.tuitionFee || 0)).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Materials */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Study materials</h3>
          <span className="text-xs text-muted-foreground">{materials.length} {materials.length === 1 ? 'file' : 'files'}</span>
        </div>

        <div className="rounded-3xl bg-[#f4f6f3] dark:bg-muted/30 p-4 sm:p-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search materials..."
              className="pl-11 h-11 rounded-full bg-white border-transparent text-sm focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setActiveTab('all')} className={cn('px-4 py-2 rounded-full text-xs font-semibold transition-colors', activeTab === 'all' ? 'bg-[#0b1d14] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
              All ({materials.length})
            </button>
            {CATEGORIES.map(cat => {
              const count = byCategory[cat.value]?.length || 0;
              return (
                <button key={cat.value} onClick={() => setActiveTab(activeTab === cat.value ? 'all' : cat.value)}
                  className={cn('px-4 py-2 rounded-full text-xs font-semibold transition-colors', activeTab === cat.value ? 'bg-[#0b1d14] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white dark:bg-card py-14 text-center text-muted-foreground">
            <span className="w-14 h-14 rounded-full bg-[#f4f6f3] flex items-center justify-center mx-auto mb-3"><BookOpen className="w-6 h-6" /></span>
            <p className="font-semibold text-lg text-foreground mb-1">No materials found</p>
            <p className="text-sm max-w-md mx-auto">
              {materials.length === 0
                ? canManage
                  ? 'Upload syllabus, study materials, and question papers for this program.'
                  : 'No study materials have been uploaded for this program yet.'
                : 'No materials match your search or filter.'}
            </p>
            {canManage && materials.length === 0 && (
              <Button className="mt-5 h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => { resetUploadForm(); setUploadDialogOpen(true); }}>
                <Upload className="w-4 h-4 mr-2" /> Upload First Material
              </Button>
            )}
          </div>
        ) : (
          <Card className="rounded-3xl gap-0 py-0 overflow-hidden">
            <CardContent className="p-2 sm:p-3 divide-y divide-slate-100 dark:divide-white/10">
              {filtered.map(m => {
                const catMeta = CATEGORIES.find(c => c.value === m.category) || CATEGORIES[4];
                return (
                  <div key={m.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4 rounded-2xl hover:bg-[#f4f6f3] transition-colors">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                        {getFileIcon(m.mimeType)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{m.title}</span>
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#e3f7dd] text-[#1f6a17]">{catMeta.label}</span>
                          {m.semesterNumber && (
                            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#f1f3ef] text-slate-600">Sem {m.semesterNumber}</span>
                          )}
                        </div>
                        {m.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.description}</p>}
                        <p className="text-[11px] text-muted-foreground mt-1 truncate">
                          {m.fileName} · {formatBytes(m.fileSize)} · by {m.uploadedBy?.name || 'Unknown'} · {new Date(m.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="outline" size="icon" onClick={() => handleDownload(m)} title="Download" className="h-10 w-10 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6] hover:text-[#256c1d]">
                        <Download className="w-4 h-4" />
                      </Button>
                      {canManage && (
                        <>
                          <Button variant="outline" size="icon" onClick={() => handleEdit(m)} title="Edit" className="h-10 w-10 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6] hover:text-[#256c1d]">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDelete(m.id)} title="Delete" className="h-10 w-10 rounded-full bg-white border-slate-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload / Edit Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => { setUploadDialogOpen(open); if (!open) resetUploadForm(); }}>
        <DialogContent className="w-[96vw] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
              {editingId ? <Edit className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            </div>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-left">{editingId ? 'Edit Material' : 'Upload Program Material'}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground text-left">PDF, images, Word and Excel files are supported.</DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={handleUpload} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Title <span className="text-rose-500">*</span></Label>
                <Input
                  className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"
                  placeholder="e.g. Semester 1 Syllabus: Computer Science"
                  value={uploadForm.title}
                  onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input
                  className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"
                  placeholder="Brief description of the material"
                  value={uploadForm.description}
                  onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Category <span className="text-rose-500">*</span></Label>
                  <Select value={uploadForm.category} onValueChange={v => setUploadForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {program?.hasSemesters && program.semesters?.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Semester <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <Select
                      value={uploadForm.semesterNumber || 'none'}
                      onValueChange={v => setUploadForm(f => ({ ...f, semesterNumber: v === 'none' ? '' : v }))}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="none">All / General</SelectItem>
                        {program.semesters.map(s => (
                          <SelectItem key={s.number} value={String(s.number)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 pb-2">
                <Label className="text-sm font-semibold">{editingId ? 'Replace file' : 'File'} {!editingId && <span className="text-rose-500">*</span>}</Label>
                <label className={cn(
                  'flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-3xl cursor-pointer transition-colors text-center',
                  uploadFile ? 'border-[#54b947]/60 bg-[#eaf6e6]' : 'border-slate-300 hover:border-[#54b947] hover:bg-[#f4f6f3]'
                )}>
                  <span className="w-12 h-12 rounded-full bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center"><Upload className="w-5 h-5" /></span>
                  <span className="text-sm font-medium text-foreground">
                    {uploadFile
                      ? `${uploadFile.name} (${formatBytes(uploadFile.size)})`
                      : editingId ? 'Click to replace file (optional)' : 'Click to select a file'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
              <Button type="button" variant="ghost" onClick={() => setUploadDialogOpen(false)} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
              <Button type="submit" disabled={uploading} className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : editingId ? 'Save Changes' : 'Upload Material'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
