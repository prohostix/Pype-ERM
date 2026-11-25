import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ListPagination } from '@/components/ui/list-pagination';
import { useAuth } from '@/hooks/useAuth';
import { mayOn } from '@/lib/access';

export function ExamRegistrationPanel() {
  const { user } = useAuth();
  const mayEdit = mayOn(user, 'exam_registration', 'edit', true);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/exams');
      setRegistrations(res.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch exam registrations');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/exams/${id}`, { status });
      toast.success(`Registration ${status}`);
      fetchRegistrations();
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const pageCount = Math.max(1, Math.ceil(registrations.length / itemsPerPage));
  const safePage = Math.min(currentPage, pageCount);
  const paginatedRegistrations = registrations.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  const statusPill = (st: string) =>
    st === 'approved' ? 'bg-[#dff3da] text-[#256c1d]' : st === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Exam Registration</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Manage student exam applications and approvals</p>
        </div>
        <Button variant="outline" onClick={fetchRegistrations} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Registrations</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{registrations.length} total</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-14 text-sm text-muted-foreground">No pending exam registrations!</div>
          ) : (
            <div className="space-y-3">
              {paginatedRegistrations.map((reg) => (
                <div key={reg.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{reg.student?.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{reg.student?.enrollmentNo || 'N/A'}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                      <span className="rounded-full bg-white px-3 py-0.5 font-semibold text-slate-700">{reg.semester}</span>
                      <span className="text-slate-600">Subjects: <span className="font-mono">{reg.subjectCodes}</span></span>
                      <span className="text-muted-foreground">· Exam center: {reg.examCenter || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap lg:justify-end">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${statusPill(reg.status)}`}>{reg.status}</span>
                    {mayEdit && reg.status === 'pending' && (
                      <>
                        <Button className="h-10 rounded-full px-5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => updateStatus(reg.id, 'approved')}>Approve</Button>
                        <Button variant="outline" className="h-10 rounded-full px-5 text-red-600 border-red-200 bg-white hover:bg-red-50" onClick={() => updateStatus(reg.id, 'rejected')}>Reject</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <ListPagination
                total={registrations.length}
                page={safePage}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
