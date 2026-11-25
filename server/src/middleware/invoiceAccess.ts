import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import prisma from '../lib/prisma.js';
import { canWriteInvoices } from '../utils/userGuards.js';

/** Refuses invoice creation and editing for users whose screens do not offer it. */
export const requireInvoiceWriter = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    let allowed = canWriteInvoices(user, { managesBranch: false });
    if (!allowed) {
      const [branch, subDepartment] = await Promise.all([
        prisma.branch.findFirst({ where: { branchManagerId: user.id }, select: { id: true } }),
        user.subDepartmentId && !user.department
          ? prisma.subDepartment.findUnique({ where: { id: user.subDepartmentId }, select: { parentDept: { select: { type: true } } } })
          : null,
      ]);
      allowed = canWriteInvoices(user, {
        managesBranch: Boolean(branch),
        departmentType: user.department?.type ?? subDepartment?.parentDept.type,
      });
    }
    if (!allowed) {
      res.status(403).json({ success: false, message: 'You do not have permission to create or edit invoices' });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};
