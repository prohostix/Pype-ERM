import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Mail, MessageSquare, Phone, StickyNote, Trash2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

const inr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);
const fmtDate = (d?: string | Date | null, withTime = false) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleString('en-IN', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' });
};

/** The fee structure that applies to this student: same specialisation / session when there are several */
const pickFeeStructure = (student: any) => {
  const list: any[] = student.program?.feeStructures || [];
  if (list.length === 0) return null;
  const score = (f: any) =>
    (f.specialisation && f.specialisation === student.specialisation ? 2 : f.specialisation ? -2 : 0) +
    (f.sessionId && f.sessionId === student.sessionId ? 2 : f.sessionId ? -2 : 0) +
    (f.universityId && f.universityId === student.universityId ? 1 : 0);
  return [...list].sort((a, b) => score(b) - score(a))[0];
};

// ── Fees ──────────────────────────────────────────────────────────────────────────────
export function StudentFeesTab({ student }: { student: any }) {
  const data = useMemo(() => {
    const invoices: any[] = student.invoices || [];
    const schedules: any[] = student.paymentSchedules || [];

    const payments: any[] = invoices.flatMap((inv) =>
      (inv.payments || []).map((p: any) => ({
        id: p.id, date: p.receivedAt || p.createdAt, invoiceNo: inv.invoiceNo, method: p.method, ref: p.referenceNo, amount: p.amount || 0, scheduleId: inv.scheduleId
      }))
    );
    // Initial admission payments recorded on the enrollment itself. Only this student's current
    // program counts, and dropped enrollments are other admissions.
    for (const enr of student.enrollments || []) {
      if (!enr.initialPaymentAmount || enr.initialPaymentAmount <= 0) continue;
      if (['dropped', 'rejected', 'cancelled'].includes(enr.status)) continue;
      if (enr.programId && student.programId && enr.programId !== student.programId) continue;
      if (payments.some((p) => Math.abs(p.amount - enr.initialPaymentAmount) < 0.01)) continue;
      payments.push({ id: `enr-${enr.id}`, date: enr.initialPaymentDate || enr.createdAt, invoiceNo: '-', method: 'initial', ref: 'Admission payment', amount: enr.initialPaymentAmount });
    }
    payments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const fs = pickFeeStructure(student);
    const additional = Array.isArray(fs?.additionalFees) ? fs.additionalFees.reduce((s: number, f: any) => s + (Number(f?.amount) || 0), 0) : 0;
    const structureTotal = fs ? (fs.registrationFee || 0) + (fs.tuitionFee || 0) + (fs.examFee || 0) + additional : 0;
    const scheduleTotal = schedules.reduce((s, x) => s + (x.amount || 0), 0);
    const gross = structureTotal || scheduleTotal;
    const discount = Number(student.discountAmount) || 0;
    const total = Math.max(gross - discount, 0);
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    const paidBySchedule = new Map<string, number>();
    payments.forEach((p) => p.scheduleId && paidBySchedule.set(p.scheduleId, (paidBySchedule.get(p.scheduleId) || 0) + p.amount));
    return { payments, schedules, total, discount, paid, balance: Math.max(total - paid, 0), paidBySchedule, hasStructure: !!structureTotal };
  }, [student]);

  if (data.payments.length === 0 && data.schedules.length === 0 && data.total === 0) {
    return (
      <div className="text-center py-10 space-y-3">
        <CreditCard className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
        <h4 className="text-base font-semibold">No Fee Records Found</h4>
        <p className="text-sm text-muted-foreground">This student does not have any fee records yet.</p>
      </div>
    );
  }

  const tile = (label: string, value: string, tone: string) => (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <p className="text-[11px] uppercase tracking-wider font-semibold opacity-70">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tile(data.discount ? 'Total fee (after discount)' : 'Total fee', inr(data.total), 'bg-muted/30')}
        {tile('Paid', inr(data.paid), 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900')}
        {tile('Balance', inr(data.balance), data.balance > 0 ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900' : 'bg-muted/30')}
        {tile('Installments', String(data.schedules.length), 'bg-muted/30')}
      </div>
      {!data.hasStructure && <p className="text-xs text-muted-foreground">No fee structure is set for this program, so the total comes from the installments.</p>}

      {data.schedules.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Installments</h4>
          <div className="border rounded-md">
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Due</TableHead><TableHead>Amount</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.schedules.map((s: any) => {
                  const status = String(s.status || '').toLowerCase();
                  const paid = status === 'paid' ? s.amount : Math.min(data.paidBySchedule.get(s.id) || 0, s.amount);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title}{s.isOldFee && <Badge variant="outline" className="ml-2 text-[10px]">OLD FEE</Badge>}</TableCell>
                      <TableCell>{fmtDate(s.dueDate)}</TableCell>
                      <TableCell>{inr(s.amount)}</TableCell>
                      <TableCell>{inr(paid)}</TableCell>
                      <TableCell>
                        <Badge variant={status === 'paid' ? 'default' : status === 'overdue' ? 'destructive' : 'secondary'} className={status === 'paid' ? 'bg-green-500 hover:bg-green-600 uppercase' : 'uppercase'}>{status || 'pending'}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-2">Payments received ({data.payments.length})</h4>
        {data.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payment has been received yet.</p>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Invoice</TableHead><TableHead>Mode</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{fmtDate(p.date)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.invoiceNo}</TableCell>
                    <TableCell className="capitalize">{p.method || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{p.ref || '-'}</TableCell>
                    <TableCell className="text-right font-medium">{inr(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Communication history ─────────────────────────────────────────────────────────────
const channelIcon = (type: string) => (type === 'email' ? Mail : type === 'sms' ? Phone : MessageSquare);

export function StudentCommunicationTab({ studentId }: { studentId: string }) {
  const [logs, setLogs] = useState<any[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    setLogs(null); setError(false);
    api.get(`/students/${studentId}/communications`)
      .then((r) => live && setLogs(r.data?.data || []))
      .catch(() => live && setError(true));
    return () => { live = false; };
  }, [studentId]);

  if (error) return <p className="text-sm text-destructive">Could not load the communication history.</p>;
  if (!logs) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (logs.length === 0) {
    return (
      <div className="text-center py-10 space-y-3">
        <Send className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
        <h4 className="text-base font-semibold">No messages sent yet</h4>
        <p className="text-sm text-muted-foreground">Emails, SMS and WhatsApp messages sent to this student will be listed here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {logs.map((l) => {
        const Icon = channelIcon(l.type);
        return (
          <div key={l.id} className="flex gap-3 p-3 border rounded-lg bg-muted/20">
            <div className="p-2 h-fit bg-muted rounded-md"><Icon className="w-4 h-4 text-muted-foreground" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm truncate">{l.subject || l.category?.replace(/_/g, ' ') || 'Message'}</span>
                <Badge variant="outline" className="uppercase text-[10px]">{l.type}</Badge>
                <Badge variant={l.status === 'failed' ? 'destructive' : 'secondary'} className="uppercase text-[10px]">{l.status}</Badge>
              </div>
              {l.content && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{l.content}</p>}
              {l.status === 'failed' && l.errorMessage && <p className="text-xs text-destructive mt-1">{l.errorMessage}</p>}
              <p className="text-xs text-muted-foreground mt-1">{fmtDate(l.createdAt, true)}{l.sender?.name ? ` · by ${l.sender.name}` : ''}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Remarks ───────────────────────────────────────────────────────────────────────────
export function StudentRemarksTab({ studentId }: { studentId: string }) {
  const { user } = useAuth();
  const [data, setData] = useState<{ notes: any[]; recorded: any[] } | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get(`/students/${studentId}/remarks`).then((r) => setData(r.data?.data || { notes: [], recorded: [] })).catch(() => toast.error('Could not load remarks'));
  useEffect(() => { setData(null); load(); }, [studentId]);

  const add = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.post(`/students/${studentId}/remarks`, { text: text.trim() });
      setText('');
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to add remark');
    } finally { setSaving(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Delete this remark?')) return;
    try { await api.deleteWithoutApproval(`/students/${studentId}/remarks/${id}`); await load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Failed to delete remark'); }
  };

  const canDelete = (n: any) => n.authorId === user?.id || ['org_admin', 'superadmin'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an internal remark about this student (not visible to the student)…" rows={3} maxLength={2000} />
        <div className="flex justify-end"><Button size="sm" onClick={add} disabled={saving || !text.trim()}>{saving ? 'Saving…' : 'Add remark'}</Button></div>
      </div>

      {!data ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <>
          {data.notes.length === 0 && data.recorded.length === 0 && (
            <div className="text-center py-6 space-y-2">
              <StickyNote className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No remarks yet.</p>
            </div>
          )}
          {data.notes.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Staff notes</h4>
              {data.notes.map((n) => (
                <div key={n.id} className="p-3 border rounded-lg bg-muted/20">
                  <p className="text-sm whitespace-pre-wrap">{n.text}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">{n.authorName} · {fmtDate(n.createdAt, true)}</p>
                    {canDelete(n) && <button className="text-muted-foreground hover:text-destructive" onClick={() => remove(n.id)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.recorded.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Recorded on enrollments</h4>
              {data.recorded.map((r, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1"><Badge variant="secondary" className="text-[10px] uppercase">{r.source}</Badge>{r.program && <span className="text-xs text-muted-foreground">{r.program}</span>}</div>
                  <p className="text-sm whitespace-pre-wrap">{r.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">{fmtDate(r.at)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
