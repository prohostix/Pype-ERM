import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { loadAccess } from './load.js';
import { hasFullGrant } from './pageRules.js';

/**
 * Partner and student portal logins are stored readably so an Org Admin can share them. Nobody
 * else is sent them.
 */
const MAY_SEE = ['org_admin', 'superadmin'];

export const withoutPortalLogins = <T extends { credentials?: unknown }>(user: { role: string; seesPartnerLogins?: boolean }, rows: T[]): (T | Omit<T, 'credentials'>)[] =>
  MAY_SEE.includes(user.role) || user.seesPartnerLogins ? rows : rows.map(({ credentials: _credentials, ...row }) => row);

export const isPortalAccount = (role: string): boolean => role === 'student' || role === 'faculty';

/** Student and faculty logins have no business with partner records */
export const staffAndPartnersOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (isPortalAccount(req.user.role)) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }
  next();
};

/** Marks the request when an Org Admin gave this person the Academic Partners page. */
export const partnerContext = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const managed = await prisma.branch.findFirst({ where: { branchManagerId: req.user.id }, select: { id: true } });
    const access = await loadAccess(req.user, Boolean(managed));
    if (!access) { res.status(503).json({ success: false, message: 'Could not check your permissions. Please try again.' }); return; }
    req.user.seesPartnerLogins = hasFullGrant(access, 'academic_partners') && access.academic_partners?.view?.allowed === true;
    next();
  } catch (error) {
    next(error);
  }
};
