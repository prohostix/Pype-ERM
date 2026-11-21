import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MonitorSmartphone, Shield, UserX, Lock, VideoOff, Video, Unlock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import api from '@/lib/api';

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
  const itemsPerPage = 50;

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

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Student Portal Management</CardTitle>
            <CardDescription>Manage student portal access, credentials, and settings</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStudents} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-4 space-x-2">
          <Input 
            placeholder="Search students by name, email or enrollment..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Portal Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading students...
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <MonitorSmartphone className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudents.map(student => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.email}</div>
                      {student.enrollmentNo && <div className="text-xs text-muted-foreground">{student.enrollmentNo}</div>}
                    </TableCell>
                    <TableCell>{student.program?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {student.credentials ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {student.videoBlocked && (
                          <Badge variant="destructive" title={student.videoBlockReason || undefined}>Videos blocked</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {/* Placeholder for last login */}
                      Not available
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canBlockVideos && (
                          <Button
                            size="sm"
                            variant={student.videoBlocked ? "default" : "outline"}
                            onClick={() => { setBlockTarget(student); setBlockReason(student.videoBlockReason || ''); }}
                          >
                            {student.videoBlocked ? <Video className="w-4 h-4 mr-2" /> : <VideoOff className="w-4 h-4 mr-2" />}
                            {student.videoBlocked ? 'Unblock Videos' : 'Block Videos'}
                          </Button>
                        )}
                        {canBlockVideos && (
                          <Button size="sm" variant="outline" onClick={() => openUnlock(student)} title="Skip the unlock-gap wait for the student's next video">
                            <Unlock className="w-4 h-4 mr-2" />
                            Unlock Next Video
                          </Button>
                        )}
                        <Button size="sm" variant={student.credentials ? "outline" : "default"} onClick={() => openManageDialog(student)}>
                          <Shield className="w-4 h-4 mr-2" />
                          Manage Access
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t bg-slate-50 dark:bg-slate-900/20">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="text-sm font-medium px-2">
                  Page {currentPage} of {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={!!blockTarget} onOpenChange={(o) => { if (!o) { setBlockTarget(null); setBlockReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{blockTarget?.videoBlocked ? 'Restore video lectures' : 'Block video lectures'}: {blockTarget?.name}</DialogTitle>
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
            <Button variant="outline" onClick={() => setBlockTarget(null)} disabled={isSaving}>Cancel</Button>
            {blockTarget?.videoBlocked ? (
              <Button onClick={() => handleVideoBlock(false)} disabled={isSaving}>{isSaving ? 'Saving...' : 'Unblock Videos'}</Button>
            ) : (
              <Button variant="destructive" onClick={() => handleVideoBlock(true)} disabled={isSaving}>{isSaving ? 'Saving...' : 'Block Videos'}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!unlockTarget} onOpenChange={(o) => { if (!o) setUnlockTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unlock next video: {unlockTarget?.name}</DialogTitle>
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
            <Button variant="outline" onClick={() => setUnlockTarget(null)} disabled={isSaving}>Close</Button>
            {unlockInfo?.nextLocked && (
              <Button onClick={handleUnlockNext} disabled={isSaving}>{isSaving ? 'Unlocking...' : 'Unlock now'}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Portal Access: {selectedStudent?.name}</DialogTitle>
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
              <Button variant="destructive" size="sm" onClick={handleRevokeAccess} disabled={isSaving}>
                <UserX className="w-4 h-4 mr-2" />
                Revoke Access
              </Button>
            ) : (
              <div></div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setManageDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveCredentials} disabled={isSaving || !password}>
                {isSaving ? 'Saving...' : 'Save Credentials'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
