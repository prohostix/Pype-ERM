import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Eye, FileText, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  statusHistory: { status: string; changedAt: string; remarks?: string; changedBy?: string }[];
  departmentRemarks?: string;
  financeRemarks?: string;
  universityRemarks?: string;
  departmentReviewedAt?: string;
  financeReviewedAt?: string;
  enrolledAt?: string;
  createdAt: string;
  student?: any;
  payment?: any;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  payment_pending:     { label: 'Fee Pending',      color: 'bg-orange-100 text-orange-700' },
  document_review:     { label: 'Document Review',  color: 'bg-blue-100 text-blue-700' },
  dept_review:         { label: 'Dept Review',      color: 'bg-purple-100 text-purple-700' },
  finance_review:      { label: 'Finance Review',   color: 'bg-yellow-100 text-yellow-700' },
  university_review:   { label: 'Univ. Review',     color: 'bg-indigo-100 text-indigo-700' },
  enrolled:            { label: 'Enrolled',          color: 'bg-green-100 text-green-700' },
  rejected:            { label: 'Rejected',          color: 'bg-red-100 text-red-700' },
  department_rejected: { label: 'Dept Rejected',    color: 'bg-red-100 text-red-700' },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status.replace(/_/g, ' '), color: 'bg-muted text-muted-foreground' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>
      {meta.label}
    </span>
  );
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
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [viewStudent, setViewStudent] = useState<Enrollment | null>(null);
  const [remarks, setRemarks] = useState('');

  const fetchData = async (t = tab) => {
    setLoading(true);
    try {
      const res = await api.get('/enrollment/review', { params: { tab: t } });
      setEnrollments(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(tab); }, [tab]);

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/enrollment/review/${id}/approve`);
      toast.success('Approved — forwarded to Finance');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
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
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const val = (enrollment: Enrollment, enrollKey: keyof Enrollment, studentKey?: string): string | null => {
    const direct = enrollment[enrollKey];
    if (direct && typeof direct === 'string') return direct;
    if (studentKey && enrollment.student?.[studentKey]) return String(enrollment.student[studentKey]);
    return null;
  };

  const formatDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-IN') : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enrollment Review</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {tab === 'pending' ? 'Review and approve student enrollments before finance processing.' : 'Enrollments already reviewed by this department.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as 'pending' | 'completed')}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {tab === 'pending' ? 'No enrollments pending review.' : 'No completed reviews yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {enrollments.map(e => (
            <Card key={e.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <StatusBadge status={e.status} />
                    {e.enrollmentNumber && <span className="text-xs font-mono text-muted-foreground">{e.enrollmentNumber}</span>}
                  </div>
                  <h4 className="font-semibold">{e.studentName}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>{e.studentEmail}</span>
                    {e.program && <span>{e.program.name} ({e.program.code})</span>}
                    {e.studyCenter && <span>{e.studyCenter.name}</span>}
                    <span>{new Date(e.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  {/* Show dept remarks on completed tab */}
                  {tab === 'completed' && e.departmentRemarks && (
                    <p className="text-xs mt-1.5 text-red-600 bg-red-50 px-2 py-1 rounded inline-block">
                      Rejected: {e.departmentRemarks}
                    </p>
                  )}
                  {tab === 'completed' && e.departmentReviewedAt && !e.departmentRemarks && (
                    <p className="text-xs mt-1.5 text-green-600">
                      ✓ Approved on {new Date(e.departmentReviewedAt).toLocaleDateString('en-IN')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="text-primary border-primary/30 hover:bg-primary/10" onClick={() => setViewStudent(e)}>
                    <Eye className="w-4 h-4 mr-1" />View
                  </Button>
                  {tab === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10" onClick={() => handleApprove(e.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => { setRejectDialog({ open: true, id: e.id }); setRemarks(''); }}>
                        <XCircle className="w-4 h-4 mr-1" />Reject
                      </Button>
                    </>
                  )}
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

              {/* Enrollment Status & History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 border-b pb-1">Enrollment Status</h4>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <StatusBadge status={viewStudent.status} />
                  {viewStudent.enrolledAt && (
                    <span className="text-xs text-muted-foreground">Enrolled on {formatDate(viewStudent.enrolledAt)}</span>
                  )}
                  {viewStudent.departmentReviewedAt && (
                    <span className="text-xs text-muted-foreground">Dept reviewed {formatDate(viewStudent.departmentReviewedAt)}</span>
                  )}
                </div>

                {/* Remarks */}
                {(viewStudent.departmentRemarks || viewStudent.financeRemarks || viewStudent.universityRemarks) && (
                  <div className="space-y-2 mb-4">
                    {viewStudent.departmentRemarks && (
                      <div className="text-xs bg-red-50 border border-red-100 rounded-lg p-2.5">
                        <span className="font-semibold text-red-700">Dept Remarks: </span>
                        <span className="text-red-600">{viewStudent.departmentRemarks}</span>
                      </div>
                    )}
                    {viewStudent.financeRemarks && (
                      <div className="text-xs bg-yellow-50 border border-yellow-100 rounded-lg p-2.5">
                        <span className="font-semibold text-yellow-700">Finance Remarks: </span>
                        <span className="text-yellow-600">{viewStudent.financeRemarks}</span>
                      </div>
                    )}
                    {viewStudent.universityRemarks && (
                      <div className="text-xs bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                        <span className="font-semibold text-blue-700">University Remarks: </span>
                        <span className="text-blue-600">{viewStudent.universityRemarks}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline */}
                {Array.isArray(viewStudent.statusHistory) && viewStudent.statusHistory.length > 0 && (
                  <div className="relative pl-4 border-l-2 border-muted space-y-3">
                    {[...viewStudent.statusHistory].reverse().map((h, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[1.35rem] top-1 w-3 h-3 rounded-full bg-primary/20 border-2 border-primary" />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <StatusBadge status={h.status} />
                            {h.remarks && <p className="text-xs text-muted-foreground mt-1">{h.remarks}</p>}
                          </div>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                            {new Date(h.changedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
