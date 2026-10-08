import prisma from './src/lib/prisma.js';
async function run() {
  const center = await prisma.studyCenter.findFirst({ where: { email: 'bossacademics@gmail.com' } });
  if (!center) return console.log('Center not found');
  const allocs = await prisma.programAllocation.findMany({ where: { centerId: center.id } });
  console.log('Allocs length:', allocs.length);
  for (const a of allocs) {
    console.log('Alloc ID:', a.id, 'isActive:', a.isActive, 'orgId:', a.organizationId);
  }
}
run();
