/** Refuses requests belonging to a page or action an Org Admin has blocked for the caller. */
import prisma from '../lib/prisma.js';
import type { Action } from './catalog.js';
import { BLOCK_PAGES } from './blockPages.js';
import { Access, acceptsOverrides } from './resolve.js';
import { loadAccess } from './load.js';

interface Compiled { pageKey: string; action: Action; method: string; pattern: RegExp; body?: [string, string] }

// Express matches paths without regard to case or a trailing slash, so these do the same
const COMPILED: Compiled[] = BLOCK_PAGES.flatMap((page) => page.rules.map((rule) => ({
  pageKey: page.key, action: rule.action, method: rule.method, body: rule.body,
  pattern: new RegExp(`^${rule.path.replace(/:id/g, '[^/]+')}/?$`, 'i'),
})));

/** The blockable page actions a request belongs to. */
export const rulesFor = (method: string, url: string, body?: any): { pageKey: string; action: Action }[] => {
  const path = url.split('?')[0].replace(/^\/api(\/v\d+)?/i, '');
  const verb = method === 'HEAD' ? 'GET' : method;
  const matches = COMPILED.filter((r) => r.method === verb && r.pattern.test(path)
    && (!r.body || String(body?.[r.body[0]] ?? '') === r.body[1]));
  // A fixed path such as /payroll/batches also fits /payroll/:id; the exact rule is the one meant
  const exact = matches.filter((r) => !r.pattern.source.includes('[^/]+'));
  return (exact.length ? exact : matches).map(({ pageKey, action }) => ({ pageKey, action }));
};

/** Refused when every page the request belongs to is blocked for it. */
export const isBlockedRequest = (access: Access, rules: { pageKey: string; action: Action }[]): boolean =>
  rules.length > 0 && rules.every(({ pageKey, action }) =>
    access[pageKey]?.view?.override === 'deny' || access[pageKey]?.[action]?.override === 'deny');

/** For `protect`: 'blocked', 'unknown' when permissions could not be read, otherwise 'ok'. */
export const checkBlocked = async (user: any, method: string, url: string, body?: any): Promise<'ok' | 'blocked' | 'unknown'> => {
  const rules = rulesFor(method, url, body);
  if (rules.length === 0 || !acceptsOverrides(user)) return 'ok';
  const managed = await prisma.branch.findFirst({ where: { branchManagerId: user.id }, select: { id: true } });
  const access = await loadAccess(user, Boolean(managed));
  if (!access) return 'unknown';
  return isBlockedRequest(access, rules) ? 'blocked' : 'ok';
};
