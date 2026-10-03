import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'abheeshkumaran7@gmail.com' } });
  if (!user) return console.log('User not found');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deleted = await prisma.attendance.deleteMany({
    where: { 
      employeeId: user.id,
      date: today,
      status: 'half_day'
    }
  });

  console.log(`Deleted ${deleted.count} attendance records.`);
}
main();
