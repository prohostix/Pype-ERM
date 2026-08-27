import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const org = await prisma.organization.findFirst();
  const uni = await prisma.university.findFirst();
  
  if (!org || !uni) {
    console.log("No org or uni");
    return;
  }
  
  const specs = Array.from({length: 100}, (_, i) => `Spec ${i+1}`);
  
  const p = await prisma.program.create({
    data: {
      organizationId: org.id,
      universityId: uni.id,
      name: "Test 100 Specs",
      code: "T100",
      duration: 3,
      specialisations: specs
    }
  });
  
  console.log("Created with", p.specialisations.length, "specialisations");
  
  await prisma.program.delete({ where: { id: p.id } });
}

run().catch(console.error).finally(() => prisma.$disconnect());
