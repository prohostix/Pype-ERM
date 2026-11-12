import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

export const GLOBAL_ROLES = ['superadmin', 'org_admin', 'ceo', 'general_manager'];

/**
 * Branch the request is restricted to.
 * - Non-global users assigned to a branch (HR, branch managers, …) are locked to it.
 * - Global roles see every branch, but may narrow down with ?branchId= / body.branchId.
 * Returns null when no branch restriction applies.
 */
export const getScopedBranchId = (req: AuthRequest): string | null => {
  if (!GLOBAL_ROLES.includes(req.user.role) && req.user.branchId) {
    return req.user.branchId;
  }
  const requested = (req.query?.branchId as string) || req.body?.branchId;
  return requested && requested !== 'all' ? String(requested) : null;
};

/**
 * Prisma filter for rows that belong to an employee (through a `user` relation), limited to the
 * requester's branch. Empty when the requester isn't branch-restricted.
 * Usage: prisma.salaryConfig.findMany({ where: { organizationId, ...branchUserFilter(req) } })
 */
export const branchUserFilter = (req: AuthRequest): { user?: { branchId: string } } => {
  const branchId = getScopedBranchId(req);
  return branchId ? { user: { branchId } } : {};
};

/**
 * True when `userId` is in the requester's organization and branch scope.
 * Center admins may also reach users of their study center.
 */
export const isUserInScope = async (req: AuthRequest, userId: string): Promise<boolean> => {
  if (userId === req.user.id) return true;
  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId: req.user.organizationId },
    select: { branchId: true, studyCenterId: true }
  });
  if (!target) return false;
  const branchId = getScopedBranchId(req);
  if (!branchId || target.branchId === branchId) return true;
  return req.user.role === 'center_admin' && !!req.user.studyCenterId && target.studyCenterId === req.user.studyCenterId;
};
