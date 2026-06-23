import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export function AdmissionSessionsPanel() {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin', 'ops_admin', 'ceo'].includes(user?.role || '');
  const isFinance = user?.role === 'finance_admin';
  const isOps = user?.role === 'ops_admin';
  const [sessions, setSessions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subDepartmentIds: [] as string[],
    startDate: '',
    endDate: '',
    examDate: '',
    status: 'pending'
  });

  useEffect(() => {
    fetchSessions();
    fetchDepartments();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operations/sessions');
      setSessions(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: formData.name,
        subDepartmentIds: formData.subDepartmentIds,
        subDepartmentId: formData.subDepartmentIds.length > 0 ? formData.subDepartmentIds[0] : null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: isOps ? 'pending' : formData.status
      };
      if (formData.examDate) payload.examDate = formData.examDate;

      if (editingId) {
        await api.put(`/operations/sessions/${editingId}`, payload);
      } else {
        await api.post('/operations/sessions', payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchSessions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save session');
    }
  };

  const handleEdit = (s: any) => {
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
    setEditingId(s.id || s.id);
    setFormData({
      name: s.name || '',
      subDepartmentIds: sDeptIds,
      startDate: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '',
      endDate: s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : '',
      examDate: s.examDate ? new Date(s.examDate).toISOString().split('T')[0] : '',
      status: s.status || 'pending'
    });
    setDialogOpen(true);
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/operations/sessions/${id}/approve`);
      fetchSessions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve session');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this session?')) return;
    try {
      await api.delete(`/operations/sessions/${id}`);
      fetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', subDepartmentIds: [], startDate: '', endDate: '', examDate: '', status: 'pending' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admission Session Management</h2>
          <p className="text-muted-foreground">Manage admission sessions and cycles</p>
        </div>
        {canWrite && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Session</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Session' : 'Add New Session'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Session Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
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
                <div className="grid grid-cols-2 gap-4">
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
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Admission Sessions</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No sessions found</div>
          ) : (
            <div className="space-y-2">
              {sessions.filter(s => s && (s.id || s.id)).map((s) => {
                const sid = s.id || s.id;
                return (
                  <div key={sid} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {s.startDate && new Date(s.startDate).toLocaleDateString()} – {s.endDate && new Date(s.endDate).toLocaleDateString()}
                        </div>
                        {s.examDate && (
                          <div className="text-xs text-muted-foreground">Exam: {new Date(s.examDate).toLocaleDateString()}</div>
                        )}
                        {s.subDepartmentIds && s.subDepartmentIds.length > 0 ? (
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1 items-center">
                            <span className="font-medium mr-1">Departments:</span>
                            {s.subDepartmentIds.map((did: string) => {
                              const d = departments.find((dept: any) => dept.id === did);
                              return d ? (
                                <Badge key={did} variant="secondary" className="text-[10px] px-1 py-0">
                                  {d.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        ) : s.subDepartmentId ? (
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1 items-center">
                            <span className="font-medium mr-1">Department:</span>
                            {(() => {
                              const d = departments.find((dept: any) => dept.id === s.subDepartmentId);
                              return d ? (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                  {d.name}
                                </Badge>
                              ) : null;
                            })()}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{s.status}</Badge>
                      {isFinance && s.status === 'pending' && (
                        <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleApprove(sid)}>
                          Approve
                        </Button>
                      )}
                      {canWrite && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(sid)}><Trash2 className="w-4 h-4" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
