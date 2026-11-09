import { AuthRequest } from '../middleware/auth.js';
import { getScopedBranchId } from './branchScope.js';

/** Branch that payroll operations are restricted to (see getScopedBranchId). */
export const getPayrollBranchId = getScopedBranchId;

/** Prisma `where` for Payroll rows visible to this request (org + branch). */
export const payrollScopeWhere = (req: AuthRequest): any => {
  const where: any = { organizationId: req.user.organizationId };
  const branchId = getPayrollBranchId(req);
  if (branchId) where.user = { branchId };
  return where;
};
