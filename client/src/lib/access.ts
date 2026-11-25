// What the signed-in user may do on a page. The server decides and enforces this (server/src/access);
// the screens use it only to avoid showing buttons that would be refused.

export type AccessAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'download' | 'import' | 'send';

export type UserAccess = Record<string, Partial<Record<AccessAction, { allowed: boolean; byDefault: boolean; override?: 'allow' | 'deny' }>>>;

/**
 * What the screen should offer. `fallback` is what the role gets on this screen; it stands unless
 * an Org Admin has set something, or the page was given to someone whose role does not include it.
 * A role can reach a screen in ways the server's defaults do not know about (such as a collections
 * overseer), so "not a default" alone never hides anything.
 */
export const mayOn = (user: { access?: UserAccess } | null | undefined, page: string, action: AccessAction, fallback: boolean): boolean => {
  const feature = user?.access?.[page];
  const setting = feature?.[action];
  if (!feature || !setting) return fallback;
  if (feature.view?.override === 'deny' || setting.override === 'deny') return false;
  if (setting.override === 'allow') return setting.allowed;
  const given = !feature.view?.byDefault && Object.values(feature).some((a) => a?.override === 'allow');
  return given || setting.byDefault ? setting.allowed : fallback;
};

/** Whether the screen should offer the action when the role normally has it. */
export const canDo = (user: { access?: UserAccess } | null | undefined, page: string, action: AccessAction): boolean =>
  mayOn(user, page, action, true);

/** An Org Admin has blocked this page for the user. */
export const isBlocked = (user: { access?: UserAccess } | null | undefined, page: string): boolean =>
  user?.access?.[page]?.view?.override === 'deny';
