/** Report card shown inside an AI chat message: chart, table, filter chips, export. */
import { useState } from 'react';
import { X, Download, Table2, BarChart3, LineChart as LineIcon, PieChart as PieIcon, Lock } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { type ChartType, type Column, type Result, type Spec, compact, fmt, isMoney, nf, prettyBucket } from './reportUtils';

const SERIES = Array.from({ length: 8 }, (_, i) => `var(--viz-${i + 1})`);
const MAX_SERIES = 7; // 8th slot is "Other"
const OP_LABEL: Record<string, string> = {
  eq: '=', neq: '≠', in: 'in', gt: '>', gte: '≥', lt: '<', lte: '≤', contains: 'contains', is_empty: 'is empty', not_empty: 'is not empty',
};

const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);
const dimsOf = (spec: Spec) => [...(spec.timeBucket ? [spec.timeBucket.field] : []), ...spec.groupBy];

export function ReportCard({ result, fieldLabel, busy, onChangeSpec }: {
  result: Result;
  fieldLabel: (key: string) => string;
  busy?: boolean;
  onChangeSpec: (spec: Spec) => void;
}) {
  const [chart, setChart] = useState<ChartType>(result.spec.chart);
  const [metricKey, setMetricKey] = useState('');
  const { spec } = result;
  const timeKey = spec.timeBucket?.field;
  const isKpi = spec.mode === 'aggregate' && dimsOf(spec).length === 0; // single number: tiles only, no 1-row table

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.json_to_sheet(result.rows.map((r) =>
      Object.fromEntries(result.columns.map((c) => [
        c.label,
        c.type === 'number' ? r[c.key] : c.key === timeKey ? prettyBucket(r[c.key]) : fmt(r[c.key], c),
      ]))));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Report');
    XLSX.writeFile(book, `${spec.title.replace(/[^\w\- ]+/g, '').trim() || 'report'}.xlsx`);
    toast.success('Report exported');
  };

  return (
    <div className={cn('w-full rounded-xl border bg-card', busy && 'opacity-60 transition-opacity')}>
      <div className="space-y-2 border-b p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{spec.title}</div>
            {result.access && (
              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground" title="Access restriction applied by the server">
                <Lock className="h-3 w-3 shrink-0" /> {result.access}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ChartToggle spec={spec} value={chart} onChange={setChart} />
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={exportExcel} title="Export to Excel">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {spec.filters.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {spec.filters.map((f, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1 text-[11px] font-normal">
                {fieldLabel(f.field)} {OP_LABEL[f.op] ?? f.op} {f.values ? f.values.join(', ') : prettyBucket(f.value)}
                <button
                  onClick={() => onChangeSpec({ ...spec, filters: spec.filters.filter((_, j) => j !== i) })}
                  disabled={busy}
                  className="min-h-0 rounded p-0.5 hover:bg-background"
                  aria-label="Remove filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-3 p-3">
        {result.rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No data matches this report.</div>
        ) : (
          <>
            <ReportChart result={result} chart={chart} metricKey={metricKey} onMetricChange={setMetricKey} />
            {!isKpi && <ReportTable result={result} />}
          </>
        )}
        <p className="text-[11px] text-muted-foreground">
          {isKpi
            ? `Based on ${nf.format(result.meta.scannedRows)} ${plural(result.meta.scannedRows, 'record')}`
            : spec.mode === 'aggregate'
              ? `${result.rows.length}${result.meta.totalGroups && result.meta.totalGroups > result.rows.length ? ` of ${result.meta.totalGroups}` : ''} ${plural(result.rows.length, 'group')} from ${nf.format(result.meta.scannedRows)} ${plural(result.meta.scannedRows, 'record')}`
              : `${result.rows.length} ${plural(result.rows.length, 'record')}`}
          {result.meta.truncated && ' · Result limited — add filters to narrow it down.'}
        </p>
      </div>
    </div>
  );
}

function ChartToggle({ spec, value, onChange }: { spec: Spec; value: ChartType; onChange: (c: ChartType) => void }) {
  const dims = dimsOf(spec).length;
  if (spec.mode === 'list' || dims === 0) return null;
  const options: { type: ChartType; icon: typeof BarChart3; label: string }[] = [
    { type: 'bar', icon: BarChart3, label: 'Bar chart' },
    { type: 'line', icon: LineIcon, label: 'Line chart' },
    ...(dims === 1 ? [{ type: 'pie' as ChartType, icon: PieIcon, label: 'Pie chart' }] : []),
    { type: 'table', icon: Table2, label: 'Table only' },
  ];
  return (
    <div className="flex rounded-md border p-0.5">
      {options.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          title={label}
          aria-label={label}
          aria-pressed={value === type}
          className={cn('min-h-0 rounded px-1.5 py-1 text-muted-foreground transition-colors hover:text-foreground', value === type && 'bg-muted text-foreground')}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' },
  labelStyle: { color: 'hsl(var(--muted-foreground))', marginBottom: 4 },
  cursor: { fill: 'hsl(var(--muted))', opacity: 0.5 },
};
const axisProps = { tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }, tickLine: false, axisLine: false };

function ReportChart({ result, chart, metricKey, onMetricChange }: {
  result: Result; chart: ChartType; metricKey: string; onMetricChange: (k: string) => void;
}) {
  const { spec, columns, rows } = result;
  const dims = dimsOf(spec);
  const metrics = columns.filter((c) => c.type === 'number' && !dims.includes(c.key));
  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0];
  const xKey = dims[0];
  const xLabel = (v: unknown) => (xKey === spec.timeBucket?.field ? prettyBucket(v) : String(v));

  const pivot = (() => {
    if (!metric || dims.length !== 2) return null;
    const sKey = dims[1];
    const totals = new Map<string, number>();
    rows.forEach((r) => totals.set(String(r[sKey]), (totals.get(String(r[sKey])) ?? 0) + Number(r[metric.key] ?? 0)));
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const keep = ranked.length > MAX_SERIES + 1 ? ranked.slice(0, MAX_SERIES) : ranked;
    const byX = new Map<string, Record<string, unknown>>();
    rows.forEach((r) => {
      const x = String(r[xKey]);
      const s = keep.includes(String(r[sKey])) ? String(r[sKey]) : 'Other';
      const row = byX.get(x) ?? { [xKey]: x };
      row[s] = Number(row[s] ?? 0) + Number(r[metric.key] ?? 0);
      byX.set(x, row);
    });
    const data = [...byX.values()];
    if (spec.timeBucket) data.sort((a, b) => String(a[xKey]).localeCompare(String(b[xKey])));
    return { data, series: [...keep, ...(ranked.length > keep.length ? ['Other'] : [])] };
  })();

  // Headline numbers
  if (spec.mode === 'aggregate' && dims.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.key} className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{m.label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{fmt(rows[0]?.[m.key], m)}</div>
          </div>
        ))}
      </div>
    );
  }
  if (spec.mode === 'list' || chart === 'table' || chart === 'kpi' || !metric) return null;

  const valueFmt = (v: number) => (isMoney(metric.key) ? '₹' : '') + compact.format(v);
  const data = pivot?.data ?? rows;
  const series = pivot ? pivot.series.map((k) => ({ key: k, label: k })) : [{ key: metric.key, label: metric.label }];

  const metricPicker = metrics.length > 1 && (
    <div className="mb-2 flex flex-wrap gap-1">
      {metrics.map((m) => (
        <button
          key={m.key}
          onClick={() => onMetricChange(m.key)}
          className={cn('min-h-0 rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground', m.key === metric.key && 'border-primary text-foreground')}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  if (chart === 'pie' && dims.length === 1) {
    const positive = rows.filter((r) => Number(r[metric.key]) > 0);
    const rest = positive.slice(MAX_SERIES).reduce((s, r) => s + Number(r[metric.key]), 0);
    const pieData = [
      ...positive.slice(0, MAX_SERIES).map((r) => ({ name: xLabel(r[xKey]), value: Number(r[metric.key]) })),
      ...(rest > 0 ? [{ name: 'Other', value: rest }] : []),
    ];
    return (
      <div>
        {metricPicker}
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie isAnimationActive={false} data={pieData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={1} stroke="hsl(var(--card))" strokeWidth={2}>
              {pieData.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v: number) => fmt(v, metric)} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const common = { data, margin: { top: 8, right: 8, left: 0, bottom: 0 } };
  const xAxis = (
    <XAxis dataKey={xKey} {...axisProps} interval="preserveStartEnd" minTickGap={12}
      tickFormatter={(v: string) => { const s = xLabel(v); return s.length > 16 ? s.slice(0, 15) + '…' : s; }} />
  );
  const yAxis = <YAxis {...axisProps} width={56} tickFormatter={valueFmt} />;
  const grid = <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />;
  const tip = (
    <Tooltip {...tooltipStyle} labelFormatter={xLabel}
      formatter={(v: number, name: string) => [fmt(v, metric), series.length > 1 ? name : metric.label]} />
  );
  const legend = series.length > 1 ? <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /> : null;

  return (
    <div>
      {metricPicker}
      <ResponsiveContainer width="100%" height={280}>
        {chart === 'line' ? (
          <LineChart {...common}>
            {grid}{xAxis}{yAxis}{tip}{legend}
            {series.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={SERIES[i]} strokeWidth={2} isAnimationActive={false}
                dot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))', fill: SERIES[i] }} activeDot={{ r: 5 }} connectNulls />
            ))}
          </LineChart>
        ) : (
          <BarChart {...common} barCategoryGap="20%" barGap={2}>
            {grid}{xAxis}{yAxis}{tip}{legend}
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={SERIES[i]} radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false} maxBarSize={40} stackId={series.length > 1 ? 'stack' : undefined} stroke="hsl(var(--card))" strokeWidth={series.length > 1 ? 1 : 0} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function ReportTable({ result }: { result: Result }) {
  const { columns, rows, spec } = result;
  const cell = (r: Record<string, unknown>, c: Column) => (c.key === spec.timeBucket?.field ? prettyBucket(r[c.key]) : fmt(r[c.key], c));
  return (
    <div className="max-h-[320px] overflow-auto rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={cn('h-9 whitespace-nowrap text-xs', c.type === 'number' && 'text-right')}>{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {columns.map((c) => (
                <TableCell key={c.key} className={cn('whitespace-nowrap py-2 text-xs', c.type === 'number' && 'text-right tabular-nums')}>{cell(r, c)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
