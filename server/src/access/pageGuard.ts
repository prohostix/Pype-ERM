/** Route middleware for pages whose routes used to be limited by a role list. */
import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { Action } from './catalog.js';
import { loadAccess } from './load.js';
import { AccessRequest } from './guard.js';
import { decideAnyPage, decidePageAction, hasFullGrant, isGrantedPage } from './pageRules.js';
import { invoiceBranchWhere } from './invoiceRules.js';
import { BranchId, inOwnBranch } from './branchScope.js';

export interface PageRequest extends AccessRequest {
  /** Set when the caller has this permission only because an Org Admin allowed it. */
  ownBranchOnly?: boolean;
}

interface Options {
  /** For records that belong to a branch: is the one in the URL inside the caller's branch? */
  inBranch?: (req: PageRequest, branchId: string) => Promise<boolean>;
  /** For every caller but a Superadmin: does the record in the URL belong to their organization? */
  inOrganization?: (req: PageRequest) => Promise<boolean>;
  /** Another page whose action also permits this request, for users given that page. */
  alsoAllows?: [pageKey: string, action: Action];
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
      let decision = decidePageAction(access, pageKey, action, req.user.role, legacyRoles);
      let decidedBy = pageKey;
      if (!decision.allowed && options.alsoAllows) {
        const [otherPage, otherAction] = options.alsoAllows;
        if (isGrantedPage(access, otherPage) && access[otherPage][otherAction]?.allowed) {
          decision = { allowed: true, ownBranchOnly: true };
          decidedBy = otherPage;
        }
      }
      if (!decision.allowed) {
        res.status(403).json({ success: false, message: 'You do not have permission to do this' });
        return;
      }
      req.access = access;
      req.ownBranchOnly = hasFullGrant(access, decidedBy) ? false : decision.ownBranchOnly || isGrantedPage(access, decidedBy);
      if (req.params.id && options.inOrganization && req.user.role !== 'superadmin' && !(await options.inOrganization(req))) {
        res.status(404).json({ success: false, message: 'Record not found' });
        return;
      }
      if (req.ownBranchOnly && options.inBranch && req.params.id && !(await options.inBranch(req, req.user.branchId))) {
        res.status(404).json({ success: false, message: 'Record not found' });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };

/**
 * For reads that everyone may make about themselves: notes whether the caller was given the page,
 * so the controller can widen what they see. Refuses nothing.
 */
export const givenContext = (pageKey: string) =>
  async (req: PageRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const managed = await prisma.branch.findFirst({ where: { branchManagerId: req.user.id }, select: { id: true } });
      const access = await loadAccess(req.user, Boolean(managed));
      if (!access) {
        res.status(503).json({ success: false, message: 'Could not check your permissions. Please try again.' });
        return;
      }
      req.access = access;
      req.ownBranchOnly = isGrantedPage(access, pageKey);
      next();
    } catch (error) {
      next(error);
    }
  };

/** Sales targets carry no branch of their own: they belong to the branch of the person they are for. */
export const targetBranchWhere = (branchId: BranchId) => inOwnBranch(branchId, (id) => ({ employee: { branchId: id } }));

/** Someone acting only because an Org Admin allowed it may not act on their own record. */
export const refuseOwnRecord = (req: PageRequest, res: Response, userId: string | null | undefined, what: string): boolean => {
  if (!req.ownBranchOnly || userId !== req.user.id) return false;
  res.status(403).json({ success: false, message: `You cannot change or approve your own ${what}` });
  return true;
};

/** The account belongs to the organization, and to the branch of someone acting on given access. */
export const userInReach = async (req: PageRequest, userId: unknown): Promise<boolean> =>
  typeof userId === 'string' && Boolean(await prisma.user.findFirst({
    where: {
      id: userId,
      ...(req.user.role !== 'superadmin' && { organizationId: req.user.organizationId }),
      ...(req.ownBranchOnly && req.user.branchId && { branchId: req.user.branchId }),
    },
    select: { id: true },
  }));

/** Why this person may not be put in charge of something by this request; null when they may. */
export const appointmentError = async (req: PageRequest, userId: unknown): Promise<string | null> => {
  if (req.ownBranchOnly && userId === req.user.id) return 'You cannot appoint yourself';
  return (await userInReach(req, userId)) ? null : 'That person was not found';
};

/** For a request several pages share: any one of them is enough. */
export const anyPageAction = (pageKeys: string[], action: Action, legacyRoles: string[] | null) =>
  async (req: PageRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const managed = await prisma.branch.findFirst({ where: { branchManagerId: req.user.id }, select: { id: true } });
      const access = await loadAccess(req.user, Boolean(managed));
      if (!access) {
        res.status(503).json({ success: false, message: 'Could not check your permissions. Please try again.' });
        return;
      }
      const decision = decideAnyPage(access, pageKeys, action, req.user.role, legacyRoles);
      if (!decision.allowed) {
        res.status(403).json({ success: false, message: 'You do not have permission to do this' });
        return;
      }
      req.access = access;
      req.ownBranchOnly = decision.ownBranchOnly;
      next();
    } catch (error) {
      next(error);
    }
  };

/** Study partner invite links made by someone in the branch. */
export const inviteInBranch = async (req: PageRequest, branchId: string): Promise<boolean> =>
  Boolean(await prisma.studyCenterInvite.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId, ...inOwnBranch(branchId, (id) => ({ referrer: { branchId: id } })) },
    select: { id: true },
  }));

export const expenseInBranch = async (req: PageRequest, branchId: string): Promise<boolean> =>
  Boolean(await prisma.expenseClaim.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId, ...inOwnBranch(branchId, (id) => ({ user: { branchId: id } })) },
    select: { id: true },
  }));

export const paymentInBranch = async (req: PageRequest, branchId: string): Promise<boolean> => {
  const invoice = invoiceBranchWhere({ role: req.user.role, branchId }, true);
  return Boolean(await prisma.paymentEntry.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId, ...(invoice && { invoice }) },
    select: { id: true },
  }));
};

type Model = 'studyCenter' | 'walletTopUp' | 'enrollment' | 'paymentLink' | 'paymentSchedule' | 'target' | 'branch' | 'department' | 'designation' | 'university' | 'program' | 'poll' | 'announcement' | 'documentLog' | 'task' | 'escalation';

/** The record named in the URL belongs to the caller's organization. */
export const ownedBy = (model: Model) => async (req: PageRequest): Promise<boolean> =>
  Boolean(await (prisma[model] as any).findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId }, select: { id: true } }));

/** A partner belongs to a branch when its referrer or one of its students does. */
export const partnerBranchWhere = (branchId: BranchId) => inOwnBranch(branchId, (id) => ({ OR: [{ referrer: { branchId: id } }, { students: { some: { branchId: id } } }] }));

const recordInBranch = (model: Model, where: (branchId: string) => object) => async (req: PageRequest, branchId: string): Promise<boolean> =>
  Boolean(await (prisma[model] as any).findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId, ...inOwnBranch(branchId, where) },
    select: { id: true },
  }));

export const partnerInBranch = recordInBranch('studyCenter', partnerBranchWhere);
export const topUpInBranch = recordInBranch('walletTopUp', (branchId) => ({ studyCenter: partnerBranchWhere(branchId) }));
export const linkInBranch = recordInBranch('paymentLink', (branchId) => ({ student: { branchId } }));
export const scheduleInBranch = recordInBranch('paymentSchedule', (branchId) => ({ student: { branchId } }));
export const targetInBranch = recordInBranch('target', (branchId) => ({ employee: { branchId } }));

/** Someone given a page is not sent students' portal passwords. */
export const withoutPasswords = <T extends { student?: any; credentials?: unknown }>(req: PageRequest, rows: T[]): T[] =>
  !req.ownBranchOnly ? rows : rows.map(({ credentials: _own, ...row }: any) => {
    if (!row.student) return row;
    const { credentials: _student, ...student } = row.student;
    return { ...row, student };
  });

/** Applications of a branch: the student or the sales person belongs to it. */
export const enrollmentBranchWhere = (branchId: BranchId) => inOwnBranch(branchId, (id) => ({ OR: [{ student: { branchId: id } }, { salesUser: { branchId: id } }] }));

export const enrollmentInBranch = async (req: PageRequest, branchId: string): Promise<boolean> =>
  Boolean(await prisma.enrollment.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId, ...enrollmentBranchWhere(branchId) },
    select: { id: true },
  }));
