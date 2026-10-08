import prisma from './src/lib/prisma.js';
async function run() {
  const users = await prisma.user.findMany({ where: { email: 'bossacademics@gmail.com' } });
  console.log('Total users:', users.length);
  for (const u of users) {
    console.log(u.id, u.role, u.studyCenterId);
  }
}
run();
