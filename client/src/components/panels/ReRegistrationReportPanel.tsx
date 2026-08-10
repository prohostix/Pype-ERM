import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, BarChart4 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '@/lib/api';

const COLORS = ['#FFBB28', '#00C49F', '#FF8042', '#0088FE', '#8884D8', '#82CA9D'];

export function ReRegistrationReportPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ops/reports/reregistrations');
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch re-registration report', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Re-registration Report</h2>
          <p className="text-muted-foreground">Track student semester re-registration status</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {!data && loading ? (
        <div className="flex items-center justify-center p-12 border border-dashed rounded-lg">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg">
          <BarChart4 className="w-8 h-8 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No data available.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          
          <Card className="col-span-1 lg:col-span-3">
            <CardHeader>
              <CardTitle>Total Eligible Students: {data.totalEligible}</CardTitle>
              <CardDescription>Number of active students evaluated for re-registration</CardDescription>
            </CardHeader>
          </Card>

          <Card className="col-span-1 md:col-span-2 lg:col-span-2">
            <CardHeader>
              <CardTitle>Re-registration Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {data.metrics?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.metrics} layout="vertical" margin={{ left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {data.metrics.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">No metrics data</div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1 md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle>Completion Rate</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {data.metrics?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.metrics}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.metrics.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">No status data</div>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
