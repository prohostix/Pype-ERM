const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const org = await prisma.organization.findFirst();
  if (!org) return console.log("No org");
  const uni = await prisma.university.findFirst();
  
  const p = await prisma.program.create({
    data: {
      organizationId: org.id,
      universityId: uni.id,
      name: "Test 30 Specs",
      code: "T30",
      duration: 3,
      specialisations: Array.from({length: 30}, (_, i) => `Spec ${i+1}`)
    }
  });
  console.log("Created program with", p.specialisations.length, "specialisations");
  
  const fetched = await prisma.program.findUnique({ where: { id: p.id } });
  console.log("Fetched program has", fetched.specialisations.length, "specialisations");
  
  await prisma.program.delete({ where: { id: p.id } });
}

run().catch(console.error).finally(() => prisma.$disconnect());
