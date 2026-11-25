/** Invoice rules used by the finance routes. Pure, so they can be tested without a database. */
import { AccessUser } from './catalog.js';
import { Access } from './resolve.js';

const PAYMENT_SCREEN_ROLES = [
  'superadmin', 'org_admin', 'ceo', 'general_manager', 'branch_manager',
  'finance_admin', 'finance_sub_admin', 'finance', 'sales_admin', 'sales_sub_admin', 'sales',
];

/**
 * Users whose Payments screen picks from the invoice list. They may read a short form of the list
 * even without the Invoices page, so blocking that page does not break Payments.
 */
export const hasPaymentsScreen = (user: AccessUser): boolean => {
  if (['student', 'faculty'].includes(user.role)) return false;
  if (PAYMENT_SCREEN_ROLES.includes(user.role) || user.isBranchManager) return true;
  if (user.role !== 'employee') return false;
  return user.departmentType === 'sales' || (user.departmentType === 'finance' && Boolean(user.subDepartmentId));
};

/** True when the user can read invoices only because an Org Admin allowed it. */
export const isGrantedReader = (access: Access): boolean =>
  !access.invoices?.view?.byDefault && !access.bill_receipts?.view?.byDefault;

const GLOBAL_ROLES = ['superadmin', 'org_admin', 'ceo', 'general_manager'];

/**
 * Prisma condition limiting invoices to the user's branch; null when no limit applies.
 * A partner belongs to a branch when its referrer or one of its students does. Invoices with
 * neither a student nor a partner are not shown to users who were granted access.
 */
export const invoiceBranchWhere = (user: { role: string; branchId?: string | null }, granted: boolean) => {
  if (GLOBAL_ROLES.includes(user.role)) return null;
  // Without a branch the limit is the whole organization, which callers always apply
  if (!user.branchId) return null;
  const branchId = user.branchId;
  return {
    OR: [
      { student: { branchId } },
      { student: { enrolledByUser: { branchId } } },
      { center: { referrer: { branchId } } },
      { center: { students: { some: { branchId } } } },
      ...(granted ? [] : [{ studentId: null, centerId: null }]),
    ],
  };
};
