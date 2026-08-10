import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Filter, RefreshCw, BarChart, Percent, AlertCircle } from 'lucide-react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export function SalesConversionReportPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/reports/conversions');
      setData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load conversion report');
    } finally {
      setLoading(false);
    }
  };

  if (!data && loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading Conversion Data...</div>;
  }

  if (!data) return null;

  const funnelColors = [
    'hsl(var(--primary))', // Total
    'hsl(var(--info))',    // Contacted
    'hsl(var(--warning))', // Interested
    'hsl(var(--success))', // Converted
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Filter className="w-6 h-6 text-primary" />
            Lead Conversion Funnel
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track lead progression through the pipeline stages to monitor drop-off rates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-card/60 lg:col-span-1 flex flex-col justify-center text-center p-6">
          <CardContent className="p-0">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
              <Percent className="w-8 h-8 text-success" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Overall Conv. Rate</p>
            <p className="text-5xl font-bold text-success mt-2">{data.overallConversionRate}%</p>
            <p className="text-xs text-muted-foreground mt-2 mt-4">
              <AlertCircle className="w-3 h-3 inline mr-1 text-destructive" />
              {data.deadLeads} Dead Leads
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-card/60 lg:col-span-3">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart className="w-4 h-4 text-muted-foreground" />
              Funnel Drop-off Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={data.funnel} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                  <ReTooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                    {data.funnel.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={funnelColors[index % funnelColors.length]} />
                    ))}
                  </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
