import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Building2, BookOpen, Calculator, Calendar, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';

export function FeeStructuresPanel() {
  const [step, setStep] = useState<number>(1);
  const [fees, setFees] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedUniv, setSelectedUniv] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedProg, setSelectedProg] = useState<any>(null);
  const [selectedSpecialisations, setSelectedSpecialisations] = useState<string[]>([]);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    registrationFee: '0',
    tuitionFee: '0',
    examFee: '0',
    universityFee: '0',
    commissionRate: '0',
    billingCycle: 'per_year',
    allowInitialFee: true,
    additionalFees: ''
  });
  const [yearlyFees, setYearlyFees] = useState<any[]>([]);
  const [installments, setInstallments] = useState<{name: string; amount: number; dueDate: string}[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fRes, pRes, uRes, sRes] = await Promise.all([
        api.get('/finance/fees'),
        api.get('/operations/programs'),
        api.get('/operations/universities'),
        api.get('/operations/sessions')
      ]);
      setFees(fRes.data.data || []);
      setPrograms(pRes.data.data || []);
      setUniversities(uRes.data.data || []);
      setSessions(sRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 4 && selectedProg) {
      const durationMonths = selectedProg.duration || 12;
      let periodsCount = 0;
      let periodNames: string[] = [];

      if (formData.billingCycle === 'per_semester' && selectedProg.hasSemesters && Array.isArray(selectedProg.semesters) && selectedProg.semesters.length > 0) {
        periodsCount = selectedProg.semesters.length;
        periodNames = selectedProg.semesters.map((s: any) => s.name);
      } else if (formData.billingCycle === 'per_semester') {
        periodsCount = Math.ceil(durationMonths / 6);
        periodNames = Array.from({ length: periodsCount }, (_, i) => `Semester ${i + 1}`);
      } else {
        periodsCount = Math.ceil(durationMonths / 12);
        periodNames = Array.from({ length: periodsCount }, (_, i) => `Year ${i + 1}`);
      }

      setYearlyFees(prev => {
        const next = [...prev];
        while (next.length < periodsCount) {
          next.push({
            year: next.length + 1,
            registrationFee: '0',
            tuitionFee: '0',
            examFee: '0',
            universityFee: '0',
            commissionRate: '0',
            dueDate: ''
          });
        }
        return next.slice(0, periodsCount).map((item, idx) => ({
          ...item,
          year: idx + 1,
          periodName: periodNames[idx] || (formData.billingCycle === 'per_year' ? `Year ${idx + 1}` : `Semester ${idx + 1}`)
        }));
      });
    }
  }, [formData.billingCycle, selectedProg, step]);

  const handleSelectUniv = (u: any) => {
    setSelectedUniv(u);
    setStep(2);
  };

  const handleSelectSession = (s: any) => {
    setSelectedSession(s);
    setStep(3);
  };

  const loadFeeForProgramAndSpecialisation = (p: any, spec: string | null) => {
    const existing = fees.find(f => {
      const pid = typeof f.programId === 'object' ? f.programId?.id : f.programId;
      const sid = typeof f.sessionId === 'object' ? f.sessionId?.id : f.sessionId;
      return pid === p.id && sid === (selectedSession?.id || null) && (f.specialisation || null) === spec;
    });

    if (existing) {
      setEditingFeeId(existing.id);
      setFormData({
        registrationFee: existing.registrationFee?.toString() || '0',
        tuitionFee: existing.tuitionFee?.toString() || '0',
        examFee: existing.examFee?.toString() || '0',
        universityFee: existing.universityFee?.toString() || '0',
        commissionRate: existing.commissionRate?.toString() || '0',
        billingCycle: existing.billingCycle || 'per_year',
        allowInitialFee: existing.allowInitialFee || false,
        additionalFees: Array.isArray(existing.additionalFees) ? existing.additionalFees.map((af: any) => `${af.label}:${af.amount}`).join(', ') : ''
      });
      const yf = Array.isArray(existing.yearlyFees) ? existing.yearlyFees : [];
      setYearlyFees(yf.map((y: any) => ({
        year: y.year,
        registrationFee: y.registrationFee?.toString() || '0',
        tuitionFee: y.tuitionFee?.toString() || '0',
        examFee: y.examFee?.toString() || '0',
        universityFee: y.universityFee?.toString() || '0',
        commissionRate: y.commissionRate?.toString() || '0',
        dueDate: y.dueDate || ''
      })));
      setInstallments(Array.isArray(existing.installments) ? existing.installments : []);
    } else {
      setEditingFeeId(null);
      setFormData({
        registrationFee: '0',
        tuitionFee: '0',
        examFee: '0',
        universityFee: '0',
        commissionRate: '0',
        billingCycle: 'per_year',
        allowInitialFee: true,
        additionalFees: ''
      });
      setYearlyFees([]);
      setInstallments([]);
    }
  };

  const handleSelectProg = (p: any) => {
    setSelectedProg(p);
    setSelectedSpecialisations([]);
    
    if (p.specialisations && p.specialisations.length > 0) {
      setStep(3.5);
    } else {
      loadFeeForProgramAndSpecialisation(p, null);
      setStep(4);
    }
  };

  const handleToggleSpecialisation = (spec: string) => {
    setSelectedSpecialisations(prev => 
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleSave = async () => {
    if (!selectedProg) return;
    
    setSaving(true);
    const additionalFees = formData.additionalFees
      ? formData.additionalFees.split(',').map(s => {
          const [label, amount] = s.trim().split(':');
          return { label: label?.trim(), amount: Number(amount) };
        }).filter(f => f.label && !isNaN(f.amount))
      : [];

    const formattedYearlyFees = yearlyFees.map(yf => ({
      year: Number(yf.year),
      registrationFee: Number(yf.registrationFee || 0),
      tuitionFee: Number(yf.tuitionFee || 0),
      examFee: Number(yf.examFee || 0),
      universityFee: Number(yf.universityFee || 0),
      commissionRate: Number(yf.commissionRate || 0),
      dueDate: yf.dueDate || null
    }));

    const createPayload = (spec: string | null) => ({
      programId: selectedProg.id,
      universityId: selectedUniv?.id || null,
      sessionId: selectedSession?.id || null,
      specialisation: spec,
      feeLevel: 'program',
      registrationFee: Number(formData.registrationFee),
      tuitionFee: Number(formData.tuitionFee),
      examFee: Number(formData.examFee),
      universityFee: Number(formData.universityFee),
      commissionRate: Number(formData.commissionRate),
      billingCycle: formData.billingCycle,
      allowInitialFee: formData.allowInitialFee,
      yearlyFees: formattedYearlyFees,
      installments: formData.billingCycle === 'installment' ? installments : [],
      additionalFees
    });

    try {
      if (editingFeeId) {
        await api.put(`/finance/fees/${editingFeeId}`, createPayload(selectedSpecialisations[0] || null));
        toast.success('Fee structure updated');
      } else {
        const specsToSave = selectedSpecialisations.length > 0 ? selectedSpecialisations : [null];
        for (const spec of specsToSave) {
          await api.post('/finance/fees', createPayload(spec));
        }
        toast.success(specsToSave.length > 1 ? 'Fee structures created for all selected specialisations' : 'Fee structure created');
      }
      await fetchData();
      setStep(3);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const progsForUniv = programs.filter(p => p.universityId === selectedUniv?.id);
  const sessionsForUniv = sessions.filter(s => 
    s.universityId === selectedUniv?.id || 
    (s.programId && programs.find(p => p.id === s.programId)?.universityId === selectedUniv?.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fee Structure Management</h2>
          <p className="text-muted-foreground text-sm mt-1">Configure program fees and billing structures step by step.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : (
        <>
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>1. Select University</CardTitle>
                <CardDescription>Choose a university to manage its programs' fee structures.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {universities.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUniv(u)}
                      className="flex items-center gap-4 p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left"
                    >
                      <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-semibold">{u.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{u.code}</p>
                      </div>
                    </button>
                  ))}
                  {universities.length === 0 && <p className="text-muted-foreground">No universities found.</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setStep(1)}><ArrowLeft className="w-5 h-5" /></Button>
                  <div>
                    <CardTitle>2. Select Session</CardTitle>
                    <CardDescription>{selectedUniv?.name} - Choose a session to configure fees for.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleSelectSession(null)}
                    className="flex flex-col p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left h-full bg-slate-50"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm line-clamp-1">Default (All Sessions)</p>
                        <p className="text-xs text-muted-foreground">Fallback fee structure</p>
                      </div>
                    </div>
                  </button>
                  {sessionsForUniv.map(s => {
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSelectSession(s)}
                        className="flex flex-col p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left h-full"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm line-clamp-1">{s.name}</p>
                            <p className="text-xs text-muted-foreground">Term dates: {new Date(s.startDate).toLocaleDateString()} - {new Date(s.endDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setStep(2)}><ArrowLeft className="w-5 h-5" /></Button>
                  <div>
                    <CardTitle>3. Select Program</CardTitle>
                    <CardDescription>{selectedUniv?.name} ({selectedSession ? selectedSession.name : 'Default'}) - Choose a program.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {progsForUniv.map(p => {
                    const hasFee = fees.some(f => {
                      const pid = typeof f.programId === 'object' ? f.programId?.id : f.programId;
                      const sid = typeof f.sessionId === 'object' ? f.sessionId?.id : f.sessionId;
                      return pid === p.id && sid === (selectedSession?.id || null);
                    });
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectProg(p)}
                        className="flex flex-col p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left h-full"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm line-clamp-1">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.code}</p>
                          </div>
                        </div>
                        <div className="mt-auto pt-4 flex justify-between items-center">
                           <Badge variant={hasFee ? 'default' : 'secondary'} className="text-[10px]">
                             {hasFee ? 'Configured' : 'Not Configured'}
                           </Badge>
                        </div>
                      </button>
                    );
                  })}
                  {progsForUniv.length === 0 && <p className="text-muted-foreground">No programs found for this university.</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3.5 && selectedProg && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setStep(3)}><ArrowLeft className="w-5 h-5" /></Button>
                  <div>
                    <CardTitle>3.5 Select Specialisation</CardTitle>
                    <CardDescription>{selectedProg.name} has multiple specialisations. Choose one to configure its fee structure.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedProg.specialisations?.map((spec: string) => {
                    const hasFee = fees.some(f => {
                      const pid = typeof f.programId === 'object' ? f.programId?.id : f.programId;
                      const sid = typeof f.sessionId === 'object' ? f.sessionId?.id : f.sessionId;
                      return pid === selectedProg.id && sid === (selectedSession?.id || null) && (f.specialisation || null) === spec;
                    });
                    return (
                      <button
                        key={spec}
                        onClick={() => handleToggleSpecialisation(spec)}
                        className={`flex flex-col p-4 border rounded-xl transition-all text-left h-full ${selectedSpecialisations.includes(spec) ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary hover:bg-primary/5'}`}
                      >
                        <div className="flex items-center gap-3 mb-2 w-full">
                          <div className={`p-2 rounded-full ${selectedSpecialisations.includes(spec) ? 'bg-primary text-primary-foreground' : 'bg-blue-500/10 text-blue-500'}`}>
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm line-clamp-1">{spec}</p>
                          </div>
                          {selectedSpecialisations.includes(spec) && (
                             <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold">✓</div>
                          )}
                        </div>
                        <div className="mt-auto pt-4 flex justify-between items-center w-full">
                           <Badge variant={hasFee ? 'default' : 'secondary'} className="text-[10px]">
                             {hasFee ? 'Configured' : 'Not Configured'}
                           </Badge>
                        </div>
                      </button>
                    );
                  })}
                  {(!selectedProg.specialisations || selectedProg.specialisations.length === 0) && <p className="text-muted-foreground">No specialisations found.</p>}
                </div>
                {selectedSpecialisations.length > 0 && (
                  <div className="mt-6 flex justify-end border-t pt-4">
                    <Button onClick={() => {
                      loadFeeForProgramAndSpecialisation(selectedProg, selectedSpecialisations[0]);
                      setStep(4);
                    }}>
                      Continue to Configure Fee ({selectedSpecialisations.length})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (selectedProg?.specialisations?.length > 0) {
                        setStep(3.5);
                      } else {
                        setStep(3);
                      }
                    }}><ArrowLeft className="w-5 h-5" /></Button>
                    <div>
                      <CardTitle>4. Configure Fee Structure</CardTitle>
                      <CardDescription className="text-primary font-medium mt-1">{selectedProg?.name} ({selectedProg?.code}) {selectedSpecialisations.length > 0 ? `- ${selectedSpecialisations.join(', ')}` : ''} - {selectedSession ? selectedSession.name : 'Default'}</CardDescription>
                    </div>
                  </div>
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <Save className="w-4 h-4" /> Save Fee Structure
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                
                {/* One Time Pricing Section */}
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-4 border-b pb-2">
                    <Calculator className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">One-Time Payment Plan (Lump Sum)</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Set the pricing for students who choose to pay the entire course fee upfront. This is usually discounted.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-muted/20 p-5 rounded-xl border border-border">
                    <div className="space-y-2">
                      <Label>Registration Fee</Label>
                      <Input type="number" value={formData.registrationFee} onChange={e => setFormData({...formData, registrationFee: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tuition Fee</Label>
                      <Input type="number" value={formData.tuitionFee} onChange={e => setFormData({...formData, tuitionFee: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Exam Fee</Label>
                      <Input type="number" value={formData.examFee} onChange={e => setFormData({...formData, examFee: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>University Fee</Label>
                      <Input type="number" value={formData.universityFee} onChange={e => setFormData({...formData, universityFee: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Center Commission Rate (Flat)</Label>
                      <Input type="number" value={formData.commissionRate} onChange={e => setFormData({...formData, commissionRate: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <Label>Additional One-Time Fees (Format: Label:Amount, e.g., Library:5000, ID Card:500)</Label>
                    <Input value={formData.additionalFees} onChange={e => setFormData({...formData, additionalFees: e.target.value})} placeholder="Hostel:20000, Transport:10000" />
                  </div>
                </div>

                {/* Installment Pricing Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4 border-b pb-2">
                    <Calculator className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold">Installment Payment Plan</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Set the pricing breakdown for students who pay in installments (per year or per semester).</p>

                  <div className="w-64 mb-6">
                    <Label className="mb-2 block">Installment Cycle</Label>
                    <Select value={formData.billingCycle} onValueChange={v => setFormData({...formData, billingCycle: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_year">Year-wise</SelectItem>
                        <SelectItem value="per_semester">Semester-wise</SelectItem>
                        {selectedProg?.courseType === 'CreditTransfer' && (
                          <SelectItem value="installment">Custom Installments</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mb-6 flex items-center space-x-2 bg-muted/30 p-4 rounded-lg border border-border">
                    <Checkbox 
                      id="allowInitialFee" 
                      checked={formData.allowInitialFee}
                      onCheckedChange={(c) => setFormData({...formData, allowInitialFee: !!c})}
                    />
                    <div className="space-y-1 leading-none">
                      <label htmlFor="allowInitialFee" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Allow Initial Fee Collection
                      </label>
                      <p className="text-sm text-muted-foreground">
                        If enabled, sales users will be able to enter a custom initial fee collected from the student during enrollment.
                      </p>
                    </div>
                  </div>

                  {formData.billingCycle === 'installment' ? (
                    <div className="space-y-3 rounded-xl border border-slate-200 p-4 bg-card shadow-sm">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-700">Custom Installments</Label>
                        <Button type="button" variant="outline" size="sm" onClick={() => setInstallments([...installments, { name: `Installment ${installments.length + 1}`, amount: 0, dueDate: '' }])} className="h-8 gap-1"><Plus className="h-3.5 w-3.5" /> Add Installment</Button>
                      </div>
                      {installments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No installments added yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {installments.map((inst, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Input value={inst.name} onChange={e => { const next = [...installments]; next[idx].name = e.target.value; setInstallments(next); }} placeholder="Installment Name" className="flex-1" />
                              <Input type="number" value={inst.amount} onChange={e => { const next = [...installments]; next[idx].amount = parseFloat(e.target.value) || 0; setInstallments(next); }} placeholder="Amount" className="w-24 sm:w-32" />
                              <Input type="date" value={inst.dueDate} onChange={e => { const next = [...installments]; next[idx].dueDate = e.target.value; setInstallments(next); }} className="w-32 sm:w-40" />
                              <Button type="button" variant="ghost" size="icon" onClick={() => { const next = [...installments]; next.splice(idx, 1); setInstallments(next); }} className="h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50 shrink-0"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {yearlyFees.map((yf, idx) => (
                      <div key={idx} className="p-4 border rounded-xl bg-card shadow-sm flex flex-col gap-4">
                        <div className="font-semibold text-primary">{yf.periodName}</div>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Reg Fee</Label>
                            <Input type="number" className="h-8" value={yf.registrationFee} onChange={e => {
                              const next = [...yearlyFees];
                              next[idx].registrationFee = e.target.value;
                              setYearlyFees(next);
                            }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Tuition Fee</Label>
                            <Input type="number" className="h-8" value={yf.tuitionFee} onChange={e => {
                              const next = [...yearlyFees];
                              next[idx].tuitionFee = e.target.value;
                              setYearlyFees(next);
                            }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Exam Fee</Label>
                            <Input type="number" className="h-8" value={yf.examFee} onChange={e => {
                              const next = [...yearlyFees];
                              next[idx].examFee = e.target.value;
                              setYearlyFees(next);
                            }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Univ Fee</Label>
                            <Input type="number" className="h-8" value={yf.universityFee} onChange={e => {
                              const next = [...yearlyFees];
                              next[idx].universityFee = e.target.value;
                              setYearlyFees(next);
                            }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Commission (Flat)</Label>
                            <Input type="number" className="h-8" value={yf.commissionRate} onChange={e => {
                              const next = [...yearlyFees];
                              next[idx].commissionRate = e.target.value;
                              setYearlyFees(next);
                            }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Due Date</Label>
                            <Input type="date" className="h-8" value={yf.dueDate || ''} onChange={e => {
                              const next = [...yearlyFees];
                              next[idx].dueDate = e.target.value;
                              setYearlyFees(next);
                            }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {yearlyFees.length === 0 && (
                      <p className="text-sm text-muted-foreground">Select an installment cycle to view periods.</p>
                    )}
                  </div>
                  )}
                </div>

              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
