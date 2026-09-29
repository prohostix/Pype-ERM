import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, CheckCircle2, XCircle, Search, ExternalLink, Eye, User, Phone, Mail, Calendar, MapPin, GraduationCap, IndianRupee, Clock, Image } from 'lucide-react';
import api from '@/lib/api';

export function SalesAdminReviewPanel() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean, id: string }>({ open: false, id: '' });
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);
  const [detailDialog, setDetailDialog] = useState<{ open: boolean, enrollment: any | null }>({ open: false, enrollment: null });

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/sales-admin-reviews');
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

  const DetailRow = ({ icon: Icon, label, value }: { icon: any, label: string, value: any }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-slate-800 break-words">{value || '—'}</p>
      </div>
    </div>
  );

  const e = detailDialog.enrollment;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sales Admin Review</h2>
          <p className="text-muted-foreground">Approve or reject student applications before they reach Operations</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading pending reviews...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium">All Caught Up!</h3>
              <p className="text-muted-foreground mt-1">There are no applications pending your review.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(enrollment => (
                <div key={enrollment.id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                  <div className="space-y-1 cursor-pointer" onClick={() => setDetailDialog({ open: true, enrollment })}>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-lg">{enrollment.studentName}</h4>
                      {enrollment.enrollmentNumber && <Badge variant="outline">{enrollment.enrollmentNumber}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{enrollment.studentEmail} • {enrollment.studentPhone}</p>
                    <div className="pt-2 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-medium">
                        Program: {enrollment.program?.name || 'N/A'}
                      </span>
                      <span className="inline-flex items-center bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-medium">
                        Fee Paid: ₹{enrollment.initialPaymentAmount || 0}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <Button variant="outline" size="sm" onClick={() => setDetailDialog({ open: true, enrollment })}>
                      <Eye className="w-4 h-4 mr-2" /> View Details
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      disabled={processing}
                      onClick={() => setRejectDialog({ open: true, id: enrollment.id })}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white" 
                      size="sm"
                      disabled={processing}
                      onClick={() => handleApprove(enrollment.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => !open && setDetailDialog({ open: false, enrollment: null })}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" /> Student Application Details
            </DialogTitle>
            <DialogDescription>Review the complete student information before making a decision</DialogDescription>
          </DialogHeader>

          {e && (
            <div className="space-y-6 py-2">
              {/* Photo & Basic Info */}
              <div className="flex items-start gap-5">
                {e.photo ? (
                  <img src={api.getFileUrl(e.photo)} alt="Student" className="w-20 h-20 rounded-xl object-cover border shadow-sm" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-slate-100 border flex items-center justify-center">
                    <User className="w-8 h-8 text-slate-400" />
                  </div>
                )}
                <div className="space-y-1">
                  <h3 className="text-xl font-bold">{e.studentName}</h3>
                  {e.enrollmentNumber && <Badge variant="outline">{e.enrollmentNumber}</Badge>}
                  <p className="text-sm text-muted-foreground">{e.studentEmail}</p>
                  <p className="text-sm text-muted-foreground">{e.studentPhone}</p>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Personal Details</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 bg-slate-50 rounded-xl p-4 border">
                  <DetailRow icon={User} label="Father's Name" value={e.fatherName} />
                  <DetailRow icon={User} label="Mother's Name" value={e.motherName} />
                  <DetailRow icon={Calendar} label="Date of Birth" value={e.dob ? new Date(e.dob).toLocaleDateString('en-IN') : null} />
                  <DetailRow icon={User} label="Gender" value={e.gender} />
                  <DetailRow icon={Phone} label="Alternate Phone" value={e.altPhone} />
                  <DetailRow icon={User} label="Category" value={e.category} />
                  <DetailRow icon={User} label="Religion" value={e.religion} />
                  <DetailRow icon={User} label="Caste" value={e.caste} />
                  <DetailRow icon={User} label="Marital Status" value={e.maritalStatus} />
                  <DetailRow icon={User} label="Employment Status" value={e.employmentStatus} />
                  <DetailRow icon={MapPin} label="Address" value={e.address} />
                </div>
              </div>

              {/* Program & Academic Details */}
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Program & Academic Details</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 bg-slate-50 rounded-xl p-4 border">
                  <DetailRow icon={GraduationCap} label="Program" value={e.program?.name} />
                  <DetailRow icon={GraduationCap} label="University" value={e.program?.university?.name} />
                  <DetailRow icon={MapPin} label="Academic Partner" value={e.studyCenter?.name} />
                  <DetailRow icon={GraduationCap} label="Specialisation" value={e.specialisation} />
                  <DetailRow icon={GraduationCap} label="Course Type" value={e.program?.courseType} />
                  <DetailRow icon={GraduationCap} label="Previous Qualification" value={e.previousQualification} />
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Payment Details</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 bg-slate-50 rounded-xl p-4 border">
                  <DetailRow icon={IndianRupee} label="Payment Plan" value={e.paymentPlan} />
                  <DetailRow icon={IndianRupee} label="Initial Payment" value={e.initialPaymentAmount ? `₹${e.initialPaymentAmount}` : null} />
                  <DetailRow icon={Clock} label="Applied On" value={e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
                  {e.receiptUrl && (
                    <div className="flex items-start gap-3 py-2">
                      <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Payment Receipt</p>
                        <a href={api.getFileUrl(e.receiptUrl)} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
                          View Receipt <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              {e.documents && e.documents.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Uploaded Documents</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {e.documents.map((doc: any, idx: number) => (
                      <a key={idx} href={api.getFileUrl(doc.url)} target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-slate-50 hover:border-primary/30 transition-all group">
                        <FileText className="w-4 h-4 text-slate-400 group-hover:text-primary shrink-0" />
                        <span className="text-sm font-medium text-slate-700 group-hover:text-primary truncate">{doc.type}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 ml-auto shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Status History */}
              {e.statusHistory && e.statusHistory.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Status History</h4>
                  <div className="space-y-2">
                    {e.statusHistory.map((entry: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{entry.status}</Badge>
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
            <Button variant="outline" onClick={() => setDetailDialog({ open: false, enrollment: null })}>Close</Button>
            {e && (
              <>
                <Button 
                  variant="destructive" 
                  disabled={processing}
                  onClick={() => { setRejectDialog({ open: true, id: e.id }); setDetailDialog({ open: false, enrollment: null }); }}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white" 
                  disabled={processing}
                  onClick={() => handleApprove(e.id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Send to Ops
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, id: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
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
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: '' })}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing || !remarks.trim()}>
              {processing ? 'Rejecting...' : 'Reject Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
