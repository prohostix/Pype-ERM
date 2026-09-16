import prisma from '../src/lib/prisma.js';

async function checkHierarchy() {
  const hrUser = await prisma.user.findFirst({
    where: { email: 'hr@prohostix.com' },
    include: {
      manager: {
        select: { email: true, role: true, name: true }
      },
      department: true
    }
  });

  if (!hrUser) {
    console.log("hr@prohostix.com not found");
  } else {
    console.log("HR User:", {
      name: hrUser.name,
      role: hrUser.role,
      manager: hrUser.manager,
      department: hrUser.department?.name
    });
  }

  const infoUser = await prisma.user.findFirst({
    where: { email: 'info@prohostix.com' },
  });

  if (!infoUser) {
    console.log("info@prohostix.com not found");
  } else {
    console.log("Info User:", {
      name: infoUser.name,
      role: infoUser.role
    });
  }
}

checkHierarchy()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
