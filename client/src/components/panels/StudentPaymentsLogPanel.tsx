import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export function StudentPaymentsLogPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

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

  const toggleRow = (studentId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
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
                    <React.Fragment key={log.studentId}>
                      <tr className="hover:bg-background/20 cursor-pointer" onClick={() => toggleRow(log.studentId)}>
                        <td className="py-3 px-4 pl-0">
                          <div className="flex items-center gap-2">
                            {expandedRows[log.studentId] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            <div>
                              <span className="font-bold text-foreground block">{log.name}</span>
                              <span className="text-[10px] text-muted-foreground">{log.enrollmentNo || 'No Enrollment No.'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {log.programName}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-foreground">
                          ₹{log.totalFee?.toLocaleString('en-IN') || 0}
                          {log.discountAmount > 0 && (
                            <div className="text-[10px] text-green-600 mt-0.5" title={log.discountReason}>
                              (-₹{log.discountAmount.toLocaleString('en-IN')} off)
                            </div>
                          )}
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
                      {expandedRows[log.studentId] && log.breakdown && log.breakdown.length > 0 && (
                        <tr className="bg-muted/20">
                          <td colSpan={6} className="p-4 border-l-2 border-primary">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {log.breakdown.map((b: any, i: number) => (
                                <div key={i} className="bg-background rounded-md border border-border p-3 flex flex-col gap-1 shadow-sm">
                                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{b.year}</span>
                                  <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="text-muted-foreground">Total:</span>
                                    <span className="font-semibold text-foreground">₹{b.totalFee?.toLocaleString('en-IN') || 0}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Paid:</span>
                                    <span className="font-medium text-emerald-600">₹{b.paid?.toLocaleString('en-IN') || 0}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm border-t border-border mt-1 pt-1">
                                    <span className="text-muted-foreground">Balance:</span>
                                    <span className="font-semibold text-amber-600">₹{b.balance?.toLocaleString('en-IN') || 0}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
