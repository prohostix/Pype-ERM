import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export function StudentPaymentsLogPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/finance/student-payments-log');
      if (response.data.success) {
        setLogs(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch student payments log:', error);
      toast.error('Failed to load student payments log');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log: any) =>
    log.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.enrollmentNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.programName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Student Payments Log</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track student payments against their program structure.
          </p>
        </div>
      </div>

      <Card className="border-none bg-card/65 backdrop-blur-md shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Payment Logs Directory</CardTitle>
            <CardDescription>View comprehensive status of student fee completion</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, enrollment, program..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No payment records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="pb-3 pr-4">Student Details</th>
                    <th className="pb-3 px-4">Program</th>
                    <th className="pb-3 px-4 text-right">Total Fee</th>
                    <th className="pb-3 px-4 text-right">Amount Paid</th>
                    <th className="pb-3 px-4 text-right">Balance</th>
                    <th className="pb-3 pl-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredLogs.map((log: any) => (
                    <tr key={log.studentId} className="hover:bg-background/20">
                      <td className="py-3 px-4 pl-0">
                        <span className="font-bold text-foreground block">{log.name}</span>
                        <span className="text-[10px] text-muted-foreground">{log.enrollmentNo || 'No Enrollment No.'}</span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {log.programName}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-foreground">
                        ₹{log.totalFee?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-600">
                        ₹{log.totalPaid?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-amber-600">
                        ₹{log.balance?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="py-3 pl-4">
                        {log.status === 'Completed' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none">
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none">
                            Pending
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
