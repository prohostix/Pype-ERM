import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Layers, Building2, GraduationCap, UserCog, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Center { id: string; name: string; code: string; }
interface University { id: string; name: string; code: string; }
interface Program { id: string; name: string; code: string; courseType?: string; universityId: string; university?: University; }
interface Allocation { id: string; programId: string; program: Program; allocatedAt: string; opsSubAdminId?: string; }

export function OpsProgramAllocationPanel() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenter, setSelectedCenter] = useState('');
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  
  const [universities, setUniversities] = useState<University[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [opsSubAdmins, setOpsSubAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Dialog State
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedOpsSubAdmin, setSelectedOpsSubAdmin] = useState<string>('none');
  const [originalOpsSubAdmin, setOriginalOpsSubAdmin] = useState<string>('none');
  
  // Delete Request State
  const [deleteRequestOpen, setDeleteRequestOpen] = useState(false);
  const [deleteRequestAllocId, setDeleteRequestAllocId] = useState<string | null>(null);
  const [deleteRequestReason, setDeleteRequestReason] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/operations/centers?status=active').then(r => setCenters(r.data.data || [])).catch(() => {});
    api.get('/operations/programs').then(r => setPrograms(r.data.data || [])).catch(() => {});
    api.get('/operations/universities?isAcademicPartnerOnly=true').then(r => setUniversities(r.data.data || [])).catch(() => {});
    Promise.all([
      api.get('/users?role=ops_admin'),
      api.get('/users?role=org_admin')
    ]).then(([opsRes, orgRes]) => {
      setOpsSubAdmins([...(opsRes.data.data || []), ...(orgRes.data.data || [])]);
    }).catch(() => {});
  }, []);

  const fetchAllocations = async (centerId: string) => {
    if (!centerId) return;
    setLoading(true);
    try {
      const res = await api.get(`/operations/centers/${centerId}/allocations`);
      const data = res.data.data || [];
      setAllocations(data);
      if (data.length > 0) {
        const adminId = data[0].opsSubAdminId || 'none';
        setSelectedOpsSubAdmin(adminId);
        setOriginalOpsSubAdmin(adminId);
      } else {
        setSelectedOpsSubAdmin('none');
        setOriginalOpsSubAdmin('none');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load allocations');
    } finally {
      setLoading(false);
    }
  };

  const handleCenterChange = (id: string) => {
    setSelectedCenter(id);
    fetchAllocations(id);
  };

  const handleAllocate = async () => {
    if (selectedPrograms.length === 0) { toast.error('Select at least one program'); return; }
    setSubmitting(true);
    try {
      await api.post(`/operations/centers/${selectedCenter}/allocations`, { 
        programIds: selectedPrograms,
        opsSubAdminId: selectedOpsSubAdmin === 'none' ? null : selectedOpsSubAdmin
      });
      toast.success('Programs allocated');
      setOpen(false);
      setSelectedUniversities([]);
      setSelectedPrograms([]);
      fetchAllocations(selectedCenter);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to allocate');
    } finally {
      setSubmitting(false);
    }
  };

  const [savingOpsUser, setSavingOpsUser] = useState(false);

  const handleUpdateSubAdmin = async () => {
    setSavingOpsUser(true);
    try {
      await api.put(`/operations/centers/${selectedCenter}/ops-sub-admin`, { opsSubAdminId: selectedOpsSubAdmin === 'none' ? null : selectedOpsSubAdmin });
      toast.success('Assigned Ops User updated');
      setOriginalOpsSubAdmin(selectedOpsSubAdmin);
    } catch (e: any) {
      toast.error('Failed to update Ops User');
    } finally {
      setSavingOpsUser(false);
    }
  };

  const handleRequestRemove = (allocId: string) => {
    setDeleteRequestAllocId(allocId);
    setDeleteRequestReason('');
    setDeleteRequestOpen(true);
  };

  const submitDeleteRequest = async () => {
    if (!deleteRequestAllocId || !deleteRequestReason.trim()) return;
    setSubmittingDelete(true);
    try {
      await api.post('/edit-delete/request', {
        entityType: 'program_allocation',
        entityId: deleteRequestAllocId,
        requestType: 'delete',
        reason: deleteRequestReason
      });
      toast.success('Delete request submitted for approval');
      setDeleteRequestOpen(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit delete request');
    } finally {
      setSubmittingDelete(false);
    }
  };

  const toggleUniversity = (uId: string) => {
    setSelectedUniversities(prev => 
      prev.includes(uId) ? prev.filter(id => id !== uId) : [...prev, uId]
    );
  };

  const toggleProgram = (pId: string) => {
    setSelectedPrograms(prev => 
      prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
    );
  };

  const allocatedProgramIds = allocations.map(a => a.programId);
  
  // Available programs that belong to the selected universities and are not already allocated
  const availablePrograms = programs.filter(p => 
    selectedUniversities.includes(p.universityId) && !allocatedProgramIds.includes(p.id)
  );

  const groupedAllocations = allocations.reduce((acc, alloc) => {
    const uniName = alloc.program?.university?.name || 'Unknown University';
    if (!acc[uniName]) acc[uniName] = [];
    acc[uniName].push(alloc);
    return acc;
  }, {} as Record<string, Allocation[]>);

  const SEL = 'h-11 rounded-full bg-white border-slate-200 shadow-sm text-sm px-4';
  const ROW = 'flex items-start gap-3 rounded-2xl px-4 py-3 cursor-pointer border transition-colors';
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Program Allocations</h2>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-2xl">Manage which programs each active academic partner can enroll students into.</p>
        </div>
        {selectedCenter && (
          <div className="flex items-center gap-2.5 shrink-0">
            <Button variant="outline" onClick={() => fetchAllocations(selectedCenter)} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 text-sm font-medium gap-2 shadow-sm hover:bg-slate-50">
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />Refresh
            </Button>
            <Button onClick={() => setOpen(true)} className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm">
              <Plus className="w-4 h-4" />Add Programs
            </Button>
          </div>
        )}
      </div>

      {/* Partner selection */}
      <div className="rounded-3xl bg-[#f4f6f3] dark:bg-muted/30 p-5 sm:p-6">
        <label className="text-sm font-semibold mb-2 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-white text-[#256c1d] flex items-center justify-center"><Building2 className="w-4 h-4" /></span>
          Academic partner
        </label>
        <Select value={selectedCenter} onValueChange={handleCenterChange}>
          <SelectTrigger className={`w-full max-w-xl ${SEL}`}>
            <SelectValue placeholder="Select an academic partner" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            {centers.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedCenter && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white dark:bg-card py-14 text-center text-muted-foreground">
          <span className="w-14 h-14 rounded-full bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Layers className="w-6 h-6" /></span>
          <p className="font-medium text-foreground">Select an academic partner</p>
          <p className="text-sm mt-1">Choose a partner above to see and manage its program allocations.</p>
        </div>
      )}

      {selectedCenter && (
        loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-[#f4f6f3] rounded-3xl animate-pulse" />)}</div>
        ) : allocations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white dark:bg-card py-14 text-center text-muted-foreground">
            <span className="w-14 h-14 rounded-full bg-[#f4f6f3] flex items-center justify-center mx-auto mb-3"><Layers className="w-6 h-6" /></span>
            <p className="font-medium text-foreground">No programs allocated yet</p>
            <p className="text-sm mt-1 mb-5">Add programs so this partner can enroll students into them.</p>
            <Button onClick={() => setOpen(true)} className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"><Plus className="w-4 h-4 mr-1.5" />Add Programs</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Ops user assignment */}
            <div className="rounded-3xl bg-white dark:bg-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.10)]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0"><UserCog className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-semibold text-base">Allocated programs <span className="text-muted-foreground font-normal">({allocations.length})</span></h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Applications from this partner are reviewed by the ops user below.</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <Select value={selectedOpsSubAdmin} onValueChange={setSelectedOpsSubAdmin}>
                  <SelectTrigger className={`w-[230px] ${SEL}`}>
                    <SelectValue placeholder="Select Ops User" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="none">Default (Ops Team)</SelectItem>
                    {opsSubAdmins.map(admin => (
                      <SelectItem key={admin.id} value={admin.id}>{admin.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedOpsSubAdmin !== originalOpsSubAdmin && (
                  <Button onClick={handleUpdateSubAdmin} disabled={savingOpsUser} className="h-11 px-6 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                    {savingOpsUser ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </div>
            </div>

            {/* Grouped by university */}
            {Object.entries(groupedAllocations).map(([uni, allocs]) => (
              <div key={uni} className="rounded-3xl bg-white dark:bg-card overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.10)]">
                <div className="flex items-center gap-3 px-5 py-4 bg-[#f4f6f3]">
                  <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center"><GraduationCap className="h-4 w-4 text-[#256c1d]" /></span>
                  <h3 className="text-base font-semibold text-foreground">{uni}</h3>
                  <span className="ml-auto text-xs text-muted-foreground">{allocs.length} program{allocs.length === 1 ? '' : 's'}</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/10">
                  {allocs.map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-[#f4f6f3] transition-colors">
                      <div className="min-w-0 flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-sm">{a.program?.name}</span>
                        <span className="text-[11px] font-mono text-slate-600 bg-[#f1f3ef] px-2.5 py-0.5 rounded-full">{a.program?.code}</span>
                        {a.program?.courseType && (
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#e3f7dd] text-[#1f6a17]">{a.program?.courseType}</span>
                        )}
                      </div>
                      <Button variant="outline" size="icon" onClick={() => handleRequestRemove(a.id)} title="Request removal" className="h-10 w-10 rounded-full bg-white border-slate-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <Dialog open={open} onOpenChange={(val) => { 
        setOpen(val); 
        if (!val) { 
          setSelectedUniversities([]); 
          setSelectedPrograms([]); 
        } else {
          const pIds = allocations.map(a => a.programId);
          const uIds = [...new Set(allocations.map(a => a.program?.universityId).filter(Boolean)) as string[]];
          setSelectedPrograms(pIds);
          setSelectedUniversities(uIds);
        }
      }}>
        <DialogContent className="w-[96vw] sm:max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white flex flex-col" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0"><Layers className="w-5 h-5" /></div>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-left">Allocate Programs</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground text-left">
                Select one or more universities to view their programs, then choose which programs to allocate.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-6 sm:px-8 pb-4 flex-1 overflow-hidden min-h-[320px]">
            <div className="space-y-3 flex flex-col min-h-0">
              <Label className="text-sm font-semibold">1. Universities</Label>
              <ScrollArea className="flex-1 max-h-[44vh] -mr-2 pr-2">
                <div className="space-y-2">
                  {universities.map(u => {
                    const on = selectedUniversities.includes(u.id);
                    return (
                      <label key={u.id} htmlFor={`uni-${u.id}`} className={cn(ROW, 'items-center', on ? 'bg-[#eaf6e6] border-[#54b947]/40' : 'bg-white border-slate-200 hover:bg-[#f4f6f3]')}>
                        <Checkbox id={`uni-${u.id}`} checked={on} onCheckedChange={() => toggleUniversity(u.id)} />
                        <span className="text-sm font-medium flex-1">{u.name}</span>
                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white text-slate-500">{u.code}</span>
                      </label>
                    );
                  })}
                  {universities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No universities found.</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-3 flex flex-col min-h-0">
              <Label className="text-sm font-semibold">2. Programs</Label>
              <ScrollArea className="flex-1 max-h-[44vh] -mr-2 pr-2">
                <div className="space-y-2">
                  {availablePrograms.map(p => {
                    const done = allocatedProgramIds.includes(p.id);
                    const on = selectedPrograms.includes(p.id);
                    return (
                      <label key={p.id} htmlFor={`prog-${p.id}`} className={cn(ROW, done ? 'bg-[#f4f6f3] border-transparent cursor-not-allowed' : on ? 'bg-[#eaf6e6] border-[#54b947]/40' : 'bg-white border-slate-200 hover:bg-[#f4f6f3]')}>
                        <Checkbox id={`prog-${p.id}`} checked={on} onCheckedChange={() => toggleProgram(p.id)} disabled={done} className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-sm font-medium', done && 'text-muted-foreground')}>{p.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Code: {p.code}{done && <span className="ml-2 text-[#256c1d] font-medium">Already allocated</span>}</p>
                        </div>
                      </label>
                    );
                  })}
                  {selectedUniversities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">Select a university first.</p>
                  )}
                  {selectedUniversities.length > 0 && availablePrograms.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No available programs found for selected universities.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
            <Button variant="ghost" onClick={() => setOpen(false)} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
            <Button onClick={handleAllocate} disabled={submitting || selectedPrograms.length === 0} className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
              {submitting ? 'Allocating...' : `Allocate (${selectedPrograms.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteRequestOpen} onOpenChange={setDeleteRequestOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><XCircle className="w-5 h-5" /></div>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-left">Request Deletion</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground text-left">
                Program allocations can only be removed after manager approval. Please provide a reason.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 sm:px-8 pb-5 space-y-1.5">
            <Label className="text-sm font-semibold">Reason for deletion</Label>
            <textarea
              className="flex min-h-[100px] w-full rounded-2xl bg-[#f4f6f3] border border-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:bg-white focus-visible:border-[#54b947] focus-visible:ring-4 focus-visible:ring-[#54b947]/20 resize-none"
              placeholder="E.g., Assigned by mistake, center no longer supports this program, etc."
              value={deleteRequestReason}
              onChange={e => setDeleteRequestReason(e.target.value)}
            />
          </div>
          <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
            <Button variant="ghost" onClick={() => setDeleteRequestOpen(false)} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
            <Button onClick={submitDeleteRequest} disabled={!deleteRequestReason.trim() || submittingDelete} className="h-11 rounded-full px-8 bg-rose-600 hover:bg-rose-700 text-white font-semibold">
              {submittingDelete ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
