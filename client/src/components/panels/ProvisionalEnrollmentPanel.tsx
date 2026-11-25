import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  FileText, 
  Send, 
  CheckCircle2, 
  Loader2, 
  X, 
  RefreshCw, 
  GraduationCap, 
  Building2, 
  Calendar, 
  IndianRupee, 
  AlertCircle,
  Sparkles,
  User
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { shrinkImage, TARGET_MAX_BYTES } from '@/lib/uploadFile';

import { CS, numLocale } from '@/lib/currency';
import { useAuth } from '@/hooks/useAuth';
import { mayOn } from '@/lib/access';
function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
  <section className="space-y-4">
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-full bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center"><Icon className="w-4 h-4" /></span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
    {children}
  </section>
  );
}

export function ProvisionalEnrollmentPanel({ entryEmployee }: { entryEmployee?: { id: string; name: string } } = {}) {
  const { user } = useAuth();
  // Data-entry staff enrol for a sales employee, who gets the credit
  const entryMode = user?.role === 'sales_entry' || (user as any)?.department?.type === 'data_entry';
  const employeeKey = `salesEntry:employee:${user?.id}`;
  const [salesPeople, setSalesPeople] = useState<{ id: string; name: string; designation?: string }[]>([]);
  const [pickedUserId, setSalesUserId] = useState<string>(() => { try { return localStorage.getItem(employeeKey) || ''; } catch { return ''; } });
  const salesUserId = entryEmployee?.id ?? pickedUserId;
  useEffect(() => {
    if (!entryMode || entryEmployee) return;
    api.get('/sales/entry/sales-people')
      .then((res) => {
        const list = res.data.data || [];
        setSalesPeople(list);
        setSalesUserId((current) => (list.some((p: any) => p.id === current) ? current : ''));
      })
      .catch(() => toast.error('Could not load the sales employees'));
  }, [entryMode, entryEmployee]);
  // The role decides unless an Org Admin has set something for this user (the server enforces it)
  const mayCreate = mayOn(user, 'provisional_enrollment', 'create', true);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  
  const [form, setForm] = useState({ 
    studentName: '', 
    studentEmail: '', 
    studentPhone: '', 
    universityId: 'all',
    programId: '',
    specialisation: '',
    sessionId: '',
    initialPaymentAmount: ''
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!receiptFile) {
      setReceiptPreviewUrl(null);
      return;
    }
    const ext = (receiptFile.name.split('.').pop() || '').toLowerCase();
    const isImage = receiptFile.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    if (isImage) {
      const url = URL.createObjectURL(receiptFile);
      setReceiptPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setReceiptPreviewUrl(null);
    }
  }, [receiptFile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [progsRes, sessionsRes] = await Promise.all([
        api.get('/enrollment/programs'),
        api.get('/operations/sessions').catch(() => ({ data: { data: [] } }))
      ]);
      setPrograms(progsRes.data?.data || []);
      setSessions(sessionsRes.data?.data || []);
    } catch (e) {
      toast.error('Failed to load enrollment programs and sessions');
    } finally {
      setLoading(false);
    }
  };

  // 1. Exclude Academic Partner universities and their programs
  const eligiblePrograms = programs.filter(p => !p.university?.isAcademicPartnerOnly);

  // 2. Universities list (strictly non-academic partner)
  const universities = Array.from(
    new Map(
      eligiblePrograms
        .filter(p => p.university && p.university.id && !p.university.isAcademicPartnerOnly)
        .map(p => [p.university.id, p.university])
    ).values()
  );

  // 3. Filtered programs based on selected university
  const filteredPrograms = form.universityId === 'all'
    ? eligiblePrograms
    : eligiblePrograms.filter(p => p.university?.id === form.universityId);

  // 4. Currently selected program
  const selectedProgram = eligiblePrograms.find(p => p.id === form.programId);

  const targetUniId = form.universityId && form.universityId !== 'all' 
    ? form.universityId 
    : (selectedProgram?.universityId || null);

  // 5. Filter available sessions strictly on the basis of the selected university (not shown initially)
  const availableSessions = targetUniId
    ? sessions.filter(s => {
        const isSessionActive = !s.status || s.status === 'active' || s.status === 'approved';
        if (!isSessionActive) return false;

        // Do not show sessions belonging to academic partner universities
        if (s.university?.isAcademicPartnerOnly) return false;

        return !s.universityId || s.universityId === targetUniId;
      })
    : [];

  // 6. Find matched fee structure
  const selectedFeeStructure = (() => {
    if (!selectedProgram || !selectedProgram.feeStructures || selectedProgram.feeStructures.length === 0) return null;
    
    if (form.sessionId) {
      const sessionMatch = selectedProgram.feeStructures.find((f: any) => {
        const sId = typeof f.sessionId === 'object' ? f.sessionId?.id : f.sessionId;
        return sId === form.sessionId;
      });
      if (sessionMatch) return sessionMatch;
    }
    
    const fallbackMatch = selectedProgram.feeStructures.find((f: any) => !f.sessionId);
    return fallbackMatch || selectedProgram.feeStructures[0];
  })();

  const regFee = Number(selectedFeeStructure?.registrationFee) || 0;
  const tuitionFee = Number(selectedFeeStructure?.tuitionFee) || 0;
  const examFee = Number(selectedFeeStructure?.examFee) || 0;
  const additionalFeesTotal = Array.isArray(selectedFeeStructure?.additionalFees)
    ? selectedFeeStructure.additionalFees.reduce((sum: number, item: any) => sum + (Number(item?.amount) || 0), 0)
    : 0;
  const totalCourseFee = regFee + tuitionFee + examFee + additionalFeesTotal;

  const billingCycleLabel = (() => {
    if (!selectedFeeStructure?.billingCycle) return null;
    switch (selectedFeeStructure.billingCycle) {
      case 'per_semester': return 'Per Semester';
      case 'per_year': return 'Per Year';
      case 'installment': return 'Installment';
      case 'one_time': return 'One Time / Full Course';
      default: return selectedFeeStructure.billingCycle.replace('_', ' ');
    }
  })();

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    const isPdf = file.type === 'application/pdf' || ext === 'pdf';

    if (!isImage && !isPdf) {
      toast.error('Unsupported file format. Please upload a JPG, PNG, or PDF receipt.');
      e.target.value = '';
      return;
    }

    const originalMB = (file.size / (1024 * 1024)).toFixed(2);

    // Case 1: Image file (supports adaptive browser compression)
    if (isImage) {
      if (file.size > TARGET_MAX_BYTES) {
        const toastId = toast.loading(`Compressing receipt image (${originalMB} MB)...`);
        setCompressing(true);
        try {
          const compressed = await shrinkImage(file, TARGET_MAX_BYTES);
          const compressedMB = (compressed.size / (1024 * 1024)).toFixed(2);

          if (compressed.size > TARGET_MAX_BYTES) {
            toast.error(`Image is too large (${compressedMB} MB). Maximum allowed size is 2 MB.`, { id: toastId });
            setReceiptFile(null);
            e.target.value = '';
            return;
          }

          setReceiptFile(compressed);
          toast.success(`Image compressed from ${originalMB} MB to ${compressedMB} MB`, { id: toastId });
        } catch (err) {
          console.error('Image compression error:', err);
          toast.error('Failed to compress receipt image. Please select a file under 2 MB.', { id: toastId });
          setReceiptFile(null);
          e.target.value = '';
        } finally {
          setCompressing(false);
        }
      } else {
        setReceiptFile(file);
        toast.success(`Receipt selected (${originalMB} MB)`);
      }
      return;
    }

    // Case 2: PDF file
    if (isPdf) {
      if (file.size > TARGET_MAX_BYTES) {
        toast.error(`File size exceeds 2 MB limit (${originalMB} MB). Please compress your PDF before uploading or select a file under 2 MB.`);
        setReceiptFile(null);
        e.target.value = '';
        return;
      }

      setReceiptFile(file);
      toast.success(`PDF receipt selected (${originalMB} MB)`);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    const input = document.getElementById('receipt-upload') as HTMLInputElement | null;
    if (input) input.value = '';
    toast.info('Receipt removed');
  };

  const handleSubmit = async () => {
    if (entryMode && !salesUserId) {
      toast.error('Choose the sales employee first');
      return;
    }
    if (!form.studentName || !form.studentPhone || !form.studentEmail || !form.programId || !form.initialPaymentAmount) {
      toast.error('Please fill in all details including the initial payment amount');
      return;
    }


    if (selectedProgram?.specialisations?.length > 0 && !form.specialisation) {
      toast.error('Please select a specialisation');
      return;
    }

    if (!receiptFile) {
      toast.error('Please upload a payment receipt');
      return;
    }

    let fileToUpload = receiptFile;
    if (fileToUpload.size > TARGET_MAX_BYTES) {
      const ext = (fileToUpload.name.split('.').pop() || '').toLowerCase();
      const isImg = fileToUpload.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
      if (isImg) {
        const tid = toast.loading('Compressing receipt before submission...');
        try {
          fileToUpload = await shrinkImage(fileToUpload, TARGET_MAX_BYTES);
          toast.dismiss(tid);
        } catch (err) {
          toast.error('Failed to compress receipt image', { id: tid });
          return;
        }
      } else {
        toast.error(`Receipt exceeds 2 MB limit (${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB). Please select a file under 2 MB.`);
        return;
      }
    }

    setSubmitting(true);
    const submitToast = toast.loading('Submitting provisional enrollment & uploading receipt...');
    try {
      // 1. Create Provisional Enrollment
      const res = await api.post('/enrollment/enroll', {
        ...(entryMode && { salesUserId }),
        ...form,
        specialisation: form.specialisation || undefined,
        sessionId: form.sessionId || undefined,
        initialPaymentAmount: Number(form.initialPaymentAmount),
        initialPaymentDate: new Date().toISOString(),
        isProvisional: true,
        status: 'provisional_finance_pending',
        studentAddress: 'To be filled', // placeholder
      });
      
      const enrollmentId = res.data.data.id;

      // 2. Upload Receipt
      const formData = new FormData();
      formData.append('receipt', fileToUpload);
      await api.post(`/enrollment/${enrollmentId}/receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Provisional Enrollment submitted to Finance', { id: submitToast });
      setForm({ 
        studentName: '', 
        studentEmail: '', 
        studentPhone: '', 
        universityId: 'all', 
        programId: '', 
        specialisation: '', 
        sessionId: '', 
        initialPaymentAmount: '' 
      });
      setReceiptFile(null);
      const input = document.getElementById('receipt-upload') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Submission failed', { id: submitToast });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Provisional Enrollment</h2>
        <p className="text-muted-foreground text-sm mt-1.5 max-w-2xl">Quickly enroll a student with minimal details and send directly to Finance for receipt verification.</p>
      </div>

      {entryMode && !entryEmployee && (
        <div className="rounded-3xl bg-white border border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <label htmlFor="provisional-employee" className="text-sm font-semibold">Sales employee (gets the credit)</label>
            <p className="text-xs text-muted-foreground">Targets, incentives and reports count for this person.</p>
          </div>
          <select id="provisional-employee" value={salesUserId}
            onChange={(e) => { setSalesUserId(e.target.value); try { localStorage.setItem(employeeKey, e.target.value); } catch { /* not remembered */ } }}
            className="h-11 w-full sm:w-72 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
            <option value="">Choose an employee</option>
            {salesPeople.map((p) => <option key={p.id} value={p.id}>{p.name}{p.designation ? ` · ${p.designation}` : ''}</option>)}
          </select>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-5 sm:gap-6 items-start">
        {/* Left: details */}
        <Card className="lg:col-span-3 rounded-3xl gap-0">
          <CardContent className="p-6 sm:p-8 space-y-9">
            <Section icon={GraduationCap} title="Academic details">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-[#256c1d]" /> University</Label>
                  <Select
                    value={form.universityId}
                    onValueChange={v => setForm(f => ({ ...f, universityId: v, programId: '', specialisation: '', sessionId: '' }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue placeholder="All Universities" /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="all">All Universities</SelectItem>
                      {universities.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-[#256c1d]" /> Program</Label>
                  <Select
                    value={form.programId}
                    onValueChange={v => {
                      const p = eligiblePrograms.find(prog => prog.id === v);
                      setForm(f => ({
                        ...f,
                        programId: v,
                        specialisation: '', // the list of specialisations belongs to the program
                        universityId: (f.universityId === 'all' && p?.university?.id) ? p.university.id : f.universityId,
                      }));
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue placeholder="Select a program" /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {filteredPrograms.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.university?.name && form.universityId === 'all' ? `(${p.university.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Specialisation (required when the program has any): only the selected program's own specialisations */}
                {selectedProgram?.specialisations && selectedProgram.specialisations.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#256c1d]" /> Specialisation <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={form.specialisation}
                      onValueChange={v => setForm(f => ({ ...f, specialisation: v }))}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue placeholder="Select a specialisation" /></SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {selectedProgram.specialisations.map((spec: string) => (
                          <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#256c1d]" /> Admission session <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Select
                    value={form.sessionId || 'none'}
                    onValueChange={v => setForm(f => ({ ...f, sessionId: v === 'none' ? '' : v }))}
                    disabled={!targetUniId || availableSessions.length === 0}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4">
                      <SelectValue
                        placeholder={
                          !targetUniId
                            ? "Select a university to view sessions (optional)"
                            : availableSessions.length === 0
                              ? "No active sessions found for this university"
                              : "Select an admission session (optional)"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="none">None / Not Specified</SelectItem>
                      {availableSessions.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>

            <Section icon={User} title="Student details">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Student full name</Label>
                  <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} placeholder="John Doe" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Email</Label>
                    <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" type="email" value={form.studentEmail} onChange={e => setForm(f => ({ ...f, studentEmail: e.target.value }))} placeholder="john@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Phone number</Label>
                    <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={form.studentPhone} onChange={e => setForm(f => ({ ...f, studentPhone: e.target.value }))} placeholder="+91 9876543210" />
                  </div>
                </div>
              </div>
            </Section>

            <Section icon={IndianRupee} title="Payment">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <Label className="text-sm font-semibold">Initial payment amount ({CS()})</Label>
                  {regFee > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, initialPaymentAmount: String(regFee) }))}
                      className="text-[11px] text-[#256c1d] hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Set to Registration Fee ({CS()}{regFee.toLocaleString(numLocale())})
                    </button>
                  )}
                </div>
                <Input
                  className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"
                  type="number"
                  value={form.initialPaymentAmount}
                  onChange={e => setForm(f => ({ ...f, initialPaymentAmount: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </Section>
          </CardContent>
        </Card>

        {/* Right: fees, receipt and submit */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-6 lg:sticky lg:top-24">
          {/* Program fee structure */}
          {selectedProgram ? (
            <div className="rounded-3xl bg-[#0b1d14] text-white p-6 space-y-4 relative overflow-hidden">
              <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(70% 60% at 50% 0%, rgba(84,185,71,.35), transparent 70%)' }} />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-emerald-100/70">Program fee structure</p>
                  <p className="text-sm font-semibold mt-0.5">{selectedProgram.name}</p>
                </div>
                {billingCycleLabel && (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/10 text-emerald-100 uppercase tracking-wide shrink-0">{billingCycleLabel}</span>
                )}
              </div>

              {selectedFeeStructure ? (
                <div className="relative space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[['Registration', regFee], ['Tuition', tuitionFee], ['Exam', examFee]].map(([label, amt]) => (
                      <div key={label as string} className="rounded-2xl bg-white/10 p-3">
                        <span className="text-emerald-100/70 block text-[11px]">{label}</span>
                        <span className="font-semibold text-sm">{CS()}{(amt as number).toLocaleString(numLocale())}</span>
                      </div>
                    ))}
                  </div>
                  {additionalFeesTotal > 0 && (
                    <div className="text-xs text-emerald-100/80 flex justify-between px-1">
                      <span>Additional charges / levies</span>
                      <span className="font-medium text-white">{CS()}{additionalFeesTotal.toLocaleString(numLocale())}</span>
                    </div>
                  )}
                  <div className="flex items-end justify-between pt-3 border-t border-white/15">
                    <span className="text-xs font-medium text-emerald-100/70">Total program fee</span>
                    <span className="text-2xl font-semibold text-[#8ae47e] tracking-tight">{CS()}{totalCourseFee.toLocaleString(numLocale())}</span>
                  </div>
                </div>
              ) : (
                <div className="relative flex items-start gap-2 text-xs text-amber-100 bg-amber-500/15 p-3 rounded-2xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>No fee structure configured for this program. You may still specify the initial payment amount.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-muted-foreground">
              <span className="w-12 h-12 rounded-full bg-[#f4f6f3] flex items-center justify-center mx-auto mb-3"><IndianRupee className="w-5 h-5" /></span>
              Select a program to see its fee structure.
            </div>
          )}

          {/* Receipt upload */}
          <Card className="rounded-3xl gap-0">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-base font-semibold">Payment receipt</Label>
                <span className="text-[11px] text-muted-foreground">Max 2 MB · images auto-compress</span>
              </div>

              <div
                className={`rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                  compressing
                    ? 'border-[#54b947]/50 bg-[#eaf6e6]'
                    : receiptFile
                      ? 'border-[#54b947]/50 bg-[#f4fbf2]'
                      : 'border-slate-300 hover:border-[#54b947] hover:bg-[#f4f6f3] cursor-pointer'
                }`}
                onClick={() => {
                  if (!compressing && !submitting) {
                    document.getElementById('receipt-upload')?.click();
                  }
                }}
              >
                <input
                  id="receipt-upload"
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  disabled={compressing || submitting}
                  onChange={handleReceiptChange}
                />

                {compressing ? (
                  <div className="flex flex-col items-center justify-center py-3 space-y-2">
                    <div className="p-3 bg-white text-[#256c1d] rounded-full">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#256c1d]">Compressing receipt image...</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Optimizing quality to stay comfortably under 2 MB</p>
                    </div>
                  </div>
                ) : receiptFile ? (
                  <div className="flex flex-col items-center space-y-3 py-1">
                    {receiptPreviewUrl ? (
                      <img
                        src={receiptPreviewUrl}
                        alt="Receipt Preview"
                        className="h-28 w-auto max-w-full object-contain rounded-xl border bg-white shadow-sm"
                      />
                    ) : (
                      <div className="p-3 bg-[#eaf6e6] text-[#256c1d] rounded-2xl">
                        <FileText className="w-10 h-10" />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-foreground truncate max-w-[200px]" title={receiptFile.name}>
                        {receiptFile.name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-[#e3f7dd] text-[#1f6a17] font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        {(receiptFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs px-4 rounded-full bg-white border-slate-200"
                        onClick={() => document.getElementById('receipt-upload')?.click()}
                      >
                        <RefreshCw className="w-3 h-3 mr-1.5" />
                        Change file
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 text-xs px-4 rounded-full text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={handleRemoveReceipt}
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-3 space-y-2">
                    <div className="p-3 bg-[#eaf6e6] text-[#256c1d] rounded-full">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Click to upload payment receipt</p>
                      <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, or PDF up to 2 MB</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {mayCreate && (
            <Button
              className="w-full h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-none"
              onClick={handleSubmit}
              disabled={submitting || compressing}
            >
              {compressing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Compressing Receipt...
                </>
              ) : submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting to Finance...
                </>
              ) : (
                <>
                  Submit to Finance
                  <Send className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
