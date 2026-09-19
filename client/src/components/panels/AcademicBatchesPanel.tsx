import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ArrowLeft, MoreVertical, CalendarDays, Users, ArrowRightLeft, History, Clock, GraduationCap, Sparkles, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function AcademicBatchesPanel({ academicClass, onBack }: { academicClass: any; onBack: () => void }) {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin'].includes(user?.role || '');
  const isPrincipal = user?.role === 'faculty' && user?.id === academicClass?.inchargeId;
  const canAllocate = isPrincipal;
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Allocation States
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [activeBatch, setActiveBatch] = useState<any | null>(null);
  const [unallocatedStudents, setUnallocatedStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferStudent, setTransferStudent] = useState<any | null>(null);
  const [transferToBatchId, setTransferToBatchId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [transferHistory, setTransferHistory] = useState<any[]>([]);
  const [enrolledSearchQuery, setEnrolledSearchQuery] = useState('');
  const [batchStats, setBatchStats] = useState<any>({ currentCount: 0, remainingSlots: null, capacity: null });
  const [allocating, setAllocating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    capacity: '',
    status: 'active'
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/academic-batches/class/${academicClass.id}`);
      setBatches(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch academic batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', startDate: '', endDate: '', capacity: '', status: 'active' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        academicClassId: academicClass.id
      };
      
      if (editingId) {
        await api.put(`/academic-batches/${editingId}`, payload);
        toast.success('Academic batch updated successfully');
      } else {
        await api.post('/academic-batches', payload);
        toast.success('Academic batch created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save academic batch');
    }
  };

  const handleEdit = (b: any) => {
    setEditingId(b.id);
    setFormData({
      name: b.name || '',
      startDate: b.startDate ? new Date(b.startDate).toISOString().split('T')[0] : '',
      endDate: b.endDate ? new Date(b.endDate).toISOString().split('T')[0] : '',
      capacity: b.capacity ? b.capacity.toString() : '',
      status: b.status || 'active'
    });
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
      const res = await api.delete(`/academic-batches/${deleteId}`, { data: { reason: deleteReason } });
      if (res.status === 202) {
        toast.success('Delete request sent to CEO for approval');
      } else {
        toast.success('Academic batch deleted successfully');
      }
      setDeleteDialogOpen(false);
      setDeleteId(null);
      setDeleteReason('');
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete academic batch');
    }
  };

  
  const handleTransfer = async () => {
    if (!transferToBatchId) return toast.error('Please select a destination batch');
    try {
      await api.post(`/academic-batches/${activeBatch.id}/transfer`, {
        studentId: transferStudent.id,
        toBatchId: transferToBatchId,
        reason: transferReason
      });
      toast.success('Student transferred successfully');
      setTransferDialogOpen(false);
      setTransferStudent(null);
      setTransferToBatchId('');
      setTransferReason('');
      fetchBatches();
      // Refresh allocation dialog stats if still open
      const statsRes = await api.get(`/academic-batches/${activeBatch.id}/students`);
      setBatchStats(statsRes.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to transfer student');
    }
  };

  const openHistoryModal = async () => {
    setHistoryDialogOpen(true);
    try {
      const res = await api.get(`/academic-classes/${academicClass.id}/transfer-history`);
      setTransferHistory(res.data.data);
    } catch (err: any) {
      toast.error('Failed to load transfer history');
    }
  };

// Allocation Handlers
  const openAllocationDialog = async (batch: any) => {
    setActiveBatch(batch);
    setSelectedStudentIds([]);
    setAllocateDialogOpen(true);
    
    try {
      // Fetch stats
      const statsRes = await api.get(`/academic-batches/${batch.id}/students`);
      setBatchStats(statsRes.data.data);
      
      // Fetch unallocated students
      const unallocatedRes = await api.get(`/academic-batches/${batch.id}/unallocated`);
      setUnallocatedStudents(unallocatedRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load allocation data');
    }
  };

  const handleSmartAllocate = async () => {
    if (!activeBatch) return;
    setAllocating(true);
    try {
      const res = await api.post(`/academic-batches/${activeBatch.id}/smart-allocate`);
      toast.success(res.data.message || 'Smart allocation successful');
      setAllocateDialogOpen(false);
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Smart allocation failed');
    } finally {
      setAllocating(false);
    }
  };

  const handleManualAllocate = async () => {
    if (!activeBatch || selectedStudentIds.length === 0) return;
    setAllocating(true);
    try {
      const res = await api.post(`/academic-batches/${activeBatch.id}/manual-allocate`, { studentIds: selectedStudentIds });
      toast.success(res.data.message || 'Manual allocation successful');
      setAllocateDialogOpen(false);
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Manual allocation failed');
    } finally {
      setAllocating(false);
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

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
              <Badge variant="outline" className="text-xs uppercase bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
                Inside Class
              </Badge>
              <h2 className="text-2xl font-bold">{academicClass.name}</h2>
            </div>
            <p className="text-sm text-muted-foreground pl-1 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Manage Student Batches
            </p>
          </div>
        </div>
        
        {isPrincipal && (
          <div className="flex gap-2">
            <Button onClick={openHistoryModal} variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
              <History className="w-4 h-4 mr-2" /> Transfer History
            </Button>
          </div>
        )}
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex flex-col justify-center items-center py-20 text-muted-foreground bg-card rounded-xl border border-border/50 shadow-sm">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            Loading academic batches...
          </div>
        ) : batches.length === 0 ? (
          <div className="col-span-full flex flex-col justify-center items-center py-20 bg-card rounded-xl border border-border/50 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8 text-teal-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Batches Found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              There are no batches created for this class yet.
            </p>
            {canWrite && (
              <Button onClick={() => setDialogOpen(true)} variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
                <Plus className="w-4 h-4 mr-2" /> Create First Batch
              </Button>
            )}
          </div>
        ) : (
          batches.map((b) => (
            <div 
              key={b.id} 
              className="group bg-card rounded-xl border border-border/60 shadow-sm hover:shadow-md hover:border-teal-500/30 transition-all duration-300 overflow-hidden flex flex-col"
            >
              <div className="relative p-5 border-b border-border/50 bg-gradient-to-br from-teal-50/50 to-transparent dark:from-teal-950/20">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold line-clamp-1 flex-1 pr-2">{b.name}</h3>
                  {(canWrite || canAllocate) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl">
                        {canWrite && (
                          <DropdownMenuItem onClick={() => handleEdit(b)} className="cursor-pointer gap-2">
                            <Edit className="w-4 h-4" /> Edit Batch
                          </DropdownMenuItem>
                        )}
                        {canAllocate && (
                          <DropdownMenuItem onClick={() => openAllocationDialog(b)} className="cursor-pointer gap-2">
                            <Users className="w-4 h-4" /> Allocate Students
                          </DropdownMenuItem>
                        )}
                        {canWrite && (
                          <DropdownMenuItem onClick={() => handleDeleteClick(b.id)} className="cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-600 gap-2">
                            <Trash2 className="w-4 h-4" /> Request Deletion
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <Badge variant={b.status === 'active' ? 'default' : 'secondary'} className="mt-2 text-[10px] uppercase tracking-wider px-2 py-0.5">
                  {b.status}
                </Badge>
              </div>
              <div className="p-5 flex-1 bg-muted/10 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="w-4 h-4" /> Start
                  </div>
                  <span className="font-medium">{b.startDate ? new Date(b.startDate).toLocaleDateString() : 'TBD'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="w-4 h-4" /> End
                  </div>
                  <span className="font-medium">{b.endDate ? new Date(b.endDate).toLocaleDateString() : 'TBD'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" /> Capacity
                  </div>
                  <span className="font-medium">{b.capacity ? b.capacity + ' Students' : 'Unlimited'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                    <CheckSquare className="w-4 h-4" /> Allocated
                  </div>
                  <span className="font-medium text-teal-700 dark:text-teal-300">{b._count?.students || 0} Students</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Sparkles className="w-4 h-4" /> Available Space
                  </div>
                  <span className="font-medium text-blue-700 dark:text-blue-300">{b.capacity ? Math.max(0, b.capacity - (b._count?.students || 0)) + ' Slots' : 'Unlimited'}</span>
                </div>
              </div>
              {canAllocate && (
                <div className="p-4 border-t border-border/50 bg-card">
                  <Button onClick={() => openAllocationDialog(b)} variant="outline" className="w-full rounded-xl border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:hover:bg-teal-900/30">
                    <Users className="w-4 h-4 mr-2" /> Allocate Students
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Allocate Students Modal */}
      <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
        <DialogContent className="sm:max-w-2xl border-none shadow-2xl rounded-xl p-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-r from-teal-600/10 to-emerald-600/5 p-6 border-b shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              Allocate Students to {activeBatch?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/30 p-4 rounded-xl text-center border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Capacity</p>
                <p className="text-2xl font-bold">{batchStats.capacity || '∞'}</p>
              </div>
              <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-xl text-center border border-teal-100 dark:border-teal-800">
                <p className="text-xs text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-1">Currently Enrolled</p>
                <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{batchStats.currentCount}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center border border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Slots Available</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{batchStats.remainingSlots ?? '∞'}</p>
              </div>
            </div>

            <Tabs defaultValue="enrolled" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 p-1 bg-muted/50 rounded-xl">
                <TabsTrigger value="enrolled" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-teal-600 data-[state=active]:shadow-sm">
                  <GraduationCap className="w-4 h-4 mr-2" /> Enrolled Students
                </TabsTrigger>
                <TabsTrigger value="smart" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-teal-600 data-[state=active]:shadow-sm">
                  <Sparkles className="w-4 h-4 mr-2" /> Smart Allocation
                </TabsTrigger>
                <TabsTrigger value="manual" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-teal-600 data-[state=active]:shadow-sm">
                  <CheckSquare className="w-4 h-4 mr-2" /> Manual Selection
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="enrolled" className="space-y-4 animate-in fade-in duration-300">
                <div className="border border-border/60 rounded-xl overflow-hidden">
                  <div className="bg-muted/30 p-3 border-b border-border/50 flex justify-between items-center flex-wrap gap-2">
                    <span className="text-sm font-medium">Currently Enrolled in Batch</span>
                    <div className="flex items-center gap-3">
                      <Input 
                        placeholder="Search students..." 
                        value={enrolledSearchQuery}
                        onChange={(e) => setEnrolledSearchQuery(e.target.value)}
                        className="h-8 w-48 text-xs"
                      />
                      <Badge variant="secondary">{batchStats.students?.length || 0} Enrolled</Badge>
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {!batchStats.students || batchStats.students.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No students are currently allocated to this batch.
                      </div>
                    ) : (
                      batchStats.students
                        .filter((student: any) => 
                          (student.name?.toLowerCase() || '').includes(enrolledSearchQuery.toLowerCase()) ||
                          (student.enrollmentNo?.toLowerCase() || '').includes(enrolledSearchQuery.toLowerCase())
                        )
                        .map((student: any) => (
                        <div 
                          key={student.id} 
                          className="flex items-center space-x-3 p-3 rounded-lg border border-transparent hover:bg-muted/50 transition-all"
                        >
                          <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {student.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{student.name}</p>
                            <p className="text-xs text-muted-foreground">ID: {student.enrollmentNo || 'N/A'}</p>
                          </div>
                          {canAllocate && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-xs shrink-0" 
                              onClick={() => {
                                setTransferStudent(student);
                                setTransferDialogOpen(true);
                              }}
                            >
                              <ArrowRightLeft className="w-3 h-3 mr-1" /> Transfer
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="smart" className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-teal-50/50 dark:bg-teal-950/20 p-6 rounded-xl border border-teal-100/50 dark:border-teal-900/50 text-center space-y-4">
                  <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Sparkles className="w-8 h-8 text-teal-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-teal-900 dark:text-teal-100">Auto-fill Batch</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                      Automatically assigns up to <strong>{batchStats.remainingSlots ?? 'all'}</strong> unallocated students from this center into this batch.
                    </p>
                  </div>
                  <div className="text-sm font-medium text-teal-600 bg-white dark:bg-slate-900 py-2 px-4 rounded-full inline-block shadow-sm">
                    {unallocatedStudents.length} eligible students found
                  </div>
                  <div className="pt-4">
                    <Button 
                      onClick={handleSmartAllocate} 
                      disabled={allocating || unallocatedStudents.length === 0 || batchStats.remainingSlots === 0}
                      className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-md min-w-[200px]"
                    >
                      {allocating ? 'Allocating...' : 'Smart Allocate Now'}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="manual" className="space-y-4 animate-in fade-in duration-300">
                <div className="border border-border/60 rounded-xl overflow-hidden">
                  <div className="bg-muted/30 p-3 border-b border-border/50 flex justify-between items-center">
                    <span className="text-sm font-medium">Select Students</span>
                    <Badge variant="secondary">{selectedStudentIds.length} Selected</Badge>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {unallocatedStudents.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No unallocated students available for this center/program.
                      </div>
                    ) : (
                      unallocatedStudents.map(student => (
                        <label 
                          key={student.id} 
                          className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                            selectedStudentIds.includes(student.id) 
                              ? 'bg-teal-50 dark:bg-teal-900/20' 
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox 
                            checked={selectedStudentIds.includes(student.id)}
                            onCheckedChange={() => toggleStudentSelection(student.id)}
                            className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                          />
                          <div>
                            <p className="text-sm font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">ID: {student.enrollmentNo || 'N/A'}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={handleManualAllocate}
                    disabled={allocating || selectedStudentIds.length === 0 || (batchStats.remainingSlots !== null && selectedStudentIds.length > batchStats.remainingSlots)}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {allocating ? 'Allocating...' : `Allocate ${selectedStudentIds.length} Students`}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Modal */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-xl p-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-r from-teal-600/10 to-emerald-600/5 p-6 border-b shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-teal-600" />
              {editingId ? 'Edit Academic Batch' : 'Create Academic Batch'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Batch Name <span className="text-rose-500">*</span></Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                  placeholder="e.g. Morning Batch"
                  className="bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Start Date</Label>
                  <Input 
                    type="date"
                    value={formData.startDate} 
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} 
                    className="bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-teal-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">End Date</Label>
                  <Input 
                    type="date"
                    value={formData.endDate} 
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} 
                    className="bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-teal-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Capacity (Optional)</Label>
                  <Input 
                    type="number"
                    min="1"
                    value={formData.capacity} 
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} 
                    placeholder="e.g. 50"
                    className="bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-teal-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger className="bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-teal-500"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3 pt-4 justify-end border-t border-border/50 mt-4">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md">
                  {editingId ? 'Save Changes' : 'Create Batch'}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Reason Modal */}
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
                placeholder="Please explain why this batch needs to be deleted..."
                className="resize-none h-24 focus-visible:ring-rose-500"
                required
              />
              <p className="text-xs text-muted-foreground">
                Deletions require executive approval.
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

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Student</Label>
              <div className="font-medium p-2 bg-muted/50 rounded-md mt-1">{transferStudent?.name} ({transferStudent?.enrollmentNo})</div>
            </div>
            <div>
              <Label>Destination Batch</Label>
              <Select value={transferToBatchId} onValueChange={setTransferToBatchId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select target batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.filter(b => b.id !== activeBatch?.id).map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name} (Capacity: {b.capacity ? b.capacity : 'Unlimited'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason (Optional)</Label>
              <Input value={transferReason} onChange={e => setTransferReason(e.target.value)} placeholder="Reason for transfer" className="mt-1" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleTransfer}>Confirm Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2"><History className="w-5 h-5 text-teal-600" /> Transfer & Allocation History</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto p-2 flex-1 custom-scrollbar">
            {transferHistory.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">No transfers or allocations have occurred in this class yet.</div>
            ) : (
              <div className="space-y-4">
                {transferHistory.map((log: any) => (
                  <div key={log.id} className="border border-border/50 bg-muted/20 p-4 rounded-xl flex items-start gap-4">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm shrink-0">
                      <Clock className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 text-sm">
                      {log.fromBatch ? (
                        <p><strong>{log.student?.name}</strong> was transferred from <strong>{log.fromBatch?.name}</strong> to <strong>{log.toBatch?.name}</strong>.</p>
                      ) : (
                        <p><strong>{log.student?.name}</strong> was allocated to <strong>{log.toBatch?.name}</strong>.</p>
                      )}
                      {log.reason && <p className="text-muted-foreground italic mt-1">"{log.reason}"</p>}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>By {log.transferredBy?.name}</span>
                        <span>•</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
