import prisma from './src/lib/prisma.js';
async function run() {
  const all = await prisma.designation.findMany({ where: { title: { contains: 'BRANCH IN CHARGE', mode: 'insensitive' } } });
  for (const a of all) {
    if (!a.branchId && (!a.allowedBranchIds || (a.allowedBranchIds as string[]).length === 0)) {
      console.log('Unassigned branch in charge:', a.title);
    }
  }
}
run();
