import prisma from '../src/lib/prisma';

async function main() {
  const hr = await prisma.user.findUnique({
    where: { email: 'hr@prohostix.com' },
    include: { 
      department: {
        include: {
          manager: true
        }
      }
    }
  });

  if (!hr) {
    console.log("HR user not found.");
    return;
  }

  console.log("HR User:", hr.name, "(", hr.email, ")");
  if (hr.department) {
    console.log("Department:", hr.department.name);
    if (hr.department.manager) {
      console.log("Department Head:", hr.department.manager.name, "(", hr.department.manager.email, ")");
    } else {
      console.log("Department Head: None assigned to this department.");
    }
  } else {
    console.log("HR user is not assigned to any department.");
  }
}

main().catch(console.error).finally(async () => { await (prisma as any).$disconnect?.() });
