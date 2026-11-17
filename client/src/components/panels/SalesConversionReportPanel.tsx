import { useState, useEffect } from 'react';
import { Filter, BarChart, Percent, Skull, Phone, ThumbsUp, BadgeCheck, Inbox } from 'lucide-react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import api from '@/lib/api';
import { SalesReportFilters, DEFAULT_REPORT_FILTER, reportParams, type ReportFilter } from './SalesReportFilters';
import { ReportHeader, KpiTile, SectionCard, ProgressBar, EmptyState, LoadingRows, monthLabel, type Tone } from './SalesReportKit';

const STAGE_STYLE: { color: string; tone: Tone; icon: any }[] = [
  { color: 'hsl(var(--primary))', tone: 'primary', icon: Inbox },
  { color: 'hsl(var(--info))', tone: 'info', icon: Phone },
  { color: 'hsl(var(--warning))', tone: 'warning', icon: ThumbsUp },
  { color: 'hsl(var(--success))', tone: 'success', icon: BadgeCheck },
];

export function SalesConversionReportPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ReportFilter>(DEFAULT_REPORT_FILTER);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/reports/conversions', { params: reportParams(filter) });
      setData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load conversion report');
    } finally {
      setLoading(false);
    }
  };

  const funnel: { name: string; value: number }[] = data?.funnel || [];
  const total = funnel[0]?.value || 0;
  const month = monthLabel(filter.month);

  return (
    <div className="space-y-6">
      <ReportHeader
        icon={Filter}
        title="Lead Conversion Funnel"
        subtitle="How leads move through the pipeline, and where they drop off."
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
            <KpiTile icon={Percent} label="Overall conversion" value={`${data.overallConversionRate}%`} hint="leads to converted" tone="success" />
            <KpiTile icon={Inbox} label="Total leads" value={total} hint={month ?? 'all time'} tone="primary" />
            <KpiTile icon={BadgeCheck} label="Converted" value={funnel[3]?.value ?? 0} tone="success" />
            <KpiTile icon={Skull} label="Dead leads" value={data.deadLeads} hint="not progressing" tone="danger" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <SectionCard icon={BarChart} title="Funnel drop-off" className="lg:col-span-3">
              {total === 0 ? (
                <EmptyState icon={Inbox} text="No leads for this selection." />
              ) : (
                <div className="h-[300px] w-full p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={funnel} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} width={90} />
                      <ReTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={34}>
                        {funnel.map((_e, i) => <Cell key={i} fill={STAGE_STYLE[i % STAGE_STYLE.length].color} />)}
                      </Bar>
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>

            <SectionCard icon={Filter} title="Stage by stage" className="lg:col-span-2">
              <ul className="divide-y divide-border/50">
                {funnel.map((stage, i) => {
                  const prev = i === 0 ? stage.value : funnel[i - 1].value;
                  const st = STAGE_STYLE[i % STAGE_STYLE.length];
                  const kept = prev > 0 ? Math.round((stage.value / prev) * 100) : 0;
                  return (
                    <li key={stage.name} className="px-5 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2.5 text-sm font-medium">
                          <st.icon className="w-4 h-4 text-muted-foreground" />
                          {stage.name}
                        </span>
                        <span className="text-lg font-bold tabular-nums">{stage.value}</span>
                      </div>
                      <div className="flex items-center gap-2.5 mt-2">
                        <ProgressBar value={total > 0 ? (stage.value / total) * 100 : 0} tone={st.tone} />
                        <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                          {i === 0 ? 'start' : `${kept}% of previous`}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
