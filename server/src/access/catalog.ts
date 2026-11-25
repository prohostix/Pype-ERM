/**
 * The pages and actions an Org Admin can set per user, and what each user has without an override.
 * Defaults mirror the menus built in client/src/App.tsx (getAvailableTables) and the role guards
 * on the server routes.
 */
import { canWriteInvoices } from '../utils/userGuards.js';
import { BLOCK_PAGES } from './blockPages.js';

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
  /** Can be blocked for a user but not given: the role alone decides who has it. */
  blockOnly?: boolean;
  /** Allowing any action gives every action, across the whole organization. */
  fullAccess?: boolean;
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

/** Roles the finance routes accept for changing payments, fees and discounts, and for approvals. */
const FINANCE_APPROVER_ROLES = ['superadmin', 'org_admin', 'finance_admin', 'finance_sub_admin'];

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

/** Sales Entry staff, or an employee in a Data Entry department. */
const isEntry = (user: AccessUser): boolean =>
  user.role === 'sales_entry' || (user.role === 'employee' && user.departmentType === 'data_entry');

const isSales = (user: AccessUser): boolean =>
  ['sales_admin', 'sales_sub_admin', 'sales'].includes(user.role) || (user.role === 'employee' && user.departmentType === 'sales');

/** A page on the Finance screens: finance roles see it, and the approver roles may act on it. */
const financePage = (key: string, label: string, writes: Action[], alsoScreens: Screens[] = []): Feature => ({
  key,
  label,
  group: 'Finance',
  actions: ['view', ...writes],
  defaultActions: (user) => {
    if (!(['superadmin', 'finance', ...alsoScreens] as Screens[]).includes(screensOf(user))) return [];
    return FINANCE_APPROVER_ROLES.includes(user.role) ? ['view', ...writes] : ['view'];
  },
});

const GRANTABLE: Feature[] = [
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
    defaultActions: (user) => (isSales(user) || isEntry(user) || ['superadmin', 'org_admin'].includes(user.role) ? ['view', 'create'] : []),
  },
  {
    key: 'admission_pipeline',
    label: 'Admission Pipeline',
    group: 'Students and admissions',
    actions: ['view', 'edit'],
    defaultActions: (user) => (isSales(user) || ['superadmin', 'org_admin'].includes(user.role) ? ['view', 'edit'] : []),
  },
  {
    key: 'sales_entry_enroll',
    label: 'Sales Entry: Enroll for a Sales Employee',
    group: 'Students and admissions',
    actions: ['view', 'create'],
    // Choose a sales employee, then generate a link or fill the application for them
    defaultActions: (user) => (isEntry(user) || user.role === 'superadmin' ? ['view', 'create'] : []),
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
    key: 'payments',
    label: 'Payments',
    group: 'Finance',
    actions: ['view', 'create', 'edit', 'delete'],
    defaultActions: (user) => {
      if (screensOf(user) === 'other' && !isSales(user)) return [];
      return FINANCE_APPROVER_ROLES.includes(user.role) ? ['view', 'create', 'edit', 'delete'] : ['view'];
    },
  },
  {
    key: 'expenses',
    label: 'Expenses',
    group: 'Finance',
    actions: ['view', 'create', 'edit', 'delete', 'approve'],
    defaultActions: (user) => {
      if (screensOf(user) === 'other') return [];
      return FINANCE_APPROVER_ROLES.includes(user.role) ? ['view', 'create', 'edit', 'delete', 'approve'] : ['view', 'create', 'edit'];
    },
  },
  {
    key: 'fee_structures',
    label: 'Fee Structures',
    group: 'Finance',
    actions: ['view', 'create', 'edit'],
    defaultActions: (user) => {
      if (!['org_admin', 'finance', 'superadmin'].includes(screensOf(user))) return [];
      return FINANCE_APPROVER_ROLES.includes(user.role) ? ['view', 'create', 'edit'] : ['view'];
    },
  },
  {
    key: 'discounts',
    label: 'Discounts',
    group: 'Finance',
    actions: ['view', 'create'],
    defaultActions: (user) => {
      if (!['finance', 'superadmin'].includes(screensOf(user))) return [];
      return FINANCE_APPROVER_ROLES.includes(user.role) ? ['view', 'create'] : ['view'];
    },
  },
  financePage('pending_payments', 'Pending Payments', ['approve']),
  financePage('provisional_verifications', 'Provisional Verifications', ['approve']),
  {
    key: 'finance_enrollments',
    label: 'Finance Enrollments',
    group: 'Finance',
    actions: ['view', 'approve'],
    defaultActions: (user) => {
      if (!['superadmin', 'org_admin', 'executive', 'branch', 'finance'].includes(screensOf(user))) return [];
      return FINANCE_APPROVER_ROLES.includes(user.role) ? ['view', 'approve'] : ['view'];
    },
  },
  financePage('wallet_topups', 'Wallet Top-up', ['approve']),
  financePage('student_payment_log', 'Student Payment Log', ['create']),
  financePage('payment_gateway', 'Payment Gateway', ['create']),
  financePage('university_fee', 'University Fee', ['create']),
  financePage('university_commissions', 'University Commissions', ['create'], ['executive']),
  financePage('sales_targets', 'Finance Sales Target', ['create', 'edit', 'delete']),
  {
    key: 'collections',
    label: 'Collections',
    group: 'Finance',
    actions: ['view', 'edit', 'send'],
    // Overseers also reach this page; their role defaults are left to the screen
    defaultActions: (user) => (['superadmin', 'org_admin', 'executive', 'finance'].includes(screensOf(user))
      || ['collections_admin', 'collections'].includes(user.role)
      || (user.role === 'employee' && user.departmentType === 'collections') ? ['view', 'edit', 'send'] : []),
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
      const approvals: Action[] = FINANCE_APPROVER_ROLES.includes(user.role) ? ['delete', 'approve'] : [];
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

const HR_ADMINS = ['hr_admin', 'hr_sub_admin'];
const FINANCE_ADMINS = ['finance_admin', 'finance_sub_admin'];
const OPERATIONS = ['ops_admin', 'ops_sub_admin'];
const EXECUTIVES = ['ceo', 'general_manager'];
const MANAGERS = [...EXECUTIVES, ...HR_ADMINS, ...FINANCE_ADMINS, ...OPERATIONS, 'sales_admin', 'sales_sub_admin', 'collections_admin', 'branch_manager'];
/** These actions for these roles, nothing for anyone else. A Superadmin has everything. */
const forRoles = (...grants: [roles: string[], actions: Action[]][]) => (user: AccessUser): Action[] =>
  user.role === 'superadmin'
    ? ['view', 'create', 'edit', 'delete', 'approve']
    : grants.find(([roles]) => roles.includes(user.role))?.[1] || [];

/**
 * Pages listed in blockPages.ts whose requests are now checked one by one, so they can be given as
 * well as blocked. The value is what each role has without any setting.
 */
/** Pages where an Org Admin's Allow means everything the page does */
const FULL_ACCESS = ['academic_partners', 'academic_centers', 'study_abroad'];

const CONNECTED: Record<string, (user: AccessUser) => Action[]> = {
  // Finance confirms nothing by role, so approval can be given to them
  payroll: forRoles([HR_ADMINS, ['view', 'create', 'edit', 'delete', 'approve']], [FINANCE_ADMINS, ['view', 'create', 'edit', 'delete']]),
  payroll_batches: forRoles([FINANCE_ADMINS, ['view', 'edit', 'approve']], [HR_ADMINS, ['view']]),
  payroll_history: forRoles([FINANCE_ADMINS, ['view']]),
  salary_config: forRoles([HR_ADMINS, ['view', 'edit', 'delete']]),
  salary_approval: forRoles([FINANCE_ADMINS, ['view', 'approve']]),
  student_report: forRoles([OPERATIONS, ['view']]),
  admission_report: forRoles([OPERATIONS, ['view']]),
  enrollment_report: forRoles([OPERATIONS, ['view']]),
  university_report: forRoles([OPERATIONS, ['view']]),
  rereg_report: forRoles([OPERATIONS, ['view']]),
  income_expense: forRoles([FINANCE_ADMINS, ['view']]),
  profit_loss: forRoles([FINANCE_ADMINS, ['view']]),
  collection_report: forRoles([[...FINANCE_ADMINS, 'finance'], ['view']]),
  sales_team_report: (user) => (isSales(user) || user.role === 'superadmin' ? ['view'] : []),
  sales_admission_report: (user) => (isSales(user) || user.role === 'superadmin' ? ['view'] : []),
  counselor_report: (user) => (isSales(user) || user.role === 'superadmin' ? ['view'] : []),
  conversion_report: (user) => (isSales(user) || user.role === 'superadmin' ? ['view'] : []),
  performance: forRoles([EXECUTIVES, ['view']]),
  kpi_report: forRoles([EXECUTIVES, ['view']]),
  activity_report: forRoles([EXECUTIVES, ['view']]),
  employees: forRoles([HR_ADMINS, ['view']]),
  branch_hierarchy: forRoles([[...EXECUTIVES, 'branch_manager'], ['view']]),
  team_attendance: forRoles([HR_ADMINS, ['view', 'create', 'edit', 'delete']], [[...EXECUTIVES, 'branch_manager'], ['view']]),
  attendance_settings: forRoles([HR_ADMINS, ['view', 'edit']]),
  biometric_devices: forRoles([HR_ADMINS, ['view', 'create', 'edit', 'delete']]),
  leave_requests: forRoles([[...HR_ADMINS, ...EXECUTIVES, 'branch_manager', 'ops_admin', ...FINANCE_ADMINS, 'sales_admin', 'sales_sub_admin'], ['view', 'approve']]),
  leave_allocation: forRoles([HR_ADMINS, ['view', 'create', 'edit', 'delete']]),
  holidays: forRoles([HR_ADMINS, ['view', 'create', 'edit', 'delete']], [['branch_manager'], ['view']]),
  vacancies: forRoles([[...HR_ADMINS, ...EXECUTIVES], ['view', 'create', 'edit', 'delete']]),
  complaints: forRoles([HR_ADMINS, ['view', 'edit', 'delete']]),
  assets: forRoles([[...HR_ADMINS, ...EXECUTIVES, 'branch_manager'], ['view', 'create', 'edit', 'delete']]),
  users: forRoles([HR_ADMINS, ['view', 'create', 'edit', 'delete']]),
  departments: forRoles([EXECUTIVES, ['view']]),
  branches: forRoles(),
  org_chart: forRoles([[...HR_ADMINS, ...EXECUTIVES], ['view', 'create', 'edit', 'delete']]),
  managers: forRoles([HR_ADMINS, ['view', 'edit', 'delete']]),
  universities: (user) => (isSales(user) ? ['view'] : forRoles([[...EXECUTIVES, 'branch_manager', ...OPERATIONS], ['view']])(user)),
  programs: (user) => (isSales(user) ? ['view'] : forRoles([[...EXECUTIVES, 'branch_manager', ...OPERATIONS], ['view']])(user)),
  program_allocation: forRoles([OPERATIONS, ['view', 'create', 'edit', 'delete']]),
  academic_partners: forRoles([[...EXECUTIVES, 'branch_manager', ...OPERATIONS], ['view']]),
  partners_sales: forRoles([[...EXECUTIVES, 'branch_manager'], ['view']]),
  academic_centers: forRoles(),
  faculties: forRoles(),
  study_abroad: forRoles(),
  university_submission: forRoles([OPERATIONS, ['view', 'edit']]),
  enrollment_numbers: forRoles([OPERATIONS, ['view', 'edit']]),
  re_registration: forRoles([OPERATIONS, ['view', 'edit']]),
  exam_registration: forRoles([OPERATIONS, ['view', 'create', 'edit', 'delete']]),
  document_received: forRoles([OPERATIONS, ['view', 'create']]),
  document_dispatch: forRoles([OPERATIONS, ['view', 'create']]),
  courier_tracking: forRoles([OPERATIONS, ['view']]),
  delivery_confirmation: forRoles([OPERATIONS, ['view', 'edit']]),
  announcements: forRoles([HR_ADMINS, ['view', 'create', 'edit', 'delete']]),
  bulk_sms: forRoles([[...OPERATIONS, ...HR_ADMINS, 'sales_admin', 'sales_sub_admin'], ['view', 'create']]),
  bulk_whatsapp: forRoles([[...OPERATIONS, ...HR_ADMINS, 'sales_admin', 'sales_sub_admin'], ['view', 'create']]),
  email_notifications: forRoles([[...OPERATIONS, ...HR_ADMINS, 'sales_admin', 'sales_sub_admin'], ['view', 'create']]),
  important_updates: forRoles([OPERATIONS, ['view']]),
  polls: forRoles([HR_ADMINS, ['view', 'create', 'edit', 'delete']]),
  leads: (user) => (isSales(user) ? ['view', 'create', 'edit', 'delete'] : forRoles([[...EXECUTIVES, 'branch_manager'], ['view', 'create', 'edit', 'delete']])(user)),
  targets: (user) => (isSales(user) && !['sales_admin', 'sales_sub_admin'].includes(user.role) ? ['view']
    : forRoles([[...EXECUTIVES, 'branch_manager', 'sales_admin', 'sales_sub_admin'], ['view', 'create', 'edit', 'delete']])(user)),
  team_performance: (user) => (isSales(user) ? ['view'] : forRoles([[...EXECUTIVES, 'branch_manager'], ['view']])(user)),
  tasks: forRoles([MANAGERS, ['view', 'create', 'edit', 'delete']]),
  escalations: forRoles([[...EXECUTIVES, 'sales_admin', 'sales_sub_admin', 'ops_admin'], ['view', 'edit']]),
  employee_escalations: forRoles([['employee'], ['view', 'create']]),
  meetings: forRoles([MANAGERS, ['view', 'create', 'edit', 'delete']]),
  // Everyone's menu already has a notice board
  notice_board: (user) => (['student', 'faculty'].includes(user.role) ? [] : ['view']),
};

export const FEATURES: Feature[] = [
  ...GRANTABLE,
  ...BLOCK_PAGES.map(({ key, label, group, actions }): Feature => (CONNECTED[key]
    ? { key, label, group, actions, fullAccess: FULL_ACCESS.includes(key) || undefined, defaultActions: (user) => CONNECTED[key](user).filter((a) => actions.includes(a)) }
    : {
      key, label, group, actions, blockOnly: true,
      // "Whatever the role gives": the only thing a setting can do is take it away
      defaultActions: () => actions,
    })),
];
