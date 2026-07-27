import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function CourierTrackingPanel() {
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
      toast.error('Failed to fetch tracking details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Courier Tracking</CardTitle>
            <CardDescription>Monitor status of dispatched packages</CardDescription>
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
            <MapPin className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No active couriers to track</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Courier</TableHead>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>Dispatch Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-medium">{log.student?.name || 'N/A'}</div>
                    </TableCell>
                    <TableCell>{log.courierName || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{log.trackingNumber || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{log.dispatchDate ? new Date(log.dispatchDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline">Track via API</Button>
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
