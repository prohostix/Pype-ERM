import { useState, useEffect, useMemo } from 'react';
import { GraduationCap, RefreshCw, CheckCircle2, ChevronRight, School, User, ClipboardList, BookOpen, Upload, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface University {
  name: string;
}

interface FeeStructure {
  id: string;
  sessionId?: string | { id: string } | null;
  registrationFee: number;
  tuitionFee: number;
  examFee: number;
  universityFee: number;
  gstPercentage: number;
  billingCycle: string;
  yearlyFees: any;
  additionalFees: { label: string; amount: number }[];
}

interface Program {
  id: string;
  name: string;
  code: string;
  university?: University;
  feeStructures?: FeeStructure[];
  specialisations?: string[];
}


type FeeOption = {
  id: string;
  label: string;
  totalAmount: number;
};

export function EnrollStudentPanel() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedFeeModeId, setSelectedFeeModeId] = useState<string>('');
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('all');
  const [form, setForm] = useState({ 
    studentName: '', studentEmail: '', studentPhone: '', studentAddress: '', specialisation: '',
    dob: '', altPhone: '', pinCode: '', gender: '', religion: '', caste: '',
    fatherName: '', fatherPhone: '', motherName: '', motherPhone: '',
    photo: '', documents: [] as any[],
    initialPaymentAmount: '', initialPaymentDate: '', receiptUrl: ''
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [customOtherName, setCustomOtherName] = useState<string>('');


  const fetchData = async () => {
    setLoading(true);
    try {
      const [progsRes] = await Promise.all([
        api.get('/enrollment/programs')
      ]);
      setPrograms(progsRes.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getFeeOptions = (p: Program): FeeOption[] => {
    if (!p.feeStructures || p.feeStructures.length === 0) return [];
    
    let studentSessionId: string | null = null;
    let studentSpecialisation: string | null = form.specialisation || null;

    let fs = p.feeStructures.find(f => {
      const fSid = typeof f.sessionId === 'object' ? f.sessionId?.id : f.sessionId;
      return fSid === studentSessionId && f.specialisation === studentSpecialisation;
    });
    if (!fs && studentSpecialisation) {
      fs = p.feeStructures.find(f => {
        const fSid = typeof f.sessionId === 'object' ? f.sessionId?.id : f.sessionId;
        return fSid === studentSessionId && !f.specialisation;
      });
    }
    if (!fs) {
      fs = p.feeStructures.find(f => !f.sessionId && f.specialisation === studentSpecialisation);
    }
    if (!fs && studentSpecialisation) {
      fs = p.feeStructures.find(f => !f.sessionId && !f.specialisation);
    }
    if (!fs) {
      fs = p.feeStructures[0];
    }
    const options: FeeOption[] = [];

    let additionalTotal = 0;
    if (Array.isArray(fs.additionalFees)) {
      additionalTotal = fs.additionalFees.reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0);
    }

    const baseTotal = (Number(fs.registrationFee) || 0) + (Number(fs.tuitionFee) || 0) + (Number(fs.examFee) || 0) + (Number(fs.universityFee) || 0);
    const yearlyFees = Array.isArray(fs.yearlyFees) ? fs.yearlyFees : [];

    if (fs.billingCycle === 'per_semester') {
      if (yearlyFees.length > 0) {
        const sem1 = yearlyFees[0];
        const sem1Total = (Number(sem1.registrationFee) || 0) + (Number(sem1.tuitionFee) || 0) + (Number(sem1.examFee) || 0) + (Number(sem1.universityFee) || 0);
        const sem2 = yearlyFees.length > 1 ? yearlyFees[1] : null;
        const sem2Total = sem2 ? (Number(sem2.registrationFee) || 0) + (Number(sem2.tuitionFee) || 0) + (Number(sem2.examFee) || 0) + (Number(sem2.universityFee) || 0) : 0;
        
        options.push({ id: 'first_semester', label: 'First Semester', totalAmount: sem1Total + additionalTotal });
        if (sem2) {
          options.push({ id: 'first_year', label: 'First Year (Sem 1 & 2)', totalAmount: sem1Total + sem2Total + additionalTotal });
        }
        
        options.push({ id: 'one_time', label: 'Full Course (One Time)', totalAmount: baseTotal + additionalTotal });
      } else {
        options.push({ id: 'first_semester', label: 'First Semester', totalAmount: baseTotal + additionalTotal });
      }
    } else if (fs.billingCycle === 'per_year') {
      if (yearlyFees.length > 0) {
        const year1 = yearlyFees[0];
        const year1Total = (Number(year1.registrationFee) || 0) + (Number(year1.tuitionFee) || 0) + (Number(year1.examFee) || 0) + (Number(year1.universityFee) || 0);
        options.push({ id: 'first_year', label: 'First Year', totalAmount: year1Total + additionalTotal });

        options.push({ id: 'one_time', label: 'Full Course (One Time)', totalAmount: baseTotal + additionalTotal });
      } else {
        options.push({ id: 'first_year', label: 'First Year', totalAmount: baseTotal + additionalTotal });
      }
    } else {
      options.push({ id: 'one_time', label: 'Full Course (One Time)', totalAmount: baseTotal + additionalTotal });
    }

    return options;
  };

  const handleProgramSelect = (p: Program) => {
    if (selectedProgram?.id === p.id) {
      setSelectedProgram(null);
      setSelectedFeeModeId('');
    } else {
      setSelectedProgram(p);
      const options = getFeeOptions(p);
      if (options.length > 0) {
        setSelectedFeeModeId(options[0].id);
      } else {
        setSelectedFeeModeId('');
      }
    }
  };

  const currentFeeOptions = useMemo(() => selectedProgram ? getFeeOptions(selectedProgram) : [], [selectedProgram]);
  
  const getRequiredFee = (p: Program, modeId?: string) => {
    const opts = getFeeOptions(p);
    if (!opts || opts.length === 0) return 0;
    if (modeId) {
      const selected = opts.find(o => o.id === modeId);
      if (selected) return selected.totalAmount;
    }
    return opts[0].totalAmount;
  };

  const handleEnroll = async () => {
    if (!selectedProgram) return;
    const requiredFields = [
      'studentName', 'studentEmail', 'studentPhone', 'studentAddress', 
      'dob', 'gender', 'religion', 'caste', 'fatherName', 'fatherPhone', 
      'motherName', 'motherPhone'
    ];
    if (selectedProgram.specialisations && selectedProgram.specialisations.length > 0) {
      requiredFields.push('specialisation');
    }
    const missing = requiredFields.filter(k => !(form as any)[k]?.trim());
    
    if (missing.length > 0) {
      toast.error(`Missing required fields: ${missing.join(', ')}`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.studentName,
        email: form.studentEmail,
        phone: form.studentPhone,
        address: form.studentAddress,
        dob: form.dob,
        altPhone: form.altPhone,
        pinCode: form.pinCode,
        gender: form.gender,
        religion: form.religion,
        caste: form.caste,
        fatherName: form.fatherName,
        fatherPhone: form.fatherPhone,
        motherName: form.motherName,
        motherPhone: form.motherPhone,
        photo: form.photo,
        documents: form.documents,
        specialisation: form.specialisation,
        programId: selectedProgram.id,
        universityId: selectedProgram.university?.id,
        paymentPlan: selectedFeeModeId,
        initialPaymentAmount: Number(form.initialPaymentAmount) || undefined,
        initialPaymentDate: form.initialPaymentDate || undefined,
        receiptUrl: form.receiptUrl || undefined,
        isPipelineApplication: true
      };
      await api.post('/students', payload);
      
      toast.success('Enrollment submitted successfully');
      setForm({ 
        studentName: '', studentEmail: '', studentPhone: '', studentAddress: '', specialisation: '',
        dob: '', altPhone: '', pinCode: '', gender: '', religion: '', caste: '',
        fatherName: '', fatherPhone: '', motherName: '', motherPhone: '',
        photo: '', documents: [],
        initialPaymentAmount: '', initialPaymentDate: '', receiptUrl: ''
      });
      setSelectedProgram(null);
      setSelectedFeeModeId('');
      setCurrentStep(1);
      setCustomOtherName('');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Enrollment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const currentRequiredFee = selectedProgram ? getRequiredFee(selectedProgram, selectedFeeModeId) : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Direct Enrollment</h2>
          <p className="text-muted-foreground text-sm mt-1">Select a university and program, then fill in student details to enroll.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setCurrentStep(1); setSelectedProgram(null); setSelectedFeeModeId(''); fetchData(); }} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Stepper Indicator */}
      <div className="flex items-center justify-between w-full max-w-4xl mx-auto mb-8 relative px-4">
        <div className="absolute top-1/2 left-4 right-4 h-1 bg-muted -z-10 -translate-y-1/2 rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((currentStep - 1) / 3) * 100}%` }} />
        </div>
        {[
          { step: 1, title: 'University', icon: School },
          { step: 2, title: 'Program & Fee', icon: BookOpen },
          { step: 3, title: 'Student Details', icon: User },
          { step: 4, title: 'Documents', icon: FileText }
        ].map((s) => (
          <div key={s.step} className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 font-bold border-2",
              currentStep >= s.step 
                ? "bg-primary text-primary-foreground border-primary shadow-md" 
                : "bg-background text-muted-foreground border-muted shadow-sm"
            )}>
              {currentStep > s.step ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
            </div>
            <span className={cn(
              "text-xs font-semibold uppercase tracking-wider transition-colors",
              currentStep >= s.step ? "text-primary" : "text-muted-foreground"
            )}>{s.title}</span>
          </div>
        ))}
      </div>

      {/* Step 1: University Selection */}
      {currentStep === 1 && (
      <Card className="border-none shadow-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 overflow-hidden animate-in slide-in-from-right-8 duration-300">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg"><School className="w-5 h-5" /></div>
            <div>
              <CardTitle className="text-lg">Step 1: Select University</CardTitle>
              <CardDescription>Choose the university the student will enroll in</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex gap-4">{[1,2,3].map(i => <div key={i} className="h-24 w-40 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <button
                onClick={() => { setSelectedUniversityId('all'); setSelectedProgram(null); setSelectedFeeModeId(''); }}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center h-28",
                  selectedUniversityId === 'all' ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-border hover:border-primary/40 bg-card hover:shadow-sm"
                )}
              >
                <School className={cn("w-6 h-6", selectedUniversityId === 'all' ? "text-primary" : "text-muted-foreground")} />
                <span className="font-semibold text-sm">All Universities</span>
              </button>
              {Array.from(new Map(programs.filter(p => p.university && p.university.id).map(p => [p.university!.id, p.university])).values()).map((u: any) => {
                const isSelected = selectedUniversityId === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedUniversityId(u.id); setSelectedProgram(null); setSelectedFeeModeId(''); }}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center h-28 relative overflow-hidden group",
                      isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 bg-card hover:shadow-sm"
                    )}
                  >
                    {isSelected && <div className="absolute top-2 right-2"><CheckCircle2 className="w-4 h-4 text-primary" /></div>}
                    <div className={cn("p-2 rounded-full transition-colors", isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/5")}>
                      <School className="w-6 h-6" />
                    </div>
                    <span className={cn("font-semibold text-sm line-clamp-2", isSelected ? "text-primary" : "text-foreground")}>{u.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="sticky bottom-0 bg-card pt-4 pb-2 border-t mt-8 flex justify-end z-10">
            <Button 
              size="lg" 
              onClick={() => setCurrentStep(2)} 
              className="px-8 shadow-md hover:-translate-y-0.5 transition-all"
            >
              Next Step <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Step 2: Program & Fee */}
      {currentStep === 2 && (
      <div className="max-w-4xl mx-auto animate-in slide-in-from-right-8 duration-300">
        <div className="space-y-6">
          <Card className="border-none shadow-md h-full flex flex-col">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg"><BookOpen className="w-5 h-5" /></div>
                <div>
                  <CardTitle className="text-lg">Step 2: Program & Fee Plan</CardTitle>
                  <CardDescription>Select a program and a payment structure</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
              ) : programs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No programs available for enrollment.</p>
              ) : (
                <div className="space-y-3">
                  {programs.filter(p => selectedUniversityId === 'all' || p.university?.id === selectedUniversityId).map(p => {
                    const isSelected = selectedProgram?.id === p.id;
                    const defaultTotal = getRequiredFee(p);
                    
                    return (
                      <div key={p.id} className="space-y-2">
                        <button
                          onClick={() => handleProgramSelect(p)}
                          className={cn(
                            'w-full text-left p-4 rounded-xl border-2 transition-all group',
                            isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40 bg-card hover:shadow-sm'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 pr-4">
                              <p className={cn("font-bold text-base transition-colors", isSelected ? "text-primary" : "text-foreground group-hover:text-primary")}>{p.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs font-medium">{p.code}</Badge>
                                {p.university && selectedUniversityId === 'all' && (
                                  <span className="text-xs text-muted-foreground truncate">{p.university.name}</span>
                                )}
                              </div>
                            </div>
                            {!isSelected ? (
                              <div className="text-right shrink-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Starts at</p>
                                <p className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400">₹{defaultTotal.toLocaleString()}</p>
                              </div>
                            ) : (
                              <CheckCircle2 className="w-6 h-6 text-primary shrink-0 drop-shadow-sm" />
                            )}
                          </div>
                          
                          {(p.feeStructures?.[0]?.additionalFees?.length ?? 0) > 0 && (
                            <div className="mt-4 pt-3 border-t border-border/50">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Additional Initial Fees</p>
                              <div className="flex flex-wrap gap-2">
                                {p.feeStructures!.find(f => {
                                  return (typeof f.sessionId === 'object' ? f.sessionId?.id : f.sessionId) === null;
                                })?.additionalFees?.map((f, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] bg-background/50">{f.label}: ₹{f.amount}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </button>

                        {/* Fee Options when selected */}
                        {isSelected && (
                          <div className="pl-4 pr-2 py-3 space-y-2 border-l-4 border-primary ml-2 mb-4 bg-muted/30 rounded-r-xl shadow-inner">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pl-2">Payment Plan</p>
                            {currentFeeOptions.length === 0 ? (
                              <p className="text-sm text-destructive pl-2">No fee structure configured for this program.</p>
                            ) : (
                              currentFeeOptions.map(opt => {
                                const isOptSelected = selectedFeeModeId === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => setSelectedFeeModeId(opt.id)}
                                    className={cn(
                                      "flex items-center justify-between w-full p-3.5 rounded-lg border-2 text-sm transition-all",
                                      isOptSelected ? "border-primary bg-primary text-primary-foreground shadow-md scale-[1.02]" : "border-transparent bg-background hover:border-primary/30 shadow-sm"
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0", isOptSelected ? "border-white" : "border-muted-foreground")}>
                                        {isOptSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                      </div>
                                      <span className="font-semibold text-left">{opt.label}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-bold">₹{opt.totalAmount.toLocaleString()}</span>
                                    </div>
                                  </button>
                                );
                              })
                            )}

                            {/* Payment details moved to Step 4 */}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="sticky bottom-0 bg-card pt-4 pb-2 border-t mt-8 flex justify-between z-10">
                <Button variant="outline" size="lg" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button 
                  size="lg" 
                  onClick={() => setCurrentStep(3)} 
                  disabled={!selectedProgram || !selectedFeeModeId}
                  className="px-8 shadow-md hover:-translate-y-0.5 transition-all"
                >
                  Next Step <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {/* Step 3: Student Details (Direct Enrollment Form style) */}
      {currentStep === 3 && (
      <div className="max-w-5xl mx-auto animate-in slide-in-from-right-8 duration-300">
          <Card className="border-none shadow-md h-full">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg"><User className="w-5 h-5" /></div>
                  <div>
                    <CardTitle className="text-lg">Step 3: Student Details</CardTitle>
                    <CardDescription>
                      {selectedProgram
                        ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ready: {selectedProgram.name} (Fee: ₹{currentRequiredFee.toLocaleString()})</span>
                        : 'Please select a program first'}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6">
              {/* Enrollment Type Toggle */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Student Details</h3>
                <p className="text-sm text-muted-foreground">Fill out the form below to enroll a new student.</p>
              </div>

              <div className={cn("transition-opacity duration-300", !selectedProgram ? "opacity-50 pointer-events-none" : "opacity-100")}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="font-semibold text-sm">Full Name *</Label>
                    <Input className="h-12" value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} placeholder="e.g. John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Email *</Label>
                    <Input className="h-12" type="email" value={form.studentEmail} onChange={e => setForm(f => ({ ...f, studentEmail: e.target.value }))} placeholder="john.doe@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Phone Number *</Label>
                    <Input className="h-12" value={form.studentPhone} onChange={e => setForm(f => ({ ...f, studentPhone: e.target.value }))} placeholder="+91 9876543210" />
                  </div>
                  
                  <div className="space-y-2">
                        <Label className="font-semibold text-sm">Date of Birth *</Label>
                        <Input className="h-12" type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold text-sm">Gender *</Label>
                        <Select value={form.gender} onValueChange={(val) => setForm(f => ({ ...f, gender: val }))}>
                          <SelectTrigger className="h-12"><SelectValue placeholder="Select gender..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold text-sm">Alternate Phone</Label>
                        <Input className="h-12" value={form.altPhone} onChange={e => setForm(f => ({ ...f, altPhone: e.target.value }))} placeholder="Optional" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold text-sm">Religion *</Label>
                        <Input className="h-12" value={form.religion} onChange={e => setForm(f => ({ ...f, religion: e.target.value }))} placeholder="e.g. Hindu, Muslim, Christian" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold text-sm">Caste / Category *</Label>
                        <Select value={form.caste} onValueChange={(val) => setForm(f => ({ ...f, caste: val }))}>
                          <SelectTrigger className="h-12"><SelectValue placeholder="Select Category..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General">General</SelectItem>
                            <SelectItem value="OBC">OBC</SelectItem>
                            <SelectItem value="SC">SC</SelectItem>
                            <SelectItem value="ST">ST</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                  
                  {selectedProgram?.specialisations && selectedProgram.specialisations.length > 0 && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="font-semibold text-sm">Specialisation *</Label>
                      <Select
                        value={form.specialisation}
                        onValueChange={(val) => setForm(f => ({ ...f, specialisation: val }))}
                      >
                        <SelectTrigger className="h-12"><SelectValue placeholder="Select specialisation..." /></SelectTrigger>
                        <SelectContent>
                          {selectedProgram.specialisations.map((spec: string) => (
                            <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="col-span-1 sm:col-span-2 lg:col-span-3 mt-4 mb-2">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Family Details</h4>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold text-sm">Father's Name *</Label>
                        <Input className="h-12" value={form.fatherName} onChange={e => setForm(f => ({ ...f, fatherName: e.target.value }))} placeholder="Father's full name" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold text-sm">Father's Phone *</Label>
                        <Input className="h-12" value={form.fatherPhone} onChange={e => setForm(f => ({ ...f, fatherPhone: e.target.value }))} placeholder="Father's phone number" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold text-sm">Mother's Name *</Label>
                        <Input className="h-12" value={form.motherName} onChange={e => setForm(f => ({ ...f, motherName: e.target.value }))} placeholder="Mother's full name" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold text-sm">Mother's Phone *</Label>
                        <Input className="h-12" value={form.motherPhone} onChange={e => setForm(f => ({ ...f, motherPhone: e.target.value }))} placeholder="Mother's phone number" />
                      </div>
                      
                      <div className="col-span-1 sm:col-span-2 lg:col-span-3 mt-4 mb-2">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Address Details</h4>
                      </div>

                  <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                    <Label className="font-semibold text-sm">Full Address *</Label>
                    <Input className="h-12" value={form.studentAddress} onChange={e => setForm(f => ({ ...f, studentAddress: e.target.value }))} placeholder="Street, City, State" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">PIN Code</Label>
                    <Input className="h-12" value={form.pinCode} onChange={e => setForm(f => ({ ...f, pinCode: e.target.value }))} placeholder="e.g. 110001" />
                  </div>
                </div>

                <div className="sticky bottom-0 bg-card pt-4 pb-2 border-t mt-8 flex items-center justify-between gap-4 z-10">
                  <Button variant="outline" size="lg" onClick={() => setCurrentStep(2)}>
                    Back
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 h-14 text-lg font-bold shadow-xl hover:-translate-y-0.5 transition-all bg-gradient-to-r from-primary to-blue-600 text-white"
                    onClick={() => setCurrentStep(4)}
                  >
                    Next Step <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Documents & Photo */}
      {currentStep === 4 && (
        <div className="max-w-5xl mx-auto animate-in slide-in-from-right-8 duration-300">
          <Card className="border-none shadow-md h-full">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg"><FileText className="w-5 h-5" /></div>
                <div>
                  <CardTitle className="text-lg">Step 4: Documents & Photo</CardTitle>
                  <CardDescription>Upload the student's required files and photograph.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Photo Upload */}
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">Student Photo *</Label>
                  <p className="text-xs text-muted-foreground mt-1">Clear, passport-sized photograph of the student.</p>
                  {form.photo && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2 truncate">
                      ✓ Photo Uploaded: {form.photo.split('/').pop()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {form.photo && (
                    <a
                      href={api.getFileUrl(form.photo)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 text-xs font-medium hover:bg-slate-50 shadow-sm"
                    >
                      View
                    </a>
                  )}
                  <input
                    type="file"
                    id="student-photo-upload"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const toastId = toast.loading('Uploading photo...');
                      try {
                        const uploadData = new FormData();
                        uploadData.append('file', file);
                        const res = await api.post('/auth/upload', uploadData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        setForm({ ...form, photo: res.data.url });
                        toast.success('Photo uploaded successfully', { id: toastId });
                      } catch (err) {
                        toast.error('Failed to upload photo', { id: toastId });
                      }
                    }}
                  />
                  <Label
                    htmlFor="student-photo-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 cursor-pointer shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    {form.photo ? 'Change Photo' : 'Upload Photo'}
                  </Label>
                </div>
              </div>

              {/* Documents Upload */}
              <div className="space-y-4">
                <div className="mb-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Required Documents</h4>
                  <p className="text-xs text-muted-foreground mt-1">Upload clear, legible copies of the following documents.</p>
                </div>
                {['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate', 'Transfer Certificate', 'TC / Migration / Affidavit', 'Birth Certificate', 'Degree Certificate', 'Other'].map((docType) => {
                  const existing = form.documents.find((d: any) => d.type === docType);
                  const elementId = `doc-upload-${docType.replace(/\s+/g, '-')}`;
                  return (
                    <div key={docType} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/10 gap-4">
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{docType}</span>
                        </div>
                        {docType === 'Other' && (
                           <Input 
                             className="mt-2 h-8 text-xs max-w-[200px]" 
                             placeholder="Document Name (e.g. Passport)" 
                             value={customOtherName} 
                             onChange={(e) => setCustomOtherName(e.target.value)} 
                           />
                        )}
                        {existing?.url && (
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 truncate">
                            ✓ Uploaded: {existing.url.split('/').pop()}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {existing?.url && (
                          <a
                            href={api.getFileUrl(existing.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-xs font-medium hover:bg-slate-50 shadow-sm"
                          >
                            View
                          </a>
                        )}
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
                              const newDocs = form.documents.filter((d: any) => d.type !== docType);
                              newDocs.push({ type: docType, url: res.data.url, label: docType === 'Other' ? customOtherName : undefined });
                              setForm({ ...form, documents: newDocs });
                              toast.success(`${docType} uploaded successfully`, { id: toastId });
                            } catch (err) {
                              toast.error(`Failed to upload ${docType}`, { id: toastId });
                            }
                          }}
                        />
                        <Label
                          htmlFor={elementId}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 cursor-pointer shadow-sm"
                        >
                          <Upload className="w-3 h-3" />
                          {existing?.url ? 'Change' : 'Upload'}
                        </Label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Initial Payment Details
                </h3>
                <div className="p-4 rounded-xl border bg-slate-50/50 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-semibold text-xs">Amount Paid *</Label>
                      <Input
                        type="number"
                        className="h-10 text-sm bg-white"
                        placeholder="e.g. 5000"
                        value={form.initialPaymentAmount}
                        onChange={e => setForm(f => ({ ...f, initialPaymentAmount: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-xs">Payment Date *</Label>
                      <Input
                        type="date"
                        className="h-10 text-sm bg-white"
                        value={form.initialPaymentDate}
                        onChange={e => setForm(f => ({ ...f, initialPaymentDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-xs">Upload Receipt *</Label>
                    <div className="flex items-center gap-3">
                      {form.receiptUrl && (
                        <a href={api.getFileUrl(form.receiptUrl)} target="_blank" rel="noreferrer" className="w-10 h-10 shrink-0 rounded border overflow-hidden bg-white">
                          <img src={api.getFileUrl(form.receiptUrl)} alt="Receipt" className="w-full h-full object-cover" />
                        </a>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          id="receipt-upload"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const tid = toast.loading('Uploading receipt...');
                            try {
                              const fd = new FormData();
                              fd.append('file', file);
                              const res = await api.post('/auth/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                              setForm(f => ({ ...f, receiptUrl: res.data.url }));
                              toast.success('Receipt uploaded', { id: tid });
                            } catch {
                              toast.error('Upload failed', { id: tid });
                            }
                          }}
                        />
                        <Label htmlFor="receipt-upload" className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white dark:bg-slate-800 border text-xs font-semibold cursor-pointer shadow-sm hover:bg-slate-50 w-full sm:w-auto">
                          <Upload className="w-4 h-4 mr-2 text-muted-foreground" />
                          {form.receiptUrl ? 'Change Receipt' : 'Upload File'}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-card pt-4 pb-2 border-t mt-8 flex items-center justify-between gap-4 z-10">
                <Button variant="outline" size="lg" onClick={() => setCurrentStep(3)}>
                  Back
                </Button>
                <Button
                  size="lg"
                  className="flex-1 h-14 text-lg font-bold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all bg-gradient-to-r from-primary to-blue-600"
                  onClick={handleEnroll}
                  disabled={!selectedProgram || !selectedFeeModeId || submitting}
                >
                  {submitting ? (
                    <><RefreshCw className="w-5 h-5 mr-3 animate-spin" /> Processing Enrollment...</>
                  ) : (
                    <><GraduationCap className="w-6 h-6 mr-3" /> Complete Direct Enrollment</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
