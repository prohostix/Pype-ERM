import prisma from './src/lib/prisma.js';
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'abheeshkumaran7@gmail.com' } });
  const attendances = await prisma.attendance.findMany({ where: { employeeId: user?.id } });
  console.log(attendances);
}
main();
