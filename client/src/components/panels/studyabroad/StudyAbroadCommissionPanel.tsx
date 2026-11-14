import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { apiError, fmtDate, money, commissionLabel } from './shared';

/** Org admin: what each partner has earned, what is still payable, and what has been paid out. */
export function StudyAbroadCommissionPanel({ onOpenApplications }: { onOpenApplications: () => void }) {
  const [data, setData] = useState<{ partners: any[]; payouts: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData((await api.get('/study-abroad/commissions')).data.data); }
    catch (e) { toast.error(apiError(e, 'Failed to load commissions')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const totalPayable = (data?.partners || []).reduce((s, p) => s + p.payableAmount, 0);
  const totalReleased = (data?.partners || []).reduce((s, p) => s + p.releasedAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Payable now</div><div className="text-xl font-bold text-warning">{money(totalPayable)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Released</div><div className="text-xl font-bold text-success">{money(totalReleased)}</div></CardContent></Card>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh</Button>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground border-b">
            <th className="p-3">Partner</th><th className="p-3 text-right">Payable</th><th className="p-3 text-right">Released</th>
          </tr></thead>
          <tbody>
            {(data?.partners || []).map(p => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3"><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.code}</div></td>
                <td className="p-3 text-right">{p.payableCount > 0 ? <><strong>{money(p.payableAmount)}</strong> <span className="text-xs text-muted-foreground">({p.payableCount})</span></> : '—'}</td>
                <td className="p-3 text-right">{p.releasedCount > 0 ? <>{money(p.releasedAmount)} <span className="text-xs text-muted-foreground">({p.releasedCount})</span></> : '—'}</td>
              </tr>
            ))}
            {data && data.partners.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No partners yet.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
      <p className="text-xs text-muted-foreground">To release a payable commission, open the student in <button className="text-primary hover:underline" onClick={onOpenApplications}>Applications</button> (Enrolled stage). Commission rates are set per program below.</p>

      <RatesTable />

      <div>
        <h4 className="text-sm font-semibold mb-2">Payout history</h4>
        {(data?.payouts || []).length === 0 ? <p className="text-sm text-muted-foreground">No commission has been released yet.</p> : (
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground border-b"><th className="p-3">Date</th><th className="p-3">Partner</th><th className="p-3">Student</th><th className="p-3">Reference</th><th className="p-3 text-right">Amount</th></tr></thead>
              <tbody>
                {data!.payouts.map(p => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-3">{fmtDate(p.paidAt)}</td><td className="p-3">{p.partnerName}</td><td className="p-3">{p.studentName}</td>
                    <td className="p-3">{p.reference ? <Badge variant="outline">{p.reference}</Badge> : '—'}</td><td className="p-3 text-right font-medium">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}

/** The commission paid to the partner for each student enrolled in a program. Set per university program. */
function RatesTable() {
  const [unis, setUnis] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, { type: string; value: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setUnis((await api.get('/study-abroad/commission-rates')).data.data || []); setEdits({}); }
    catch (e) { toast.error(apiError(e, 'Failed to load commission rates')); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (programId: string, type: string, value: string) => {
    setSaving(programId);
    try {
      await api.put(`/study-abroad/commission-rates/${programId}`, { commissionType: type, commissionValue: type === 'none' ? undefined : Number(value) });
      toast.success('Commission saved');
      await load();
    } catch (e) { toast.error(apiError(e, 'Failed to save')); }
    finally { setSaving(null); }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Commission per program</h4>
      <p className="text-xs text-muted-foreground">Paid to the partner for each student who is enrolled in the program. A percentage is taken on the payment verified for that student. The rate in force when the student is enrolled is the one used.</p>
      {unis.length === 0 ? <p className="text-sm text-muted-foreground">No programs yet.</p> : unis.map(u => (
        <Card key={u.id}><CardContent className="p-0">
          <div className="px-4 py-2 border-b font-medium text-sm">{u.name}{u.country ? <span className="text-xs text-muted-foreground"> · {u.country}</span> : null}</div>
          {u.programs.map((p: any) => {
            const e = edits[p.id] ?? { type: p.commissionType, value: p.commissionValue ? String(p.commissionValue) : '' };
            const dirty = e.type !== p.commissionType || (e.type !== 'none' && Number(e.value) !== p.commissionValue);
            const invalid = e.type !== 'none' && (!(Number(e.value) > 0) || (e.type === 'percentage' && Number(e.value) > 100));
            return (
              <div key={p.id} className="px-4 py-2 border-b last:border-0 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <div className="text-sm">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{commissionLabel(p.commissionType, p.commissionValue)}</div>
                </div>
                <select className="border rounded-md px-2 py-1.5 text-sm bg-background" value={e.type} onChange={ev => setEdits(m => ({ ...m, [p.id]: { type: ev.target.value, value: ev.target.value === 'none' ? '' : e.value } }))}>
                  <option value="none">No commission</option>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
                <Input className="w-28 h-9" type="number" min={0} max={e.type === 'percentage' ? 100 : undefined} step="0.01" disabled={e.type === 'none'}
                  value={e.value} placeholder={e.type === 'percentage' ? '%' : 'Amount'} onChange={ev => setEdits(m => ({ ...m, [p.id]: { type: e.type, value: ev.target.value } }))} />
                <Button size="sm" disabled={!dirty || invalid || saving === p.id} onClick={() => save(p.id, e.type, e.value)}>Save</Button>
              </div>
            );
          })}
        </CardContent></Card>
      ))}
    </div>
  );
}
