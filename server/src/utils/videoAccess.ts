// Rules for online-center video access: fee-paid locking and the daily viewing quota.

const IST_OFFSET_MS = 330 * 60000;
const DAY_MS = 24 * 60 * 60 * 1000;
const NON_BILLABLE_INVOICE_STATUSES = ['cancelled', 'canceled', 'void'];

// The quota resets at midnight IST, whatever timezone the server runs in.
export function getStartOfIstDay(now: Date = new Date()): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS);
}

export function getDailyLimit(config: any): number | null {
  if (!config?.dailyClassLimitEnabled) return null;
  const limit = Number(config.dailyClassLimit);
  return Number.isFinite(limit) && limit > 0 ? limit : null;
}

function getInvoiceTotals(invoices: any[]) {
  let total = 0;
  let paid = 0;
  for (const inv of invoices) {
    const status = inv.status?.toLowerCase();
    const received = (inv.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    // Cancelled invoices and unpaid drafts are not money the student owes yet.
    if (NON_BILLABLE_INVOICE_STATUSES.includes(status) || (status === 'draft' && received === 0)) continue;
    const invTotal = Number(inv.total ?? inv.amount ?? 0);
    total += invTotal;
    paid += status === 'paid' ? Math.max(received, invTotal) : received;
  }
  return { total, paid };
}

function getScheduleTotals(schedules: any[]) {
  let total = 0;
  let paid = 0;
  for (const sch of schedules) {
    const amount = Number(sch.amount || 0);
    total += amount;
    if (sch.status?.toUpperCase() === 'PAID' || sch.paidAt) paid += amount;
  }
  return { total, paid };
}

function getStructureTotal(feeStructures: any[], student?: any) {
  const structure =
    feeStructures.find((f) => student?.specialisation && f.specialisation === student.specialisation) ||
    feeStructures.find((f) => !f.specialisation) ||
    feeStructures[0];
  if (!structure) return 0;
  const base = (structure.tuitionFee || 0) + (structure.registrationFee || 0) + (structure.examFee || 0);
  return base + (base * (structure.gstPercentage || 0)) / 100;
}

export function evaluateFeeLock(
  config: any,
  invoices: any[] = [],
  schedules: any[] = [],
  feeStructures: any[] = [],
  student?: any,
  now: Date = new Date()
) {
  const unlocked = (minPaidPercentage = 0) => ({
    isFeeLocked: false,
    message: '',
    totalFee: 0,
    paidFee: 0,
    paidPercentage: 100,
    minPaidPercentage
  });

  if (!config?.feeLocking?.enabled) return unlocked();

  const minPaidPercentage = Number(config.feeLocking.minPaidPercentage ?? 50);
  const gracePeriodDays = Number(config.feeLocking.gracePeriodDays ?? 0);

  const joinDate = student?.enrolledAt || student?.joinDate || student?.createdAt;
  if (gracePeriodDays > 0 && joinDate) {
    const daysSinceJoin = (now.getTime() - new Date(joinDate).getTime()) / DAY_MS;
    if (daysSinceJoin < gracePeriodDays) return unlocked(minPaidPercentage);
  }

  const schedule = getScheduleTotals(schedules);
  const invoice = getInvoiceTotals(invoices);

  // A payment schedule is the student's full plan. Without one, invoices may cover
  // only part of the course, so the program's fee structure sets the minimum total.
  const totalFee = schedule.total > 0
    ? schedule.total
    : Math.max(invoice.total, getStructureTotal(feeStructures, student));

  // Never lock a student who has no fee records.
  if (totalFee <= 0) return unlocked(minPaidPercentage);

  const paidFee = Math.max(schedule.paid, invoice.paid);
  const paidPercentage = Math.min(100, Math.round((paidFee / totalFee) * 100));

  if (paidPercentage >= minPaidPercentage) {
    return { isFeeLocked: false, message: '', totalFee, paidFee, paidPercentage, minPaidPercentage };
  }

  const paid = paidFee.toLocaleString('en-IN');
  const total = totalFee.toLocaleString('en-IN');
  const customMessage = config.feeLocking.lockMessage?.trim();
  const message = customMessage
    ? customMessage
        .replace(/{paidPercent}/g, String(paidPercentage))
        .replace(/{requiredPercent}/g, String(minPaidPercentage))
        .replace(/{paidFee}/g, paid)
        .replace(/{totalFee}/g, total)
    : `Video lectures are locked because you have paid ${paidPercentage}% of your total course fee (₹${paid} of ₹${total}). A minimum payment of ${minPaidPercentage}% is required to unlock.`;

  return { isFeeLocked: true, message, totalFee, paidFee, paidPercentage, minPaidPercentage };
}

// --- Watch progress ---

const COMPLETION_PERCENT = 90;
const RESTART_PERCENT = 95;
const MAX_PLAYBACK_RATE = 2;
const FORWARD_MARGIN_SECONDS = 5;

export function getWatchedPercent(log: any): number {
  if (!log) return 0;
  if (log.videoDuration > 0) return Math.min(100, Math.round((log.maxPosition / log.videoDuration) * 100));
  // Logs from before progress was tracked only know the video was watched.
  return log.watchDuration > 0 ? 100 : 0;
}

export function isVideoLogWatched(log: any): boolean {
  if (!log) return false;
  return log.isCompleted || (log.videoDuration === 0 && log.watchDuration > 0);
}

export function getResumePosition(log: any): number {
  if (!log?.lastPosition) return 0;
  // Near the end, start over rather than resume into the last few seconds.
  if (log.videoDuration > 0 && log.lastPosition >= log.videoDuration * (RESTART_PERCENT / 100)) return 0;
  return log.lastPosition;
}

// Skipping ahead moves the resume point, but only time actually played counts toward
// completion: progress grows by at most what the played time could cover at top speed.
export function computeVideoProgress(
  existing: { lastPosition?: number; maxPosition?: number; videoDuration?: number; isCompleted?: boolean } | null,
  update: { position?: unknown; duration?: unknown; playedSeconds: number; markCompleted?: boolean }
) {
  const reportedDuration = Math.round(Number(update.duration));
  const videoDuration = reportedDuration > 0 ? reportedDuration : existing?.videoDuration || 0;
  const previousMax = existing?.maxPosition || 0;

  const reportedPosition = Math.round(Number(update.position));
  const hasPosition = Number.isFinite(reportedPosition) && reportedPosition >= 0;
  const lastPosition = hasPosition
    ? (videoDuration > 0 ? Math.min(reportedPosition, videoDuration) : reportedPosition)
    : existing?.lastPosition || 0;

  const allowedAdvance = update.playedSeconds * MAX_PLAYBACK_RATE + FORWARD_MARGIN_SECONDS;
  const maxPosition = lastPosition > previousMax
    ? previousMax + Math.min(lastPosition - previousMax, allowedAdvance)
    : previousMax;

  const reachedCompletion = videoDuration > 0 && (maxPosition / videoDuration) * 100 >= COMPLETION_PERCENT;
  return {
    lastPosition,
    maxPosition,
    videoDuration,
    isCompleted: !!existing?.isCompleted || !!update.markCompleted || reachedCompletion
  };
}
