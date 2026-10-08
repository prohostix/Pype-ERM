import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { OrgNode } from './OrgHierarchyPanel';

export function BranchHierarchyPanel() {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/org/designations');
        if (res.data.success) {
          setNodes(res.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch designations', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Tree View...</div>;
  }

  // Branch manager's branch ID
  const branchId = user?.branchId;

  // Find the roots for THIS branch
  const branchRoots = nodes.filter(n => {
    if (!branchId) return false;
    
    let bId = typeof n.branchId === 'object' ? (n.branchId as any)?.id : n.branchId;
    if (!bId && n.allowedBranchIds && n.allowedBranchIds.length > 0) {
      bId = n.allowedBranchIds[0];
    }
    if (bId !== branchId) return false;

    const pId = typeof n.parentDesignationId === 'object' ? (n.parentDesignationId as any)?.id : n.parentDesignationId;
    if (!pId) return true;

    const parentNode = nodes.find(p => p.id === pId);
    let parentBId = parentNode ? (typeof parentNode.branchId === 'object' ? (parentNode.branchId as any)?.id : parentNode.branchId) : null;
    if (parentNode && !parentBId && parentNode.allowedBranchIds && parentNode.allowedBranchIds.length > 0) {
      parentBId = parentNode.allowedBranchIds[0];
    }
    
    return parentBId !== branchId;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Branch Hierarchy</h2>
        <p className="text-muted-foreground">Organization tree for your branch.</p>
      </div>

      <div className="bg-muted/10 border rounded-xl p-8 overflow-x-auto min-h-[500px] flex justify-center">
        {branchRoots.length > 0 ? (
          <div className="flex gap-10 justify-center pt-4">
            {branchRoots.map(root => (
              <OrgNode 
                key={root.id} 
                node={root} 
                allNodes={nodes} 
                allUsers={[]} 
                allDepts={[]} 
                isReadOnly={true} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-20">
            <p>No branch hierarchy found.</p>
            <p className="text-sm mt-1">Please contact your HR administrator to set up the roles for this branch.</p>
          </div>
        )}
      </div>
    </div>
  );
}
