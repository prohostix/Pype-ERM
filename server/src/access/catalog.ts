/**
 * The pages and actions an Org Admin can set per user, and what each user has without an override.
 * Defaults mirror the menus built in client/src/App.tsx (getAvailableTables) and the role guards
 * on the server routes.
 */
import { canWriteInvoices } from '../utils/userGuards.js';

/** `view` opens the page; every other action needs it. */
export type Action = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'download' | 'import' | 'send';

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

/** Whose screens include a student list. */
const hasStudentList = (user: AccessUser): boolean => {
  if (['superadmin', 'org_admin', 'ceo', 'general_manager', 'branch_manager', 'ops_admin', 'ops_sub_admin',
    'finance_admin', 'finance_sub_admin', 'finance', 'sales_admin', 'sales_sub_admin', 'sales',
    'collections_admin', 'collections', 'center_admin'].includes(user.role)) return true;
  if (user.isBranchManager && !['student', 'faculty'].includes(user.role)) return true;
  if (user.role !== 'employee') return false;
  if (['sales', 'collections'].includes(user.departmentType || '')) return true;
  return Boolean(user.subDepartmentId) && ['operations', 'finance'].includes(user.departmentType || '');
};

const isSales = (user: AccessUser): boolean =>
  ['sales_admin', 'sales_sub_admin', 'sales'].includes(user.role) || (user.role === 'employee' && user.departmentType === 'sales');

export const FEATURES: Feature[] = [
  {
    key: 'students',
    label: 'Students',
    group: 'Students and admissions',
    actions: ['view', 'create', 'edit', 'delete', 'import', 'send', 'download'],
    // The buttons the Students screen shows for each role
    defaultActions: (user) => {
      if (!hasStudentList(user)) return [];
      const writes: Action[] = ['superadmin', 'org_admin', 'center_admin'].includes(user.role) ? ['create', 'edit', 'import', 'send'] : [];
      const deletes: Action[] = ['superadmin', 'org_admin'].includes(user.role) ? ['delete'] : [];
      return ['view', ...writes, ...deletes, 'download'];
    },
  },
  {
    key: 'student_filters',
    label: 'Student Filters',
    group: 'Students and admissions',
    actions: ['view', 'create', 'edit', 'delete'],
    defaultActions: (user) => (['superadmin', 'org_admin'].includes(user.role) ? ['view', 'create', 'edit', 'delete'] : []),
  },
  {
    key: 'admission_review',
    label: 'Admission Review',
    group: 'Students and admissions',
    actions: ['view', 'edit', 'approve'],
    // Branch managers, the CEO and the General Manager can look but not decide
    defaultActions: (user) => {
      if (['ceo', 'general_manager', 'branch_manager'].includes(user.role)) return ['view'];
      if (['superadmin', 'org_admin'].includes(user.role)) return ['view', 'edit', 'approve'];
      if (user.isBranchManager && !['student', 'faculty'].includes(user.role)) return ['view', 'edit', 'approve'];
      const operations = ['ops_admin', 'ops_sub_admin'].includes(user.role)
        || (user.role === 'employee' && Boolean(user.subDepartmentId) && user.departmentType === 'operations');
      return operations ? ['view', 'edit', 'approve'] : [];
    },
  },
  {
    key: 'admission_sessions',
    label: 'Admission Sessions',
    group: 'Students and admissions',
    actions: ['view', 'delete', 'approve'],
    defaultActions: (user) => {
      const sees = ['executive', 'branch', 'org_admin', 'finance', 'superadmin'].includes(screensOf(user));
      if (!sees) return [];
      const deletes: Action[] = ['superadmin', 'org_admin', 'ceo'].includes(user.role) ? ['delete'] : [];
      const approvals: Action[] = ['finance_admin', 'finance_sub_admin'].includes(user.role) ? ['approve'] : [];
      return ['view', ...deletes, ...approvals];
    },
  },
  {
    key: 'invite_links',
    label: 'Generate Student Link',
    group: 'Students and admissions',
    actions: ['view', 'create', 'edit'],
    defaultActions: (user) => (isSales(user) || ['superadmin', 'executive', 'branch', 'org_admin'].includes(screensOf(user)) ? ['view', 'create', 'edit'] : []),
  },
  {
    key: 'provisional_enrollment',
    label: 'Provisional Enrollment',
    group: 'Students and admissions',
    actions: ['view', 'create'],
    defaultActions: (user) => (isSales(user) || ['superadmin', 'org_admin'].includes(user.role) ? ['view', 'create'] : []),
  },
  {
    key: 'admission_pipeline',
    label: 'Admission Pipeline',
    group: 'Students and admissions',
    actions: ['view', 'edit'],
    defaultActions: (user) => (isSales(user) || ['superadmin', 'org_admin'].includes(user.role) ? ['view', 'edit'] : []),
  },
  {
    key: 'admission_approval',
    label: 'Admission Approval (Sales)',
    group: 'Students and admissions',
    actions: ['view', 'approve'],
    // Sales admins and the manager of a sales sub department
    defaultActions: (user) => (['superadmin', 'sales_admin'].includes(user.role)
      || (user.role === 'employee' && user.departmentType === 'sales' && Boolean(user.subDepartmentId)) ? ['view', 'approve'] : []),
  },
  {
    key: 'student_portal_management',
    label: 'Student Portal Management',
    group: 'Students and admissions',
    actions: ['view', 'edit'],
    // `edit` is the portal login; blocking and unlocking videos stays with the Org Admin
    defaultActions: (user) => (['superadmin', 'ops_admin', 'ops_sub_admin'].includes(user.role)
      || (user.role === 'employee' && user.departmentType === 'operations' && Boolean(user.subDepartmentId)) ? ['view', 'edit'] : []),
  },
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
