// Unlock gap for online-center videos: the next video opens N days after the previous one was
// completed. The day count restarts at 12:00 AM IST, like the daily quota.
import prisma from '../lib/prisma.js';
import { getStartOfIstDay, isVideoLogWatched, rankVideoLessons } from './videoAccess.js';

const DAY_MS = 86_400_000;

export function getUnlockGapDays(config: any): number | null {
  if (!config?.unlockGapEnabled) return null;
  const days = Math.round(Number(config.unlockGapDays));
  return Number.isFinite(days) && days >= 1 ? Math.min(days, 365) : null;
}

export interface GapLogInfo {
  watchDuration?: number | null;
  isCompleted?: boolean | null;
  videoDuration?: number | null;
  completedAt?: Date | string | null;
  lastWatchedAt?: Date | string | null;
  unlockedAt?: Date | string | null;
}

export type GapStatus =
  | { locked: false }
  | { locked: true; reason: 'previous_incomplete' | 'waiting'; unlockAt: Date | null; previousLessonId: string };

/**
 * Gap status for every video, in course order.
 *  - the first video is always open
 *  - a video the student already started or completed, or that an admin unlocked, is never locked
 *  - otherwise the previous video must count as watched (the same rule as the "Passed" label),
 *    then the gap must have passed
 */
export function computeGapStatuses(orderedLessonIds: string[], logs: Map<string, GapLogInfo>, gapDays: number, now: Date = new Date()) {
  const result = new Map<string, GapStatus>();
  orderedLessonIds.forEach((id, i) => {
    const log = logs.get(id);
    if (i === 0 || log?.unlockedAt || log?.isCompleted || (log?.watchDuration ?? 0) > 0) { result.set(id, { locked: false }); return; }
    const previousId = orderedLessonIds[i - 1];
    const prev = logs.get(previousId);
    if (!prev || !isVideoLogWatched(prev)) { result.set(id, { locked: true, reason: 'previous_incomplete', unlockAt: null, previousLessonId: previousId }); return; }
    const doneAt = new Date((prev.completedAt || prev.lastWatchedAt) as any);
    if (isNaN(doneAt.getTime())) { result.set(id, { locked: false }); return; }
    const unlockAt = new Date(getStartOfIstDay(doneAt).getTime() + gapDays * DAY_MS);
    result.set(id, now >= unlockAt ? { locked: false } : { locked: true, reason: 'waiting', unlockAt, previousLessonId: previousId });
  });
  return result;
}

export function formatUnlockDate(d: Date): string {
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }) + ', 12:00 AM';
}

export function gapMessage(status: Extract<GapStatus, { locked: true }>, gapDays: number): string {
  if (status.reason === 'previous_incomplete') {
    return 'Complete the previous video to start the unlock countdown for this one.';
  }
  const unlock = status.unlockAt as Date;
  return `This video opens ${gapDays} day${gapDays === 1 ? '' : 's'} after you completed the previous one. It unlocks on ${formatUnlockDate(unlock)} (IST).`;
}

/** Online classes of the student, with just enough structure to number their videos in course order. */
export async function getOnlineClassesForRanking(student: any) {
  const batches = await prisma.academicBatch.findMany({
    where: {
      OR: [
        { students: { some: { id: student.id } } },
        student.academicBatchId ? { id: student.academicBatchId } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    },
    select: { academicClassId: true, academicClass: { select: { academicCenter: { select: { type: true } } } } }
  });
  const onlineBatchClassIds = batches.filter(b => b.academicClass?.academicCenter?.type === 'online').map(b => b.academicClassId);
  const lessonSelect = { select: { id: true, title: true, videoUrl: true, classSubModuleId: true }, orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }] };
  return prisma.academicClass.findMany({
    where: {
      organizationId: student.organizationId,
      academicCenter: { type: 'online' },
      OR: [{ programIds: { has: student.programId || '' } }, { id: { in: onlineBatchClassIds } }]
    },
    orderBy: { createdAt: 'asc' },
    select: {
      modules: {
        orderBy: { order: 'asc' },
        select: {
          lessons: lessonSelect,
          subModules: { orderBy: { order: 'asc' }, select: { lessons: lessonSelect } }
        }
      }
    }
  });
}

export const orderedVideoIds = (classes: any[]): string[] =>
  Array.from(rankVideoLessons(classes).entries()).sort((a, b) => a[1] - b[1]).map(([id]) => id);

/** Gap statuses for one student, or null when the program has no unlock gap. */
export async function loadGapStatuses(student: any, config: any, now: Date = new Date()) {
  const gapDays = getUnlockGapDays(config);
  if (gapDays === null) return null;
  const classes = await getOnlineClassesForRanking(student);
  const ids = orderedVideoIds(classes);
  const logs = await prisma.studentVideoLog.findMany({ where: { studentId: student.id, moduleLessonId: { in: ids } } });
  const map = new Map<string, GapLogInfo>(logs.map((l) => [l.moduleLessonId, l]));
  return { gapDays, ids, classes, statuses: computeGapStatuses(ids, map, gapDays, now) };
}
