/** Turns a user and their overrides into what they may do on each page. Pure, so it can be tested without a database. */
import { Action, AccessUser, Feature, FEATURES } from './catalog.js';
import { isAccountDisabled } from '../utils/userGuards.js';

export type Effect = 'allow' | 'deny';

/** One stored decision. No row means the role default. */
export interface Override {
  organizationId: string;
  userId: string;
  featureKey: string;
  action: string;
  effect: string;
  roleAtGrant: string;
  departmentIdAtGrant?: string | null;
  createdAt?: Date;
  revokedAt?: Date | null;
}

export interface ActionAccess {
  allowed: boolean;
  /** What the role and department give on their own. */
  byDefault: boolean;
  /** The override in force, if any. */
  override?: Effect;
}
export type Access = Record<string, Partial<Record<Action, ActionAccess>>>;

/** Accounts whose access cannot be changed by an override. */
const FIXED_ROLES = ['superadmin', 'org_admin', 'ceo', 'student', 'faculty', 'center_admin', 'study_abroad_admin'];

export const acceptsOverrides = (user: Pick<AccessUser, 'role'>): boolean => !FIXED_ROLES.includes(user.role);

const applies = (override: Override, user: AccessUser, feature: Feature): boolean => {
  if (override.revokedAt || override.userId !== user.id || override.featureKey !== feature.key) return false;
  if (override.organizationId !== user.organizationId) return false;
  if (override.roleAtGrant !== user.role || (override.departmentIdAtGrant || null) !== (user.departmentId || null)) return false;
  if (!(feature.actions as string[]).includes(override.action)) return false;
  if (override.effect === 'deny') return true;
  // Granted data is limited to the user's own branch, so there must be one
  return override.effect === 'allow' && Boolean(user.branchId);
};

const resolveFeature = (user: AccessUser, rows: Override[], feature: Feature): Partial<Record<Action, ActionAccess>> => {
  const defaults = feature.defaultActions(user);

  const decided = new Map<string, Effect>();
  if (acceptsOverrides(user)) {
    rows
      .filter((row) => applies(row, user, feature))
      .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0))
      .forEach((row) => decided.set(row.action, row.effect as Effect)); // the newest row wins
  }

  const allowed = new Set<Action>(feature.actions.filter((action) => {
    const effect = decided.get(action);
    return effect ? effect === 'allow' : defaults.includes(action);
  }));
  // Allowing any action opens the page too, unless view itself is blocked; without view there is nothing
  if (feature.actions.some((action) => decided.get(action) === 'allow') && decided.get('view') !== 'deny') allowed.add('view');
  if (!allowed.has('view')) allowed.clear();

  return Object.fromEntries(feature.actions.map((action) => [action, {
    allowed: allowed.has(action),
    byDefault: defaults.includes(action),
    ...(decided.has(action) && { override: decided.get(action) }),
  }]));
};

/**
 * `orgFeatures` is the organization's plan; pages that depend on one it lacks allow nothing.
 * Disabled accounts are allowed nothing.
 */
export const resolveAccess = (
  user: AccessUser,
  overrides: Override[],
  orgFeatures: string[] = [],
  features: Feature[] = FEATURES,
): Access => Object.fromEntries(features.map((feature) => {
  const off = isAccountDisabled(user.status) || Boolean(feature.orgFeature && !orgFeatures.includes(feature.orgFeature));
  const result = off
    ? Object.fromEntries(feature.actions.map((action) => [action, { allowed: false, byDefault: false }]))
    : resolveFeature(user, overrides, feature);
  return [feature.key, result];
}));

export const can = (access: Access, featureKey: string, action: Action): boolean =>
  access[featureKey]?.[action]?.allowed === true;
