import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const hr = await prisma.user.findUnique({ where: { email: 'hr@prohostix.com' } });
  if (hr) {
    console.log('Role:', hr.role);
    console.log('Reporting To:', hr.reportingTo);
    console.log('Department ID:', hr.departmentId);
  } else {
    console.log('User not found');
  }
}
main().finally(() => prisma.$disconnect());
