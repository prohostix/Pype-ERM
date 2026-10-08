import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Program Allocations</h2>
        <p className="text-muted-foreground text-sm mt-1">Manage which programs each active academic partner can enroll students into.</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedCenter} onValueChange={handleCenterChange}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Select a academic partner" />
          </SelectTrigger>
          <SelectContent>
            {centers.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCenter && (
          <>
            <Button variant="outline" size="sm" onClick={() => fetchAllocations(selectedCenter)} disabled={loading}>
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Add Programs
            </Button>
          </>
        )}
      </div>

      {selectedCenter && (
        loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : allocations.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
            No programs allocated yet.
          </CardContent></Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b mb-4">
              <CardTitle className="text-base">Allocated Programs ({allocations.length})</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Ops User:</Label>
                <Select value={selectedOpsSubAdmin} onValueChange={setSelectedOpsSubAdmin}>
                  <SelectTrigger className="w-[200px] h-8 text-xs">
                    <SelectValue placeholder="Select Ops User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default (Ops Team)</SelectItem>
                    {opsSubAdmins.map(admin => (
                      <SelectItem key={admin.id} value={admin.id}>{admin.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedOpsSubAdmin !== originalOpsSubAdmin && (
                  <Button 
                    size="sm" 
                    className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white" 
                    onClick={handleUpdateSubAdmin}
                    disabled={savingOpsUser}
                  >
                    {savingOpsUser ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              {Object.entries(groupedAllocations).map(([uni, allocs]) => (
                <div key={uni} className="space-y-3">
                  <h3 className="font-semibold text-sm text-primary border-b pb-1">{uni}</h3>
                  <div className="space-y-2">
                    {allocs.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                        <div>
                          <span className="font-medium text-sm">{a.program?.name}</span>
                          <span className="text-muted-foreground text-xs ml-2">({a.program?.code})</span>
                          {a.program?.courseType && (
                            <Badge variant="outline" className="ml-2 text-[10px]">{a.program?.courseType}</Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="text-error hover:text-error" onClick={() => handleRequestRemove(a.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
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
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Allocate Programs</DialogTitle>
            <DialogDescription>
              Select one or more universities to view their programs, then choose which programs to allocate.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-6 py-4 flex-1 overflow-hidden min-h-[300px]">
            <div className="space-y-3 flex flex-col">
              <Label className="text-sm font-semibold">1. Select Universities</Label>
              <ScrollArea className="flex-1 border rounded-md p-4">
                <div className="space-y-4">
                  {universities.map(u => (
                    <div key={u.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`uni-${u.id}`} 
                        checked={selectedUniversities.includes(u.id)}
                        onCheckedChange={() => toggleUniversity(u.id)}
                      />
                      <label htmlFor={`uni-${u.id}`} className="text-sm font-medium leading-none cursor-pointer">
                        {u.name} ({u.code})
                      </label>
                    </div>
                  ))}
                  {universities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No universities found.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
            
            <div className="space-y-3 flex flex-col">
              <Label className="text-sm font-semibold">2. Select Programs</Label>
              <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/10">
                <div className="space-y-4">
                  {availablePrograms.map(p => (
                    <div key={p.id} className="flex items-start space-x-2">
                      <Checkbox 
                        id={`prog-${p.id}`} 
                        checked={selectedPrograms.includes(p.id)}
                        onCheckedChange={() => toggleProgram(p.id)}
                        disabled={allocatedProgramIds.includes(p.id)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor={`prog-${p.id}`} className={cn("text-sm font-medium cursor-pointer", allocatedProgramIds.includes(p.id) && "text-muted-foreground")}>
                          {p.name} {allocatedProgramIds.includes(p.id) && <span className="text-xs font-normal text-muted-foreground ml-1">(Already allocated)</span>}
                        </label>
                        <p className="text-xs text-muted-foreground">Code: {p.code}</p>
                      </div>
                    </div>
                  ))}
                  {selectedUniversities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Select a university first.</p>
                  )}
                  {selectedUniversities.length > 0 && availablePrograms.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No available programs found for selected universities.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAllocate} disabled={submitting || selectedPrograms.length === 0}>
              {submitting ? 'Allocating...' : `Allocate (${selectedPrograms.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteRequestOpen} onOpenChange={setDeleteRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Deletion</DialogTitle>
            <DialogDescription>
              Program allocations can only be removed after manager approval. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Reason for deletion</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-1"
              placeholder="E.g., Assigned by mistake, center no longer supports this program, etc."
              value={deleteRequestReason}
              onChange={e => setDeleteRequestReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRequestOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitDeleteRequest} disabled={!deleteRequestReason.trim() || submittingDelete}>
              {submittingDelete ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
