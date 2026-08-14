import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Eye, FileText, User } from 'lucide-react';
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
  studentPhone?: string;
  studentAddress?: string;
  fatherName?: string;
  dob?: string;
  altPhone?: string;
  pinCode?: string;
  program: { name: string; code: string; university?: { name: string } } | null;
  studyCenter: { name: string; code?: string } | null;
  session: { name: string } | null;
  status: string;
  createdAt: string;
  student?: any;
  payment?: any;
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-0.5">{label}</span>
      <span className="text-sm">{value || <span className="text-muted-foreground italic">N/A</span>}</span>
    </div>
  );
}

export function DeptEnrollmentReviewPanel() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [viewStudent, setViewStudent] = useState<Enrollment | null>(null);
  const [remarks, setRemarks] = useState('');

  const fetchData = async () => {
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

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/enrollment/review/${id}/approve`);
      toast.success('Enrollment approved — forwarded to Finance');
      fetchData();
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
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to reject');
    }
  };

  const getProgramName = (e: Enrollment) =>
    e.program ? `${e.program.name} (${e.program.code})` : 'N/A';

  const getCenterName = (e: Enrollment) =>
    e.studyCenter?.name || 'N/A';

  // Pull value preferring enrollment form data, fallback to linked student profile
  const val = (enrollment: Enrollment, enrollKey: keyof Enrollment, studentKey?: string): string | null => {
    const direct = enrollment[enrollKey];
    if (direct && typeof direct === 'string') return direct;
    if (studentKey && enrollment.student?.[studentKey]) return String(enrollment.student[studentKey]);
    return null;
  };

  const formatDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-IN') : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enrollment Review</h2>
          <p className="text-muted-foreground text-sm mt-1">Review and approve student enrollments before finance processing.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
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

      {/* Reject Dialog */}
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

      {/* Full Student Details Dialog */}
      <Dialog open={!!viewStudent} onOpenChange={o => !o && setViewStudent(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Enrollment Details</DialogTitle>
          </DialogHeader>
          {viewStudent && (
            <div className="space-y-6 pb-2">

              {/* Photo + Identity */}
              <div className="flex gap-5 items-start">
                <div className="shrink-0">
                  {viewStudent.student?.photo ? (
                    <img src={viewStudent.student.photo} alt="Student" className="w-24 h-24 rounded-xl object-cover border" />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center border">
                      <User className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <InfoField label="Full Name" value={val(viewStudent, 'studentName', 'name')} />
                  <InfoField label="Email" value={val(viewStudent, 'studentEmail', 'email')} />
                  <InfoField label="Phone" value={val(viewStudent, 'studentPhone', 'phone')} />
                  <InfoField label="Alt Phone" value={val(viewStudent, 'altPhone', 'altPhone')} />
                  <InfoField label="Date of Birth" value={formatDate(viewStudent.dob) || formatDate(viewStudent.student?.dob)} />
                  <InfoField label="Enrollment #" value={viewStudent.enrollmentNumber} />
                </div>
              </div>

              {/* Program & Institution */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 border-b pb-1">Program &amp; Institution</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Program" value={viewStudent.program ? `${viewStudent.program.name} (${viewStudent.program.code})` : null} />
                  <InfoField label="University" value={viewStudent.program?.university?.name} />
                  <InfoField label="Study Center" value={viewStudent.studyCenter?.name} />
                  <InfoField label="Session" value={viewStudent.session?.name} />
                </div>
              </div>

              {/* Personal Details */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 border-b pb-1">Personal Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Father's Name" value={val(viewStudent, 'fatherName', 'fatherName')} />
                  <InfoField label="Mother's Name" value={viewStudent.student?.motherName} />
                  <InfoField label="Father's Phone" value={viewStudent.student?.fatherPhone} />
                  <InfoField label="Mother's Phone" value={viewStudent.student?.motherPhone} />
                  <InfoField label="Religion" value={viewStudent.student?.religion} />
                  <InfoField label="Caste" value={viewStudent.student?.caste} />
                  <InfoField label="Address" value={val(viewStudent, 'studentAddress', 'address')} />
                  <InfoField label="Pin Code" value={val(viewStudent, 'pinCode', 'pinCode')} />
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 border-b pb-1">Uploaded Documents</h4>
                {(() => {
                  const docs: any[] = Array.isArray(viewStudent.student?.documents)
                    ? viewStudent.student.documents.filter(Boolean)
                    : [];
                  return docs.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-2">No documents uploaded.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {docs.map((doc: any, i: number) => (
                        <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{doc.type || 'Document'}</p>
                            <p className="text-xs text-muted-foreground truncate">{doc.name || 'Click to open'}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
