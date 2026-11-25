import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ListPagination } from '@/components/ui/list-pagination';

export function CourierTrackingPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/documents?type=dispatched&status=dispatched');
      setLogs(res.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch tracking details');
    } finally {
      setLoading(false);
    }
  };

  const safePage = Math.min(page, Math.max(1, Math.ceil(logs.length / pageSize)));
  const rows = logs.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Courier Tracking</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Monitor status of dispatched packages</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Active Couriers</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{logs.length} in transit</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-14 text-sm text-muted-foreground">No active couriers to track</div>
          ) : (
            <div className="space-y-3">
              {rows.map((log) => (
                <div key={log.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{log.student?.name || 'N/A'}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-slate-600">
                      <span>{log.courierName || 'N/A'}</span>
                      <span className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold font-mono text-slate-700">{log.trackingNumber || 'N/A'}</span>
                      <span className="text-xs text-muted-foreground">Dispatched {log.dispatchDate ? new Date(log.dispatchDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                  <Button variant="outline" className="h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold">Track via API</Button>
                </div>
              ))}
              <ListPagination
                total={logs.length}
                page={safePage}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
