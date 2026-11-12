import { useEffect, useMemo, useState } from 'react';
import {
  Globe2, School, BookOpen, User, FileText, Check, ChevronLeft, ChevronRight, GraduationCap, UserCheck,
  Upload, Trash2, RefreshCw, XCircle, CheckCircle2, Phone, Mail, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { uploadFormFile } from '@/lib/uploadFile';
import { toast } from 'sonner';
import { apiError, fmtMonths, MONTHS, type CatalogCountry, type Prefill } from './shared';

/**
 * Student application wizard — follows the Direct Enrollment wizard:
 *   1 Verify Student → 2 University → 3 Program & Session → 4 Student Details → 5 Documents
 * Required fields and documents come from the university's enrollment form configuration, the same
 * configuration Direct Enrollment uses, with the same defaults.
 */
const STEPS = [
  { title: 'Verify Student', icon: UserCheck },
  { title: 'University', icon: School },
  { title: 'Program & Session', icon: BookOpen },
  { title: 'Student Details', icon: User },
  { title: 'Documents', icon: FileText },
];

// Same document list as Direct Enrollment.
const DOC_TYPES = ['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate', 'Transfer Certificate', 'TC / Migration / Affidavit', 'Birth Certificate', 'Degree Certificate', 'Other'];
const DEFAULT_CONFIG = { requiredFields: ['email', 'dob', 'address', 'pinCode', 'fatherName', 'photo'], requiredDocuments: ['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate'] };

interface UploadedDoc { type: string; url: string; label?: string; status: string }

const emptyForm = {
  studentName: '', studentEmail: '', studentPhone: '', studentAddress: '', dob: '', altPhone: '', pinCode: '',
  gender: '', religion: '', caste: '',
  fatherName: '', fatherPhone: '', motherName: '', motherPhone: '',
};

const norm = (s: string) => s.trim().toLowerCase();
const sameDoc = (req: string, d: string) =>
  norm(req) === norm(d)
  || (norm(req) === 'transfer certificate' && norm(d) === 'tc / migration / affidavit')
  || (norm(req) === 'tc / migration / affidavit' && norm(d) === 'transfer certificate');

type State = 'new' | 'registered' | 'in_progress';
type Verify = { status: State; message: string; phone?: State; email?: State } | null;

export function ApplyWizard({ prefill, onDone }: { prefill: Prefill | null; onDone: () => void }) {
  const [catalog, setCatalog] = useState<CatalogCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState(emptyForm);
  const [verify, setVerify] = useState<Verify>(null);
  const [verifying, setVerifying] = useState(false);

  const [country, setCountry] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [programId, setProgramId] = useState('');
  const [specialisation, setSpecialisation] = useState('');
  const [intakeKey, setIntakeKey] = useState('');

  const [photo, setPhoto] = useState('');
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [customOtherName, setCustomOtherName] = useState('');
  // Payment to the organization (amount, date, receipt) — required, like Direct Enrollment's initial payment
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [receipt, setReceipt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/study-abroad/me/catalog')
      .then(r => setCatalog(r.data.data || []))
      .catch(e => toast.error(apiError(e, 'Failed to load programs')))
      .finally(() => setLoading(false));
  }, []);

  const countryData = catalog.find(c => c.country === country);
  const university = countryData?.universities.find(u => u.id === universityId);
  const program = university?.programs.find(p => p.id === programId);
  const needsSpec = (program?.specialisations.length || 0) > 0;
  const intakes = useMemo(() => program?.intakes || [], [program]);
  const intake = intakes.find(i => i.id === intakeKey);

  // Coming from Search Programs: fill the choices, but the student is still verified first.
  useEffect(() => {
    if (!prefill || catalog.length === 0) return;
    const c = catalog.find(x => x.country === prefill.country);
    const u = c?.universities.find(x => x.name === prefill.university);
    const p = u?.programs.find(x => x.id === prefill.programId);
    if (!c || !u || !p) return;
    setCountry(c.country); setUniversityId(u.id); setProgramId(p.id);
    setSpecialisation(prefill.specialisation || ''); setIntakeKey('');
  }, [prefill, catalog]);

  // Required fields/documents of the chosen university (same rules as Direct Enrollment).
  const config = useMemo(() => {
    let reqFields = [...DEFAULT_CONFIG.requiredFields];
    let reqDocs = [...DEFAULT_CONFIG.requiredDocuments];
    let raw: any = university?.enrollmentFormConfig;
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = null; } }
    if (raw?.requiredFields) reqFields = raw.requiredFields;
    if (raw?.requiredDocuments) reqDocs = raw.requiredDocuments;
    return { requiredFields: reqFields, requiredDocuments: reqDocs };
  }, [university]);
  const isFieldReq = (f: string) => ['name', 'phone'].includes(f) || config.requiredFields.includes(f);
  const isDocReq = (d: string) => config.requiredDocuments.some(r => sameDoc(r, d));

  const setF = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Step 1: verify (checks as the partner types, like Direct Enrollment) ──
  const phoneOk = form.studentPhone.replace(/\D/g, '').length >= 7;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.studentEmail.trim());

  useEffect(() => {
    if (!phoneOk && !emailOk) { setVerify(null); return; }
    setVerifying(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.post('/study-abroad/me/verify-student', {
          studentEmail: emailOk ? form.studentEmail.trim() : undefined,
          studentPhone: phoneOk ? form.studentPhone.trim() : undefined,
        });
        const d: NonNullable<Verify> = res.data.data;
        setVerify(d);
      } catch (e) { setVerify(null); toast.error(apiError(e, 'Could not verify the student')); }
      finally { setVerifying(false); }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.studentPhone, form.studentEmail]);

  const runVerify = () => {
    if (!form.studentPhone.trim()) return toast.error("Please enter the student's phone number to verify.");
    if (!phoneOk) return toast.error('Please enter a valid phone number (at least 7 digits)');
    if (!form.studentEmail.trim()) return toast.error("Please enter the student's email address to verify.");
    if (!emailOk) return toast.error('Please enter a valid email address');
    if (!form.studentName.trim()) return toast.error("Please enter the student's full name.");
    if (verifying) return toast.info('Verifying student details, please wait a moment...');
    if (verify && verify.status !== 'new') return toast.error(verify.message);
    if (!verify) return toast.error('Could not verify the student. Please try again.');
    setStep(2);
  };

  // ── Uploads (same helper and behaviour as Direct Enrollment) ──
  const uploadDoc = async (docType: string, file?: File) => {
    if (!file) return;
    const tid = toast.loading(`Compressing & uploading ${docType}...`);
    try {
      const url = await uploadFormFile(file);
      setDocuments(ds => [...ds.filter(d => d.type !== docType), { type: docType, url, label: docType === 'Other' ? customOtherName : undefined, status: 'pending' }]);
      toast.success(`${docType} uploaded successfully`, { id: tid });
    } catch (err: any) { toast.error(err.message || `Failed to upload ${docType}`, { id: tid }); }
  };
  const uploadReceipt = async (file?: File) => {
    if (!file) return;
    const tid = toast.loading('Compressing & uploading receipt...');
    try { setReceipt(await uploadFormFile(file)); toast.success('Receipt uploaded', { id: tid }); }
    catch (err: any) { toast.error(err.message || 'Failed to upload receipt', { id: tid }); }
  };
  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    const tid = toast.loading('Compressing & uploading photo...');
    try { setPhoto(await uploadFormFile(file)); toast.success('Photo uploaded successfully', { id: tid }); }
    catch (err: any) { toast.error(err.message || 'Failed to upload photo', { id: tid }); }
  };

  // ── Step gates ──
  const intakeOk = intakes.length === 0 || !!intake;
  const goNext = () => {
    if (step === 2 && !university) return toast.error('Please choose a country and a university');
    if (step === 3) {
      if (!program) return toast.error('Please choose a program');
      if (needsSpec && !specialisation) return toast.error('Please choose a specialisation');
      if (!intakeOk) return toast.error('Please choose a session / intake');
    }
    if (step === 4) {
      const checks: [string, string, string][] = [
        ['name', form.studentName, 'Full name'], ['email', form.studentEmail, 'Email'], ['phone', form.studentPhone, 'Phone number'],
        ['dob', form.dob, 'Date of birth'], ['gender', form.gender, 'Gender'], ['altPhone', form.altPhone, 'Alternate phone'],
        ['religion', form.religion, 'Religion'], ['caste', form.caste, 'Caste / category'], ['fatherName', form.fatherName, "Father's name"],
        ['fatherPhone', form.fatherPhone, "Father's phone"], ['motherName', form.motherName, "Mother's name"],
        ['motherPhone', form.motherPhone, "Mother's phone"], ['address', form.studentAddress, 'Full address'], ['pinCode', form.pinCode, 'PIN code'],
        ['photo', photo, 'Student photo'],
      ];
      const missing = checks.filter(([k, v]) => isFieldReq(k) && !v.trim()).map(([, , l]) => l);
      if (missing.length) return toast.error(`Missing required fields: ${missing.join(', ')}`);
    }
    setStep(s => s + 1);
  };

  const submit = async () => {
    if (!program || !university) return;
    const missingDocs = config.requiredDocuments.filter(r => !documents.some(d => sameDoc(r, d.type)));
    if (missingDocs.length) return toast.error(`Missing required documents: ${missingDocs.join(', ')}`);
    if (!(Number(payAmount) > 0)) return toast.error('Enter the amount paid');
    if (!payDate) return toast.error('Enter the payment date');
    if (!receipt) return toast.error('Upload the payment receipt');
    setSubmitting(true);
    try {
      await api.post('/study-abroad/me/enrollments', {
        studentName: form.studentName, studentEmail: form.studentEmail, studentPhone: form.studentPhone,
        studentAddress: form.studentAddress, dob: form.dob || undefined,
        programId: program.id, specialisation: specialisation || undefined, sessionId: intake?.id,
        gender: form.gender, altPhone: form.altPhone, pinCode: form.pinCode, religion: form.religion, caste: form.caste,
        fatherName: form.fatherName, fatherPhone: form.fatherPhone, motherName: form.motherName, motherPhone: form.motherPhone,
        photo, documents,
        initialPaymentAmount: Number(payAmount), initialPaymentDate: payDate, receiptUrl: receipt,
      });
      toast.success('Application submitted');
      onDone();
    } catch (e) { toast.error(apiError(e, 'Failed to submit application')); } finally { setSubmitting(false); }
  };

  const pickCountry = (c: string) => { setCountry(c); setUniversityId(''); setProgramId(''); setSpecialisation(''); setIntakeKey(''); };
  const pickUniversity = (id: string) => { setUniversityId(id); setProgramId(''); setSpecialisation(''); setIntakeKey(''); };
  const pickProgram = (id: string) => { setProgramId(id); setSpecialisation(''); setIntakeKey(''); };

  const field = (k: keyof typeof emptyForm, label: string, reqKey: string, type = 'text', cls = '') => (
    <div className={cn('space-y-2', cls)} key={k}>
      <Label className="font-semibold text-sm">{label}{isFieldReq(reqKey) ? ' *' : ''}</Label>
      <Input className="h-12" type={type} value={form[k]} onChange={setF(k)} />
    </div>
  );
  const choice = (k: 'gender' | 'caste', label: string, reqKey: string, options: string[]) => (
    <div className="space-y-2">
      <Label className="font-semibold text-sm">{label}{isFieldReq(reqKey) ? ' *' : ''}</Label>
      <select className="w-full h-12 border rounded-md px-3 text-sm bg-background" value={form[k]} onChange={setF(k)}>
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  if (loading) return <div className="h-64 bg-muted rounded-xl animate-pulse" />;

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="relative flex justify-between max-w-3xl mx-auto w-full">
        <div className="absolute top-5 left-0 w-full h-0.5 bg-muted" />
        <div className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500" style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }} />
        {STEPS.map((s, i) => {
          const n = i + 1;
          return (
            <div key={s.title} className="relative flex flex-col items-center gap-2 z-10">
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background transition-colors',
                step >= n ? 'border-primary text-primary' : 'border-muted-foreground/30 text-muted-foreground', step > n && 'bg-primary text-primary-foreground')}>
                {step > n ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              <span className={cn('text-xs font-medium text-center', step >= n ? 'text-primary' : 'text-muted-foreground')}>{s.title}</span>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Step {step}: {STEPS[step - 1].title}</CardTitle>
          <CardDescription>
            {step === 1 && 'Enter the student’s email and phone to check for earlier or ongoing applications.'}
            {step === 2 && 'Choose the destination country, then a university in that country.'}
            {step === 3 && 'Choose the program, specialisation and session.'}
            {step === 4 && 'Fill in the student’s details. Fields marked * are required.'}
            {step === 5 && 'Upload the student’s documents and the payment receipt. Fields marked * are required.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1 — verify */}
          {step === 1 && (
            <div className="space-y-6">
              {(['studentPhone', 'studentEmail'] as const).map(k => {
                const isPhone = k === 'studentPhone';
                const state = isPhone ? verify?.phone : verify?.email;
                const ready = isPhone ? phoneOk : emailOk;
                return (
                  <div key={k} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="font-semibold text-sm flex items-center gap-1.5">
                        {isPhone ? <Phone className="w-4 h-4 text-primary" /> : <Mail className="w-4 h-4 text-primary" />}
                        {isPhone ? 'Phone Number' : 'Email Address'} <span className="text-rose-500">*</span>
                      </Label>
                      {ready && verifying && <span className="text-xs text-muted-foreground flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin text-primary" />Checking…</span>}
                      {ready && !verifying && state === 'new' && (
                        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 text-[11px] font-semibold gap-1"><CheckCircle2 className="w-3 h-3" />{isPhone ? 'Phone' : 'Email'} Available</Badge>
                      )}
                      {ready && !verifying && state === 'registered' && (
                        <Badge variant="outline" className="text-amber-800 bg-amber-50 border-amber-300 text-[11px] font-semibold gap-1"><AlertTriangle className="w-3 h-3" />Already registered</Badge>
                      )}
                      {ready && !verifying && state === 'in_progress' && (
                        <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-300 text-[11px] font-semibold gap-1"><AlertTriangle className="w-3 h-3" />Application in progress</Badge>
                      )}
                    </div>
                    <Input className="h-12 text-base font-medium" type={isPhone ? 'tel' : 'email'}
                      placeholder={isPhone ? 'e.g. 9876543210' : 'e.g. student@example.com'}
                      value={form[k]} onChange={setF(k)} />
                    <p className="text-xs text-muted-foreground">
                      {isPhone ? 'Enter the primary phone number to check for earlier or ongoing applications.' : 'The student’s email address for admissions and communications.'}
                    </p>
                  </div>
                );
              })}

              <div className="space-y-2">
                <Label className="font-semibold text-sm flex items-center gap-1.5"><User className="w-4 h-4 text-muted-foreground" />Student Full Name <span className="text-rose-500">*</span></Label>
                <Input className="h-12 text-base" placeholder="Student full legal name" value={form.studentName} onChange={setF('studentName')} />
                <p className="text-xs text-muted-foreground">Full legal name of the student as per ID documents.</p>
              </div>

              {verify?.status === 'in_progress' && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3.5">
                  <XCircle className="w-5 h-5 mt-0.5 shrink-0 text-rose-700" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-rose-900 text-sm">Application Already In Progress (Cannot Apply)</h4>
                      <Badge className="bg-rose-600 text-white text-[10px] uppercase font-bold">In Progress</Badge>
                    </div>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">{verify.message}</p>
                  </div>
                </div>
              )}
              {verify?.status === 'registered' && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3.5">
                  <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-700" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-amber-900 text-sm">Already Registered (Cannot Apply)</h4>
                      <Badge className="bg-amber-600 text-white text-[10px] uppercase font-bold">Registered</Badge>
                    </div>
                    <p className="text-xs text-amber-900 mt-1 leading-relaxed">{verify.message}</p>
                  </div>
                </div>
              )}
              {verify?.status === 'new' && emailOk && phoneOk && !verifying && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Both phone number and email address are available. You can proceed with a new application.</span>
                </div>
              )}
            </div>
          )}

          {/* 2 — country then university */}
          {step === 2 && (catalog.every(c => c.universities.length === 0)
            ? <p className="text-sm text-muted-foreground py-6 text-center">No programs are available yet. Please contact the organization.</p>
            : <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Country *</Label>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {catalog.filter(c => c.universities.length > 0).map(c => (
                      <button key={c.country} type="button" onClick={() => pickCountry(c.country)}
                        className={cn('text-left border rounded-xl p-4 hover:border-primary/50 transition-colors', country === c.country && 'border-primary bg-primary/5 ring-1 ring-primary')}>
                        <p className="font-semibold flex items-center gap-2"><Globe2 className="w-4 h-4" />{c.country}</p>
                        <p className="text-xs text-muted-foreground mt-1">{c.universities.length} {c.universities.length === 1 ? 'university' : 'universities'}</p>
                      </button>
                    ))}
                  </div>
                </div>
                {countryData && (
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">University in {country} *</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {countryData.universities.map(u => (
                        <button key={u.id} type="button" onClick={() => pickUniversity(u.id)}
                          className={cn('text-left border rounded-xl p-4 flex gap-3 hover:border-primary/50 transition-colors', universityId === u.id && 'border-primary bg-primary/5 ring-1 ring-primary')}>
                          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">{u.name.slice(0, 1).toUpperCase()}</div>
                          <div>
                            <p className="font-semibold">{u.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{u.programs.length} {u.programs.length === 1 ? 'program' : 'programs'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>)}

          {/* 3 — program, specialisation, session */}
          {step === 3 && (
            <div className="space-y-6">
              {university?.programs.length === 0 && <p className="text-sm text-muted-foreground">This university has no active programs yet.</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {university?.programs.map(p => (
                  <button key={p.id} type="button" onClick={() => pickProgram(p.id)}
                    className={cn('text-left border rounded-xl p-4 hover:border-primary/50 transition-colors', programId === p.id && 'border-primary bg-primary/5 ring-1 ring-primary')}>
                    <p className="font-semibold flex items-center gap-2"><GraduationCap className="w-4 h-4" />{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.courseType}{p.duration ? ` · ${fmtMonths(p.duration)}` : ''}</p>
                  </button>
                ))}
              </div>
              {program && needsSpec && (
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Specialisation *</Label>
                  <div className="flex flex-wrap gap-2">
                    {program.specialisations.map(sp => (
                      <button key={sp} type="button" onClick={() => setSpecialisation(sp)}
                        className={cn('text-sm px-3.5 py-1.5 rounded-full border transition-colors', specialisation === sp ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>{sp}</button>
                    ))}
                  </div>
                </div>
              )}
              {program && (
                <div className="space-y-2 max-w-md">
                  <Label className="font-semibold text-sm">Session{intakes.length > 0 ? ' *' : ''}</Label>
                  <select className="w-full h-12 border rounded-md px-3 text-sm bg-background disabled:opacity-60" disabled={intakes.length === 0}
                    value={intakeKey} onChange={e => setIntakeKey(e.target.value)}>
                    <option value="">{intakes.length === 0 ? 'No sessions available for this university' : 'Select session…'}</option>
                    {intakes.map(i => {
                      const key = i.id;
                      return <option key={key} value={key}>{i.session} · {MONTHS[i.month - 1]} {i.year}{i.open ? '' : ' (closed)'}</option>;
                    })}
                  </select>
                  {intakes.length === 0 && <p className="text-xs text-muted-foreground">The organization hasn't created an admission session for {university?.name} yet. You can continue without one.</p>}
                </div>
              )}
            </div>
          )}

          {/* 4 — student details (same order and fields as Direct Enrollment) */}
          {step === 4 && (
            <div className="space-y-8">
              <div>
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Personal Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {field('studentName', 'Full Name', 'name', 'text', 'sm:col-span-2')}
                  {field('studentEmail', 'Email', 'email', 'email')}
                  {field('studentPhone', 'Phone Number', 'phone', 'tel')}
                  {field('dob', 'Date of Birth', 'dob', 'date')}
                  {choice('gender', 'Gender', 'gender', ['Male', 'Female', 'Other'])}
                  {field('altPhone', 'Alternate Phone', 'altPhone', 'tel')}
                  {field('religion', 'Religion', 'religion')}
                  {choice('caste', 'Caste / Category', 'caste', ['General', 'OBC', 'SC', 'ST', 'Other'])}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Family Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {field('fatherName', "Father's Name", 'fatherName')}
                  {field('fatherPhone', "Father's Phone", 'fatherPhone', 'tel')}
                  {field('motherName', "Mother's Name", 'motherName')}
                  {field('motherPhone', "Mother's Phone", 'motherPhone', 'tel')}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Address</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {field('studentAddress', 'Full Address', 'address', 'text', 'sm:col-span-2')}
                  {field('pinCode', 'PIN Code', 'pinCode')}
                </div>
              </div>
              {/* Photo */}
              <div className="p-4 rounded-xl border bg-muted/30 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold">Student Photo{isFieldReq('photo') ? ' *' : ''}</p>
                  <p className="text-xs text-muted-foreground">A clear, recent passport-size photo.</p>
                  {photo && <p className="text-xs text-emerald-600 font-medium mt-1">✓ Uploaded</p>}
                </div>
                <div className="flex items-center gap-2">
                  {photo && <a href={api.getFileUrl(photo)} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg border bg-background text-xs font-medium">View</a>}
                  <input type="file" id="sa-photo" className="hidden" accept="image/*" onChange={e => uploadPhoto(e.target.files?.[0])} />
                  <Label htmlFor="sa-photo" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold cursor-pointer">
                    <Upload className="w-4 h-4" />{photo ? 'Change Photo' : 'Upload Photo'}
                  </Label>
                  {photo && !isFieldReq('photo') && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setPhoto('')} className="border-red-200 bg-red-50 text-red-600"><Trash2 className="w-4 h-4 mr-1" />Remove</Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5 — documents (same list and behaviour as Direct Enrollment) */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider">Required Documents</h4>
                <p className="text-xs text-muted-foreground mt-1">Upload clear, legible copies of the following documents.</p>
              </div>
              {DOC_TYPES.map(docType => {
                const existing = documents.find(d => d.type === docType);
                const optional = !isDocReq(docType);
                const id = `sa-doc-${docType.replace(/\W+/g, '-')}`;
                return (
                  <div key={docType} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border bg-muted/30 gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{docType}{!optional ? ' *' : ''}</span>
                        {optional && <span className="text-xs text-muted-foreground">(optional)</span>}
                      </div>
                      {docType === 'Other' && (
                        <Input className="mt-2 h-8 text-xs max-w-[220px]" placeholder="Document Name (e.g. Passport)" value={customOtherName} onChange={e => setCustomOtherName(e.target.value)} />
                      )}
                      {existing?.url
                        ? <p className="text-xs text-emerald-600 font-medium mt-1 truncate">✓ Uploaded: {existing.url.split('/').pop()}</p>
                        : <p className={cn('text-xs font-medium mt-1', optional ? 'text-muted-foreground' : 'text-rose-500')}>{optional ? 'Optional' : '⚠️ Required'}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {existing?.url && <a href={api.getFileUrl(existing.url)} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 rounded-lg border bg-background text-xs font-medium">View</a>}
                      {existing?.url && optional && (
                        <Button type="button" variant="outline" size="sm" className="border-red-200 bg-red-50 text-red-600 text-xs"
                          onClick={() => { setDocuments(ds => ds.filter(d => d.type !== docType)); if (docType === 'Other') setCustomOtherName(''); toast.success(`${docType} removed`); }}>
                          <Trash2 className="w-3 h-3 mr-1" />Remove
                        </Button>
                      )}
                      <input type="file" id={id} className="hidden" onChange={e => { uploadDoc(docType, e.target.files?.[0]); e.target.value = ''; }} />
                      <Label htmlFor={id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer">
                        <Upload className="w-3 h-3" />{existing?.url ? 'Change' : 'Upload'}
                      </Label>
                    </div>
                  </div>
                );
              })}

              <div className="mt-2">
                <h4 className="text-lg font-bold mb-3">Payment Details</h4>
                <div className="p-4 rounded-xl border bg-muted/30 space-y-4">
                  <p className="text-xs text-muted-foreground">Enter the payment made to the organization for this student, and upload its receipt. Finance verifies it.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-semibold text-xs">Amount Paid *</Label>
                      <Input type="number" min="0" className="h-10 text-sm bg-background" placeholder="e.g. 5000" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-xs">Payment Date *</Label>
                      <Input type="date" className="h-10 text-sm bg-background" value={payDate} onChange={e => setPayDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-xs">Upload Receipt *</Label>
                    <div className="flex items-center gap-3">
                      {receipt && <a href={api.getFileUrl(receipt)} target="_blank" rel="noreferrer" className="text-xs font-medium text-emerald-600 underline">✓ View uploaded receipt</a>}
                      <input type="file" id="sa-receipt" className="hidden" onChange={e => { uploadReceipt(e.target.files?.[0]); e.target.value = ''; }} />
                      <Label htmlFor="sa-receipt" className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-background border text-xs font-semibold cursor-pointer shadow-sm">
                        <Upload className="w-4 h-4 mr-2 text-muted-foreground" />{receipt ? 'Change Receipt' : 'Upload File'}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
                <p className="font-semibold">Review</p>
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  <p><span className="text-muted-foreground">Student:</span> {form.studentName}</p>
                  <p><span className="text-muted-foreground">Contact:</span> {form.studentEmail} · {form.studentPhone}</p>
                  <p><span className="text-muted-foreground">Country:</span> {country}</p>
                  <p><span className="text-muted-foreground">University:</span> {university?.name}</p>
                  <p><span className="text-muted-foreground">Program:</span> {program?.name}{specialisation ? ` — ${specialisation}` : ''}</p>
                  <p><span className="text-muted-foreground">Session:</span> {intake ? `${intake.session} (${MONTHS[intake.month - 1]} ${intake.year})` : '—'}</p>
                </div>
                <div className="flex gap-2 pt-1 flex-wrap">
                  {photo && <Badge variant="secondary">Photo</Badge>}
                  <Badge variant="secondary">{documents.length} document{documents.length === 1 ? '' : 's'}</Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center gap-4">
        <Button variant="outline" size="lg" disabled={step === 1 || submitting} onClick={() => setStep(s => s - 1)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
        {step === 1 ? (
          <Button size="lg" onClick={runVerify} disabled={verifying}
            className={cn('px-8 h-12 text-base font-semibold', verify && verify.status !== 'new' && 'bg-rose-600 hover:bg-rose-700 text-white')}>
            {verifying ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Verifying Student…</>
              : verify && verify.status !== 'new' ? <><XCircle className="w-4 h-4 mr-2" />Cannot Apply</>
              : <>Next Step<ChevronRight className="w-4 h-4 ml-1" /></>}
          </Button>
        ) : step < STEPS.length ? (
          <Button size="lg" onClick={goNext}>Next Step<ChevronRight className="w-4 h-4 ml-1" /></Button>
        ) : (
          <Button size="lg" className="flex-1 sm:flex-none h-12 font-bold" onClick={submit} disabled={submitting}>
            {submitting ? <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Submitting…</> : <><GraduationCap className="w-5 h-5 mr-2" />Submit Application</>}
          </Button>
        )}
      </div>
    </div>
  );
}
