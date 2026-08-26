import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Search, GraduationCap, Clock, AlertCircle, Ban, Eye, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

const getDocUrl = (url: string) => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  
  let normalizedUrl = url;
  if (!normalizedUrl.startsWith('/')) {
    normalizedUrl = normalizedUrl.startsWith('uploads/') ? `/${normalizedUrl}` : `/uploads/${normalizedUrl}`;
  }

  if (normalizedUrl.startsWith('/uploads')) {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    return `${baseUrl}${normalizedUrl}`;
  }
  return normalizedUrl;
};

interface Enrollment {
  id: string;
  enrollmentNumber?: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  programId: { name: string; code: string } | string;
  studyCenterId: { name: string; code: string } | string;
  status: string;
  departmentRemarks?: string;
  financeRemarks?: string;
  payment?: { amount: number; debitedAt: string } | null;
  createdAt: string;
  enrolledAt?: string;
  student?: any;
  receiptUrl?: string | null;
  receiptVerified?: boolean;
  initialPaymentAmount?: number | null;
  receiptVerifiedAt?: string | null;
  receiptVerifiedBy?: string | null;
}

interface Summary {
  payment_pending: number;
  receipt_submitted: number;
  document_review: number;
  finance_review: number;
  enrolled: number;
  rejected: number;
  department_rejected: number;
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  payment_pending:     { label: 'Fee Pending',      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: <Clock className="w-3 h-3" /> },
  receipt_submitted:   { label: 'Receipt Uploaded', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',       icon: <FileText className="w-3 h-3" /> },
  document_review:     { label: 'Doc Review',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',         icon: <AlertCircle className="w-3 h-3" /> },
  finance_review:      { label: 'Finance Review',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3 h-3" /> },
  enrolled:            { label: 'Enrolled',         color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',     icon: <CheckCircle className="w-3 h-3" /> },
  rejected:            { label: 'Rejected',         color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',             icon: <XCircle className="w-3 h-3" /> },
  department_rejected: { label: 'Dept Rejected',    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',             icon: <Ban className="w-3 h-3" /> },
};

const FILTER_TABS = [
  { key: '', label: 'All' },
  { key: 'payment_pending', label: 'Fee Pending' },
  { key: 'receipt_submitted', label: 'Receipt Uploaded' },
  { key: 'document_review', label: 'Doc Review' },
  { key: 'finance_review', label: 'Finance Review' },
  { key: 'enrolled', label: 'Enrolled' },
  { key: 'rejected', label: 'Rejected' },
];

export function FinanceEnrollmentsPanel() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [remarks, setRemarks] = useState('');
  const [viewStudent, setViewStudent] = useState<Enrollment | null>(null);

  const fetchData = async (status = statusFilter, q = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (q) params.set('search', q);
      const res = await api.get(`/finance/enrollments/all?${params}`);
      setEnrollments(res.data.data || []);
      setSummary(res.data.summary || null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleTabChange = (key: string) => {
    setStatusFilter(key);
    fetchData(key, search);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(statusFilter, search);
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/finance/enrollments/${id}/approve`);
      toast.success('Student enrolled successfully');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    try {
      await api.put(`/finance/enrollments/${rejectDialog.id}/reject`, { remarks });
      toast.success('Enrollment rejected');
      setRejectDialog({ open: false, id: '' });
      setRemarks('');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to reject');
    }
  };

  const handleVerifyReceipt = async (id: string) => {
    try {
      await api.post(`/finance/enrollments/${id}/verify-receipt`);
      toast.success('Receipt verified and payment recorded successfully');
      setViewStudent(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to verify receipt');
    }
  };

  const getProgramName = (e: Enrollment) =>
    (e.programId && typeof e.programId === 'object')
      ? `${e.programId.name || 'Unknown'} (${e.programId.code || ''})`
      : (e.programId as string) || 'N/A';

  const getCenterName = (e: Enrollment) =>
    (e.studyCenterId && typeof e.studyCenterId === 'object')
      ? `${e.studyCenterId.name || 'Unknown'}`
      : (e.studyCenterId as string) || 'N/A';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Student Enrollments</h2>
          <p className="text-muted-foreground text-sm mt-1">All student enrollment data across every stage.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          <SummaryCard label="Fee Pending" count={summary.payment_pending} icon={<Clock className="w-4 h-4" />} color="text-orange-500 bg-orange-50 dark:bg-orange-900/20" onClick={() => handleTabChange('payment_pending')} />
          <SummaryCard label="Receipt Uploaded" count={summary.receipt_submitted} icon={<FileText className="w-4 h-4" />} color="text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20" onClick={() => handleTabChange('receipt_submitted')} />
          <SummaryCard label="Doc Review" count={summary.document_review} icon={<AlertCircle className="w-4 h-4" />} color="text-blue-500 bg-blue-50 dark:bg-blue-900/20" onClick={() => handleTabChange('document_review')} />
          <SummaryCard label="Finance Review" count={summary.finance_review} icon={<Clock className="w-4 h-4" />} color="text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" onClick={() => handleTabChange('finance_review')} />
          <SummaryCard label="Enrolled" count={summary.enrolled} icon={<GraduationCap className="w-4 h-4" />} color="text-green-500 bg-green-50 dark:bg-green-900/20" onClick={() => handleTabChange('enrolled')} />
          <SummaryCard label="Rejected" count={summary.rejected} icon={<XCircle className="w-4 h-4" />} color="text-red-500 bg-red-50 dark:bg-red-900/20" onClick={() => handleTabChange('rejected')} />
          <SummaryCard label="Dept Rejected" count={summary.department_rejected} icon={<Ban className="w-4 h-4" />} color="text-red-400 bg-red-50 dark:bg-red-900/20" onClick={() => handleTabChange('department_rejected')} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {tab.label}
              {summary && tab.key && (
                <span className="ml-1.5 opacity-70">
                  {summary[tab.key as keyof Summary] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, ID..."
              className="pl-8 h-8 text-sm w-56"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-8">Search</Button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No enrollments found{statusFilter ? ` with status "${statusFilter.replace('_', ' ')}"` : ''}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Program</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Center</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Fee Paid</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrollments.map(e => {
                const meta = STATUS_META[e.status] || { label: e.status, color: 'bg-muted text-muted-foreground', icon: null };
                return (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <p className="font-medium">{e.studentName}</p>
                      <p className="text-xs text-muted-foreground">{e.studentEmail}</p>
                      {e.enrollmentNumber && <p className="text-[10px] text-muted-foreground font-mono">{e.enrollmentNumber}</p>}
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{getProgramName(e)}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{getCenterName(e)}</td>
                    <td className="p-3 hidden sm:table-cell">
                      {e.payment ? (
                        <span className="text-green-600 font-medium">₹{e.payment.amount.toLocaleString()}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold', meta.color)}>
                        {meta.icon}{meta.label}
                      </span>
                      {(e.financeRemarks || e.departmentRemarks) && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[160px] truncate" title={e.financeRemarks || e.departmentRemarks}>
                          {e.financeRemarks || e.departmentRemarks}
                        </p>
                      )}
                    </td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1.5 justify-end">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-primary border-primary/30 hover:bg-primary/10" onClick={() => setViewStudent(e)}>
                          <Eye className="w-3 h-3 mr-1" />View
                        </Button>
                        {e.status === 'finance_review' && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => handleApprove(e.id)}>
                              <CheckCircle className="w-3 h-3 mr-1" />Enroll
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { setRejectDialog({ open: true, id: e.id }); setRemarks(''); }}>
                              <XCircle className="w-3 h-3 mr-1" />Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

      {/* View Student Details Dialog */}
      <Dialog open={!!viewStudent} onOpenChange={o => !o && setViewStudent(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Enrollment Details</DialogTitle></DialogHeader>
          {viewStudent && (
            <div className="space-y-6 pb-2 text-sm">

              {/* Photo + Identity */}
              <div className="flex gap-5 items-start">
                <div className="shrink-0">
                  {viewStudent.student?.photo ? (
                    <img src={viewStudent.student.photo} alt="Student" className="w-24 h-24 rounded-xl object-cover border shadow-sm" />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center border">
                      <GraduationCap className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <Field label="Full Name" value={viewStudent.student?.name || viewStudent.studentName} />
                  <Field label="Email" value={viewStudent.student?.email || viewStudent.studentEmail} />
                  <Field label="Phone" value={viewStudent.student?.phone || viewStudent.studentPhone} />
                  <Field label="Alt Phone" value={viewStudent.student?.altPhone} />
                  <Field label="Date of Birth" value={viewStudent.student?.dob ? new Date(viewStudent.student.dob).toLocaleDateString('en-IN') : null} />
                  <Field label="Enrollment #" value={viewStudent.enrollmentNumber} />
                </div>
              </div>

              {/* Program & University */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 border-b pb-1">Program &amp; University</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Program" value={(viewStudent as any).program?.name ? `${(viewStudent as any).program.name} (${(viewStudent as any).program.code})` : getProgramName(viewStudent)} />
                  <Field label="University" value={(viewStudent as any).program?.university?.name} />
                  <Field label="Univ. Code" value={(viewStudent as any).program?.university?.code} />
                  <Field label="Univ. Address" value={(viewStudent as any).program?.university?.address} />
                  <Field label="Session" value={(viewStudent as any).session?.name} />
                  <Field label="Study Center" value={getCenterName(viewStudent)} />
                  <Field label="Status" value={STATUS_META[viewStudent.status]?.label || viewStudent.status} />
                </div>
              </div>

              {/* Fee Details */}
              {((viewStudent as any).program?.feeStructures?.length > 0 || viewStudent.payment) && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 border-b pb-1">Fee Details</h4>
                  {(viewStudent as any).program?.feeStructures?.length > 0 && (
                    <div className="rounded-lg border overflow-hidden mb-3">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Fee Type</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(viewStudent as any).program.feeStructures.map((f: any, i: number) => {
                            const rows = [
                              { label: 'Registration Fee', val: f.registrationFee },
                              { label: 'Tuition Fee', val: f.tuitionFee },
                              { label: 'Exam Fee', val: f.examFee },
                              { label: 'University Fee', val: f.universityFee },
                            ].filter(r => r.val && Number(r.val) > 0);
                            return rows.map((r, j) => (
                              <tr key={`${i}-${j}`}>
                                <td className="px-3 py-2">{r.label} <span className="text-muted-foreground capitalize">({f.billingCycle || 'per year'})</span></td>
                                <td className="px-3 py-2 text-right font-medium text-green-600">₹{Number(r.val).toLocaleString()}</td>
                              </tr>
                            ));
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {viewStudent.payment && (
                    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                        <div>
                          <p className="font-semibold text-green-700">Fee Paid: ₹{viewStudent.payment.amount?.toLocaleString()}</p>
                          {viewStudent.payment.debitedAt && (
                            <p className="text-xs text-green-600">on {new Date(viewStudent.payment.debitedAt).toLocaleDateString('en-IN')}</p>
                          )}
                        </div>
                      </div>
                      {viewStudent.initialPaymentAmount && (
                        <div className="text-right">
                          <p className="text-xs font-semibold text-amber-600">Initial Fee Paid</p>
                          <p className="text-[10px] text-amber-700 font-medium opacity-80">(Deducted from Total)</p>
                        </div>
                      )}
                    </div>
                  )}
                  {!viewStudent.payment && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100">
                      <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                      <p className="text-orange-700 font-medium text-xs">Fee not yet received</p>
                    </div>
                  )}
                </div>
              )}

              {/* Personal Details */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 border-b pb-1">Personal Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Gender" value={viewStudent.gender || viewStudent.student?.gender} />
                  <Field label="Category" value={viewStudent.category || viewStudent.student?.category} />
                  <Field label="Religion" value={viewStudent.religion || viewStudent.student?.religion} />
                  <Field label="Marital Status" value={viewStudent.maritalStatus || viewStudent.student?.maritalStatus} />
                  <Field label="Employment Status" value={viewStudent.employmentStatus || viewStudent.student?.employmentStatus} />
                  <Field label="Caste" value={viewStudent.caste || viewStudent.student?.caste} />
                  <Field label="Father's Name" value={viewStudent.fatherName || viewStudent.student?.fatherName} />
                  <Field label="Mother's Name" value={viewStudent.motherName || viewStudent.student?.motherName} />
                  <Field label="Father's Phone" value={viewStudent.fatherPhone || viewStudent.student?.fatherPhone} />
                  <Field label="Mother's Phone" value={viewStudent.motherPhone || viewStudent.student?.motherPhone} />
                  <Field label="Guardian's Name" value={viewStudent.guardianName || viewStudent.student?.guardianName} />
                  <Field label="Family Phone" value={viewStudent.familyPhone || viewStudent.student?.familyPhone} />
                  <Field label="Address" value={viewStudent.studentAddress || viewStudent.student?.address} />
                  <Field label="Pin Code" value={viewStudent.pinCode || viewStudent.student?.pinCode} />
                </div>
              </div>

              {/* Remarks */}
              {(viewStudent.departmentRemarks || viewStudent.financeRemarks) && (
                <div className="space-y-2">
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
                </div>
              )}

              {/* Documents */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 border-b pb-1">Uploaded Documents</h4>
                {!viewStudent.student?.documents || viewStudent.student.documents.filter(Boolean).length === 0 ? (
                  <p className="text-muted-foreground italic py-2">No documents uploaded.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {viewStudent.student.documents.filter(Boolean).map((doc: any, i: number) => (
                      <a key={i} href={getDocUrl(doc.url)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate flex items-center gap-2">
                            {doc.type || 'Document'}
                            {doc.status === 'approved' && <CheckCircle className="w-3 h-3 text-success" />}
                            {doc.status === 'rejected' && <XCircle className="w-3 h-3 text-destructive" />}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{doc.name || 'Click to open'}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Receipt */}
              {(viewStudent.receiptUrl || viewStudent.status === 'receipt_submitted') && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 border-b pb-1 flex justify-between items-center">
                    Payment Receipt
                    {viewStudent.receiptVerified && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">VERIFIED</span>}
                  </h4>
                  <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/10 flex items-start gap-4">
                    {viewStudent.receiptUrl ? (
                      <>
                        <a href={api.getFileUrl(viewStudent.receiptUrl)} target="_blank" rel="noreferrer" className="w-20 h-20 rounded border bg-white overflow-hidden shrink-0 block">
                          <img src={api.getFileUrl(viewStudent.receiptUrl)} alt="Receipt" className="w-full h-full object-cover" />
                        </a>
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">Receipt Uploaded</p>
                          {!viewStudent.receiptVerified ? (
                            <Button size="sm" onClick={() => handleVerifyReceipt(viewStudent.id)}>
                              Verify Receipt & Record Payment
                            </Button>
                          ) : (
                            <p className="text-xs text-muted-foreground">Receipt has been verified and payment recorded.</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No receipt file uploaded yet.</p>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-0.5">{label}</span>
      <span className="text-sm">{value || <span className="text-muted-foreground italic">N/A</span>}</span>
    </div>
  );
}

function SummaryCard({ label, count, icon, color, onClick }: { label: string; count: number; icon: React.ReactNode; color: string; onClick: () => void }) {
  return (
    <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={onClick}>
      <CardContent className="p-6 flex items-center gap-4">
        <div className={cn('p-2 rounded-lg', color)}>{icon}</div>
        <div>
          <p className="text-xl font-bold">{count}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

