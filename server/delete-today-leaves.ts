import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'abheeshkumaran7@gmail.com' } });
  if (user) {
    const deleted = await prisma.leaveRequest.deleteMany({
      where: { employeeId: user.id }
    });
    console.log(`Deleted ${deleted.count} leave requests for ${user.email}`);
  }
}
main();
