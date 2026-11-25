import { useState, useEffect } from 'react';
import { Users, TrendingUp, Target, IndianRupee, BarChart, UserX, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { SalesTeamMemberPage } from './SalesTeamMemberPage';
import { SalesReportFilters, DEFAULT_REPORT_FILTER, reportParams, type ReportFilter } from './SalesReportFilters';
import { ReportHeader, KpiTile, SectionCard, Avatar, ProgressBar, EmptyState, LoadingRows, monthLabel, inr } from './SalesReportKit';

export function SalesTeamReportPanel() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ReportFilter>(DEFAULT_REPORT_FILTER);

  // Clicking a member opens their own page; Back returns here with the same filters
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/reports/team', { params: reportParams(filter) });
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
  const ranked = [...data].sort((a, b) => b.revenue - a.revenue || b.enrollments - a.enrollments);
  const topRevenue = ranked[0]?.revenue || 0;
  const month = monthLabel(filter.month);

  if (selected) {
    return <SalesTeamMemberPage member={selected} filter={filter} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-6">
      <ReportHeader
        icon={Users}
        title="Team Performance"
        subtitle="Enrollments, revenue and target progress for everyone in your team."
        filters={<SalesReportFilters value={filter} onChange={setFilter} />}
        onRefresh={fetchData}
        loading={loading}
        chips={[month ?? 'All months']}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTile icon={Users} label="Team size" value={data.length} hint="people in this report" tone="primary" loading={loading && !data.length} />
        <KpiTile icon={TrendingUp} label="Enrollments" value={totalEnrollments} hint={month ?? 'all time'} tone="success" loading={loading && !data.length} />
        <KpiTile icon={Target} label="Target progress" value={`${avgProgress}%`} hint={`${totalEnrollments} of ${totalTargets} target`} tone="warning" loading={loading && !data.length} />
        <KpiTile icon={IndianRupee} label="Revenue" value={inr(totalRevenue)} hint={month ?? 'all time'} tone="info" loading={loading && !data.length} />
      </div>

      <SectionCard icon={BarChart} title="Team member breakdown" right={<span className="text-xs text-muted-foreground">Ranked by revenue · click a member for details</span>}>
        {loading && !data.length ? (
          <LoadingRows />
        ) : data.length === 0 ? (
          <EmptyState icon={UserX} text="No team members found for this selection." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f4f6f3] text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 text-left font-semibold">Member</th>
                  <th className="px-4 py-3 text-center font-semibold">Enrollments</th>
                  <th className="px-4 py-3 text-center font-semibold">Target</th>
                  <th className="px-4 py-3 text-left font-semibold w-48">Progress</th>
                  <th className="px-5 py-3 text-right font-semibold">Revenue</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranked.map((member, idx) => (
                  <tr
                    key={member.id}
                    className="hover:bg-[#f7faf6] transition-colors cursor-pointer"
                    onClick={() => setSelected(member)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setSelected(member); }}
                    tabIndex={0}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.name} />
                        <div className="min-w-0">
                          <p className="font-semibold truncate text-slate-900">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.designation}</p>
                        </div>
                        {idx === 0 && member.revenue > 0 && (
                          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#dff3da] text-[#256c1d]">Top</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold tabular-nums text-slate-900">{member.enrollments}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{member.targetTotal || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ProgressBar value={member.targetProgress} />
                        <span className="text-xs font-semibold tabular-nums w-10 text-right">{member.targetProgress}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <p className="font-semibold tabular-nums">{inr(member.revenue)}</p>
                      <ProgressBar value={topRevenue > 0 ? (member.revenue / topRevenue) * 100 : 0} tone="info" className="mt-1.5 ml-auto w-24 h-1.5" />
                    </td>
                    <td className="pr-4 text-slate-400"><ChevronRight className="w-4 h-4" /></td>
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
