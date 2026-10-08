import prisma from './src/lib/prisma.js';

async function run() {
  const nodes = await prisma.designation.findMany();
  
  const globalRoots = nodes.filter(n => {
    const hasParent = typeof n.parentDesignationId === 'object' ? !!(n.parentDesignationId as any)?.id : !!n.parentDesignationId;
    
    // For n.allowedBranchIds, prisma returns an array.
    let hasBranch = !!n.branchId;
    if (!hasBranch && (n as any).allowedBranchIds && Array.isArray((n as any).allowedBranchIds) && (n as any).allowedBranchIds.length > 0) {
      hasBranch = true;
    }
    return !hasParent && !hasBranch;
  });

  console.log('Global roots:');
  for (const root of globalRoots) {
      console.log(`- ${root.title} (ID: ${root.id})`);
      
      const children = nodes.filter(n => {
          if (n.parentDesignationId !== root.id) return false;
          
          let currentBId = root.branchId;
          if (!currentBId && (root as any).allowedBranchIds && (root as any).allowedBranchIds.length > 0) {
            currentBId = (root as any).allowedBranchIds[0];
          }
          
          let childBId = n.branchId;
          if (!childBId && (n as any).allowedBranchIds && (n as any).allowedBranchIds.length > 0) {
            childBId = (n as any).allowedBranchIds[0];
          }
          
          return currentBId === childBId || !childBId;
      });
      
      if (children.length > 0) {
          console.log(`  Children:`);
          for (const c of children) {
              console.log(`  - ${c.title} (ID: ${c.id})`);
          }
      } else {
          console.log(`  (No matching children according to OrgNode logic)`);
      }
  }
}
run();
