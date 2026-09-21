import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ArrowLeft, Layers, MoreVertical, BookOpen } from 'lucide-react';
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

export function AcademicClassesPanel({ center, onBack }: { center: any; onBack: () => void }) {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin'].includes(user?.role || '');
  const [classes, setClasses] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeClass, setActiveClass] = useState<any | null>(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  


  const [formData, setFormData] = useState({
    name: '',
    programIds: [] as string[],
    status: 'active',
    inchargeId: 'none'
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
    setFormData({ name: '', programIds: [], status: 'active', inchargeId: 'none' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        inchargeId: formData.inchargeId === 'none' ? null : formData.inchargeId
      };
      
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
      inchargeId: c.inchargeId || 'none'
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
    return <AcademicBatchesPanel academicClass={activeClass} onBack={() => setActiveClass(null)} />;
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
                      <Button variant="outline" size="sm" onClick={() => setActiveClass(c)} className="rounded-full text-xs h-7 border-border/60 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 transition-colors">
                        Batches
                      </Button>
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
                <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="mt-2 text-[10px] uppercase tracking-wider px-2 py-0.5">
                  {c.status}
                </Badge>
              </div>
              <div className="p-5 flex-1 bg-muted/10 space-y-4">
                {c.incharge && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Principal In-charge</p>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                        {c.incharge.name.charAt(0)}
                      </div>
                      {c.incharge.name}
                    </div>
                  </div>
                )}
                
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
              </div>
            </div>
          ))
        )}
      </div>

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
                <Label className="text-sm font-medium">Principal In-charge</Label>
                <Select value={formData.inchargeId} onValueChange={(v) => setFormData({ ...formData, inchargeId: v })}>
                  <SelectTrigger className="bg-background shadow-sm border-muted-foreground/20">
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {faculties.map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
