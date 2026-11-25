import { useState, useEffect, useMemo } from 'react';
import { Mail, Phone, Calendar, RefreshCw, CheckCircle, Clock, Search, X, Inbox, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

export function InquiriesPanel() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processed'>('all');

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizations/inquiries');
      setInquiries(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
      toast.error('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/organizations/inquiries/${id}`, { status: newStatus });
      toast.success(`Inquiry status updated to ${newStatus}`);
      fetchInquiries();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
    }
  };

  const counts = useMemo(() => {
    const processed = inquiries.filter((i: any) => i.status === 'processed').length;
    return { total: inquiries.length, processed, pending: inquiries.length - processed };
  }, [inquiries]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inquiries.filter((i: any) => {
      const isProcessed = i.status === 'processed';
      if (statusFilter === 'processed' && !isProcessed) return false;
      if (statusFilter === 'pending' && isProcessed) return false;
      if (!q) return true;
      return [i.orgName, i.adminName, i.email, i.phone, i.message].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [inquiries, search, statusFilter]);

  const initials = (name: string) => (name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const StatusPill = ({ status }: { status: string }) =>
    status === 'processed' ? (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#e3f7dd] text-[#1f6a17] dark:bg-emerald-500/15 dark:text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-[#54b947]" /> Processed
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
      </span>
    );

  const kpis = [
    { label: 'Total enquiries', value: counts.total, icon: Inbox },
    { label: 'Pending', value: counts.pending, icon: Clock },
    { label: 'Processed', value: counts.processed, icon: CheckCircle },
  ];

  const filters: { id: 'all' | 'pending' | 'processed'; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.total },
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'processed', label: 'Processed', count: counts.processed },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Organization Management Enquiries</h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            List of setup requests and onboarding inquiries submitted from the public landing page.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchInquiries}
          disabled={loading}
          className="h-11 px-5 rounded-full bg-white border-slate-200 text-sm font-medium gap-2 shadow-sm hover:bg-slate-50 shrink-0 self-start lg:self-auto"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-3xl gap-0">
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="text-3xl font-semibold tracking-tight mt-1">{value.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] dark:bg-emerald-500/10 text-[#256c1d] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organisation, contact, email or message..."
            className="pl-11 pr-9 h-11 rounded-full bg-white border-slate-200 shadow-sm text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-semibold transition-colors',
                statusFilter === f.id ? 'bg-[#0b1d14] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <Card className="rounded-3xl gap-0 overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          {loading && inquiries.length === 0 ? (
            <div className="space-y-3 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-[#f4f6f3] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <span className="w-14 h-14 rounded-full bg-[#f4f6f3] flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 opacity-50" />
              </span>
              <p className="font-medium text-sm text-foreground">{inquiries.length === 0 ? 'No enquiries yet' : 'No enquiries match your filters'}</p>
              <p className="text-xs mt-1">{inquiries.length === 0 ? 'Requests submitted from the landing page will appear here.' : 'Try a different search or status.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[920px]">
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_110px_110px_170px] gap-4 px-5 py-2.5 rounded-full bg-[#f4f6f3] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Organisation</span>
                  <span>Contact</span>
                  <span>Message</span>
                  <span>Date</span>
                  <span>Status</span>
                  <span className="text-right">Action</span>
                </div>

                <div className="mt-1.5">
                  {visible.map((inq: any) => (
                    <div
                      key={inq.id}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_110px_110px_170px] items-center gap-4 px-5 py-4 rounded-2xl hover:bg-[#f4f6f3] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center font-semibold text-sm shrink-0">
                          {initials(inq.orgName)}
                        </div>
                        <p className="text-sm font-semibold text-foreground truncate" title={inq.orgName}>{inq.orgName}</p>
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-medium text-foreground truncate">{inq.adminName}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5"><Mail className="w-3 h-3 shrink-0" />{inq.email}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0" />{inq.phone}</p>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 flex items-start gap-1.5" title={inq.message}>
                        {inq.message ? <><MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />{inq.message}</> : <span>—</span>}
                      </p>

                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="w-3 h-3" /> {new Date(inq.createdAt).toLocaleDateString()}
                      </p>

                      <div><StatusPill status={inq.status} /></div>

                      <div className="text-right">
                        {inq.status !== 'processed' ? (
                          <Button
                            size="sm"
                            className="h-9 px-4 rounded-full text-xs font-semibold gap-1.5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-none"
                            onClick={() => handleUpdateStatus(inq.id, 'processed')}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Mark processed
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-4 rounded-full text-xs font-semibold gap-1.5 bg-white border-slate-200 hover:bg-slate-50"
                            onClick={() => handleUpdateStatus(inq.id, 'pending')}
                          >
                            <Clock className="w-3.5 h-3.5" /> Re-open
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
