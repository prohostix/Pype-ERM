import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'timsstudycenter@gmail.com' } });
  if (!user || !user.studyCenterId) {
    console.log("No user or studyCenterId");
    return;
  }
  
  const allocations = await prisma.programAllocation.findMany({
      where: { centerId: user.studyCenterId, organizationId: user.organizationId },
      include: { program: { include: { university: true } } }
    });
    const allocatedUniversityIds = Array.from(new Set(allocations.map(a => a.program.universityId)));
    const universities = await prisma.university.findMany({
      where: { organizationId: user.organizationId, id: { in: allocatedUniversityIds } },
      include: { allowedBranches: true }
    });
    console.log("Allocated Universities:", universities.map(u => u.name));
    
    const allocatedProgramIds = allocations.map(a => a.programId);
    const programs = await prisma.program.findMany({ 
      where: { organizationId: user.organizationId, id: { in: allocatedProgramIds } }, 
      include: { university: true, feeStructures: true } 
    });
    console.log("Allocated Programs:", programs.map(p => p.name));
}
main().finally(() => prisma.$disconnect());
