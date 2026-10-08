import prisma from './src/lib/prisma.js';
async function run() {
  const centers = await prisma.studyCenter.findMany({ where: { email: 'bossacademics@gmail.com' } });
  if (centers.length === 0) return console.log('Center not found');
  for (const c of centers) {
    console.log('Center ID:', c.id, 'Code:', c.code, 'Name:', c.name, 'Status:', c.status);
    const allocs = await prisma.programAllocation.findMany({ where: { centerId: c.id } });
    console.log(' - Allocs:', allocs.length);
  }
}
run();
