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

