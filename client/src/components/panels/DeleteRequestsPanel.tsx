import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ListPagination } from '@/components/ui/list-pagination';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export function DeleteRequestsPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchRequests();
  }, []);
  useEffect(() => { setPage(1); }, [tab, pageSize]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/edit-delete/requests');
      setRequests(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load delete requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/edit-delete/requests/${id}`, { status });
      toast.success(`Request ${status} successfully`);
      fetchRequests();
    } catch (error) {
      toast.error('Failed to process request');
    }
  };

  const formatTarget = (url: string) => {
    if (!url) return 'Unknown Target';
    try {
      const parts = url.split('/').filter(Boolean);
      const relevantParts = parts.filter(p => p !== 'api' && p !== 'v1');
      
      if (relevantParts.includes('assessment')) {
        const lessonIdx = relevantParts.indexOf('lessons');
        const lessonId = lessonIdx !== -1 && relevantParts[lessonIdx + 1] ? relevantParts[lessonIdx + 1] : '';
        return `Lesson Assessment (Lesson ID: ${lessonId.length > 12 ? lessonId.substring(0, 8) + '...' : lessonId})`;
      }

      const id = relevantParts.pop();
      if (!id) return url;
      
      const entityName = relevantParts.map(p => 
        p.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      ).join(' > ');
      
      return `${entityName} (ID: ${id.length > 12 ? id.substring(0, 8) + '...' : id})`;
    } catch (e) {
      return url;
    }
  };

  const STATUS_PILL: Record<string, { text: string; cls: string }> = {
    pending_manager: { text: 'Pending manager', cls: 'bg-amber-100 text-amber-700' },
    pending_ceo: { text: 'Pending CEO', cls: 'bg-amber-100 text-amber-700' },
    approved: { text: 'Approved', cls: 'bg-[#dff3da] text-[#256c1d]' },
    rejected: { text: 'Rejected', cls: 'bg-red-100 text-red-700' },
  };

  const pendingRequests = requests.filter(req => req.status === 'pending_manager' || req.status === 'pending_ceo');
  const approvedRequests = requests.filter(req => req.status === 'approved');
  const rejectedRequests = requests.filter(req => req.status === 'rejected');
  const lists = { pending: pendingRequests, approved: approvedRequests, rejected: rejectedRequests };
  const current = lists[tab];
  const rows = current.slice((page - 1) * pageSize, page * pageSize);

  const renderRow = (req: any) => {
    const role = user?.role as string;
    const canAct =
      (req.status === 'pending_manager' && ['superadmin', 'org_admin', 'ceo', 'general_manager', 'branch_manager', 'finance_admin', 'finance_sub_admin', 'ops_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin', 'center_admin'].includes(role)) ||
      (req.status === 'pending_ceo' && ['superadmin', 'org_admin', 'ceo', 'general_manager', 'branch_manager'].includes(role));
    const isFinalApprover = ['superadmin', 'org_admin'].includes(role) || req.status === 'pending_ceo';
    const pill = STATUS_PILL[req.status];
    return (
      <div key={req.id} className="rounded-2xl bg-[#f4f6f3] p-4 sm:p-5 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">{req.user?.name || req.faculty?.name || 'Unknown user'}</span>
            <span className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-slate-700 capitalize">{req.entityType}</span>
            {pill && <span className={cn('rounded-full px-3 py-0.5 text-xs font-semibold', pill.cls)}>{pill.text}</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-1.5" title={req.entityId}>
            Target: <span className="font-medium text-slate-900">{req.targetName || formatTarget(req.entityId)}</span>
          </p>
          <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm">
            <p className="text-xs font-medium text-slate-500 mb-0.5">Reason for deletion</p>
            <p className="text-slate-900">{req.reason}</p>
          </div>
        </div>
        {canAct && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" className="h-11 px-5 rounded-full bg-white border-red-200 text-red-600 hover:bg-red-50 font-semibold" onClick={() => handleRespond(req.id, 'rejected')}>Reject</Button>
            <Button className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => handleRespond(req.id, 'approved')}>
              {isFinalApprover ? 'Approve & delete' : 'Approve → CEO'}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { id: 'pending' as const, label: 'Pending', count: pendingRequests.length },
    { id: 'approved' as const, label: 'Approved', count: approvedRequests.length },
    { id: 'rejected' as const, label: 'Rejected', count: rejectedRequests.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Delete Approvals</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Review requests to delete records. {pendingRequests.length > 0 ? `${pendingRequests.length} waiting for a decision.` : 'Nothing is waiting.'}</p>
        </div>
        <Button variant="outline" onClick={fetchRequests} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"><RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh</Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn('text-left p-5 sm:p-6 transition-colors', tab === t.id ? 'bg-[#eaf6e6]' : 'hover:bg-[#f7faf6]')}>
              <p className="text-sm font-medium text-slate-500">{t.label}</p>
              <p className={cn('text-3xl sm:text-4xl font-semibold tracking-tight mt-2', t.id === 'pending' && t.count > 0 ? 'text-amber-600' : 'text-slate-900')}>{t.count}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">{tabs.find((t) => t.id === tab)?.label} requests</h3>
        </div>
        <div className="p-5 sm:p-6 space-y-3">
          {loading ? [1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />) :
            current.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No requests in this category.</p> :
            rows.map(renderRow)}
          {!loading && <ListPagination total={current.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
        </div>
      </div>
    </div>
  );
}
