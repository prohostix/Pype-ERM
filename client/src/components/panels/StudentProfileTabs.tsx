import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Mail, MessageSquare, Phone, StickyNote, Trash2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

import { CS, numLocale } from '@/lib/currency';
import { confirmDialog } from '@/lib/confirm';
const inr = (n: number) => `${CS()}${Number(n || 0).toLocaleString(numLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
      <div className="text-center py-12 space-y-3">
        <span className="w-14 h-14 rounded-full bg-[#f4f6f3] flex items-center justify-center mx-auto"><CreditCard className="w-6 h-6 text-muted-foreground" /></span>
        <h4 className="text-base font-semibold">No Fee Records Found</h4>
        <p className="text-sm text-muted-foreground">This student does not have any fee records yet.</p>
      </div>
    );
  }

  const tile = (label: string, value: string, tone: string) => (
    <div className={`rounded-3xl p-5 ${tone}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-semibold tracking-tight mt-1">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {tile(data.discount ? 'Total fee (after discount)' : 'Total fee', inr(data.total), 'bg-[#f4f6f3] dark:bg-muted/30')}
        {tile('Paid', inr(data.paid), 'bg-[#e3f7dd] text-[#1f6a17] dark:bg-emerald-950/20 dark:text-emerald-300')}
        {tile('Balance', inr(data.balance), data.balance > 0 ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300' : 'bg-[#f4f6f3] dark:bg-muted/30')}
        {tile('Installments', String(data.schedules.length), 'bg-[#f4f6f3] dark:bg-muted/30')}
      </div>
      {!data.hasStructure && <p className="text-xs text-muted-foreground">No fee structure is set for this program, so the total comes from the installments.</p>}

      {data.schedules.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-3">Installments</h4>
          <div className="rounded-3xl bg-[#f4f6f3] dark:bg-muted/30 p-3">
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
                        <Badge variant={status === 'paid' ? 'default' : status === 'overdue' ? 'destructive' : 'secondary'} className={status === 'paid' ? 'bg-[#e3f7dd] text-[#1f6a17] hover:bg-[#d6f0d0] border-0 rounded-full capitalize' : 'rounded-full capitalize'}>{status || 'pending'}</Badge>
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
        <h4 className="text-lg font-semibold mb-3">Payments received ({data.payments.length})</h4>
        {data.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payment has been received yet.</p>
        ) : (
          <div className="rounded-3xl bg-[#f4f6f3] dark:bg-muted/30 p-3">
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
          <div key={l.id} className="flex gap-3 p-4 rounded-2xl bg-[#f4f6f3] dark:bg-muted/30">
            <div className="p-2 h-fit bg-muted rounded-md"><Icon className="w-4 h-4 text-muted-foreground" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm truncate">{l.subject || l.category?.replace(/_/g, ' ') || 'Message'}</span>
                <Badge variant="outline" className="capitalize text-[11px] rounded-full">{l.type}</Badge>
                <Badge variant={l.status === 'failed' ? 'destructive' : 'secondary'} className="capitalize text-[11px] rounded-full">{l.status}</Badge>
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
    if (!(await confirmDialog({ title: 'Delete remark?', message: 'Delete this remark?', confirmText: 'Delete', tone: 'danger' }))) return;
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
                <div key={n.id} className="p-4 rounded-2xl bg-[#f4f6f3] dark:bg-muted/30">
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
                <div key={i} className="p-4 rounded-2xl bg-[#f4f6f3] dark:bg-muted/30">
                  <div className="flex items-center gap-2 mb-1"><Badge variant="secondary" className="text-[11px] capitalize rounded-full">{r.source}</Badge>{r.program && <span className="text-xs text-muted-foreground">{r.program}</span>}</div>
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


// ── Custom filters + their change history ────────────────────────────────────────────
const FILTER_EDITOR_ROLES = ['org_admin', 'superadmin', 'center_admin', 'sales_admin', 'sales_sub_admin', 'employee', 'ops_admin', 'ops_sub_admin'];
const NOT_SET = '__none__';
const colorOf = (type: any, optionId: string): string | null => type.options.find((o: any) => o.id === optionId)?.color || null;

export function StudentCustomFilters({ studentId }: { studentId: string }) {
  const { user } = useAuth();
  const canEdit = FILTER_EDITOR_ROLES.includes(user?.role || '');
  const [types, setTypes] = useState<any[]>([]);
  const [data, setData] = useState<{ values: any[]; history: any[] } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const [t, d] = await Promise.all([api.get('/student-filters'), api.get(`/students/${studentId}/filters`)]);
      setTypes(t.data?.data || []);
      setData(d.data?.data || { values: [], history: [] });
    } catch {
      setData({ values: [], history: [] }); // not allowed to see them, or not set up
    }
  };
  useEffect(() => { setData(null); load(); }, [studentId]);

  const change = async (typeId: string, value: string) => {
    setBusy(typeId);
    try {
      await api.put(`/students/${studentId}/filters/${typeId}`, { optionId: value === NOT_SET ? null : value, note: note.trim() || undefined });
      setNote('');
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update');
    } finally { setBusy(null); }
  };

  if (!data || (types.length === 0 && data.history.length === 0)) return null;
  const current = (typeId: string) => data.values.find((v) => v.filterTypeId === typeId)?.optionId || NOT_SET;

  return (
    <div>
      <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
        Custom filters<span className="h-px flex-1 bg-border" />
      </h3>
      {types.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {types.map((t) => {
            const value = current(t.id);
            // an archived option can't be picked, but stays shown while the student has it
            const options = t.options;
            return (
              <div key={t.id} className="rounded-xl border bg-muted/20 px-3.5 py-3">
                <p className="text-[11px] capitalize rounded-full tracking-wider text-muted-foreground font-semibold mb-1.5">{t.name}</p>
                <Select value={value} onValueChange={(v) => change(t.id, v)} disabled={!canEdit || busy === t.id}>
                  <SelectTrigger className="h-8 bg-background" style={colorOf(t, value) ? { borderColor: colorOf(t, value)!, boxShadow: `inset 3px 0 0 ${colorOf(t, value)}` } : undefined}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOT_SET}>Not set</SelectItem>
                    {options.map((o: any) => (
                      <SelectItem key={o.id} value={o.id}>
                        <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: o.color || '#94a3b8' }} />{o.label}</span>
                      </SelectItem>
                    ))}
                    {value !== NOT_SET && !options.some((o: any) => o.id === value) && <SelectItem value={value} disabled>Archived option</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      )}
      {canEdit && types.length > 0 && (
        <Input className="mt-3" placeholder="Optional note saved with the next change" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
      )}
      {data.history.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">History</p>
          {data.history.map((h) => (
            <div key={h.id} className="flex gap-3 text-sm border-l-2 border-primary/30 pl-3 py-0.5">
              <div className="min-w-0">
                <p>
                  <span className="font-medium">{h.filterName}</span>: <span className="text-muted-foreground">{h.fromLabel || 'Not set'}</span> → <span className="font-medium">{h.toLabel || 'Not set'}</span>
                </p>
                {h.note && <p className="text-xs text-muted-foreground">“{h.note}”</p>}
                <p className="text-xs text-muted-foreground">{h.changedByName || 'Unknown'} · {fmtDate(h.changedAt, true)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
