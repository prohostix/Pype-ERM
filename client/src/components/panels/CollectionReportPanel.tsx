import { useState, useEffect } from 'react';
import { RefreshCw, Download, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { CS } from '@/lib/currency';
import { ListPagination } from '@/components/ui/list-pagination';
export function CollectionReportPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ summary: any; ledger: any[] }>({ summary: {}, ledger: [] });
  const [agents, setAgents] = useState<any[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [agentId, setAgentId] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      if (agentId !== 'all') query.append('receivedBy', agentId);

      const res = await api.get(`/finance/reports/collections?${query.toString()}`);
      if (res.data.success) {
        setData(res.data.data);
        
        // Populate agents dynamically from received payments if API doesn't return list
        const uniqueAgents = new Map();
        res.data.data.ledger.forEach((entry: any) => {
          if (entry.receiver) {
            uniqueAgents.set(entry.receiver.id || entry.receivedBy, entry.receiver.name);
          }
        });
        if (agents.length === 0) {
           const agentsList = Array.from(uniqueAgents, ([id, name]) => ({ id, name }));
           setAgents(agentsList);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch collection report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data.ledger.length) {
      toast.error('No data to export');
      return;
    }
    const exportData = data.ledger.map(item => ({
      'Date': new Date(item.receivedAt).toLocaleDateString(),
      'Student Name': item.invoice?.student?.name || 'Unknown',
      'Enrollment No': item.invoice?.student?.enrollmentNo || 'N/A',
      'Amount': item.amount,
      'Method': item.method,
      'Reference No': item.referenceNo || 'N/A',
      'Collected By': item.receiver?.name || 'Unknown',
      'Notes': item.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Collections');
    XLSX.writeFile(wb, `Collection_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredLedger = data.ledger.filter(item => {
    const term = search.toLowerCase();
    return (
      item.invoice?.student?.name?.toLowerCase().includes(term) ||
      item.invoice?.student?.enrollmentNo?.toLowerCase().includes(term) ||
      item.receiver?.name?.toLowerCase().includes(term) ||
      item.referenceNo?.toLowerCase().includes(term)
    );
  });

  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredLedger.length / pageSize)));
  const pagedLedger = filteredLedger.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const fieldCls = 'h-11 w-full rounded-xl border border-transparent bg-[#f4f6f3] px-3 text-sm outline-none focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20';

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Collection Report</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Monitor collections across the organization</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchReport} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={loading || !data.ledger.length} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-3xl bg-white border border-slate-100">
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Start Date</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">End Date</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Agent</label>
          <select value={agentId} onChange={e => setAgentId(e.target.value)} className={fieldCls}>
            <option value="all">All Agents</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button onClick={fetchReport} className="w-full h-11 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">Apply Filters</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-white border border-slate-100 p-6">
          <p className="text-xs font-medium text-slate-500">Total Collected</p>
          <p className="text-3xl font-semibold tracking-tight text-[#256c1d] mt-1">
            {CS()}{((data.summary?.totalCollected || 0)).toLocaleString()}
          </p>
        </div>
        <div className="rounded-3xl bg-white border border-slate-100 p-6">
          <p className="text-xs font-medium text-slate-500">Total Transactions</p>
          <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-1">
            {data.summary?.transactionCount || 0}
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight">Collection Ledger</h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by student, ref no..."
              className="pl-11 h-11 rounded-full bg-[#f4f6f3] border-transparent"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f4f6f3]">
              <tr>
                {['Date', 'Student Name', 'Enrollment No', 'Amount', 'Method', 'Collected By', 'Ref No'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#54b947]" />
                    Loading ledger...
                  </td>
                </tr>
              ) : filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">
                    <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><FileText className="w-6 h-6" /></div>
                    No collection entries found
                  </td>
                </tr>
              ) : (
                pagedLedger.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f7faf6] transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">{new Date(item.receivedAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{item.invoice?.student?.name || '-'}</td>
                    <td className="px-5 py-3.5">{item.invoice?.student?.enrollmentNo || '-'}</td>
                    <td className="px-5 py-3.5 font-semibold text-[#256c1d]">{CS()}{item.amount.toLocaleString()}</td>
                    <td className="px-5 py-3.5 capitalize">{item.method}</td>
                    <td className="px-5 py-3.5">{item.receiver?.name || '-'}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{item.referenceNo || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filteredLedger.length > 0 && (
          <div className="px-5 pb-5">
            <ListPagination total={filteredLedger.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
          </div>
        )}
      </div>
    </div>
  );
}
