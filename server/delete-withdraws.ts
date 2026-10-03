import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'abheeshkumaran7@gmail.com' } });
  if (user) {
    const deleted = await prisma.leaveRequest.deleteMany({
      where: {
        employeeId: user.id,
        status: { in: ['withdraw_pending', 'withdrawn'] }
      }
    });
    console.log(`Deleted ${deleted.count} withdrawal requests for ${user.email}`);
  }
}
main();
