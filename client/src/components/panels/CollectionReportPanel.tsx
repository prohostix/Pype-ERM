import { useState, useEffect } from 'react';
import { RefreshCw, Download, FileText, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export function CollectionReportPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ summary: any; ledger: any[] }>({ summary: {}, ledger: [] });
  const [agents, setAgents] = useState<any[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [agentId, setAgentId] = useState('all');
  const [search, setSearch] = useState('');

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Collection Report</h2>
          <p className="text-muted-foreground">Monitor collections across the organization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReport} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={loading || !data.ledger.length}>
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-xl bg-card">
        <div>
          <label className="text-sm font-medium mb-1 block">Start Date</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">End Date</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Agent</label>
          <select 
            value={agentId} 
            onChange={e => setAgentId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">All Agents</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button onClick={fetchReport} className="w-full">Apply Filters</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              ₹{((data.summary?.totalCollected || 0)).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary?.transactionCount || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle>Collection Ledger</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by student, ref no..." 
              className="pl-8" 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Enrollment No</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Collected By</th>
                  <th className="px-4 py-3">Ref No</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading ledger...
                    </td>
                  </tr>
                ) : filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                      No collection entries found
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(item.receivedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {item.invoice?.student?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {item.invoice?.student?.enrollmentNo || '-'}
                      </td>
                      <td className="px-4 py-3 font-bold text-success">
                        ₹{item.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {item.method}
                      </td>
                      <td className="px-4 py-3">
                        {item.receiver?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.referenceNo || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
