import prisma from '../src/lib/prisma';

async function main() {
  const hr = await prisma.user.findUnique({
    where: { email: 'hr@prohostix.com' },
    include: { organization: true, department: true }
  });
  if (!hr) {
    console.log("HR user not found.");
    return;
  }
  console.log("Found HR:", hr.email, hr.organizationId);

  const emp = await prisma.user.findFirst({
    where: { 
      organizationId: hr.organizationId,
      email: { not: hr.email }
    }
  });

  if (!emp) {
    console.log("No other employee found.");
    return;
  }
  console.log("Found Employee:", emp.email);

  const req = await prisma.leaveRequest.create({
    data: {
      employeeId: emp.id,
      organizationId: hr.organizationId,
      departmentId: emp.departmentId || hr.departmentId || (await prisma.department.findFirst({ where: { organizationId: hr.organizationId } }))!.id,
      type: "casual",
      startDate: new Date(),
      endDate: new Date(new Date().getTime() + 86400000 * 2), // 2 days from now
      reason: "Need some rest",
      status: "dept_approved",
    }
  });

  const req2 = await prisma.leaveRequest.create({
    data: {
      employeeId: emp.id,
      organizationId: hr.organizationId,
      departmentId: emp.departmentId || hr.departmentId || (await prisma.department.findFirst({ where: { organizationId: hr.organizationId } }))!.id,
      type: "sick",
      startDate: new Date(),
      endDate: new Date(new Date().getTime() + 86400000 * 1), // 1 day from now
      reason: "Feeling unwell",
      status: "pending", 
    }
  });

  console.log("Created leave requests:", req.id, req2.id);
}

main().catch(console.error).finally(async () => { await (prisma as any).$disconnect?.() });
