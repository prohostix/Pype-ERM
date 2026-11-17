import { useState, useEffect } from 'react';
import { UserSquare2, BarChart, Phone, CheckCircle2, TrendingUp, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { SalesReportFilters, DEFAULT_REPORT_FILTER, reportParams, type ReportFilter } from './SalesReportFilters';
import { ReportHeader, KpiTile, SectionCard, Avatar, ProgressBar, EmptyState, LoadingRows, monthLabel } from './SalesReportKit';

export function SalesCounselorReportPanel() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ReportFilter>(DEFAULT_REPORT_FILTER);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/reports/counselor', { params: reportParams(filter) });
      setData(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load counselor report');
    } finally {
      setLoading(false);
    }
  };

  const totalLeads = data.reduce((a, c) => a + c.totalLeads, 0);
  const totalConverted = data.reduce((a, c) => a + c.convertedLeads, 0);
  const tasksDone = data.reduce((a, c) => a + c.completedTasks, 0);
  const tasksAll = data.reduce((a, c) => a + c.totalTasks, 0);
  const avgConversion = data.length > 0 ? Math.round(data.reduce((a, c) => a + c.conversionRate, 0) / data.length) : 0;
  const ranked = [...data].sort((a, b) => b.enrollments - a.enrollments || b.convertedLeads - a.convertedLeads);
  const month = monthLabel(filter.month);
  const rateTone = (r: number) => (r >= 10 ? 'text-success' : r >= 5 ? 'text-warning' : 'text-destructive');

  return (
    <div className="space-y-6">
      <ReportHeader
        icon={UserSquare2}
        title="Counselor Performance"
        subtitle="Leads, tasks and enrollments for each counselor."
        filters={<SalesReportFilters value={filter} onChange={setFilter} />}
        onRefresh={fetchData}
        loading={loading}
        chips={[month ?? 'All months']}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTile icon={UserSquare2} label="Counselors" value={data.length} hint="in this report" tone="primary" loading={loading && !data.length} />
        <KpiTile icon={Phone} label="Leads handled" value={totalLeads} hint={`${totalConverted} converted`} tone="info" loading={loading && !data.length} />
        <KpiTile icon={CheckCircle2} label="Tasks completed" value={tasksDone} hint={`of ${tasksAll} assigned`} tone="success" loading={loading && !data.length} />
        <KpiTile icon={TrendingUp} label="Avg conversion" value={`${avgConversion}%`} hint="leads to converted" tone="warning" loading={loading && !data.length} />
      </div>

      <SectionCard icon={BarChart} title="Individual counselor breakdown" right={<span className="text-xs text-muted-foreground">Ranked by enrollments</span>}>
        {loading && !data.length ? (
          <LoadingRows />
        ) : data.length === 0 ? (
          <EmptyState icon={UserX} text="No counselors found for this selection." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 text-left font-semibold">Counselor</th>
                  <th className="px-4 py-3 text-center font-semibold">Leads</th>
                  <th className="px-4 py-3 text-center font-semibold">Converted</th>
                  <th className="px-4 py-3 text-left font-semibold w-44">Conversion</th>
                  <th className="px-4 py-3 text-left font-semibold w-44">Tasks</th>
                  <th className="px-5 py-3 text-right font-semibold">Enrollments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {ranked.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{c.name}</p>
                          <p className={cn('text-xs capitalize', c.status === 'active' ? 'text-success' : 'text-muted-foreground')}>{c.status}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium tabular-nums">{c.totalLeads}</td>
                    <td className="px-4 py-3 text-center font-semibold tabular-nums text-success">{c.convertedLeads}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ProgressBar value={c.conversionRate} tone={c.conversionRate >= 10 ? 'success' : c.conversionRate >= 5 ? 'warning' : 'danger'} />
                        <span className={cn('text-xs font-bold tabular-nums w-10 text-right', rateTone(c.conversionRate))}>{c.conversionRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ProgressBar value={c.totalTasks > 0 ? (c.completedTasks / c.totalTasks) * 100 : 0} tone="info" />
                        <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">{c.completedTasks}/{c.totalTasks}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-base font-bold tabular-nums text-primary">{c.enrollments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
