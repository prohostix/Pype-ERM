import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, FileText, ChevronDown, ChevronUp, UserCheck, GraduationCap, Globe2, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { apiError, fmtDate, money, fileHref } from './shared';

interface Enrolled {
  id: string; studentName: string; studentEmail: string; studentPhone: string; studentAddress?: string | null;
  dateOfBirth?: string | null; passportNumber?: string | null; destinationCountry: string; universityName: string; courseName: string;
  intake: string; intakeYear?: number | null; initialPaymentAmount?: number | null; financeReviewedAt?: string | null; createdAt: string;
  studentDetails?: Record<string, string> | null; documents?: { name: string; url: string; type?: string }[];
}

const DETAIL_LABELS: [string, string][] = [
  ['session', 'Session'], ['gender', 'Gender'], ['nationality', 'Nationality'], ['altPhone', 'Alternate phone'], ['religion', 'Religion'],
  ['caste', 'Category'], ['fatherName', "Father's name"], ['fatherPhone', "Father's phone"], ['motherName', "Mother's name"],
  ['motherPhone', "Mother's phone"], ['pinCode', 'PIN code'],
];

/** The partner's students whose applications Finance has approved. */
export function EnrolledStudents() {
  const [items, setItems] = useState<Enrolled[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('all');
  const [university, setUniversity] = useState('all');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/study-abroad/me/enrollments');
      setItems((res.data.data || []).filter((a: any) => a.status === 'enrolled'));
    } catch (e) { toast.error(apiError(e, 'Failed to load enrolled students')); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const countries = useMemo(() => Array.from(new Set(items.map(a => a.destinationCountry))).sort(), [items]);
  const universities = useMemo(() => Array.from(new Set(items.filter(a => country === 'all' || a.destinationCountry === country).map(a => a.universityName))).sort(), [items, country]);
  const q = search.trim().toLowerCase();
  const shown = items.filter(a =>
    (country === 'all' || a.destinationCountry === country)
    && (university === 'all' || a.universityName === university)
    && (!q || [a.studentName, a.studentEmail, a.studentPhone, a.universityName, a.courseName].some(v => (v || '').toLowerCase().includes(q))));
  const totalPaid = shown.reduce((n, a) => n + (a.initialPaymentAmount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-success"><CardContent className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Enrolled students</p>
          <p className="text-3xl font-bold mt-1">{items.length}</p>
        </CardContent></Card>
        <Card className="border-l-4 border-l-primary"><CardContent className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Countries</p>
          <p className="text-3xl font-bold mt-1">{countries.length}</p>
        </CardContent></Card>
        <Card className="border-l-4 border-l-warning"><CardContent className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Total paid (shown)</p>
          <p className="text-3xl font-bold mt-1">{money(totalPaid)}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search student, email, phone, university or course…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {countries.length > 0 && (
          <select className="border rounded-md px-3 py-2 text-sm bg-background" value={country} onChange={e => { setCountry(e.target.value); setUniversity('all'); }}>
            <option value="all">All countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {universities.length > 1 && (
          <select className="border rounded-md px-3 py-2 text-sm bg-background" value={university} onChange={e => setUniversity(e.target.value)}>
            <option value="all">All universities</option>
            {universities.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        )}
        <Button variant="outline" size="sm" className="h-10" onClick={load} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <Card><CardContent className="py-16 text-center space-y-2">
          <UserCheck className="w-9 h-9 mx-auto text-muted-foreground" />
          <p className="font-medium">{items.length === 0 ? 'No enrolled students yet' : 'No students match your search'}</p>
          {items.length === 0 && <p className="text-sm text-muted-foreground">Students appear here once Finance approves their application.</p>}
        </CardContent></Card>
      ) : shown.map(a => {
        const isOpen = open === a.id;
        const details = DETAIL_LABELS.filter(([k]) => a.studentDetails?.[k]);
        return (
          <Card key={a.id}>
            <CardContent className="p-0">
              <button type="button" className="w-full text-left p-5 flex items-start gap-4 hover:bg-muted/40 transition-colors" onClick={() => setOpen(isOpen ? null : a.id)}>
                <div className="w-11 h-11 rounded-full bg-success/10 text-success font-bold flex items-center justify-center shrink-0">{a.studentName.slice(0, 1).toUpperCase()}</div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold">{a.studentName}</h4>
                    <Badge className="bg-success/10 text-success text-[10px] uppercase font-bold">Enrolled</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.courseName} · {a.universityName}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Globe2 className="w-3.5 h-3.5" />{a.destinationCountry}</span>
                    <span className="inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{a.intake}{a.intakeYear ? ` ${a.intakeYear}` : ''}</span>
                    <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />Enrolled {fmtDate(a.financeReviewedAt || a.createdAt)}</span>
                    {a.initialPaymentAmount ? <span>Paid {money(a.initialPaymentAmount)}</span> : null}
                  </div>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />}
              </button>

              {isOpen && (
                <div className="border-t bg-muted/20 p-5 space-y-4 text-sm">
                  <div className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
                    <p><span className="text-muted-foreground">Email:</span> {a.studentEmail}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {a.studentPhone}</p>
                    {a.dateOfBirth && <p><span className="text-muted-foreground">Date of birth:</span> {fmtDate(a.dateOfBirth)}</p>}
                    {a.passportNumber && <p><span className="text-muted-foreground">Passport:</span> {a.passportNumber}</p>}
                    {a.studentAddress && <p className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {a.studentAddress}</p>}
                    {details.map(([k, label]) => <p key={k}><span className="text-muted-foreground">{label}:</span> {a.studentDetails![k]}</p>)}
                  </div>
                  {(a.documents || []).length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {(a.documents || []).map((d, i) => (
                        <a key={i} className="text-xs text-primary hover:underline inline-flex items-center gap-1" href={fileHref(d.url)} target="_blank" rel="noreferrer">
                          <FileText className="w-3.5 h-3.5" />{d.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
