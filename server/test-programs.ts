import prisma from './src/lib/prisma.js';
async function run() {
  const center = await prisma.studyCenter.findFirst({ where: { email: 'bossacademics@gmail.com' } });
  const allocs = await prisma.programAllocation.findMany({ where: { centerId: center!.id } });
  const pIds = allocs.map(a => a.programId);
  const progs = await prisma.program.findMany({ where: { id: { in: pIds } } });
  console.log('Programs:', progs.length);
  for (const p of progs) {
    console.log('Prog ID:', p.id, 'orgId:', p.organizationId, 'status:', p.status);
  }
}
run();
