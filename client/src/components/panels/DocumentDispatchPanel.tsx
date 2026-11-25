import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ListPagination } from '@/components/ui/list-pagination';
import { useAuth } from '@/hooks/useAuth';
import { mayOn } from '@/lib/access';

export function DocumentDispatchPanel() {
  const { user } = useAuth();
  const mayCreate = mayOn(user, 'document_dispatch', 'create', true);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    documentName: '',
    documentType: 'mark_sheet',
    courierName: '',
    trackingNumber: '',
    status: 'dispatched',
    notes: ''
  });

  useEffect(() => {
    fetchLogs();
    api.get('/students').then(r => setStudents(r.data.data || [])).catch(() => {});
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/documents?type=dispatched');
      setLogs(res.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch dispatched documents');
    } finally {
      setLoading(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(logs.length / itemsPerPage));
  const safePage = Math.min(currentPage, pageCount);
  const paginatedLogs = logs.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  const statusPill = (st: string) =>
    st === 'delivered' ? 'bg-[#dff3da] text-[#256c1d]' : st === 'returned' ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700';

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Document Dispatch</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Log and track outbound documents</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchLogs} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {mayCreate && (
            <Button onClick={() => setShowDispatchModal(true)} className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Log Dispatch
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Dispatch Log</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{logs.length} logs</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-14 text-sm text-muted-foreground">No documents dispatched yet</div>
          ) : (
            <div className="space-y-3">
              {paginatedLogs.map((log) => (
                <div key={log.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{log.student?.name || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{log.student?.enrollmentNo || 'N/A'}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-slate-700 capitalize">{String(log.documentType || '').replace(/_/g, ' ')}</span>
                      <span className="text-sm text-slate-600">{log.documentName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5">
                      {log.courierName || 'N/A'}{log.trackingNumber ? ` · ` : ''}<span className="font-mono">{log.trackingNumber || ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 md:justify-end">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${statusPill(log.status)}`}>{log.status}</span>
                    <Button variant="outline" className="h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold">View</Button>
                  </div>
                </div>
              ))}
              <ListPagination
                total={logs.length}
                page={safePage}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
              />
            </div>
          )}
        </div>
      </div>

      <Dialog open={showDispatchModal} onOpenChange={setShowDispatchModal}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Log Document Dispatch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={formData.studentId} onValueChange={(val) => setFormData({ ...formData, studentId: val })}>
                <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.enrollmentNo || 'N/A'})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={formData.documentType} onValueChange={(val) => setFormData({ ...formData, documentType: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mark_sheet">Mark Sheet</SelectItem>
                  <SelectItem value="degree_certificate">Degree Certificate</SelectItem>
                  <SelectItem value="provisional">Provisional</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input 
                placeholder="e.g. Sem 1 Marksheet" 
                value={formData.documentName} 
                onChange={(e) => setFormData({ ...formData, documentName: e.target.value })} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Courier Name</Label>
                <Input 
                  placeholder="e.g. DTDC" 
                  value={formData.courierName} 
                  onChange={(e) => setFormData({ ...formData, courierName: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Tracking Number</Label>
                <Input 
                  placeholder="Tracking ID" 
                  value={formData.trackingNumber} 
                  onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setShowDispatchModal(false)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" disabled={isSubmitting} onClick={async () => {
              if (!formData.studentId || !formData.documentName) {
                toast.error('Student and Document Name are required');
                return;
              }
              setIsSubmitting(true);
              try {
                await api.post('/documents', { ...formData, type: 'dispatched', dispatchDate: new Date().toISOString() });
                toast.success('Document dispatch logged successfully');
                setShowDispatchModal(false);
                fetchLogs();
                setFormData({
                  studentId: '', documentName: '', documentType: 'mark_sheet', courierName: '', trackingNumber: '', status: 'dispatched', notes: ''
                });
              } catch (e) {
                toast.error('Failed to log document');
              } finally {
                setIsSubmitting(false);
              }
            }}>
              {isSubmitting ? 'Logging...' : 'Log Dispatch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
