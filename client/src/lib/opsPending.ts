// The same rules the Operations overview counts use (server: dashboardController).

/** An approved, ongoing student who has no enrollment number yet. */
export const awaitsEnrollmentNo = (s: any): boolean => s?.status === 'active' && !s.isPrevious && !s.enrollmentNo;

/** Of those, the ones not yet marked as submitted to the university. */
export const awaitsUniSubmission = (s: any): boolean =>
  awaitsEnrollmentNo(s) && !s.admissionProgress?.universitySubmitted && !s.admissionProgress?.uni_sub?.completed;
