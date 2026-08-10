import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, BarChart4 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';

export function UniversityReportPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ops/reports/universities');
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch university report', error);
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
          <h2 className="text-2xl font-bold tracking-tight">University Report</h2>
          <p className="text-muted-foreground">Track metrics and performance across all universities</p>
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
        <div className="grid gap-4 md:grid-cols-2">
          
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Total Universities: {data.totalUniversities}</CardTitle>
              <CardDescription>Metrics across all active universities</CardDescription>
            </CardHeader>
          </Card>

          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Students per University</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              {data.data?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="code" />
                    <YAxis />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="totalStudents" name="Students Enrolled" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">No student data by university</div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Programs per University</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              {data.data?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.data} layout="vertical" margin={{ left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="totalPrograms" name="Active Programs" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">No programs data by university</div>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
