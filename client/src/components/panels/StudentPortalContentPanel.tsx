import { useEffect, useState } from 'react';
import { ShieldCheck, Mail, Plus, Trash2, Save, Loader2, BookOpen, CreditCard, MessageSquare, ArrowUp, ArrowDown } from 'lucide-react';
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary"><ShieldCheck className="w-6 h-6" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Student Portal Content</h1>
            <p className="text-sm text-muted-foreground">Terms & Conditions and support emails shown to your students.</p>
          </div>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save</Button>
      </div>

      <Card className="rounded-3xl py-6 gap-4">
        <CardHeader className="px-7">
          <CardTitle className="flex items-center gap-2 text-lg"><Mail className="w-5 h-5 text-primary" />Help & Support emails</CardTitle>
          <CardDescription>Shown on the student's Help & Support page. Leave a field empty to hide that card.</CardDescription>
        </CardHeader>
        <CardContent className="px-7 grid gap-4 sm:grid-cols-3">
          {emailFields.map(f => (
            <div key={f.label} className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs"><f.icon className="w-3.5 h-3.5" />{f.label}</Label>
              <Input type="email" value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-3xl py-6 gap-4">
        <CardHeader className="px-7 flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="w-5 h-5 text-primary" />Terms & Conditions</CardTitle>
            <CardDescription>Each section appears numbered, in this order. With no sections, students see a "not published yet" message.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setTerms(t => [...t, { title: '', body: '' }])}><Plus className="w-4 h-4 mr-1" />Add section</Button>
        </CardHeader>
        <CardContent className="px-7 space-y-4">
          {terms.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No sections yet.</p>}
          {terms.map((t, i) => (
            <div key={i} className="rounded-2xl border border-border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <Input value={t.title} onChange={e => update(i, { title: e.target.value })} placeholder="Section title, e.g. Refund Policy" />
                <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" disabled={i === terms.length - 1} onClick={() => move(i, 1)}><ArrowDown className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setTerms(x => x.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
              </div>
              <Textarea rows={4} value={t.body} onChange={e => update(i, { body: e.target.value })} placeholder="Section text" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
