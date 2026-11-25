/** Database side of access. A failure here must never stop someone signing in. */
import prisma from '../lib/prisma.js';
import { AccessUser } from './catalog.js';
import { Access, resolveAccess } from './resolve.js';

/**
 * The signed-in user's access, or undefined when it cannot be worked out (the client then keeps
 * the role defaults). `user` needs id, role, status, organizationId, branchId, departmentId and
 * subDepartmentId.
 */
export const loadAccess = async (user: any, isBranchManager: boolean): Promise<Access | undefined> => {
  try {
    let departmentType: string | null = user.department?.type ?? null;
    if (!departmentType && user.departmentId) {
      const department = await prisma.department.findUnique({ where: { id: user.departmentId }, select: { type: true } });
      departmentType = department?.type ?? null;
    }
    if (!departmentType && user.subDepartmentId) {
      const sub = await prisma.subDepartment.findUnique({ where: { id: user.subDepartmentId }, select: { parentDept: { select: { type: true } } } });
      departmentType = sub?.parentDept.type ?? null;
    }
    const subject: AccessUser = { ...user, departmentType, isBranchManager };
    const overrides = await prisma.userAccessOverride
      .findMany({ where: { userId: user.id, revokedAt: null } })
      .catch((error: any) => {
        // For example before the table has been created: everyone keeps the defaults
        console.error('[access] could not read overrides:', error?.message || error);
        return [];
      });
    const organization = user.organization;
    const planFeatures = organization?.metadata?.planConfig?.features
      ?? organization?.metadata?.billingConfig?.features
      ?? organization?.license?.features;
    return resolveAccess(subject, overrides, Array.isArray(planFeatures) ? planFeatures : []);
  } catch (error: any) {
    console.error('[access] could not resolve access:', error?.message || error);
    return undefined;
  }
};

/** Marks a user's overrides as ended after their role or department changed. */
export const revokeOverrides = async (userId: string, revokedById: string): Promise<void> => {
  try {
    await prisma.userAccessOverride.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedById },
    });
  } catch (error: any) {
    // The resolver already ignores overrides made for a different role or department
    console.error('[access] could not revoke overrides:', error?.message || error);
  }
};
