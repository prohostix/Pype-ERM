/** Rules for an Org Admin's changes to one user's access. Pure, so they can be tested without a database. */
import { AccessUser, Feature, FEATURES } from './catalog.js';
import { acceptsOverrides } from './resolve.js';

export type Setting = 'default' | 'allow' | 'deny';
export interface Change { featureKey: string; action: string; effect: Setting }

/** Why these changes may not be saved; null when they may. */
export const changeError = (actorId: string, target: AccessUser, changes: unknown, features: Feature[] = FEATURES): string | null => {
  if (target.id === actorId) return 'You cannot change your own access';
  if (!acceptsOverrides(target)) return 'Access for this type of account cannot be changed';
  if (!Array.isArray(changes) || changes.length === 0) return 'There is nothing to save';
  const seen = new Set<string>();
  for (const change of changes as Change[]) {
    const feature = features.find((f) => f.key === change?.featureKey);
    if (!feature || !(feature.actions as string[]).includes(change.action)) return 'Unknown page or action';
    if (!['default', 'allow', 'deny'].includes(change.effect)) return 'Unknown setting';
    const key = `${change.featureKey}.${change.action}`;
    if (seen.has(key)) return 'The same action appears twice';
    seen.add(key);
    if (change.effect === 'allow' && feature.blockOnly) return `${feature.label} can only be blocked for now`;
  }
  return null;
};

/**
 * Whether a change needs a stored row. A setting equal to the role default is not stored, except
 * blocking View: that also has to stop another allowed action from opening the page.
 */
export const needsRow = (target: AccessUser, change: Change, features: Feature[] = FEATURES): boolean => {
  if (change.effect === 'default') return false;
  const feature = features.find((f) => f.key === change.featureKey)!;
  const byDefault = feature.defaultActions(target).includes(change.action as any);
  // On a full-access page Allow is stored even when the role has the action: it is what widens the rest
  if (change.effect === 'allow') return !byDefault || Boolean(feature.fullAccess);
  return byDefault || change.action === 'view';
};
