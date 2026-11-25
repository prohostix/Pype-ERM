import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Search, GraduationCap, Clock, AlertCircle, Ban, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

import { CS } from '@/lib/currency';
import { mayOn } from '@/lib/access';
import { Allowed } from '@/components/ui/allowed';
const getDocUrl = (url: string) => {
  return api.getFileUrl(url);
};

interface Enrollment {
  id: string;
  enrollmentNumber?: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  programId: string;
  studyCenterId: string;
  program?: any;
  studyCenter?: any;
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
  isProvisional?: boolean;
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
  payment_pending: { label: 'Fee Pending', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: <Clock className="w-3 h-3" /> },
  receipt_submitted: { label: 'Receipt Uploaded', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', icon: <FileText className="w-3 h-3" /> },
  document_review: { label: 'Doc Review', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <AlertCircle className="w-3 h-3" /> },
  finance_review: { label: 'Finance Review', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3 h-3" /> },
  sales_admin_review: { label: 'Sales Admin Review', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: <Clock className="w-3 h-3" /> },
  enrolled: { label: 'Enrolled', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3 h-3" /> },
  department_rejected: { label: 'Dept Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <Ban className="w-3 h-3" /> },
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
  const { user } = useAuth();
  // The role decides unless an Org Admin has set something for this user (the server enforces it)
  const mayApprove = mayOn(user, 'finance_enrollments', 'approve', true);
  // Finance and Org/Super Admins can approve, reject or verify; everyone else (CEO, General Manager, Branch Manager) views.
  const canAct = mayOn(user, 'finance_enrollments', 'approve', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'].includes(user?.role || ''));
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [remarks, setRemarks] = useState('');
  const [viewStudent, setViewStudent] = useState<Enrollment | null>(null);
  // Client-side pagination; changing the stage filter, search or page size returns to page 1
  const [pageSize, setPageSize] = useState(10);
  const PAGE_SIZE = pageSize;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(enrollments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedEnrollments = enrollments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [pageSize, statusFilter, search]);
  const getRelevantFeeStructure = (enrollment: any) => {
    const list: any[] = enrollment?.program?.feeStructures;
    if (!Array.isArray(list) || list.length === 0) return null;

    const studentSessionId = enrollment.sessionId || enrollment.student?.sessionId || null;
    const studentSpecialisation = enrollment.specialisation || enrollment.student?.specialisation || null;

    // 1. Exact match: session + specialisation
    if (studentSessionId && studentSpecialisation) {
      const match = list.find(f => {
        const sid = typeof f.sessionId === 'object' ? f.sessionId?.id : f.sessionId;
        return sid === studentSessionId && f.specialisation === studentSpecialisation;
      });
      if (match) return match;
    }

    // 2. Session match without specialisation
    if (studentSessionId) {
      const match = list.find(f => {
        const sid = typeof f.sessionId === 'object' ? f.sessionId?.id : f.sessionId;
        return sid === studentSessionId && !f.specialisation;
      });
      if (match) return match;
    }

    // 3. Fallback to default session (!sessionId) with specialisation match
    if (studentSpecialisation) {
      const match = list.find(f => {
        const sid = typeof f.sessionId === 'object' ? f.sessionId?.id : f.sessionId;
        return !sid && f.specialisation === studentSpecialisation;
      });
      if (match) return match;
    }

    // 4. Fallback to default session (!sessionId) without specialisation
    const defaultMatch = list.find(f => {
      const sid = typeof f.sessionId === 'object' ? f.sessionId?.id : f.sessionId;
      return !sid && !f.specialisation;
    });
    if (defaultMatch) return defaultMatch;

    // 5. Ultimate fallback if no default session structure exists
    return list[0];
  };

  const relevantFee = viewStudent ? getRelevantFeeStructure(viewStudent) : null;
  const feeRows = relevantFee ? [
    { label: 'Registration Fee', val: relevantFee.registrationFee },
    { label: 'Tuition Fee', val: relevantFee.tuitionFee },
    { label: 'Exam Fee', val: relevantFee.examFee },
    { label: 'University Fee', val: relevantFee.universityFee },
  ].filter(r => r.val && Number(r.val) > 0) : [];
  const totalProgramFee = feeRows.reduce((acc, r) => acc + Number(r.val), 0);

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
      if (viewStudent?.id === id) {
        setViewStudent(null);
      }
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
      if (viewStudent?.id === rejectDialog.id) {
        setViewStudent(null);
      }
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to reject');
    }
  };

  const handleVerifyReceipt = async (id: string) => {
    try {
      await api.post(`/finance/enrollments/${id}/verify-receipt`);
      toast.success('Receipt verified and student enrolled successfully');
      setViewStudent(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to verify receipt');
    }
  };

  const getProgramName = (e: Enrollment) => {
    const name = e.program
      ? `${e.program.name || 'Unknown'} (${e.program.code || ''})`
      : e.programId || 'N/A';
    return name + (e.specialisation ? ` - ${e.specialisation}` : '');
  };

  const getCenterName = (e: Enrollment) =>
    e.studyCenter
      ? `${e.studyCenter.name || 'Unknown'}`
      : e.studyCenterId || 'N/A';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Student Enrollments</h2>
          <p className="text-muted-foreground text-sm mt-1.5">All student enrollment data across every stage.</p>
        </div>
        <Button variant="outline" onClick={() => fetchData()} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <SummaryCard label="Fee Pending" count={summary.payment_pending} icon={<Clock className="w-4 h-4" />} active={statusFilter === 'payment_pending'} onClick={() => handleTabChange('payment_pending')} />
          <SummaryCard label="Receipt Uploaded" count={summary.receipt_submitted} icon={<FileText className="w-4 h-4" />} active={statusFilter === 'receipt_submitted'} onClick={() => handleTabChange('receipt_submitted')} />
          <SummaryCard label="Doc Review" count={summary.document_review} icon={<AlertCircle className="w-4 h-4" />} active={statusFilter === 'document_review'} onClick={() => handleTabChange('document_review')} />
          <SummaryCard label="Finance Review" count={summary.finance_review} icon={<Clock className="w-4 h-4" />} active={statusFilter === 'finance_review'} onClick={() => handleTabChange('finance_review')} />
          <SummaryCard label="Enrolled" count={summary.enrolled} icon={<GraduationCap className="w-4 h-4" />} active={statusFilter === 'enrolled'} onClick={() => handleTabChange('enrolled')} />
          <SummaryCard label="Rejected" count={summary.rejected} icon={<XCircle className="w-4 h-4" />} active={statusFilter === 'rejected'} onClick={() => handleTabChange('rejected')} />
          <SummaryCard label="Dept Rejected" count={summary.department_rejected} icon={<Ban className="w-4 h-4" />} active={statusFilter === 'department_rejected'} onClick={() => handleTabChange('department_rejected')} />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-3xl bg-white border border-slate-100 p-4 space-y-4">
        {/* Search first */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, ID..."
              className="pl-11 h-12 text-sm w-full rounded-full bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
            />
          </div>
          <Button type="submit" className="h-12 px-7 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">Search</Button>
        </form>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map(tab => {
            const active = statusFilter === tab.key;
            const count = summary && tab.key ? (summary[tab.key as keyof Summary] ?? 0) : null;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  'inline-flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-full text-sm font-semibold transition-colors border',
                  active
                    ? 'bg-[#8ae47e] border-[#8ae47e] text-[#0b1d14]'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-[#eaf6e6] hover:border-[#cfe9c9]'
                )}
              >
                {tab.label}
                {count !== null ? (
                  <span className={cn('min-w-6 h-6 px-2 rounded-full text-xs flex items-center justify-center tabular-nums', active ? 'bg-white/70 text-[#0b1d14]' : 'bg-slate-100 text-slate-600')}>{count}</span>
                ) : <span className="w-2" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
      ) : enrollments.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-100 py-16 text-center text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><GraduationCap className="w-6 h-6" /></div>
          <p className="text-sm">No enrollments found{statusFilter ? ` with status "${statusFilter.replace('_', ' ')}"` : ''}.</p>
        </div>
      ) : (
        <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f4f6f3] border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Student</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 hidden md:table-cell">Program</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 hidden lg:table-cell">Center</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 hidden sm:table-cell">Fee Paid</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 hidden lg:table-cell">Date</th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedEnrollments.map(e => {
                const meta = STATUS_META[e.status] || { label: e.status, color: 'bg-muted text-muted-foreground', icon: null };
                return (
                  <tr key={e.id} className="hover:bg-[#f7faf6] transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{e.studentName}</p>
                      <p className="text-xs text-muted-foreground">{e.studentEmail}</p>
                      {e.enrollmentNumber && <p className="text-[10px] text-muted-foreground font-mono">{e.enrollmentNumber}</p>}
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell text-muted-foreground">{getProgramName(e)}</td>
                    <td className="px-4 py-4 hidden lg:table-cell text-muted-foreground">{getCenterName(e)}</td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      {e.payment ? (
                        <span className="text-green-600 font-medium">{CS()}{e.payment.amount.toLocaleString()}</span>
                      ) : e.initialPaymentAmount ? (
                        <span className="text-amber-600 font-medium">{CS()}{e.initialPaymentAmount.toLocaleString()} <span className="text-[10px] text-amber-600/80 block mt-0.5">(Pending Approval)</span></span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold', meta.color)}>
                        {meta.icon}{meta.label}
                      </span>
                      {(e.financeRemarks || e.departmentRemarks) && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[160px] truncate" title={e.financeRemarks || e.departmentRemarks}>
                          {e.financeRemarks || e.departmentRemarks}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell text-muted-foreground text-xs">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex gap-1.5 justify-end">
                        <Button size="sm" variant="outline" className="h-8 rounded-full px-3.5 text-xs text-[#256c1d] border-[#cfe9c9] bg-white hover:bg-[#eaf6e6]" onClick={() => setViewStudent(e)}>
                          <Eye className="w-3 h-3 mr-1" />View
                        </Button>
                        {canAct && e.status === 'finance_review' && !e.isProvisional && (
                          <>
                            <Allowed when={mayApprove}><Button size="sm" variant="outline" className="h-8 rounded-full px-3.5 text-xs text-[#256c1d] border-[#cfe9c9] bg-[#eaf6e6] hover:bg-[#dff3da]" onClick={() => handleApprove(e.id)}>
                              <CheckCircle className="w-3 h-3 mr-1" />Enroll
                            </Button></Allowed>
                            <Allowed when={mayApprove}><Button size="sm" variant="outline" className="h-8 rounded-full px-3.5 text-xs text-red-600 border-red-200 bg-white hover:bg-red-50" onClick={() => { setRejectDialog({ open: true, id: e.id }); setRemarks(''); }}>
                              <XCircle className="w-3 h-3 mr-1" />Reject
                            </Button></Allowed>
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

      {/* Pagination (always shown when there are results) */}
      {!loading && enrollments.length > 0 && (() => {
        const pages: (number | '…')[] = [];
        const add = (n: number | '…') => { if (pages[pages.length - 1] !== n) pages.push(n); };
        for (let n = 1; n <= totalPages; n++) {
          if (n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1) add(n);
          else if (pages[pages.length - 1] !== '…') add('…');
        }
        const nav = 'h-9 min-w-9 px-3 rounded-full text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none';
        return (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 rounded-3xl bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-14px_rgba(16,24,40,0.10)]">
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
              <span>
                Showing <span className="font-semibold text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, enrollments.length)}</span> of <span className="font-semibold text-foreground">{enrollments.length.toLocaleString()}</span>
              </span>
              <label className="flex items-center gap-2">
                Rows
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-9 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-700">
                  {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>

            <nav className="flex items-center gap-1" aria-label="Pagination">
              <button type="button" className={`${nav} text-slate-600 hover:bg-[#f4f6f3]`} onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>Previous</button>
              {pages.map((n, i) => n === '…' ? (
                <span key={`e${i}`} className="px-1 text-slate-400">…</span>
              ) : (
                <button key={n} type="button" onClick={() => setPage(n)} aria-current={n === currentPage ? 'page' : undefined}
                  className={`${nav} tabular-nums ${n === currentPage ? 'bg-[#0b1d14] text-white' : 'text-slate-600 hover:bg-[#f4f6f3]'}`}>{n}</button>
              ))}
              <button type="button" className={`${nav} text-slate-600 hover:bg-[#f4f6f3]`} onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages}>Next</button>
            </nav>
          </div>
        );
      })()}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={o => setRejectDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="w-[96vw] sm:max-w-md p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader className="px-7 pt-7 pb-4 text-left">
            <DialogTitle className="text-xl font-semibold tracking-tight">Reject Enrollment</DialogTitle>
            <p className="text-sm text-muted-foreground">Add a reason so the student and team know what to fix.</p>
          </DialogHeader>
          <div className="space-y-2 px-7 pb-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Remarks (required)</Label>
            <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Reason for rejection..." className="h-11 rounded-2xl bg-slate-50 border-slate-200" />
          </div>
          <DialogFooter className="px-7 py-5 gap-2">
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setRejectDialog({ open: false, id: '' })}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-red-600 hover:bg-red-700 text-white" onClick={handleReject} disabled={!remarks.trim()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Student Details Dialog */}
      <Dialog open={!!viewStudent} onOpenChange={o => !o && setViewStudent(null)}>
        <DialogContent className="w-[96vw] sm:max-w-3xl p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader className="px-7 pt-7 pb-4 text-left shrink-0 border-b border-slate-100">
            <DialogTitle className="text-xl font-semibold tracking-tight">Enrollment Details</DialogTitle>
          </DialogHeader>
          {viewStudent && (
            <div className="space-y-6 px-7 py-6 text-sm overflow-y-auto flex-1">

              {/* Photo + Identity */}
              <div className="flex gap-5 items-start">
                <div className="shrink-0">
                  {(viewStudent.student?.photo || viewStudent.photo) ? (
                    <img src={getDocUrl((viewStudent.student?.photo || viewStudent.photo) as string)} alt="Student" className="w-24 h-24 rounded-2xl object-cover border border-slate-100" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-[#eaf6e6] flex items-center justify-center">
                      <GraduationCap className="w-10 h-10 text-[#256c1d]" />
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
                <h4 className="text-xs font-semibold uppercase tracking-widest text-[#256c1d] mb-3 border-b border-slate-100 pb-2">Program &amp; University</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Program" value={(viewStudent as any).program?.name ? `${(viewStudent as any).program.name} (${(viewStudent as any).program.code})` : getProgramName(viewStudent)} />
                  <Field
                    label="University"
                    value={
                      (viewStudent as any).program?.university?.name ? (
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <span>{(viewStudent as any).program.university.name}</span>
                          {(viewStudent as any).program.university.isAcademicPartnerOnly && (
                            <Badge variant="outline" className="text-[9px] h-3.5 px-1 bg-purple-50 text-purple-700 border-purple-200">
                              Academic Partner
                            </Badge>
                          )}
                        </span>
                      ) : null
                    }
                  />
                  <Field label="Univ. Code" value={(viewStudent as any).program?.university?.code} />
                  <Field label="Univ. Address" value={(viewStudent as any).program?.university?.address} />
                  <Field label="Session" value={(viewStudent as any).session?.name} />
                  <Field label="Academic Partner" value={getCenterName(viewStudent)} />
                  <Field label="Status" value={STATUS_META[viewStudent.status]?.label || viewStudent.status} />
                </div>
              </div>

              {/* Fee Details */}
              {(feeRows.length > 0 || viewStudent.payment || viewStudent.initialPaymentAmount) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-[#256c1d] mb-3 border-b border-slate-100 pb-2">Fee Details</h4>
                  {feeRows.length > 0 && relevantFee && (
                    <div className="rounded-lg border overflow-hidden mb-3">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Fee Type</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {feeRows.map((r, j) => (
                            <tr key={j}>
                              <td className="px-3 py-2">{r.label} <span className="text-muted-foreground capitalize">({relevantFee.billingCycle || 'per year'})</span></td>
                              <td className="px-3 py-2 text-right font-medium text-green-600">{CS()}{Number(r.val).toLocaleString()}</td>
                            </tr>
                          ))}
                          {feeRows.length > 1 && (
                            <tr className="bg-muted/30 font-semibold border-t">
                              <td className="px-3 py-2 text-foreground">Total Fee</td>
                              <td className="px-3 py-2 text-right text-foreground font-bold">{CS()}{totalProgramFee.toLocaleString()}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {viewStudent.payment && (
                    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                        <div>
                          <p className="font-semibold text-green-700">Fee Paid: {CS()}{viewStudent.payment.amount?.toLocaleString()}</p>
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
                  {!viewStudent.payment && viewStudent.initialPaymentAmount ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <p className="text-amber-700 font-medium text-xs">Initial Fee Claimed</p>
                        <p className="font-semibold text-amber-700">{CS()}{viewStudent.initialPaymentAmount.toLocaleString()}</p>
                      </div>
                    </div>
                  ) : !viewStudent.payment && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100">
                      <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                      <p className="text-orange-700 font-medium text-xs">Fee not yet received</p>
                    </div>
                  )}
                </div>
              )}

              {/* Personal Details */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-[#256c1d] mb-3 border-b border-slate-100 pb-2">Personal Details</h4>
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
                <h4 className="text-xs font-semibold uppercase tracking-widest text-[#256c1d] mb-3 border-b border-slate-100 pb-2">Uploaded Documents</h4>
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
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-[#256c1d] mb-3 border-b border-slate-100 pb-2 flex justify-between items-center">
                    Payment Receipt
                    {viewStudent.receiptVerified && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">VERIFIED</span>}
                  </h4>
                  <div className="p-4 rounded-2xl bg-[#f4f6f3] flex items-start gap-4">
                    {viewStudent.receiptUrl ? (
                      <>
                        <a href={api.getFileUrl(viewStudent.receiptUrl)} target="_blank" rel="noreferrer" className="w-20 h-20 rounded border bg-white overflow-hidden shrink-0 block">
                          <img src={api.getFileUrl(viewStudent.receiptUrl)} alt="Receipt" className="w-full h-full object-cover" />
                        </a>
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">Receipt Uploaded</p>
                          {!viewStudent.receiptVerified && canAct ? (
                            viewStudent.isProvisional ? (
                              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs mt-2">
                                <span className="font-semibold">⚠️ Provisional Enrollment:</span> Receipt verification and admission invoice generation must be done through the <strong>Provisional Verifications</strong> tab.
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <Allowed when={mayApprove}><Button size="sm" className="h-9 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => handleVerifyReceipt(viewStudent.id)}>
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                  Verify Receipt & Enroll
                                </Button></Allowed>
                                <Allowed when={mayApprove}><Button size="sm" variant="outline" className="h-9 rounded-full text-red-600 border-red-200 bg-white hover:bg-red-50" onClick={() => {
                                  setRejectDialog({ open: true, id: viewStudent.id });
                                  setRemarks('');
                                }}>
                                  <XCircle className="w-3.5 h-3.5 mr-1" />
                                  Reject Receipt
                                </Button></Allowed>
                              </div>
                            )
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">{viewStudent.receiptVerified ? 'Receipt has been verified and student enrolled.' : 'Awaiting verification by Finance.'}</p>
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

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#f4f6f3] px-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-0.5">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value || <span className="text-muted-foreground italic">N/A</span>}</span>
    </div>
  );
}

function SummaryCard({ label, count, icon, active, onClick }: { label: string; count: number; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left rounded-3xl p-5 flex items-center justify-between gap-3 border transition-all hover:-translate-y-0.5',
        active ? 'bg-[#eaf6e6] border-[#8ae47e]' : 'bg-white border-slate-100 hover:border-[#cfe9c9]'
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
        <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-1.5">{count}</p>
      </div>
      <div className={cn('w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center', active ? 'bg-white text-[#256c1d]' : 'bg-[#eaf6e6] text-[#256c1d]')}>{icon}</div>
    </button>
  );
}
