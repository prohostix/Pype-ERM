import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { OrgNode } from './OrgHierarchyPanel';

export function BranchHierarchyPanel() {
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

  // The server only sends a branch manager their own position and the ones
  // beneath it, so the roots are the positions whose parent is not in the list.
  const ids = new Set(nodes.map(n => n.id));
  const branchRoots = nodes.filter(n => {
    const pId = typeof n.parentDesignationId === 'object' ? (n.parentDesignationId as any)?.id : n.parentDesignationId;
    return !pId || !ids.has(pId);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Branch Hierarchy</h2>
        <p className="text-muted-foreground">Your position and the team beneath you.</p>
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
            <p>No hierarchy found for your position.</p>
            <p className="text-sm mt-1">Please contact your HR administrator to place you in the organization chart.</p>
          </div>
        )}
      </div>
    </div>
  );
}
