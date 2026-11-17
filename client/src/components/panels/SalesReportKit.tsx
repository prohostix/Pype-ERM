import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Shared building blocks so the four sales report pages look and behave the same */

export type Tone = 'primary' | 'success' | 'info' | 'warning' | 'danger';

const TONES: Record<Tone, { icon: string; bar: string; text: string; ring: string }> = {
  primary: { icon: 'bg-primary/10 text-primary', bar: 'bg-primary', text: 'text-primary', ring: 'from-primary/10' },
  success: { icon: 'bg-success/10 text-success', bar: 'bg-success', text: 'text-success', ring: 'from-success/10' },
  info:    { icon: 'bg-info/10 text-info',       bar: 'bg-info',    text: 'text-info',    ring: 'from-info/10' },
  warning: { icon: 'bg-warning/10 text-warning', bar: 'bg-warning', text: 'text-warning', ring: 'from-warning/10' },
  danger:  { icon: 'bg-destructive/10 text-destructive', bar: 'bg-destructive', text: 'text-destructive', ring: 'from-destructive/10' },
};

export function ReportHeader({ icon: Icon, title, subtitle, filters, onRefresh, loading, chips }: {
  icon: LucideIcon;
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
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 text-primary shadow-sm shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border bg-card/60 backdrop-blur px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">{filters}</div>
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span key={c} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">{c}</span>
          ))}
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}

export function KpiTile({ icon: Icon, label, value, hint, tone = 'primary', loading }: {
  icon: LucideIcon; label: string; value: ReactNode; hint?: string; tone?: Tone; loading?: boolean;
}) {
  const t = TONES[tone];
  return (
    <Card className={cn('relative overflow-hidden border shadow-sm bg-gradient-to-br to-card', t.ring)}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn('p-3 rounded-xl shrink-0', t.icon)}><Icon className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums leading-tight mt-0.5">{loading ? <span className="inline-block h-7 w-16 rounded bg-muted animate-pulse" /> : value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-0.5 truncate">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionCard({ icon: Icon, title, right, children, className }: {
  icon: LucideIcon; title: string; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <Card className={cn('border shadow-sm overflow-hidden', className)}>
      <CardHeader className="py-3.5 px-5 border-b bg-muted/20 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {title}
        </CardTitle>
        {right}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold flex items-center justify-center shrink-0 border border-primary/10">
      {initials}
    </div>
  );
}

export function ProgressBar({ value, tone, className }: { value: number; tone?: Tone; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const t = TONES[tone ?? (value >= 100 ? 'success' : value >= 50 ? 'warning' : 'danger')];
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-muted overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all duration-500', t.bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** A ranked list row: label, a bar scaled to the largest value, and the count */
export function RankRow({ rank, label, value, max, tone = 'primary' }: { rank: number; label: string; value: number; max: number; tone?: Tone }) {
  return (
    <li className="px-5 py-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="w-5 text-xs font-bold text-muted-foreground tabular-nums">{rank}</span>
          <span className="text-sm font-medium truncate">{label}</span>
        </span>
        <span className={cn('text-sm font-bold tabular-nums', TONES[tone].text)}>{value}</span>
      </div>
      <ProgressBar value={max > 0 ? (value / max) * 100 : 0} tone={tone} />
    </li>
  );
}

export function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="py-14 text-center">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-muted-foreground/60" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function LoadingRows() {
  return (
    <div className="p-5 space-y-3">
      {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 rounded-lg bg-muted/50 animate-pulse" />)}
    </div>
  );
}

/** "November 2026" for a month filter, or null for all months */
export function monthLabel(month: string): string | null {
  if (month === 'all') return null;
  return new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
