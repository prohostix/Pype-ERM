import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

export const STUDY_ABROAD_FEATURE = 'study_abroad_partners';

/**
 * Features granted to an organization by Superadmin (Licenses → Configure plan).
 * Same precedence the plan dialog and org menus use: planConfig → billingConfig → license.
 * Study Abroad is opt-in, so there is deliberately no default set.
 */
export const resolveOrgFeatures = (org: { metadata?: any; license?: { features?: string[] | null } | null } | null): string[] => {
  const meta = (org?.metadata as any) || {};
  const custom = meta.planConfig?.features ?? meta.billingConfig?.features;
  if (Array.isArray(custom)) return custom;
  const licensed = org?.license?.features;
  return Array.isArray(licensed) ? licensed : [];
};

/** Blocks every Study Abroad endpoint (staff and partner portal) unless Superadmin enabled the feature for the org. */
export const requireStudyAbroadEnabled = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role === 'superadmin') { next(); return; }
    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: { metadata: true, license: { select: { features: true } } },
    });
    if (!resolveOrgFeatures(org as any).includes(STUDY_ABROAD_FEATURE)) {
      res.status(403).json({
        success: false,
        code: 'FEATURE_DISABLED',
        message: 'Study Abroad Partners is not enabled for your organization. Please contact your Superadmin.',
      });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
};
