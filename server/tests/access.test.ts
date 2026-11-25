// Run: npx tsx --test tests/access.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can, resolveAccess, type Override } from '../src/access/resolve.js';
import { FEATURES } from '../src/access/catalog.js';

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

test('allowing needs a branch, blocking does not', () => {
  assert.deepEqual(allowed({ ...hr, branchId: null }, [row('view')]), []);
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
  const gated = [{ ...FEATURES[0], orgFeature: 'billing' }];
  assert.equal(can(resolveAccess(hr, [row('view')], [], gated), 'invoices', 'view'), false);
  assert.equal(can(resolveAccess(hr, [row('view')], ['billing'], gated), 'invoices', 'view'), true);
});
