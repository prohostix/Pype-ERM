// A class can have several principals in charge (AcademicClass.inchargeIds).
// inchargeId stays as the first of them, so classes saved before the change still work.

/** True when this faculty member is one of the class's principals in charge */
export function isIncharge(
  cls: { inchargeId?: string | null; inchargeIds?: string[] | null } | null | undefined,
  facultyId: string
): boolean {
  if (!cls || !facultyId) return false;
  return cls.inchargeId === facultyId || (cls.inchargeIds ?? []).includes(facultyId);
}

/** Prisma filter for AcademicClass: classes this faculty member is in charge of */
export function inchargeFilter(facultyId: string) {
  return { OR: [{ inchargeId: facultyId }, { inchargeIds: { has: facultyId } }] };
}

/** Clean a list of faculty ids from a request: strings only, no blanks, no duplicates */
export function parseInchargeIds(input: unknown, legacySingle?: unknown): string[] {
  const raw = Array.isArray(input) ? input : legacySingle ? [legacySingle] : [];
  return [...new Set(raw.filter((v): v is string => typeof v === 'string' && v.trim() !== '' && v !== 'none').map((v) => v.trim()))];
}
