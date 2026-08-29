import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export function DeleteRequestsPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/edit-delete/requests');
      setRequests(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load delete requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/edit-delete/requests/${id}`, { status });
      toast.success(`Request ${status} successfully`);
      fetchRequests();
    } catch (error) {
      toast.error('Failed to process request');
    }
  };

  const formatTarget = (url: string) => {
    if (!url) return 'Unknown Target';
    try {
      const parts = url.split('/').filter(Boolean);
      const relevantParts = parts.filter(p => p !== 'api' && p !== 'v1');
      
      const id = relevantParts.pop();
      if (!id) return url;
      
      const entityName = relevantParts.map(p => 
        p.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      ).join(' > ');
      
      return `${entityName} (ID: ${id.length > 12 ? id.substring(0, 8) + '...' : id})`;
    } catch (e) {
      return url;
    }
  };

  const renderRequestsList = (filteredRequests: any[]) => {
    if (loading) {
      return <div className="text-center py-8">Loading...</div>;
    }
    if (filteredRequests.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No requests found in this category.</div>;
    }
    
    return (
      <div className="space-y-4">
        {filteredRequests.map((req) => (
          <div key={req.id} className="p-4 border rounded-xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{req.user?.name || 'Unknown User'}</span>
                <Badge variant="outline">{req.entityType}</Badge>
                {req.status === 'pending_manager' && <Badge className="bg-warning text-warning-foreground">Pending Manager</Badge>}
                {req.status === 'pending_ceo' && <Badge className="bg-info text-info-foreground">Pending CEO</Badge>}
                {req.status === 'approved' && <Badge className="bg-success text-success-foreground">Approved</Badge>}
                {req.status === 'rejected' && <Badge className="bg-destructive text-destructive-foreground">Rejected</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mb-2" title={req.entityId}>
                Target: <span className="font-medium text-foreground">{req.targetName || formatTarget(req.entityId)}</span>
              </p>
              <div className="bg-muted p-3 rounded-md text-sm border-l-4 border-primary">
                <p className="font-medium text-xs mb-1">Reason for deletion:</p>
                {req.reason}
              </div>
            </div>
            
            {/* Show action buttons only when this user can act on the current stage */}
            {(() => {
              const role = user?.role as string;
              const canAct =
                (req.status === 'pending_manager' && ['superadmin', 'org_admin', 'ceo', 'general_manager', 'finance_admin', 'finance_sub_admin', 'ops_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin', 'center_admin'].includes(role)) ||
                (req.status === 'pending_ceo' && ['superadmin', 'org_admin', 'ceo', 'general_manager'].includes(role));
              if (!canAct) return null;
              const isFinalApprover = ['superadmin', 'org_admin'].includes(role) || req.status === 'pending_ceo';
              return (
                <div className="flex gap-2">
                  <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleRespond(req.id, 'rejected')}>
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button variant="default" className="bg-success hover:bg-success/90" onClick={() => handleRespond(req.id, 'approved')}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {isFinalApprover ? 'Approve & Delete' : 'Approve → CEO'}
                  </Button>
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending">
            {renderRequestsList(requests.filter(req => req.status === 'pending_manager' || req.status === 'pending_ceo'))}
          </TabsContent>
          
          <TabsContent value="approved">
            {renderRequestsList(requests.filter(req => req.status === 'approved'))}
          </TabsContent>
          
          <TabsContent value="rejected">
            {renderRequestsList(requests.filter(req => req.status === 'rejected'))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
