const fs = require('fs');

const file = 'server/src/controllers/dashboardController.ts';
let code = fs.readFileSync(file, 'utf8');

const targetUsersQuery = `  // Get all active users in this branch, or in the organization if no branch is specified for global roles
  const where: any = { status: 'active' };
  if (branchId) {
    where.branchId = branchId;
  } else {
    where.organizationId = req.user.organizationId;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      designation: true,
      reportingTo: true,
      departmentId: true,
    }
  });`;

const replacementUsersQuery = `  // Fetch ALL active users in the organization to compute the reporting hierarchy
  const allOrgUsers = await prisma.user.findMany({
    where: { organizationId: req.user.organizationId, status: 'active' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      designation: true,
      reportingTo: true,
      departmentId: true,
    }
  });

  // Recursively find everyone who reports to the logged-in user (or reports to someone who reports to them, etc.)
  const hierarchyUserIds = new Set([req.user.id]);
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

  // Filter the users to ONLY include those in the logged-in user's direct/indirect reporting hierarchy
  const users = allOrgUsers.filter(u => hierarchyUserIds.has(u.id));`;

code = code.replace(targetUsersQuery, replacementUsersQuery);

fs.writeFileSync(file, code);
