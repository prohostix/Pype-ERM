/**
 * AI Reports: the dataset list.
 *
 * This file is the ONLY place that decides what the AI report builder may read.
 * The AI sees these descriptions (never the database), and every spec it returns
 * is checked against them in compiler.ts.
 *
 * Access: each dataset's `scope(ctx)` returns the Prisma `where` that limits rows
 * to what this user may see (see access.ts), or null when the role has no access.
 * The server always ANDs that scope into the query, so the AI or the browser can
 * never widen it. `panels` only decides which datasets are offered in which panel.
 *
 * Sensitive columns (phone, email, address, bank details, passwords) are never listed.
 */
import {
  type AccessContext, FINANCE_ROLES, HR_ROLES, COLLECTIONS_ROLES, SALES_ROLES,
  enrollmentScope, staffScope, studentScope,
} from './access.js';
import { staffDayRows } from './attendanceDay.js';

export type FieldType = 'number' | 'string' | 'date' | 'enum' | 'boolean';

export interface FieldDef {
  label: string;
  type: FieldType;
  /** Prisma path from the dataset's model, e.g. ['enrollment', 'program', 'name'] */
  path: string[];
  /** Allowed values for enum fields (enforced) */
  values?: string[];
  /** Known values for free-text status fields (hint for the AI only) */
  hints?: string[];
  /** Can be summed / averaged */
  aggregatable?: boolean;
  /** Can be used in groupBy (dates are grouped through timeBucket instead) */
  groupable?: boolean;
  /** Date field that also has a meaningful time of day (check-in/out) */
  time?: boolean;
}

type Where = Record<string, unknown>;

export interface DatasetDef {
  label: string;
  description: string;
  /** Prisma client delegate name, e.g. 'enrollmentPayment' */
  model: string;
  /** Panels where this dataset is offered (UX only — access is decided by scope) */
  panels: string[];
  defaultDateField: string;
  fields: Record<string, FieldDef>;
  /** Row restriction for this user, or null = no access */
  scope: (ctx: AccessContext) => Where | null;
  /** How this model links to its organization (default: its own organizationId column).
   *  Always ANDed into every query as a second, independent organization lock. */
  orgLock?: (organizationId: string) => Where;
  /**
   * Computed dataset: rows are built in code (not one table) for the date range in the
   * spec, already restricted to `scope`. Filters and grouping then run in memory.
   */
  virtual?: (ctx: AccessContext, range: { from: Date; to: Date }, scope: Where) => Promise<Record<string, unknown>[]>;
  /** Max days a virtual dataset may cover in one report */
  maxDays?: number;
  /** Rows left out of percent_if denominators (e.g. holidays and week-offs aren't working days) */
  excludeFromPercent?: { field: string; values: string[] };
  /** Friendly names for common value groups in count_if / percent_if columns */
  valueSetLabels?: Record<string, string[]>;
}

const isFinance = (c: AccessContext) => c.isGlobal || FINANCE_ROLES.includes(c.role);
const org = (c: AccessContext) => ({ organizationId: c.organizationId });
const and = (...parts: (Where | null | undefined | false)[]): Where => ({ AND: parts.filter(Boolean) });
const wrap = (key: string, w: Where | null): Where | null => (w ? { [key]: w } : null);
/** Staff datasets keyed by a user relation: managers see their scope, everyone else their own rows */
const staffRows = (c: AccessContext, userKey: string, ownKey: string): Where | null => {
  const s = staffScope(c);
  if (!s) return null;
  return 'id' in s && Object.keys(s).length === 1 ? { [ownKey]: c.id, organizationId: c.organizationId } : and(org(c), { [userKey]: s });
};

const ALL = ['org_admin', 'ceo'];
const ENROLLMENT_STATUS_HINTS = [
  'payment_pending', 'receipt_submitted', 'document_review', 'finance_review', 'university_review', 'enrolled', 'rejected',
  'ops_rejected', 'ops_upgrade_verification', 'provisional_finance_pending', 'provisional_finance_verified', 'provisional_finance_rejected',
];
const STAFF_ROLE_VALUES = [
  'org_admin', 'ceo', 'general_manager', 'branch_manager', 'ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'finance',
  'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin', 'sales', 'collections_admin', 'collections', 'center_admin', 'university_admin', 'employee',
];

export const DATASETS: Record<string, DatasetDef> = {
  // ─── Finance ────────────────────────────────────────────────────────────────
  enrollment_payments: {
    label: 'Enrollment payments',
    description: 'Fee amounts debited from study center wallets when a student enrollment is paid. Use for "fee collection", "revenue from enrollments", "payments received".',
    model: 'enrollmentPayment',
    orgLock: (organizationId) => ({ enrollment: { organizationId } }), // table has no organizationId column
    panels: [...ALL, 'finance', 'collections', 'center', 'branch', 'student'],
    defaultDateField: 'paidOn',
    fields: {
      amount:      { label: 'Amount', type: 'number', path: ['amount'], aggregatable: true },
      paidOn:      { label: 'Paid on', type: 'date', path: ['debitedAt'] },
      studyCenter: { label: 'Study center', type: 'string', path: ['studyCenter', 'name'], groupable: true },
      program:     { label: 'Program', type: 'string', path: ['enrollment', 'program', 'name'], groupable: true },
      university:  { label: 'University', type: 'string', path: ['enrollment', 'program', 'university', 'name'], groupable: true },
      branch:      { label: 'Branch (sales person)', type: 'string', path: ['enrollment', 'salesUser', 'branch', 'name'], groupable: true },
      studentName: { label: 'Student', type: 'string', path: ['enrollment', 'studentName'] },
    },
    scope: (c) => (isFinance(c) || COLLECTIONS_ROLES.includes(c.role) || c.isBranchManager || c.role === 'center_admin' || c.role === 'student'
      ? wrap('enrollment', enrollmentScope(c)) : null),
  },

  wallet_topups: {
    label: 'Wallet top-ups',
    description: 'Money study centers add to their wallet, with verification status.',
    model: 'walletTopUp',
    panels: [...ALL, 'finance', 'center'],
    defaultDateField: 'createdAt',
    fields: {
      amount:        { label: 'Amount', type: 'number', path: ['amount'], aggregatable: true },
      status:        { label: 'Status', type: 'enum', path: ['status'], values: ['pending', 'approved', 'rejected'], groupable: true },
      paymentMethod: { label: 'Payment method', type: 'string', path: ['paymentMethod'], groupable: true },
      createdAt:     { label: 'Requested on', type: 'date', path: ['createdAt'] },
      verifiedAt:    { label: 'Verified on', type: 'date', path: ['verifiedAt'] },
      studyCenter:   { label: 'Study center', type: 'string', path: ['studyCenter', 'name'], groupable: true },
    },
    scope: (c) => (isFinance(c) ? org(c)
      : c.role === 'center_admin' && c.studyCenterId ? and(org(c), { studyCenterId: c.studyCenterId }) : null),
  },

  invoices: {
    label: 'Invoices',
    description: 'Invoices raised to study centers or students, with amount, tax, total and payment status.',
    model: 'invoice',
    panels: [...ALL, 'finance', 'collections', 'center', 'student'],
    defaultDateField: 'createdAt',
    fields: {
      invoiceNo:   { label: 'Invoice no.', type: 'string', path: ['invoiceNo'] },
      amount:      { label: 'Amount', type: 'number', path: ['amount'], aggregatable: true },
      tax:         { label: 'Tax', type: 'number', path: ['tax'], aggregatable: true },
      total:       { label: 'Total', type: 'number', path: ['total'], aggregatable: true },
      status:      { label: 'Status', type: 'string', path: ['status'], groupable: true, hints: ['draft', 'pending_payment', 'approved', 'paid'] },
      createdAt:   { label: 'Created on', type: 'date', path: ['createdAt'] },
      dueDate:     { label: 'Due date', type: 'date', path: ['dueDate'] },
      paidAt:      { label: 'Paid on', type: 'date', path: ['paidAt'] },
      studyCenter: { label: 'Study center', type: 'string', path: ['center', 'name'], groupable: true },
      studentName: { label: 'Student', type: 'string', path: ['student', 'name'] },
    },
    scope: (c) => {
      if (c.role === 'student') return { studentId: c.studentId };
      if (c.role === 'center_admin') return c.studyCenterId ? and(org(c), { centerId: c.studyCenterId }) : null;
      if (!isFinance(c) && !COLLECTIONS_ROLES.includes(c.role)) return null;
      const s = studentScope(c);
      return c.isGlobal || !c.branchId ? org(c) : and(org(c), { OR: [{ student: s }, { studentId: null }] });
    },
  },

  payment_entries: {
    label: 'Invoice payments',
    description: 'Payments recorded against invoices (method, who received it, when).',
    model: 'paymentEntry',
    panels: [...ALL, 'finance'],
    defaultDateField: 'receivedAt',
    fields: {
      amount:     { label: 'Amount', type: 'number', path: ['amount'], aggregatable: true },
      method:     { label: 'Method', type: 'string', path: ['method'], groupable: true },
      receivedAt: { label: 'Received on', type: 'date', path: ['receivedAt'] },
      receivedBy: { label: 'Received by', type: 'string', path: ['receiver', 'name'], groupable: true },
      invoiceNo:  { label: 'Invoice no.', type: 'string', path: ['invoice', 'invoiceNo'] },
    },
    scope: (c) => (isFinance(c) ? and(org(c), c.branchId ? { receiver: { branchId: c.branchId } } : null) : null),
  },

  university_payments: {
    label: 'University payments',
    description: 'Fees paid to universities on behalf of students.',
    model: 'universityPayment',
    panels: [...ALL, 'finance', 'ops', 'staff'],
    defaultDateField: 'datePaid',
    fields: {
      amountPaid: { label: 'Amount paid', type: 'number', path: ['amountPaid'], aggregatable: true },
      datePaid:   { label: 'Paid on', type: 'date', path: ['datePaid'] },
      status:     { label: 'Status', type: 'string', path: ['status'], groupable: true },
      university: { label: 'University', type: 'string', path: ['university', 'name'], groupable: true },
    },
    scope: (c) => {
      if (c.role === 'university_admin') return and(org(c), { universityId: c.universityId });
      if (isFinance(c) || c.role === 'ops_admin') return and(org(c), c.branchId ? { student: studentScope(c) } : null);
      return null;
    },
  },

  payment_schedules: {
    label: 'Fee schedules (dues)',
    description: 'Student fee instalments: amount due, due date, paid or pending. Use for "pending fees", "overdue", "dues this month", "collected vs due".',
    model: 'paymentSchedule',
    panels: [...ALL, 'finance', 'collections', 'center', 'branch', 'student'],
    defaultDateField: 'dueDate',
    fields: {
      title:       { label: 'Fee', type: 'string', path: ['title'], groupable: true },
      amount:      { label: 'Amount', type: 'number', path: ['amount'], aggregatable: true },
      dueDate:     { label: 'Due date', type: 'date', path: ['dueDate'] },
      status:      { label: 'Status', type: 'string', path: ['status'], groupable: true, hints: ['pending', 'paid', 'overdue', 'partial'] },
      paidAt:      { label: 'Paid on', type: 'date', path: ['paidAt'] },
      isExtraFee:  { label: 'Extra fee', type: 'boolean', path: ['isExtraFee'], groupable: true },
      studentName: { label: 'Student', type: 'string', path: ['student', 'name'] },
      program:     { label: 'Program', type: 'string', path: ['student', 'program', 'name'], groupable: true },
      studyCenter: { label: 'Study center', type: 'string', path: ['student', 'center', 'name'], groupable: true },
      branch:      { label: 'Branch', type: 'string', path: ['student', 'branch', 'name'], groupable: true },
    },
    scope: (c) => {
      if (c.role === 'student') return { studentId: c.studentId };
      if (isFinance(c) || COLLECTIONS_ROLES.includes(c.role) || c.isBranchManager || c.role === 'center_admin') return and(org(c), wrap('student', studentScope(c)));
      return null;
    },
  },

  // ─── Students & admissions ──────────────────────────────────────────────────
  enrollments: {
    label: 'Enrollments',
    description: 'Student admission/enrollment applications and their review status. Use for "admissions", "enrollment count", "students enrolled", "pending verifications".',
    model: 'enrollment',
    panels: [...ALL, 'finance', 'ops', 'sales', 'center', 'branch', 'staff', 'student'],
    defaultDateField: 'createdAt',
    fields: {
      status:               { label: 'Status', type: 'string', path: ['status'], groupable: true, hints: ENROLLMENT_STATUS_HINTS },
      createdAt:            { label: 'Applied on', type: 'date', path: ['createdAt'] },
      enrolledAt:           { label: 'Enrolled on', type: 'date', path: ['enrolledAt'] },
      program:              { label: 'Program', type: 'string', path: ['program', 'name'], groupable: true },
      university:           { label: 'University', type: 'string', path: ['program', 'university', 'name'], groupable: true },
      studyCenter:          { label: 'Study center', type: 'string', path: ['studyCenter', 'name'], groupable: true },
      salesPerson:          { label: 'Sales person', type: 'string', path: ['salesUser', 'name'], groupable: true },
      branch:               { label: 'Branch (sales person)', type: 'string', path: ['salesUser', 'branch', 'name'], groupable: true },
      session:              { label: 'Admission session', type: 'string', path: ['session', 'name'], groupable: true },
      gender:               { label: 'Gender', type: 'string', path: ['gender'], groupable: true },
      category:             { label: 'Category', type: 'string', path: ['category'], groupable: true },
      paymentPlan:          { label: 'Payment plan', type: 'string', path: ['paymentPlan'], groupable: true },
      isProvisional:        { label: 'Provisional', type: 'boolean', path: ['isProvisional'], groupable: true },
      receiptVerified:      { label: 'Receipt verified', type: 'boolean', path: ['receiptVerified'], groupable: true },
      initialPaymentAmount: { label: 'Initial payment', type: 'number', path: ['initialPaymentAmount'], aggregatable: true },
      studentName:          { label: 'Student', type: 'string', path: ['studentName'] },
      enrollmentNumber:     { label: 'Enrollment no.', type: 'string', path: ['enrollmentNumber'] },
    },
    scope: enrollmentScope,
  },

  students: {
    label: 'Students',
    description: 'Admitted students with program, university, study center, branch and status.',
    model: 'student',
    panels: [...ALL, 'finance', 'ops', 'sales', 'collections', 'center', 'branch', 'staff', 'faculty'],
    defaultDateField: 'createdAt',
    fields: {
      status:        { label: 'Status', type: 'string', path: ['status'], groupable: true, hints: ['pending', 'active', 'completed', 'dropped'] },
      program:       { label: 'Program', type: 'string', path: ['program', 'name'], groupable: true },
      university:    { label: 'University', type: 'string', path: ['program', 'university', 'name'], groupable: true },
      studyCenter:   { label: 'Study center', type: 'string', path: ['center', 'name'], groupable: true },
      branch:        { label: 'Branch', type: 'string', path: ['branch', 'name'], groupable: true },
      session:       { label: 'Admission session', type: 'string', path: ['session', 'name'], groupable: true },
      batch:         { label: 'Batch', type: 'string', path: ['academicBatch', 'name'], groupable: true },
      gender:        { label: 'Gender', type: 'string', path: ['gender'], groupable: true },
      category:      { label: 'Category', type: 'string', path: ['category'], groupable: true },
      isPrevious:    { label: 'Previous student', type: 'boolean', path: ['isPrevious'], groupable: true },
      joinDate:      { label: 'Joined on', type: 'date', path: ['joinDate'] },
      admissionDate: { label: 'Admission date', type: 'date', path: ['admissionDate'] },
      createdAt:     { label: 'Created on', type: 'date', path: ['createdAt'] },
      name:          { label: 'Student', type: 'string', path: ['name'] },
      enrollmentNo:  { label: 'Enrollment no.', type: 'string', path: ['enrollmentNo'] },
    },
    scope: studentScope,
  },

  student_attendance: {
    label: 'Class attendance (students)',
    description: 'Student attendance in live academic class sessions, by class, batch and faculty.',
    model: 'studentAcademicAttendance',
    panels: [...ALL, 'ops', 'center', 'branch', 'faculty', 'student'],
    defaultDateField: 'date',
    fields: {
      status:  { label: 'Status', type: 'enum', path: ['status'], values: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'], groupable: true },
      date:    { label: 'Class date', type: 'date', path: ['session', 'startTime'] },
      class:   { label: 'Class', type: 'string', path: ['session', 'academicClass', 'name'], groupable: true },
      batch:   { label: 'Batch', type: 'string', path: ['session', 'academicBatch', 'name'], groupable: true },
      lesson:  { label: 'Lesson', type: 'string', path: ['session', 'moduleLesson', 'title'], groupable: true },
      faculty: { label: 'Faculty', type: 'string', path: ['session', 'faculty', 'name'], groupable: true },
      student: { label: 'Student', type: 'string', path: ['student', 'name'], groupable: true },
      rating:  { label: 'Rating', type: 'number', path: ['rating'], aggregatable: true },
    },
    scope: (c) => {
      if (c.role === 'faculty') return and(org(c), { session: { facultyId: c.id } });
      if (c.role === 'student') return { studentId: c.studentId };
      if (c.isGlobal || c.role === 'ops_admin' || c.role === 'ops_sub_admin' || c.role === 'center_admin' || c.isBranchManager) return and(org(c), wrap('student', studentScope(c)));
      return null;
    },
  },

  // ─── Sales ──────────────────────────────────────────────────────────────────
  leads: {
    label: 'Leads',
    description: 'Study center / partner leads with source and status. Use for "lead conversion", "leads by source".',
    model: 'lead',
    panels: [...ALL, 'sales', 'branch'],
    defaultDateField: 'createdAt',
    fields: {
      status:      { label: 'Status', type: 'string', path: ['status'], groupable: true, hints: ['new', 'contacted', 'qualified', 'converted', 'lost'] },
      source:      { label: 'Source', type: 'string', path: ['source'], groupable: true },
      referredBy:  { label: 'Sales person', type: 'string', path: ['referrer', 'name'], groupable: true },
      createdAt:   { label: 'Created on', type: 'date', path: ['createdAt'] },
      convertedAt: { label: 'Converted on', type: 'date', path: ['convertedAt'] },
      centerName:  { label: 'Center name', type: 'string', path: ['centerName'] },
      contactName: { label: 'Contact', type: 'string', path: ['contactName'] },
    },
    scope: (c) => {
      if (c.isGlobal) return org(c);
      if (SALES_ROLES.includes(c.role)) return and(org(c), { referredBy: { in: c.salesTeamIds } });
      if (c.isBranchManager && c.branchId) return and(org(c), { referrer: { branchId: c.branchId } });
      return null;
    },
  },

  targets: {
    label: 'Targets',
    description: 'Sales / collection / finance targets with achieved amount and incentive.',
    model: 'target',
    panels: [...ALL, 'sales', 'collections', 'finance', 'employee'],
    defaultDateField: 'createdAt',
    fields: {
      type:      { label: 'Type', type: 'string', path: ['type'], groupable: true },
      period:    { label: 'Period', type: 'string', path: ['period'], groupable: true },
      target:    { label: 'Target', type: 'number', path: ['target'], aggregatable: true },
      achieved:  { label: 'Achieved', type: 'number', path: ['achieved'], aggregatable: true },
      incentive: { label: 'Incentive', type: 'number', path: ['incentive'], aggregatable: true },
      status:    { label: 'Status', type: 'string', path: ['status'], groupable: true },
      employee:  { label: 'Employee', type: 'string', path: ['employee', 'name'], groupable: true },
      department:{ label: 'Department', type: 'string', path: ['department', 'name'], groupable: true },
      deadline:  { label: 'Deadline', type: 'date', path: ['deadline'] },
      createdAt: { label: 'Created on', type: 'date', path: ['createdAt'] },
    },
    // Same visibility as salesController.getTargets
    scope: (c) => {
      if (['student', 'faculty', 'university_admin'].includes(c.role)) return null;
      const canManage = c.isGlobal || ['sales_admin', 'sales_sub_admin', 'finance_admin', 'finance_sub_admin'].includes(c.role);
      return canManage ? org(c) : and(org(c), { OR: [{ employeeId: c.id }, ...(c.departmentId ? [{ departmentId: c.departmentId }] : [])] });
    },
  },

  // ─── HR & staff ─────────────────────────────────────────────────────────────
  employees: {
    label: 'Employees',
    description: 'Staff members by department, branch, role and status (no salary or contact details).',
    model: 'user',
    panels: [...ALL, 'hr', 'branch'],
    defaultDateField: 'createdAt',
    fields: {
      role:          { label: 'Role', type: 'enum', path: ['role'], values: STAFF_ROLE_VALUES, groupable: true },
      status:        { label: 'Status', type: 'enum', path: ['status'], values: ['active', 'inactive', 'on_leave', 'resigned'], groupable: true },
      department:    { label: 'Department', type: 'string', path: ['department', 'name'], groupable: true },
      subDepartment: { label: 'Sub-department', type: 'string', path: ['subDepartment', 'name'], groupable: true },
      branch:        { label: 'Branch', type: 'string', path: ['branch', 'name'], groupable: true },
      designation:   { label: 'Designation', type: 'string', path: ['designation'], groupable: true },
      createdAt:     { label: 'Joined on', type: 'date', path: ['createdAt'] },
      name:          { label: 'Employee', type: 'string', path: ['name'] },
    },
    scope: (c) => (c.isGlobal || HR_ROLES.includes(c.role) || c.isBranchManager ? staffScope(c) : null),
  },

  attendance: {
    label: 'Staff attendance (recorded)',
    description: 'Recorded staff attendance rows (punch-ins, plus "absent" rows the system adds each night). Use staff_day_status instead for today, for "who is absent", or for per-employee present/absent counts.',
    model: 'attendance',
    panels: [...ALL, 'hr', 'branch', ...PERSONAL_PANELS()],
    defaultDateField: 'date',
    fields: {
      status:       { label: 'Status', type: 'enum', path: ['status'], values: ['present', 'absent', 'half_day', 'leave', 'late', 'wfh'], groupable: true },
      date:         { label: 'Date', type: 'date', path: ['date'] },
      isLate:       { label: 'Late', type: 'boolean', path: ['isLate'], groupable: true },
      lateMinutes:  { label: 'Late minutes', type: 'number', path: ['lateMinutes'], aggregatable: true },
      workingHours: { label: 'Working hours', type: 'number', path: ['workingHours'], aggregatable: true },
      employee:     { label: 'Employee', type: 'string', path: ['user', 'name'], groupable: true },
      employeeCode: { label: 'Employee ID', type: 'string', path: ['user', 'userId'] },
      designation:  { label: 'Designation', type: 'string', path: ['user', 'designation'], groupable: true },
      department:   { label: 'Department', type: 'string', path: ['user', 'department', 'name'], groupable: true },
      branch:       { label: 'Branch', type: 'string', path: ['user', 'branch', 'name'], groupable: true },
      checkIn:      { label: 'Check-in', type: 'date', time: true, path: ['checkIn'] },
      checkOut:     { label: 'Check-out', type: 'date', time: true, path: ['checkOut'] },
      earlyExit:    { label: 'Early exit', type: 'boolean', path: ['isEarlyExit'], groupable: true },
      earlyExitMinutes: { label: 'Early exit minutes', type: 'number', path: ['earlyExitMinutes'], aggregatable: true },
    },
    scope: (c) => staffRows(c, 'user', 'employeeId'),
  },

  staff_day_status: {
    label: 'Daily staff attendance (incl. today)',
    description: 'One row per employee per day with that day\'s status, INCLUDING TODAY and people who have not punched in (absent). Use for: "who is absent/present today", "absent list", attendance per employee (present days, absent days, leave days, late days, attendance %), department/branch attendance. "Present" = present, late, half_day or wfh. Holidays and week-offs are marked, not counted as absent. Max 62 days per report.',
    model: 'user',
    panels: [...ALL, 'hr', 'branch', ...PERSONAL_PANELS()],
    defaultDateField: 'date',
    maxDays: 62,
    // Attendance % = present days ÷ working days
    excludeFromPercent: { field: 'status', values: ['holiday', 'week_off'] },
    valueSetLabels: { Present: ['present', 'late', 'half_day', 'wfh'], 'Holiday / week off': ['holiday', 'week_off'] },
    fields: {
      date:         { label: 'Date', type: 'date', path: ['date'] },
      status:       { label: 'Status', type: 'enum', path: ['status'], values: ['present', 'late', 'half_day', 'wfh', 'leave', 'absent', 'holiday', 'week_off'], groupable: true },
      present:      { label: 'Present', type: 'boolean', path: ['present'], groupable: true },
      employee:     { label: 'Employee', type: 'string', path: ['employee'], groupable: true },
      employeeCode: { label: 'Employee ID', type: 'string', path: ['employeeCode'] },
      department:   { label: 'Department', type: 'string', path: ['department'], groupable: true },
      branch:       { label: 'Branch', type: 'string', path: ['branch'], groupable: true },
      designation:  { label: 'Designation', type: 'string', path: ['designation'], groupable: true },
      checkIn:      { label: 'Check-in', type: 'date', time: true, path: ['checkIn'] },
      checkOut:     { label: 'Check-out', type: 'date', time: true, path: ['checkOut'] },
      isLate:       { label: 'Late', type: 'boolean', path: ['isLate'], groupable: true },
      lateMinutes:  { label: 'Late minutes', type: 'number', path: ['lateMinutes'], aggregatable: true },
      workingHours: { label: 'Working hours', type: 'number', path: ['workingHours'], aggregatable: true },
      earlyExit:    { label: 'Early exit', type: 'boolean', path: ['earlyExit'], groupable: true },
      leaveType:    { label: 'Leave type', type: 'string', path: ['leaveType'], groupable: true },
    },
    // Rows are employees (User) within this user's staff scope
    scope: (c) => staffScope(c),
    virtual: (c, range, scope) => staffDayRows(c, range, scope),
  },

  leave_requests: {
    label: 'Leave requests',
    description: 'Staff leave requests by type and approval status.',
    model: 'leaveRequest',
    panels: [...ALL, 'hr', 'branch', ...PERSONAL_PANELS()],
    defaultDateField: 'startDate',
    fields: {
      type:       { label: 'Leave type', type: 'enum', path: ['type'], values: ['sick', 'casual', 'earned', 'unpaid', 'wfh', 'late_coming', 'early_exit'], groupable: true },
      status:     { label: 'Status', type: 'enum', path: ['status'], values: ['pending', 'dept_approved', 'approved', 'rejected', 'withdraw_pending', 'withdrawn'], groupable: true },
      startDate:  { label: 'From', type: 'date', path: ['startDate'] },
      endDate:    { label: 'To', type: 'date', path: ['endDate'] },
      appliedAt:  { label: 'Applied on', type: 'date', path: ['appliedAt'] },
      isHalfDay:  { label: 'Half day', type: 'boolean', path: ['isHalfDay'], groupable: true },
      employee:   { label: 'Employee', type: 'string', path: ['user', 'name'], groupable: true },
      department: { label: 'Department', type: 'string', path: ['user', 'department', 'name'], groupable: true },
      branch:     { label: 'Branch', type: 'string', path: ['user', 'branch', 'name'], groupable: true },
    },
    scope: (c) => staffRows(c, 'user', 'employeeId'),
  },

  tasks: {
    label: 'Tasks',
    description: 'Tasks with status, priority, deadline and assignee.',
    model: 'task',
    panels: [...ALL, 'hr', 'branch', ...PERSONAL_PANELS()],
    defaultDateField: 'createdAt',
    fields: {
      status:      { label: 'Status', type: 'enum', path: ['status'], values: ['pending', 'in_progress', 'completed', 'overdue'], groupable: true },
      priority:    { label: 'Priority', type: 'enum', path: ['priority'], values: ['low', 'medium', 'high', 'critical'], groupable: true },
      deadline:    { label: 'Deadline', type: 'date', path: ['deadline'] },
      completedAt: { label: 'Completed on', type: 'date', path: ['completedAt'] },
      createdAt:   { label: 'Created on', type: 'date', path: ['createdAt'] },
      assignee:    { label: 'Assignee', type: 'string', path: ['assignee', 'name'], groupable: true },
      assigner:    { label: 'Assigned by', type: 'string', path: ['assigner', 'name'], groupable: true },
      department:  { label: 'Department', type: 'string', path: ['department', 'name'], groupable: true },
      title:       { label: 'Task', type: 'string', path: ['title'] },
    },
    scope: (c) => {
      const s = staffScope(c);
      if (!s) return null;
      if (c.isGlobal) return org(c);
      return and(org(c), { OR: [{ createdBy: c.id }, { assignee: s }] });
    },
  },

  payroll: {
    label: 'Payroll',
    description: 'Monthly payroll: gross and net salary, bonus, status. Employees see only their own payslips.',
    model: 'payroll',
    panels: [...ALL, 'finance', 'hr', ...PERSONAL_PANELS()],
    defaultDateField: 'createdAt',
    fields: {
      month:       { label: 'Month', type: 'string', path: ['month'], groupable: true },
      grossSalary: { label: 'Gross salary', type: 'number', path: ['grossSalary'], aggregatable: true },
      netSalary:   { label: 'Net salary', type: 'number', path: ['netSalary'], aggregatable: true },
      bonus:       { label: 'Bonus', type: 'number', path: ['bonus'], aggregatable: true },
      status:      { label: 'Status', type: 'enum', path: ['status'], values: ['draft', 'processed', 'confirmed', 'transferred_to_finance', 'paid'], groupable: true },
      paymentDate: { label: 'Paid on', type: 'date', path: ['paymentDate'] },
      createdAt:   { label: 'Created on', type: 'date', path: ['createdAt'] },
      employee:    { label: 'Employee', type: 'string', path: ['user', 'name'], groupable: true },
      department:  { label: 'Department', type: 'string', path: ['user', 'department', 'name'], groupable: true },
      branch:      { label: 'Branch', type: 'string', path: ['user', 'branch', 'name'], groupable: true },
    },
    // Same as utils/payrollScope for finance/HR (org + branch); everyone else only their own payroll
    scope: (c) => {
      if (['student', 'faculty', 'university_admin'].includes(c.role)) return null;
      if (c.isGlobal) return org(c);
      if (FINANCE_ROLES.includes(c.role) || HR_ROLES.includes(c.role)) return and(org(c), c.branchId ? { user: { branchId: c.branchId } } : null);
      return { employeeId: c.id, organizationId: c.organizationId };
    },
  },

  expense_claims: {
    label: 'Expense claims',
    description: 'Employee expense claims with category and approval status.',
    model: 'expenseClaim',
    panels: [...ALL, 'finance', 'hr', ...PERSONAL_PANELS()],
    defaultDateField: 'submittedAt',
    fields: {
      amount:      { label: 'Amount', type: 'number', path: ['amount'], aggregatable: true },
      category:    { label: 'Category', type: 'string', path: ['category'], groupable: true },
      status:      { label: 'Status', type: 'enum', path: ['status'], values: ['pending', 'approved', 'rejected', 'reimbursed'], groupable: true },
      submittedAt: { label: 'Submitted on', type: 'date', path: ['submittedAt'] },
      approvedAt:  { label: 'Approved on', type: 'date', path: ['approvedAt'] },
      employee:    { label: 'Employee', type: 'string', path: ['user', 'name'], groupable: true },
      department:  { label: 'Department', type: 'string', path: ['user', 'department', 'name'], groupable: true },
      description: { label: 'Description', type: 'string', path: ['description'] },
    },
    scope: (c) => {
      if (['student', 'faculty', 'university_admin'].includes(c.role)) return null;
      if (c.isGlobal) return org(c);
      if (FINANCE_ROLES.includes(c.role) || HR_ROLES.includes(c.role)) return and(org(c), c.branchId ? { user: { branchId: c.branchId } } : null);
      return { employeeId: c.id, organizationId: c.organizationId };
    },
  },

  complaints: {
    label: 'Complaints',
    description: 'Staff complaints / grievances by category, priority and status.',
    model: 'complaint',
    panels: [...ALL, 'hr', ...PERSONAL_PANELS()],
    defaultDateField: 'submittedAt',
    fields: {
      category:    { label: 'Category', type: 'string', path: ['category'], groupable: true },
      status:      { label: 'Status', type: 'enum', path: ['status'], values: ['open', 'in_progress', 'resolved', 'closed'], groupable: true },
      priority:    { label: 'Priority', type: 'string', path: ['priority'], groupable: true },
      submittedAt: { label: 'Submitted on', type: 'date', path: ['submittedAt'] },
      resolvedAt:  { label: 'Resolved on', type: 'date', path: ['resolvedAt'] },
      employee:    { label: 'Employee', type: 'string', path: ['user', 'name'], groupable: true },
      subject:     { label: 'Subject', type: 'string', path: ['subject'] },
    },
    scope: (c) => {
      if (['student', 'faculty', 'university_admin'].includes(c.role)) return null;
      if (c.isGlobal) return org(c);
      if (HR_ROLES.includes(c.role)) return and(org(c), c.branchId ? { user: { branchId: c.branchId } } : null);
      return { employeeId: c.id, organizationId: c.organizationId };
    },
  },
};

/** Staff panels that show "my attendance / leaves / payslips" etc. */
function PERSONAL_PANELS() {
  return ['finance', 'ops', 'hr', 'sales', 'collections', 'center', 'branch', 'employee', 'staff'];
}

/** Suggested questions shown in the UI, per panel */
export const SUGGESTIONS: Record<string, string[]> = {
  org_admin: ['Who is absent today?', 'Attendance per employee this month (present, absent, leave, late)', 'Enrollments by status this month', 'Fee collection by branch this year', 'Monthly enrollment payments this financial year', 'Employees by department', 'Pending fee dues by study center', 'Leave requests by status this month'],
  ceo: ['Who is absent today?', 'Attendance % by department this month', 'Monthly enrollment payments this financial year', 'Enrollments by university this year', 'Fee collection by branch this quarter', 'Overdue fee dues by branch', 'Top 10 programs by enrollments this year', 'Employees by department'],
  finance: ['Fee collection by study center for the last 3 months', 'Monthly enrollment payments this year as a line chart', 'Overdue fee dues by study center', 'Pending wallet top-ups by study center', 'Expense claims by category this quarter', 'Top 10 programs by fee collected this year'],
  ops: ['Enrollments by status this month', 'Enrollments by university this year', 'Students by program', 'Pending document reviews by study center', 'Class attendance by batch this month', 'Monthly enrollments this year'],
  hr: ['Employees by department', 'Leave requests by type this month', 'Late arrivals by department this month', 'Attendance status today', 'Payroll net salary by month this year', 'Open complaints by category'],
  sales: ['My enrollments by status this month', 'Enrollments by sales person this month', 'Leads by status', 'Lead conversion by source this year', 'Target vs achieved by employee', 'Monthly enrollments this year'],
  collections: ['Overdue fee dues by branch', 'Fees due this month by study center', 'Collected vs pending fees this month', 'Students by status', 'Monthly fee collection this year', 'Target vs achieved'],
  center: ['My enrollments by status this month', 'Fee collection this year by month', 'Students by program', 'Pending fee dues', 'Wallet top-ups this year', 'Class attendance this month'],
  branch: ['Enrollments by sales person this month', 'Staff attendance today', 'Leave requests this month', 'Overdue fee dues', 'Students by program', 'Tasks by status'],
  employee: ['My attendance this month', 'My leave requests this year', 'My tasks by status', 'My payslips this year', 'My expense claims', 'My target vs achieved'],
  staff: ['Enrollments by status this month', 'Students by program', 'My attendance this month', 'My tasks by status', 'University payments this year', 'My leave requests this year'],
  student: ['My fee dues', 'My payments this year', 'My class attendance this month', 'My overdue fees', 'My enrollments'],
  faculty: ['Class attendance by batch this month', 'Absent students this week', 'Attendance by lesson', 'Students by batch', 'Average rating by class'],
};

/** Datasets offered in this panel that this user can access */
export function datasetsFor(panel: string, ctx: AccessContext): Record<string, DatasetDef> {
  return Object.fromEntries(
    Object.entries(DATASETS).filter(([, d]) => d.panels.includes(panel) && d.scope(ctx) !== null),
  );
}

/** Compact text description of the allowed datasets, sent to the AI */
export function describeDatasets(datasets: Record<string, DatasetDef>): string {
  return Object.entries(datasets)
    .map(([key, d]) => {
      const fields = Object.entries(d.fields)
        .map(([fk, f]) => {
          const tags: string[] = [f.type];
          if (f.aggregatable) tags.push('sum/avg');
          if (f.groupable) tags.push('groupable');
          if (f.values) tags.push(`values: ${f.values.join('|')}`);
          if (f.hints) tags.push(`known values: ${f.hints.join('|')}`);
          return `    - ${fk} (${tags.join(', ')}): ${f.label}`;
        })
        .join('\n');
      return `• ${key}: ${d.label}. ${d.description}\n  default date field: ${d.defaultDateField}\n  fields:\n${fields}`;
    })
    .join('\n\n');
}
