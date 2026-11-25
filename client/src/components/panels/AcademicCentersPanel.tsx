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
  ChevronRight,
  X
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AcademicClassesPanel } from './AcademicClassesPanel';

import { CS } from '@/lib/currency';
import { mayOn } from '@/lib/access';
export interface ProgramAccessConfig {
  dailyClassLimitEnabled: boolean;
  dailyClassLimit: number;
  /** Next video opens this many days after the previous one was completed. */
  unlockGapEnabled?: boolean;
  unlockGapDays?: number;
  feeLocking: {
    enabled: boolean;
    lockPolicy?: string;
    minPaidPercentage: number;
    lockMessage: string;
    /** Paid X% → can watch the first N videos (videoCount null = all). Empty = single minimum % above. */
    tiers?: { minPaidPercentage: number; videoCount: number | null }[];
  };
}

export const DEFAULT_PROGRAM_CONFIG: ProgramAccessConfig = {
  dailyClassLimitEnabled: false,
  dailyClassLimit: 2,
  unlockGapEnabled: false,
  unlockGapDays: 1,
  feeLocking: {
    enabled: false,
    lockPolicy: 'min_percentage',
    minPaidPercentage: 50,
    lockMessage: 'Video lectures are locked because you have paid {paidPercent}% of your total course fee (₹{paidFee} of ₹{totalFee}). A minimum payment of {requiredPercent}% is required to unlock.'
  }
};

export function AcademicCentersPanel() {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin'].includes(user?.role || '');
  const mayCreate = mayOn(user, 'academic_centers', 'create', canWrite);
  const mayEdit = mayOn(user, 'academic_centers', 'edit', canWrite);
  const mayDelete = mayOn(user, 'academic_centers', 'delete', canWrite);
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
      const onlineConfigs = Object.fromEntries(
        onlinePrograms
          .filter(p => programConfigs[p.id])
          .map(p => [p.id, programConfigs[p.id]])
      );
      if (Object.keys(onlineConfigs).length > 0) {
        await api.put('/academic-centers/program-access-configs', {
          configs: onlineConfigs
        });
      }
      toast.success('Program video access and fee locking rules saved successfully');
      setProgramRulesModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save program rules');
    } finally {
      setSavingProgramRules(false);
    }
  };

  // Copy current program's rules to the other online programs
  const handleApplyToAllPrograms = (sourceProgId: string) => {
    const source = programConfigs[sourceProgId] || DEFAULT_PROGRAM_CONFIG;
    setProgramConfigs(prev => {
      const next = { ...prev };
      onlinePrograms.forEach(p => {
        next[p.id] = JSON.parse(JSON.stringify(source));
      });
      return next;
    });
    toast.success(`Copied configuration across all ${onlinePrograms.length} online programs`);
  };

  // Close without saving: drop unsaved edits by reloading the saved rules
  const handleProgramRulesOpenChange = (open: boolean) => {
    setProgramRulesModalOpen(open);
    if (!open) fetchProgramConfigs();
  };

  // Video and fee rules apply only to programs offered by an online center
  const onlineProgramIds = new Set(
    centers.filter(c => c.type === 'online').flatMap(c => c.programIds || [])
  );
  const onlinePrograms = programs.filter(p => onlineProgramIds.has(p.id));
  const onlineUniversities = universities.filter(u => onlinePrograms.some(p => p.universityId === u.id));

  // Computed summary metrics for common area
  const programsWithDailyLimit = onlinePrograms.filter(p => programConfigs[p.id]?.dailyClassLimitEnabled).length;
  const programsWithFeeLock = onlinePrograms.filter(p => programConfigs[p.id]?.feeLocking?.enabled).length;
  const configuredProgramsCount = onlinePrograms.filter(p => 
    programConfigs[p.id]?.dailyClassLimitEnabled || programConfigs[p.id]?.feeLocking?.enabled
  ).length;

  // Filtered programs for modal
  const filteredPrograms = onlinePrograms.filter(p => {
    const matchesQuery = !searchProgramQuery || 
      p.name?.toLowerCase().includes(searchProgramQuery.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchProgramQuery.toLowerCase());
    const matchesUniv = filterUnivId === 'all' || p.universityId === filterUnivId;
    return matchesQuery && matchesUniv;
  });

  const activeSelectedProgram = onlinePrograms.find(p => p.id === selectedProgramId) || filteredPrograms[0] || null;
  const activeSelectedConfig = activeSelectedProgram ? getProgramConfig(activeSelectedProgram.id) : DEFAULT_PROGRAM_CONFIG;

  if (activeCenter) {
    return <AcademicClassesPanel center={activeCenter} onBack={() => setActiveCenter(null)} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* COMMON TOP HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Academic Centers &amp; Programs</h2>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-2xl">
            Manage physical &amp; online centers, program offerings, and video access rules for online programs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {mayEdit && (
            <Button
              variant="outline"
              onClick={() => {
                if (programs.length > 0 && !selectedProgramId) {
                  setSelectedProgramId(programs[0].id);
                }
                setProgramRulesModalOpen(true);
              }}
              className="h-11 px-5 rounded-full bg-white border-slate-200 text-sm font-medium gap-2 shadow-sm hover:bg-slate-50"
            >
              <ShieldAlert className="w-4 h-4 text-[#256c1d]" />
              Online Program Video &amp; Fee Rules
              {configuredProgramsCount > 0 && (
                <span className="rounded-full bg-[#8ae47e] text-[#0b1d14] text-[11px] font-bold px-2 py-0.5">{configuredProgramsCount} active</span>
              )}
            </Button>
          )}

          {(mayCreate || mayEdit) && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              {mayCreate && (
                <DialogTrigger asChild>
                  <Button className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm">
                    <Plus className="w-4 h-4" />Add Center
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent className="w-[96vw] sm:max-w-3xl max-h-[92vh] flex flex-col overflow-hidden p-0 border-0 rounded-[2rem] bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
                <DialogHeader className="px-6 sm:px-8 pt-7 pb-5 shrink-0 text-left">
                  <DialogTitle className="text-2xl font-semibold tracking-tight flex items-center gap-4 text-left">
                    <span className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center"><Building className="w-5 h-5" /></span>
                    {editingId ? 'Edit Academic Center' : 'Add New Academic Center'}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 border-t border-slate-100 custom-scrollbar">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Information Section */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <span className="w-6 h-[1px] bg-border"></span>
                        Basic Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#f4f6f3] p-5 rounded-3xl">
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-sm font-medium">Center Name <span className="text-rose-500">*</span></Label>
                          <Input 
                            value={formData.name} 
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                            required 
                            className="bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-emerald-500"
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
                            className="bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-emerald-500 resize-none"
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
                                          ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                                          : 'hover:bg-muted'
                                      } ${isOriginal ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                      <Checkbox 
                                        id={`prog-${program.id}`}
                                        checked={formData.programIds.includes(program.id)}
                                        onCheckedChange={() => toggleProgram(program.id)}
                                        disabled={isOriginal}
                                        className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
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
                      <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
                      <Button type="submit" className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
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

      {/* COMMON AREA SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {[
          { icon: GraduationCap, label: 'Online programs', value: `${onlinePrograms.length}`, hint: 'offerings' },
          { icon: Clock, label: 'Daily viewing quotas', value: `${programsWithDailyLimit}`, hint: 'programs restricted' },
          { icon: ShieldCheck, label: 'Fee-paid video locking', value: `${programsWithFeeLock}`, hint: 'programs gated' },
        ].map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="rounded-3xl bg-card p-6 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.10)]">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="text-3xl font-semibold tracking-tight mt-1">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></div>
          </div>
        ))}
      </div>
      {mayEdit && (
        <div className="flex justify-end -mt-2">
          <button
            onClick={() => {
              if (programs.length > 0 && !selectedProgramId) setSelectedProgramId(programs[0].id);
              setProgramRulesModalOpen(true);
            }}
            className="text-xs font-semibold text-[#256c1d] hover:underline"
          >
            Configure rules per program &rarr;
          </button>
        </div>
      )}

      {/* CLEAN ACADEMIC CENTERS GRID (NO ACCESS RULES CLUTTER ON CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 sm:gap-6">
        {loading ? (
          <div className="col-span-full flex flex-col justify-center items-center py-20 text-muted-foreground bg-card rounded-3xl">
            <div className="w-10 h-10 border-4 border-[#54b947] border-t-transparent rounded-full animate-spin mb-4"></div>
            Loading academic centers...
          </div>
        ) : centers.length === 0 ? (
          <div className="col-span-full flex flex-col justify-center items-center py-20 bg-white dark:bg-card rounded-3xl border border-dashed border-slate-300">
            <div className="w-14 h-14 rounded-full bg-[#eaf6e6] flex items-center justify-center mb-4">
              <Building className="w-6 h-6 text-[#256c1d]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Centers Found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              You haven't added any academic centers yet. Create your first center to start assigning programs.
            </p>
            {mayCreate && (
              <Button onClick={() => setDialogOpen(true)} className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold shadow-none">
                <Plus className="w-4 h-4 mr-2" /> Add Your First Center
              </Button>
            )}
          </div>
        ) : (
          centers.map((c) => (
            <div
              key={c.id}
              className="group bg-card rounded-3xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.10)]"
            >
              <div className="p-6 pb-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                      <Building className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold line-clamp-1" title={c.name}>{c.name}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${c.status === 'active' ? 'bg-[#e3f7dd] text-[#1f6a17]' : 'bg-slate-100 text-slate-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-[#54b947]' : 'bg-slate-400'}`} />{c.status}
                        </span>
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full capitalize bg-[#f1f3ef] text-slate-600">{c.type}</span>
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
                            <Edit className="w-4 h-4" /> Edit Center
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

              <div className="px-6 pb-5 flex-1">
                <div className="flex items-start gap-3 text-sm text-muted-foreground bg-[#f4f6f3] dark:bg-muted/30 px-4 py-3 rounded-2xl">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[#256c1d]" />
                  <span className="line-clamp-2 leading-relaxed">
                    {c.address || 'No physical address provided (Virtual / Online Center)'}
                  </span>
                </div>
              </div>

              <div className="px-6 pb-6 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                  <span className="w-9 h-9 rounded-full bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center"><Layers className="w-4 h-4" /></span>
                  {c.programIds ? c.programIds.length : 0} <span className="text-muted-foreground font-normal">Programs</span>
                </div>
                {mayEdit && (
                  <Button
                    variant="outline"
                    onClick={() => setActiveCenter(c)}
                    className="h-10 px-5 rounded-full bg-white border-slate-200 text-sm font-semibold hover:bg-[#eaf6e6] hover:text-[#256c1d]"
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
      <Dialog open={programRulesModalOpen} onOpenChange={handleProgramRulesOpenChange}>
        <DialogContent className="w-[96vw] max-w-6xl lg:max-w-7xl max-h-[92vh] flex flex-col overflow-hidden p-0 border-none shadow-2xl rounded-2xl">
          {/* Modal Header */}
          <DialogHeader className="px-6 sm:px-8 pt-6 pb-5 border-b border-slate-100 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-green-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    Online Program Video Access & Fee Rules
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure daily viewing limits and fee-paid video gating <span className="font-semibold text-foreground">individually for each program offered by an online center</span>. Offline centers are not affected.
                  </p>
                </div>
              </div>

              {activeSelectedProgram && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleApplyToAllPrograms(activeSelectedProgram.id)}
                  className="text-xs border-green-200 text-green-700 hover:bg-green-50 gap-1.5 self-start sm:self-auto shrink-0"
                  title="Copy current program's rules across all online programs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Apply Preset to All Online Programs
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
                    <SelectItem value="all">All Universities ({onlineUniversities.length})</SelectItem>
                    {onlineUniversities.map(u => (
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
                    <p>
                      {onlinePrograms.length === 0
                        ? 'No online programs yet. Assign programs to an online center to configure their rules.'
                        : 'No programs match your search or filter'}
                    </p>
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
                            ? 'bg-green-50/80 dark:bg-green-950/40 border-green-300 dark:border-green-800 shadow-2xs' 
                            : 'bg-card hover:bg-muted/50 border-border/60'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-green-600"></div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-green-900 dark:text-green-200' : 'text-foreground'}`}>
                            {prog.name}
                          </span>
                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? 'text-green-600 translate-x-0.5' : 'text-muted-foreground/40'}`} />
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {prog.code && <span className="font-mono bg-muted px-1.5 py-0.2 rounded font-medium">{prog.code}</span>}
                          {univ && <span className="truncate max-w-[130px]">{univ.name}</span>}
                        </div>

                        {/* Status Tags */}
                        <div className="flex flex-wrap items-center gap-1 mt-1 pt-1 border-t border-border/30 text-[10px]">
                          {conf.dailyClassLimitEnabled ? (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 bg-emerald-50/60 font-semibold gap-0.5">
                              <Clock className="w-2.5 h-2.5 text-emerald-600" /> {conf.dailyClassLimit}/day
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
                  <div className="p-4 rounded-2xl bg-[#eaf6e6] space-y-1">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-green-600" />
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
                          <Clock className="w-4 h-4 text-green-600" />
                          <h4 className="text-sm font-semibold">Daily Class Viewing Limit</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Restrict how many different video lessons students enrolled in <span className="font-semibold text-foreground">{activeSelectedProgram.name}</span> can view per calendar day.
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
                          <span className="font-semibold text-foreground">Rule:</span> A student in this program can watch up to <span className="font-bold text-green-600 dark:text-green-400">{activeSelectedConfig.dailyClassLimit}</span> different lessons/day, including lessons they rewatch. Unlocks reset at 12:00 AM IST.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Unlock gap: the next video opens N days after the previous one is completed */}
                  <div className="p-5 rounded-xl border border-border/60 bg-muted/20 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-lime-600" />
                          <h4 className="text-sm font-semibold">Next Video Unlock Gap</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Open each video a set number of days after the student completed the previous one, for <span className="font-semibold text-foreground">{activeSelectedProgram.name}</span>.
                        </p>
                      </div>
                      <Switch
                        checked={!!activeSelectedConfig.unlockGapEnabled}
                        onCheckedChange={(checked) => updateProgramConfig(activeSelectedProgram.id, { unlockGapEnabled: checked })}
                      />
                    </div>

                    {activeSelectedConfig.unlockGapEnabled && (
                      <div className="pt-3 border-t border-border/50 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Days between videos</Label>
                            <Input
                              type="number"
                              min={1}
                              max={365}
                              value={activeSelectedConfig.unlockGapDays ?? 1}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                updateProgramConfig(activeSelectedProgram.id, { unlockGapDays: Math.min(365, Math.max(1, val)) });
                              }}
                              className="bg-background h-9 text-sm"
                            />
                          </div>
                          <div className="text-xs text-muted-foreground bg-background/60 p-3 rounded-lg border border-border/40">
                            <span className="font-semibold text-foreground">Rule:</span> a video opens at 12:00 AM IST, <span className="font-bold text-lime-600 dark:text-lime-400">{activeSelectedConfig.unlockGapDays ?? 1}</span> day(s) after the day the previous video was completed. Videos must be taken in course order.
                          </div>
                        </div>
                        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 leading-relaxed">
                          Applies to every student in this program straight away. Videos a student has already started or completed stay open; only videos they have not started wait for the gap.
                          {activeSelectedConfig.dailyClassLimitEnabled && (activeSelectedConfig.unlockGapDays ?? 1) >= 1 && activeSelectedConfig.dailyClassLimit > 1
                            ? ' The daily limit is higher than one class a day, but the gap allows only one new video per gap, so the gap decides.' : ''}
                          {' '}Use "Unlock Next Video" in Student Portal Management to skip the wait for one student.
                        </p>
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

                        {/* Videos unlocked by payment (tiers) */}
                        {(() => {
                          const tiers = activeSelectedConfig.feeLocking.tiers || [];
                          const setTiers = (next: { minPaidPercentage: number; videoCount: number | null }[]) =>
                            updateProgramConfig(activeSelectedProgram.id, {
                              feeLocking: { ...activeSelectedConfig.feeLocking, tiers: next }
                            });
                          const patchTier = (i: number, patch: Partial<{ minPaidPercentage: number; videoCount: number | null }>) =>
                            setTiers(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
                          return (
                            <div className="space-y-3 p-3.5 rounded-xl border border-border/60 bg-muted/20">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <Label className="text-xs font-semibold">Unlock videos by payment</Label>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Set how many videos a student can watch at each payment level. Videos open in course order. When steps are set, they replace the single minimum above.
                                  </p>
                                </div>
                                {tiers.length === 0 ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs shrink-0"
                                    onClick={() => setTiers([
                                      { minPaidPercentage: 25, videoCount: 10 },
                                      { minPaidPercentage: 50, videoCount: 30 },
                                      { minPaidPercentage: 100, videoCount: null },
                                    ])}
                                  >
                                    Set up steps
                                  </Button>
                                ) : (
                                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs shrink-0 text-muted-foreground" onClick={() => setTiers([])}>
                                    Remove steps
                                  </Button>
                                )}
                              </div>

                              {tiers.length > 0 && (
                                <div className="space-y-2">
                                  {tiers.map((t, i) => (
                                    <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                                      <span className="text-muted-foreground">Paid at least</span>
                                      <Input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={t.minPaidPercentage}
                                        onChange={(e) => patchTier(i, { minPaidPercentage: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) })}
                                        className="h-8 w-16 text-xs bg-background"
                                      />
                                      <span className="text-muted-foreground">% →</span>
                                      {t.videoCount === null ? (
                                        <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold">All videos</span>
                                      ) : (
                                        <>
                                          <Input
                                            type="number"
                                            min={0}
                                            value={t.videoCount}
                                            onChange={(e) => patchTier(i, { videoCount: Math.max(0, parseInt(e.target.value) || 0) })}
                                            className="h-8 w-20 text-xs bg-background"
                                          />
                                          <span className="text-muted-foreground">videos</span>
                                        </>
                                      )}
                                      <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer ml-1">
                                        <Checkbox
                                          checked={t.videoCount === null}
                                          onCheckedChange={(c) => patchTier(i, { videoCount: c ? null : 10 })}
                                        />
                                        All
                                      </label>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 ml-auto text-muted-foreground"
                                        onClick={() => setTiers(tiers.filter((_, idx) => idx !== i))}
                                        aria-label="Remove step"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => setTiers([...tiers, { minPaidPercentage: Math.min(100, (tiers[tiers.length - 1]?.minPaidPercentage || 0) + 25), videoCount: 10 }])}
                                  >
                                    + Add step
                                  </Button>
                                  <p className="text-[11px] text-muted-foreground">
                                    Below the lowest step, no videos are open. You can use {'{videoCount}'} in the notice below.
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}

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
                              { token: '{paidFee}', label: `Paid Fee (${CS()})` },
                              { token: '{totalFee}', label: `Total Fee (${CS()})` }
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
                  <p className="text-sm font-medium">
                    {onlinePrograms.length === 0
                      ? 'These rules apply to programs offered by an online center'
                      : 'Select a program on the left to configure its access rules'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {configuredProgramsCount} of {onlinePrograms.length} online programs configured with custom rules
            </span>
            <div className="flex items-center gap-3 ml-auto">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => handleProgramRulesOpenChange(false)}
                disabled={savingProgramRules}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleSaveProgramRules}
                disabled={savingProgramRules}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-full h-11 font-semibold gap-2 px-6"
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
