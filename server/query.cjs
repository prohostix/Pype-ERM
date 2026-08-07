const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const branches = await prisma.branch.findMany({ select: { id: true, name: true, code: true } });
  console.log(branches);
  const hrs = await prisma.user.findMany({ where: { role: 'hr_admin' }, select: { id: true, name: true, branchId: true } });
  console.log(hrs);
}
main();
