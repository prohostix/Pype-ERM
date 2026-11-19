import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

/**
 * Kept so existing route declarations still work. Every create / update / delete is now recorded
 * centrally by `activityLogger` (with route, result and old values), so this no longer writes a second row.
 */
export const auditLog = (_action: string, _entityType: string) => {
  return (_req: AuthRequest, _res: Response, next: NextFunction): void => next();
};
