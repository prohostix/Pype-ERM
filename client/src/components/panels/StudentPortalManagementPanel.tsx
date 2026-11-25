import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, Lock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ListPagination } from '@/components/ui/list-pagination';

export function StudentPortalManagementPanel() {
  const { user } = useAuth();
  // Only org admins can block or restore a student's videos
  const canBlockVideos = ['org_admin', 'superadmin'].includes(user?.role || '');
  const [blockTarget, setBlockTarget] = useState<any>(null);
  const [blockReason, setBlockReason] = useState('');
  // Unlock-gap override: skip the wait for a student's next video
  const [unlockTarget, setUnlockTarget] = useState<any>(null);
  const [unlockInfo, setUnlockInfo] = useState<any>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);
  
  // Dialog State
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students');
      setStudents(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const openManageDialog = (student: any) => {
    setSelectedStudent(student);
    setPassword(student.credentials?.password || '');
    setManageDialogOpen(true);
  };

  const handleSaveCredentials = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      const updatedCreds = {
        email: selectedStudent.email,
        password: password
      };
      await api.put(`/students/${selectedStudent.id}`, {
        credentials: updatedCreds
      });
      toast.success('Portal access updated successfully');
      setManageDialogOpen(false);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update credentials');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVideoBlock = async (blocked: boolean) => {
    if (!blockTarget) return;
    setIsSaving(true);
    try {
      await api.put(`/students/${blockTarget.id}/video-block`, { blocked, reason: blockReason });
      toast.success(blocked ? 'Video lectures blocked for this student' : 'Video lectures restored');
      setBlockTarget(null);
      setBlockReason('');
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update video access');
    } finally {
      setIsSaving(false);
    }
  };

  const openUnlock = async (student: any) => {
    setUnlockTarget(student);
    setUnlockInfo(null);
    setUnlockLoading(true);
    try {
      const res = await api.get(`/students/${student.id}/video-unlock`);
      setUnlockInfo(res.data?.data || null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load unlock status');
      setUnlockTarget(null);
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleUnlockNext = async () => {
    if (!unlockTarget || !unlockInfo?.nextLocked) return;
    setIsSaving(true);
    try {
      const res = await api.put(`/students/${unlockTarget.id}/video-unlock`, { lessonId: unlockInfo.nextLocked.lessonId });
      toast.success(res.data?.message || 'Video unlocked');
      setUnlockTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to unlock video');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      await api.put(`/students/${selectedStudent.id}`, {
        credentials: null
      });
      toast.success('Portal access revoked');
      setManageDialogOpen(false);
      fetchStudents();
    } catch (err: any) {
      toast.error('Failed to revoke access');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.enrollmentNo && s.enrollmentNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Student Portal Management</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Manage student portal access, credentials, and settings</p>
        </div>
        <Button variant="outline" onClick={fetchStudents} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search students by name, email or enrollment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-full bg-[#f4f6f3] border-transparent"
          />
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Students</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{filteredStudents.length} found</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <p className="text-sm">No students found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedStudents.map(student => (
                <div key={student.id} className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{student.name}</span>
                      {student.credentials ? (
                        <Badge className="rounded-full border-0 px-3 bg-[#dff3da] text-[#256c1d] hover:bg-[#dff3da]">Active</Badge>
                      ) : (
                        <Badge className="rounded-full border-0 px-3 bg-slate-200/70 text-slate-600 hover:bg-slate-200/70">Inactive</Badge>
                      )}
                      {student.videoBlocked && (
                        <Badge className="rounded-full border-0 px-3 bg-red-100 text-red-700 hover:bg-red-100" title={student.videoBlockReason || undefined}>Videos blocked</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {student.email}{student.enrollmentNo ? ` · ${student.enrollmentNo}` : ''}
                    </p>
                    <p className="text-xs text-slate-600 mt-1.5">
                      {student.program?.name || 'N/A'}
                      <span className="text-muted-foreground"> · Last login: not available</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    {canBlockVideos && (
                      <Button
                        className={student.videoBlocked
                          ? 'h-10 rounded-full px-5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold'
                          : 'h-10 rounded-full px-5 bg-white border border-slate-200 text-slate-700 hover:bg-[#eaf6e6] font-semibold'}
                        onClick={() => { setBlockTarget(student); setBlockReason(student.videoBlockReason || ''); }}
                      >
                        {student.videoBlocked ? 'Unblock Videos' : 'Block Videos'}
                      </Button>
                    )}
                    {canBlockVideos && (
                      <Button variant="outline" className="h-10 rounded-full px-5 bg-white border-slate-200 hover:bg-[#eaf6e6] font-semibold" onClick={() => openUnlock(student)} title="Skip the unlock-gap wait for the student's next video">
                        Unlock Next Video
                      </Button>
                    )}
                    <Button
                      className={student.credentials
                        ? 'h-10 rounded-full px-5 bg-white border border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold'
                        : 'h-10 rounded-full px-5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold'}
                      onClick={() => openManageDialog(student)}
                    >
                      Manage Access
                    </Button>
                  </div>
                </div>
              ))}
              <ListPagination
                total={filteredStudents.length}
                page={currentPage}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
              />
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!blockTarget} onOpenChange={(o) => { if (!o) { setBlockTarget(null); setBlockReason(''); } }}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">{blockTarget?.videoBlocked ? 'Restore video lectures' : 'Block video lectures'}: {blockTarget?.name}</DialogTitle>
            <DialogDescription>
              {blockTarget?.videoBlocked
                ? 'The student will be able to watch their video lectures again (fee rules still apply).'
                : 'The student can still sign in and see fees and profile, but every video lecture is locked until you unblock them.'}
            </DialogDescription>
          </DialogHeader>
          {!blockTarget?.videoBlocked && (
            <div className="space-y-2 py-2">
              <Label>Reason (shown to the student)</Label>
              <Textarea
                rows={3}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                maxLength={300}
                placeholder="e.g. Pending dues, disciplinary action…"
                className="resize-none"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setBlockTarget(null)} disabled={isSaving}>Cancel</Button>
            {blockTarget?.videoBlocked ? (
              <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => handleVideoBlock(false)} disabled={isSaving}>{isSaving ? 'Saving...' : 'Unblock Videos'}</Button>
            ) : (
              <Button className="h-11 px-6 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold" onClick={() => handleVideoBlock(true)} disabled={isSaving}>{isSaving ? 'Saving...' : 'Block Videos'}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!unlockTarget} onOpenChange={(o) => { if (!o) setUnlockTarget(null); }}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Unlock next video: {unlockTarget?.name}</DialogTitle>
            <DialogDescription>Skips the unlock-gap wait for this student only. Other rules (fee lock, daily limit, admin block) still apply.</DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm space-y-2">
            {unlockLoading ? (
              <p className="text-muted-foreground">Checking…</p>
            ) : !unlockInfo?.enabled ? (
              <p className="text-muted-foreground">The unlock gap is not turned on for this student's program.</p>
            ) : !unlockInfo.nextLocked ? (
              <p className="text-muted-foreground">No video is waiting. Every video is open for this student.</p>
            ) : (
              <>
                <p><span className="font-medium">{unlockInfo.nextLocked.title}</span> is the next locked video.</p>
                {unlockInfo.nextLocked.reason === 'waiting' ? (
                  <p className="text-muted-foreground">It opens on {new Date(unlockInfo.nextLocked.unlockAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })} ({unlockInfo.gapDays}-day gap after completing the previous video).</p>
                ) : (
                  <p className="text-amber-600">The student has not completed "{unlockInfo.nextLocked.previousTitle || 'the previous video'}" yet. Unlocking opens this video anyway.</p>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setUnlockTarget(null)} disabled={isSaving}>Close</Button>
            {unlockInfo?.nextLocked && (
              <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleUnlockNext} disabled={isSaving}>{isSaving ? 'Unlocking...' : 'Unlock now'}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Portal Access: {selectedStudent?.name}</DialogTitle>
            <DialogDescription>Set up or revoke portal login credentials.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Username (Email)</Label>
              <Input value={selectedStudent?.email || ''} readOnly className="bg-muted text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Username is fixed to the student's registered email.</p>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            {selectedStudent?.credentials ? (
              <Button className="h-11 px-5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold" onClick={handleRevokeAccess} disabled={isSaving}>
                Revoke Access
              </Button>
            ) : (
              <div></div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setManageDialogOpen(false)}>Cancel</Button>
              <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleSaveCredentials} disabled={isSaving || !password}>
                {isSaving ? 'Saving...' : 'Save Credentials'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
