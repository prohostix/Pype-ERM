import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Eye, FileText, User, Search, Download, School, GraduationCap, X, ChevronDown, Building2, CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { mayOn } from '@/lib/access';

const getDocUrl = (url: string) => {
  return api.getFileUrl(url);
};

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
  specialisation?: string;
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
  documents?: any[];
  photoStatus?: string;
  photo?: string;
  salesUser?: { name: string };
  assignedOpsSubAdminName?: string;
  isUpgrade?: boolean;
  previousProgramId?: string;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  payment_pending: { label: 'Fee Pending', color: 'bg-amber-50 text-amber-700' },
  receipt_submitted: { label: 'Receipt Submitted & Ops Pending', color: 'bg-amber-50 text-amber-700' },
  document_review: { label: 'Document Review', color: 'bg-[#eaf6e6] text-[#256c1d]' },
  dept_review: { label: 'Dept Review', color: 'bg-[#eaf6e6] text-[#256c1d]' },
  ops_upgrade_verification: { label: 'Upgrade Verification', color: 'bg-[#e3f7dd] text-[#1f6a17]' },
  finance_review: { label: 'Finance Review', color: 'bg-amber-50 text-amber-700' },
  university_review: { label: 'Univ. Review', color: 'bg-[#eaf6e6] text-[#256c1d]' },
  enrolled: { label: 'Enrolled', color: 'bg-[#e3f7dd] text-[#1f6a17]' },
  rejected: { label: 'Rejected', color: 'bg-rose-50 text-rose-700' },
  department_rejected: { label: 'Dept Rejected', color: 'bg-rose-50 text-rose-700' },
  ops_rejected: { label: 'Ops Rejected', color: 'bg-rose-50 text-rose-700' },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status.replace(/_/g, ' '), color: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl bg-[#f4f6f3] dark:bg-muted/30 px-4 py-3 min-w-0">
      <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">{label}</span>
      <span className="text-sm font-semibold break-words">{value || <span className="text-muted-foreground font-normal italic">N/A</span>}</span>
    </div>
  );
}

export function DeptEnrollmentReviewPanel() {
  const { user } = useAuth();
  // Branch managers, the CEO and the General Manager can look at applications but not approve or reject them.
  const readOnly = ['branch_manager', 'ceo', 'general_manager'].includes(user?.role || '');
  // The role decides unless an Org Admin has set something for this user (the server enforces it)
  const mayEdit = mayOn(user, 'admission_review', 'edit', !readOnly);
  const mayApprove = mayOn(user, 'admission_review', 'approve', !readOnly);
  // Someone given this page checks documents through the review requests, which keep them to their branch
  const granted = user?.access?.admission_review?.view?.byDefault === false;
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [viewStudent, setViewStudent] = useState<Enrollment | null>(null);
  const [remarks, setRemarks] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterUniversity, setFilterUniversity] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterSalesUser, setFilterSalesUser] = useState('');
  const [filterSubAdmin, setFilterSubAdmin] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; index: number; type?: string; name?: string; status?: string } | null>(null);

  // unique lists from enrollments
  const branches = Array.from(new Set(enrollments.map(e => e?.studyCenter?.name).filter(Boolean))) as string[];
  const universities = Array.from(new Set(enrollments.map(e => e?.program?.university?.name).filter(Boolean))) as string[];
  const batches = Array.from(new Set(enrollments.map(e => e?.session?.name).filter(Boolean))) as string[];
  const salesUsers = Array.from(new Set(enrollments.map(e => e?.salesUser?.name).filter(Boolean))) as string[];
  const subAdmins = Array.from(new Set(enrollments.map(e => e?.assignedOpsSubAdminName).filter(Boolean))) as string[];

  const filteredEnrollments = enrollments.filter(e => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        e.studentName.toLowerCase().includes(q) ||
        e.studentEmail.toLowerCase().includes(q) ||
        (e.enrollmentNumber && e.enrollmentNumber.toLowerCase().includes(q)) ||
        (e.program?.name && e.program.name.toLowerCase().includes(q)) ||
        (e.program?.code && e.program.code.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    if (filterBranch && e.studyCenter?.name !== filterBranch) return false;
    if (filterUniversity && e.program?.university?.name !== filterUniversity) return false;
    if (filterBatch && e.session?.name !== filterBatch) return false;
    if (filterSalesUser && e.salesUser?.name !== filterSalesUser) return false;
    if (filterSubAdmin && e.assignedOpsSubAdminName !== filterSubAdmin) return false;

    return true;
  });

  // Pagination over the filtered list; any filter or tab change returns to the first page
  const [pageSize, setPageSize] = useState(10);
  const PAGE_SIZE = pageSize;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredEnrollments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedEnrollments = filteredEnrollments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [pageSize, tab, searchQuery, filterBranch, filterUniversity, filterBatch, filterSalesUser, filterSubAdmin]);

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

  const handleApprove = async (enrollmentId: string) => {
    // Check if the enrollment can be approved
    const enrollmentData = enrollments.find(e => e.id === enrollmentId);
    if (enrollmentData) {
      const docs = Array.isArray(enrollmentData.student?.documents) ? enrollmentData.student.documents
        : Array.isArray(enrollmentData.documents) ? enrollmentData.documents : [];
      const unapprovedDocs = docs.filter((d: any) => d && d.status !== 'approved');
      const photoStatus = enrollmentData.student?.admissionProgress?.photoStatus || enrollmentData.photoStatus || 'approved'; // if no student, photo doesn't block unless we track it

      if (unapprovedDocs.length > 0 || photoStatus !== 'approved') {
        toast.error('All documents and the student photo must be approved first.');
        return;
      }
    }

    try {
      await api.put(`/enrollment/review/${enrollmentId}/approve`);
      toast.success('Approved — forwarded to Finance');
      fetchData();
      setViewStudent(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const handleDocAction = async (studentId: string, enrollmentId: string, docIndex: number, status: string) => {
    try {
      if (studentId && !granted) {
        await api.put(`/students/${studentId}/documents/${docIndex}/status`, { status });
      } else {
        await api.put(`/enrollment/review/${enrollmentId}/documents/${docIndex}/status`, { status });
      }
      toast.success(`Document marked as ${status}`);

      // Refresh the viewStudent data
      if (viewStudent) {
        if (viewStudent.student) {
          const updatedDocs = [...viewStudent.student.documents];
          updatedDocs[docIndex] = { ...updatedDocs[docIndex], status };
          setViewStudent({
            ...viewStudent,
            student: { ...viewStudent.student, documents: updatedDocs }
          });
        } else {
          const updatedDocs = [...(viewStudent.documents || [])];
          updatedDocs[docIndex] = { ...updatedDocs[docIndex], status };
          setViewStudent({
            ...viewStudent,
            documents: updatedDocs
          });
        }
        fetchData();
      }
    } catch (e: any) {
      toast.error('Failed to update document status');
    }
  };

  const handlePhotoAction = async (studentId: string, enrollmentId: string, status: string) => {
    try {
      if (studentId && !granted) {
        await api.put(`/students/${studentId}/photo/status`, { status });
      } else {
        await api.put(`/enrollment/review/${enrollmentId}/photo/status`, { status });
      }
      toast.success(`Photo marked as ${status}`);
      // Refresh the viewStudent data
      if (viewStudent) {
        if (viewStudent.student) {
          const progress = viewStudent.student.admissionProgress || {};
          setViewStudent({
            ...viewStudent,
            student: { ...viewStudent.student, admissionProgress: { ...progress, photoStatus: status } }
          });
        } else {
          setViewStudent({
            ...viewStudent,
            photoStatus: status
          });
        }
        fetchData();
      }
    } catch (e: any) {
      toast.error('Failed to update photo status');
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

  const val = (enrollment: Enrollment, enrollKey: string, studentKey?: string): string | null => {
    const direct = (enrollment as any)[enrollKey];
    if (direct && typeof direct === 'string') return direct;
    if (studentKey && enrollment.student?.[studentKey]) return String(enrollment.student[studentKey]);
    return null;
  };

  const formatDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-IN') : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Enrollment Review</h2>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-2xl">
            {tab === 'pending' ? 'Review and approve student enrollments before finance processing.' : 'Enrollments already reviewed by this department.'}
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchData()} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 text-sm font-medium gap-2 shadow-sm hover:bg-slate-50 shrink-0 self-start lg:self-auto">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {(() => {
        const activeCount = [filterBranch, filterUniversity, filterBatch, filterSalesUser, filterSubAdmin, searchQuery.trim()].filter(Boolean).length;
        const clearAll = () => { setFilterBranch(''); setFilterUniversity(''); setFilterBatch(''); setFilterSalesUser(''); setFilterSubAdmin(''); setSearchQuery(''); };
        return (
          <div className="rounded-3xl bg-white dark:bg-card p-4 sm:p-5 space-y-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.10)]">
            {/* Row 1: tabs + result count */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Tabs value={tab} onValueChange={v => setTab(v as 'pending' | 'completed')}>
                <TabsList className="h-auto p-1 rounded-full bg-[#f4f6f3] w-fit">
                  <TabsTrigger value="pending" className="rounded-full px-6 h-9 text-sm font-semibold data-[state=active]:bg-[#0b1d14] data-[state=active]:text-white data-[state=active]:shadow-none">Pending</TabsTrigger>
                  <TabsTrigger value="completed" className="rounded-full px-6 h-9 text-sm font-semibold data-[state=active]:bg-[#0b1d14] data-[state=active]:text-white data-[state=active]:shadow-none">Completed</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{filteredEnrollments.length}</span> {filteredEnrollments.length === 1 ? 'enrollment' : 'enrollments'}
                  {activeCount > 0 && <> · {activeCount} filter{activeCount === 1 ? '' : 's'}</>}
                </span>
                {activeCount > 0 && (
                  <Button type="button" variant="ghost" onClick={clearAll} className="h-9 px-4 rounded-full text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5">
                    <X className="w-3.5 h-3.5" /> Clear all
                  </Button>
                )}
              </div>
            </div>

            {/* Row 2: search */}
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by student name, email or enrollment number..."
                className="h-11 pl-11 pr-4 w-full rounded-full bg-[#f4f6f3] border-transparent text-sm focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Row 3: filter dropdowns, one line on wide screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className={`h-11 w-full pl-10 pr-8 rounded-full text-sm outline-none cursor-pointer appearance-none border transition-colors focus:ring-4 focus:ring-[#54b947]/20 focus:border-[#54b947] ${filterBranch ? 'bg-[#eaf6e6] border-[#54b947]/50 text-[#1f6a17] font-semibold' : 'bg-[#f4f6f3] border-transparent text-slate-600'}`}>
                  <option value="">All branches</option>
                  {branches.map((o: string) => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
              <div className="relative">
                <GraduationCap className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <select value={filterUniversity} onChange={(e) => setFilterUniversity(e.target.value)} className={`h-11 w-full pl-10 pr-8 rounded-full text-sm outline-none cursor-pointer appearance-none border transition-colors focus:ring-4 focus:ring-[#54b947]/20 focus:border-[#54b947] ${filterUniversity ? 'bg-[#eaf6e6] border-[#54b947]/50 text-[#1f6a17] font-semibold' : 'bg-[#f4f6f3] border-transparent text-slate-600'}`}>
                  <option value="">All universities</option>
                  {universities.map((o: string) => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <select value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} className={`h-11 w-full pl-10 pr-8 rounded-full text-sm outline-none cursor-pointer appearance-none border transition-colors focus:ring-4 focus:ring-[#54b947]/20 focus:border-[#54b947] ${filterBatch ? 'bg-[#eaf6e6] border-[#54b947]/50 text-[#1f6a17] font-semibold' : 'bg-[#f4f6f3] border-transparent text-slate-600'}`}>
                  <option value="">All batches</option>
                  {batches.map((o: string) => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
              {salesUsers.length > 1 && (
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <select value={filterSalesUser} onChange={(e) => setFilterSalesUser(e.target.value)} className={`h-11 w-full pl-10 pr-8 rounded-full text-sm outline-none cursor-pointer appearance-none border transition-colors focus:ring-4 focus:ring-[#54b947]/20 focus:border-[#54b947] ${filterSalesUser ? 'bg-[#eaf6e6] border-[#54b947]/50 text-[#1f6a17] font-semibold' : 'bg-[#f4f6f3] border-transparent text-slate-600'}`}>
                  <option value="">All sales users</option>
                  {salesUsers.map((o: string) => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
              )}
              {subAdmins.length > 1 && (
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <select value={filterSubAdmin} onChange={(e) => setFilterSubAdmin(e.target.value)} className={`h-11 w-full pl-10 pr-8 rounded-full text-sm outline-none cursor-pointer appearance-none border transition-colors focus:ring-4 focus:ring-[#54b947]/20 focus:border-[#54b947] ${filterSubAdmin ? 'bg-[#eaf6e6] border-[#54b947]/50 text-[#1f6a17] font-semibold' : 'bg-[#f4f6f3] border-transparent text-slate-600'}`}>
                  <option value="">All sub admins</option>
                  {subAdmins.map((o: string) => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* List */}
      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-28 bg-[#f4f6f3] rounded-3xl animate-pulse" />)}</div>
      ) : filteredEnrollments.length === 0 ? (
        <Card className="rounded-3xl border border-dashed border-slate-300 shadow-none">
          <CardContent className="py-16 text-center text-muted-foreground">
            {tab === 'pending' ? 'No enrollments pending review.' : 'No completed reviews yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pagedEnrollments.map(e => {
            const studentData = e.student;
            let canApprove = true;
            if (studentData) {
              const docs = Array.isArray(studentData.documents) ? studentData.documents : [];
              const unapprovedDocs = docs.filter((d: any) => d && d.status !== 'approved');
              const photoStatus = studentData.admissionProgress?.photoStatus;
              if (unapprovedDocs.length > 0 || photoStatus !== 'approved') {
                canApprove = false;
              }
            }

            return (
              <Card key={e.id} className="rounded-3xl gap-0 hover:-translate-y-0.5 transition-all duration-300">
                <CardContent className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Student Photo Thumbnail */}
                    <div className="shrink-0 relative">
                      {e.student?.photo ? (
                        <img src={getDocUrl(e.student.photo)} alt="Student" className="w-14 h-14 rounded-2xl object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] flex items-center justify-center">
                          <User className="w-5 h-5 text-[#256c1d]" />
                        </div>
                      )}
                      {e.student?.admissionProgress?.photoStatus === 'approved' && (
                        <div className="absolute -bottom-1 -right-1 bg-[#54b947] text-white rounded-full p-[2px] ring-2 ring-white">
                          <CheckCircle className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <StatusBadge status={e.status} />
                        {(e.isUpgrade || e.status === 'ops_upgrade_verification') && (
                          <Badge className="bg-[#8ae47e] hover:bg-[#8ae47e] text-[#0b1d14] text-[11px] font-semibold rounded-full border-0">
                            🎓 Program Upgrade
                          </Badge>
                        )}
                        {e.enrollmentNumber && <span className="text-[11px] font-mono bg-[#f1f3ef] text-slate-600 px-2.5 py-1 rounded-full">{e.enrollmentNumber}</span>}
                      </div>
                      <h4 className="font-semibold text-lg text-foreground">{e.studentName}</h4>
                      <div className="flex items-center gap-x-4 gap-y-1.5 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <span>{e.studentEmail}</span>
                        {e.program && <span>{e.program.name} ({e.program.code})</span>}

                        {e.studyCenter ? (
                          <span className="font-medium text-amber-700 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full"><School className="w-3 h-3" /> Center: {e.studyCenter.name}</span>
                        ) : e.salesUser ? (
                          <span className="font-medium text-[#256c1d] flex items-center gap-1 bg-[#eaf6e6] px-2.5 py-1 rounded-full"><User className="w-3 h-3" /> Sales: {e.salesUser.name}</span>
                        ) : (
                          <span className="font-medium text-slate-600 bg-[#f1f3ef] px-2.5 py-1 rounded-full">Direct Enrollment</span>
                        )}

                        {e.assignedOpsSubAdminName && (
                          <span className="font-medium text-slate-600 flex items-center gap-1 bg-[#f1f3ef] px-2.5 py-1 rounded-full">
                            <User className="w-3 h-3" /> Assigned To: {e.assignedOpsSubAdminName}
                          </span>
                        )}

                        <span>{new Date(e.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                      {/* Show dept remarks on completed tab */}
                      {tab === 'completed' && e.departmentRemarks && (
                        <p className="text-xs mt-2 text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full inline-block">
                          Rejected: {e.departmentRemarks}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button variant="outline" className="h-10 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6] hover:text-[#256c1d] font-semibold" onClick={() => setViewStudent(e)}>
                      <Eye className="w-4 h-4 mr-1" />View
                    </Button>
                    {tab === 'pending' && mayApprove && (
                      <>
                        <Button
                          className={cn("h-10 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold shadow-none", !canApprove && "opacity-50 cursor-not-allowed")}
                          onClick={() => canApprove ? handleApprove(e.id) : toast.error("All documents and the photo must be explicitly approved first.")}
                          disabled={!canApprove}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />Approve
                        </Button>
                        <Button variant="outline" className="h-10 px-5 rounded-full bg-white border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold"
                          onClick={() => { setRejectDialog({ open: true, id: e.id }); setRemarks(''); }}>
                          <XCircle className="w-4 h-4 mr-1" />Reject
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination (always shown when there are results) */}
      {!loading && filteredEnrollments.length > 0 && (() => {
        const pages: (number | '…')[] = [];
        const add = (n: number | '…') => { if (pages[pages.length - 1] !== n) pages.push(n); };
        for (let n = 1; n <= totalPages; n++) {
          if (n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1) add(n);
          else if (pages[pages.length - 1] !== '…') add('…');
        }
        const nav = 'h-9 min-w-9 px-3 rounded-full text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none';
        return (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 rounded-3xl bg-white dark:bg-card px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-14px_rgba(16,24,40,0.10)]">
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
              <span>
                Showing <span className="font-semibold text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredEnrollments.length)}</span> of <span className="font-semibold text-foreground">{filteredEnrollments.length.toLocaleString()}</span>
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
        <DialogContent className="w-[95vw] sm:max-w-md p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white">
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><XCircle className="w-5 h-5" /></div>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-left">Reject Enrollment</DialogTitle>
              <p className="text-sm text-muted-foreground">The student and the sales team will see your reason.</p>
            </DialogHeader>
          </div>
          <div className="px-6 sm:px-8 pb-5 space-y-1.5">
            <Label className="text-sm font-semibold">Remarks <span className="text-rose-500">*</span></Label>
            <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Reason for rejection..." className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" />
          </div>
          <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
            <Button variant="ghost" onClick={() => setRejectDialog({ open: false, id: '' })} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
            <Button onClick={handleReject} disabled={!remarks.trim()} className="h-11 rounded-full px-8 bg-rose-600 hover:bg-rose-700 text-white font-semibold">Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Student Details Dialog */}
      <Dialog open={!!viewStudent} onOpenChange={o => !o && setViewStudent(null)}>
        <DialogContent className="w-[96vw] sm:max-w-3xl max-h-[92vh] p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white flex flex-col" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
            <DialogHeader className="space-y-1 text-left min-w-0 flex-1">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-left">Student Enrollment Details</DialogTitle>
              {viewStudent && (
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={viewStudent.status} />
                  <span className="text-sm text-muted-foreground truncate">{viewStudent.studentName}{viewStudent.enrollmentNumber ? ` · ${viewStudent.enrollmentNumber}` : ''}</span>
                </div>
              )}
            </DialogHeader>
          </div>
          {viewStudent && (
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-8 space-y-8 border-t border-slate-100 pt-6">

              {/* Program Upgrade Comparison Card */}
              {Boolean(viewStudent.isUpgrade || viewStudent.status === 'ops_upgrade_verification') && (
                <div className="p-5 rounded-3xl bg-[#eaf6e6] dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-sm font-semibold text-[#1f6a17] dark:text-emerald-200">
                      Completed Student Program Upgrade Request
                    </h4>
                    <Badge className="bg-[#8ae47e] hover:bg-[#8ae47e] text-[#0b1d14] text-[11px] ml-auto font-semibold rounded-full border-0">Alumni Upgrade</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/70 text-xs">
                    <div>
                      <span className="font-medium text-slate-500 block mb-1">Previous Completed Program</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {viewStudent.student?.program?.name || 'Previous Program'}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        {viewStudent.student?.program?.university?.name || viewStudent.student?.university?.name || 'Partner University'}
                      </p>
                      <p className="text-slate-500">Enrollment / Roll No: {viewStudent.student?.enrollmentNo || viewStudent.student?.admissionNo || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-[#256c1d] block mb-1">Target New Program Applied</span>
                      <p className="font-bold text-emerald-950 dark:text-emerald-100 text-sm">
                        {viewStudent.program?.name || 'New Program'}
                      </p>
                      <p className="text-emerald-800 dark:text-emerald-300 mt-0.5">
                        {viewStudent.program?.university?.name} • Session: {viewStudent.session?.name || 'Current'}
                      </p>
                      <p className="text-slate-500">Sales Representative: {viewStudent.salesUser?.name || 'Direct'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo + Identity */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="w-24 shrink-0 flex flex-col items-center gap-2">
                  <div className="relative">
                    {(viewStudent.student?.photo || viewStudent.photo) ? (
                      <button onClick={() => setPreviewDoc({ url: viewStudent.student?.photo || viewStudent.photo, index: -1, type: 'Student Photo' })}>
                        <img src={getDocUrl((viewStudent.student?.photo || viewStudent.photo))} alt="Student" className="w-24 h-24 rounded-3xl object-cover hover:opacity-80 transition-opacity cursor-pointer" />
                      </button>
                    ) : (
                      <div className="w-24 h-24 rounded-3xl bg-[#eaf6e6] flex items-center justify-center">
                        <User className="w-10 h-10 text-[#256c1d]" />
                      </div>
                    )}
                    {(viewStudent.student?.admissionProgress?.photoStatus === 'approved' || viewStudent.photoStatus === 'approved') && (
                      <div className="absolute -top-2 -right-2 bg-[#54b947] text-white rounded-full p-1 ring-2 ring-white">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    )}
                    {(viewStudent.student?.admissionProgress?.photoStatus === 'rejected' || viewStudent.photoStatus === 'rejected') && (
                      <div className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 ring-2 ring-white">
                        <XCircle className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  {tab === 'pending' && mayEdit && (viewStudent.student?.photo || viewStudent.photo) && (!(viewStudent.student?.admissionProgress?.photoStatus || viewStudent.photoStatus) || (viewStudent.student?.admissionProgress?.photoStatus || viewStudent.photoStatus) === 'pending') && (
                    <div className="flex gap-1 w-full mt-1">
                      <button
                        onClick={() => handlePhotoAction(viewStudent.student?.id, viewStudent.id, 'approved')}
                        title="Approve Photo"
                        className="flex-1 py-1.5 flex justify-center bg-[#e3f7dd] text-[#1f6a17] hover:bg-[#54b947] hover:text-white rounded-full transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePhotoAction(viewStudent.student?.id, viewStudent.id, 'rejected')}
                        title="Reject Photo"
                        className="flex-1 py-1.5 flex justify-center bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-full transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
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
                <h4 className="text-lg font-semibold text-foreground mb-4">Program &amp; Institution</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoField label="Program" value={viewStudent.program ? `${viewStudent.program.name} (${viewStudent.program.code})${viewStudent.specialisation ? ` - ${viewStudent.specialisation}` : ''}` : null} />
                  <InfoField label="University" value={viewStudent.program?.university?.name} />
                  <InfoField label="Academic Partner" value={viewStudent.studyCenter?.name} />
                  <InfoField label="Session" value={viewStudent.session?.name} />
                </div>
              </div>

              {/* Personal Details */}
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-4">Personal Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoField label="Gender" value={val(viewStudent, 'gender', 'gender')} />
                  <InfoField label="Category" value={val(viewStudent, 'category', 'category')} />
                  <InfoField label="Religion" value={val(viewStudent, 'religion', 'religion')} />
                  <InfoField label="Marital Status" value={val(viewStudent, 'maritalStatus', 'maritalStatus')} />
                  <InfoField label="Employment Status" value={val(viewStudent, 'employmentStatus', 'employmentStatus')} />
                  <InfoField label="Caste" value={val(viewStudent, 'caste', 'caste')} />
                  <InfoField label="Father's Name" value={val(viewStudent, 'fatherName', 'fatherName')} />
                  <InfoField label="Mother's Name" value={val(viewStudent, 'motherName', 'motherName')} />
                  <InfoField label="Father's Phone" value={val(viewStudent, 'fatherPhone', 'fatherPhone')} />
                  <InfoField label="Mother's Phone" value={val(viewStudent, 'motherPhone', 'motherPhone')} />
                  <InfoField label="Guardian's Name" value={val(viewStudent, 'guardianName', 'guardianName')} />
                  <InfoField label="Family Phone" value={val(viewStudent, 'familyPhone', 'familyPhone')} />
                  <InfoField label="Address" value={val(viewStudent, 'studentAddress', 'address')} />
                  <InfoField label="Pin Code" value={val(viewStudent, 'pinCode', 'pinCode')} />
                </div>
              </div>

              {/* Enrollment Status & History */}
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-4">Enrollment Status</h4>
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
                      <div className="text-xs bg-rose-50 rounded-2xl px-4 py-3">
                        <span className="font-semibold text-rose-700">Dept remarks: </span>
                        <span className="text-rose-600">{viewStudent.departmentRemarks}</span>
                      </div>
                    )}
                    {viewStudent.financeRemarks && (
                      <div className="text-xs bg-amber-50 rounded-2xl px-4 py-3">
                        <span className="font-semibold text-amber-700">Finance remarks: </span>
                        <span className="text-amber-600">{viewStudent.financeRemarks}</span>
                      </div>
                    )}
                    {viewStudent.universityRemarks && (
                      <div className="text-xs bg-[#eaf6e6] rounded-2xl px-4 py-3">
                        <span className="font-semibold text-[#256c1d]">University remarks: </span>
                        <span className="text-[#1f6a17]">{viewStudent.universityRemarks}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline */}
                {Array.isArray(viewStudent.statusHistory) && viewStudent.statusHistory.length > 0 && (
                  <div className="relative pl-5 border-l-2 border-slate-200 space-y-4">
                    {[...viewStudent.statusHistory].reverse().map((h, i) => {
                      const rawDate = h.changedAt && !isNaN(new Date(h.changedAt).getTime())
                        ? h.changedAt
                        : viewStudent.createdAt;
                      const displayDate = new Date(rawDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={i} className="relative">
                          <div className="absolute -left-[1.6rem] top-1 w-3 h-3 rounded-full bg-[#54b947] ring-4 ring-white" />
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <StatusBadge status={h.status} />
                              {h.remarks && <p className="text-xs text-muted-foreground mt-1">{h.remarks}</p>}
                            </div>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                              {displayDate}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Documents */}
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-4">Uploaded Documents</h4>
                {(() => {
                  const docs: any[] = Array.isArray(viewStudent.student?.documents)
                    ? viewStudent.student.documents.filter(Boolean)
                    : Array.isArray(viewStudent.documents)
                      ? viewStudent.documents.filter(Boolean)
                      : [];
                  return docs.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-2">No documents uploaded.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {docs.map((doc: any, i: number) => (
                        <div key={i} className="relative flex flex-col rounded-2xl bg-[#f4f6f3] dark:bg-muted/30 group">
                          {doc.url && (
                            <a
                              href={getDocUrl(doc.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={doc.name || 'document'}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-full text-muted-foreground hover:text-[#256c1d] hover:bg-[#eaf6e6] shadow-sm transition-all z-10"
                              title="Download document"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => setPreviewDoc({ ...doc, index: i })}
                            className="flex items-center gap-3 p-4 hover:bg-[#eaf6e6] transition-colors w-full text-left rounded-t-2xl">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#256c1d] shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1 pr-4">
                              <p className="text-sm font-medium truncate flex items-center gap-2">
                                {doc.type || 'Document'}
                                {doc.status === 'approved' && <CheckCircle className="w-3.5 h-3.5 text-[#54b947]" />}
                                {doc.status === 'rejected' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{doc.name || 'Click to preview'}</p>
                            </div>
                          </button>
                          {tab === 'pending' && mayEdit && (!doc.status || doc.status === 'pending') && (
                            <div className="flex border-t border-white divide-x divide-white overflow-hidden rounded-b-2xl">
                              <button
                                onClick={() => handleDocAction(viewStudent.student?.id, viewStudent.id, i, 'approved')}
                                className="flex-1 py-2 text-[11px] font-semibold text-[#1f6a17] hover:bg-[#e3f7dd] transition-colors flex items-center justify-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => handleDocAction(viewStudent.student?.id, viewStudent.id, i, 'rejected')}
                                className="flex-1 py-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center gap-1"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{previewDoc?.type || 'Document Preview'}</span>
              <div className="flex items-center gap-2 mr-6">
                {viewStudent && tab === 'pending' && mayEdit && previewDoc?.index !== -1 && (!previewDoc?.status || previewDoc?.status === 'pending') && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-success border-success hover:bg-success/10"
                      onClick={() => {
                        if (!previewDoc) return;
                        handleDocAction(viewStudent.student?.id, viewStudent.id, previewDoc.index, 'approved');
                        setPreviewDoc(null);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (!previewDoc) return;
                        handleDocAction(viewStudent.student?.id, viewStudent.id, previewDoc.index, 'rejected');
                        setPreviewDoc(null);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" asChild>
                  <a href={previewDoc ? getDocUrl(previewDoc.url) : '#'} target="_blank" rel="noopener noreferrer">
                    Open Original
                  </a>
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-muted/30 rounded-md overflow-hidden relative flex items-center justify-center">
            {previewDoc && (
              previewDoc.url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/) ? (
                <img src={getDocUrl(previewDoc.url)} alt="Preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <iframe src={getDocUrl(previewDoc.url)} className="w-full h-full border-0" title="Document Preview" />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
