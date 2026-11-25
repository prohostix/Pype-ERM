// Run: npx tsx --test tests/access.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can, resolveAccess, type Override } from '../src/access/resolve.js';
import { FEATURES } from '../src/access/catalog.js';
import { isBlockedRequest, rulesFor } from '../src/access/blockCheck.js';
import { decideAnyPage, decidePageAction } from '../src/access/pageRules.js';
import { decideStudentAction, hidesStudentFees, isGrantedStudentUser, restrictStudent } from '../src/access/studentRules.js';
import { changeError, needsRow } from '../src/access/changes.js';
import { payrollTeamAccess } from '../src/access/payrollGuard.js';
import { leaveVisibilityWhere } from '../src/utils/leaveScope.js';
import { givenUserError } from '../src/utils/userGuards.js';
import { withoutPortalLogins } from '../src/access/partnerSecrets.js';
import { studentBranchWhere } from '../src/access/studentRules.js';
import { partnerBranchWhere, enrollmentBranchWhere } from '../src/access/pageGuard.js';
import { hasPaymentsScreen, invoiceBranchWhere, isGrantedReader } from '../src/access/invoiceRules.js';

const hr = { id: 'u', role: 'employee', status: 'active', organizationId: 'o', branchId: 'b', departmentId: 'd', departmentType: 'hr' };
const finance = { ...hr, role: 'finance_admin', departmentType: 'finance' };
const row = (action: string, effect = 'allow', over: Partial<Override> = {}): Override =>
  ({ organizationId: 'o', userId: 'u', featureKey: 'invoices', action, effect, roleAtGrant: 'employee', departmentIdAtGrant: 'd', ...over });
const financeRow = (action: string, effect = 'deny') => row(action, effect, { roleAtGrant: 'finance_admin' });
const allowed = (user: any, rows: Override[] = [], key = 'invoices') =>
  Object.entries(resolveAccess(user, rows)[key]).filter(([, a]) => a!.allowed).map(([action]) => action);

const ALL = ['view', 'create', 'edit', 'delete', 'approve', 'download'];
const NO_APPROVALS = ['view', 'create', 'edit', 'download'];

test('defaults follow the menus and route guards', () => {
  const expected: [object, string[], string[]][] = [
    [{ role: 'org_admin' }, ALL, ['view', 'download']],
    [{ role: 'finance_admin' }, ALL, ['view', 'download']],
    [{ role: 'finance' }, NO_APPROVALS, ['view', 'download']],
    [{ role: 'superadmin' }, ALL, []],
    [{ role: 'ceo' }, NO_APPROVALS, []],
    [{ role: 'branch_manager' }, NO_APPROVALS, []],
    [{ role: 'finance_admin', isBranchManager: true }, ALL, []],
    [{ role: 'employee', subDepartmentId: 's', departmentType: 'finance' }, NO_APPROVALS, ['view', 'download']],
    [{ role: 'employee', departmentType: 'finance' }, [], []],
    [{ role: 'employee', departmentType: 'hr' }, [], []],
    [{ role: 'sales_admin' }, [], []],
    [{ role: 'student', isBranchManager: true }, [], []],
  ];
  for (const [user, invoices, receipts] of expected) {
    const subject = { id: 'u', ...user };
    assert.deepEqual([allowed(subject), allowed(subject, [], 'bill_receipts')], [invoices, receipts], JSON.stringify(user));
  }
});

test('an HR employee can be given view only', () => {
  assert.deepEqual(allowed(hr, [row('view')]), ['view']);
});

test('each action is granted on its own', () => {
  assert.deepEqual(allowed(hr, [row('view'), row('download')]), ['view', 'download']);
  assert.deepEqual(allowed(hr, [row('view'), row('delete'), row('approve')]), ['view', 'delete', 'approve']);
});

test('allowing an action also opens the page', () => {
  assert.deepEqual(allowed(hr, [row('create')]), ['view', 'create']);
});

test('blocking view blocks the whole page, whatever else is allowed', () => {
  assert.deepEqual(allowed(finance, [financeRow('view')]), []);
  assert.deepEqual(allowed(hr, [row('create'), row('view', 'deny')]), []);
});

test('one action can be blocked and the rest kept', () => {
  assert.deepEqual(allowed(finance, [financeRow('delete')]), ['view', 'create', 'edit', 'approve', 'download']);
});

test('the result says what the default was and what overrode it', () => {
  const access = resolveAccess(finance, [financeRow('delete')]);
  assert.deepEqual(access.invoices.delete, { allowed: false, byDefault: true, override: 'deny' });
  assert.deepEqual(access.invoices.edit, { allowed: true, byDefault: true });
  assert.equal(can(access, 'invoices', 'edit'), true);
  assert.equal(can(access, 'invoices', 'delete'), false);
  assert.equal(can(access, 'unknown', 'view'), false);
});

test('overrides stop applying after a role or department change', () => {
  assert.deepEqual(allowed({ ...hr, role: 'hr_admin' }, [row('view')]), []);
  assert.deepEqual(allowed({ ...hr, departmentId: 'other' }, [row('view')]), []);
  assert.deepEqual(allowed({ ...hr, departmentId: null }, [row('view')]), []);
});

test('someone without a branch can be allowed and blocked', () => {
  assert.deepEqual(allowed({ ...hr, branchId: null }, [row('view')]), ['view']);
  assert.deepEqual(allowed({ ...finance, branchId: null }, [financeRow('view')]), []);
});

test('revoked, foreign and invalid rows are ignored', () => {
  assert.deepEqual(allowed(hr, [row('view', 'allow', { revokedAt: new Date() })]), []);
  assert.deepEqual(allowed(hr, [row('view', 'allow', { organizationId: 'other' })]), []);
  assert.deepEqual(allowed(hr, [row('view', 'allow', { userId: 'someone' })]), []);
  assert.deepEqual(allowed(hr, [row('view', 'maybe')]), []);
  assert.deepEqual(allowed(hr, [row('approve', 'allow', { featureKey: 'bill_receipts' })], 'bill_receipts'), []);
});

test('the newest row for an action wins', () => {
  const rows = [row('view', 'deny', { createdAt: new Date('2026-02-01') }), row('view', 'allow', { createdAt: new Date('2026-01-01') })];
  assert.deepEqual(allowed(hr, rows), []);
});

test('protected accounts ignore overrides, disabled accounts are allowed nothing', () => {
  const admin = { ...hr, role: 'org_admin' };
  assert.deepEqual(allowed(admin, [row('view', 'deny', { roleAtGrant: 'org_admin' })]), ALL);
  assert.deepEqual(allowed({ ...hr, status: 'inactive' }, [row('view')]), []);
  assert.deepEqual(allowed({ ...hr, status: 'on_leave' }, [row('view')]), ['view']);
});

test('a page outside the organization plan stays off', () => {
  const gated = [{ ...FEATURES.find((f) => f.key === 'invoices')!, orgFeature: 'billing' }];
  assert.equal(can(resolveAccess(hr, [row('view')], [], gated), 'invoices', 'view'), false);
  assert.equal(can(resolveAccess(hr, [row('view')], ['billing'], gated), 'invoices', 'view'), true);
});

test('Payments users may read the short invoice list', () => {
  for (const user of [{ role: 'sales_admin' }, { role: 'sales' }, { role: 'finance_admin' }, { role: 'employee', departmentType: 'sales' }, { role: 'ops_admin', isBranchManager: true }]) {
    assert.equal(hasPaymentsScreen({ id: 'u', ...user }), true, JSON.stringify(user));
  }
  for (const user of [{ role: 'student', isBranchManager: true }, { role: 'faculty' }, { role: 'hr_admin' }, { role: 'employee', departmentType: 'hr' }, { role: 'employee', departmentType: 'finance' }]) {
    assert.equal(hasPaymentsScreen({ id: 'u', ...user }), false, JSON.stringify(user));
  }
});

test('a granted reader is told apart from a default one', () => {
  assert.equal(isGrantedReader(resolveAccess(hr, [row('view')])), true);
  assert.equal(isGrantedReader(resolveAccess(finance, [])), false);
});

test('branch limits cover the whole organization when there is no branch', () => {
  for (const where of [studentBranchWhere, partnerBranchWhere, enrollmentBranchWhere]) {
    assert.deepEqual(where(null), {});
    assert.deepEqual(where(undefined), {});
    assert.ok(JSON.stringify(where('b')).includes('"branchId":"b"'));
  }
});

test('branch limits on invoices', () => {
  assert.equal(invoiceBranchWhere({ role: 'org_admin', branchId: 'b' }, false), null);
  assert.equal(invoiceBranchWhere({ role: 'finance_admin', branchId: null }, false), null);
  const own = JSON.stringify(invoiceBranchWhere({ role: 'finance_admin', branchId: 'b' }, false));
  assert.ok(own.includes('"studentId":null'));
  assert.ok(!own.includes('"not":null'), 'other branches\' partners must not be listed');
  assert.ok(!JSON.stringify(invoiceBranchWhere({ role: 'employee', branchId: 'b' }, true)).includes('"studentId":null'));
});

test('what an Org Admin may save', () => {
  const change = (effect = 'allow', action = 'view') => [{ featureKey: 'invoices', action, effect }];
  assert.equal(changeError('admin', hr, change()), null);
  assert.ok(changeError('u', hr, change()), 'not your own');
  assert.equal(changeError('admin', { ...hr, role: 'ceo' }, change()), null, 'the CEO can be set');
  for (const role of ['superadmin', 'org_admin', 'student', 'faculty', 'center_admin']) {
    assert.ok(changeError('admin', { ...hr, role }, change()), role);
  }
  assert.equal(changeError('admin', { ...hr, branchId: null }, change()), null, 'no branch means every branch');
  assert.equal(changeError('admin', { ...hr, branchId: null }, change('deny')), null);
  assert.ok(changeError('admin', hr, []));
  assert.ok(changeError('admin', hr, change('maybe')));
  assert.ok(changeError('admin', hr, change('allow', 'fly')));
  assert.ok(changeError('admin', hr, [...change(), ...change('deny')]));
});

test('settings equal to the default are not stored, except blocking view', () => {
  const c = (effect: any, action = 'delete') => ({ featureKey: 'invoices', action, effect });
  assert.equal(needsRow(hr, c('allow')), true);
  assert.equal(needsRow(hr, c('deny')), false);
  assert.equal(needsRow(hr, c('deny', 'view')), true);
  assert.equal(needsRow(finance, c('allow')), false);
  assert.equal(needsRow(finance, c('deny')), true);
  assert.equal(needsRow(finance, c('default')), false);
});

const student = (action: string, effect = 'allow', over: Partial<Override> = {}) => row(action, effect, { featureKey: 'students', ...over });
const STAFF_EDIT = ['org_admin', 'sales_admin', 'employee', 'ops_admin'];

test('student list defaults follow the screens', () => {
  assert.deepEqual(allowed({ id: 'u', role: 'org_admin' }, [], 'students'), ['view', 'create', 'edit', 'delete', 'import', 'send', 'download']);
  assert.deepEqual(allowed({ id: 'u', role: 'ops_admin' }, [], 'students'), ['view', 'download']);
  assert.deepEqual(allowed({ id: 'u', role: 'employee', departmentType: 'sales' }, [], 'students'), ['view', 'download']);
  for (const user of [hr, { id: 'u', role: 'hr_admin' }, { id: 'u', role: 'employee', departmentType: 'operations' }]) {
    assert.deepEqual(allowed(user, [], 'students'), [], JSON.stringify(user));
  }
});

test('an HR employee given View can only read, in their branch, without fees', () => {
  const access = resolveAccess(hr, [student('view')]);
  assert.equal(isGrantedStudentUser(access), true);
  assert.equal(hidesStudentFees(access), true);
  // The old route lists accept any employee: that must not apply to a granted user
  for (const action of ['create', 'edit', 'delete', 'import', 'send'] as const) {
    assert.equal(decideStudentAction(access, action, 'employee', STAFF_EDIT).allowed, false, action);
  }
});

test('a granted action works and stays in the branch', () => {
  const access = resolveAccess(hr, [student('view'), student('edit'), row('view')]);
  assert.deepEqual(decideStudentAction(access, 'edit', 'employee', STAFF_EDIT), { allowed: true, ownBranchOnly: true });
  assert.equal(hidesStudentFees(access), false, 'invoice viewers may see fees');
});

test('users without settings keep what the routes already allowed', () => {
  const access = resolveAccess(hr, []);
  assert.deepEqual(decideStudentAction(access, 'edit', 'employee', STAFF_EDIT), { allowed: true, ownBranchOnly: false });
  assert.equal(decideStudentAction(access, 'delete', 'employee', ['org_admin']).allowed, false);
  assert.equal(isGrantedStudentUser(access), false);
});

test('blocking applies to default users', () => {
  const ops = { ...hr, role: 'ops_admin', departmentType: 'operations' };
  const blocked = (action: string) => resolveAccess(ops, [student(action, 'deny', { roleAtGrant: 'ops_admin' })]);
  assert.equal(decideStudentAction(blocked('edit'), 'edit', 'ops_admin', STAFF_EDIT).allowed, false);
  assert.equal(decideStudentAction(blocked('view'), 'edit', 'ops_admin', STAFF_EDIT).allowed, false);
  assert.equal(decideStudentAction(blocked('delete'), 'edit', 'ops_admin', STAFF_EDIT).allowed, true);
});

test('a granted user is not sent fees or passwords', () => {
  const record = { id: 's', name: 'A', credentials: { password: 'x' }, invoices: [1], paymentSchedules: [1], admissionProgress: { paymentPlan: 'p', photoStatus: 'ok' },
    program: { name: 'P', feeStructures: [1] }, enrollments: [{ id: 'e', payment: {}, initialPaymentAmount: 5, status: 'enrolled' }] };
  const seen = JSON.stringify(restrictStudent(record, { hideFees: true, hideCredentials: true }));
  for (const secret of ['credentials', 'invoices', 'paymentSchedules', 'paymentPlan', 'feeStructures', 'payment', 'initialPaymentAmount']) assert.ok(!seen.includes(secret), secret);
  assert.ok(seen.includes('photoStatus') && seen.includes('enrolled'));
});

test('new pages default to the roles whose screens include them', () => {
  const of = (user: object, key: string) => allowed({ id: 'u', ...user }, [], key);
  assert.deepEqual(of({ role: 'org_admin' }, 'student_filters'), ['view', 'create', 'edit', 'delete']);
  assert.deepEqual(of({ role: 'ops_admin' }, 'student_filters'), []);
  assert.deepEqual(of({ role: 'ceo' }, 'admission_review'), ['view']);
  assert.deepEqual(of({ role: 'ops_admin' }, 'admission_review'), ['view', 'edit', 'approve']);
  assert.deepEqual(of({ role: 'finance_admin' }, 'admission_sessions'), ['view', 'approve']);
  assert.deepEqual(of({ role: 'ceo' }, 'admission_sessions'), ['view', 'delete']);
  for (const key of ['student_filters', 'admission_review', 'admission_sessions']) assert.deepEqual(allowed(hr, [], key), [], key);
});

test('a granted page action is limited to the settings', () => {
  const access = resolveAccess(hr, [row('view', 'allow', { featureKey: 'admission_review' })]);
  const legacy = ['ops_admin', 'employee'];
  assert.equal(decidePageAction(access, 'admission_review', 'view', 'employee', legacy).allowed, true);
  assert.equal(decidePageAction(access, 'admission_review', 'approve', 'employee', legacy).allowed, false);
  assert.equal(decidePageAction(resolveAccess(hr, []), 'admission_review', 'approve', 'employee', legacy).allowed, true);
});

test('sales admission pages default to the roles whose screens include them', () => {
  const of = (user: object, key: string) => allowed({ id: 'u', ...user }, [], key);
  assert.deepEqual(of({ role: 'sales_sub_admin' }, 'admission_pipeline'), ['view', 'edit']);
  assert.deepEqual(of({ role: 'sales_admin' }, 'admission_approval'), ['view', 'approve']);
  assert.deepEqual(of({ role: 'sales_sub_admin' }, 'admission_approval'), []);
  assert.deepEqual(of({ role: 'ceo' }, 'invite_links'), ['view', 'create', 'edit']);
  assert.deepEqual(of({ role: 'ops_admin' }, 'student_portal_management'), ['view', 'edit']);
  assert.deepEqual(of({ role: 'employee', departmentType: 'sales' }, 'provisional_enrollment'), ['view', 'create']);
  for (const key of ['invite_links', 'provisional_enrollment', 'admission_pipeline', 'admission_approval', 'student_portal_management']) assert.deepEqual(allowed(hr, [], key), [], key);
});

test('routes that accepted any signed-in user still do for people without settings', () => {
  assert.equal(decidePageAction(resolveAccess(hr, []), 'admission_pipeline', 'edit', 'employee', null).allowed, true);
  const blocked = resolveAccess(hr, [row('edit', 'deny', { featureKey: 'admission_pipeline' })]);
  assert.equal(decidePageAction(blocked, 'admission_pipeline', 'edit', 'employee', null).allowed, false);
  const viewer = resolveAccess(hr, [row('view', 'allow', { featureKey: 'admission_pipeline' })]);
  assert.deepEqual(decidePageAction(viewer, 'admission_pipeline', 'edit', 'employee', null), { allowed: false, ownBranchOnly: false });
});

test('finance page defaults follow the screens and route roles', () => {
  const of = (user: object, key: string) => allowed({ id: 'u', ...user }, [], key);
  assert.deepEqual(of({ role: 'finance_admin' }, 'expenses'), ['view', 'create', 'edit', 'delete', 'approve']);
  assert.deepEqual(of({ role: 'ceo' }, 'expenses'), ['view', 'create', 'edit']);
  assert.deepEqual(of({ role: 'sales_admin' }, 'payments'), ['view']);
  assert.deepEqual(of({ role: 'finance_sub_admin' }, 'fee_structures'), ['view', 'create', 'edit']);
  assert.deepEqual(of({ role: 'ceo' }, 'discounts'), []);
  for (const key of ['payments', 'expenses', 'fee_structures', 'discounts']) assert.deepEqual(allowed(hr, [], key), [], key);
});

test('an expense approval can be given without other changes', () => {
  const access = resolveAccess(hr, [row('approve', 'allow', { featureKey: 'expenses' })]);
  const changers = ['finance_admin', 'org_admin'];
  assert.deepEqual(decidePageAction(access, 'expenses', 'approve', 'employee', changers), { allowed: true, ownBranchOnly: true });
  assert.equal(decidePageAction(access, 'expenses', 'delete', 'employee', changers).allowed, false);
});

test('remaining finance pages default to finance roles', () => {
  const of = (user: object, key: string) => allowed({ id: 'u', ...user }, [], key);
  assert.deepEqual(of({ role: 'finance_admin' }, 'wallet_topups'), ['view', 'approve']);
  assert.deepEqual(of({ role: 'finance' }, 'student_payment_log'), ['view']);
  assert.deepEqual(of({ role: 'ceo' }, 'university_commissions'), ['view']);
  assert.deepEqual(of({ role: 'ceo' }, 'finance_enrollments'), ['view']);
  assert.deepEqual(of({ role: 'finance_sub_admin' }, 'sales_targets'), ['view', 'create', 'edit', 'delete']);
  assert.deepEqual(of({ role: 'collections_admin' }, 'collections'), ['view', 'edit', 'send']);
  for (const key of ['pending_payments', 'provisional_verifications', 'wallet_topups', 'payment_gateway', 'university_fee', 'collections']) assert.deepEqual(allowed(hr, [], key), [], key);
});

test('block-only pages can be blocked but not given', () => {
  const change = (effect: string) => [{ featureKey: 'bulk_sms', action: 'create', effect }];
  assert.ok(changeError('admin', hr, change('allow')));
  assert.equal(changeError('admin', hr, change('deny')), null);
  assert.equal(needsRow(hr, change('deny')[0] as any), true);
  const forced = resolveAccess(hr, [row('create', 'allow', { featureKey: 'bulk_sms' })]);
  assert.equal(forced.bulk_sms.create!.override, undefined, 'a stored allow is ignored');
});

test('an HR Admin can be given the finance side of payroll', () => {
  const hrAdmin = { ...hr, role: 'hr_admin' };
  for (const [featureKey, action] of [['salary_approval', 'approve'], ['payroll_batches', 'approve'], ['payroll_batches', 'edit'], ['payroll_history', 'view']]) {
    assert.equal(changeError('admin', hrAdmin, [{ featureKey, action, effect: 'allow' }]), null, `${featureKey}.${action}`);
    assert.equal(needsRow(hrAdmin, { featureKey, action, effect: 'allow' } as any), true, `${featureKey}.${action}`);
  }
  const access = resolveAccess(hrAdmin, [row('approve', 'allow', { featureKey: 'salary_approval', roleAtGrant: 'hr_admin' })]);
  assert.deepEqual(decidePageAction(access, 'salary_approval', 'approve', 'hr_admin', ['finance_admin']), { allowed: true, ownBranchOnly: true });
  // Without a setting the old role list still decides
  assert.equal(decidePageAction(resolveAccess(hrAdmin, []), 'salary_approval', 'approve', 'hr_admin', ['finance_admin']).allowed, false);
  assert.equal(decidePageAction(resolveAccess(hrAdmin, []), 'payroll', 'edit', 'hr_admin', ['hr_admin']).allowed, true);
});

test('seeing other people\'s payroll has to be given', () => {
  assert.equal(payrollTeamAccess(resolveAccess(hr, [])), undefined);
  assert.equal(payrollTeamAccess(resolveAccess(hr, [row('view', 'allow', { featureKey: 'payroll' })])), 'given');
  const both = ['payroll', 'payroll_history'].map((featureKey) => row('view', 'deny', { featureKey }));
  assert.equal(payrollTeamAccess(resolveAccess(hr, both)), 'blocked');
});

test('a given report is limited to the settings, a role keeps its own', () => {
  const both = ['income_expense', 'profit_loss'];
  const readers = ['finance_admin'];
  const given = resolveAccess(hr, [row('view', 'allow', { featureKey: 'income_expense' })]);
  assert.deepEqual(decideAnyPage(given, both, 'view', 'employee', readers), { allowed: true, ownBranchOnly: true });
  assert.equal(decideAnyPage(resolveAccess(hr, []), both, 'view', 'employee', readers).allowed, false);
  const admin = { ...finance, role: 'finance_admin' };
  const oneBlocked = resolveAccess(admin, [row('view', 'deny', { featureKey: 'income_expense', userId: admin.id, roleAtGrant: admin.role, departmentIdAtGrant: admin.departmentId })]);
  assert.deepEqual(decideAnyPage(oneBlocked, both, 'view', 'finance_admin', readers), { allowed: true, ownBranchOnly: false });
  // Sales reports were open to any signed-in user, who saw only their own team; that stays
  const sales = ['sales_team_report', 'conversion_report'];
  assert.deepEqual(decideAnyPage(resolveAccess(hr, []), sales, 'view', 'employee', null), { allowed: true, ownBranchOnly: false });
  assert.equal(decideAnyPage(resolveAccess(hr, [row('view', 'allow', { featureKey: 'conversion_report' })]), sales, 'view', 'employee', null).ownBranchOnly, true);
});

test('leave requests of a given approver stay in their branch', () => {
  const given = { user: { ...hr, id: 'u', role: 'employee', branchId: 'b' }, ownBranchOnly: true };
  assert.deepEqual(leaveVisibilityWhere(given as any), { organizationId: 'o', user: { role: { not: 'center_admin' }, branchId: 'b' } });
  assert.deepEqual(leaveVisibilityWhere({ ...given, user: { ...given.user, branchId: null } } as any), { organizationId: 'o', user: { role: { not: 'center_admin' } } });
  assert.ok(JSON.stringify(leaveVisibilityWhere({ user: given.user } as any)).includes('"employeeId":"u"'));
});

test('given account management cannot be used to gain more access', () => {
  const actor = { id: 'me', role: 'employee', branchId: 'b', departmentId: 'd' };
  const target = { id: 't', role: 'employee', branchId: 'b', departmentId: 'd' };
  assert.equal(givenUserError(actor, target, { role: 'employee', branchId: 'b', departmentId: 'd', additionalDepartmentIds: [] }), null);
  assert.equal(givenUserError(actor, null, { role: 'employee', branchId: 'b' }), null);
  assert.equal(givenUserError(actor, target), null, 'may delete ordinary staff');
  for (const [name, other] of Object.entries({
    self: { ...target, id: 'me' }, admin: { ...target, role: 'hr_admin' }, finance: { ...target, role: 'finance' },
    branch: { ...target, branchId: 'x' }, noBranch: { ...target, branchId: null }, department: { ...target, departmentId: 'x' },
    sub: { ...target, subDepartmentId: 's' }, manager: { ...target, isManager: true }, given: { ...target, hasGivenAccess: true },
  })) assert.ok(givenUserError(actor, other), name);
  for (const change of [{ role: 'org_admin' }, { role: 'finance' }, { branchId: 'x' }, { branchId: null }, { departmentId: 'x' }, { subDepartmentId: 's' },
    { reportingTo: 'r' }, { studyCenterId: 'c' }, { additionalDepartmentIds: ['x'] }]) {
    assert.ok(givenUserError(actor, target, change), JSON.stringify(change));
    assert.ok(givenUserError(actor, null, { role: 'employee', branchId: 'b', ...change }), `create ${JSON.stringify(change)}`);
  }
});

test('portal logins are sent only to an Org Admin', () => {
  const rows = [{ name: 'p', credentials: { password: 'x' } }];
  assert.deepEqual(withoutPortalLogins({ role: 'org_admin' }, rows), rows);
  for (const role of ['ops_admin', 'sales_admin', 'employee', 'center_admin']) assert.deepEqual(withoutPortalLogins({ role }, rows), [{ name: 'p' }], role);
});

test('requests are matched to the page they belong to', () => {
  assert.deepEqual(rulesFor('POST', '/api/v1/hr/vacancies'), [{ pageKey: 'vacancies', action: 'create' }]);
  assert.deepEqual(rulesFor('PUT', '/API/V1/HR/Vacancies/abc/Close/?x=1'), [{ pageKey: 'vacancies', action: 'edit' }]);
  assert.deepEqual(rulesFor('HEAD', '/api/biometric-devices'), [{ pageKey: 'biometric_devices', action: 'view' }]);
  assert.deepEqual(rulesFor('GET', '/api/v1/payroll/batches').map((r) => r.pageKey), ['payroll_batches']);
  assert.deepEqual(rulesFor('POST', '/api/v1/documents', { type: 'dispatched' }).map((r) => r.pageKey), ['document_dispatch']);
  // Personal requests are never part of a blockable page
  for (const [method, url] of [['POST', '/api/v1/hr/leaves'], ['POST', '/api/v1/attendance/punch-in'], ['PUT', '/api/v1/tasks/a/complete'],
    ['GET', '/api/v1/payroll'], ['GET', '/api/v1/hr/holidays'], ['GET', '/api/v1/users'], ['POST', '/api/v1/hr/polls/a/vote'], ['GET', '/api/v1/auth/me']]) {
    assert.deepEqual(rulesFor(method, url), [], `${method} ${url}`);
  }
});

test('only a blocked user is refused', () => {
  const rules = rulesFor('DELETE', '/api/v1/hr/vacancies/abc');
  assert.equal(isBlockedRequest(resolveAccess(hr, []), rules), false);
  assert.equal(isBlockedRequest(resolveAccess(hr, [row('delete', 'deny', { featureKey: 'vacancies' })]), rules), true);
  assert.equal(isBlockedRequest(resolveAccess(hr, [row('view', 'deny', { featureKey: 'vacancies' })]), rules), true);
  assert.equal(isBlockedRequest(resolveAccess(hr, [row('create', 'deny', { featureKey: 'vacancies' })]), rules), false);
  const shared = rulesFor('GET', '/api/v1/finance/reports/income-expenditure');
  assert.equal(isBlockedRequest(resolveAccess(hr, [row('view', 'deny', { featureKey: 'profit_loss' })]), shared), false);
});
