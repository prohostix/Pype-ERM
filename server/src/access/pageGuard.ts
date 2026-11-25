/** Route middleware for pages whose routes used to be limited by a role list. */
import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { Action } from './catalog.js';
import { loadAccess } from './load.js';
import { AccessRequest } from './guard.js';
import { decidePageAction, isGrantedPage } from './pageRules.js';

export interface PageRequest extends AccessRequest {
  /** Set when the caller has this permission only because an Org Admin allowed it. */
  ownBranchOnly?: boolean;
}

interface Options {
  /** For records that belong to a branch: is the one in the URL inside the caller's branch? */
  inBranch?: (req: PageRequest, branchId: string) => Promise<boolean>;
}

/** Replaces `authorize(...)`: the role list still applies to anyone without a setting of their own. */
export const pageAction = (pageKey: string, action: Action, legacyRoles: string[] | null, options: Options = {}) =>
  async (req: PageRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const managed = await prisma.branch.findFirst({ where: { branchManagerId: req.user.id }, select: { id: true } });
      const access = await loadAccess(req.user, Boolean(managed));
      if (!access) {
        res.status(503).json({ success: false, message: 'Could not check your permissions. Please try again.' });
        return;
      }
      const decision = decidePageAction(access, pageKey, action, req.user.role, legacyRoles);
      if (!decision.allowed) {
        res.status(403).json({ success: false, message: 'You do not have permission to do this' });
        return;
      }
      req.access = access;
      req.ownBranchOnly = decision.ownBranchOnly || isGrantedPage(access, pageKey);
      if (req.ownBranchOnly && options.inBranch && req.params.id && !(await options.inBranch(req, req.user.branchId))) {
        res.status(404).json({ success: false, message: 'Record not found' });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };

/** Study partner invite links made by someone in the branch. */
export const inviteInBranch = async (req: PageRequest, branchId: string): Promise<boolean> =>
  Boolean(await prisma.studyCenterInvite.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId, referrer: { branchId } },
    select: { id: true },
  }));

/** Applications of a branch: the student or the sales person belongs to it. */
export const enrollmentBranchWhere = (branchId: string) => ({ OR: [{ student: { branchId } }, { salesUser: { branchId } }] });

export const enrollmentInBranch = async (req: PageRequest, branchId: string): Promise<boolean> =>
  Boolean(await prisma.enrollment.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId, ...enrollmentBranchWhere(branchId) },
    select: { id: true },
  }));
