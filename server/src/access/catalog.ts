/**
 * The features an Org Admin can set per user, and who has each one without an override.
 * Defaults mirror the menus built in client/src/App.tsx (getAvailableTables).
 */

export type AccessLevel = 'none' | 'view' | 'manage';

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
  /** Levels an override may set, besides `none`. */
  levels: ('view' | 'manage')[];
  /** Organization plan feature it depends on, if any. */
  orgFeature?: string;
  defaultLevel: (user: AccessUser) => AccessLevel;
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

export const FEATURES: Feature[] = [
  {
    key: 'invoices',
    label: 'Invoices',
    group: 'Finance',
    levels: ['view', 'manage'],
    // Everyone whose screens include Invoices can create and edit them
    defaultLevel: (user) => (screensOf(user) === 'other' ? 'none' : 'manage'),
  },
  {
    key: 'bill_receipts',
    label: 'Bill & Receipts',
    group: 'Finance',
    levels: ['view'],
    defaultLevel: (user) => (['org_admin', 'finance'].includes(screensOf(user)) ? 'view' : 'none'),
  },
];
