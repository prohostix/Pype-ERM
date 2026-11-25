/**
 * The pages and actions an Org Admin can set per user, and what each user has without an override.
 * Defaults mirror the menus built in client/src/App.tsx (getAvailableTables) and the role guards
 * on the server routes.
 */
import { canWriteInvoices } from '../utils/userGuards.js';

/** `view` opens the page; every other action needs it. */
export type Action = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'download';

/** What the defaults and rules need to know about a user. */
export interface AccessUser {
  id: string;
  role: string;
  status?: string | null;
  organizationId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  subDepartmentId?: string | null;
  /** Type of the user's department, or of the sub department's parent. */
  departmentType?: string | null;
  isBranchManager?: boolean;
}

export interface Feature {
  key: string;
  label: string;
  group: string;
  /** The actions this page really has, `view` first. */
  actions: Action[];
  /** Organization plan feature it depends on, if any. */
  orgFeature?: string;
  defaultActions: (user: AccessUser) => Action[];
}

type Screens = 'superadmin' | 'executive' | 'branch' | 'org_admin' | 'finance' | 'other';

/** Which set of screens the user is given, in the same order of precedence as the menu. */
const screensOf = (user: AccessUser): Screens => {
  if (user.role === 'superadmin') return 'superadmin';
  if (user.role === 'branch_manager') return 'branch';
  if (user.role === 'ceo' || user.role === 'general_manager') return 'executive';
  if (user.role === 'org_admin') return 'org_admin';
  if (user.isBranchManager && !['student', 'faculty'].includes(user.role)) return 'branch';
  if (['finance_admin', 'finance_sub_admin', 'finance'].includes(user.role)) return 'finance';
  if (user.role === 'employee' && user.subDepartmentId && user.departmentType === 'finance') return 'finance';
  return 'other';
};

/** Roles the invoice delete and approve routes accept. */
const INVOICE_APPROVER_ROLES = ['superadmin', 'org_admin', 'finance_admin', 'finance_sub_admin'];

export const FEATURES: Feature[] = [
  {
    key: 'invoices',
    label: 'Invoices',
    group: 'Finance',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'download'],
    defaultActions: (user) => {
      if (screensOf(user) === 'other') return [];
      const writes: Action[] = canWriteInvoices(user, { managesBranch: !!user.isBranchManager, departmentType: user.departmentType })
        ? ['create', 'edit'] : [];
      const approvals: Action[] = INVOICE_APPROVER_ROLES.includes(user.role) ? ['delete', 'approve'] : [];
      return ['view', ...writes, ...approvals, 'download'];
    },
  },
  {
    key: 'bill_receipts',
    label: 'Bill & Receipts',
    group: 'Finance',
    actions: ['view', 'download'],
    defaultActions: (user) => (['org_admin', 'finance'].includes(screensOf(user)) ? ['view', 'download'] : []),
  },
];
