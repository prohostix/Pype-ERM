import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ListPagination } from '@/components/ui/list-pagination';
import api from '@/lib/api';
import { toast } from 'sonner';

interface ActivityLog {
  id: string;
  timestamp: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
  action: string;
  entityType: string;
  entityId: string;
}

export function ActivityLogPanel() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);
  useEffect(() => { setCurrentPage(1); }, [search, actionFilter, itemsPerPage]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ceo/activity-logs');
      setLogs(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  const actionPill = (action: string) => {
    switch ((action || '').toLowerCase()) {
      case 'create': return 'bg-[#dff3da] text-[#256c1d]';
      case 'update': return 'bg-sky-100 text-sky-700';
      case 'delete': return 'bg-red-100 text-red-700';
      case 'login': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const actions = Array.from(new Set(logs.map((l) => (l.action || '').toLowerCase()).filter(Boolean)));
  const q = search.trim().toLowerCase();
  const filtered = logs.filter((l) =>
    (!actionFilter || (l.action || '').toLowerCase() === actionFilter) &&
    (!q || [l.user?.name, l.user?.email, l.entityType, l.entityId].some((v) => (v || '').toLowerCase().includes(q))));
  const paginatedLogs = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Activity Logs</h2>
          <p className="text-muted-foreground text-sm mt-1.5">View all user activities across the organization</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"><RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh</Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">System activities</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{filtered.length.toLocaleString()} of {logs.length.toLocaleString()} entries</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search user, entity or ID" className="pl-10 h-10 rounded-full bg-[#f4f6f3] border-0" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <button key={a} type="button" onClick={() => setActionFilter(actionFilter === a ? null : a)}
                  className={cn('rounded-full px-3.5 h-9 text-xs font-semibold capitalize transition', actionFilter === a ? 'bg-[#0b1d14] text-white' : 'bg-[#f4f6f3] text-slate-700 hover:bg-[#eef5ec]')}>{a}</button>
              ))}
            </div>
          )}
          {loading ? (
            <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">{logs.length === 0 ? 'No activity logs found.' : 'No entries match your filters.'}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="pb-3 pr-3 font-medium">Timestamp</th><th className="pb-3 pr-3 font-medium">User</th><th className="pb-3 pr-3 font-medium">Role</th>
                      <th className="pb-3 pr-3 font-medium">Action</th><th className="pb-3 pr-3 font-medium">Entity type</th><th className="pb-3 font-medium">Entity ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#f7faf6] transition-colors">
                        <td className="py-3 pr-3 whitespace-nowrap text-slate-600">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-3 pr-3"><p className="font-semibold text-slate-900">{log.user?.name || 'Unknown'}</p><p className="text-xs text-muted-foreground">{log.user?.email || ''}</p></td>
                        <td className="py-3 pr-3"><span className="rounded-full bg-[#f4f6f3] px-3 py-1 text-xs font-semibold capitalize text-slate-700">{(log.user?.role || '').replace(/_/g, ' ') || '—'}</span></td>
                        <td className="py-3 pr-3"><span className={cn('rounded-full px-3 py-1 text-xs font-semibold capitalize', actionPill(log.action))}>{log.action}</span></td>
                        <td className="py-3 pr-3 capitalize text-slate-700">{log.entityType}</td>
                        <td className="py-3 font-mono text-xs text-muted-foreground">{log.entityId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ListPagination total={filtered.length} page={currentPage} pageSize={itemsPerPage} onPageChange={setCurrentPage} onPageSizeChange={setItemsPerPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
