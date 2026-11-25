import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Loader2, BookOpen, CreditCard, MessageSquare, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Term { title: string; body: string }

export function StudentPortalContentPanel() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [academicEmail, setAcademicEmail] = useState('');
  const [financeEmail, setFinanceEmail] = useState('');
  const [generalEmail, setGeneralEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/organizations/student-portal-config');
        const d = res.data?.data || {};
        setTerms(d.terms || []);
        setAcademicEmail(d.academicEmail || '');
        setFinanceEmail(d.financeEmail || '');
        setGeneralEmail(d.generalEmail || '');
      } catch { toast.error('Failed to load portal content'); }
      finally { setLoading(false); }
    })();
  }, []);

  const update = (i: number, patch: Partial<Term>) => setTerms(t => t.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, dir: -1 | 1) => setTerms(t => {
    const j = i + dir;
    if (j < 0 || j >= t.length) return t;
    const c = [...t]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put('/organizations/student-portal-config', { terms, academicEmail, financeEmail, generalEmail });
      setTerms(res.data?.data?.terms || []);
      toast.success('Student portal content saved');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const emailFields = [
    { label: 'Academic queries email', icon: BookOpen, value: academicEmail, set: setAcademicEmail, ph: 'academics@yourorg.com' },
    { label: 'Finance & billing email', icon: CreditCard, value: financeEmail, set: setFinanceEmail, ph: 'accounts@yourorg.com' },
    { label: 'General office email', icon: MessageSquare, value: generalEmail, set: setGeneralEmail, ph: 'info@yourorg.com' },
  ];

  return (
    <div className="space-y-6 wizard-form max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Student Portal Content</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Terms & Conditions and support emails shown to your students.</p>
        </div>
        <Button onClick={save} disabled={saving} className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save</Button>
      </div>

      <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
        <CardHeader className="px-7">
          <CardTitle className="text-lg font-semibold tracking-tight">Help & Support emails</CardTitle>
          <CardDescription className="mt-1">Shown on the student's Help & Support page. Leave a field empty to hide that card.</CardDescription>
        </CardHeader>
        <CardContent className="px-7 grid gap-4 sm:grid-cols-3">
          {emailFields.map(f => (
            <div key={f.label} className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-semibold"><span className="w-6 h-6 rounded-lg bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center"><f.icon className="w-3.5 h-3.5" /></span>{f.label}</Label>
              <Input type="email" value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
        <CardHeader className="px-7 flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Terms & Conditions</CardTitle>
            <CardDescription className="mt-1">Each section appears numbered, in this order. With no sections, students see a "not published yet" message.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => setTerms(t => [...t, { title: '', body: '' }])} className="h-10 px-5 rounded-full border-[#cfe9c9] text-[#256c1d] bg-white hover:bg-[#eaf6e6]"><Plus className="w-4 h-4 mr-1" />Add section</Button>
        </CardHeader>
        <CardContent className="px-7 space-y-4">
          {terms.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center rounded-2xl bg-[#f4f6f3]">No sections yet.</p>}
          {terms.map((t, i) => (
            <div key={i} className="rounded-2xl p-5 space-y-3 bg-[#f4f6f3]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-white text-[#256c1d] text-xs font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                <Input className="bg-white" value={t.title} onChange={e => update(i, { title: e.target.value })} placeholder="Section title, e.g. Refund Policy" />
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-white" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-white" disabled={i === terms.length - 1} onClick={() => move(i, 1)}><ArrowDown className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setTerms(x => x.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
              </div>
              <Textarea className="bg-white" rows={4} value={t.body} onChange={e => update(i, { body: e.target.value })} placeholder="Section text" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
