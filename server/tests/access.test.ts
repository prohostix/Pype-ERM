// Run: npx tsx --test tests/access.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAccess, type Override } from '../src/access/resolve.js';
import { FEATURES } from '../src/access/catalog.js';

const hr = { id: 'u', role: 'employee', status: 'active', organizationId: 'o', branchId: 'b', departmentId: 'd', departmentType: 'hr' };
const grant = (over: Partial<Override> = {}): Override =>
  ({ organizationId: 'o', userId: 'u', featureKey: 'invoices', level: 'view', roleAtGrant: 'employee', departmentIdAtGrant: 'd', ...over });
const level = (user: any, rows: Override[] = [], key = 'invoices') => resolveAccess(user, rows)[key].level;

test('defaults follow the menus', () => {
  const expected: [object, string, string][] = [
    [{ role: 'org_admin' }, 'manage', 'view'],
    [{ role: 'finance_admin' }, 'manage', 'view'],
    [{ role: 'ceo' }, 'manage', 'none'],
    [{ role: 'branch_manager' }, 'manage', 'none'],
    [{ role: 'finance_admin', isBranchManager: true }, 'manage', 'none'],
    [{ role: 'employee', subDepartmentId: 's', departmentType: 'finance' }, 'manage', 'view'],
    [{ role: 'employee', departmentType: 'finance' }, 'none', 'none'],
    [{ role: 'employee', departmentType: 'hr' }, 'none', 'none'],
    [{ role: 'hr_admin' }, 'none', 'none'],
    [{ role: 'student', isBranchManager: true }, 'none', 'none'],
  ];
  for (const [user, invoices, receipts] of expected) {
    const access = resolveAccess({ id: 'u', ...user } as any, []);
    assert.deepEqual([access.invoices.level, access.bill_receipts.level], [invoices, receipts], JSON.stringify(user));
  }
});

test('an HR employee can be given view access', () => {
  const access = resolveAccess(hr, [grant(), grant({ featureKey: 'bill_receipts' })]);
  assert.deepEqual(access.invoices, { level: 'view', source: 'override' });
  assert.equal(access.bill_receipts.level, 'view');
});

test('no access removes a role default', () => {
  const finance = { ...hr, role: 'finance_admin' };
  assert.equal(level(finance, [grant({ level: 'none', roleAtGrant: 'finance_admin' })]), 'none');
});

test('manage can be reduced to view', () => {
  const finance = { ...hr, role: 'finance_admin' };
  assert.equal(level(finance, [grant({ roleAtGrant: 'finance_admin' })]), 'view');
});

test('overrides stop applying after a role or department change', () => {
  assert.equal(level({ ...hr, role: 'hr_admin' }, [grant()]), 'none');
  assert.equal(level({ ...hr, departmentId: 'other' }, [grant()]), 'none');
  assert.equal(level({ ...hr, departmentId: null }, [grant()]), 'none');
});

test('a grant needs a branch, but removal does not', () => {
  assert.equal(level({ ...hr, branchId: null }, [grant()]), 'none');
  const finance = { ...hr, role: 'finance_admin', branchId: null };
  assert.equal(level(finance, [grant({ level: 'none', roleAtGrant: 'finance_admin' })]), 'none');
});

test('revoked, foreign and invalid rows are ignored', () => {
  assert.equal(level(hr, [grant({ revokedAt: new Date() })]), 'none');
  assert.equal(level(hr, [grant({ organizationId: 'other' })]), 'none');
  assert.equal(level(hr, [grant({ userId: 'someone' })]), 'none');
  assert.equal(level(hr, [grant({ featureKey: 'bill_receipts', level: 'manage' })], 'bill_receipts'), 'none');
  assert.equal(level(hr, [grant({ level: 'owner' })]), 'none');
});

test('the newest row wins', () => {
  const rows = [grant({ createdAt: new Date('2026-01-01') }), grant({ level: 'manage', createdAt: new Date('2026-02-01') })];
  assert.equal(level(hr, rows), 'manage');
});

test('protected accounts ignore overrides, disabled accounts get nothing', () => {
  const admin = { ...hr, role: 'org_admin' };
  assert.equal(level(admin, [grant({ level: 'none', roleAtGrant: 'org_admin' })]), 'manage');
  assert.equal(level({ ...hr, status: 'inactive' }, [grant()]), 'none');
  assert.equal(level({ ...hr, status: 'on_leave' }, [grant()]), 'view');
});

test('a feature outside the organization plan stays off', () => {
  const gated = [{ ...FEATURES[0], orgFeature: 'billing' }];
  assert.equal(resolveAccess(hr, [grant()], [], gated).invoices.level, 'none');
  assert.equal(resolveAccess(hr, [grant()], ['billing'], gated).invoices.level, 'view');
});
