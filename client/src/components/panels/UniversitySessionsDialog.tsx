import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, Calendar, Plus, Search, Trash2, Edit, BookOpen, Clock, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { SessionFormDialog } from '../forms/SessionFormDialog';
import { confirmDialog } from '@/lib/confirm';

interface UniversitySessionsDialogProps {
  university: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOrgAdmin?: boolean;
}

export function UniversitySessionsDialog({
  university,
  open,
  onOpenChange,
  isOrgAdmin = true,
}: UniversitySessionsDialogProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any | null>(null);

  useEffect(() => {
    if (open && university?.id) {
      fetchSessions();
      setSearchQuery('');
    } else {
      setSessions([]);
    }
  }, [open, university?.id]);

  const fetchSessions = async () => {
    if (!university?.id) return;
    setLoading(true);
    try {
      const res = await api.get('/operations/sessions', {
        params: { universityId: university.id }
      });
      setSessions(res.data?.data || []);
    } catch (err: any) {
      console.error('Failed to load university sessions:', err);
      toast.error('Failed to load sessions for this university');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, sessionName: string) => {
    if (!(await confirmDialog({ title: 'Delete session?', message: `Are you sure you want to delete session "${sessionName}"?`, confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.delete(`/operations/sessions/${sessionId}`);
      toast.success('Session deleted successfully');
      fetchSessions();
    } catch (err: any) {
      console.error('Failed to delete session:', err);
      toast.error(err?.response?.data?.message || 'Failed to delete session');
    }
  };

  const handleOpenCreate = () => {
    setEditingSession(null);
    setSessionFormOpen(true);
  };

  const handleOpenEdit = (session: any) => {
    setEditingSession(session);
    setSessionFormOpen(true);
  };

  const filteredSessions = sessions.filter((s: any) => {
    const nameMatch = (s.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const progMatch = (s.program?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || progMatch;
  });

  if (!university) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[96vw] sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          {/* Header */}
          <DialogHeader className="px-6 sm:px-8 pt-7 pb-4 flex-shrink-0 space-y-4 text-left">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] flex items-center justify-center shrink-0 overflow-hidden">
                  {university.logo ? (
                    <img
                      src={api.getFileUrl(university.logo)}
                      alt={university.name}
                      className="w-full h-full object-contain bg-white"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-[#256c1d]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-2xl font-semibold tracking-tight text-left">
                      {university.name}
                    </DialogTitle>
                    <Badge variant="outline" className="text-[11px] font-mono rounded-full bg-[#f1f3ef] border-transparent text-slate-600">
                      {university.code}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Admission Sessions created against this university
                  </p>
                </div>
              </div>

              {isOrgAdmin && (
                <Button
                  onClick={handleOpenCreate}
                  className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold gap-1.5 shadow-none shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Create Session
                </Button>
              )}
            </div>

            {/* Search Input */}
            <div>
              <div className="relative">
                <Search className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search session by name or program..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-11 text-sm rounded-full bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
                />
              </div>
            </div>
          </DialogHeader>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 space-y-3 border-t border-slate-100">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-2">
                <Clock className="w-6 h-6 animate-spin text-[#256c1d]" />
                <p className="text-sm">Loading sessions...</p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-300 rounded-3xl bg-white">
                <div className="w-14 h-14 rounded-full bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-base text-slate-800 dark:text-slate-200">
                  {searchQuery ? 'No matching sessions found' : 'No Sessions Created Yet'}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                  {searchQuery
                    ? 'Try searching with a different keyword.'
                    : `There are currently no admission sessions created for ${university.name}. Create one to start accepting student enrollments.`}
                </p>
                {isOrgAdmin && !searchQuery && (
                  <Button
                    onClick={handleOpenCreate}
                    className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold gap-1.5 shadow-none"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Session
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-3xl overflow-hidden bg-[#f4f6f3]/60">
                {filteredSessions.map((session: any) => {
                  const startDateStr = session.startDate
                    ? new Date(session.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'N/A';
                  const endDateStr = session.endDate
                    ? new Date(session.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'N/A';

                  const isApproved = session.status === 'approved' || session.status === 'active';
                  const isPending = session.status === 'pending';

                  return (
                    <div
                      key={session.id}
                      className="px-5 py-4 flex items-center justify-between gap-4 bg-white hover:bg-[#f4f6f3] transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base text-slate-900 dark:text-slate-100">
                            {session.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[11px] px-2.5 py-0 h-6 font-semibold rounded-full border-transparent capitalize ${
                              isApproved
                                ? 'bg-[#e3f7dd] text-[#1f6a17]'
                                : isPending
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {session.status || 'Active'}
                          </Badge>
                          {session.program ? (
                            <Badge variant="secondary" className="text-[11px] gap-1 h-6 px-2.5 rounded-full bg-[#f1f3ef] text-slate-600 border-0">
                              <BookOpen className="w-3 h-3 text-[#256c1d]" />
                              {session.program.name} ({session.program.code})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px] text-slate-500 h-6 px-2.5 rounded-full border-slate-200">
                              University-Wide
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {startDateStr} — {endDateStr}
                          </span>
                          {session.examDate && (
                            <>
                              <span>•</span>
                              <span>Exam: {new Date(session.examDate).toLocaleDateString('en-GB')}</span>
                            </>
                          )}
                          {session.capacity ? (
                            <>
                              <span>•</span>
                              <span>Capacity: {session.capacity}</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {isOrgAdmin && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 rounded-full bg-white border-slate-200 text-slate-600 hover:bg-[#eaf6e6] hover:text-[#256c1d]"
                            onClick={() => handleOpenEdit(session)}
                            title="Edit Session"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 rounded-full bg-white border border-slate-200 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDeleteSession(session.id, session.name)}
                            title="Delete Session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Nested Form for Creating / Editing Session */}
      {isOrgAdmin && (
        <SessionFormDialog
          open={sessionFormOpen}
          onOpenChange={setSessionFormOpen}
          onSuccess={() => {
            fetchSessions();
          }}
          editingSession={editingSession}
          defaultUniversityId={university?.id}
        />
      )}
    </>
  );
}
