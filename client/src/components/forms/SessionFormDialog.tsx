import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingSession?: any;
  defaultUniversityId?: string;
}

export function SessionFormDialog({
  open,
  onOpenChange,
  onSuccess,
  editingSession,
  defaultUniversityId
}: SessionFormDialogProps) {
  const { user } = useAuth();
  const isOps = user?.role === 'ops_admin';
  const [departments, setDepartments] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    subDepartmentIds: [] as string[],
    universityId: '',
    startDate: '',
    endDate: '',
    examDate: '',
    status: 'pending'
  });

  useEffect(() => {
    if (open) {
      fetchDepartments();
      fetchUniversities();
      
      if (editingSession) {
        const s = editingSession;
        let sDeptIds: string[] = [];
        if (s.subDepartmentIds && s.subDepartmentIds.length > 0) {
          sDeptIds = s.subDepartmentIds;
        } else if (s.subDepartmentId) {
          const subDeptId = typeof s.subDepartmentId === 'object'
            ? (s.subDepartmentId?.id || s.subDepartmentId?.id)
            : s.subDepartmentId;
          if (subDeptId) {
            sDeptIds = [subDeptId.toString()];
          }
        }
        
        setFormData({
          name: s.name || '',
          subDepartmentIds: sDeptIds,
          universityId: s.universityId || defaultUniversityId || '',
          startDate: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '',
          endDate: s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : '',
          examDate: s.examDate ? new Date(s.examDate).toISOString().split('T')[0] : '',
          status: s.status || 'pending'
        });
      } else {
        resetForm();
      }
    }
  }, [open, editingSession, defaultUniversityId]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/sub-departments');
      const all = res.data.data || [];
      // Filter sub-departments that belong to operations or have type operations
      setDepartments(all.filter((d: any) => d.type === 'operations' || d.parentDept?.type === 'operations'));
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchUniversities = async () => {
    try {
      const res = await api.get('/operations/universities?all=true');
      setUniversities(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch universities:', err);
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      subDepartmentIds: [], 
      universityId: defaultUniversityId || '',
      startDate: '', 
      endDate: '', 
      examDate: '', 
      status: 'pending' 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: formData.name,
        subDepartmentIds: formData.subDepartmentIds,
        subDepartmentId: formData.subDepartmentIds.length > 0 ? formData.subDepartmentIds[0] : null,
        universityId: formData.universityId || null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: isOps ? 'pending' : formData.status
      };
      if (formData.examDate) payload.examDate = formData.examDate;

      if (editingSession) {
        await api.put(`/operations/sessions/${editingSession.id || editingSession.id}`, payload);
      } else {
        await api.post('/operations/sessions', payload);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save session');
    }
  };

  const allSelected = formData.subDepartmentIds.length === departments.length && departments.length > 0;

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetForm(); }}>
      <DialogContent className="w-[95vw] sm:max-w-xl p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col">
        <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
            {editingSession ? <Edit className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
          </div>
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground text-left">{editingSession ? 'Edit Session' : 'Add New Session'}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-left">Set the admission window, exam date and the departments it covers.</DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-6">
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basics</h3>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Session name</Label>
                <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. July 2026 Intake" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">University <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Select value={formData.universityId} onValueChange={v => setFormData({ ...formData, universityId: v === 'none' ? '' : v })}>
                  <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue placeholder="Select university" /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="none">None</SelectItem>
                    {universities.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dates</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Start date</Label>
                  <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">End date</Label>
                  <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Exam date <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" type="date" value={formData.examDate} onChange={(e) => setFormData({ ...formData, examDate: e.target.value })} />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Departments</h3>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, subDepartmentIds: allSelected ? [] : departments.map(d => d.id) })}
                  className="text-xs font-semibold text-[#256c1d] hover:underline"
                >
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {departments.length === 0 && <p className="text-xs text-muted-foreground">No departments available.</p>}
                {departments.map((d) => {
                  const on = formData.subDepartmentIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFormData({
                        ...formData,
                        subDepartmentIds: on ? formData.subDepartmentIds.filter(id => id !== d.id) : [...formData.subDepartmentIds, d.id],
                      })}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${on ? 'bg-[#8ae47e] border-[#8ae47e] text-[#0b1d14]' : 'bg-white border-slate-200 text-slate-600 hover:bg-[#f4f6f3]'}`}
                    >
                      {d.name}{d.parentDept?.name ? ` (${d.parentDept.name})` : ''}
                    </button>
                  );
                })}
              </div>
            </section>

            {!isOps && (
              <section className="space-y-3 pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</h3>
                <div className="flex flex-wrap gap-2">
                  {([['pending', 'Pending'], ['approved', 'Approved'], ['active', 'Active'], ['closed', 'Closed']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      aria-pressed={formData.status === val}
                      onClick={() => setFormData({ ...formData, status: val })}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${formData.status === val ? 'bg-[#0b1d14] border-[#0b1d14] text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-[#f4f6f3]'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
            <Button type="submit" className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
