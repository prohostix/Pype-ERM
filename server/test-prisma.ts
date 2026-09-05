import prisma from './src/lib/prisma.js';

async function main() {
  try {
    const user = await prisma.user.findFirst({
      select: {
          id: true, userId: true, email: true, name: true, role: true,
          phone: true, designation: true, status: true, lastLogin: true,
          avatar: true, reportingTo: true, createdAt: true, updatedAt: true,
          organizationId: true, departmentId: true, subDepartmentId: true,
          branchId: true, studyCenterId: true, ceoPanelId: true,
          allowSystemPunchIn: true, requireSelfiePunchIn: true, allowAnywherePunchIn: true,
          organization: true, department: true, branch: true, studyCenter: true,
        }
    });
    console.log("User found:", user ? user.id : null);
  } catch (error) {
    console.error("Prisma Error:", error);
  }
}
main();
