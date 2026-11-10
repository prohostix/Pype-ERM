/**
 * AI Reports: who may see what.
 *
 * buildContext() resolves everything needed to restrict data for the logged-in
 * user (branch, study center, university, sales team, linked student…). Each
 * dataset's scope() then turns this context into a Prisma `where`, or returns
 * null when the role has no access to that dataset at all.
 *
 * The rules mirror the existing panels:
 *  - org_admin / ceo / general_manager see the whole organization (utils/branchScope GLOBAL_ROLES)
 *  - other staff assigned to a branch are locked to that branch (utils/branchScope)
 *  - students "in a branch" = own branch, enrolling user's branch or sales person's branch
 *    (collectionsPanelController)
 *  - ops_sub_admin sees enrollments of their assigned sales users + direct ones (dashboardController)
 *  - sales roles see their own / team enrollments (salesEnrollmentController)
 *  - center_admin sees their study center; university_admin their university
 *  - leave visibility follows hrController.getLeaveRequests
 *  - employees, students and faculty see only their own records
 * superadmin is excluded from AI reports.
 */
import prisma from '../../lib/prisma.js';

export const GLOBAL_ROLES = ['org_admin', 'ceo', 'general_manager'];
/** Roles allowed to use AI reports at all (checked on every AI request) */
export const AI_REPORT_ROLES = ['org_admin', 'ceo', 'general_manager'];
export const FINANCE_ROLES = ['finance_admin', 'finance_sub_admin', 'finance'];
export const OPS_ROLES = ['ops_admin', 'ops_sub_admin'];
export const HR_ROLES = ['hr_admin', 'hr_sub_admin'];
export const SALES_ROLES = ['sales_admin', 'sales_sub_admin', 'sales'];
export const COLLECTIONS_ROLES = ['collections_admin', 'collections'];
/** Roles that manage a team (mirrors DEPT_MANAGER_ROLES in hrController) */
export const MANAGER_ROLES = ['ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'sales_admin', 'sales_sub_admin', 'center_admin', 'collections_admin'];

export interface AccessContext {
  id: string;
  role: string;
  organizationId: string;
  isGlobal: boolean;
  isBranchManager: boolean;
  /** Branch the user is locked to (null = no branch restriction) */
  branchId: string | null;
  studyCenterId: string | null;
  departmentId: string | null;
  universityId: string | null;
  /** ops_sub_admin: sales users assigned to them */
  assignedSalesUsers: string[];
  /** sales roles: user ids whose enrollments/leads they may see (incl. self) */
  salesTeamIds: string[];
  /** student role: linked Student record */
  studentId: string | null;
  /** Human description of the restriction, given to the AI for "which branch is this?" questions */
  scopeLabel: string;
}

/**
 * Short form shown on report cards, e.g. "Only your branch (Chennai)".
 * Pass the dataset's scope so own-records-only datasets say so.
 */
export function accessLabel(c: AccessContext, scope?: Record<string, unknown> | null): string {
  const ownOnly = c.role === 'student' || (!!scope && (scope.employeeId === c.id || JSON.stringify(scope) === JSON.stringify({ id: c.id })));
  if (ownOnly) return 'Only your own records';
  const first = c.scopeLabel.split('. Staff records')[0].replace(/\btheir\b/g, 'your').replace(/\bthey\b/g, 'you');
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type ReqUser = {
  id: string; role: string; organizationId?: string | null; email?: string | null;
  branchId?: string | null; studyCenterId?: string | null; departmentId?: string | null;
  branch?: { name?: string } | null; studyCenter?: { name?: string } | null;
};

export async function buildContext(user: ReqUser): Promise<AccessContext> {
  if (!user || !AI_REPORT_ROLES.includes(user.role)) throw new AccessError(403, 'AI reports are only available to Org Admin, CEO and General Manager accounts');
  if (!user.organizationId) throw new AccessError(403, 'AI reports need an organization account');

  const isGlobal = GLOBAL_ROLES.includes(user.role);
  const ctx: AccessContext = {
    id: user.id,
    role: user.role,
    organizationId: user.organizationId,
    isGlobal,
    isBranchManager: user.role === 'branch_manager',
    branchId: null,
    studyCenterId: user.studyCenterId ?? null,
    departmentId: user.departmentId ?? null,
    universityId: null,
    assignedSalesUsers: [],
    salesTeamIds: [user.id],
    studentId: null,
    scopeLabel: '',
  };

  if (user.role === 'faculty') {
    ctx.scopeLabel = 'only their own classes, batches and students';
    return ctx;
  }

  // Branch managers manage a branch (role or Branch.branchManagerId, like authController's isBranchManager)
  const managed = !isGlobal && user.role !== 'student'
    ? await prisma.branch.findFirst({ where: { branchManagerId: user.id, organizationId: user.organizationId }, select: { id: true, name: true } })
    : null;
  if (managed) ctx.isBranchManager = true;
  if (!isGlobal) ctx.branchId = managed?.id ?? user.branchId ?? null;
  const branchName = managed?.name ?? user.branch?.name;

  if (user.role === 'student') {
    const student = await prisma.student.findFirst({
      where: { organizationId: user.organizationId, OR: [{ id: user.id }, ...(user.email ? [{ email: user.email }] : [])] },
      select: { id: true },
    });
    if (!student) throw new AccessError(403, 'No student record is linked to your account');
    ctx.studentId = student.id;
    ctx.branchId = null;
    ctx.scopeLabel = 'only their own records (fees, payments, attendance)';
    return ctx;
  }

  if (user.role === 'university_admin') {
    const u = await prisma.user.findUnique({ where: { id: user.id }, select: { universityId: true, university: { select: { name: true } } } });
    if (!u?.universityId) throw new AccessError(403, 'No university is linked to your account');
    ctx.universityId = u.universityId;
    ctx.scopeLabel = `only their university (${u.university?.name ?? 'linked university'})`;
    return ctx;
  }

  if (user.role === 'ops_sub_admin') {
    const u = await prisma.user.findUnique({ where: { id: user.id }, select: { assignedSalesUsers: true } });
    ctx.assignedSalesUsers = Array.isArray(u?.assignedSalesUsers) ? (u!.assignedSalesUsers as unknown[]).map(String) : [];
  }

  if (user.role === 'sales_admin' || user.role === 'sales_sub_admin') {
    // Same team definition as salesEnrollmentController.getSalesEnrollmentPipeline
    const roles = user.role === 'sales_admin' ? ['sales_sub_admin', 'sales', 'employee'] : ['sales', 'employee'];
    const team = await prisma.user.findMany({
      where: { organizationId: user.organizationId, role: { in: roles as never[] }, ...(ctx.branchId ? { branchId: ctx.branchId } : {}) },
      select: { id: true },
    });
    ctx.salesTeamIds = [user.id, ...team.map((t) => t.id)];
  }

  const parts: string[] = [];
  if (isGlobal) parts.push('the whole organization (all branches)');
  else if (user.role === 'center_admin') parts.push(`only their study center${user.studyCenter?.name ? ` (${user.studyCenter.name})` : ''}`);
  else if (ctx.branchId) parts.push(`only their branch${branchName ? ` (${branchName})` : ''}`);
  else parts.push('the organization');
  if (user.role === 'sales') parts.push('and only enrollments/leads they handle');
  if (user.role === 'sales_admin' || user.role === 'sales_sub_admin') parts.push("and their sales team's enrollments");
  if (user.role === 'ops_sub_admin') parts.push('and enrollments from their assigned sales users');
  if (!isGlobal) {
    const hrOrFinance = HR_ROLES.includes(user.role) || FINANCE_ROLES.includes(user.role);
    const manager = HR_ROLES.includes(user.role) || ctx.isBranchManager || MANAGER_ROLES.includes(user.role);
    parts.push(`. Staff records: attendance and leave requests of ${manager ? 'themselves and their team' : 'only themselves'}; ` +
      `payroll and expense claims of ${hrOrFinance ? 'staff in their scope' : 'only themselves (their own payslips/claims)'}`);
  }
  ctx.scopeLabel = parts.join(' ').replace(' .', '.');
  return ctx;
}

// ─── Reusable scope builders (return null = no access) ─────────────────────────

type Where = Record<string, unknown>;
const and = (...parts: (Where | null | undefined | false)[]): Where => ({ AND: parts.filter(Boolean) });

/** "Student belongs to branch" (collectionsPanelController) */
const studentInBranch = (branchId: string): Where => ({
  OR: [
    { branchId },
    { enrolledByUser: { branchId } },
    { enrollments: { some: { salesUser: { branchId } } } },
  ],
});

/** Faculty teaches a batch (facultyPortalController) */
const facultyBatch = (facultyId: string): Where => ({
  OR: [{ academicSessions: { some: { facultyId } } }, { lessonAssignments: { some: { facultyId } } }],
});

/** Students the user may see */
export function studentScope(c: AccessContext): Where | null {
  const org = { organizationId: c.organizationId };
  if (c.isGlobal) return org;
  if (c.role === 'student') return { id: c.studentId };
  if (c.role === 'faculty') return and(org, { academicBatch: facultyBatch(c.id) });
  if (c.role === 'university_admin') return and(org, { OR: [{ universityId: c.universityId }, { program: { universityId: c.universityId } }] });
  if (c.role === 'center_admin') return c.studyCenterId ? and(org, { centerId: c.studyCenterId }) : null;
  const branch = c.branchId ? studentInBranch(c.branchId) : null;
  if (SALES_ROLES.includes(c.role)) {
    const ids = c.salesTeamIds;
    return and(org, branch, { OR: [{ enrolledBy: { in: ids } }, { referredBy: { in: ids } }, { enrollments: { some: { salesUserId: { in: ids } } } }] });
  }
  if (c.role === 'ops_sub_admin') {
    const ids = c.assignedSalesUsers;
    return and(org, { OR: [{ enrolledBy: null }, { referredBy: null }, { enrolledBy: { in: ids } }, { referredBy: { in: ids } }] });
  }
  if ([...OPS_ROLES, ...FINANCE_ROLES, ...COLLECTIONS_ROLES].includes(c.role) || c.isBranchManager) return and(org, branch);
  return null;
}

/** Enrollments the user may see */
export function enrollmentScope(c: AccessContext): Where | null {
  const org = { organizationId: c.organizationId };
  if (c.isGlobal) return org;
  if (c.role === 'student') return { studentId: c.studentId };
  if (c.role === 'university_admin') return and(org, { program: { universityId: c.universityId } });
  if (c.role === 'center_admin') return c.studyCenterId ? and(org, { studyCenterId: c.studyCenterId }) : null;
  const branch = c.branchId ? { OR: [{ student: { branchId: c.branchId } }, { salesUser: { branchId: c.branchId } }] } : null;
  if (SALES_ROLES.includes(c.role)) return and(org, { salesUserId: { in: c.salesTeamIds } });
  if (c.role === 'ops_sub_admin') return and(org, { OR: [{ salesUserId: null }, { salesUserId: { in: c.assignedSalesUsers } }] });
  if (c.role === 'ops_admin') {
    // ops also review study-center enrollments across branches (enrollmentReviewController)
    return and(org, c.branchId ? { OR: [{ student: { branchId: c.branchId } }, { salesUser: { branchId: c.branchId } }, { studyCenterId: { not: null } }] } : null);
  }
  if ([...FINANCE_ROLES, ...COLLECTIONS_ROLES].includes(c.role) || c.isBranchManager) return and(org, branch);
  return null;
}

/** Staff (users) whose HR records the user may see; `self` = own records only */
export function staffScope(c: AccessContext): Where | null {
  const org = { organizationId: c.organizationId, role: { notIn: ['student', 'superadmin'] } };
  if (c.role === 'student' || c.role === 'faculty' || c.role === 'university_admin') return null;
  if (c.isGlobal) return org;
  if (HR_ROLES.includes(c.role)) return and(org, { role: { notIn: ['student', 'superadmin', 'center_admin'] } }, c.branchId ? { branchId: c.branchId } : null);
  if (c.isBranchManager && c.branchId) return and(org, { branchId: c.branchId });
  if (MANAGER_ROLES.includes(c.role)) {
    return and(org, {
      OR: [
        { id: c.id },
        { reportingTo: c.id },
        { department: { managerId: c.id } },
        { subDepartment: { managerId: c.id } },
        ...(c.departmentId ? [{ departmentId: c.departmentId }] : []),
      ],
    });
  }
  return { id: c.id };
}

