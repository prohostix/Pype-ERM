import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

import { CS, numLocale, compactMoney } from '@/lib/currency';
interface MonthlyRow {
  month: string;
  income: { total: number };
  expenditure: { total: number };
  net: number;
}

interface ReportData {
  period: { from: string; to: string };
  monthly: MonthlyRow[];
  totals: { income: number; expenditure: number; netProfit: number; profitMargin: number };
  incomeBreakdown: { invoices: number; enrollments: number; payments: number };
  expenditureBreakdown: { salaries: number; expenses: number; byCategory: { id: string; amount: number }[] };
}

const fmt = (n: number) =>
  numLocale() !== 'en-IN' ? compactMoney(n, 2) :
  n >= 100000 ? `${CS()}${(n / 100000).toFixed(2)}L` :
  n >= 1000 ? `${CS()}${(n / 1000).toFixed(1)}K` : `${CS()}${n.toLocaleString()}`;

const fmtMonth = (m: string) => {
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
};

export function ProfitLossPanel() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(() => {
    const now = new Date();
    const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${yr}-04-01`;
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/finance/reports/income-expenditure?from=${from}&to=${to}`);
      setData(res.data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const isProfit = (data?.totals?.netProfit ?? 0) >= 0;

  const chartData = (data?.monthly || []).map(m => ({
    name: fmtMonth(m.month),
    Revenue: m.income?.total ?? 0,
    Costs: m.expenditure?.total ?? 0,
    'Net P&L': m.net ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Profit & Loss Account</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Financial performance summary for the selected period.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 h-11 rounded-full border border-slate-200 bg-white px-4 text-sm">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="From date" className="bg-transparent outline-none text-slate-700" />
            <span className="text-slate-400">to</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="To date" className="bg-transparent outline-none text-slate-700" />
          </div>
          <Button onClick={fetchReport} disabled={loading} className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Apply
          </Button>
        </div>
      </div>

      {/* P&L Statement Card */}
      {data && (
        <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
          <CardHeader className="px-7">
            <CardTitle className="flex items-center gap-3 flex-wrap text-lg font-semibold tracking-tight">
              <span className={cn('w-10 h-10 rounded-2xl flex items-center justify-center', isProfit ? 'bg-[#eaf6e6] text-[#256c1d]' : 'bg-red-50 text-red-500')}>
                {isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </span>
              Profit & Loss Statement
              <span className="text-sm font-normal text-muted-foreground">
                {data.period?.from ? new Date(data.period.from).toLocaleDateString() : ''} – {data.period?.to ? new Date(data.period.to).toLocaleDateString() : ''}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-7">
            <div className="space-y-0 divide-y divide-slate-100">
              {/* INCOME section */}
              <PLSection title="INCOME" isHeader />
              <PLRow label="Invoice Revenue" amount={data.incomeBreakdown?.invoices ?? 0} indent={1} />
              <PLRow label="Enrollment Fees" amount={data.incomeBreakdown?.enrollments ?? 0} indent={1} />
              <PLRow label="Payment Entries" amount={data.incomeBreakdown?.payments ?? 0} indent={1} />
              <PLRow label="Gross Income" amount={data.totals?.income ?? 0} bold positive />

              {/* EXPENDITURE section */}
              <PLSection title="EXPENDITURE" isHeader />
              <PLRow label="Salaries & Payroll" amount={data.expenditureBreakdown?.salaries ?? 0} indent={1} />
              <PLRow label="Operational Expenses" amount={data.expenditureBreakdown?.expenses ?? 0} indent={1} />
              {(data.expenditureBreakdown?.byCategory || []).map(c => (
                <PLRow key={c.id} label={c.id} amount={c.amount ?? 0} indent={2} muted />
              ))}
              <PLRow label="Total Expenditure" amount={data.totals?.expenditure ?? 0} bold negative />

              {/* NET */}
              <div className={cn(
                'flex items-center justify-between p-5 rounded-2xl mt-3',
                isProfit ? 'bg-[#eaf6e6]' : 'bg-red-50'
              )}>
                <div>
                  <p className={cn('text-lg font-bold', isProfit ? 'text-[#256c1d]' : 'text-red-600')}>
                    {isProfit ? 'Net Profit' : 'Net Loss'}
                  </p>
                  <p className="text-xs text-muted-foreground">Profit margin: {data.totals?.profitMargin ?? 0}%</p>
                </div>
                <p className={cn('text-3xl font-semibold tracking-tight', isProfit ? 'text-[#256c1d]' : 'text-red-600')}>
                  {isProfit ? '+' : '-'}{fmt(Math.abs(data.totals?.netProfit ?? 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Area Chart */}
      <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
        <CardHeader className="px-7">
          <CardTitle className="text-lg font-semibold tracking-tight">Revenue vs Costs — Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-64 px-7">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for selected period</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ece6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => fmt(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e8ece6', borderRadius: '16px', fontSize: 12 }}
                  formatter={(v: number) => fmt(v)}
                />
                <Area type="monotone" dataKey="Revenue" stroke="#54b947" fill="#54b947" fillOpacity={0.12} strokeWidth={2.5} />
                <Area type="monotone" dataKey="Costs" stroke="#ef6f64" fill="#ef6f64" fillOpacity={0.1} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly P&L table */}
      {data && (data.monthly || []).length > 0 && (
        <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5 overflow-hidden">
          <CardHeader className="px-7"><CardTitle className="text-lg font-semibold tracking-tight">Monthly P&L Summary</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f4f6f3]">
                  <tr>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Month</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Costs</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Net P&L</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.monthly || []).map(row => {
                    const margin = (row.income?.total ?? 0) > 0 ? Math.round(((row.net ?? 0) / (row.income?.total ?? 1)) * 100) : 0;
                    return (
                      <tr key={row.month} className="hover:bg-[#f7faf6] transition-colors">
                        <td className="px-5 py-3.5 font-medium">{fmtMonth(row.month)}</td>
                        <td className="px-5 py-3.5 text-right text-[#256c1d] font-medium">{fmt(row.income?.total ?? 0)}</td>
                        <td className="px-5 py-3.5 text-right text-red-600 font-medium">{fmt(row.expenditure?.total ?? 0)}</td>
                        <td className={cn('px-5 py-3.5 text-right font-bold', (row.net ?? 0) >= 0 ? 'text-[#256c1d]' : 'text-red-600')}>
                          {(row.net ?? 0) >= 0 ? '+' : ''}{fmt(row.net ?? 0)}
                        </td>
                        <td className={cn('px-5 py-3.5 text-right text-sm', margin >= 0 ? 'text-[#256c1d]' : 'text-red-600')}>
                          {margin}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PLSection({ title }: { title: string; isHeader?: boolean }) {
  return (
    <div className="py-2 px-1">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
    </div>
  );
}

function PLRow({ label, amount, indent = 0, bold, positive, negative, muted }: {
  label: string; amount: number; indent?: number; bold?: boolean; positive?: boolean; negative?: boolean; muted?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between py-3 px-1',
      bold && 'font-semibold',
      muted && 'opacity-70'
    )}>
      <span className={cn('text-sm', indent === 1 && 'pl-4', indent === 2 && 'pl-8', muted && 'text-muted-foreground')}>
        {indent > 0 && <span className="text-muted-foreground mr-1">—</span>}
        {label}
      </span>
      <span className={cn(
        'text-sm tabular-nums',
        positive && 'text-[#256c1d] font-semibold',
        negative && 'text-red-600 font-semibold',
        !positive && !negative && 'text-foreground'
      )}>
        {fmt(amount)}
      </span>
    </div>
  );
}
