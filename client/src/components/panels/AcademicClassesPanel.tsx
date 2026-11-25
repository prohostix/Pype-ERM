import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ArrowLeft, Layers, MoreVertical, BookOpen, Users, VideoOff, Video, FolderOpen, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AcademicBatchesPanel } from './AcademicBatchesPanel';
import { ClassContentViewer } from './ClassContentViewer';
import { isGiven, mayOn } from '@/lib/access';

export function AcademicClassesPanel({ center, onBack }: { center: any; onBack: () => void }) {
  const { user } = useAuth();
  const isOrgAdmin = ['org_admin', 'superadmin'].includes(user?.role || '');
  const mayCreate = mayOn(user, 'academic_centers', 'create', isOrgAdmin);
  const mayEdit = mayOn(user, 'academic_centers', 'edit', isOrgAdmin);
  const mayDelete = mayOn(user, 'academic_centers', 'delete', isOrgAdmin);
  // Opening a class's batches and content needs only the page itself
  const canWrite = isOrgAdmin || mayCreate || mayEdit || mayDelete || isGiven(user, 'academic_centers');
  const [classes, setClasses] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // Read-only view of what faculty have uploaded to a class
  const [contentClass, setContentClass] = useState<any | null>(null);

  // Online classes: list the class's students so an admin can block or restore their videos
  const [studentsClass, setStudentsClass] = useState<any | null>(null);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [blockTarget, setBlockTarget] = useState<any | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);

  const openStudents = async (cls: any) => {
    setStudentsClass(cls);
    setStudentSearch('');
    setClassStudents([]);
    setLoadingStudents(true);
    try {
      const res = await api.get(`/academic-classes/${cls.id}/students`);
      setClassStudents(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleVideoBlock = async (blocked: boolean) => {
    if (!blockTarget) return;
    setSavingBlock(true);
    try {
      await api.put(`/students/${blockTarget.id}/video-block`, { blocked, reason: blockReason });
      toast.success(blocked ? 'Video lectures blocked for this student' : 'Video lectures restored');
      setClassStudents(prev => prev.map(st =>
        st.id === blockTarget.id ? { ...st, videoBlocked: blocked, videoBlockReason: blocked ? (blockReason.trim() || null) : null } : st
      ));
      setBlockTarget(null);
      setBlockReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update video access');
    } finally {
      setSavingBlock(false);
    }
  };
  const [activeClass, setActiveClass] = useState<any | null>(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  


  const [formData, setFormData] = useState({
    name: '',
    programIds: [] as string[],
    status: 'active',
    inchargeIds: [] as string[]
  });

  useEffect(() => {
    fetchClasses();
    fetchPrograms();
    fetchFaculties();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/academic-classes/center/${center.id}`);
      setClasses(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch academic classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await api.get('/operations/programs');
      // Only keep programs that are assigned to the center
      const centerPrograms = (res.data.data || []).filter((p: any) => center.programIds?.includes(p.id));
      setPrograms(centerPrograms);
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    }
  };
  const fetchFaculties = async () => {
    try {
      const res = await api.get('/faculties');
      setFaculties(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch faculties:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', programIds: [], status: 'active', inchargeIds: [] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      
      if (editingId) {
        await api.put(`/academic-classes/${editingId}`, payload);
        toast.success('Academic class updated successfully');
      } else {
        await api.post('/academic-classes', { ...payload, academicCenterId: center.id });
        toast.success('Academic class created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchClasses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save academic class');
    }
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setFormData({
      name: c.name || '',
      programIds: c.programIds || [],
      status: c.status || 'active',
      inchargeIds: c.inchargeIds?.length ? c.inchargeIds : (c.inchargeId ? [c.inchargeId] : [])
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    try {
      await api.delete(`/academic-classes/${id}`);
      fetchClasses();
    } catch (err: any) {
      if (!err.isDeleteRequest) {
        console.error('Failed to delete academic class:', err);
        toast.error('Failed to delete academic class');
      }
    }
  };

  const toggleProgram = (programId: string) => {
    setFormData(prev => {
      const ids = prev.programIds.includes(programId)
        ? prev.programIds.filter(id => id !== programId)
        : [...prev.programIds, programId];
      return { ...prev, programIds: ids };
    });
  };

  if (activeClass) {
    return <AcademicBatchesPanel academicClass={activeClass} isOnline={center.type === 'online'} onBack={() => setActiveClass(null)} />;
  }

  const isOnline = center.type === 'online';
  const SHELL = 'w-[96vw] p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col';
  const FONT = { fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" } as const;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="outline" size="icon" onClick={onBack} className="h-11 w-11 shrink-0 rounded-full bg-white border-slate-200 shadow-sm hover:bg-[#eaf6e6]" aria-label="Back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">{center.name}</h2>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#e3f7dd] text-[#1f6a17]">{isOnline ? 'Online center' : 'Offline center'}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Manage Academic Classes &amp; Batches
            </p>
          </div>
        </div>
        {mayCreate && (
          <Button onClick={() => setDialogOpen(true)} className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm shrink-0 self-start lg:self-auto">
            <Plus className="w-4 h-4" /> Add Class
          </Button>
        )}
      </div>

      {/* Classes grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 sm:gap-6">
        {loading ? (
          <div className="col-span-full flex flex-col justify-center items-center py-20 text-muted-foreground bg-card rounded-3xl">
            <div className="w-8 h-8 border-4 border-[#54b947] border-t-transparent rounded-full animate-spin mb-4"></div>
            Loading academic classes...
          </div>
        ) : classes.length === 0 ? (
          <div className="col-span-full flex flex-col justify-center items-center py-20 bg-white dark:bg-card rounded-3xl border border-dashed border-slate-300">
            <div className="w-14 h-14 rounded-full bg-[#eaf6e6] flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-[#256c1d]" />
            </div>
            <h3 className="text-xl font-semibold mb-1.5">No classes found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6 text-sm">
              There are no academic classes created in this center yet.
            </p>
            {mayCreate && (
              <Button onClick={() => setDialogOpen(true)} className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold shadow-none">
                <Plus className="w-4 h-4 mr-2" /> Create First Class
              </Button>
            )}
          </div>
        ) : (
          classes.map((c) => {
            const principals: any[] = c.incharges?.length ? c.incharges : (c.incharge ? [c.incharge] : []);
            const assigned = (c.programIds || []).map((pid: string) => programs.find(p => p.id === pid)).filter(Boolean);
            return (
              <div
                key={c.id}
                className="group bg-card rounded-3xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.10)]"
              >
                <div className="p-6 pb-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold line-clamp-1" title={c.name}>{c.name}</h3>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${c.status === 'active' ? 'bg-[#e3f7dd] text-[#1f6a17]' : 'bg-slate-100 text-slate-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-[#54b947]' : 'bg-slate-400'}`} />{c.status}
                          </span>
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#f1f3ef] text-slate-600">{isOnline ? 'Online class' : 'Offline class'}</span>
                        </div>
                      </div>
                    </div>
                    {(mayEdit || mayDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-white border-slate-200 text-slate-600 hover:bg-[#f4f6f3] shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5">
                          {mayEdit && (
                            <DropdownMenuItem onClick={() => handleEdit(c)} className="cursor-pointer gap-2.5 py-2.5 rounded-xl">
                              <Edit className="w-4 h-4" /> Edit Class
                            </DropdownMenuItem>
                          )}
                          {mayDelete && (
                            <DropdownMenuItem onClick={() => handleDeleteClick(c.id)} className="cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-600 gap-2.5 py-2.5 rounded-xl">
                              <Trash2 className="w-4 h-4" /> Request Deletion
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-5 flex-1 space-y-4">
                  {principals.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground mb-2">{principals.length > 1 ? 'Principals in-charge' : 'Principal in-charge'}</p>
                      <div className="flex flex-wrap gap-2">
                        {principals.map((pr: any) => (
                          <span key={pr.id} className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[#f4f6f3] dark:bg-muted/30 text-sm font-medium">
                            <span className="w-6 h-6 rounded-full bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center text-xs font-bold">{pr.name.charAt(0)}</span>
                            {pr.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-2">Assigned programs</p>
                    {assigned.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {assigned.map((prog: any) => (
                          <span key={prog.id} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#eaf6e6] text-[#1f6a17]">{prog.name}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No programs assigned.</p>
                    )}
                  </div>
                </div>

                {canWrite && (
                  <div className="px-6 pb-6 flex flex-wrap gap-2">
                    {!isOnline && (
                      <Button variant="outline" onClick={() => setActiveClass(c)} className="h-10 px-5 rounded-full bg-white border-slate-200 text-sm font-semibold gap-1.5 hover:bg-[#eaf6e6] hover:text-[#256c1d]">
                        <Layers className="w-4 h-4" /> Batches
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setContentClass(c)} className="h-10 px-5 rounded-full bg-white border-slate-200 text-sm font-semibold gap-1.5 hover:bg-[#eaf6e6] hover:text-[#256c1d]">
                      <FolderOpen className="w-4 h-4" /> Faculty Content
                    </Button>
                    {isOnline && mayEdit && (
                      <Button variant="outline" onClick={() => openStudents(c)} className="h-10 px-5 rounded-full bg-white border-slate-200 text-sm font-semibold gap-1.5 hover:bg-[#eaf6e6] hover:text-[#256c1d]">
                        <Users className="w-4 h-4" /> Students &amp; Video Access
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <ClassContentViewer academicClass={contentClass} onClose={() => setContentClass(null)} />

      {/* Students & video access (online classes) */}
      <Dialog open={!!studentsClass} onOpenChange={(o) => { if (!o) { setStudentsClass(null); setBlockTarget(null); } }}>
        <DialogContent className={`${SHELL} sm:max-w-2xl`} style={FONT}>
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-4 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0"><Users className="w-5 h-5" /></div>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-left">Students: {studentsClass?.name}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground text-left">Block or restore access to online class videos for each student.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 sm:px-8 pb-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or enrollment no..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-11 h-11 rounded-full bg-[#f4f6f3] border-transparent text-sm focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-6 space-y-2">
            {loadingStudents ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Loading students...</p>
            ) : (() => {
              const q = studentSearch.toLowerCase();
              const rows = classStudents.filter(st =>
                (st.name || '').toLowerCase().includes(q) || (st.email || '').toLowerCase().includes(q) || (st.enrollmentNo || '').toLowerCase().includes(q)
              );
              if (rows.length === 0) return <p className="p-8 text-center text-sm text-muted-foreground">No students found for this class.</p>;
              return rows.map(st => (
                <div key={st.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#f4f6f3] dark:bg-muted/30">
                  <div className="w-10 h-10 rounded-full bg-white text-[#256c1d] flex items-center justify-center font-semibold shrink-0">{(st.name || '?').charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{st.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{st.enrollmentNo || 'No enrollment no'} · {st.program?.name || 'N/A'}</p>
                  </div>
                  {st.videoBlocked && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 shrink-0" title={st.videoBlockReason || undefined}>Videos blocked</span>}
                  <Button
                    variant={st.videoBlocked ? 'default' : 'outline'}
                    className={cn('h-9 px-4 rounded-full text-xs font-semibold shrink-0 gap-1.5', st.videoBlocked ? 'bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14]' : 'bg-white border-slate-200 hover:bg-rose-50 hover:text-rose-600')}
                    onClick={() => { setBlockTarget(st); setBlockReason(st.videoBlockReason || ''); }}
                  >
                    {st.videoBlocked ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                    {st.videoBlocked ? 'Unblock' : 'Block videos'}
                  </Button>
                </div>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!blockTarget} onOpenChange={(o) => { if (!o) { setBlockTarget(null); setBlockReason(''); } }}>
        <DialogContent className={`${SHELL} sm:max-w-md`} style={FONT}>
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-4 shrink-0">
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', blockTarget?.videoBlocked ? 'bg-[#eaf6e6] text-[#256c1d]' : 'bg-rose-50 text-rose-600')}>
              {blockTarget?.videoBlocked ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </div>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-left">{blockTarget?.videoBlocked ? 'Restore video lectures' : 'Block video lectures'}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground text-left">{blockTarget?.name}</DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 sm:px-8 pb-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              {blockTarget?.videoBlocked
                ? 'The student will be able to watch their online class videos again (fee rules still apply).'
                : 'The student can still sign in and see fees and profile, but every online class video is locked until you unblock them.'}
            </p>
            {!blockTarget?.videoBlocked && (
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Reason <span className="font-normal text-muted-foreground">(shown to the student)</span></Label>
                <Textarea rows={3} value={blockReason} onChange={(e) => setBlockReason(e.target.value)} maxLength={300} placeholder="e.g. Pending dues, disciplinary action…" className="resize-none rounded-2xl bg-[#f4f6f3] border-transparent px-4 py-3 focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20" />
              </div>
            )}
          </div>
          <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
            <Button variant="ghost" onClick={() => setBlockTarget(null)} disabled={savingBlock} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
            {blockTarget?.videoBlocked ? (
              <Button onClick={() => handleVideoBlock(false)} disabled={savingBlock} className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold">{savingBlock ? 'Saving...' : 'Unblock Videos'}</Button>
            ) : (
              <Button onClick={() => handleVideoBlock(true)} disabled={savingBlock} className="h-11 rounded-full px-8 bg-rose-600 hover:bg-rose-700 text-white font-semibold">{savingBlock ? 'Saving...' : 'Block Videos'}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Modal */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className={`${SHELL} sm:max-w-lg`} style={FONT}>
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
              {editingId ? <Edit className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
            </div>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-left">{editingId ? 'Edit Academic Class' : 'Create Academic Class'}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground text-left">{center.name}</DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-6">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Class name <span className="text-rose-500">*</span></Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g. Science Batch A"
                  className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Status</Label>
                <div className="flex gap-2.5">
                  {([['active', 'Active'], ['inactive', 'Inactive']] as const).map(([val, label]) => (
                    <button key={val} type="button" aria-pressed={formData.status === val} onClick={() => setFormData({ ...formData, status: val })}
                      className={cn('px-6 py-2.5 rounded-full text-sm font-semibold border transition-colors', formData.status === val ? 'bg-[#0b1d14] border-[#0b1d14] text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-[#f4f6f3]')}>{label}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Principals in-charge</Label>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#e3f7dd] text-[#1f6a17]">{formData.inchargeIds.length} selected</span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                  {faculties.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No faculty available.</p>
                  ) : (
                    faculties.map((f: any) => {
                      const on = formData.inchargeIds.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setFormData({ ...formData, inchargeIds: on ? formData.inchargeIds.filter((id) => id !== f.id) : [...formData.inchargeIds, f.id] })}
                          className={cn('px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors', on ? 'bg-[#8ae47e] border-[#8ae47e] text-[#0b1d14]' : 'bg-white border-slate-200 text-slate-600 hover:bg-[#f4f6f3]')}
                        >
                          {f.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-3 pb-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Clubbed programs</Label>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#e3f7dd] text-[#1f6a17]">{formData.programIds.length} selected</span>
                </div>
                <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar">
                  {programs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No programs are assigned to {center.name}. Assign programs to the center first.
                    </p>
                  ) : (
                    programs.map(program => {
                      const on = formData.programIds.includes(program.id);
                      return (
                        <label
                          key={program.id}
                          className={cn('flex items-start gap-3 rounded-2xl px-4 py-3 cursor-pointer border transition-colors', on ? 'bg-[#eaf6e6] border-[#54b947]/40' : 'bg-white border-slate-200 hover:bg-[#f4f6f3]')}
                        >
                          <Checkbox id={`prog-${program.id}`} checked={on} onCheckedChange={() => toggleProgram(program.id)} className="mt-0.5" />
                          <div className="space-y-0.5 leading-none">
                            <p className="text-sm font-medium leading-tight">{program.name}</p>
                            {program.code && <p className="text-xs text-muted-foreground">Code: {program.code}</p>}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
              <Button type="submit" className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                {editingId ? 'Save Changes' : 'Create Class'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
