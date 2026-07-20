import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export function DeleteRequestsPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/edit-delete-requests');
      setRequests(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load delete requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.post(`/edit-delete-requests/${id}/respond`, { status });
      toast.success(`Request ${status} successfully`);
      fetchRequests();
    } catch (error) {
      toast.error('Failed to process request');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No pending delete requests</div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
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
                  <p className="text-sm text-muted-foreground mb-2">Target: {req.entityId}</p>
                  <div className="bg-muted p-3 rounded-md text-sm border-l-4 border-primary">
                    <p className="font-medium text-xs mb-1">Reason for deletion:</p>
                    {req.reason}
                  </div>
                </div>
                
                {/* Only show actions if it's pending for this user's level */}
                {((user?.role === 'ceo' && req.status === 'pending_ceo') || 
                  (user?.role !== 'ceo' && req.status === 'pending_manager')) && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleRespond(req.id, 'rejected')}>
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                    <Button variant="default" className="bg-success hover:bg-success/90" onClick={() => handleRespond(req.id, 'approved')}>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
