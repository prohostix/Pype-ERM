import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function DeliveryConfirmationPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/documents?type=dispatched&status=dispatched');
      setLogs(res.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch pending deliveries');
    } finally {
      setLoading(false);
    }
  };

  const markDelivered = async (id: string) => {
    try {
      await api.put(`/documents/${id}`, { status: 'delivered', deliveryDate: new Date().toISOString() });
      toast.success('Document marked as delivered');
      setLogs(logs.filter(log => log.id !== id));
    } catch (e) {
      console.error(e);
      toast.error('Failed to mark as delivered');
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Delivery Confirmation</CardTitle>
            <CardDescription>Confirm receipt of documents by destination</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
            <CheckSquare className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No pending deliveries to confirm</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Tracking #</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-medium">{log.student?.name || 'N/A'}</div>
                    </TableCell>
                    <TableCell className="capitalize">{log.documentType.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <div className="font-mono">{log.trackingNumber || 'N/A'}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => markDelivered(log.id)}>Confirm Delivery</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
