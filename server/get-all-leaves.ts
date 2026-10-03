import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'abheeshkumaran7@gmail.com' } });
  if (user) {
    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: user.id }
    });
    console.log(leaves);
  }
}
main();
