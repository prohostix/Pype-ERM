/** Route middleware for pages whose routes used to be limited by a role list. */
import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { Action } from './catalog.js';
import { loadAccess } from './load.js';
import { AccessRequest } from './guard.js';
import { decidePageAction, isGrantedPage } from './pageRules.js';
import { invoiceBranchWhere } from './invoiceRules.js';

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
      req.ownBranchOnly = decision.ownBranchOnly || isGrantedPage(access, decidedBy);
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

/** Study partner invite links made by someone in the branch. */
export const inviteInBranch = async (req: PageRequest, branchId: string): Promise<boolean> =>
  Boolean(await prisma.studyCenterInvite.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId, referrer: { branchId } },
    select: { id: true },
  }));

export const expenseInBranch = async (req: PageRequest, branchId: string): Promise<boolean> =>
  Boolean(await prisma.expenseClaim.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId, user: { branchId } },
    select: { id: true },
  }));

export const paymentInBranch = async (req: PageRequest, branchId: string): Promise<boolean> =>
  Boolean(await prisma.paymentEntry.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId, invoice: invoiceBranchWhere({ role: req.user.role, branchId }, true)! },
    select: { id: true },
  }));

type Model = 'studyCenter' | 'walletTopUp' | 'enrollment' | 'paymentLink' | 'paymentSchedule' | 'target';

/** The record named in the URL belongs to the caller's organization. */
export const ownedBy = (model: Model) => async (req: PageRequest): Promise<boolean> =>
  Boolean(await (prisma[model] as any).findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId }, select: { id: true } }));

/** A partner belongs to a branch when its referrer or one of its students does. */
export const partnerBranchWhere = (branchId: string) => ({ OR: [{ referrer: { branchId } }, { students: { some: { branchId } } }] });

const recordInBranch = (model: Model, where: (branchId: string) => object) => async (req: PageRequest, branchId: string): Promise<boolean> =>
  Boolean(await (prisma[model] as any).findFirst({ where: { id: req.params.id, ...where(branchId) }, select: { id: true } }));

export const partnerInBranch = recordInBranch('studyCenter', partnerBranchWhere);
export const topUpInBranch = recordInBranch('walletTopUp', (branchId) => ({ studyCenter: partnerBranchWhere(branchId) }));
export const linkInBranch = recordInBranch('paymentLink', (branchId) => ({ student: { branchId } }));
export const scheduleInBranch = recordInBranch('paymentSchedule', (branchId) => ({ student: { branchId } }));
export const targetInBranch = recordInBranch('target', (branchId) => ({ branchId }));

/** Someone given a page is not sent students' portal passwords. */
export const withoutPasswords = <T extends { student?: any; credentials?: unknown }>(req: PageRequest, rows: T[]): T[] =>
  !req.ownBranchOnly ? rows : rows.map(({ credentials: _own, ...row }: any) => {
    if (!row.student) return row;
    const { credentials: _student, ...student } = row.student;
    return { ...row, student };
  });

/** Applications of a branch: the student or the sales person belongs to it. */
export const enrollmentBranchWhere = (branchId: string) => ({ OR: [{ student: { branchId } }, { salesUser: { branchId } }] });

export const enrollmentInBranch = async (req: PageRequest, branchId: string): Promise<boolean> =>
  Boolean(await prisma.enrollment.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId, ...enrollmentBranchWhere(branchId) },
    select: { id: true },
  }));
