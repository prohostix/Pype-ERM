import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ListPagination } from '@/components/ui/list-pagination';
import { useAuth } from '@/hooks/useAuth';
import { mayOn } from '@/lib/access';

export function DocumentReceivedPanel() {
  const { user } = useAuth();
  const mayCreate = mayOn(user, 'document_received', 'create', true);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [centerFilter, setCenterFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, centerFilter, programFilter]);
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    documentName: '',
    documentType: 'mark_sheet',
    status: 'received',
    notes: ''
  });

  useEffect(() => {
    fetchLogs();
    api.get('/students').then(r => setStudents(r.data.data || [])).catch(() => {});
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/documents?type=received');
      setLogs(res.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch received documents');
    } finally {
      setLoading(false);
    }
  };

  const centers = Array.from(new Set(logs.map(log => log.student?.center?.name).filter(Boolean))).sort() as string[];
  const programs = Array.from(new Set(logs.map(log => log.student?.program?.name).filter(Boolean))).sort() as string[];
  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = log.student?.name?.toLowerCase().includes(q) ||
                          log.student?.enrollmentNo?.toLowerCase().includes(q) ||
                          log.documentName?.toLowerCase().includes(q) ||
                          log.documentType?.toLowerCase().includes(q);
    const matchesCenter = centerFilter === 'all' || log.student?.center?.name === centerFilter;
    const matchesProgram = programFilter === 'all' || log.student?.program?.name === programFilter;
    return matchesSearch && matchesCenter && matchesProgram;
  });
  const pageCount = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const safePage = Math.min(currentPage, pageCount);
  const paginatedLogs = filteredLogs.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  const sel = 'h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#54b947]';
  const statusPill = (st: string) =>
    st === 'verified' ? 'bg-[#dff3da] text-[#256c1d]' : st === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700';

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Documents Received</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Log and track inbound physical documents</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchLogs} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {mayCreate && (
            <Button onClick={() => setShowReceivedModal(true)} className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Log Received
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search students..."
            className="pl-11 h-11 rounded-full bg-[#f4f6f3] border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select className={sel + (centerFilter !== 'all' ? ' !bg-[#8ae47e] !border-[#8ae47e] !text-[#0b1d14]' : '')} value={centerFilter} onChange={e => setCenterFilter(e.target.value)}>
          <option value="all">All Centers</option>
          {centers.map(c => (<option key={c} value={c}>{c}</option>))}
        </select>
        <select className={sel + (programFilter !== 'all' ? ' !bg-[#8ae47e] !border-[#8ae47e] !text-[#0b1d14]' : '')} value={programFilter} onChange={e => setProgramFilter(e.target.value)}>
          <option value="all">All Programs</option>
          {programs.map(p => (<option key={p} value={p}>{p}</option>))}
        </select>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Document Log</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{filteredLogs.length} logs</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-14 text-sm text-muted-foreground">
              {searchQuery ? 'No documents found matching your search.' : 'No documents received yet'}
            </div>
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
                  </div>
                  <div className="flex items-center gap-3 md:justify-end">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${statusPill(log.status)}`}>{log.status}</span>
                    <Button variant="outline" className="h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold">View</Button>
                  </div>
                </div>
              ))}
              <ListPagination
                total={filteredLogs.length}
                page={safePage}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
              />
            </div>
          )}
        </div>
      </div>

      <Dialog open={showReceivedModal} onOpenChange={setShowReceivedModal}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Log Received Document</DialogTitle>
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

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setShowReceivedModal(false)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" disabled={isSubmitting} onClick={async () => {
              if (!formData.studentId || !formData.documentName) {
                toast.error('Student and Document Name are required');
                return;
              }
              setIsSubmitting(true);
              try {
                await api.post('/documents', { ...formData, type: 'received', deliveryDate: new Date().toISOString() });
                toast.success('Document received logged successfully');
                setShowReceivedModal(false);
                fetchLogs();
                setFormData({
                  studentId: '', documentName: '', documentType: 'mark_sheet', status: 'received', notes: ''
                });
              } catch (e) {
                toast.error('Failed to log document');
              } finally {
                setIsSubmitting(false);
              }
            }}>
              {isSubmitting ? 'Logging...' : 'Log Received'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
