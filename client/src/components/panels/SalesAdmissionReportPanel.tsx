import { useState, useEffect } from 'react';
import { GraduationCap, BarChart3, PieChart, CalendarDays, Building2, BookOpen, TrendingUp, Inbox } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import api from '@/lib/api';
import { SalesReportFilters, DEFAULT_REPORT_FILTER, reportParams, type ReportFilter } from './SalesReportFilters';
import { ReportHeader, KpiTile, SectionCard, RankRow, EmptyState, LoadingRows, monthLabel } from './SalesReportKit';

export function SalesAdmissionReportPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ReportFilter>(DEFAULT_REPORT_FILTER);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/reports/admissions', { params: reportParams(filter) });
      setData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load admission report');
    } finally {
      setLoading(false);
    }
  };

  const trendData = Object.entries(data?.trends || {}).map(([name, admissions]) => ({ name, admissions }));
  const byUniv = Object.entries(data?.byUniversity || {}).sort((a: any, b: any) => b[1] - a[1]) as [string, number][];
  const byProg = Object.entries(data?.byProgram || {}).sort((a: any, b: any) => b[1] - a[1]) as [string, number][];
  const month = monthLabel(filter.month);
  const thisMonth = trendData[trendData.length - 1]?.admissions as number | undefined;

  return (
    <div className="space-y-6">
      <ReportHeader
        icon={GraduationCap}
        title="Admissions & Enrollment"
        subtitle="Successful admissions by university and program, with a six month trend."
        filters={<SalesReportFilters value={filter} onChange={setFilter} />}
        onRefresh={fetchData}
        loading={loading}
        chips={[month ?? 'All months']}
      />

      {!data && loading ? (
        <LoadingRows />
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiTile icon={GraduationCap} label="Total admissions" value={data.totalAdmissions} hint={month ?? 'all time'} tone="primary" />
            <KpiTile icon={Building2} label="Universities" value={byUniv.length} hint={byUniv[0] ? `Top: ${byUniv[0][0]}` : undefined} tone="info" />
            <KpiTile icon={BookOpen} label="Programs" value={byProg.length} hint={byProg[0] ? `Top: ${byProg[0][0]}` : undefined} tone="success" />
            <KpiTile icon={TrendingUp} label="This month" value={thisMonth ?? 0} hint="latest month in the trend" tone="warning" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SectionCard icon={CalendarDays} title="Admission trend, last 6 months" className="lg:col-span-2">
              <div className="h-[280px] w-full p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="admissions" name="Admissions" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard icon={PieChart} title="Top universities">
              {byUniv.length === 0 ? (
                <EmptyState icon={Inbox} text="No admissions for this selection." />
              ) : (
                <ul className="divide-y divide-border/50 max-h-[280px] overflow-y-auto">
                  {byUniv.map(([name, count], i) => (
                    <RankRow key={name} rank={i + 1} label={name} value={count} max={byUniv[0][1]} tone="info" />
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <SectionCard icon={BarChart3} title="Program breakdown">
            {byProg.length === 0 ? (
              <EmptyState icon={Inbox} text="No admissions for this selection." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-border/50">
                {byProg.map(([name, count], i) => (
                  <ul key={name} className="border-b border-border/50">
                    <RankRow rank={i + 1} label={name} value={count} max={byProg[0][1]} tone="success" />
                  </ul>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
