import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserSquare2, RefreshCw, BarChart, Phone, CheckCircle2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export function SalesCounselorReportPanel() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/reports/counselor');
      setData(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load counselor report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserSquare2 className="w-6 h-6 text-primary" />
            Counselor Performance Report
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Detailed breakdown of individual counselor metrics: leads, tasks, and conversions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Counselors', value: data.length, icon: UserSquare2, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Total Leads Handled', value: data.reduce((a, c) => a + c.totalLeads, 0), icon: Phone, color: 'text-info', bg: 'bg-info/10' },
          { label: 'Tasks Completed', value: data.reduce((a, c) => a + c.completedTasks, 0), icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Avg Conversion', value: `${data.length > 0 ? Math.round(data.reduce((a, c) => a + c.conversionRate, 0) / data.length) : 0}%`, icon: TrendingUp, color: 'text-warning', bg: 'bg-warning/10' },
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-md bg-card/60">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={cn("p-3 rounded-xl", s.bg)}>
                <s.icon className={cn("w-5 h-5", s.color)} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Table */}
      <Card className="border-none shadow-xl overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart className="w-4 h-4 text-muted-foreground" />
            Individual Counselor Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !data.length ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No counselors found in your hierarchy.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Counselor Name</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Total Leads</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Converted</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Conv. Rate</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Tasks Done</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Enrollments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.map((counselor) => (
                    <tr key={counselor.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{counselor.name}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={counselor.status === 'active' ? 'border-success text-success' : 'border-muted text-muted-foreground'}>
                          {counselor.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{counselor.totalLeads}</td>
                      <td className="px-4 py-3 text-center font-medium text-success">{counselor.convertedLeads}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("font-semibold", counselor.conversionRate >= 10 ? "text-success" : counselor.conversionRate >= 5 ? "text-warning" : "text-destructive")}>
                          {counselor.conversionRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-muted-foreground">{counselor.completedTasks} / {counselor.totalTasks}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-primary">{counselor.enrollments}</td>
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
