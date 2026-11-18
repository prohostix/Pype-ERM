import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ArrowLeft, Layers, MoreVertical, BookOpen, Users, VideoOff, Video, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AcademicBatchesPanel } from './AcademicBatchesPanel';
import { ClassContentViewer } from './ClassContentViewer';

export function AcademicClassesPanel({ center, onBack }: { center: any; onBack: () => void }) {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin'].includes(user?.role || '');
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      {/* Header Area */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs uppercase bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                Inside Center
              </Badge>
              <h2 className="text-2xl font-bold">{center.name}</h2>
            </div>
            <p className="text-sm text-muted-foreground pl-1 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Manage Academic Classes & Batches
            </p>
          </div>
        </div>
        {canWrite && (
          <Button onClick={() => setDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
            <Plus className="w-4 h-4 mr-2" /> Add Class
          </Button>
        )}
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex flex-col justify-center items-center py-20 text-muted-foreground bg-card rounded-xl border border-border/50 shadow-sm">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            Loading academic classes...
          </div>
        ) : classes.length === 0 ? (
          <div className="col-span-full flex flex-col justify-center items-center py-20 bg-card rounded-xl border border-border/50 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Classes Found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              There are no academic classes created in this center yet.
            </p>
            {canWrite && (
              <Button onClick={() => setDialogOpen(true)} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                <Plus className="w-4 h-4 mr-2" /> Create First Class
              </Button>
            )}
          </div>
        ) : (
          classes.map((c) => (
            <div 
              key={c.id} 
              className="group bg-card rounded-xl border border-border/60 shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all duration-300 overflow-hidden flex flex-col"
            >
              <div className="relative p-5 border-b border-border/50 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-950/20">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold line-clamp-1 flex-1 pr-2">{c.name}</h3>
                  {canWrite && (
                    <div className="flex items-center gap-1">
                      {center.type !== 'online' && (
                        <Button variant="outline" size="sm" onClick={() => setActiveClass(c)} className="rounded-full text-xs h-7 border-border/60 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 transition-colors">
                          Batches
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                          <DropdownMenuItem onClick={() => handleEdit(c)} className="cursor-pointer gap-2">
                            <Edit className="w-4 h-4" /> Edit Class
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClick(c.id)} className="cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-600 gap-2">
                            <Trash2 className="w-4 h-4" /> Request Deletion
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-[10px] uppercase tracking-wider px-2 py-0.5">
                    {c.status}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] uppercase tracking-wider px-2 py-0.5 font-bold ${center.type === 'online' ? 'border-sky-500/30 text-sky-600 bg-sky-500/10' : 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'}`}>
                    {center.type === 'online' ? 'Online Class' : 'Offline Class'}
                  </Badge>
                </div>
              </div>
              <div className="p-5 flex-1 bg-muted/10 space-y-4">
                {(() => {
                  const principals: any[] = c.incharges?.length ? c.incharges : (c.incharge ? [c.incharge] : []);
                  if (principals.length === 0) return null;
                  return (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        {principals.length > 1 ? 'Principals In-charge' : 'Principal In-charge'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {principals.map((p: any) => (
                          <div key={p.id} className="flex items-center gap-2 text-sm font-medium">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                              {p.name.charAt(0)}
                            </div>
                            {p.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Assigned Programs</p>
                  {c.programIds && c.programIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {c.programIds.map((pid: string) => {
                        const prog = programs.find(p => p.id === pid);
                        return prog ? (
                          <Badge key={pid} variant="secondary" className="font-normal border-border/50 bg-background hover:bg-muted">
                            {prog.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No programs assigned.</p>
                  )}
                </div>

                {canWrite && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setContentClass(c)}>
                    <FolderOpen className="w-4 h-4 mr-2" /> Faculty Content
                  </Button>
                )}

                {center.type === 'online' && canWrite && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => openStudents(c)}>
                    <Users className="w-4 h-4 mr-2" /> Students &amp; Video Access
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ClassContentViewer academicClass={contentClass} onClose={() => setContentClass(null)} />

      {/* Students & video access (online classes) */}
      <Dialog open={!!studentsClass} onOpenChange={(o) => { if (!o) { setStudentsClass(null); setBlockTarget(null); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Students: {studentsClass?.name}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search by name, email or enrollment no..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
          />
          <div className="max-h-[420px] overflow-y-auto space-y-1">
            {loadingStudents ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Loading students...</p>
            ) : (() => {
              const q = studentSearch.toLowerCase();
              const rows = classStudents.filter(st =>
                (st.name || '').toLowerCase().includes(q) || (st.email || '').toLowerCase().includes(q) || (st.enrollmentNo || '').toLowerCase().includes(q)
              );
              if (rows.length === 0) return <p className="p-8 text-center text-sm text-muted-foreground">No students found for this class.</p>;
              return rows.map(st => (
                <div key={st.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{st.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{st.enrollmentNo || 'No enrollment no'} · {st.program?.name || 'N/A'}</p>
                  </div>
                  {st.videoBlocked && <Badge variant="destructive" className="text-[10px] shrink-0" title={st.videoBlockReason || undefined}>Videos blocked</Badge>}
                  <Button
                    size="sm"
                    variant={st.videoBlocked ? 'default' : 'outline'}
                    className="shrink-0"
                    onClick={() => { setBlockTarget(st); setBlockReason(st.videoBlockReason || ''); }}
                  >
                    {st.videoBlocked ? <Video className="w-4 h-4 mr-1.5" /> : <VideoOff className="w-4 h-4 mr-1.5" />}
                    {st.videoBlocked ? 'Unblock' : 'Block videos'}
                  </Button>
                </div>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!blockTarget} onOpenChange={(o) => { if (!o) { setBlockTarget(null); setBlockReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{blockTarget?.videoBlocked ? 'Restore video lectures' : 'Block video lectures'}: {blockTarget?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {blockTarget?.videoBlocked
              ? 'The student will be able to watch their online class videos again (fee rules still apply).'
              : 'The student can still sign in and see fees and profile, but every online class video is locked until you unblock them.'}
          </p>
          {!blockTarget?.videoBlocked && (
            <div className="space-y-2">
              <Label>Reason (shown to the student)</Label>
              <Textarea rows={3} value={blockReason} onChange={(e) => setBlockReason(e.target.value)} maxLength={300} placeholder="e.g. Pending dues, disciplinary action…" className="resize-none" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBlockTarget(null)} disabled={savingBlock}>Cancel</Button>
            {blockTarget?.videoBlocked ? (
              <Button onClick={() => handleVideoBlock(false)} disabled={savingBlock}>{savingBlock ? 'Saving...' : 'Unblock Videos'}</Button>
            ) : (
              <Button variant="destructive" onClick={() => handleVideoBlock(true)} disabled={savingBlock}>{savingBlock ? 'Saving...' : 'Block Videos'}</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Modal */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-xl">
          <DialogHeader className="bg-gradient-to-r from-indigo-600/10 to-blue-600/5 p-6 border-b shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              {editingId ? 'Edit Academic Class' : 'Create Academic Class'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Class Name <span className="text-rose-500">*</span></Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                  placeholder="e.g. Science Batch A"
                  className="bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-background shadow-sm border-muted-foreground/20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Principals In-charge</Label>
                  <Badge variant="secondary">{formData.inchargeIds.length} Selected</Badge>
                </div>
                <div className="bg-muted/20 border border-border/50 rounded-lg p-3 max-h-[180px] overflow-y-auto custom-scrollbar space-y-2">
                  {faculties.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No faculty available.</p>
                  ) : (
                    faculties.map((f: any) => (
                      <label key={f.id} className="flex items-center gap-3 cursor-pointer text-sm">
                        <Checkbox
                          checked={formData.inchargeIds.includes(f.id)}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              inchargeIds: checked
                                ? [...formData.inchargeIds, f.id]
                                : formData.inchargeIds.filter((id) => id !== f.id),
                            })
                          }
                        />
                        {f.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Clubbed Programs</Label>
                  <Badge variant="secondary">{formData.programIds.length} Selected</Badge>
                </div>
                <div className="bg-muted/20 border border-border/50 rounded-lg p-3 max-h-[250px] overflow-y-auto custom-scrollbar space-y-2">
                  {programs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No programs are assigned to {center.name}. Assign programs to the center first.
                    </p>
                  ) : (
                    programs.map(program => (
                      <label 
                        key={program.id} 
                        className={`flex items-start space-x-3 p-2 rounded-md cursor-pointer transition-all duration-200 border border-transparent ${
                          formData.programIds.includes(program.id) 
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' 
                            : 'hover:bg-background border-border/50'
                        }`}
                      >
                        <Checkbox 
                          id={`prog-${program.id}`}
                          checked={formData.programIds.includes(program.id)}
                          onCheckedChange={() => toggleProgram(program.id)}
                          className="mt-0.5 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        />
                        <div className="space-y-0.5 leading-none">
                          <p className="text-sm font-medium leading-tight">{program.name}</p>
                          {program.code && <p className="text-xs text-muted-foreground">Code: {program.code}</p>}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4 justify-end border-t border-border/50 mt-4">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md">
                  {editingId ? 'Save Changes' : 'Create Class'}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
