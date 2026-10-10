import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();

async function main() {
  const salessub = await prisma.user.findUnique({ where: { email: 'salessub@xyz.com' }, include: { department: true, subDepartment: true } });
  console.log('salessub:', salessub?.id, salessub?.role, salessub?.departmentId, salessub?.department?.name, 'subDept:', salessub?.subDepartment?.name);

  // find a sales admin
  const salesadmin = await prisma.user.findFirst({ where: { role: 'sales_admin', organizationId: salessub?.organizationId }, include: { department: true } });
  console.log('salesadmin:', salesadmin?.id, salesadmin?.email, salesadmin?.role, salesadmin?.departmentId, salesadmin?.department?.name);
  
  // check leaves
  const leaves = await prisma.leaveRequest.findMany({ where: { employeeId: salessub?.id } });
  console.log('leaves for salessub:', leaves);
}

main().catch(console.error).finally(() => prisma.$disconnect());
