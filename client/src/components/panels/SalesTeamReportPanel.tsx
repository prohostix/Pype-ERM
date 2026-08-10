import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Target, DollarSign, RefreshCw, BarChart } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export function SalesTeamReportPanel() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/reports/team');
      setData(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load team report');
    } finally {
      setLoading(false);
    }
  };

  const totalEnrollments = data.reduce((acc, curr) => acc + curr.enrollments, 0);
  const totalRevenue = data.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalTargets = data.reduce((acc, curr) => acc + curr.targetTotal, 0);
  const avgProgress = totalTargets > 0 ? Math.round((totalEnrollments / totalTargets) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Team Performance Report
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Aggregated performance metrics across your entire hierarchy.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-card/60">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team Size</p>
              <p className="text-2xl font-bold">{data.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-card/60">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-xl">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Enrollments</p>
              <p className="text-2xl font-bold">{totalEnrollments}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-card/60">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-warning/10 rounded-xl">
              <Target className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overall Target Progress</p>
              <p className="text-2xl font-bold">{avgProgress}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-card/60">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-info/10 rounded-xl">
              <DollarSign className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <Card className="border-none shadow-xl overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart className="w-4 h-4 text-muted-foreground" />
            Team Member Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !data.length ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No team members found in your hierarchy.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Member Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Role</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Enrollments</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Target</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Progress</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{member.name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{member.designation}</td>
                      <td className="px-4 py-3 text-center font-bold text-success">{member.enrollments}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{member.targetTotal}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full", member.targetProgress >= 100 ? "bg-success" : member.targetProgress > 50 ? "bg-warning" : "bg-destructive")}
                              style={{ width: `${Math.min(member.targetProgress, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold">{member.targetProgress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{member.revenue.toLocaleString()}</td>
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
