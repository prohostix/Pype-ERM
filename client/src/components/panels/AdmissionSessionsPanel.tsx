import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, CalendarCheck, Clock, CheckCircle2, Lock, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { SessionFormDialog } from '../forms/SessionFormDialog';
import { confirmDialog } from '@/lib/confirm';

export function AdmissionSessionsPanel() {
  const { user } = useAuth();
  // The role decides unless an Org Admin has set something for this user (the server enforces it)
  const canWrite = user?.access?.admission_sessions?.delete?.allowed ?? ['org_admin', 'superadmin', 'ops_admin', 'ceo'].includes(user?.role || '');
  const isFinance = user?.access?.admission_sessions?.approve?.allowed ?? ['finance_admin', 'finance_sub_admin'].includes(user?.role || '');
  const [sessions, setSessions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [universityFilter, setUniversityFilter] = useState<string>('all'); // 'all', 'none' (no university) or a university id
  const [loading, setLoading] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'active' | 'closed'>('all');

  useEffect(() => {
    fetchSessions();
    fetchDepartments();
    api.get('/operations/universities?all=true').then(r => setUniversities(r.data.data || [])).catch(() => {});
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
    if (!(await confirmDialog({ title: 'Delete session?', message: 'Delete this session?', confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.delete(`/operations/sessions/${id}`);
      fetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const STATUS_STYLE: Record<string, { pill: string; dot: string }> = {
    active: { pill: 'bg-[#e3f7dd] text-[#1f6a17]', dot: 'bg-[#54b947]' },
    approved: { pill: 'bg-[#eaf6e6] text-[#256c1d]', dot: 'bg-[#54b947]' },
    pending: { pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
    closed: { pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  };
  const allValidSessions = sessions.filter(s => s && s.id);
  const uniIdOf = (s: any): string => {
    const u = s.universityId ?? s.university;
    return (typeof u === 'object' && u ? (u.id || '') : (u || '')).toString();
  };
  const uniName = (id: string) => universities.find((u: any) => u.id === id)?.name || '';
  // Only list universities that have at least one session (plus a "no university" option when needed)
  const universitiesWithSessions = Array.from(new Set(allValidSessions.map(uniIdOf).filter(Boolean)));
  const hasUniversityLess = allValidSessions.some(s => !uniIdOf(s));
  const validSessions = allValidSessions.filter(s =>
    universityFilter === 'all' ? true : universityFilter === 'none' ? !uniIdOf(s) : uniIdOf(s) === universityFilter
  );
  const counts = {
    all: validSessions.length,
    pending: validSessions.filter(s => s.status === 'pending').length,
    approved: validSessions.filter(s => s.status === 'approved').length,
    active: validSessions.filter(s => s.status === 'active').length,
    closed: validSessions.filter(s => s.status === 'closed').length,
  };
  const visible = validSessions.filter(s => statusFilter === 'all' || s.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Admission Sessions</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Manage admission sessions and cycles</p>
        </div>
        {canWrite && (
          <Button onClick={() => { setEditingSession(null); setDialogOpen(true); }} className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm shrink-0 self-start lg:self-auto">
            <Plus className="w-4 h-4" />Add Session
          </Button>
        )}
      </div>

      {/* Summary */}
      {allValidSessions.length > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {[
            { label: 'Total sessions', value: counts.all, icon: CalendarCheck },
            { label: 'Active', value: counts.active, icon: CheckCircle2 },
            { label: 'Pending', value: counts.pending, icon: Clock },
            { label: 'Closed', value: counts.closed, icon: Lock },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="rounded-3xl gap-0">
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="text-3xl font-semibold tracking-tight mt-1">{value}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters: university + status */}
      {allValidSessions.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <Select value={universityFilter} onValueChange={setUniversityFilter}>
            <SelectTrigger className="h-11 w-full lg:w-[280px] rounded-full bg-white border-slate-200 shadow-sm text-sm px-4">
              <SelectValue placeholder="All universities" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl max-h-72">
              <SelectItem value="all">All universities</SelectItem>
              {universitiesWithSessions.map(id => (
                <SelectItem key={id} value={id}>{uniName(id) || 'University'}</SelectItem>
              ))}
              {hasUniversityLess && <SelectItem value="none">No university</SelectItem>}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap items-center gap-2">
            {([
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'approved', label: 'Approved' },
              { id: 'pending', label: 'Pending' },
              { id: 'closed', label: 'Closed' },
            ] as const).map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn('px-4 py-2 rounded-full text-xs font-semibold transition-colors', statusFilter === f.id ? 'bg-[#0b1d14] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}
              >
                {f.label} ({counts[f.id]})
              </button>
            ))}
          </div>

          {universityFilter !== 'all' && (
            <button onClick={() => setUniversityFilter('all')} className="text-xs font-semibold text-rose-600 hover:underline lg:ml-auto">Clear university filter</button>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{[1, 2, 3].map(i => <div key={i} className="h-56 bg-[#f4f6f3] rounded-3xl animate-pulse" />)}</div>
      ) : allValidSessions.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-3xl p-16 text-center bg-white">
          <div className="w-14 h-14 rounded-full bg-[#f4f6f3] flex items-center justify-center mx-auto mb-3"><Calendar className="h-6 w-6 text-muted-foreground" /></div>
          <p className="text-foreground font-medium mb-1">No sessions found</p>
          {canWrite && <p className="text-sm text-muted-foreground">Add a session to start an admission cycle.</p>}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-muted-foreground">{universityFilter !== 'all' ? 'No sessions match this university and status.' : `No ${statusFilter} sessions.`}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 sm:gap-6">
          {visible.map((s) => {
            const sid = s.id;
            const st = STATUS_STYLE[s.status] || STATUS_STYLE.closed;
            const deptIds: string[] = s.subDepartmentIds && s.subDepartmentIds.length > 0 ? s.subDepartmentIds : (s.subDepartmentId ? [s.subDepartmentId] : []);
            const deptList = deptIds.map(did => departments.find((d: any) => d.id === did)).filter(Boolean);
            return (
              <Card key={sid} className="rounded-3xl gap-0 hover:-translate-y-0.5 transition-all duration-300">
                <CardContent className="p-6 flex flex-col gap-5 h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base text-foreground truncate" title={s.name}>{s.name}</h3>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                          <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize', st.pill)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />{s.status}
                          </span>
                          {uniName(uniIdOf(s)) && (
                            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#f1f3ef] text-slate-600 truncate max-w-[180px]" title={uniName(uniIdOf(s))}>{uniName(uniIdOf(s))}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canWrite && (
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => handleEdit(s)} title="Edit session" className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-[#256c1d] hover:bg-[#eaf6e6] transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(sid)} title="Delete session" className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl bg-[#f4f6f3] px-4 py-3">
                      <p className="text-[11px] text-muted-foreground font-medium">Starts</p>
                      <p className="text-sm font-semibold mt-0.5">{fmtDate(s.startDate)}</p>
                    </div>
                    <div className="rounded-2xl bg-[#f4f6f3] px-4 py-3">
                      <p className="text-[11px] text-muted-foreground font-medium">Ends</p>
                      <p className="text-sm font-semibold mt-0.5">{fmtDate(s.endDate)}</p>
                    </div>
                    {s.examDate && (
                      <div className="col-span-2 rounded-2xl bg-[#eaf6e6] px-4 py-3 flex items-center justify-between">
                        <span className="text-[11px] text-[#256c1d] font-medium">Exam date</span>
                        <span className="text-sm font-semibold text-[#1f6a17]">{fmtDate(s.examDate)}</span>
                      </div>
                    )}
                  </div>

                  {deptList.length > 0 && (
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium mb-2 flex items-center gap-1.5"><GraduationCap className="w-3 h-3" />Departments</p>
                      <div className="flex flex-wrap gap-1.5">
                        {deptList.map((d: any) => (
                          <span key={d.id} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600">{d.name}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {isFinance && s.status === 'pending' && (
                    <Button onClick={() => handleApprove(sid)} className="mt-auto h-11 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                      Approve session
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SessionFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingSession(null); }}
        onSuccess={fetchSessions}
        editingSession={editingSession}
      />
    </div>
  );
}
