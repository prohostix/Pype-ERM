import prisma from './src/lib/prisma.js';
async function run() {
  const t = await prisma.designation.findFirst({ where: { title: { contains: 'THRISSUR', mode: 'insensitive' } } });
  console.log(t);
}
run();
