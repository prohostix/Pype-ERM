import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import prisma from '../lib/prisma.js';

export const ACADEMIC_PARTNERS_FEATURE = 'academic_partners';
export const ACADEMIC_CENTERS_FEATURE = 'academic_centers';
const DEFAULT_FEATURES = [ACADEMIC_PARTNERS_FEATURE, ACADEMIC_CENTERS_FEATURE];

/**
 * Blocks an endpoint unless Superadmin enabled `feature` for the org (Licenses → Configure plan).
 * Orgs with no explicit feature list keep the default set (academic partners + centers), matching the UI.
 */
export const requireOrgFeature = (feature: string, label: string) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.role === 'superadmin' || !req.user?.organizationId) { next(); return; }
      const org = await prisma.organization.findUnique({
        where: { id: req.user.organizationId },
        select: { metadata: true, license: { select: { features: true } } },
      });
      const meta = ((org?.metadata as any) || {});
      const explicit = meta.planConfig?.features ?? meta.billingConfig?.features;
      const licensed = org?.license?.features;
      const features = Array.isArray(explicit) ? explicit
        : (Array.isArray(licensed) && licensed.length > 0 ? licensed : DEFAULT_FEATURES);
      if (!features.includes(feature)) {
        res.status(403).json({
          success: false,
          code: 'FEATURE_DISABLED',
          message: `${label} is not enabled for your organization. Please contact your Superadmin.`,
        });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };

export const requireAcademicCentersEnabled = requireOrgFeature(ACADEMIC_CENTERS_FEATURE, 'Academic Centers');
export const requireAcademicPartnersEnabled = requireOrgFeature(ACADEMIC_PARTNERS_FEATURE, 'Academic Partners');
