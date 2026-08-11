import { useState, useEffect, useMemo } from 'react';
import { GraduationCap, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface University {
  name: string;
}

interface FeeStructure {
  id: string;
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
}

interface WalletData {
  balance: number;
}

type FeeOption = {
  id: string;
  label: string;
  totalAmount: number;
};

export function EnrollStudentPanel() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedFeeModeId, setSelectedFeeModeId] = useState<string>('');
  const [form, setForm] = useState({ studentName: '', studentEmail: '', studentPhone: '', studentAddress: '' });
  const [students, setStudents] = useState<any[]>([]);
  const [studentMode, setStudentMode] = useState<'new' | 'existing'>('new');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [progsRes, walletRes, studentsRes] = await Promise.all([
        api.get('/enrollment/programs'),
        api.get('/enrollment/wallet'),
        api.get('/students').catch(() => ({ data: { data: [] } })),
      ]);
      setPrograms(progsRes.data.data || []);
      setWallet(walletRes.data.data);
      setStudents(studentsRes.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getFeeOptions = (p: Program): FeeOption[] => {
    if (!p.feeStructures || p.feeStructures.length === 0) return [];
    const fs = p.feeStructures[0];
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
    const missing = Object.entries(form).filter(([, v]) => !v.trim()).map(([k]) => k);
    if (missing.length > 0) {
      toast.error(`Missing: ${missing.join(', ')}`);
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/enrollment/enroll', { 
        ...form, 
        studentId: studentMode === 'existing' ? selectedStudentId : undefined,
        programId: selectedProgram.id,
        feeMode: selectedFeeModeId 
      });
      toast.success('Enrollment submitted successfully');
      setForm({ studentName: '', studentEmail: '', studentPhone: '', studentAddress: '' });
      setSelectedProgram(null);
      setSelectedFeeModeId('');
      setSelectedStudentId('');
      setStudentMode('new');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Enrollment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const balance = wallet?.balance || 0;
  const currentRequiredFee = selectedProgram ? getRequiredFee(selectedProgram, selectedFeeModeId) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enroll a Student</h2>
          <p className="text-muted-foreground text-sm mt-1">Select a program, fee structure, and fill in student details to enroll.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Wallet Balance</p>
            <p className="text-lg font-bold text-primary">₹{balance.toLocaleString()}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Program Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Program & Fee</CardTitle>
            <CardDescription>Choose program and fee payment plan</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : programs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No programs available for enrollment.</p>
            ) : (
              <div className="space-y-3">
                {programs.map(p => {
                  const isSelected = selectedProgram?.id === p.id;
                  const defaultTotal = getRequiredFee(p);
                  const canAffordDefault = balance >= defaultTotal;
                  
                  return (
                    <div key={p.id} className="space-y-2">
                      <button
                        onClick={() => handleProgramSelect(p)}
                        className={cn(
                          'w-full text-left p-4 rounded-xl border transition-all',
                          isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                          (!canAffordDefault && !isSelected) && 'opacity-60'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.code} {p.university ? `• ${p.university.name}` : ''}</p>
                          </div>
                          {!isSelected && (
                            <div className="text-right">
                              <p className="font-bold text-sm">Starts at ₹{defaultTotal.toLocaleString()}</p>
                              {!canAffordDefault && <Badge variant="destructive" className="text-[9px]">Insufficient</Badge>}
                            </div>
                          )}
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        {(p.feeStructures?.[0]?.additionalFees?.length ?? 0) > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {p.feeStructures![0].additionalFees.map((f, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">{f.label}: ₹{f.amount}</Badge>
                            ))}
                          </div>
                        )}
                      </button>

                      {/* Fee Options when selected */}
                      {isSelected && (
                        <div className="pl-4 pr-2 py-2 space-y-2 border-l-2 border-primary ml-2 mb-4 bg-muted/20 rounded-r-xl">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Select Payment Plan</p>
                          {currentFeeOptions.length === 0 ? (
                            <p className="text-sm text-destructive">No fee structure configured for this program.</p>
                          ) : (
                            currentFeeOptions.map(opt => {
                              const canAffordOpt = balance >= opt.totalAmount;
                              const isOptSelected = selectedFeeModeId === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => setSelectedFeeModeId(opt.id)}
                                  className={cn(
                                    "flex items-center justify-between w-full p-3 rounded-lg border text-sm transition-all",
                                    isOptSelected ? "border-primary bg-primary/10 font-medium shadow-sm" : "border-border hover:border-primary/30 bg-background",
                                    !canAffordOpt && "opacity-50"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", isOptSelected ? "border-primary" : "border-muted-foreground")}>
                                      {isOptSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                                    </div>
                                    <span>{opt.label}</span>
                                  </div>
                                  <div className="text-right">
                                    <span>₹{opt.totalAmount.toLocaleString()}</span>
                                    {!canAffordOpt && <span className="block text-[10px] text-destructive mt-0.5">Insufficient</span>}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Details */}
        <Card>
          <CardHeader>
            <CardTitle>Student Details</CardTitle>
            <CardDescription>
              {selectedProgram
                ? `Enrolling in: ${selectedProgram.name} — Fee: ₹${currentRequiredFee.toLocaleString()}`
                : 'Select a program first'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 border-b pb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={studentMode === 'new'} onChange={() => {
                  setStudentMode('new');
                  setSelectedStudentId('');
                  setForm({ studentName: '', studentEmail: '', studentPhone: '', studentAddress: '' });
                }} />
                <span className="text-sm font-medium">New Student</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={studentMode === 'existing'} onChange={() => {
                  setStudentMode('existing');
                  setForm({ studentName: '', studentEmail: '', studentPhone: '', studentAddress: '' });
                }} />
                <span className="text-sm font-medium">Existing Student</span>
              </label>
            </div>

            {studentMode === 'existing' && (
              <div className="space-y-1 pb-2 border-b">
                <Label>Select Existing Student</Label>
                <select 
                  className="w-full border rounded-md p-2 bg-background text-sm"
                  value={selectedStudentId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setSelectedStudentId(sid);
                    const s = students.find(st => st.id === sid);
                    if (s) {
                      setForm({
                        studentName: s.name || '',
                        studentEmail: s.email || '',
                        studentPhone: s.phone || '',
                        studentAddress: s.address || '',
                      });
                    } else {
                      setForm({ studentName: '', studentEmail: '', studentPhone: '', studentAddress: '' });
                    }
                  }}
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={form.studentName} disabled={studentMode === 'existing'} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} placeholder="Student full name" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.studentEmail} disabled={studentMode === 'existing'} onChange={e => setForm(f => ({ ...f, studentEmail: e.target.value }))} placeholder="student@email.com" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.studentPhone} disabled={studentMode === 'existing'} onChange={e => setForm(f => ({ ...f, studentPhone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={form.studentAddress} disabled={studentMode === 'existing'} onChange={e => setForm(f => ({ ...f, studentAddress: e.target.value }))} placeholder="Full address" />
            </div>
            <Button
              className="w-full mt-2"
              onClick={handleEnroll}
              disabled={!selectedProgram || !selectedFeeModeId || submitting || (balance < currentRequiredFee)}
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              {submitting ? 'Enrolling...' : 'Enroll Student'}
            </Button>
            {selectedProgram && balance < currentRequiredFee && (
              <p className="text-xs text-destructive text-center">Insufficient wallet balance for selected plan. Please top up first.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
