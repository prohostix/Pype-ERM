import prisma from '../lib/prisma.js';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      branch: { select: { id: true, name: true } },
      departmentId: true,
      department: { select: { id: true, name: true, type: true } }
    }
  });

  console.log(`Total users: ${users.length}`);
  const salesUsers = users.filter(u => u.role.includes('sales') || u.role === 'employee');
  console.log(`Sales/employee users: ${salesUsers.length}`);

  let withoutBranch = 0;
  let withBranch = 0;
  for (const u of salesUsers) {
    if (!u.branchId) {
      withoutBranch++;
      console.log(`NO BRANCH: ${u.name} (${u.email}) | role: ${u.role} | dept: ${u.department?.name}`);
    } else {
      withBranch++;
      console.log(`HAS BRANCH: ${u.name} (${u.email}) | branch: ${u.branch?.name} | dept: ${u.department?.name}`);
    }
  }
  console.log(`\nSummary of sales/employee users: ${withBranch} with branchId, ${withoutBranch} WITHOUT branchId`);

  // Also check if any branches link to those departments
  const branches = await prisma.branch.findMany();
  console.log('\nBranches and their depts:');
  for (const b of branches) {
    console.log(`${b.name} (${b.id}) -> salesDeptId: ${b.salesDeptId}, opsDeptId: ${b.operationsDeptId}, additional: ${JSON.stringify(b.additionalDeptIds)}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => process.exit(0));
