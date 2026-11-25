// What the signed-in user may do on a page. The server decides and enforces this (server/src/access);
// the screens use it only to avoid showing buttons that would be refused.

export type AccessAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'download' | 'import' | 'send';

export type UserAccess = Record<string, Partial<Record<AccessAction, { allowed: boolean; byDefault: boolean }>>>;

/** When no access information is available the screen is left as it is; the server still checks. */
export const canDo = (user: { access?: UserAccess } | null | undefined, page: string, action: AccessAction): boolean => {
  const feature = user?.access?.[page];
  return feature ? feature[action]?.allowed === true : true;
};
