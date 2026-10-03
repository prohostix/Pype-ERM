import prisma from './src/lib/prisma.js';

async function main() {
  const users = await prisma.user.findMany({ where: { role: 'center_admin' }, take: 1 });
  if (!users.length) return console.log("No center admin found");
  const user = users[0];
  console.log("Center Admin:", user.id, user.studyCenterId);

  const allocations = await prisma.programAllocation.findMany({
    where: { centerId: user.studyCenterId!, organizationId: user.organizationId, isActive: true },
    include: { program: { include: { university: true } } }
  });
  console.log("Allocations:", allocations.length);
  
  const allocatedUniversityIds = Array.from(new Set(allocations.map(a => a.program?.universityId).filter(Boolean)));
  console.log("Allocated Uni IDs:", allocatedUniversityIds);
  
  const universities = await prisma.university.findMany({
    where: { organizationId: user.organizationId, id: { in: allocatedUniversityIds } },
  });
  
  console.log("Filtered Universities length:", universities.length);
  
  const allUniversities = await prisma.university.findMany({
    where: { organizationId: user.organizationId }
  });
  
  console.log("All Universities length:", allUniversities.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
