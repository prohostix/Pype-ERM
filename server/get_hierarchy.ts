import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'branchmanagerkochi@xyz.com' } });
  if (!user) return console.log('User not found');
  console.log('User:', user.name, user.role);

  const allOrgUsers = await prisma.user.findMany({
    where: { organizationId: user.organizationId, status: 'active' },
    select: { id: true, name: true, role: true, designation: true, reportingTo: true, departmentId: true }
  });

  const hierarchyUserIds = new Set([user.id]);
  let addedNew = true;
  while (addedNew) {
    addedNew = false;
    for (const u of allOrgUsers) {
      if (u.reportingTo && hierarchyUserIds.has(u.reportingTo) && !hierarchyUserIds.has(u.id)) {
        hierarchyUserIds.add(u.id);
        addedNew = true;
      }
    }
  }

  const users = allOrgUsers.filter(u => hierarchyUserIds.has(u.id));
  console.log('Hierarchy users:', users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
