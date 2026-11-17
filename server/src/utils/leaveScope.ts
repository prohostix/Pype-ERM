import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const DEPT_MANAGER_ROLES = ['ops_admin', 'finance_admin', 'finance_sub_admin', 'sales_admin', 'sales_sub_admin', 'center_admin', 'ops_sub_admin'];
const GLOBAL_ADMIN_ROLES = ['superadmin', 'org_admin', 'ceo', 'general_manager'];
const HR_ROLES = ['hr_admin', 'hr_sub_admin'];

/**
 * The one rule for which leave requests the caller may see. The list, opening a single request,
 * approving, editing, deleting and the stats all start from this, so they cannot disagree.
 *
 *  - org admin / CEO / general manager: the whole organization
 *  - HR: employees of their own branch (all branches if the HR user has no branch); never study-center admins
 *  - department managers: their department's and reports' requests, plus their own
 *  - branch managers and everyone else: their own, plus the people they manage (department / sub-department
 *    manager or reporting manager), plus their branch's requests when they have a branch
 */
export const leaveVisibilityWhere = (req: AuthRequest): any => {
  const { role, id: userId, organizationId, departmentId, branchId } = req.user;
  const where: any = { organizationId };

  if (GLOBAL_ADMIN_ROLES.includes(role)) {
    // sees every request in the organization
  } else if (HR_ROLES.includes(role)) {
    where.user = { role: { not: 'center_admin' } };
    if (branchId) where.user.branchId = branchId;
  } else if (DEPT_MANAGER_ROLES.includes(role)) {
    where.OR = [
      { employeeId: userId },
      { department: { managerId: userId } },
      { user: { reportingTo: userId } },
      { user: { department: { managerId: userId } } },
      { user: { subDepartment: { managerId: userId } } },
    ];
    if (departmentId) where.OR.push({ departmentId });
  } else {
    // Branch managers and anyone else: their own requests, plus the people they manage (as
    // department or sub-department manager, or as reporting manager), plus their branch when
    // they have one. A branch manager with no branch set still sees the departments they manage.
    where.OR = [
      { employeeId: userId },
      { department: { managerId: userId } },
      { user: { reportingTo: userId } },
      { user: { department: { managerId: userId } } },
      { user: { subDepartment: { managerId: userId } } },
    ];
    if (branchId) where.OR.push({ user: { branchId } });
  }
  return where;
};

/**
 * HR admins who should hear about a request from an employee of `employeeBranchId`:
 * the HR of that branch, plus HR with no branch (who oversee every branch).
 */
export const hrAdminsFor = async (organizationId: string | null | undefined, employeeBranchId: string | null | undefined) =>
  !organizationId ? [] : prisma.user.findMany({
    where: {
      role: 'hr_admin',
      organizationId,
      OR: [{ branchId: null }, ...(employeeBranchId ? [{ branchId: employeeBranchId }] : [])],
    },
    select: { id: true },
  });

/** Final approvers for a request: CEO and general manager, plus the branch manager of the employee's own branch. */
export const executivesFor = async (organizationId: string | null | undefined, employeeBranchId: string | null | undefined) =>
  !organizationId ? [] : prisma.user.findMany({
    where: {
      organizationId,
      OR: [
        { role: { in: ['ceo', 'general_manager'] } },
        ...(employeeBranchId ? [{ role: 'branch_manager' as const, branchId: employeeBranchId }] : []),
      ],
    },
    select: { id: true },
  });
