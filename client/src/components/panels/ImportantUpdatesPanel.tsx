import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ListPagination } from '@/components/ui/list-pagination';
import { cn } from '@/lib/utils';

const PRIORITY_PILL: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-[#dff3da] text-[#256c1d]',
};

/** Read-only list of the organisation's high and medium priority announcements that have not expired. */
export function ImportantUpdatesPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<'high' | 'all'>('high');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/announcements');
      setItems(res.data.data || []);
    } catch {
      toast.error('Failed to load updates');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const now = Date.now();
  const important = items
    .filter(a => !a.expiresAt || new Date(a.expiresAt).getTime() >= now)
    .filter(a => (level === 'high' ? a.priority === 'high' : a.priority === 'high' || a.priority === 'medium'))
    .sort((a, b) => new Date(b.postedAt || b.createdAt).getTime() - new Date(a.postedAt || a.createdAt).getTime());

  const safePage = Math.min(page, Math.max(1, Math.ceil(important.length / pageSize)));
  const rows = important.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Important Updates</h2>
          <p className="text-muted-foreground text-sm mt-1.5">High priority announcements from your organisation that are still active.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-3 flex gap-1.5 w-fit max-w-full">
        {([['high', 'High priority'], ['all', 'High and medium']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setLevel(key); setPage(1); }}
            className={cn('px-5 py-2 rounded-full text-sm font-semibold transition-colors', level === key ? 'bg-[#8ae47e] text-[#0b1d14]' : 'text-slate-600 hover:bg-[#eaf6e6]')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Updates</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{important.length} active</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : important.length === 0 ? (
            <div className="py-14 text-center">
              <p className="font-medium text-slate-900">No important updates</p>
              <p className="text-sm text-muted-foreground mt-1">New high priority announcements will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map(a => (
                <div key={a.id} className="p-5 rounded-2xl bg-[#f4f6f3]">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <p className="font-semibold text-slate-900">{a.title}</p>
                    <div className="flex items-center gap-2">
                      <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold capitalize', PRIORITY_PILL[a.priority] || 'bg-slate-200/70 text-slate-600')}>{a.priority}</span>
                      {a.type && <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 capitalize">{a.type}</span>}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    {a.postedBy?.name ? `${a.postedBy.name} · ` : ''}{new Date(a.postedAt || a.createdAt).toLocaleDateString()}
                    {a.expiresAt ? ` · Expires ${new Date(a.expiresAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
              ))}
              <ListPagination
                total={important.length}
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
