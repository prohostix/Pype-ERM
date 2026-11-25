/** Rules for who may act on which account. Pure functions, so they can be tested without a database. */

export const ACCOUNT_DISABLED_MESSAGE = 'This account is disabled. Please contact your administrator.';

/** Inactive and resigned accounts may not sign in. `on_leave` staff keep their access. */
export const isAccountDisabled = (status?: string | null): boolean =>
  status === 'inactive' || status === 'resigned';

/** Roles an HR user may not touch or hand out, although they are otherwise HR-creatable. */
const HR_PROTECTED_ROLES: Record<string, string[]> = {
  hr_admin: ['general_manager', 'hr_admin'],
  hr_sub_admin: ['general_manager', 'hr_admin', 'hr_sub_admin'],
};

export const isHrRole = (role: string): boolean => role in HR_PROTECTED_ROLES;

/** The creator's role list, minus roles equal to or above an HR creator. */
export const manageableRoles = (actorRole: string, creatable: string[]): string[] =>
  creatable.filter((role) => !HR_PROTECTED_ROLES[actorRole]?.includes(role));

export interface Actor { id: string; role: string; branchId?: string | null }
export interface Target { id: string; role: string; branchId?: string | null; status?: string | null }
export interface Changes { role?: string; branchId?: string | null; status?: string }

/**
 * Why `actor` may not change (or, with no `changes`, delete) `target`; null when allowed.
 * `target` must already be known to be in the actor's organization.
 */
export const userChangeError = (actor: Actor, target: Target, creatable: string[], changes?: Changes): string | null => {
  if (actor.role === 'superadmin') return null;
  if (target.role === 'superadmin') return 'You cannot change a Superadmin account';
  if (!isHrRole(actor.role)) return null;

  const newRole = changes?.role !== undefined && changes.role !== target.role ? changes.role : undefined;
  const newBranch = changes?.branchId !== undefined && (changes.branchId || null) !== (target.branchId || null)
    ? changes.branchId || null : undefined;

  if (target.id === actor.id) {
    if (!changes) return 'You cannot delete your own account';
    const newStatus = changes.status !== undefined && changes.status !== target.status;
    return newRole || newStatus || newBranch !== undefined
      ? 'You cannot change your own role, status or branch' : null;
  }

  const allowed = manageableRoles(actor.role, creatable);
  if (!allowed.includes(target.role)) return `You cannot manage a '${target.role}' account`;
  if (newRole && !allowed.includes(newRole)) return `You cannot assign role '${newRole}'`;
  // HR users tied to a branch stay inside it; HR with no branch works across the organization.
  if (actor.branchId) {
    if (target.branchId !== actor.branchId) return 'You can only manage users in your own branch';
    if (newBranch !== undefined && newBranch !== actor.branchId) return 'You cannot move a user out of your branch';
  }
  return null;
};

/**
 * Student workflows set passwords by email address. They may only do that to a student login of the
 * same organization, never to a staff account that happens to share the address.
 */
export const isOwnStudentAccount = (user: { role: string; organizationId?: string | null }, organizationId?: string | null): boolean =>
  user.role === 'student' && (!user.organizationId || user.organizationId === organizationId);

/** Roles whose screens include creating and editing invoices. */
const INVOICE_WRITER_ROLES = [
  'superadmin', 'org_admin', 'ceo', 'general_manager', 'branch_manager',
  'finance_admin', 'finance_sub_admin', 'finance',
];

/**
 * May this user create or edit invoices? Besides the roles above: anyone assigned as a branch
 * manager, and employees who get the Finance screens (a Finance sub-department).
 */
export const canWriteInvoices = (
  user: { role: string; subDepartmentId?: string | null },
  context: { managesBranch: boolean; departmentType?: string | null },
): boolean =>
  INVOICE_WRITER_ROLES.includes(user.role)
  || (!['student', 'faculty'].includes(user.role) && context.managesBranch)
  || (user.role === 'employee' && Boolean(user.subDepartmentId) && context.departmentType === 'finance');


/** The roles someone acting on given access may create or manage: ordinary staff, never an admin. */
export const givenRoles = (actorRole: string): string[] => [...new Set(['employee', ...(['sales', 'finance', 'collections'].includes(actorRole) ? [actorRole] : [])])];

export interface GivenActor extends Actor { departmentId?: string | null }
export interface GivenTarget extends Target {
  departmentId?: string | null;
  subDepartmentId?: string | null;
  /** Manages a branch, department or sub-department. */
  isManager?: boolean;
  /** Has pages an Org Admin allowed them. */
  hasGivenAccess?: boolean;
}
export interface GivenChanges extends Changes {
  departmentId?: string | null;
  subDepartmentId?: string | null;
  reportingTo?: string | null;
  studyCenterId?: string | null;
  additionalDepartmentIds?: unknown;
}

/**
 * Limits for someone who manages accounts only because an Org Admin allowed it, so the access
 * cannot be used to gain more of it: no admin or manager accounts, no account with its own given
 * access, never their own, and nothing that would put an account on screens they do not have.
 * `target` is null when creating; with no `changes` the account is being deleted.
 */
export const givenUserError = (actor: GivenActor, target: (GivenTarget & Record<string, any>) | null, changes?: GivenChanges): string | null => {
  const roles = givenRoles(actor.role);
  if (target) {
    if (target.id === actor.id) return 'You cannot change your own account';
    if (!roles.includes(target.role)) return `You cannot manage a '${target.role}' account`;
    if (actor.branchId && target.branchId !== actor.branchId) return 'You can only manage users in your own branch';
    if (target.departmentId && target.departmentId !== actor.departmentId) return 'You can only manage users of your own department or of none';
    if (target.subDepartmentId || target.isManager || target.hasGivenAccess) return 'This account has extra access, so only an Org Admin or HR can manage it';
  }
  if (!changes) return null;
  const changed = (key: keyof GivenChanges) => changes[key] !== undefined
    && JSON.stringify(changes[key] || null) !== JSON.stringify((target as any)?.[key] || null);
  if (changes.role !== undefined && !roles.includes(changes.role)) return `You cannot assign role '${changes.role}'`;
  // A new account must start in the branch; an existing one must stay in it
  if (actor.branchId && (!target || changed('branchId')) && changes.branchId !== actor.branchId) return 'You can only keep users in your own branch';
  if (changed('departmentId') && changes.departmentId && changes.departmentId !== actor.departmentId) return 'You can only place users in your own department';
  const extra = Array.isArray(changes.additionalDepartmentIds) && changes.additionalDepartmentIds.length === 0 ? false : changed('additionalDepartmentIds');
  if (extra || (['subDepartmentId', 'reportingTo', 'studyCenterId'] as const).some((key) => changed(key) && changes[key])) {
    return 'Sub-departments, extra departments and reporting managers are set by an Org Admin or HR';
  }
  return null;
};
