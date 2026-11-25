/** How an Org Admin's settings apply to the Students page. Pure, so it can be tested without a database. */
import { Action } from './catalog.js';
import { Access } from './resolve.js';

/**
 * Someone given the Students page although their role's screens do not include it. Server routes
 * also accept some such roles for other workflows, so for these users only the page settings count.
 */
export const isGrantedStudentUser = (access: Access): boolean => {
  const page = access.students;
  if (!page || page.view?.byDefault || !page.view?.allowed) return false;
  return Object.values(page).some((action) => action?.override === 'allow');
};

/** Student fees and payments are hidden from granted users who have no access to invoices. */
export const hidesStudentFees = (access: Access): boolean =>
  isGrantedStudentUser(access) && !access.invoices?.view?.allowed;

/**
 * May the user do this? `legacyRoles` are the roles the route accepted before per-user access and
 * still decides for anyone without a setting. `ownBranchOnly` is set when the permission comes
 * from an Org Admin.
 */
export const decideStudentAction = (access: Access, action: Action, role: string, legacyRoles: string[]): { allowed: boolean; ownBranchOnly: boolean } => {
  const page = access.students;
  const setting = page?.[action];
  const refused = { allowed: false, ownBranchOnly: false };
  if (page?.view?.override === 'deny' || setting?.override === 'deny') return refused;
  if (isGrantedStudentUser(access)) return setting?.allowed ? { allowed: true, ownBranchOnly: true } : refused;
  if (setting?.override === 'allow' && setting.allowed) return { allowed: true, ownBranchOnly: !setting.byDefault };
  return { allowed: legacyRoles.includes(role), ownBranchOnly: false };
};

const FEE_KEYS = ['paymentPlan', 'initialPaymentAmount', 'initialPaymentDate', 'receiptUrl', 'provisionalReceiptUrl'];
const omit = (value: any, keys: string[]) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)))
    : value;

const withoutEnrollmentFees = (enrollment: any) => ({
  ...omit(enrollment, [...FEE_KEYS, 'payment']),
  ...(enrollment.admissionProgress && { admissionProgress: omit(enrollment.admissionProgress, FEE_KEYS) }),
});

/** A student (or enrollment) as a granted user sees it. */
export const restrictStudent = (student: any, options: { hideFees: boolean; hideCredentials: boolean }) => {
  let result = { ...student };
  if (options.hideCredentials) delete result.credentials;
  if (!options.hideFees) return result;
  result = omit(result, ['invoices', 'paymentSchedules', 'discountAmount', 'discountReason']);
  if (result.admissionProgress) result.admissionProgress = omit(result.admissionProgress, FEE_KEYS);
  if (result.program) result.program = omit(result.program, ['feeStructures']);
  if (result.university) result.university = omit(result.university, ['feeStructures']);
  if (Array.isArray(result.enrollments)) result.enrollments = result.enrollments.map(withoutEnrollmentFees);
  return result;
};

export const restrictEnrollment = (enrollment: any) => withoutEnrollmentFees(enrollment);

export const studentBranchWhere = (branchId: string) => ({ OR: [{ branchId }, { enrolledByUser: { branchId } }] });
