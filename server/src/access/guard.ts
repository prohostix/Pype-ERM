/** Route guard for pages whose actions an Org Admin can set per user. */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { Action, AccessUser } from './catalog.js';
import { Access, can } from './resolve.js';
import { loadAccess, loadSubject } from './load.js';
import { hasPaymentsScreen, invoiceBranchWhere, isGrantedReader } from './invoiceRules.js';

export interface AccessRequest extends AuthRequest {
  access?: Access;
  subject?: AccessUser;
  /** Set when the caller may only read the short invoice list used by Payments. */
  summaryOnly?: boolean;
}

type Check = [featureKey: string, action: Action];

const load = async (req: AccessRequest): Promise<boolean> => {
  const managed = await prisma.branch.findFirst({ where: { branchManagerId: req.user.id }, select: { id: true } });
  req.subject = await loadSubject(req.user, Boolean(managed));
  req.access = await loadAccess(req.user, Boolean(managed));
  return Boolean(req.access);
};

const guard = (checks: Check[], options: { paymentsSummary?: boolean } = {}) =>
  async (req: AccessRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(await load(req))) {
        res.status(503).json({ success: false, message: 'Could not check your permissions. Please try again.' });
        return;
      }
      if (checks.some(([feature, action]) => can(req.access!, feature, action))) { next(); return; }
      if (options.paymentsSummary && hasPaymentsScreen(req.subject!)) {
        req.summaryOnly = true;
        next();
        return;
      }
      res.status(403).json({ success: false, message: 'You do not have permission to do this' });
    } catch (error) {
      next(error);
    }
  };

/** Allows the request when the user may do any one of the listed actions. */
export const requireAccess = (...checks: Check[]) => guard(checks);

/** As requireAccess, but Payments users get through with `summaryOnly` set. */
export const requireAccessOrPaymentsSummary = (...checks: Check[]) => guard(checks, { paymentsSummary: true });

/** The branch condition for invoices this request may touch; null when there is none. */
export const invoiceScope = (req: AccessRequest) =>
  invoiceBranchWhere(req.user, req.access ? isGrantedReader(req.access) : false);
