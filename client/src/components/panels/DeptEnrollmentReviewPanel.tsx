import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Eye, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Enrollment {
  id: string;
  enrollmentNumber?: string;
  studentName: string;
  studentEmail: string;
  programId: { name: string; code: string } | string;
  studyCenterId: { name: string } | string;
  status: string;
  createdAt: string;
  student?: any;
}

export function DeptEnrollmentReviewPanel() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [viewStudent, setViewStudent] = useState<Enrollment | null>(null);
  const [remarks, setRemarks] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/enrollment/review');
      setEnrollments(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/enrollment/review/${id}/approve`);
      toast.success('Enrollment approved — forwarded to Finance');
      fetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    try {
      await api.put(`/enrollment/review/${rejectDialog.id}/reject`, { remarks });
      toast.success('Enrollment rejected');
      setRejectDialog({ open: false, id: '' });
      setRemarks('');
      fetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to reject');
    }
  };

  const getProgramName = (e: Enrollment) =>
    (e.programId && typeof e.programId === 'object') ? `${e.programId.name} (${e.programId.code})` : e.programId;

  const getCenterName = (e: Enrollment) =>
    (e.studyCenterId && typeof e.studyCenterId === 'object') ? e.studyCenterId.name : e.studyCenterId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enrollment Review</h2>
          <p className="text-muted-foreground text-sm mt-1">Review and approve student enrollments before finance processing.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : enrollments.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No enrollments pending review.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {enrollments.map(e => (
            <Card key={e.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-warning/10 text-warning text-[10px] uppercase font-bold">
                      {e.status.replace(/_/g, ' ')}
                    </Badge>
                    {e.enrollmentNumber && <span className="text-xs text-muted-foreground">{e.enrollmentNumber}</span>}
                  </div>
                  <h4 className="font-semibold">{e.studentName}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                    <span>{e.studentEmail}</span>
                    <span>{getProgramName(e)}</span>
                    <span>{getCenterName(e)}</span>
                    <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-primary border-primary/30 hover:bg-primary/10" onClick={() => setViewStudent(e)}>
                    <Eye className="w-4 h-4 mr-1" />View
                  </Button>
                  <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10" onClick={() => handleApprove(e.id)}>
                    <CheckCircle className="w-4 h-4 mr-1" />Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setRejectDialog({ open: true, id: e.id }); setRemarks(''); }}>
                    <XCircle className="w-4 h-4 mr-1" />Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={rejectDialog.open} onOpenChange={o => setRejectDialog(d => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Enrollment</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Remarks (required)</Label>
            <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Reason for rejection..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: '' })}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!remarks.trim()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewStudent} onOpenChange={o => !o && setViewStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Student Details</DialogTitle></DialogHeader>
          {viewStudent && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-semibold text-muted-foreground block">Name</span>{viewStudent.student?.name || viewStudent.studentName}</div>
                <div><span className="font-semibold text-muted-foreground block">Email</span>{viewStudent.student?.email || viewStudent.studentEmail}</div>
                <div><span className="font-semibold text-muted-foreground block">Phone</span>{viewStudent.student?.phone || 'N/A'}</div>
                <div><span className="font-semibold text-muted-foreground block">Alt Phone</span>{viewStudent.student?.altPhone || 'N/A'}</div>
                <div><span className="font-semibold text-muted-foreground block">DOB</span>{viewStudent.student?.dob ? new Date(viewStudent.student.dob).toLocaleDateString() : 'N/A'}</div>
                <div><span className="font-semibold text-muted-foreground block">Father's Name</span>{viewStudent.student?.fatherName || 'N/A'}</div>
                <div className="col-span-2"><span className="font-semibold text-muted-foreground block">Address</span>{viewStudent.student?.address || 'N/A'}</div>
              </div>
              
              <h4 className="font-bold border-b pb-2 mt-6">Documents</h4>
              {!viewStudent.student?.documents || viewStudent.student.documents.length === 0 ? (
                <div className="text-muted-foreground text-sm py-4">No documents uploaded.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {viewStudent.student.documents.map((doc: any, i: number) => {
                    if (!doc) return null;
                    return (
                      <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border rounded hover:bg-slate-50 transition-colors">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{doc.type}</p>
                          <p className="text-xs text-muted-foreground truncate">{doc.name || 'Document'}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
