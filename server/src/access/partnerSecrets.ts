import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';

/**
 * Partner and student portal logins are stored readably so an Org Admin can share them. Nobody
 * else is sent them.
 */
const MAY_SEE = ['org_admin', 'superadmin'];

export const withoutPortalLogins = <T extends { credentials?: unknown }>(user: { role: string }, rows: T[]): (T | Omit<T, 'credentials'>)[] =>
  MAY_SEE.includes(user.role) ? rows : rows.map(({ credentials: _credentials, ...row }) => row);

export const isPortalAccount = (role: string): boolean => role === 'student' || role === 'faculty';

/** Student and faculty logins have no business with partner records */
export const staffAndPartnersOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (isPortalAccount(req.user.role)) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }
  next();
};
