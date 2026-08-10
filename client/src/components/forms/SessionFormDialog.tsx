import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

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
      const res = await api.get('/operations/universities');
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
      alert(err.response?.data?.message || 'Failed to save session');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetForm(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingSession ? 'Edit Session' : 'Add New Session'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Session Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div>
            <Label>University (Optional)</Label>
            <Select value={formData.universityId} onValueChange={v => setFormData({ ...formData, universityId: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Select university" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {universities.map(u => (
                  <SelectItem key={u.id || u.id} value={(u.id || u.id).toString()}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="block mb-2 font-medium">Departments (Sub-departments)</Label>
            <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
              <div className="flex items-center gap-2 pb-2 border-b">
                <input
                  type="checkbox"
                  id="select-all-departments"
                  checked={formData.subDepartmentIds.length === departments.length && departments.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, subDepartmentIds: departments.map(d => d.id) });
                    } else {
                      setFormData({ ...formData, subDepartmentIds: [] });
                    }
                  }}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="select-all-departments" className="text-sm font-semibold cursor-pointer">
                  Select All Departments
                </label>
              </div>
              {departments.map((d) => (
                <div key={d.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`dept-${d.id}`}
                    checked={formData.subDepartmentIds.includes(d.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const nextIds = checked
                        ? [...formData.subDepartmentIds, d.id]
                        : formData.subDepartmentIds.filter(id => id !== d.id);
                      setFormData({ ...formData, subDepartmentIds: nextIds });
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor={`dept-${d.id}`} className="text-sm cursor-pointer">
                    {d.name} {d.parentDept?.name ? `(${d.parentDept.name})` : ''}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
            </div>
          </div>
          <div>
            <Label>Exam Date (optional)</Label>
            <Input type="date" value={formData.examDate} onChange={(e) => setFormData({ ...formData, examDate: e.target.value })} />
          </div>
          {!isOps && (
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Save</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
