import prisma from '../src/lib/prisma';

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'test@prohostix.com' },
    include: { 
      department: {
        include: {
          manager: true
        }
      },
      organization: true
    }
  });

  if (!user) {
    console.log("User test@prohostix.com not found.");
    return;
  }

  console.log("User:", user.name, "(", user.email, ")");
  
  let deptHead = null;
  if (user.department) {
    console.log("Department:", user.department.name);
    if (user.department.manager) {
      deptHead = user.department.manager;
      console.log("Department Head:", deptHead.name, "(", deptHead.email, ")");
    } else {
      console.log("Department Head: None assigned");
    }
  } else {
    console.log("User is not assigned to any department.");
  }

  const hrAdmins = await prisma.user.findMany({
    where: { role: 'hr_admin', organizationId: user.organizationId }
  });

  console.log("HR Admins (can see and final approve):");
  hrAdmins.forEach(hr => console.log(` - ${hr.name} (${hr.email})`));

  // Create a leave request
  const req = await prisma.leaveRequest.create({
    data: {
      employeeId: user.id,
      organizationId: user.organizationId,
      departmentId: user.departmentId || (await prisma.department.findFirst({ where: { organizationId: user.organizationId } }))!.id,
      type: "casual",
      startDate: new Date(),
      endDate: new Date(new Date().getTime() + 86400000 * 1), // 1 day from now
      reason: "Personal work",
      status: "pending", 
    }
  });

  console.log(`Successfully created a pending leave request (ID: ${req.id}) for test@prohostix.com`);
}

main().catch(console.error).finally(async () => { await (prisma as any).$disconnect?.() });
