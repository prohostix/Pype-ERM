const nodes: any[] = [
  { id: '1', title: 'GENERAL MANGER', parentDesignationId: null, branchId: null, allowedBranchIds: [] },
  { id: '2', title: 'BRANCH IN CHARGE KOCHI', parentDesignationId: '1', branchId: null, allowedBranchIds: ['kochi_1'] },
  { id: '3', title: 'FINANCE HEAD', parentDesignationId: '2', branchId: null, allowedBranchIds: [] }
];

const globalRoots = nodes.filter(n => {
    const hasParent = typeof n.parentDesignationId === 'object' ? !!(n.parentDesignationId as any)?.id : !!n.parentDesignationId;
    let hasBranch = typeof n.branchId === 'object' ? !!(n.branchId as any)?.id : !!n.branchId;
    if (!hasBranch && (n as any).allowedBranchIds && (n as any).allowedBranchIds.length > 0) {
      hasBranch = true;
    }
    return !hasParent && !hasBranch;
});

console.log('globalRoots:', globalRoots.map(n => n.title));

const gm = globalRoots[0];
const gmChildren = nodes.filter(n => {
    const pid = typeof n.parentDesignationId === 'object' ? (n.parentDesignationId as any)?.id : n.parentDesignationId;
    if (pid !== gm.id) return false;

    const currentBId = typeof gm.branchId === 'object' ? (gm.branchId as any)?.id : gm.branchId;
    
    let childBId = typeof n.branchId === 'object' ? (n.branchId as any)?.id : n.branchId;
    if (!childBId && n.allowedBranchIds && n.allowedBranchIds.length > 0) {
      childBId = n.allowedBranchIds[0];
    }
    
    return currentBId === childBId || !childBId;
});

console.log('gmChildren:', gmChildren.map(n => n.title));

