import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ReportHeader, ReportCard, ReportStats, ReportEmpty, ReportLoading, downloadCsv, REPORT_COLORS, reportTooltipStyle, reportGridStroke } from './ReportKit';
import { toast } from 'sonner';
import api from '@/lib/api';


export function ReRegistrationReportPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operations/reports/reregistrations');
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

  const handleExport = () => {
    if (!data) return;
    const rows = [
      ...(data.metrics || []).map((r: any) => ({ Section: 'Overall', Name: r.name, Pending: '', Completed: '', 'Not Started': '', Count: r.value })),
      ...(data.byProgram || []).map((r: any) => ({ Section: 'By Program', Name: r.name, Pending: r.pending, Completed: r.completed, 'Not Started': r.notStarted, Count: r.pending + r.completed + r.notStarted })),
      ...(data.byBranch || []).map((r: any) => ({ Section: 'By Branch', Name: r.name, Pending: r.pending, Completed: r.completed, 'Not Started': r.notStarted, Count: r.pending + r.completed + r.notStarted })),
    ];
    if (!downloadCsv('reregistration_report.csv', rows)) toast.warning('No data to export');
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Re-registration Report"
        description="Track student semester re-registration status"
        loading={loading}
        onRefresh={fetchReport}
        onExport={handleExport}
      />

      {!data && loading ? (
        <ReportLoading />
      ) : !data ? (
        <div className="rounded-3xl bg-white border border-slate-100 py-16 text-center text-sm text-muted-foreground">No data available.</div>
      ) : (
        <div className="space-y-4">
          <ReportStats
            items={[
              { label: 'Eligible Students', value: data.totalEligible },
              { label: 'Completed', value: data.summary?.completed ?? 0, note: `${data.summary?.completionRate ?? 0}% completion rate`, tone: 'good' },
              { label: 'Pending', value: data.summary?.pending ?? 0, tone: (data.summary?.pending ?? 0) > 0 ? 'warn' : undefined },
              { label: 'Not Started', value: data.summary?.notStarted ?? 0 },
            ]}
          />

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <ReportCard className="lg:col-span-2" title="Re-registration Status Distribution">
              <div className="h-[300px]">
                {data.metrics?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.metrics} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={reportGridStroke} />
                      <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f4f6f3' }} contentStyle={reportTooltipStyle} />
                      <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                        {data.metrics.map((_e: any, i: number) => <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <ReportEmpty message="No metrics data" />}
              </div>
            </ReportCard>

            <ReportCard title="Completion Rate">
              <div className="h-[300px]">
                {data.metrics?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.metrics} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {data.metrics.map((_e: any, i: number) => <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={reportTooltipStyle} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <ReportEmpty message="No status data" />}
              </div>
            </ReportCard>
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <ReportCard title="By Program" subtitle="Pending, completed and not started">
              {(data.byProgram?.length ?? 0) > 0 ? (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byProgram} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={reportGridStroke} />
                      <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f4f6f3' }} contentStyle={reportTooltipStyle} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="completed" name="Completed" stackId="a" fill="#54b947" />
                      <Bar dataKey="pending" name="Pending" stackId="a" fill="#f5b942" />
                      <Bar dataKey="notStarted" name="Not Started" stackId="a" fill="#cbd5c8" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <ReportEmpty message="No program data" />}
            </ReportCard>
            <ReportCard title="By Branch" subtitle="Pending, completed and not started">
              {(data.byBranch?.length ?? 0) > 0 ? (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byBranch} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={reportGridStroke} />
                      <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f4f6f3' }} contentStyle={reportTooltipStyle} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="completed" name="Completed" stackId="a" fill="#54b947" />
                      <Bar dataKey="pending" name="Pending" stackId="a" fill="#f5b942" />
                      <Bar dataKey="notStarted" name="Not Started" stackId="a" fill="#cbd5c8" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <ReportEmpty message="No branch data" />}
            </ReportCard>
          </div>
        </div>
      )}
    </div>
  );
}
