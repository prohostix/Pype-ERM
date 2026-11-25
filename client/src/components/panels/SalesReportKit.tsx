import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { CS, numLocale } from '@/lib/currency';
/** Shared building blocks so the four sales report pages look and behave the same */

export type Tone = 'primary' | 'success' | 'info' | 'warning' | 'danger';

const TONES: Record<Tone, { icon: string; bar: string; text: string; ring: string }> = {
  primary: { icon: 'bg-[#eaf6e6] text-[#256c1d]', bar: 'bg-[#54b947]', text: 'text-slate-900', ring: '' },
  success: { icon: 'bg-[#eaf6e6] text-[#256c1d]', bar: 'bg-[#54b947]', text: 'text-[#256c1d]', ring: '' },
  info:    { icon: 'bg-sky-50 text-sky-600',      bar: 'bg-[#8ae47e]', text: 'text-slate-900', ring: '' },
  warning: { icon: 'bg-amber-50 text-amber-600',  bar: 'bg-amber-400', text: 'text-amber-600', ring: '' },
  danger:  { icon: 'bg-red-50 text-red-600',      bar: 'bg-red-400',   text: 'text-red-600',   ring: '' },
};

// The icon props are kept so existing pages keep compiling; the new design does not show them.
export function ReportHeader({ title, subtitle, filters, onRefresh, loading, chips }: {
  icon?: LucideIcon;
  title: string;
  subtitle: string;
  filters: ReactNode;
  onRefresh: () => void;
  loading: boolean;
  /** what the numbers currently cover, e.g. "November 2026" */
  chips: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-sm mt-1.5">{subtitle}</p>
        </div>
        <Button variant="outline" onClick={onRefresh} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-3xl bg-white border border-slate-100 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">{filters}</div>
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span key={c} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#eaf6e6] text-[#256c1d]">{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function KpiTile({ label, value, hint, tone = 'primary', loading }: {
  icon?: LucideIcon; label: string; value: ReactNode; hint?: string; tone?: Tone; loading?: boolean;
}) {
  const t = TONES[tone];
  return (
    <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={cn('text-3xl font-semibold tracking-tight tabular-nums mt-2', tone === 'success' || tone === 'danger' || tone === 'warning' ? t.text : 'text-slate-900')}>
        {loading ? <span className="inline-block h-8 w-20 rounded-lg bg-slate-100 animate-pulse" /> : value}
      </p>
      {hint && <p className="text-xs text-muted-foreground mt-1.5 truncate">{hint}</p>}
    </div>
  );
}

export function SectionCard({ title, right, children, className }: {
  icon?: LucideIcon; title: string; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <div className={cn('rounded-3xl bg-white border border-slate-100 overflow-hidden', className)}>
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {right}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (
    <div className="w-10 h-10 rounded-2xl bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
}

export function ProgressBar({ value, tone, className }: { value: number; tone?: Tone; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const t = TONES[tone ?? (value >= 100 ? 'success' : value >= 50 ? 'info' : 'warning')];
  return (
    <div className={cn('h-2 w-full rounded-full bg-[#f1f2ef] overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all duration-500', t.bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** A ranked list row: label, a bar scaled to the largest value, and the count */
export function RankRow({ rank, label, value, max, tone = 'primary' }: { rank: number; label: string; value: number; max: number; tone?: Tone }) {
  return (
    <li className="px-6 py-3.5 hover:bg-[#f7faf6] transition-colors">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-[#f4f6f3] text-xs font-semibold text-slate-600 tabular-nums flex items-center justify-center">{rank}</span>
          <span className="text-sm font-medium text-slate-900 truncate">{label}</span>
        </span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">{value}</span>
      </div>
      <ProgressBar value={max > 0 ? (value / max) * 100 : 0} tone={tone} />
    </li>
  );
}

export function EmptyState({ text }: { icon?: LucideIcon; text: string }) {
  return (
    <div className="py-14 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function LoadingRows() {
  return (
    <div className="p-5 space-y-3">
      {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded-2xl bg-slate-100 animate-pulse" />)}
    </div>
  );
}

/** "November 2026" for a month filter, or null for all months */
export function monthLabel(month: string): string | null {
  if (month === 'all') return null;
  return new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export const inr = (n: number) => `${CS()}${Number(n || 0).toLocaleString(numLocale())}`;
