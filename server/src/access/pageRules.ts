/** How an Org Admin's settings combine with a route's old role list. Pure, so it can be tested without a database. */
import { Action } from './catalog.js';
import { Access } from './resolve.js';

/**
 * Someone given a page although their role's screens do not include it. Server routes also accept
 * some such roles for other workflows, so for these users only the page settings count.
 */
export const isGrantedPage = (access: Access, pageKey: string): boolean => {
  const page = access[pageKey];
  if (!page || page.view?.byDefault || !page.view?.allowed) return false;
  return Object.values(page).some((action) => action?.override === 'allow');
};

/**
 * May the user do this? `legacyRoles` are the roles the route accepted before per-user access and
 * still decides for anyone without a setting. `ownBranchOnly` is set when the permission comes
 * from an Org Admin.
 */
export const decidePageAction = (access: Access, pageKey: string, action: Action, role: string, legacyRoles: string[] | null): { allowed: boolean; ownBranchOnly: boolean } => {
  const page = access[pageKey];
  const setting = page?.[action];
  const refused = { allowed: false, ownBranchOnly: false };
  if (page?.view?.override === 'deny' || setting?.override === 'deny') return refused;
  if (isGrantedPage(access, pageKey)) return setting?.allowed ? { allowed: true, ownBranchOnly: true } : refused;
  if (setting?.override === 'allow' && setting.allowed) return { allowed: true, ownBranchOnly: !setting.byDefault };
  // null: the route accepted any signed-in user
  return { allowed: legacyRoles === null || legacyRoles.includes(role), ownBranchOnly: false };
};
