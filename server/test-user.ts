import prisma from './src/lib/prisma.js';
async function run() {
  const users = await prisma.user.findMany({ where: { email: 'bossacademics@gmail.com' } });
  if (users.length === 0) return console.log('User not found');
  for (const user of users) {
    console.log('User role:', user.role, 'studyCenterId:', user.studyCenterId);
  }
}
run();
