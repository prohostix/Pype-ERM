import { useState, useEffect } from 'react';
import { Plus, Trash2, Layers, GraduationCap, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';

type CourseType = 'SkillCourse' | 'OnlineDegree' | 'BVocDegree' | 'CreditTransfer' | 'Yearly' | 'OneSitting';

const COURSE_TYPES: { value: CourseType; label: string }[] = [
  { value: 'SkillCourse',     label: 'Skill Course' },
  { value: 'OnlineDegree',    label: 'Online Degree' },
  { value: 'BVocDegree',      label: 'B.Voc Degree' },
  { value: 'CreditTransfer',  label: 'Credit Transfer' },
  { value: 'Yearly',          label: 'Yearly' },
  { value: 'OneSitting',      label: 'One Sitting' },
];

const DURATION_OPTIONS = [
  { value: 3,  label: '3 months' },
  { value: 6,  label: '6 months' },
  { value: 9,  label: '9 months' },
  { value: 11, label: '11 months' },
  { value: 12, label: '1 year (12 months)' },
  { value: 18, label: '1.5 years (18 months)' },
  { value: 24, label: '2 years (24 months)' },
  { value: 30, label: '2.5 years (30 months)' },
  { value: 36, label: '3 years (36 months)' },
  { value: 42, label: '3.5 years (42 months)' },
  { value: 48, label: '4 years (48 months)' },
];

interface Semester { number: number; name: string; durationMonths: number; }
interface SubDepartment { id: string; name: string; }

interface ProgramFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingProgram?: any;
  defaultUniversityId?: string;
}

export function ProgramFormDialog({
  open,
  onOpenChange,
  onSuccess,
  editingProgram,
  defaultUniversityId
}: ProgramFormDialogProps) {
  const [universities, setUniversities] = useState<any[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);

  const [form, setForm] = useState({
    name: '', code: '', universityId: '',
    subDepartmentId: '',
    courseType: 'OnlineDegree' as CourseType,
    duration: 12, status: 'active',
    hasSemesters: false,
    specialisations: [] as string[],
    syllabus: '',
    registrationFee: 0,
    tuitionFee: 0,
    billingCycle: 'one_time' as 'one_time' | 'installment',
  });
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [installments, setInstallments] = useState<{name: string; amount: number; dueDate: string}[]>([]);
  const [specInput, setSpecInput] = useState('');

  useEffect(() => {
    if (open) {
      fetchUniversities();
      fetchSubDepartments();
      if (editingProgram) {
        const p = editingProgram;
        const uniId = typeof p.universityId === 'object' ? (p.universityId?.id || p.universityId?.id) : p.universityId;
        const subDeptId = typeof p.subDepartmentId === 'object' ? (p.subDepartmentId?.id || p.subDepartmentId?.id) : p.subDepartmentId;
        const programFee = (p.feeStructures || []).find((f: any) => f.feeLevel === 'program');
        setForm({
          name: p.name, code: p.code,
          universityId: uniId?.toString() || '',
          subDepartmentId: subDeptId?.toString() || '',
          courseType: p.courseType || 'OnlineDegree',
          duration: p.duration,
          status: p.status,
          hasSemesters: p.hasSemesters || false,
          specialisations: Array.isArray(p.specialisations) ? p.specialisations : [],
          syllabus: p.syllabus || '',
          registrationFee: programFee?.registrationFee || 0,
          tuitionFee: programFee?.tuitionFee || 0,
          billingCycle: programFee?.billingCycle === 'installment' ? 'installment' : 'one_time',
        });
        setSemesters(p.semesters || []);
        setInstallments(Array.isArray(programFee?.installments) ? programFee.installments : []);
        setSpecInput('');
      } else {
        resetForm();
      }
    }
  }, [open, editingProgram, defaultUniversityId]);

  const fetchUniversities = async () => {
    try {
      const res = await api.get('/operations/universities?all=true');
      setUniversities(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchSubDepartments = async () => {
    try {
      const res = await api.get('/sub-departments');
      setSubDepartments(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setForm({
      name: '', code: '', universityId: defaultUniversityId || '', subDepartmentId: '',
      courseType: 'OnlineDegree', duration: 12, status: 'active',
      hasSemesters: false, specialisations: [],
      syllabus: '', registrationFee: 0, tuitionFee: 0,
      billingCycle: 'one_time'
    });
    setSemesters([]);
    setInstallments([]);
    setSpecInput('');
  };

  const autoSemesters = (durationMonths: number): Semester[] => {
    const semCount = Math.round(durationMonths / 6);
    const perSem = Math.round(durationMonths / semCount);
    return Array.from({ length: semCount }, (_, i) => ({
      number: i + 1,
      name: `Semester ${i + 1}`,
      durationMonths: perSem,
    }));
  };

  const handleToggleSemesters = (enabled: boolean) => {
    setForm(f => ({ ...f, hasSemesters: enabled }));
    if (enabled && semesters.length === 0) {
      setSemesters(autoSemesters(form.duration));
    }
  };

  const handleDurationChange = (val: number) => {
    setForm(f => ({ ...f, duration: val }));
    if (form.hasSemesters) setSemesters(autoSemesters(val));
  };

  const updateSemester = (idx: number, field: keyof Semester, value: any) => {
    setSemesters(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addSemester = () => {
    setSemesters(prev => [...prev, {
      number: prev.length + 1,
      name: `Semester ${prev.length + 1}`,
      durationMonths: 6,
    }]);
  };

  const removeSemester = (idx: number) => {
    setSemesters(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, number: i + 1, name: `Semester ${i + 1}` })));
  };

  const addInstallment = () => {
    setInstallments(prev => [...prev, { name: `Installment ${prev.length + 1}`, amount: 0, dueDate: '' }]);
  };

  const removeInstallment = (idx: number) => {
    setInstallments(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, name: `Installment ${i + 1}` })));
  };

  const updateInstallment = (idx: number, field: 'name' | 'amount' | 'dueDate', value: any) => {
    setInstallments(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addSpecialisation = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setSpecInput('');
      return;
    }
    if (form.specialisations.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Specialisation already added');
      return;
    }
    setForm(f => ({ ...f, specialisations: [...f.specialisations, trimmed] }));
    setSpecInput('');
  };

  const removeSpecialisation = (s: string) => {
    setForm(f => ({ ...f, specialisations: f.specialisations.filter(x => x !== s) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        subDepartmentId: form.subDepartmentId || null,
        semesters: form.hasSemesters ? semesters : [],
        installments: form.billingCycle === 'installment' ? installments : [],
      };
      if (editingProgram) {
        await api.put(`/operations/programs/${editingProgram.id}`, payload);
      } else {
        await api.post('/operations/programs', payload);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save program');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetForm(); }}>
      <DialogContent className="w-[96vw] sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
        <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
            {editingProgram ? <Edit className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
          </div>
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground text-left">{editingProgram ? 'Edit Program' : 'Add New Program'}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-left">Set the program details, fees and structure.</DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-8">
            {/* Basics */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Program name <span className="text-rose-500">*</span></Label>
                  <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Program code <span className="text-rose-500">*</span></Label>
                  <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4 font-mono" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">University <span className="text-rose-500">*</span></Label>
                  <Select value={form.universityId} onValueChange={v => setForm(f => ({ ...f, universityId: v }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue placeholder="Select university" /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {universities.map(u => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Sub-department <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Select value={form.subDepartmentId || 'none'} onValueChange={v => setForm(f => ({ ...f, subDepartmentId: v === 'none' ? '' : v }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue placeholder="Select sub-department" /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="none">None</SelectItem>
                      {subDepartments.map(sd => (
                        <SelectItem key={sd.id} value={sd.id}>{sd.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Specialisations <span className="font-normal text-muted-foreground">(optional, add several)</span></Label>
                <div className="flex gap-2">
                  <Input
                    value={specInput}
                    onChange={e => setSpecInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addSpecialisation(specInput); }
                      if (e.key === ',') { e.preventDefault(); addSpecialisation(specInput); }
                    }}
                    placeholder="e.g. Computer Science, then press Enter"
                    className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4 flex-1"
                  />
                  <button type="button"
                    onClick={() => addSpecialisation(specInput)}
                    className="shrink-0 px-5 h-11 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-[#eaf6e6] hover:text-[#256c1d] transition-colors">
                    Add
                  </button>
                </div>
                {form.specialisations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.specialisations.map(s => (
                      <span key={s} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium bg-[#eaf6e6] text-[#1f6a17]">
                        {s}
                        <button type="button" onClick={() => removeSpecialisation(s)} className="w-5 h-5 rounded-full hover:bg-white flex items-center justify-center text-[#256c1d]">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Course structure */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course structure</h3>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Course type <span className="text-rose-500">*</span></Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {COURSE_TYPES.map(ct => {
                    const on = form.courseType === ct.value;
                    return (
                      <button key={ct.value} type="button" aria-pressed={on}
                        onClick={() => setForm(f => ({ ...f, courseType: ct.value }))}
                        className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold border transition-colors ${on ? 'bg-[#eaf6e6] border-[#54b947]/50 text-[#1f6a17]' : 'bg-white border-slate-200 text-slate-600 hover:bg-[#f4f6f3]'}`}>
                        {ct.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Duration <span className="text-rose-500">*</span></Label>
                <Select value={String(form.duration)} onValueChange={v => handleDurationChange(Number(v))}>
                  <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {DURATION_OPTIONS.map(d => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Semesters toggle */}
              <div className="rounded-3xl bg-[#f4f6f3] p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center"><Layers className="h-4 w-4 text-[#256c1d]" /></span>
                    <div>
                      <p className="text-sm font-semibold">Semester structure</p>
                      <p className="text-xs text-muted-foreground">Optional, divide the program into semesters</p>
                    </div>
                  </div>
                  <button type="button" aria-pressed={form.hasSemesters}
                    onClick={() => handleToggleSemesters(!form.hasSemesters)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.hasSemesters ? 'bg-[#54b947]' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.hasSemesters ? 'translate-x-5' : ''}`} />
                  </button>
                </div>

                {form.hasSemesters && (
                  <div className="space-y-2">
                    {semesters.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2">
                        <span className="text-xs font-semibold text-slate-500 w-6 shrink-0 text-center">{s.number}</span>
                        <Input
                          className="h-9 rounded-full bg-[#f4f6f3] border-transparent text-xs px-3 flex-1"
                          value={s.name}
                          onChange={e => updateSemester(idx, 'name', e.target.value)}
                          placeholder="Semester name" />
                        <Select value={String(s.durationMonths)}
                          onValueChange={v => updateSemester(idx, 'durationMonths', Number(v))}>
                          <SelectTrigger className="h-9 rounded-full bg-[#f4f6f3] border-transparent text-xs px-3 w-28 shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                              <SelectItem key={m} value={String(m)}>{m} mo</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button type="button" onClick={() => removeSemester(idx)}
                          className="w-8 h-8 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 flex items-center justify-center">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addSemester}
                      className="w-full text-xs font-semibold text-[#256c1d] hover:bg-[#eaf6e6] border border-dashed border-[#54b947]/50 rounded-full py-2.5 flex items-center justify-center gap-1 transition-colors">
                      <Plus className="h-3.5 w-3.5" /> Add semester
                    </button>
                    {semesters.length > 0 && (
                      <p className="text-xs text-muted-foreground text-right">
                        Total: {semesters.reduce((a, s) => a + s.durationMonths, 0)} months
                        {semesters.reduce((a, s) => a + s.durationMonths, 0) !== form.duration && (
                          <span className="text-amber-600 ml-1">
                            (program is {form.duration} months)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Fees */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fees</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Registration fee</Label>
                  <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" type="number" min="0" value={form.registrationFee} onChange={e => setForm(f => ({ ...f, registrationFee: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Tuition fee</Label>
                  <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" type="number" min="0" value={form.tuitionFee} onChange={e => setForm(f => ({ ...f, tuitionFee: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>

              {form.courseType === 'CreditTransfer' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Fee structure type</Label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {([['one_time', 'One-Time Payment'], ['installment', 'Installments']] as const).map(([val, label]) => (
                        <button key={val} type="button" aria-pressed={form.billingCycle === val} onClick={() => setForm(f => ({ ...f, billingCycle: val }))}
                          className={`rounded-full px-4 py-2.5 text-sm font-semibold border transition-colors ${form.billingCycle === val ? 'bg-[#0b1d14] border-[#0b1d14] text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-[#f4f6f3]'}`}>{label}</button>
                      ))}
                    </div>
                  </div>

                  {form.billingCycle === 'installment' && (
                    <div className="space-y-3 rounded-3xl bg-[#f4f6f3] p-5">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Installments</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addInstallment} className="h-9 px-4 rounded-full bg-white border-slate-200 gap-1 hover:bg-[#eaf6e6]"><Plus className="h-3.5 w-3.5" /> Add installment</Button>
                      </div>

                      {installments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No installments added yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {installments.map((inst, idx) => (
                            <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white rounded-2xl px-3 py-2">
                              <Input value={inst.name} onChange={e => updateInstallment(idx, 'name', e.target.value)} placeholder="Installment name" className="h-9 rounded-full bg-[#f4f6f3] border-transparent text-xs px-3 flex-1 min-w-[140px]" />
                              <Input type="number" value={inst.amount} onChange={e => updateInstallment(idx, 'amount', parseFloat(e.target.value) || 0)} placeholder="Amount" className="h-9 rounded-full bg-[#f4f6f3] border-transparent text-xs px-3 w-24 sm:w-32" />
                              <Input type="date" value={inst.dueDate} onChange={e => updateInstallment(idx, 'dueDate', e.target.value)} className="h-9 rounded-full bg-[#f4f6f3] border-transparent text-xs px-3 w-36 sm:w-40" />
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeInstallment(idx)} className="h-8 w-8 rounded-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 shrink-0"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Syllabus + status */}
            <section className="space-y-4 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">More</h3>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Syllabus</Label>
                <textarea
                  className="flex min-h-[120px] w-full rounded-2xl bg-[#f4f6f3] border border-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:bg-white focus-visible:border-[#54b947] focus-visible:ring-4 focus-visible:ring-[#54b947]/20 resize-none"
                  placeholder="Enter program syllabus..."
                  value={form.syllabus}
                  onChange={e => setForm(f => ({ ...f, syllabus: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Status</Label>
                <div className="flex gap-2.5">
                  {([['active', 'Active'], ['inactive', 'Inactive']] as const).map(([val, label]) => (
                    <button key={val} type="button" aria-pressed={form.status === val} onClick={() => setForm(f => ({ ...f, status: val }))}
                      className={`px-6 py-2.5 rounded-full text-sm font-semibold border transition-colors ${form.status === val ? 'bg-[#0b1d14] border-[#0b1d14] text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-[#f4f6f3]'}`}>{label}</button>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
            <Button type="submit" className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
              {editingProgram ? 'Save Changes' : 'Create Program'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
