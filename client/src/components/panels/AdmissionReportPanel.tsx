import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ReportHeader, ReportCard, ReportStats, RankList, ReportEmpty, ReportLoading, downloadCsv, REPORT_COLORS, reportTooltipStyle, reportGridStroke } from './ReportKit';
import { toast } from 'sonner';
import api from '@/lib/api';


export function AdmissionReportPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operations/reports/admissions');
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch admission report', error);
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
      ...(data.byUniversity || []).map((r: any) => ({ Section: 'By University', Name: r.name, Count: r.value })),
      ...(data.byProgram || []).map((r: any) => ({ Section: 'By Program', Name: r.name, Count: r.value })),
      ...(data.byBranch || []).map((r: any) => ({ Section: 'By Branch', Name: r.name, Count: r.value })),
      ...(data.byCenter || []).map((r: any) => ({ Section: 'By Center', Name: r.name, Count: r.value })),
      ...(data.bySource || []).map((r: any) => ({ Section: 'By Source', Name: r.name, Count: r.value })),
      ...(data.byStatus || []).map((r: any) => ({ Section: 'By Status', Name: r.name, Count: r.value })),
      ...(data.trends || []).map((r: any) => ({ Section: 'Monthly Trend', Name: r.name, Count: r.count })),
    ];
    if (!downloadCsv('admission_report.csv', rows)) toast.warning('No data to export');
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Admission Report"
        description="Track organization-wide admissions, conversions, and pipeline metrics"
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
              { label: 'Total Admissions', value: data.totalAdmissions },
              { label: 'This Month', value: data.summary?.thisMonth ?? 0, note: data.summary?.changePct == null ? 'No previous month to compare' : `${data.summary.changePct >= 0 ? '+' : ''}${data.summary.changePct}% vs last month`, tone: data.summary?.changePct == null ? undefined : data.summary.changePct >= 0 ? 'good' : 'bad' },
              { label: 'Admitted', value: data.summary?.admitted ?? 0, tone: 'good' },
              { label: 'Pending', value: data.summary?.pending ?? 0, tone: (data.summary?.pending ?? 0) > 0 ? 'warn' : undefined },
              { label: 'Cancelled', value: data.summary?.cancelled ?? 0, tone: (data.summary?.cancelled ?? 0) > 0 ? 'bad' : undefined },
            ]}
          />

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <ReportCard className="lg:col-span-2" title="Monthly Admissions Trend" subtitle="Last 6 months">
              <div className="h-[300px]">
                {data.trends?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={reportGridStroke} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f4f6f3' }} contentStyle={reportTooltipStyle} />
                      <Bar dataKey="count" name="Admissions" fill="#54b947" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <ReportEmpty message="No trend data" />}
              </div>
            </ReportCard>

            <ReportCard title="Admissions by Status">
              <div className="h-[300px]">
                {data.byStatus?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.byStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {data.byStatus.map((_e: any, i: number) => <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />)}
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
            <ReportCard title="Admissions by University">
              <RankList rows={data.byUniversity} empty="No university data" />
            </ReportCard>
            <ReportCard title="Admissions by Program">
              <RankList rows={data.byProgram} empty="No program data" />
            </ReportCard>
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <ReportCard title="By Branch">
              <RankList rows={data.byBranch} empty="No branch data" />
            </ReportCard>
            <ReportCard title="By Study Center" subtitle="Top 10">
              <RankList rows={data.byCenter} empty="No center data" />
            </ReportCard>
            <ReportCard title="By Source">
              <RankList rows={data.bySource} empty="No source data" />
            </ReportCard>
          </div>
        </div>
      )}
    </div>
  );
}
