import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface ActivityLog {
  id: string;
  timestamp: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
  action: string;
  entityType: string;
  entityId: string;
}

export function ActivityLogPanel() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ceo/activity-logs');
      setLogs(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'update': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'delete': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'login': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const paginatedLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(logs.length / itemsPerPage));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Activity className="h-5 w-5 text-purple-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Activity Logs</h2>
          <p className="text-sm text-muted-foreground">View all user activities across the organization</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No activity logs found.</div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{log.user?.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{log.user?.email || ''}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {(log.user?.role || '').replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)} variant="outline">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{log.entityType}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{log.entityId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {totalPages > 1 && (
                <div className="flex justify-between items-center pt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, logs.length)} of {logs.length} entries
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
