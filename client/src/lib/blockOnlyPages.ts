// Pages that can only be blocked for a user, with the menu entries they are (see server/src/access/blockPages.ts).
export interface BlockedPageMenu { key: string; label: string; menuIds: string[]; exceptRoles?: string[]; onlyRoles?: string[] }

export const BLOCK_ONLY_PAGES: BlockedPageMenu[] = [
  { key: 'executive_tasks', label: 'Executive Tasks', menuIds: [] },
];
