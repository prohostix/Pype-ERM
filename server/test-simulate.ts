import prisma from './src/lib/prisma.js';
async function run() {
  const centerId = '6590c558-f182-4908-a5e4-708295854bbd';
  
  // Find all programs in org
  const progs = await prisma.program.findMany({ where: { organizationId: '8aff7eb8-1d74-443f-87d3-19290baaccb2' } });
  console.log('Available programs:', progs.map(p => p.id));
  
  const existing = await prisma.programAllocation.findMany({ where: { centerId } });
  const existingIds = existing.map(a => a.programId);
  console.log('Existing allocations:', existingIds);
  
  const programIds = progs.map(p => p.id); // try to allocate all
  const toAddIds = programIds.filter(id => !existingIds.includes(id));
  console.log('toAddIds:', toAddIds);
}
run();
