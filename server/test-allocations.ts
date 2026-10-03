import prisma from './src/lib/prisma.js';

async function main() {
  const users = await prisma.user.findMany({ where: { role: 'center_admin' } });
  for (const user of users) {
    if (!user.studyCenterId) continue;
    
    const allocations = await prisma.programAllocation.findMany({
      where: { centerId: user.studyCenterId, organizationId: user.organizationId, isActive: true },
      include: { program: { include: { university: true } } }
    });
    
    const allocatedUniversityIds = Array.from(new Set(allocations.map(a => a.program?.universityId).filter(Boolean)));
    const universities = await prisma.university.findMany({
      where: { organizationId: user.organizationId, id: { in: allocatedUniversityIds as string[] } }
    });
    
    const allUnivs = await prisma.university.count({ where: { organizationId: user.organizationId }});
    
    console.log(`User: ${user.name} (${user.id})`);
    console.log(`Center: ${user.studyCenterId}`);
    console.log(`Allocated Programs: ${allocations.length}`);
    console.log(`Allocated Universities: ${universities.length} / ${allUnivs}`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
