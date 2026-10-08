import prisma from './src/lib/prisma.js';
async function run() {
  const gm = await prisma.designation.findFirst({ where: { title: { contains: 'MANGER', mode: 'insensitive' } } });
  console.log(gm);
}
run();
