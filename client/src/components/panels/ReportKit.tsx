import type { ReactNode } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Brand-green chart palette shared by the operations report pages. */
export const REPORT_COLORS = ['#54b947', '#8ae47e', '#256c1d', '#b8d8b0', '#0b1d14', '#64748b'];

export const reportTooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e8ece6',
  borderRadius: '16px',
  fontSize: 12,
};

export const reportGridStroke = '#e8ece6';

/** Plain page header: title, one-line description, Refresh and Export actions on the right. */
export function ReportHeader({
  title, description, loading, onRefresh, onExport,
}: { title: string; description: string; loading?: boolean; onRefresh?: () => void; onExport?: () => void }) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-sm mt-1.5">{description}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {onRefresh && (
          <Button variant="outline" onClick={onRefresh} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
        <Button onClick={onExport} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}

/** White rounded card with a title, optional subtitle and a body. */
export function ReportCard({
  title, subtitle, className = '', children,
}: { title: string; subtitle?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-3xl bg-white border border-slate-100 overflow-hidden ${className}`}>
      <div className="px-6 py-5 border-b border-slate-100">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

/** Large headline figure shown at the top of a report. */
export function ReportTotal({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-100 p-6 sm:p-7">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 mt-2">{value}</p>
      {note && <p className="text-sm text-muted-foreground mt-2">{note}</p>}
    </div>
  );
}

export function ReportEmpty({ message }: { message: string }) {
  return <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">{message}</div>;
}

export function ReportLoading() {
  return (
    <div className="space-y-4">
      <div className="h-28 bg-slate-100 rounded-3xl animate-pulse" />
      <div className="h-72 bg-slate-100 rounded-3xl animate-pulse" />
    </div>
  );
}

/** Divided stat strip (no icons). tone colours only the number. */
export function ReportStats({
  items,
}: { items: { label: string; value: ReactNode; note?: string; tone?: 'good' | 'warn' | 'bad' }[] }) {
  const tone = (t?: string) => (t === 'good' ? 'text-[#256c1d]' : t === 'warn' ? 'text-amber-600' : t === 'bad' ? 'text-red-600' : 'text-slate-900');
  return (
    <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(0,1fr))] divide-x divide-y lg:divide-y-0 divide-slate-100">
        {items.map(({ label, value, note, tone: t }) => (
          <div key={label} className="p-5 sm:p-6">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className={`text-3xl font-semibold tracking-tight mt-2 ${tone(t)}`}>{value}</p>
            {note && <p className="text-xs text-muted-foreground mt-1.5">{note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ranked list with a proportional bar for each row. */
export function RankList({
  rows, empty = 'No data', suffix = '',
}: { rows: { name: string; value: number }[]; empty?: string; suffix?: string }) {
  if (!rows || rows.length === 0) return <ReportEmpty message={empty} />;
  const max = Math.max(...rows.map(r => r.value), 1);
  const total = rows.reduce((n, r) => n + r.value, 0) || 1;
  return (
    <div className="space-y-3">
      {rows.map(r => (
        <div key={r.name} className="rounded-2xl bg-[#f4f6f3] px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-900 truncate">{r.name}</span>
            <span className="shrink-0 text-slate-600"><span className="font-semibold text-slate-900">{r.value.toLocaleString()}</span>{suffix} · {Math.round((r.value / total) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white mt-2 overflow-hidden">
            <div className="h-full rounded-full bg-[#54b947]" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Download an array of flat objects as a CSV file. Returns false when there is nothing to export. */
export function downloadCsv(filename: string, rows: Record<string, string | number | null | undefined>[]): boolean {
  if (!rows.length) return false;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const t = v == null ? '' : String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
