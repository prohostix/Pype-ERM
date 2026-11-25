import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line,
} from 'recharts';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

import { CS, numLocale, compactMoney } from '@/lib/currency';
interface MonthlyRow {
  month: string;
  income: { invoices: number; enrollments: number; payments: number; total: number };
  expenditure: { expenses: number; salaries: number; total: number };
  net: number;
}

interface ReportData {
  period: { from: string; to: string };
  monthly: MonthlyRow[];
  totals: { income: number; expenditure: number; netProfit: number; profitMargin: number };
  incomeBreakdown: { invoices: number; enrollments: number; payments: number };
  expenditureBreakdown: { salaries: number; expenses: number; byCategory: { id: string; amount: number; count: number }[] };
}

const fmt = (n: number) =>
  numLocale() !== 'en-IN' ? compactMoney(n, 1) :
  n >= 100000 ? `${CS()}${(n / 100000).toFixed(1)}L` :
  n >= 1000 ? `${CS()}${(n / 1000).toFixed(1)}K` : `${CS()}${n.toLocaleString()}`;

const fmtMonth = (m: string) => {
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
};

export function IncomeExpenditurePanel() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(() => {
    const now = new Date();
    const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${yr}-04-01`;
  });
  const [to, setTo] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });

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

  const chartData = (data?.monthly || []).map(m => ({
    name: fmtMonth(m.month),
    Income: m.income?.total ?? 0,
    Expenditure: m.expenditure?.total ?? 0,
    Net: m.net ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Income & Expenditure</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Monthly breakdown of all income and expenditure.</p>
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

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            label="Total Income"
            value={fmt(data.totals?.income ?? 0)}
            icon={<TrendingUp className="w-5 h-5" />}
            color="text-[#256c1d] bg-[#eaf6e6]"
            sub={`${data.monthly?.length ?? 0} months`}
          />
          <SummaryCard
            label="Total Expenditure"
            value={fmt(data.totals?.expenditure ?? 0)}
            icon={<TrendingDown className="w-5 h-5" />}
            color="text-red-500 bg-red-50"
            sub="Salaries + Expenses"
          />
          <SummaryCard
            label="Net Surplus / Deficit"
            value={fmt(Math.abs(data.totals?.netProfit ?? 0))}
            icon={(data.totals?.netProfit ?? 0) >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            color={(data.totals?.netProfit ?? 0) >= 0 ? 'text-[#256c1d] bg-[#eaf6e6]' : 'text-red-500 bg-red-50'}
            sub={`${data.totals?.profitMargin ?? 0}% margin`}
          />
        </div>
      )}

      {/* Bar Chart */}
      <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
        <CardHeader className="px-7">
          <CardTitle className="text-lg font-semibold tracking-tight">Monthly Income vs Expenditure</CardTitle>
          <CardDescription>Side-by-side comparison per month</CardDescription>
        </CardHeader>
        <CardContent className="h-72 px-7">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for selected period</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ece6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => fmt(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e8ece6', borderRadius: '16px', fontSize: 12 }}
                  formatter={(v: number) => fmt(v)}
                />
                <Legend />
                <Bar dataKey="Income" fill="#54b947" radius={[8, 8, 0, 0]} barSize={20} />
                <Bar dataKey="Expenditure" fill="#f2a29b" radius={[8, 8, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Net trend line */}
      <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
        <CardHeader className="px-7">
          <CardTitle className="text-lg font-semibold tracking-tight">Net Surplus / Deficit Trend</CardTitle>
          <CardDescription>Monthly net position (income minus expenditure)</CardDescription>
        </CardHeader>
        <CardContent className="h-52 px-7">
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ece6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => fmt(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e8ece6', borderRadius: '16px', fontSize: 12 }}
                  formatter={(v: number) => fmt(v)}
                />
                <Line type="monotone" dataKey="Net" stroke="#54b947" strokeWidth={2.5} dot={{ r: 4, fill: "#54b947" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly Table */}
      {data && (data.monthly || []).length > 0 && (
        <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5 overflow-hidden">
          <CardHeader className="px-7">
            <CardTitle className="text-lg font-semibold tracking-tight">Monthly Statement</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f4f6f3]">
                  <tr>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Month</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Invoices</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Enrollments</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Total Income</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Salaries</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Expenses</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Total Exp.</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.monthly || []).map(row => (
                    <tr key={row.month} className="hover:bg-[#f7faf6] transition-colors">
                      <td className="px-5 py-3.5 font-medium">{fmtMonth(row.month)}</td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground">{fmt(row.income?.invoices ?? 0)}</td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground">{fmt(row.income?.enrollments ?? 0)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-[#256c1d]">{fmt(row.income?.total ?? 0)}</td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground">{fmt(row.expenditure?.salaries ?? 0)}</td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground">{fmt(row.expenditure?.expenses ?? 0)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-red-500">{fmt(row.expenditure?.total ?? 0)}</td>
                      <td className={cn('p-3 text-right font-bold', (row.net ?? 0) >= 0 ? 'text-[#256c1d]' : 'text-red-600')}>
                        {(row.net ?? 0) >= 0 ? '+' : ''}{fmt(row.net ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#f4f6f3]">
                  <tr>
                    <td className="px-5 py-3.5 font-bold">Total</td>
                    <td className="px-5 py-3.5 text-right font-bold">{fmt(data.incomeBreakdown?.invoices ?? 0)}</td>
                    <td className="px-5 py-3.5 text-right font-bold">{fmt(data.incomeBreakdown?.enrollments ?? 0)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-[#256c1d]">{fmt(data.totals?.income ?? 0)}</td>
                    <td className="px-5 py-3.5 text-right font-bold">{fmt(data.expenditureBreakdown?.salaries ?? 0)}</td>
                    <td className="px-5 py-3.5 text-right font-bold">{fmt(data.expenditureBreakdown?.expenses ?? 0)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-red-500">{fmt(data.totals?.expenditure ?? 0)}</td>
                    <td className={cn('p-3 text-right font-bold text-lg', (data.totals?.netProfit ?? 0) >= 0 ? 'text-[#256c1d]' : 'text-red-600')}>
                      {(data.totals?.netProfit ?? 0) >= 0 ? '+' : ''}{fmt(data.totals?.netProfit ?? 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income & Expenditure Breakdown */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
            <CardHeader className="px-7"><CardTitle className="text-lg font-semibold tracking-tight">Income Sources</CardTitle></CardHeader>
            <CardContent className="space-y-4 px-7">
              <BreakdownRow label="Invoices" amount={data.incomeBreakdown?.invoices ?? 0} total={data.totals?.income ?? 0} color="bg-[#54b947]" />
              <BreakdownRow label="Enrollment Fees" amount={data.incomeBreakdown?.enrollments ?? 0} total={data.totals?.income ?? 0} color="bg-[#8ae47e]" />
              <BreakdownRow label="Payment Entries" amount={data.incomeBreakdown?.payments ?? 0} total={data.totals?.income ?? 0} color="bg-[#cfe9c9]" />
            </CardContent>
          </Card>
          <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
            <CardHeader className="px-7"><CardTitle className="text-lg font-semibold tracking-tight">Expenditure Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-4 px-7">
              <BreakdownRow label="Salaries (Payroll)" amount={data.expenditureBreakdown?.salaries ?? 0} total={data.totals?.expenditure ?? 0} color="bg-red-400" />
              <BreakdownRow label="Expense Claims" amount={data.expenditureBreakdown?.expenses ?? 0} total={data.totals?.expenditure ?? 0} color="bg-amber-400" />
              {(data.expenditureBreakdown?.byCategory || []).slice(0, 4).map(c => (
                <BreakdownRow key={c.id} label={`  └ ${c.id}`} amount={c.amount ?? 0} total={data.expenditureBreakdown?.expenses ?? 0} color="bg-amber-200" />
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color, sub }: any) {
  return (
    <div className="rounded-3xl bg-white border border-slate-100 p-6 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-3xl font-semibold tracking-tight mt-1 truncate">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <div className={cn('w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center', color)}>{icon}</div>
    </div>
  );
}

function BreakdownRow({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{fmt(amount)} <span className="text-muted-foreground font-normal text-xs">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-[#f1f2ef] rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
