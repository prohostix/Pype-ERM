import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { SessionFormDialog } from '../forms/SessionFormDialog';

export function AdmissionSessionsPanel() {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin', 'ops_admin', 'ceo'].includes(user?.role || '');
  const isFinance = ['finance_admin', 'finance_sub_admin'].includes(user?.role || '');
  const [sessions, setSessions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);

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

  const handleEdit = (s: any) => {
    setEditingSession(s);
    setDialogOpen(true);
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/operations/sessions/${id}/approve`);
      fetchSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve session');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admission Session Management</h2>
          <p className="text-muted-foreground">Manage admission sessions and cycles</p>
        </div>
        {canWrite && (
          <Button onClick={() => { setEditingSession(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Add Session
          </Button>
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
      
      <SessionFormDialog 
        open={dialogOpen} 
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingSession(null); }}
        onSuccess={fetchSessions}
        editingSession={editingSession}
      />
    </div>
  );
}
