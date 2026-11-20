/**
 * AI Reports: student fee status (one row per student).
 *
 * Totals follow the Student Payments Log rules:
 *  - fee structure: the program's structures, narrowed by the student's university, then
 *    session, then specialisation. If the remaining structures disagree on the total, the
 *    fee is "not set up" for that student (no guess), never the cheapest or first one.
 *  - structure total = yearly rows (when they carry amounts) or the base fees, plus the
 *    additional fees. No GST is added (the bill adds none).
 *  - total fee = the largest of the installments total, the structure total and what was
 *    actually invoiced (invoices carry GST), minus discount. Exact duplicate invoices
 *    (same total, same payments) are counted once when working out what was billed.
 *  - paid = invoice payments, plus the initial payment when it was not invoiced
 *  - overdue = installments, or invoices without installments, past their due date and unpaid
 */
import prisma from '../../lib/prisma.js';
import type { AccessContext } from './access.js';

const num = (x: unknown) => Number(x) || 0;
const MAX_STUDENTS = 20_000;

function yearlyTotal(rows: any): number {
  return (Array.isArray(rows) ? rows : []).reduce(
    (t: number, y: any) => t + num(y?.registrationFee) + num(y?.tuitionFee) + num(y?.examFee), 0);
}

function structureTotal(fs: any): number {
  const yearly = yearlyTotal(fs.yearlyFees);
  const base = yearly > 0 ? yearly : num(fs.registrationFee) + num(fs.tuitionFee) + num(fs.examFee);
  const additional = (Array.isArray(fs.additionalFees) ? fs.additionalFees : [])
    .reduce((t: number, f: any) => t + Math.max(0, num(f?.amount)), 0);
  return base + additional;
}

/** The fee total that applies to this student, or null when it cannot be told apart. */
export function pickStructureTotal(student: any): number | null {
  let list: any[] = student.program?.feeStructures?.length ? student.program.feeStructures : (student.university?.feeStructures || []);
  if (!list.length) return null;
  const narrow = (pred: (f: any) => boolean) => { const n = list.filter(pred); if (n.length) list = n; };
  if (student.universityId) narrow((f) => f.universityId === student.universityId);
  if (student.sessionId) narrow((f) => f.sessionId === student.sessionId);
  narrow((f) => (student.specialisation ? f.specialisation === student.specialisation : !f.specialisation));
  const totals = Array.from(new Set(list.map((f) => Math.round(structureTotal(f) * 100) / 100)));
  return totals.length === 1 ? totals[0] : null;
}

export async function studentFeeRows(ctx: AccessContext, _range: { from: Date; to: Date }, scope: Record<string, unknown>) {
  const students: any[] = await prisma.student.findMany({
    where: { AND: [scope, { organizationId: ctx.organizationId }] },
    take: MAX_STUDENTS,
    select: {
      id: true, name: true, enrollmentNo: true, status: true, universityId: true, sessionId: true, specialisation: true,
      admissionDate: true, createdAt: true, discountAmount: true,
      program: { select: { name: true, feeStructures: true } },
      university: { select: { name: true, code: true, feeStructures: true } },
      branch: { select: { name: true } },
      paymentSchedules: { select: { id: true, amount: true, dueDate: true, status: true, paidAt: true, isExtraFee: true } },
      invoices: { select: { invoiceNo: true, notes: true, status: true, total: true, amount: true, dueDate: true, scheduleId: true, payments: { select: { amount: true } } } },
      enrollments: {
        where: { status: { notIn: ['rejected', 'ops_rejected', 'cancelled'] } },
        select: { initialPaymentAmount: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const DAY = 86_400_000;

  return students.map((s) => {
    const invoices: any[] = s.invoices || [];
    const schedules: any[] = s.paymentSchedules || [];
    const received = (inv: any) => (inv.payments || []).reduce((t: number, p: any) => t + num(p.amount), 0);

    const alive = invoices.filter((inv) => !['cancelled', 'canceled', 'void'].includes((inv.status || '').toLowerCase()));
    const seen = new Set<string>();
    const billedInvoices = alive.filter((inv) => {
      const key = `${num(inv.total ?? inv.amount)}|${inv.scheduleId || ''}|${(inv.payments || []).map((p: any) => num(p.amount)).sort().join(',')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const validDue = (d: any) => { const t = d ? new Date(d) : null; return t && !isNaN(t.getTime()) ? t : null; };

    // Paid
    let paid = invoices.reduce((t, inv) => t + received(inv), 0);
    const initial = num(s.enrollments?.[0]?.initialPaymentAmount);
    const hasInitialInvoice = invoices.some((inv) =>
      (/^INV-(AUTO|PROV)/.test(inv.invoiceNo || '') || /initial|provisional/i.test(inv.notes || '')) && (inv.payments || []).length > 0);
    if (!hasInitialInvoice && initial > 0) paid += initial;

    // Total
    const scheduled = schedules.reduce((t, p) => t + num(p.amount), 0);
    const structure = pickStructureTotal(s);
    const invoiced = billedInvoices.filter((inv) => !inv.scheduleId).reduce((t, inv) => t + num(inv.total ?? inv.amount), 0);
    const feeKnown = structure !== null || scheduled > 0 || invoiced > 0;
    const gross = Math.max(scheduled, structure ?? 0, invoiced);
    const total = Math.max(0, gross - num(s.discountAmount));
    const balance = feeKnown ? Math.max(0, total - paid) : 0;

    // Overdue
    let overdue = 0; let oldest: number | null = null;
    for (const ps of schedules) {
      const due = validDue(ps.dueDate);
      if (!due || (ps.status || '').toLowerCase() === 'paid' || ps.paidAt) continue;
      if (due >= today) continue;
      const paidOn = invoices.filter((i) => i.scheduleId === ps.id).reduce((t, i) => t + received(i), 0);
      const bal = num(ps.amount) - paidOn;
      if (bal <= 0.5) continue;
      overdue += bal; oldest = oldest === null ? due.getTime() : Math.min(oldest, due.getTime());
    }
    for (const inv of billedInvoices) {
      const due = validDue(inv.dueDate);
      if (inv.scheduleId || !due) continue;
      if (['paid', 'draft'].includes((inv.status || '').toLowerCase())) continue;
      if (due >= today) continue;
      const bal = num(inv.total ?? inv.amount) - received(inv);
      if (bal <= 0.5) continue;
      overdue += bal; oldest = oldest === null ? due.getTime() : Math.min(oldest, due.getTime());
    }
    overdue = Math.round(overdue * 100) / 100;

    const feeStatus = !feeKnown ? 'Fee not set up'
      : overdue > 0 ? 'Overdue'
      : balance <= 0.5 ? 'Paid'
      : paid > 0 ? 'Partially paid' : 'Unpaid';

    return {
      name: s.name,
      enrollmentNo: s.enrollmentNo || '',
      status: s.status,
      program: s.program?.name || '',
      university: s.university?.name || '',
      universityCode: s.university?.code || '',
      branch: s.branch?.name || '',
      admissionDate: s.admissionDate || s.createdAt,
      feeKnown,
      totalFee: Math.round(total * 100) / 100,
      paidFee: Math.round(paid * 100) / 100,
      balanceFee: Math.round(balance * 100) / 100,
      overdueAmount: overdue,
      overdueDays: oldest === null ? 0 : Math.floor((today.getTime() - oldest) / DAY),
      feeStatus,
    };
  });
}
