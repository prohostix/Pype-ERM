import { useState, useEffect } from 'react';
import { Plus, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';

type CourseType = 'SkillCourse' | 'OnlineDegree' | 'BVocDegree' | 'CreditTransfer';

const COURSE_TYPES: { value: CourseType; label: string; color: string; bg: string }[] = [
  { value: 'SkillCourse',     label: 'Skill Course',     color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'OnlineDegree',    label: 'Online Degree',    color: '#2563eb', bg: '#eff6ff' },
  { value: 'BVocDegree',     label: 'B.Voc Degree',    color: '#0891b2', bg: '#ecfeff' },
  { value: 'CreditTransfer',  label: 'Credit Transfer',  color: '#16a34a', bg: '#f0fdf4' },
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
  });
  const [semesters, setSemesters] = useState<Semester[]>([]);
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
        });
        setSemesters(p.semesters || []);
        setSpecInput('');
      } else {
        resetForm();
      }
    }
  }, [open, editingProgram, defaultUniversityId]);

  const fetchUniversities = async () => {
    try {
      const res = await api.get('/operations/universities');
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
      syllabus: '', registrationFee: 0, tuitionFee: 0
    });
    setSemesters([]);
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

  const addSpecialisation = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || form.specialisations.includes(trimmed)) return;
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProgram ? 'Edit Program' : 'Add New Program'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-1">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Program Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Program Code *</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
            </div>
          </div>

          <div className="space-y-1">
            <Label>University *</Label>
            <Select value={form.universityId} onValueChange={v => setForm(f => ({ ...f, universityId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select university" /></SelectTrigger>
              <SelectContent>
                {universities.map(u => (
                  <SelectItem key={u.id || u.id} value={(u.id || u.id).toString()}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Sub-Department <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select value={form.subDepartmentId || 'none'} onValueChange={v => setForm(f => ({ ...f, subDepartmentId: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Select sub-department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {subDepartments.map(sd => (
                  <SelectItem key={sd.id} value={sd.id}>{sd.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Specialisations */}
          <div className="space-y-2">
            <Label>Specialisations <span className="text-muted-foreground text-xs">(optional — add multiple)</span></Label>
            <div className="flex gap-2">
              <Input
                value={specInput}
                onChange={e => setSpecInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addSpecialisation(specInput); }
                  if (e.key === ',') { e.preventDefault(); addSpecialisation(specInput); }
                }}
                placeholder="e.g. Computer Science, then press Enter"
                className="flex-1"
              />
              <button type="button"
                onClick={() => addSpecialisation(specInput)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 border border-indigo-200">
                Add
              </button>
            </div>
            {form.specialisations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.specialisations.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                    {s}
                    <button type="button" onClick={() => removeSpecialisation(s)} className="text-violet-500 hover:text-violet-800 ml-0.5">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Fees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-1">
              <Label>Registration Fee</Label>
              <Input type="number" min="0" value={form.registrationFee} onChange={e => setForm(f => ({ ...f, registrationFee: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1">
              <Label>Tuition Fee</Label>
              <Input type="number" min="0" value={form.tuitionFee} onChange={e => setForm(f => ({ ...f, tuitionFee: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>

          {/* Syllabus */}
          <div className="space-y-1 border-t pt-4">
            <Label>Syllabus</Label>
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Enter program syllabus..."
              value={form.syllabus}
              onChange={e => setForm(f => ({ ...f, syllabus: e.target.value }))}
            />
          </div>

          {/* Course Type */}
          <div className="space-y-2">
            <Label>Course Type *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COURSE_TYPES.map(ct => (
                <button key={ct.value} type="button"
                  onClick={() => setForm(f => ({ ...f, courseType: ct.value }))}
                  className={`rounded-lg border-2 px-3 py-2.5 text-left transition-all ${
                    form.courseType === ct.value
                      ? 'border-current'
                      : 'border-slate-200 hover:border-slate-300'}`}
                  style={form.courseType === ct.value
                    ? { borderColor: ct.color, background: ct.bg }
                    : {}}>
                  <p className="text-xs font-semibold" style={{ color: form.courseType === ct.value ? ct.color : '#374151' }}>
                    {ct.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <Label>Duration *</Label>
            <Select value={String(form.duration)} onValueChange={v => handleDurationChange(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(d => (
                  <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Semesters toggle */}
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-semibold">Semester Structure</p>
                  <p className="text-xs text-muted-foreground">Optional — divide the program into semesters</p>
                </div>
              </div>
              <button type="button"
                onClick={() => handleToggleSemesters(!form.hasSemesters)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.hasSemesters ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.hasSemesters ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {form.hasSemesters && (
              <div className="space-y-2">
                {semesters.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                    <span className="text-xs font-semibold text-slate-500 w-6 shrink-0">{s.number}</span>
                    <Input
                      className="h-7 text-xs flex-1"
                      value={s.name}
                      onChange={e => updateSemester(idx, 'name', e.target.value)}
                      placeholder="Semester name" />
                    <Select value={String(s.durationMonths)}
                      onValueChange={v => updateSemester(idx, 'durationMonths', Number(v))}>
                      <SelectTrigger className="h-7 text-xs w-28 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                          <SelectItem key={m} value={String(m)}>{m} mo</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button type="button" onClick={() => removeSemester(idx)}
                      className="text-red-400 hover:text-red-600 shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addSemester}
                  className="w-full text-xs text-indigo-600 hover:text-indigo-800 border border-dashed border-indigo-300 rounded-lg py-1.5 flex items-center justify-center gap-1">
                  <Plus className="h-3 w-3" /> Add Semester
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

          {/* Status */}
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1">
              {editingProgram ? 'Save Changes' : 'Create Program'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
