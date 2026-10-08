import prisma from './src/lib/prisma.js';
async function run() {
  const nodes = await prisma.designation.findMany();
  const gm = nodes.find(n => n.id === 'f504c232-1c11-4e39-910d-76bd9e4cd1f3');
  console.log('GM:', gm?.title);
  
  const children = nodes.filter(n => {
          if (n.parentDesignationId !== gm?.id) return false;
          
          let currentBId = gm.branchId;
          if (!currentBId && (gm as any).allowedBranchIds && (gm as any).allowedBranchIds.length > 0) {
            currentBId = (gm as any).allowedBranchIds[0];
          }
          
          let childBId = n.branchId;
          if (!childBId && (n as any).allowedBranchIds && (n as any).allowedBranchIds.length > 0) {
            childBId = (n as any).allowedBranchIds[0];
          }
          
          return currentBId === childBId || !childBId;
  });
  console.log('GM Children:', children.map(c => c.title));
}
run();
