import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building, MapPin, Layers, Settings, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AcademicClassesPanel } from './AcademicClassesPanel';

export function AcademicCentersPanel() {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin'].includes(user?.role || '');
  const [centers, setCenters] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCenter, setActiveCenter] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalProgramIds, setOriginalProgramIds] = useState<string[]>([]);
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>(['']);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'offline',
    address: '',
    programIds: [] as string[],
    status: 'active'
  });

  useEffect(() => {
    fetchCenters();
    fetchPrograms();
    fetchUniversities();
  }, []);

  const fetchCenters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/academic-centers');
      setCenters(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch academic centers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await api.get('/operations/programs');
      setPrograms(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    }
  };

  const fetchUniversities = async () => {
    try {
      const res = await api.get('/operations/universities');
      setUniversities(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch universities:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/academic-centers/${editingId}`, formData);
        toast.success('Academic center updated successfully');
      } else {
        await api.post('/academic-centers', formData);
        toast.success('Academic center created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchCenters();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save academic center');
    }
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setOriginalProgramIds(c.programIds || []);
    setFormData({
      name: c.name || '',
      type: c.type || 'offline',
      address: c.address || '',
      programIds: c.programIds || [],
      status: c.status || 'active'
    });

    if (c.programIds && c.programIds.length > 0) {
      const activeUnivs = new Set<string>();
      c.programIds.forEach((pid: string) => {
        const prog = programs.find(p => p.id === pid);
        if (prog) activeUnivs.add(prog.universityId);
      });
      setSelectedUniversities(activeUnivs.size > 0 ? Array.from(activeUnivs) : ['']);
    } else {
      setSelectedUniversities(['']);
    }

    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setDeleteReason('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId || !deleteReason.trim()) return;
    
    try {
      const res = await api.delete(`/academic-centers/${deleteId}`, { data: { reason: deleteReason } });
      if (res.status === 202) {
        toast.success('Delete request sent to CEO for approval');
      } else {
        toast.success('Academic center deleted successfully');
      }
      setDeleteDialogOpen(false);
      setDeleteId(null);
      setDeleteReason('');
      fetchCenters();
    } catch (err: any) {
      console.error('Failed to delete academic center:', err);
      toast.error(err.response?.data?.message || 'Failed to delete academic center');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setOriginalProgramIds([]);
    setSelectedUniversities(['']);
    setFormData({ name: '', type: 'offline', address: '', programIds: [], status: 'active' });
  };

  const toggleProgram = (programId: string) => {
    if (originalProgramIds.includes(programId)) return; // Prevent removing original programs
    setFormData(prev => {
      const ids = prev.programIds.includes(programId)
        ? prev.programIds.filter(id => id !== programId)
        : [...prev.programIds, programId];
      return { ...prev, programIds: ids };
    });
  };

  if (activeCenter) {
    return <AcademicClassesPanel center={activeCenter} onBack={() => setActiveCenter(null)} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Academic Centers</h2>
          <p className="text-muted-foreground">Manage academic centers and their program offerings</p>
        </div>
        {canWrite && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Center</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0 border-none shadow-2xl rounded-xl">
              <DialogHeader className="bg-gradient-to-r from-blue-600/10 to-indigo-600/5 p-6 border-b shrink-0">
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Building className="w-6 h-6 text-blue-600" />
                  {editingId ? 'Edit Academic Center' : 'Add New Academic Center'}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <span className="w-6 h-[1px] bg-border"></span>
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-5 rounded-xl border border-border/50">
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-medium">Center Name <span className="text-rose-500">*</span></Label>
                        <Input 
                          value={formData.name} 
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                          required 
                          className="bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-blue-500"
                          placeholder="e.g. Downtown Campus"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Center Type</Label>
                        <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                          <SelectTrigger className="bg-background shadow-sm border-muted-foreground/20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="offline">Offline / Physical</SelectItem>
                            <SelectItem value="online">Online / Virtual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Operational Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                          <SelectTrigger className="bg-background shadow-sm border-muted-foreground/20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-medium">Physical Address</Label>
                        <Textarea 
                          rows={2} 
                          value={formData.address} 
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                          placeholder="Full address (optional for online centers)"
                          className="bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-blue-500 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Program Assignments Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <span className="w-6 h-[1px] bg-border"></span>
                      Program Assignments
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background p-3 rounded-lg border border-border/50 shadow-sm mb-4">
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Badge variant="secondary" className="px-2 py-0.5">{formData.programIds.length}</Badge> 
                        Programs Selected Total
                      </div>
                    </div>

                    <div className="space-y-6">
                      {selectedUniversities.map((univId, index) => {
                        const hasOriginalPrograms = univId ? originalProgramIds.some(pid => programs.find(p => p.id === pid)?.universityId === univId) : false;
                        
                        return (
                        <div key={index} className="bg-muted/20 p-5 rounded-xl border border-border/50 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background p-3 rounded-lg border border-border/50 shadow-sm">
                            <div className="text-sm font-medium">
                              University {index + 1} {hasOriginalPrograms && <Badge variant="outline" className="ml-2 text-[10px] bg-slate-100 text-slate-500">Configured</Badge>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Select 
                                value={univId} 
                                onValueChange={(val) => {
                                  const newUnivs = [...selectedUniversities];
                                  newUnivs[index] = val;
                                  setSelectedUniversities(newUnivs);
                                }}
                                disabled={hasOriginalPrograms}
                              >
                                <SelectTrigger className="w-full sm:w-[280px] h-9 bg-background border-muted-foreground/20 font-medium">
                                  <SelectValue placeholder="Select a University" />
                                </SelectTrigger>
                                <SelectContent>
                                  {universities.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selectedUniversities.length > 1 && !hasOriginalPrograms && (
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                  onClick={() => {
                                    const newUnivs = selectedUniversities.filter((_, i) => i !== index);
                                    setSelectedUniversities(newUnivs);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-background border border-border/50 rounded-lg p-1 shadow-inner min-h-[120px]">
                            {!univId ? (
                              <div className="flex flex-col items-center justify-center text-muted-foreground p-6 text-center space-y-2">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                  <Building className="w-6 h-6 opacity-50" />
                                </div>
                                <p className="text-sm">Please select a university above to view and assign its programs.</p>
                              </div>
                            ) : programs.filter(p => p.universityId === univId).length === 0 ? (
                              <div className="flex flex-col items-center justify-center text-muted-foreground p-6 text-center space-y-2">
                                <p className="text-sm">No programs available for this university.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-1">
                                {programs
                                  .filter(p => p.universityId === univId)
                                  .map(program => {
                                  const isOriginal = originalProgramIds.includes(program.id);
                                  return (
                                  <label 
                                    key={program.id} 
                                    className={`flex items-start space-x-3 p-3 rounded-md cursor-pointer transition-all duration-200 border border-transparent ${
                                      formData.programIds.includes(program.id) 
                                        ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                                        : 'hover:bg-muted'
                                    } ${isOriginal ? 'opacity-70 cursor-not-allowed' : ''}`}
                                  >
                                    <Checkbox 
                                      id={`prog-${program.id}`}
                                      checked={formData.programIds.includes(program.id)}
                                      onCheckedChange={() => toggleProgram(program.id)}
                                      disabled={isOriginal}
                                      className="mt-0.5 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                    <div className="space-y-0.5 leading-none">
                                      <p className="text-sm font-medium leading-tight flex items-center gap-2">
                                        {program.name}
                                        {isOriginal && <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">Locked</span>}
                                      </p>
                                      {program.code && <p className="text-xs text-muted-foreground">Code: {program.code}</p>}
                                    </div>
                                  </label>
                                )})}
                              </div>
                            )}
                          </div>
                        </div>
                      )})}
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setSelectedUniversities([...selectedUniversities, ''])}
                        className="w-full border-dashed border-2 hover:bg-muted/50"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Another University
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-6 pb-2 border-t mt-8 justify-end items-center">
                    <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="px-6 hover:bg-rose-50 hover:text-rose-600 transition-colors">Cancel</Button>
                    <Button type="submit" className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all">
                      {editingId ? 'Save Changes' : 'Create Center'}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex flex-col justify-center items-center py-20 text-muted-foreground bg-card rounded-xl border border-border/50 shadow-sm">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            Loading academic centers...
          </div>
        ) : centers.length === 0 ? (
          <div className="col-span-full flex flex-col justify-center items-center py-20 bg-card rounded-xl border border-border/50 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
              <Building className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Centers Found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              You haven't added any academic centers yet. Create your first center to start assigning programs.
            </p>
            {canWrite && (
              <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                <Plus className="w-4 h-4 mr-2" /> Add Your First Center
              </Button>
            )}
          </div>
        ) : (
          centers.map((c) => (
            <div 
              key={c.id} 
              className="group bg-card rounded-2xl border border-border/60 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Card Header (Gradient & Info) */}
              <div className="relative p-6 pb-4 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-border/50 flex items-center justify-center shrink-0 text-blue-600">
                    <Building className="w-6 h-6" />
                  </div>
                  {canWrite && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 hover:bg-white dark:bg-slate-800/50 dark:hover:bg-slate-800">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl">
                        <DropdownMenuItem onClick={() => handleEdit(c)} className="cursor-pointer gap-2">
                          <Edit className="w-4 h-4" /> Edit Center
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClick(c.id)} className="cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-600 gap-2">
                          <Trash2 className="w-4 h-4" /> Request Deletion
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <h3 className="text-xl font-bold line-clamp-1 mb-1">{c.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="rounded-full px-2.5 py-0.5 text-xs font-medium">
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${c.status === 'active' ? 'bg-white dark:bg-current' : 'bg-current opacity-50'}`}></span>
                    {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-medium capitalize border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20">
                    {c.type}
                  </Badge>
                </div>
              </div>

              {/* Card Body (Details) */}
              <div className="p-6 pt-2 flex-1 flex flex-col gap-4">
                <div className="flex items-start gap-3 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground/70" />
                  <span className="line-clamp-2 leading-relaxed">
                    {c.address || 'No physical address provided (Virtual / Online Center)'}
                  </span>
                </div>
              </div>

              {/* Card Footer (Stats) */}
              <div className="px-6 py-4 bg-muted/10 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  {c.programIds ? c.programIds.length : 0} <span className="text-muted-foreground font-normal">Programs</span>
                </div>
                {canWrite && (
                  <Button variant="outline" size="sm" onClick={() => setActiveCenter(c)} className="rounded-full text-xs h-8 border-border/60 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">
                    Manage Classes
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Custom Delete Reason Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-xl">
          <DialogHeader className="bg-rose-50 dark:bg-rose-950/20 p-6 border-b border-rose-100 dark:border-rose-900">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
              Request Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Reason for deletion <span className="text-rose-500">*</span></Label>
              <Textarea 
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Please explain why this center needs to be deleted. This will be sent to the CEO for approval."
                className="resize-none h-24 focus-visible:ring-rose-500"
                required
              />
              <p className="text-xs text-muted-foreground">
                Deletions require executive approval. Your request will be queued.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteConfirm} 
                disabled={!deleteReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 shadow-md"
              >
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
