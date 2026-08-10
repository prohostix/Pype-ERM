import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, RefreshCw, BarChart3, PieChart, CalendarDays } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export function SalesAdmissionReportPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (month && year) {
        params.month = month;
        params.year = year;
      }
      const res = await api.get('/sales/reports/admissions', { params });
      setData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load admission report');
    } finally {
      setLoading(false);
    }
  };

  if (!data && loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading Report Data...</div>;
  }

  if (!data) return null;

  // Format trends for recharts
  const trendData = Object.entries(data.trends || {}).map(([name, admissions]) => ({
    name,
    admissions,
  }));

  const byUniv = Object.entries(data.byUniversity || {}).sort((a: any, b: any) => b[1] - a[1]);
  const byProg = Object.entries(data.byProgram || {}).sort((a: any, b: any) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            Admission & Enrollment Report
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Analysis of successful admissions broken down by university and program.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Months</option>
            {Array.from({length: 12}).map((_, i) => (
              <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Years</option>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Stats & Breakdowns) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-md bg-card/60">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-primary/10 rounded-full mb-3">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Total Admissions</p>
              <h3 className="text-5xl font-bold mt-2">{data.totalAdmissions}</h3>
              {month && year && (
                <p className="text-xs text-muted-foreground mt-2">
                  For {new Date(0, Number(month)-1).toLocaleString('default', { month: 'long' })} {year}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-card/60">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4 text-muted-foreground" />
                Top Universities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border/50">
                {byUniv.length === 0 && <li className="p-4 text-center text-xs text-muted-foreground">No data</li>}
                {byUniv.map(([name, count]: any, i) => (
                  <li key={i} className="p-3 px-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <span className="text-sm font-medium truncate max-w-[200px]">{name}</span>
                    <Badge variant="secondary" className="font-bold">{count}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Charts & Programs) */}
        <div className="lg:col-span-2 space-y-6">
          
          <Card className="border-none shadow-md bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                Admission Trends (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="admissions" 
                      name="Admissions"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-card/60">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Program Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 p-4">
                {byProg.length === 0 && <div className="col-span-2 text-center text-xs text-muted-foreground">No data</div>}
                {byProg.map(([name, count]: any, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-transparent hover:border-border transition-colors">
                    <span className="text-xs font-medium truncate pr-4">{name}</span>
                    <span className="text-xs font-bold text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
