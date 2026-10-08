const { PrismaClient } = require('./src/generated/client/index.js');
const prisma = new PrismaClient();
async function main() {
  const center = await prisma.studyCenter.findFirst({ where: { email: 'bossacademics@gmail.com' } });
  if (!center) return console.log('Center not found');
  console.log('Center ID:', center.id);
  const allocs = await prisma.programAllocation.findMany({ where: { centerId: center.id }, include: { program: true } });
  console.log('Allocations length:', allocs.length);
  if (allocs.length > 0) {
    console.log('Programs:', allocs.map(a => a.program.name));
  }
}
main().finally(() => prisma.$disconnect());
