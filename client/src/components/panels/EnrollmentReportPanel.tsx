import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ReportHeader, ReportCard, ReportStats, RankList, ReportEmpty, ReportLoading, downloadCsv, REPORT_COLORS, reportTooltipStyle, reportGridStroke } from './ReportKit';
import { toast } from 'sonner';
import api from '@/lib/api';


export function EnrollmentReportPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operations/reports/enrollments');
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch enrollment report', error);
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
      ...(data.statusCounts || []).map((r: any) => ({ Section: 'By Status', Name: r.name, Count: r.value })),
      ...(data.byProgram || []).map((r: any) => ({ Section: 'By Program', Name: r.name, Count: r.value })),
      ...(data.byCenter || []).map((r: any) => ({ Section: 'By Center', Name: r.name, Count: r.value })),
      ...(data.bySource || []).map((r: any) => ({ Section: 'By Source', Name: r.name, Count: r.value })),
      ...(data.trends || []).map((r: any) => ({ Section: 'Monthly Trend', Name: r.name, Count: r.count })),
    ];
    if (!downloadCsv('enrollment_report.csv', rows)) toast.warning('No data to export');
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Enrollment Report"
        description="Track enrollment statuses and pipeline metrics"
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
              { label: 'Total Enrollments', value: data.total },
              { label: 'Approved', value: data.summary?.approved ?? 0, note: `${data.summary?.approvalRate ?? 0}% approval rate`, tone: 'good' },
              { label: 'In Review', value: data.summary?.inReview ?? 0, tone: (data.summary?.inReview ?? 0) > 0 ? 'warn' : undefined },
              { label: 'Rejected', value: data.summary?.rejected ?? 0, tone: (data.summary?.rejected ?? 0) > 0 ? 'bad' : undefined },
              { label: 'Avg. Days to Approve', value: data.summary?.avgDaysToApprove ?? '—' },
            ]}
          />

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <ReportCard className="lg:col-span-2" title="Monthly Enrollments" subtitle="Last 6 months">
              <div className="h-[300px]">
                {data.trends?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={reportGridStroke} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f4f6f3' }} contentStyle={reportTooltipStyle} />
                      <Bar dataKey="count" name="Enrollments" fill="#54b947" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <ReportEmpty message="No trend data" />}
              </div>
            </ReportCard>

            <ReportCard title="Enrollments by Status">
              <div className="h-[300px]">
                {data.statusCounts?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.statusCounts} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {data.statusCounts.map((_e: any, i: number) => <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={reportTooltipStyle} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <ReportEmpty message="No status data" />}
              </div>
            </ReportCard>
          </div>

          <ReportCard title="Enrollment Pipeline">
            <div className="h-[260px]">
              {data.funnel?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.funnel} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={reportGridStroke} />
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f4f6f3' }} contentStyle={reportTooltipStyle} />
                    <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                      {data.funnel.map((_e: any, i: number) => <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <ReportEmpty message="No pipeline data" />}
            </div>
          </ReportCard>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <ReportCard title="By Program" subtitle="Top 10">
              <RankList rows={data.byProgram} empty="No program data" />
            </ReportCard>
            <ReportCard title="By Study Center" subtitle="Top 10">
              <RankList rows={data.byCenter} empty="No center data" />
            </ReportCard>
            <ReportCard title="By Source">
              <RankList rows={data.bySource} empty="No source data" />
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-2xl bg-[#f4f6f3] p-4"><p className="text-xs text-slate-500">Provisional</p><p className="text-2xl font-semibold text-slate-900 mt-1">{data.summary?.provisional ?? 0}</p></div>
                <div className="rounded-2xl bg-[#f4f6f3] p-4"><p className="text-xs text-slate-500">Upgrades</p><p className="text-2xl font-semibold text-slate-900 mt-1">{data.summary?.upgrades ?? 0}</p></div>
              </div>
            </ReportCard>
          </div>
        </div>
      )}
    </div>
  );
}
