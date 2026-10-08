import prisma from './src/lib/prisma.js';

async function main() {
  const email = 'branchinchargeedpl.tims@gmail.com';
  const manager = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!manager) {
    console.log("Manager not found");
    return;
  }
  
  console.log("MANAGER:", manager.name, "BranchId:", manager.branchId, "OrgId:", manager.organizationId);
  
  const branch = await prisma.branch.findUnique({
    where: { id: manager.branchId },
    include: {
      salesDept: true,
      operationsDept: true
    }
  });
  console.log("BRANCH:", branch?.name);
  
  const users = await prisma.user.findMany({
    where: { branchId: manager.branchId }
  });
  
  console.log(`TOTAL USERS IN BRANCH: ${users.length}`);
  
  const depts = await prisma.department.findMany({
    where: { organizationId: manager.organizationId }
  });
  
  console.log("ALL ORG DEPTS:");
  depts.forEach(d => console.log(d.id, d.name, d.type));
  
  console.log("\nUSERS:");
  users.forEach(u => {
    console.log(`User: ${u.name} | Role: ${u.role} | DeptId: ${u.departmentId} | ReportingTo: ${u.reportingTo}`);
  });
}

main().finally(() => process.exit(0));
