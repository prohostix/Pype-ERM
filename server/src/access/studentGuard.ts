/** Route middleware for the Students page. */
import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { Action } from './catalog.js';
import { loadAccess } from './load.js';
import { AccessRequest } from './guard.js';
import { decideStudentAction, isGrantedStudentUser, studentBranchWhere } from './studentRules.js';
import { isGrantedPage } from './pageRules.js';

export interface StudentRequest extends AccessRequest {
  /** Present when the caller sees students only because an Org Admin allowed it. */
  studentLimits?: { branchId: string; hideFees: boolean; hideCredentials: boolean };
  /** An import allowed by an Org Admin may add new students but not change existing accounts. */
  newStudentsOnly?: boolean;
}

/** Works out the caller's access once for every student request. */
export const studentContext = async (req: StudentRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const managed = await prisma.branch.findFirst({ where: { branchManagerId: req.user.id }, select: { id: true } });
    const access = await loadAccess(req.user, Boolean(managed));
    if (!access) {
      res.status(503).json({ success: false, message: 'Could not check your permissions. Please try again.' });
      return;
    }
    req.access = access;
    // Given the Students page, or given Student Portal Management without having a student list by role
    const portalOnly = isGrantedPage(access, 'student_portal_management') && !access.students.view?.byDefault;
    // Pages that work from the student list
    const reportOnly = ['student_report', 'university_submission', 'enrollment_numbers', 're_registration', 'document_received', 'document_dispatch']
      .some((page) => isGrantedPage(access, page)) && !access.students.view?.byDefault;
    if (isGrantedStudentUser(access) || portalOnly || reportOnly) {
      // Without a branch the limit is the whole organization
      req.studentLimits = {
        branchId: req.user.branchId,
        hideFees: !access.invoices?.view?.allowed,
        hideCredentials: !(access.students.edit?.allowed || access.student_portal_management.edit?.allowed),
      };
    }
    next();
  } catch (error) {
    next(error);
  }
};

const inBranch = async (req: StudentRequest, studentId: string, branchId: string): Promise<boolean> =>
  Boolean(await prisma.student.findFirst({
    where: { id: studentId, organizationId: req.user.organizationId, ...studentBranchWhere(branchId) },
    select: { id: true },
  }));

/** Replaces `authorize(...)`: the role list still applies to anyone without a setting of their own. */
export const studentAction = (action: Action, legacyRoles: string[]) =>
  async (req: StudentRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { allowed, ownBranchOnly } = decideStudentAction(req.access!, action, req.user.role, legacyRoles);
      if (!allowed) {
        res.status(403).json({ success: false, message: 'You do not have permission to do this' });
        return;
      }
      if (ownBranchOnly) {
        const branchId = req.user.branchId;
        // Bulk changes name any number of students, so they cannot be held to one branch here
        if (!req.params.id && !['create', 'import'].includes(action)) {
          res.status(403).json({ success: false, message: 'Bulk changes are not available with the access you were given' });
          return;
        }
        if (action === 'import') req.newStudentsOnly = true;
        // Upgrading an existing student changes that record
        const upgraded = action === 'create' ? req.body?.existingStudentId || (req.body?.isUpgrade && req.body?.studentId) : undefined;
        if (upgraded && !(await inBranch(req, upgraded, branchId))) {
          res.status(404).json({ success: false, message: 'Student not found' });
          return;
        }
        if (req.params.id && !(await inBranch(req, req.params.id, branchId))) {
          res.status(404).json({ success: false, message: 'Student not found' });
          return;
        }
        // Whatever they create or change stays in their branch
        if (branchId && req.body && typeof req.body === 'object') {
          if (action === 'create' || action === 'import' || req.body.branchId !== undefined) req.body.branchId = branchId;
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };

/** Bulk enrollment numbers: the Students rules, or someone given Enrollment Number Update. */
export const enrollmentNumberUpdate = (legacyRoles: string[]) => {
  const otherwise = studentAction('edit', legacyRoles);
  return async (req: StudentRequest & { ownBranchOnly?: boolean }, res: Response, next: NextFunction): Promise<void> => {
    const page = req.access!.enrollment_numbers;
    if (!isGrantedPage(req.access!, 'enrollment_numbers') || !page?.edit?.allowed) { await otherwise(req, res, next); return; }
    req.ownBranchOnly = true;
    next();
  };
};

/** Fields a university-work page saves on a student, and the page that allows it. */
const SINGLE_FIELD: Record<string, { page: string; change: (current: any, sent: any) => object }> = {
  admissionProgress: { page: 'university_submission', change: (current, sent) => ({ ...current, universitySubmitted: Boolean(sent?.universitySubmitted) }) },
  reregStatus: {
    page: 're_registration',
    change: (current, sent) => ({ ...current, completed: Boolean(sent?.completed), ...(sent?.completed && { completedAt: new Date().toISOString() }) }),
  },
};

/**
 * Saving only a student's portal login also follows the Student Portal Management page; anything
 * else follows the Students page.
 */
export const studentUpdate = (legacyRoles: string[]) => {
  const otherwise = studentAction('edit', legacyRoles);
  return async (req: StudentRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const keys = Object.keys(req.body || {});
      const single = keys.length === 1 ? SINGLE_FIELD[keys[0]] : undefined;
      if (single && isGrantedPage(req.access!, single.page) && req.access![single.page]?.edit?.allowed) {
        const student = await prisma.student.findFirst({
          where: { id: req.params.id, organizationId: req.user.organizationId, ...studentBranchWhere(req.user.branchId) },
          select: { admissionProgress: true, reregStatus: true },
        });
        if (!student) {
          res.status(404).json({ success: false, message: 'Student not found' });
          return;
        }
        // Only that one value changes; everything else stays as stored
        req.body = { [keys[0]]: single.change((student as any)[keys[0]] || {}, req.body[keys[0]]) };
        next();
        return;
      }
      const portal = req.access!.student_portal_management;
      if (keys.length !== 1 || keys[0] !== 'credentials') { await otherwise(req, res, next); return; }
      if (portal?.view?.override === 'deny' || portal?.edit?.override === 'deny') {
        res.status(403).json({ success: false, message: 'You do not have permission to do this' });
        return;
      }
      if (!isGrantedPage(req.access!, 'student_portal_management') || !portal?.edit?.allowed) { await otherwise(req, res, next); return; }
      if (!(await inBranch(req, req.params.id, req.user.branchId))) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/** A reminder can also be sent from Collections by someone given that page. */
export const studentNotify = (legacyRoles: string[]) => {
  const otherwise = studentAction('send', legacyRoles);
  return async (req: StudentRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.access!.collections;
      if (!isGrantedPage(req.access!, 'collections') || !page?.send?.allowed) { await otherwise(req, res, next); return; }
      if (!(await inBranch(req, req.params.id, req.user.branchId))) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/** For reading one student's details: granted users stay inside their branch. */
export const studentRead = async (req: StudentRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.studentLimits && !(await inBranch(req, req.params.id, req.studentLimits.branchId))) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};
