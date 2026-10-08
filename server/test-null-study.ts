import prisma from './src/lib/prisma.js';
async function run() {
  const users = await prisma.user.findMany({ where: { role: 'center_admin', studyCenterId: null } });
  console.log('Users with center_admin but null studyCenterId:', users.length);
  for (const u of users) {
    console.log('User:', u.email, u.id);
  }
}
run();
