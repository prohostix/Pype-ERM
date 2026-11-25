/** How an Org Admin's settings apply to the Students page. Pure, so it can be tested without a database. */
import { Action } from './catalog.js';
import { Access } from './resolve.js';
import { BranchId, inOwnBranch } from './branchScope.js';
import { decidePageAction, isGrantedPage } from './pageRules.js';

export const isGrantedStudentUser = (access: Access): boolean => isGrantedPage(access, 'students');

/** Student fees and payments are hidden from granted users who have no access to invoices. */
export const hidesStudentFees = (access: Access): boolean =>
  isGrantedStudentUser(access) && !access.invoices?.view?.allowed;

export const decideStudentAction = (access: Access, action: Action, role: string, legacyRoles: string[]) =>
  decidePageAction(access, 'students', action, role, legacyRoles);

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

export const studentBranchWhere = (branchId: BranchId) => inOwnBranch(branchId, (id) => ({ OR: [{ branchId: id }, { enrolledByUser: { branchId: id } }] }));
