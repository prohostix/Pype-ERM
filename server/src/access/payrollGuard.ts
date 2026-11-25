/** Reading payroll records, which everyone may do for their own pay slips. */
import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { loadAccess } from './load.js';
import { isGrantedPage } from './pageRules.js';
import { PageRequest } from './pageGuard.js';
import { Access } from './resolve.js';

export interface PayrollRequest extends PageRequest {
  /** 'given': an Org Admin let them see other people's payroll. 'blocked': only their own. */
  payrollTeam?: 'given' | 'blocked';
}

const PAGES = ['payroll', 'payroll_history'];

export const payrollTeamAccess = (access: Access): PayrollRequest['payrollTeam'] => {
  if (PAGES.every((page) => access[page]?.view?.override === 'deny')) return 'blocked';
  return PAGES.some((page) => isGrantedPage(access, page)) ? 'given' : undefined;
};

export const payrollContext = async (req: PayrollRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const managed = await prisma.branch.findFirst({ where: { branchManagerId: req.user.id }, select: { id: true } });
    const access = await loadAccess(req.user, Boolean(managed));
    if (!access) {
      res.status(503).json({ success: false, message: 'Could not check your permissions. Please try again.' });
      return;
    }
    req.access = access;
    req.payrollTeam = payrollTeamAccess(access);
    next();
  } catch (error) {
    next(error);
  }
};
