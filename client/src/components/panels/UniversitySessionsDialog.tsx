import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, Calendar, Plus, Search, Trash2, Edit, BookOpen, Clock, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { SessionFormDialog } from '../forms/SessionFormDialog';

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
    if (!confirm(`Are you sure you want to delete session "${sessionName}"?`)) return;
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
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-slate-50/70 dark:bg-slate-900/50 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border flex items-center justify-center shrink-0 overflow-hidden">
                  {university.logo ? (
                    <img
                      src={api.getFileUrl(university.logo)}
                      alt={university.name}
                      className="w-full h-full object-contain bg-white"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {university.name}
                    </DialogTitle>
                    <Badge variant="outline" className="text-xs font-mono">
                      {university.code}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Admission Sessions created against this university
                  </p>
                </div>
              </div>

              {isOrgAdmin && (
                <Button
                  size="sm"
                  onClick={handleOpenCreate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Create Session
                </Button>
              )}
            </div>

            {/* Search Input */}
            <div className="pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search session by name or program..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs bg-white dark:bg-slate-950"
                />
              </div>
            </div>
          </DialogHeader>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-2">
                <Clock className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm">Loading sessions...</p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-3">
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
                    size="sm"
                    onClick={handleOpenCreate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Session
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y border rounded-xl overflow-hidden bg-white dark:bg-slate-950">
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
                      className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {session.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-5 font-medium ${
                              isApproved
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : isPending
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {session.status || 'Active'}
                          </Badge>
                          {session.program ? (
                            <Badge variant="secondary" className="text-[10px] gap-1 h-5 px-1.5">
                              <BookOpen className="w-3 h-3 text-indigo-500" />
                              {session.program.name} ({session.program.code})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-slate-500 h-5 px-1.5">
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
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800"
                            onClick={() => handleOpenEdit(session)}
                            title="Edit Session"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
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
