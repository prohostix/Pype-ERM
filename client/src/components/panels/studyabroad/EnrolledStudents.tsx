import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, UserCheck, GraduationCap, Globe2, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { apiError, fmtDate, money, COMMISSION_STATUS } from './shared';

/** The partner's students who got their visa and were enrolled, with the commission on each. */
export function EnrolledStudents() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/study-abroad/me/applications');
      setItems((res.data.data || []).filter((a: any) => ['enrolled', 'commission_released'].includes(a.stage)));
    } catch (e) { toast.error(apiError(e, 'Failed to load enrolled students')); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const countries = useMemo(() => Array.from(new Set(items.map(a => a.country || 'Other'))).sort(), [items]);
  const q = search.trim().toLowerCase();
  const shown = items.filter(a => (country === 'all' || (a.country || 'Other') === country)
    && (!q || [a.studentName, a.studentEmail, a.studentPhone, a.universityName, a.programName].some((v: string) => (v || '').toLowerCase().includes(q))));
  const commission = shown.reduce((n, a) => n + (a.commissionStatus === 'payable' || a.commissionStatus === 'released' ? a.commissionAmount : 0), 0);

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
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Commission (shown)</p>
          <p className="text-3xl font-bold mt-1">{money(commission)}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search student, email, phone, university or program…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {countries.length > 1 && (
          <select className="border rounded-md px-3 py-2 text-sm bg-background" value={country} onChange={e => setCountry(e.target.value)}>
            <option value="all">All countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
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
          {items.length === 0 && <p className="text-sm text-muted-foreground">Students appear here once their visa is approved.</p>}
        </CardContent></Card>
      ) : shown.map(a => {
        const cs = COMMISSION_STATUS[a.commissionStatus] || COMMISSION_STATUS.not_eligible;
        return (
          <Card key={a.id}><CardContent className="p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-success/10 text-success font-bold flex items-center justify-center shrink-0">{a.studentName.slice(0, 1).toUpperCase()}</div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold">{a.studentName}</h4>
                <Badge className="bg-success/10 text-success text-[10px] uppercase font-bold">Enrolled</Badge>
                {a.commissionAmount > 0 && <Badge className={cn('text-[10px]', cs.className)}>Commission {cs.label.toLowerCase()}: {money(a.commissionAmount)}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{a.programName} · {a.universityName}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Globe2 className="w-3.5 h-3.5" />{a.country || 'Other'}</span>
                <span className="inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{a.studentEmail} · {a.studentPhone}</span>
                <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />Enrolled {fmtDate(a.enrolledAt)}</span>
              </div>
            </div>
          </CardContent></Card>
        );
      })}
    </div>
  );
}
