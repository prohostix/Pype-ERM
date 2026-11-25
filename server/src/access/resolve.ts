/** Turns a user and their overrides into one level per feature. Pure, so it can be tested without a database. */
import { AccessLevel, AccessUser, Feature, FEATURES } from './catalog.js';
import { isAccountDisabled } from '../utils/userGuards.js';

export interface Override {
  organizationId: string;
  userId: string;
  featureKey: string;
  level: string;
  roleAtGrant: string;
  departmentIdAtGrant?: string | null;
  createdAt?: Date;
  revokedAt?: Date | null;
}

export interface FeatureAccess { level: AccessLevel; source: 'default' | 'override' }
export type Access = Record<string, FeatureAccess>;

/** Accounts whose access cannot be changed by an override. */
const FIXED_ROLES = ['superadmin', 'org_admin', 'ceo', 'student', 'faculty', 'center_admin', 'study_abroad_admin'];

export const acceptsOverrides = (user: Pick<AccessUser, 'role'>): boolean => !FIXED_ROLES.includes(user.role);

const applies = (override: Override, user: AccessUser, feature: Feature): boolean => {
  if (override.revokedAt || override.userId !== user.id || override.featureKey !== feature.key) return false;
  if (override.organizationId !== user.organizationId) return false;
  if (override.roleAtGrant !== user.role || (override.departmentIdAtGrant || null) !== (user.departmentId || null)) return false;
  if (override.level === 'none') return true;
  // Granted data is limited to the user's own branch, so there must be one
  return Boolean(user.branchId) && (feature.levels as string[]).includes(override.level);
};

/**
 * `orgFeatures` is the organization's plan; features that depend on one it lacks are always `none`.
 */
export const resolveAccess = (
  user: AccessUser,
  overrides: Override[],
  orgFeatures: string[] = [],
  features: Feature[] = FEATURES,
): Access => Object.fromEntries(features.map((feature): [string, FeatureAccess] => {
  if (isAccountDisabled(user.status) || (feature.orgFeature && !orgFeatures.includes(feature.orgFeature))) {
    return [feature.key, { level: 'none', source: 'default' }];
  }
  const override = acceptsOverrides(user)
    ? overrides
        .filter((row) => applies(row, user, feature))
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))[0]
    : undefined;
  return [feature.key, override
    ? { level: override.level as AccessLevel, source: 'override' }
    : { level: feature.defaultLevel(user), source: 'default' }];
}));
