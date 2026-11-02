import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Building, 
  MapPin, 
  Layers, 
  Settings, 
  MoreVertical, 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Clock, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  PlaySquare, 
  GraduationCap, 
  DollarSign, 
  Info,
  Search,
  Filter,
  Copy,
  ChevronRight
} from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AcademicClassesPanel } from './AcademicClassesPanel';

export interface ProgramAccessConfig {
  dailyClassLimitEnabled: boolean;
  dailyClassLimit: number;
  feeLocking: {
    enabled: boolean;
    lockPolicy?: string;
    gracePeriodDays: number;
    minPaidPercentage: number;
    lockMessage: string;
  };
}

export const DEFAULT_PROGRAM_CONFIG: ProgramAccessConfig = {
  dailyClassLimitEnabled: false,
  dailyClassLimit: 2,
  feeLocking: {
    enabled: false,
    lockPolicy: 'min_percentage',
    gracePeriodDays: 3,
    minPaidPercentage: 50,
    lockMessage: 'Video lectures are locked because you have paid {paidPercent}% of your total course fee (₹{paidFee} of ₹{totalFee}). A minimum payment of {requiredPercent}% is required to unlock.'
  }
};

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

  // Program Video Access & Fee Rules State (Common Area)
  const [programConfigs, setProgramConfigs] = useState<Record<string, ProgramAccessConfig>>({});
  const [programRulesModalOpen, setProgramRulesModalOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [savingProgramRules, setSavingProgramRules] = useState(false);
  const [searchProgramQuery, setSearchProgramQuery] = useState('');
  const [filterUnivId, setFilterUnivId] = useState<string>('all');

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
    fetchProgramConfigs();
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
      const progList = res.data.data || [];
      setPrograms(progList);
      if (progList.length > 0 && !selectedProgramId) {
        setSelectedProgramId(progList[0].id);
      }
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

  const fetchProgramConfigs = async () => {
    try {
      const res = await api.get('/academic-centers/program-access-configs');
      setProgramConfigs(res.data.data || {});
    } catch (err) {
      console.error('Failed to fetch program access configs:', err);
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

  const handleDeleteClick = async (id: string) => {
    try {
      await api.delete(`/academic-centers/${id}`);
      fetchCenters();
    } catch (err: any) {
      if (!err.isDeleteRequest) {
        console.error('Failed to delete academic center:', err);
        toast.error('Failed to delete academic center');
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setOriginalProgramIds([]);
    setSelectedUniversities(['']);
    setFormData({ name: '', type: 'offline', address: '', programIds: [], status: 'active' });
  };

  const toggleProgram = (programId: string) => {
    if (originalProgramIds.includes(programId)) return;
    setFormData(prev => {
      const ids = prev.programIds.includes(programId)
        ? prev.programIds.filter(id => id !== programId)
        : [...prev.programIds, programId];
      return { ...prev, programIds: ids };
    });
  };

  // Helper to get a program's current configuration with defaults
  const getProgramConfig = (progId: string): ProgramAccessConfig => {
    return programConfigs[progId] || DEFAULT_PROGRAM_CONFIG;
  };

  // Helper to update a single program's configuration
  const updateProgramConfig = (progId: string, updates: Partial<ProgramAccessConfig>) => {
    setProgramConfigs(prev => {
      const current = prev[progId] || DEFAULT_PROGRAM_CONFIG;
      return {
        ...prev,
        [progId]: {
          ...current,
          ...updates,
          feeLocking: {
            ...current.feeLocking,
            ...(updates.feeLocking || {})
          }
        }
      };
    });
  };

  // Save all program access configurations to backend
  const handleSaveProgramRules = async () => {
    setSavingProgramRules(true);
    try {
      await api.put('/academic-centers/program-access-configs', {
        configs: programConfigs
      });
      toast.success('Program video access and fee locking rules saved successfully');
      setProgramRulesModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save program rules');
    } finally {
      setSavingProgramRules(false);
    }
  };

  // Copy current program's rules to all other programs
  const handleApplyToAllPrograms = (sourceProgId: string) => {
    const source = programConfigs[sourceProgId] || DEFAULT_PROGRAM_CONFIG;
    const newConfigs: Record<string, ProgramAccessConfig> = {};
    programs.forEach(p => {
      newConfigs[p.id] = JSON.parse(JSON.stringify(source));
    });
    setProgramConfigs(newConfigs);
    toast.success(`Copied configuration across all ${programs.length} programs`);
  };

  // Computed summary metrics for common area
  const programsWithDailyLimit = programs.filter(p => programConfigs[p.id]?.dailyClassLimitEnabled).length;
  const programsWithFeeLock = programs.filter(p => programConfigs[p.id]?.feeLocking?.enabled).length;
  const configuredProgramsCount = programs.filter(p => 
    programConfigs[p.id]?.dailyClassLimitEnabled || programConfigs[p.id]?.feeLocking?.enabled
  ).length;

  // Filtered programs for modal
  const filteredPrograms = programs.filter(p => {
    const matchesQuery = !searchProgramQuery || 
      p.name?.toLowerCase().includes(searchProgramQuery.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchProgramQuery.toLowerCase());
    const matchesUniv = filterUnivId === 'all' || p.universityId === filterUnivId;
    return matchesQuery && matchesUniv;
  });

  const activeSelectedProgram = programs.find(p => p.id === selectedProgramId) || filteredPrograms[0] || null;
  const activeSelectedConfig = activeSelectedProgram ? getProgramConfig(activeSelectedProgram.id) : DEFAULT_PROGRAM_CONFIG;

  if (activeCenter) {
    return <AcademicClassesPanel center={activeCenter} onBack={() => setActiveCenter(null)} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* COMMON TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Academic Centers & Programs</h2>
          <p className="text-muted-foreground text-sm">
            Manage physical & online centers, program offerings, and program-wise video access policies
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* COMMON AREA: PROGRAM VIDEO ACCESS & FEE RULES BUTTON */}
          {canWrite && (
            <Button 
              variant="outline" 
              onClick={() => {
                if (programs.length > 0 && !selectedProgramId) {
                  setSelectedProgramId(programs[0].id);
                }
                setProgramRulesModalOpen(true);
              }}
              className="border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 shadow-xs gap-2 font-medium transition-all"
            >
              <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Program Video & Fee Rules
              {configuredProgramsCount > 0 && (
                <Badge className="bg-indigo-600 hover:bg-indigo-600 text-[10px] h-4.5 px-1.5 py-0 font-bold">
                  {configuredProgramsCount} Active
                </Badge>
              )}
            </Button>
          )}

          {canWrite && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm">
                  <Plus className="w-4 h-4 mr-2" />Add Center
                </Button>
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
      </div>

      {/* COMMON AREA SUMMARY BAR */}
      <div className="bg-gradient-to-r from-indigo-50/70 via-blue-50/40 to-slate-50 dark:from-indigo-950/20 dark:via-blue-950/10 dark:to-slate-900/30 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block leading-tight">Total Programs</span>
              <span className="font-bold text-foreground">{programs.length} Offerings</span>
            </div>
          </div>

          <Separator orientation="vertical" className="h-8 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block leading-tight">Daily Viewing Quotas</span>
              <span className="font-bold text-foreground">{programsWithDailyLimit} Programs Restricted</span>
            </div>
          </div>

          <Separator orientation="vertical" className="h-8 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block leading-tight">Fee-Paid Video Locking</span>
              <span className="font-bold text-foreground">{programsWithFeeLock} Programs Gated</span>
            </div>
          </div>
        </div>

        {canWrite && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              if (programs.length > 0 && !selectedProgramId) {
                setSelectedProgramId(programs[0].id);
              }
              setProgramRulesModalOpen(true);
            }}
            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100/50 dark:text-indigo-400 dark:hover:bg-indigo-950/60 font-semibold text-xs gap-1 self-start md:self-auto"
          >
            Configure Rules per Program &rarr;
          </Button>
        )}
      </div>

      {/* CLEAN ACADEMIC CENTERS GRID (NO ACCESS RULES CLUTTER ON CARDS) */}
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
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
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

              {/* Card Footer (Stats & Actions) */}
              <div className="px-6 py-4 bg-muted/10 border-t border-border/50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  {c.programIds ? c.programIds.length : 0} <span className="text-muted-foreground font-normal">Programs</span>
                </div>
                {canWrite && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setActiveCenter(c)} 
                    className="rounded-full text-xs h-8 border-border/60 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                  >
                    Manage Classes
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* COMMON AREA: PROGRAM-WISE VIDEO ACCESS & FEE RULES MODAL */}
      <Dialog open={programRulesModalOpen} onOpenChange={setProgramRulesModalOpen}>
        <DialogContent className="w-[96vw] max-w-6xl lg:max-w-7xl max-h-[92vh] flex flex-col overflow-hidden p-0 border-none shadow-2xl rounded-2xl">
          {/* Modal Header */}
          <DialogHeader className="bg-gradient-to-r from-indigo-600/10 via-blue-600/5 to-purple-600/10 p-6 border-b shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    Program Video Access & Fee Rules
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure daily viewing limits and fee-paid video gating <span className="font-semibold text-foreground">individually per academic program</span>.
                  </p>
                </div>
              </div>

              {activeSelectedProgram && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleApplyToAllPrograms(activeSelectedProgram.id)}
                  className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1.5 self-start sm:self-auto shrink-0"
                  title="Copy current program's rules across all programs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Apply Preset to All Programs
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Modal Body: Master-Detail Layout */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
            {/* Left Column: Programs List & Search */}
            <div className="md:col-span-4 border-r border-border/50 flex flex-col bg-muted/10 overflow-hidden">
              {/* Search & Filter Bar */}
              <div className="p-3.5 border-b border-border/50 space-y-2 bg-background/50 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Search program name or code..."
                    value={searchProgramQuery}
                    onChange={(e) => setSearchProgramQuery(e.target.value)}
                    className="pl-8 text-xs h-8 bg-background"
                  />
                </div>

                <Select value={filterUnivId} onValueChange={setFilterUnivId}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="All Universities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Universities ({universities.length})</SelectItem>
                    {universities.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scrollable Programs List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                {filteredPrograms.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                    <GraduationCap className="w-8 h-8 opacity-40 mx-auto" />
                    <p>No programs match your search or filter</p>
                  </div>
                ) : (
                  filteredPrograms.map((prog) => {
                    const isSelected = prog.id === activeSelectedProgram?.id;
                    const conf = getProgramConfig(prog.id);
                    const univ = universities.find(u => u.id === prog.universityId);

                    return (
                      <button
                        key={prog.id}
                        onClick={() => setSelectedProgramId(prog.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 relative ${
                          isSelected 
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-2xs' 
                            : 'bg-card hover:bg-muted/50 border-border/60'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-indigo-600"></div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-foreground'}`}>
                            {prog.name}
                          </span>
                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-muted-foreground/40'}`} />
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {prog.code && <span className="font-mono bg-muted px-1.5 py-0.2 rounded font-medium">{prog.code}</span>}
                          {univ && <span className="truncate max-w-[130px]">{univ.name}</span>}
                        </div>

                        {/* Status Tags */}
                        <div className="flex flex-wrap items-center gap-1 mt-1 pt-1 border-t border-border/30 text-[10px]">
                          {conf.dailyClassLimitEnabled ? (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300 bg-blue-50/60 font-semibold gap-0.5">
                              <Clock className="w-2.5 h-2.5 text-blue-600" /> {conf.dailyClassLimit}/day
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/60 text-[9px]">No daily limit</span>
                          )}

                          <span className="text-muted-foreground/30">&bull;</span>

                          {conf.feeLocking?.enabled ? (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 bg-emerald-50/60 font-semibold gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> Fee Lock (≥{conf.feeLocking.minPaidPercentage ?? 50}%)
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/60 text-[9px]">Fee lock off</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Active Program Rule Configuration Editor */}
            <div className="md:col-span-8 flex flex-col overflow-y-auto p-6 lg:p-8 space-y-6 custom-scrollbar bg-background">
              {activeSelectedProgram ? (
                <>
                  {/* Selected Program Header */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/50 to-blue-50/30 dark:from-indigo-950/20 dark:to-blue-950/10 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-base font-bold text-foreground">{activeSelectedProgram.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Code: <span className="font-mono font-medium text-foreground">{activeSelectedProgram.code || 'N/A'}</span> &bull; Program ID: <span className="font-mono text-[11px]">{activeSelectedProgram.id.slice(0, 8)}...</span>
                    </p>
                  </div>

                  {/* 1. Daily Class Limit for this Program */}
                  <div className="p-5 rounded-xl border border-border/60 bg-muted/20 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-sm font-semibold">Daily Class Viewing Limit</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Restrict how many video lessons students enrolled in <span className="font-semibold text-foreground">{activeSelectedProgram.name}</span> can view per calendar day.
                        </p>
                      </div>
                      <Switch 
                        checked={activeSelectedConfig.dailyClassLimitEnabled}
                        onCheckedChange={(checked) => {
                          updateProgramConfig(activeSelectedProgram.id, { dailyClassLimitEnabled: checked });
                        }}
                      />
                    </div>

                    {activeSelectedConfig.dailyClassLimitEnabled && (
                      <div className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Classes per Day Quota</Label>
                          <Input 
                            type="number"
                            min={1}
                            max={50}
                            value={activeSelectedConfig.dailyClassLimit}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              updateProgramConfig(activeSelectedProgram.id, { dailyClassLimit: Math.max(1, val) });
                            }}
                            className="bg-background h-9 text-sm"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground bg-background/60 p-3 rounded-lg border border-border/40">
                          <span className="font-semibold text-foreground">Rule:</span> A student in this program can watch up to <span className="font-bold text-indigo-600 dark:text-indigo-400">{activeSelectedConfig.dailyClassLimit}</span> lessons/day. Unlocks reset at 12:00 AM.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Fee-Paid Based Video Locking for this Program */}
                  <div className="p-5 rounded-xl border border-border/60 bg-muted/20 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-sm font-semibold">Fee-Paid Video Locking (Percentage Based)</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Automatically gate video lectures if the student's fee paid percentage (Paid Fee ÷ Total Fee × 100) falls below your required threshold.
                        </p>
                      </div>
                      <Switch 
                        checked={activeSelectedConfig.feeLocking.enabled}
                        onCheckedChange={(checked) => {
                          updateProgramConfig(activeSelectedProgram.id, { 
                            feeLocking: { ...activeSelectedConfig.feeLocking, enabled: checked } 
                          });
                        }}
                      />
                    </div>

                    {activeSelectedConfig.feeLocking.enabled && (
                      <div className="pt-4 border-t border-border/50 space-y-5">
                        {/* Calculation Formula Banner */}
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                            <Info className="w-4 h-4 shrink-0 text-emerald-600" />
                            <span className="font-medium">
                              System Calculation: <span className="font-mono font-bold">(Paid Fee ÷ Total Course Fee) × 100 ≥ Required %</span>
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">Derived from invoices & payment schedules</span>
                        </div>

                        {/* Minimum Fee Paid Percentage Required */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">
                              Minimum Paid Fee Percentage Required (%)
                            </Label>
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {activeSelectedConfig.feeLocking.minPaidPercentage}%
                              </span>
                              <span className="text-xs text-muted-foreground">of total course fee</span>
                            </div>
                          </div>

                          {/* Quick Percentage Presets */}
                          <div className="flex items-center gap-2">
                            {[25, 50, 75, 100].map(pct => {
                              const isSelected = activeSelectedConfig.feeLocking.minPaidPercentage === pct;
                              return (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => {
                                    updateProgramConfig(activeSelectedProgram.id, {
                                      feeLocking: { ...activeSelectedConfig.feeLocking, minPaidPercentage: pct }
                                    });
                                  }}
                                  className={cn(
                                    "px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                                    isSelected
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                                  )}
                                >
                                  {pct === 100 ? '100% (Full Fee)' : `${pct}%`}
                                </button>
                              );
                            })}
                          </div>

                          {/* Interactive Slider */}
                          <div className="pt-2">
                            <Slider
                              value={[activeSelectedConfig.feeLocking.minPaidPercentage]}
                              min={1}
                              max={100}
                              step={1}
                              onValueChange={(val) => {
                                updateProgramConfig(activeSelectedProgram.id, {
                                  feeLocking: { ...activeSelectedConfig.feeLocking, minPaidPercentage: val[0] }
                                });
                              }}
                              className="w-full"
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Students who have paid less than {activeSelectedConfig.feeLocking.minPaidPercentage}% of their total program fees will be gated from accessing video lectures.
                          </p>
                        </div>

                        {/* Grace Period */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">New Enrollment Grace Period (Days)</Label>
                          <Input 
                            type="number"
                            min={0}
                            max={90}
                            value={activeSelectedConfig.feeLocking.gracePeriodDays}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              updateProgramConfig(activeSelectedProgram.id, {
                                feeLocking: { ...activeSelectedConfig.feeLocking, gracePeriodDays: Math.max(0, val) }
                              });
                            }}
                            className="bg-background h-9 text-xs"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Days granted to newly enrolled students before this fee gating rule starts locking video lectures.
                          </p>
                        </div>

                        {/* Custom Notice for Students */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Student Lock Screen Notice</Label>
                            <span className="text-[10px] text-muted-foreground">Supports dynamic placeholders</span>
                          </div>
                          <Textarea 
                            rows={3}
                            value={activeSelectedConfig.feeLocking.lockMessage}
                            onChange={(e) => {
                              updateProgramConfig(activeSelectedProgram.id, {
                                feeLocking: { ...activeSelectedConfig.feeLocking, lockMessage: e.target.value }
                              });
                            }}
                            placeholder="Video lectures are locked because you have paid {paidPercent}% of your total course fee (₹{paidFee} of ₹{totalFee}). A minimum payment of {requiredPercent}% is required to unlock."
                            className="bg-background text-xs resize-none"
                          />

                          {/* Placeholder tags for quick insertion */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="text-muted-foreground text-[10px]">Insert variable:</span>
                            {[
                              { token: '{paidPercent}', label: '% Paid' },
                              { token: '{requiredPercent}', label: '% Required' },
                              { token: '{paidFee}', label: 'Paid Fee (₹)' },
                              { token: '{totalFee}', label: 'Total Fee (₹)' }
                            ].map(({ token, label }) => (
                              <button
                                key={token}
                                type="button"
                                onClick={() => {
                                  const current = activeSelectedConfig.feeLocking.lockMessage || '';
                                  const updated = current + (current.endsWith(' ') || current === '' ? '' : ' ') + token;
                                  updateProgramConfig(activeSelectedProgram.id, {
                                    feeLocking: { ...activeSelectedConfig.feeLocking, lockMessage: updated }
                                  });
                                }}
                                className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-[10px] font-mono border border-border/60 transition-colors"
                                title={`Append ${token} to message`}
                              >
                                + {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Real-time Student Experience Preview Card */}
                        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" /> Student View Preview
                            </span>
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-rose-300 text-rose-600 bg-rose-50 font-semibold">
                              Locked Screen Mockup
                            </Badge>
                          </div>
                          <p className="text-xs text-foreground/90 leading-relaxed italic bg-background/60 p-2.5 rounded-lg border border-border/40">
                            "{(activeSelectedConfig.feeLocking.lockMessage || 'Video lectures are locked because you have paid {paidPercent}% of your total course fee (₹{paidFee} of ₹{totalFee}). A minimum payment of {requiredPercent}% is required to unlock.')
                              .replace(/{paidPercent}/g, '25')
                              .replace(/{requiredPercent}/g, activeSelectedConfig.feeLocking.minPaidPercentage.toString())
                              .replace(/{paidFee}/g, '25,000')
                              .replace(/{totalFee}/g, '1,00,000')}"
                          </p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                              <span>Simulated Student Progress</span>
                              <span className="font-bold text-rose-600">25% / {activeSelectedConfig.feeLocking.minPaidPercentage}% Required</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all" 
                                style={{ width: `${Math.min(100, (25 / activeSelectedConfig.feeLocking.minPaidPercentage) * 100)}%` }} 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-3">
                  <GraduationCap className="w-12 h-12 opacity-30" />
                  <p className="text-sm font-medium">Select a program on the left to configure its access rules</p>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {configuredProgramsCount} of {programs.length} programs configured with custom rules
            </span>
            <div className="flex items-center gap-3 ml-auto">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setProgramRulesModalOpen(false)}
                disabled={savingProgramRules}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleSaveProgramRules}
                disabled={savingProgramRules}
                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md gap-2 px-6"
              >
                {savingProgramRules ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving Rules...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Save Program Rules
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
