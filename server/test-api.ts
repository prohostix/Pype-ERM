import prisma from './src/lib/prisma.js';
async function run() {
  const centerId = '6590c558-f182-4908-a5e4-708295854bbd';
  const allocations = await prisma.programAllocation.findMany({ 
    where: { centerId }, 
    include: { program: { include: { university: true } } } 
  });
  console.log(JSON.stringify(allocations, null, 2));
}
run();
