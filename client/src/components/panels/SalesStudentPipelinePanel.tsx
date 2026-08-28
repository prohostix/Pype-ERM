import { useState, useEffect } from 'react';
import { RefreshCw, GraduationCap, Search, ChevronDown, ChevronUp, User, CheckCircle, Clock, XCircle, Plus, Phone, Mail, MessageCircle, Upload, UploadCloud, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { StudentsPanel } from './StudentsPanel';

interface StatusHistoryEntry {
  status: string;
  actorId: string;
  actorName?: string;
  actorRole?: string;
  timestamp: string;
  note?: string;
  remarks?: string;
}

interface Enrollment {
  id: string;
  enrollmentNumber?: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  status: string;
  createdAt: string;
  enrolledAt?: string;
  departmentRemarks?: string;
  financeRemarks?: string;
  statusHistory: StatusHistoryEntry[];
  program: { name: string; code: string; courseType: string; feeStructures?: any[] };
  studyCenter: { name: string; code: string };
  session: { name: string };
  departmentReviewer?: { name: string; email: string };
  financeReviewer?: { name: string; email: string };
}

interface Summary {
  total: number;
  sales_verification_pending: number;
  document_review: number;
  finance_review: number;
  enrolled: number;
  ops_rejected: number;
  rejected: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  sales_verification_pending: { label: 'Pending Verification', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Clock className="w-3 h-3" /> },
  document_review: { label: 'Ops Review', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Clock className="w-3 h-3" /> },
  finance_review: { label: 'Finance Review', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Clock className="w-3 h-3" /> },
  enrolled: { label: 'Enrolled', color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle className="w-3 h-3" /> },
  ops_rejected: { label: 'Rejected by Ops', color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3 h-3" /> },
  rejected: { label: 'Rejected by Finance', color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3 h-3" /> },
  submitted: { label: 'Submitted', color: 'bg-muted text-muted-foreground', icon: <Clock className="w-3 h-3" /> },
};

const ROLE_LABELS: Record<string, string> = {
  ops_admin: 'Operations',
  finance_admin: 'Finance',
  finance_sub_admin: 'Finance',
  sales_admin: 'Sales',
  sales_sub_admin: 'Sales',
  student: 'Student',
  system: 'System',
};

export function SalesStudentPipelinePanel() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Direct Enrollment Trigger State
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);

  // Verification Modal State
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyingStudent, setVerifyingStudent] = useState<Enrollment | null>(null);
  const [verifyForm, setVerifyForm] = useState<any>({});
  const [isVerifying, setIsVerifying] = useState(false);

  const openVerifyDialog = (enrollment: Enrollment) => {
    setVerifyingStudent(enrollment);
    const docs = enrollment.student?.documents || enrollment.documents || [];
    const photo = enrollment.student?.photo || enrollment.photo || '';
    setVerifyForm({ ...enrollment, documents: docs, photo, initialPaymentAmount: enrollment.initialPaymentAmount || '' });
    setVerifyDialogOpen(true);
  };

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/student-applications');
      setEnrollments(res.data.data || []);
      setSummary(res.data.summary || null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPipeline(); }, []);

  const filtered = enrollments.filter(e => {
    const matchesSearch = !search ||
      e.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      e.studentEmail?.toLowerCase().includes(search.toLowerCase()) ||
      (e.program?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCfg = (status: string) => STATUS_CONFIG[status] || { label: status.replace(/_/g, ' '), color: 'bg-muted text-muted-foreground', icon: <Clock className="w-3 h-3" /> };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Student Application Pipeline</h2>
          <p className="text-sm text-muted-foreground mt-1">Track all applications submitted via your invite links</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPipeline} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>

          <Button 
            size="sm" 
            className="bg-primary hover:bg-primary/90 text-white font-medium shadow-sm transition-all flex items-center"
            onClick={() => setEnrollDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Direct Enroll Student
          </Button>

          {/* Trigger shared full wizard form component instead of the simplified modal */}
          <StudentsPanel 
            triggerOpen={enrollDialogOpen} 
            isSalesMode={true}
            onOpenChange={(open) => {
              setEnrollDialogOpen(open);
              if (!open) {
                fetchPipeline();
              }
            }}
          />
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { key: 'total', label: 'Total', color: 'text-foreground' },
            { key: 'sales_verification_pending', label: 'To Verify', color: 'text-purple-600' },
            { key: 'document_review', label: 'Ops Review', color: 'text-yellow-600' },
            { key: 'finance_review', label: 'Finance', color: 'text-blue-600' },
            { key: 'enrolled', label: 'Enrolled', color: 'text-green-600' },
            { key: 'ops_rejected', label: 'Ops Rejected', color: 'text-red-600' },
            { key: 'rejected', label: 'Fin. Rejected', color: 'text-red-600' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
              className={cn(
                'p-3 rounded-xl border text-left transition-all hover:border-primary/40',
                statusFilter === key ? 'border-primary bg-primary/5' : 'border-border bg-card'
              )}
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn('text-2xl font-bold mt-0.5', color)}>{(summary as any)[key]}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or program..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Enrollment list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No applications found</p>
            <p className="text-sm mt-1">Share your invite link to collect student applications</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(e => {
            const cfg = statusCfg(e.status);
            const isExpanded = expandedId === e.id;
            const history: StatusHistoryEntry[] = Array.isArray(e.statusHistory) ? e.statusHistory : [];

            return (
              <Card key={e.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium', cfg.color)}>
                          {cfg.icon}{cfg.label}
                        </span>
                        {e.enrollmentNumber && (
                          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{e.enrollmentNumber}</span>
                        )}
                      </div>
                      <h4 className="font-semibold">{e.studentName}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-muted-foreground">
                        <span>{e.studentEmail}</span>
                        <span>{e.studentPhone}</span>
                        <span>{e.program?.name || 'N/A'} {e.program?.code ? `(${e.program.code})` : ''}</span>
                        <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      {/* Rejected Items Notice */}
                      {(() => {
                        const docs = e.student?.documents || e.documents || [];
                        const photoStatus = e.student?.admissionProgress?.photoStatus;
                        const rejectedDocs = docs.filter((d: any) => d && d.status === 'rejected');
                        const hasRejectedPhoto = photoStatus === 'rejected';
                        
                        if (rejectedDocs.length > 0 || hasRejectedPhoto) {
                          return (
                            <div className="mt-2 bg-red-50 border border-red-200 text-red-700 p-2 rounded text-xs">
                              <strong>Action Required:</strong>
                              <ul className="list-disc pl-4 mt-1">
                                {hasRejectedPhoto && <li>Student Photo was rejected.</li>}
                                {rejectedDocs.map((d: any, idx: number) => (
                                  <li key={idx}>{d.type} was rejected.</li>
                                ))}
                              </ul>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Communication Options */}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs text-green-600 hover:text-green-700 hover:bg-green-50/50 border-green-200"
                          asChild
                        >
                          <a
                            href={`https://wa.me/${e.studentPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 font-medium"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 border-blue-200"
                          asChild
                        >
                          <a
                            href={`mailto:${e.studentEmail}`}
                            className="flex items-center gap-1.5 font-medium"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Email
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 border-border"
                          asChild
                        >
                          <a
                            href={`tel:${e.studentPhone}`}
                            className="flex items-center gap-1.5 font-medium"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Call
                          </a>
                        </Button>
                      </div>

                      {/* Verification Action */}
                      {(() => {
                        const docs = e.student?.documents || e.documents || [];
                        const photoStatus = e.student?.admissionProgress?.photoStatus;
                        const hasRejected = docs.some((d: any) => d && d.status === 'rejected') || photoStatus === 'rejected';
                        
                        if (e.status === 'sales_verification_pending' || ((e.status === 'document_review' || e.status === 'rejected' || e.status === 'ops_rejected') && hasRejected)) {
                          return (
                            <div className="mt-4">
                              <Button variant="default" size="sm" className={cn("bg-purple-600 hover:bg-purple-700", hasRejected && "bg-rose-600 hover:bg-rose-700")} onClick={(evt) => {
                                evt.stopPropagation();
                                openVerifyDialog(e);
                              }}>
                                {hasRejected ? 'Re-upload Rejected Documents & Resubmit' : 'Verify & Submit to Ops'}
                              </Button>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Current handler */}
                      {e.status === 'document_review' && (
                        <p className="text-xs text-yellow-600 mt-1 font-medium">📋 Waiting for Operations review</p>
                      )}
                      {e.status === 'finance_review' && (
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          💰 With Finance{e.departmentReviewer ? ` — verified by ${e.departmentReviewer.name}` : ''}
                        </p>
                      )}
                      {e.status === 'enrolled' && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          ✅ Enrolled{e.enrolledAt ? ` on ${new Date(e.enrolledAt).toLocaleDateString()}` : ''}
                          {e.financeReviewer ? ` — approved by ${e.financeReviewer.name}` : ''}
                        </p>
                      )}
                      {(e.status === 'ops_rejected' || e.status === 'rejected') && (
                        <p className="text-xs text-red-600 mt-1 font-medium">
                          ❌ {e.departmentRemarks || e.financeRemarks}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : e.id)}
                      className="shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Expanded: full status timeline */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Application Timeline</p>
                      <div className="space-y-3">
                        {history.map((h, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={cn(
                                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                                h.status === 'enrolled' ? 'bg-green-100 text-green-700' :
                                h.status.includes('rejected') ? 'bg-red-100 text-red-700' :
                                'bg-muted text-muted-foreground'
                              )}>
                                <User className="w-3.5 h-3.5" />
                              </div>
                              {i < history.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                            </div>
                            <div className="pb-3 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium capitalize">{h.status.replace(/_/g, ' ')}</span>
                                {h.actorName && (
                                  <span className="text-xs text-muted-foreground">
                                    by {h.actorName} ({ROLE_LABELS[h.actorRole || ''] || h.actorRole || 'System'})
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {new Date(h.timestamp).toLocaleString()}
                                </span>
                              </div>
                              {h.note && <p className="text-xs text-muted-foreground mt-0.5">{h.note}</p>}
                              {h.remarks && (
                                <p className="text-xs text-red-600 mt-0.5 font-medium">Reason: {h.remarks}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Verification Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Verify Student Application</DialogTitle>
          </DialogHeader>
          {verifyingStudent && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Review and complete the student's details before submitting it to Operations.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Student Name</Label>
                  <Input 
                    value={verifyForm.studentName || ''} 
                    onChange={e => setVerifyForm({...verifyForm, studentName: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input 
                    value={verifyForm.studentEmail || ''} 
                    onChange={e => setVerifyForm({...verifyForm, studentEmail: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input 
                    value={verifyForm.studentPhone || ''} 
                    onChange={e => setVerifyForm({...verifyForm, studentPhone: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Father's Name</Label>
                  <Input 
                    value={verifyForm.fatherName || ''} 
                    onChange={e => setVerifyForm({...verifyForm, fatherName: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date of Birth</Label>
                  <Input 
                    type="date"
                    value={verifyForm.dob ? new Date(verifyForm.dob).toISOString().split('T')[0] : ''} 
                    onChange={e => setVerifyForm({...verifyForm, dob: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Alternate Phone</Label>
                  <Input 
                    value={verifyForm.altPhone || ''} 
                    onChange={e => setVerifyForm({...verifyForm, altPhone: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Input value={verifyForm.gender || ''} onChange={e => setVerifyForm({...verifyForm, gender: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input value={verifyForm.category || ''} onChange={e => setVerifyForm({...verifyForm, category: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Religion</Label>
                  <Input value={verifyForm.religion || ''} onChange={e => setVerifyForm({...verifyForm, religion: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Marital Status</Label>
                  <Input value={verifyForm.maritalStatus || ''} onChange={e => setVerifyForm({...verifyForm, maritalStatus: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Employment Status</Label>
                  <Input value={verifyForm.employmentStatus || ''} onChange={e => setVerifyForm({...verifyForm, employmentStatus: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Caste</Label>
                  <Input value={verifyForm.caste || ''} onChange={e => setVerifyForm({...verifyForm, caste: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Mother's Name</Label>
                  <Input value={verifyForm.motherName || ''} onChange={e => setVerifyForm({...verifyForm, motherName: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Mother's Phone</Label>
                  <Input value={verifyForm.motherPhone || ''} onChange={e => setVerifyForm({...verifyForm, motherPhone: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Father's Phone</Label>
                  <Input value={verifyForm.fatherPhone || ''} onChange={e => setVerifyForm({...verifyForm, fatherPhone: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Guardian's Name</Label>
                  <Input value={verifyForm.guardianName || ''} onChange={e => setVerifyForm({...verifyForm, guardianName: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Family Phone</Label>
                  <Input value={verifyForm.familyPhone || ''} onChange={e => setVerifyForm({...verifyForm, familyPhone: e.target.value})} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Address</Label>
                  <Input 
                    value={verifyForm.studentAddress || ''} 
                    onChange={e => setVerifyForm({...verifyForm, studentAddress: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>PIN Code</Label>
                  <Input 
                    value={verifyForm.pinCode || ''} 
                    onChange={e => setVerifyForm({...verifyForm, pinCode: e.target.value})} 
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4 space-y-4">
                <h4 className="font-medium text-sm">Verify Documents & Photo</h4>
                
                {/* Photo Upload */}
                <div className="mb-4">
                  <Label className="text-xs mb-1.5 block">Profile Photo</Label>
                  <div className="flex items-center gap-4">
                    {verifyForm.photo ? (
                      <div className="relative group cursor-pointer inline-block">
                        <img src={api.getFileUrl(verifyForm.photo)} alt="Student" className="w-16 h-16 rounded-full object-cover border" />
                        <button
                          type="button"
                          onClick={() => setVerifyForm({...verifyForm, photo: ''})}
                          className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 transition-colors shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className={cn("w-16 h-16 rounded-full flex items-center justify-center border border-dashed", verifyingStudent?.student?.admissionProgress?.photoStatus === 'rejected' ? 'bg-red-50 border-red-300' : 'bg-slate-100 border-slate-300')}>
                        <UploadCloud className={cn("w-6 h-6", verifyingStudent?.student?.admissionProgress?.photoStatus === 'rejected' ? 'text-red-400' : 'text-slate-400')} />
                      </div>
                    )}
                    <div className="flex-1">
                      {verifyingStudent?.student?.admissionProgress?.photoStatus === 'rejected' && (
                        <p className="text-xs text-red-600 mb-1 font-medium">Photo Rejected. Please re-upload.</p>
                      )}
                      <Input 
                        type="file" 
                        accept="image/*"
                        className="text-xs file:h-7 file:py-0 file:px-2"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const toastId = toast.loading('Uploading photo...');
                          try {
                            const data = new FormData();
                            data.append('file', file);
                            const res = await api.post('/auth/upload', data, {
                              headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            setVerifyForm({ ...verifyForm, photo: res.data.url });
                            toast.success('Photo uploaded successfully', { id: toastId });
                          } catch (err) {
                            toast.error('Failed to upload photo', { id: toastId });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate', 'Transfer Certificate', 'Birth Certificate', 'Degree Certificate', 'Other'].map((docType) => {
                    const existing = (verifyForm.documents || []).find((d: any) => d.type === docType);
                    const elementId = `sales-doc-upload-${docType.replace(/\s+/g, '-')}`;
                    return (
                      <div key={docType} className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/10 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium">{docType}</span>
                          {existing?.url && (
                            <a 
                              href={api.getFileUrl(existing.url)} 
                              target="_blank" 
                              rel="noreferrer"
                              className={cn("text-xs hover:underline", existing.status === 'rejected' ? "text-red-600" : "text-primary")}
                            >
                              View
                            </a>
                          )}
                        </div>
                        {existing?.status === 'rejected' && (
                          <p className="text-xs text-red-600 mb-2 font-medium bg-red-50 p-1 rounded">Rejected. Please re-upload.</p>
                        )}
                        <div>
                          <input
                            type="file"
                            id={elementId}
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const toastId = toast.loading(`Uploading ${docType}...`);
                              try {
                                const uploadData = new FormData();
                                uploadData.append('file', file);
                                const res = await api.post('/auth/upload', uploadData, {
                                  headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                const newDocs = (verifyForm.documents || []).filter((d: any) => d.type !== docType);
                                newDocs.push({
                                  type: docType,
                                  url: res.data.url,
                                  label: docType === 'Other' ? 'Other Document' : docType,
                                  status: 'pending'
                                });
                                setVerifyForm({ ...verifyForm, documents: newDocs });
                                toast.success(`${docType} uploaded successfully`, { id: toastId });
                              } catch (err) {
                                console.error(err);
                                toast.error(`Failed to upload ${docType}`, { id: toastId });
                              }
                            }}
                          />
                          <Label
                            htmlFor={elementId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-800 hover:bg-slate-100 cursor-pointer text-xs font-semibold shadow-sm transition-all w-full justify-center"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            {existing?.url ? 'Change File' : 'Upload File'}
                          </Label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t pt-4 mt-4 space-y-4">
                <h4 className="font-medium text-sm">Fee Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Payment Plan (Optional)</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={verifyForm.paymentPlan || ''}
                      onChange={e => setVerifyForm({...verifyForm, paymentPlan: e.target.value})}
                    >
                      <option value="">Select a plan</option>
                      <option value="lumpsum">One-Time Payment (Lump Sum)</option>
                      <option value="installment">Installment Plan</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Initial Fee Amount Paid <span className="text-rose-500">*</span></Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 5000"
                      value={verifyForm.initialPaymentAmount || ''} 
                      onChange={e => setVerifyForm({...verifyForm, initialPaymentAmount: e.target.value})} 
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label>Fee Payment Screenshot / Receipt <span className="text-rose-500">*</span></Label>
                  <div className="flex items-center gap-4">
                    {verifyForm.receiptUrl ? (
                      <div className="relative group inline-block">
                        <img src={api.getFileUrl(verifyForm.receiptUrl)} alt="Receipt" className="h-20 w-auto object-contain border rounded" />
                        <button
                          type="button"
                          onClick={() => setVerifyForm({...verifyForm, receiptUrl: ''})}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-full max-w-sm">
                        <Input 
                          id="fee-receipt-upload"
                          type="file" 
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const toastId = toast.loading('Uploading receipt...');
                            try {
                              const data = new FormData();
                              data.append('file', file);
                              const res = await api.post('/auth/upload', data, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                              });
                              setVerifyForm({ ...verifyForm, receiptUrl: res.data.url });
                              toast.success('Receipt uploaded', { id: toastId });
                            } catch (err) {
                              toast.error('Failed to upload receipt', { id: toastId });
                            }
                          }}
                        />
                        <Label
                          htmlFor="fee-receipt-upload"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 hover:bg-slate-100 cursor-pointer text-xs font-semibold shadow-sm transition-all w-full justify-center"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload Screenshot
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>Cancel</Button>
            <Button disabled={isVerifying} onClick={async () => {
              if (!verifyForm.initialPaymentAmount || verifyForm.initialPaymentAmount === '' || parseFloat(verifyForm.initialPaymentAmount) <= 0) {
                toast.error('Please enter a valid Initial Fee Amount Paid (must be greater than 0)');
                return;
              }

              if (!verifyForm.receiptUrl) {
                toast.error('Please upload the Fee Payment Screenshot / Receipt');
                return;
              }

              setIsVerifying(true);
              try {
                await api.put(`/sales/student-applications/${verifyingStudent?.id}/verify`, verifyForm);
                toast.success('Application verified and submitted!');
                setVerifyDialogOpen(false);
                fetchPipeline();
              } catch (e: any) {
                toast.error(e.response?.data?.message || 'Verification failed');
              } finally {
                setIsVerifying(false);
              }
            }}>
              {isVerifying ? 'Submitting...' : 'Submit to Operations'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
