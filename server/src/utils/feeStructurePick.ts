// Which fee structure applies to a student. Used by the Student Payments Log.
// Mirrors the enrollment form's order, and also narrows by university, so a program's generic or
// other-university structures are never picked just because they come first in the list.

const num = (x: unknown) => Number(x) || 0;

function structureTotal(fs: any): number {
  const yearly = (Array.isArray(fs.yearlyFees) ? fs.yearlyFees : [])
    .reduce((t: number, y: any) => t + num(y?.registrationFee) + num(y?.tuitionFee) + num(y?.examFee), 0);
  const base = yearly > 0 ? yearly : num(fs.registrationFee) + num(fs.tuitionFee) + num(fs.examFee);
  const additional = (Array.isArray(fs.additionalFees) ? fs.additionalFees : [])
    .reduce((t: number, f: any) => t + Math.max(0, num(f?.amount)), 0);
  return Math.round((base + additional) * 100) / 100;
}

/** One structure out of candidates, but only when they all agree on the total */
function agreed(candidates: any[]): any | null {
  if (!candidates.length) return null;
  const totals = new Set(candidates.map(structureTotal));
  return totals.size === 1 ? candidates[0] : null;
}

/**
 * Order: university, then
 *  1. same session and specialisation
 *  2. same session, structure has no specialisation
 *  3. structure has no session, same specialisation
 *  4. structure has no session and no specialisation
 *  5. whatever is left, if they all give the same total
 * Returns null when it cannot be told apart (the log then shows no structure rather than a guess).
 */
export function pickFeeStructure(student: any): any | null {
  let list: any[] = student.program?.feeStructures?.length ? student.program.feeStructures : (student.university?.feeStructures || []);
  if (!list.length) return null;

  if (student.universityId) {
    const sameUniversity = list.filter((f) => f.universityId === student.universityId);
    if (sameUniversity.length) list = sameUniversity;
  }

  const sessionId = student.sessionId || null;
  const spec = student.specialisation || null;
  const steps: Array<(f: any) => boolean> = [
    (f) => !!sessionId && !!spec && f.sessionId === sessionId && f.specialisation === spec,
    (f) => !!sessionId && f.sessionId === sessionId && !f.specialisation,
    (f) => !!spec && !f.sessionId && f.specialisation === spec,
    (f) => !f.sessionId && !f.specialisation,
  ];
  for (const step of steps) {
    const matches = list.filter(step);
    if (matches.length) return agreed(matches);
  }
  return agreed(list);
}
