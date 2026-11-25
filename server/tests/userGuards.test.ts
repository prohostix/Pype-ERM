import { hidePasswordHashes } from '../src/utils/hidePasswordHashes.js';
// Run: npx tsx --test tests/userGuards.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canWriteInvoices, isAccountDisabled, isOwnStudentAccount, manageableRoles, userChangeError } from '../src/utils/userGuards.js';

const HR = ['hr_admin', 'hr_sub_admin', 'general_manager', 'branch_manager', 'ops_admin', 'employee', 'student'];
const hr = { id: 'hr', role: 'hr_admin', branchId: 'b1' };
const emp = { id: 'e', role: 'employee', branchId: 'b1', status: 'active' };
const err = (actor: any, target: any, changes?: any) => userChangeError(actor, target, HR, changes);

test('only inactive and resigned accounts are disabled', () => {
  assert.equal(isAccountDisabled('inactive'), true);
  assert.equal(isAccountDisabled('resigned'), true);
  assert.equal(isAccountDisabled('active'), false);
  assert.equal(isAccountDisabled('on_leave'), false);
});

test('HR cannot touch higher or equal accounts', () => {
  for (const role of ['superadmin', 'org_admin', 'ceo', 'general_manager', 'hr_admin']) {
    assert.ok(err(hr, { ...emp, role }, {}), role);
    assert.ok(err(hr, { ...emp, role }), `delete ${role}`);
  }
  assert.ok(err({ ...hr, role: 'hr_sub_admin' }, { ...emp, role: 'hr_sub_admin' }, {}));
});

test('HR manages lower roles in their own branch', () => {
  assert.equal(err(hr, emp, {}), null);
  assert.equal(err(hr, emp), null);
  assert.equal(err(hr, emp, { role: 'ops_admin', branchId: 'b1' }), null);
  assert.equal(err(hr, { ...emp, role: 'hr_sub_admin' }, {}), null);
});

test('HR cannot hand out protected roles', () => {
  assert.ok(err(hr, emp, { role: 'general_manager' }));
  assert.ok(err(hr, emp, { role: 'hr_admin' }));
  assert.ok(err(hr, emp, { role: 'org_admin' }));
  assert.deepEqual(manageableRoles('hr_sub_admin', HR), ['branch_manager', 'ops_admin', 'employee', 'student']);
});

test('branch limits apply to branch HR only', () => {
  assert.ok(err(hr, { ...emp, branchId: 'b2' }, {}));
  assert.ok(err(hr, { ...emp, branchId: null }, {}));
  assert.ok(err(hr, emp, { branchId: 'b2' }));
  assert.ok(err(hr, emp, { branchId: null }));
  assert.equal(err({ ...hr, branchId: null }, { ...emp, branchId: 'b2' }, { branchId: 'b1' }), null);
});

test('HR may edit own details but not own role, status or branch', () => {
  const self = { id: 'hr', role: 'hr_admin', branchId: 'b1', status: 'active' };
  assert.equal(err(hr, self, { role: 'hr_admin', branchId: 'b1' }), null);
  assert.ok(err(hr, self, { role: 'general_manager' }));
  assert.ok(err(hr, self, { status: 'inactive' }));
  assert.ok(err(hr, self, { branchId: null }));
  assert.ok(err(hr, self));
});

test('org admin keeps full control except over superadmin', () => {
  const admin = { id: 'a', role: 'org_admin' };
  assert.equal(err(admin, { ...emp, role: 'ceo' }, {}), null);
  assert.equal(err(admin, { id: 'a', role: 'org_admin' }, { role: 'org_admin' }), null);
  assert.ok(err(admin, { ...emp, role: 'superadmin' }, {}));
});

test('student workflows only touch student logins of the same organization', () => {
  assert.equal(isOwnStudentAccount({ role: 'student', organizationId: 'o1' }, 'o1'), true);
  assert.equal(isOwnStudentAccount({ role: 'org_admin', organizationId: 'o1' }, 'o1'), false);
  assert.equal(isOwnStudentAccount({ role: 'student', organizationId: 'o2' }, 'o1'), false);
});

test('only users whose screens offer it may write invoices', () => {
  const no = { managesBranch: false };
  for (const role of ['org_admin', 'ceo', 'branch_manager', 'finance_admin', 'finance_sub_admin']) {
    assert.equal(canWriteInvoices({ role }, no), true, role);
  }
  for (const role of ['employee', 'student', 'faculty', 'hr_admin', 'ops_admin', 'sales', 'center_admin', 'collections_admin']) {
    assert.equal(canWriteInvoices({ role }, no), false, role);
  }
  assert.equal(canWriteInvoices({ role: 'ops_admin' }, { managesBranch: true }), true);
  assert.equal(canWriteInvoices({ role: 'student' }, { managesBranch: true }), false);
  assert.equal(canWriteInvoices({ role: 'employee', subDepartmentId: 's' }, { ...no, departmentType: 'finance' }), true);
  assert.equal(canWriteInvoices({ role: 'employee', subDepartmentId: 's' }, { ...no, departmentType: 'hr' }), false);
  assert.equal(canWriteInvoices({ role: 'employee' }, { ...no, departmentType: 'finance' }), false);
});

test('responses never carry a password hash', () => {
  const hash = '$2a$12$abcdefghijklmnopqrstuv1234567890ABCDEFGHIJKLMNOPQRSTU';
  const out = JSON.stringify({ data: [{ user: { name: 'a', password: hash } }], credentials: { password: 'portal-pass' } }, hidePasswordHashes);
  assert.ok(!out.includes('$2a$'));
  assert.ok(out.includes('portal-pass'), 'other password values are untouched');
});
