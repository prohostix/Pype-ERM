import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { StudentsPanel } from './StudentsPanel';
import { ListPagination } from '@/components/ui/list-pagination';

import { CS } from '@/lib/currency';
export function SalesAdminReviewPanel() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'pending' | 'rejected'>('pending');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // Re-requesting a rejected application opens the same full enrollment form
  const [reopening, setReopening] = useState<any | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean, id: string }>({ open: false, id: '' });
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);
  const [detailDialog, setDetailDialog] = useState<{ open: boolean, enrollment: any | null }>({ open: false, enrollment: null });

  useEffect(() => {
    fetchReviews();
  }, [view]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/sales-admin-reviews', { params: view === 'rejected' ? { view: 'rejected' } : {} });
      setEnrollments(res.data.data || []);
    } catch (err: any) {
      toast.error('Failed to load pending reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!window.confirm('Are you sure you want to approve this application and forward it to Operations?')) return;
    setProcessing(true);
    try {
      await api.put(`/sales/student-applications/${id}/sales-admin-approve`);
      toast.success('Application approved and sent to Operations!');
      setDetailDialog({ open: false, enrollment: null });
      fetchReviews();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!remarks.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setProcessing(true);
    try {
      await api.put(`/sales/student-applications/${rejectDialog.id}/sales-admin-reject`, { remarks });
      toast.success('Application rejected back to sales user');
      setRejectDialog({ open: false, id: '' });
      setRemarks('');
      setDetailDialog({ open: false, enrollment: null });
      fetchReviews();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = enrollments.filter(e => 
    e.studentName?.toLowerCase().includes(search.toLowerCase()) || 
    e.enrollmentNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const DetailRow = ({ label, value }: { icon?: any, label: string, value: any }) => (
    <div className="py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900 break-words mt-0.5">{value || '—'}</p>
    </div>
  );

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const e = detailDialog.enrollment;

  return (
    <div className="space-y-6 wizard-form">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Sales Admin Review</h2>
        <p className="text-muted-foreground text-sm mt-1.5">Approve or reject student applications before they reach Operations</p>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="inline-flex p-1.5 rounded-full bg-[#f4f6f3] gap-1 w-fit">
          {([['pending', 'Pending Review'], ['rejected', 'Rejected']] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => { setView(k); setPage(1); }} className={`rounded-full px-5 py-2 text-sm font-semibold transition ${view === k ? 'bg-[#8ae47e] text-[#0b1d14]' : 'text-slate-600 hover:bg-white'}`}>{label}</button>
          ))}
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search students..."
            className="pl-11 h-11 rounded-full bg-[#f4f6f3] border-transparent"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Same full enrollment form, every section editable; resubmits to Sales Admin review */}
      <StudentsPanel
        triggerOpen={formOpen}
        isSalesMode={true}
        hideList={true}
        completingEnrollment={reopening}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setReopening(null);
            fetchReviews();
          }
        }}
      />

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">{view === 'rejected' ? 'Rejected Applications' : 'Pending Review'}</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{filtered.length} applications</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center">
              <h3 className="text-lg font-semibold text-slate-900">All Caught Up!</h3>
              <p className="text-sm text-muted-foreground mt-1">{view === 'rejected' ? 'No rejected applications.' : 'There are no applications pending your review.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pageRows.map(enrollment => (
                <div key={enrollment.id} className="p-4 sm:p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors flex flex-col xl:flex-row gap-4 justify-between xl:items-center">
                  <div className="min-w-0 cursor-pointer" onClick={() => setDetailDialog({ open: true, enrollment })}>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-lg text-slate-900">{enrollment.studentName}</h4>
                      {enrollment.enrollmentNumber && <span className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold font-mono text-slate-700">{enrollment.enrollmentNumber}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{enrollment.studentEmail} • {enrollment.studentPhone}</p>
                    {view === 'rejected' && enrollment.departmentRemarks && (
                      <p className="text-xs text-red-600 font-medium mt-1">Rejected: {enrollment.departmentRemarks}</p>
                    )}
                    <div className="pt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">Program: {enrollment.program?.name || 'N/A'}</span>
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">Fee paid: {CS()}{enrollment.initialPaymentAmount || 0}</span>
                      {enrollment.salesUser && (
                        <span className={`rounded-full px-3 py-1 font-semibold ${enrollment.salesUserId === user?.id ? 'bg-[#dff3da] text-[#256c1d]' : 'bg-white text-slate-700'}`}>
                          Enrolled by: {enrollment.salesUserId === user?.id ? 'You (Sales Admin)' : (enrollment.salesUser.name || enrollment.salesUser.email)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <Button variant="outline" className="h-10 rounded-full px-5 bg-white border-slate-200 hover:bg-[#eaf6e6] font-semibold" onClick={() => setDetailDialog({ open: true, enrollment })}>
                      View Details
                    </Button>
                    {view === 'rejected' ? (
                      <Button className="h-10 rounded-full px-5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => { setReopening(enrollment); setFormOpen(true); }}>
                        Edit & Re-request
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" className="h-10 rounded-full px-5 text-red-600 border-red-200 bg-white hover:bg-red-50 font-semibold" disabled={processing} onClick={() => setRejectDialog({ open: true, id: enrollment.id })}>
                          Reject
                        </Button>
                        <Button className="h-10 rounded-full px-5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" disabled={processing} onClick={() => handleApprove(enrollment.id)}>
                          Approve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <ListPagination total={filtered.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
            </div>
          )}
        </div>
      </div>

      {/* Student Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => !open && setDetailDialog({ open: false, enrollment: null })}>
        <DialogContent className="wizard-form max-w-2xl max-h-[85vh] overflow-y-auto rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Student Application Details</DialogTitle>
            <DialogDescription>Review the complete student information before making a decision</DialogDescription>
          </DialogHeader>

          {e && (
            <div className="space-y-6 py-2">
              {/* Photo & Basic Info */}
              <div className="flex items-start gap-5">
                {e.photo ? (
                  <img src={api.getFileUrl(e.photo)} alt="Student" className="w-20 h-20 rounded-2xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center text-2xl font-semibold">{(e.studentName || '?')[0].toUpperCase()}</div>
                )}
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold tracking-tight">{e.studentName}</h3>
                  {e.enrollmentNumber && <span className="inline-block rounded-full bg-[#f4f6f3] px-3 py-0.5 text-xs font-semibold font-mono text-slate-700">{e.enrollmentNumber}</span>}
                  <p className="text-sm text-muted-foreground">{e.studentEmail}</p>
                  <p className="text-sm text-muted-foreground">{e.studentPhone}</p>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-[#256c1d]">Personal Details</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 bg-[#f4f6f3] rounded-2xl p-4">
                  <DetailRow label="Father's Name" value={e.fatherName} />
                  <DetailRow label="Mother's Name" value={e.motherName} />
                  <DetailRow label="Date of Birth" value={e.dob ? new Date(e.dob).toLocaleDateString('en-IN') : null} />
                  <DetailRow label="Gender" value={e.gender} />
                  <DetailRow label="Alternate Phone" value={e.altPhone} />
                  <DetailRow label="Category" value={e.category} />
                  <DetailRow label="Religion" value={e.religion} />
                  <DetailRow label="Caste" value={e.caste} />
                  <DetailRow label="Marital Status" value={e.maritalStatus} />
                  <DetailRow label="Employment Status" value={e.employmentStatus} />
                  <DetailRow label="Address" value={e.address} />
                </div>
              </div>

              {/* Program & Academic Details */}
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-[#256c1d]">Program & Academic Details</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 bg-[#f4f6f3] rounded-2xl p-4">
                  <DetailRow label="Program" value={e.program?.name} />
                  <DetailRow label="University" value={e.program?.university?.name} />
                  <DetailRow label="Academic Partner" value={e.studyCenter?.name} />
                  <DetailRow label="Specialisation" value={e.specialisation} />
                  <DetailRow label="Course Type" value={e.program?.courseType} />
                  <DetailRow label="Previous Qualification" value={e.previousQualification} />
                  <DetailRow 
                    label="Enrolled By" 
                    value={e.salesUserId === user?.id ? 'You (Sales Admin)' : (e.salesUser?.name ? `${e.salesUser.name} (${e.salesUser.email})` : (e.salesUser?.email || 'Sales Team'))} 
                  />
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-[#256c1d]">Payment Details</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 bg-[#f4f6f3] rounded-2xl p-4">
                  <DetailRow label="Payment Plan" value={e.paymentPlan} />
                  <DetailRow label="Initial Payment" value={e.initialPaymentAmount ? `${CS()}${e.initialPaymentAmount}` : null} />
                  <DetailRow label="Applied On" value={e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
                  {e.receiptUrl && (
                    <div className="py-2">
                      <p className="text-xs text-slate-500">Payment Receipt</p>
                      <a href={api.getFileUrl(e.receiptUrl)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#256c1d] hover:underline mt-0.5 inline-block">View Receipt</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              {e.documents && e.documents.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-[#256c1d]">Uploaded Documents</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {e.documents.map((doc: any, idx: number) => (
                      <a key={idx} href={api.getFileUrl(doc.url)} target="_blank" rel="noreferrer"
                        className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eaf6e6] transition-colors">
                        <span className="text-sm font-semibold text-slate-700 truncate">{doc.type}</span>
                        <span className="text-xs font-semibold text-[#256c1d] shrink-0">Open</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Status History */}
              {e.statusHistory && e.statusHistory.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-[#256c1d]">Status History</h4>
                  <div className="space-y-2">
                    {e.statusHistory.map((entry: any, idx: number) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-[#f4f6f3] text-sm">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-slate-700 capitalize">{entry.status}</span>
                            {entry.actorName && <span className="text-xs text-muted-foreground">by {entry.actorName}</span>}
                          </div>
                          {entry.note && <p className="text-xs text-muted-foreground mt-1">{entry.note}</p>}
                          {entry.timestamp && <p className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString('en-IN')}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setDetailDialog({ open: false, enrollment: null })}>Close</Button>
            {e && (
              <>
                <Button 
                  variant="outline"
                  className="h-11 px-6 rounded-full text-red-600 border-red-200 bg-white hover:bg-red-50 font-semibold"
                  disabled={processing}
                  onClick={() => { setRejectDialog({ open: true, id: e.id }); setDetailDialog({ open: false, enrollment: null }); }}
                >
                  Reject
                </Button>
                <Button 
                  className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" 
                  disabled={processing}
                  onClick={() => handleApprove(e.id)}
                >
                  Approve & Send to Ops
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, id: '' })}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Reject Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this application. It will be sent back to the sales user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Input 
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Invalid receipt, amount mismatch..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setRejectDialog({ open: false, id: '' })}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold" onClick={handleReject} disabled={processing || !remarks.trim()}>
              {processing ? 'Rejecting...' : 'Reject Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
