/**
 * Read only. Lists who has used the invoice and receipt requests, from the activity log, and who
 * would be refused once feature access is enforced.
 *   npx tsx src/scripts/access-usage-report.ts [days=30]
 */
import prisma from '../lib/prisma.js';
import { can, resolveAccess } from '../access/resolve.js';
import type { Action } from '../access/catalog.js';

const days = Math.max(1, parseInt(process.argv[2] || '30', 10) || 30);

async function main() {
  const since = new Date(Date.now() - days * 86400000);
  const data = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const usage = await tx.$queryRaw<{ actorId: string; actorType: string | null; method: string; area: string; calls: number; last: Date }[]>`
      SELECT "actorId", "actorType", method,
             CASE WHEN route LIKE '/finance/receipt/%' THEN 'receipts'
                  WHEN route LIKE '%/approve' THEN 'approval' ELSE 'invoices' END AS area,
             count(*)::int AS calls, max("timestamp") AS last
      FROM "AuditLog"
      WHERE "timestamp" >= ${since} AND "actorId" IS NOT NULL AND "statusCode" < 400
        AND (route = '/finance/invoices' OR route LIKE '/finance/invoices/%' OR route LIKE '/finance/receipt/%')
      GROUP BY 1, 2, 3, 4`;
    const range = await tx.$queryRaw<{ first: Date | null; last: Date | null }[]>`
      SELECT min("timestamp") AS first, max("timestamp") AS last FROM "AuditLog" WHERE "timestamp" >= ${since} AND method = 'GET'`;
    const ids = [...new Set(usage.map((u) => u.actorId))];
    const users = await tx.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, name: true, role: true, status: true, organizationId: true, branchId: true, departmentId: true, subDepartmentId: true,
        organization: { select: { name: true } },
        department: { select: { type: true } },
        subDepartment: { select: { parentDept: { select: { type: true } } } },
        managedBranch: { select: { id: true } },
      },
    });
    return { usage, range: range[0], users };
  }, { timeout: 60000 });

  console.log(`Activity log reads recorded from ${data.range.first?.toISOString() ?? '-'} to ${data.range.last?.toISOString() ?? '-'} (asked for ${days} days)`);

  const byId = new Map(data.users.map((u) => [u.id, u]));
  const byRole = new Map<string, { users: Set<string>; calls: number; refused: Set<string> }>();
  const refused = new Map<string, any>();

  for (const row of data.usage) {
    const user = byId.get(row.actorId);
    const departmentType = user?.department?.type ?? user?.subDepartment?.parentDept.type ?? null;
    const role = user ? `${user.role}${user.role === 'employee' ? ` (${departmentType || 'no department'}${user.subDepartmentId ? ', sub department' : ''})` : ''}`
      : row.actorType === 'faculty' ? 'faculty' : 'unknown account';
    const action: Action = row.area === 'receipts' ? 'download' : row.area === 'approval' ? 'approve'
      : row.method === 'POST' ? 'create' : row.method === 'GET' ? 'view' : row.method === 'DELETE' ? 'delete' : 'edit';
    let allowed = false;
    if (user) {
      const access = resolveAccess({ ...user, departmentType, isBranchManager: !!user.managedBranch }, []);
      // Reading and downloading are also reached through Bill & Receipts
      allowed = can(access, 'invoices', action)
        || (['view', 'download'].includes(action) && can(access, 'bill_receipts', action));
    }
    const group = byRole.get(role) || { users: new Set<string>(), calls: 0, refused: new Set<string>() };
    group.users.add(row.actorId);
    group.calls += row.calls;
    if (!allowed) {
      group.refused.add(row.actorId);
      const key = `${row.actorId}|${action}`;
      const seen = refused.get(key);
      const lastUsed = row.last.toISOString().slice(0, 10);
      refused.set(key, {
        organization: user?.organization?.name ?? '-', name: user?.name ?? '-', role, action,
        calls: row.calls + (seen?.calls || 0), lastUsed: seen && seen.lastUsed > lastUsed ? seen.lastUsed : lastUsed,
      });
    }
    byRole.set(role, group);
  }

  console.log('\nUse by user type');
  console.table([...byRole].map(([role, g]) => ({ role, users: g.users.size, calls: g.calls, wouldBeRefused: g.refused.size })).sort((a, b) => b.calls - a.calls));
  console.log('Requests that would be refused');
  console.table([...refused.values()].sort((a, b) => a.role.localeCompare(b.role) || b.calls - a.calls));
}

main()
  .catch((error) => { console.error('Report failed:', error.message || error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); process.exit(); });
