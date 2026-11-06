import { isVideoLogWatched } from './videoAccess.js';

const INACTIVE_AFTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type ProgressLesson = { id: string; videoUrl?: string | null; assessment?: { id: string; passingScore?: number } | null };

// Per-student completion, quiz results and activity for one class.
export function buildClassProgress(
  students: Array<{ id: string; name?: string | null; email?: string | null; enrollmentNo?: string | null }>,
  lessons: ProgressLesson[],
  logs: Array<any>,
  attempts: Array<{ studentId: string; assessmentId: string; score: number; passed: boolean; createdAt: Date }>,
  now: Date = new Date()
) {
  const videoLessons = lessons.filter((l) => l.videoUrl);
  const quizLessons = lessons.filter((l) => l.assessment);

  return students.map((student) => {
    const studentLogs = new Map(logs.filter((l) => l.studentId === student.id).map((l) => [l.moduleLessonId, l]));
    const studentAttempts = attempts.filter((a) => a.studentId === student.id);

    const videosWatched = videoLessons.filter((l) => isVideoLogWatched(studentLogs.get(l.id))).length;
    const hasPassed = (assessmentId?: string) => studentAttempts.some((a) => a.assessmentId === assessmentId && a.passed);
    const quizzesPassed = quizLessons.filter((l) => hasPassed(l.assessment?.id)).length;

    const lessonsCompleted = lessons.filter((l) =>
      (!l.videoUrl || isVideoLogWatched(studentLogs.get(l.id))) && (!l.assessment || hasPassed(l.assessment.id))
    ).length;

    const bestScores = quizLessons
      .map((l) => studentAttempts.filter((a) => a.assessmentId === l.assessment?.id).map((a) => a.score))
      .filter((scores) => scores.length > 0)
      .map((scores) => Math.max(...scores));
    const averageQuizScore = bestScores.length > 0
      ? Math.round(bestScores.reduce((sum, score) => sum + score, 0) / bestScores.length)
      : null;

    const activityTimes = [
      ...Array.from(studentLogs.values()).map((l) => new Date(l.lastWatchedAt).getTime()),
      ...studentAttempts.map((a) => new Date(a.createdAt).getTime())
    ];
    const lastActiveTime = activityTimes.length > 0 ? Math.max(...activityTimes) : null;

    return {
      ...student,
      totalLessons: lessons.length,
      lessonsCompleted,
      completionPercent: lessons.length > 0 ? Math.round((lessonsCompleted / lessons.length) * 100) : 0,
      totalVideos: videoLessons.length,
      videosWatched,
      totalQuizzes: quizLessons.length,
      quizzesPassed,
      averageQuizScore,
      lastActiveAt: lastActiveTime ? new Date(lastActiveTime).toISOString() : null,
      isInactive: lastActiveTime === null || now.getTime() - lastActiveTime > INACTIVE_AFTER_DAYS * DAY_MS
    };
  });
}
