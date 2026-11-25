import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { ListPagination } from '@/components/ui/list-pagination';

export function ComplaintsPanel() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium',
    status: 'open'
  });

  useEffect(() => { fetchComplaints(); }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/complaints');
      setComplaints(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/hr/complaints/${editingId}`, formData);
      } else {
        await api.post('/hr/complaints', formData);
      }
      setDialogOpen(false);
      resetForm();
      fetchComplaints();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save complaint');
    }
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id || c.id);
    setFormData({
      subject: c.subject || '',
      description: c.description || '',
      category: c.category || 'general',
      priority: c.priority || 'medium',
      status: c.status || 'open'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this complaint?')) return;
    try {
      await api.delete(`/hr/complaints/${id}`);
      fetchComplaints();
    } catch (err) {
      console.error('Failed to delete complaint:', err);
    }
  };

  const handleResolve = async (id: string) => {
    if (!confirm('Mark as resolved?')) return;
    try {
      await api.put(`/hr/complaints/${id}/resolve`);
      fetchComplaints();
    } catch (err) {
      console.error('Failed to resolve complaint:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ subject: '', description: '', category: 'general', priority: 'medium', status: 'open' });
  };

  const badgeStyle = "border-none rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm";
  const statusColors: any = {
    open: `bg-red-100 text-red-700 ${badgeStyle}`,
    in_progress: `bg-amber-100 text-amber-700 ${badgeStyle}`,
    resolved: `bg-[#dff3da] text-[#256c1d] ${badgeStyle}`,
    closed: `bg-slate-200/70 text-slate-600 ${badgeStyle}`
  };
  const priorityColors: any = {
    low: `bg-sky-100 text-sky-700 ${badgeStyle}`,
    medium: `bg-amber-100 text-amber-700 ${badgeStyle}`,
    high: `bg-red-100 text-red-700 ${badgeStyle}`
  };

  const validComplaints = complaints.filter(c => c && c.id);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(validComplaints.length / pageSize)));
  const pagedComplaints = validComplaints.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Complaints Management</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Track and resolve employee concerns</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full h-11 px-6 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
              <Plus className="w-4 h-4 mr-2" /> File Complaint
            </Button>
          </DialogTrigger>
          <DialogContent className="wizard-form max-w-lg border-0 rounded-[2rem] overflow-hidden p-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
            <div className="bg-[#f4f6f3] p-6 border-b border-slate-100 flex items-center gap-3">
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">{editingId ? 'Edit Complaint' : 'File New Complaint'}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Submit an issue for HR review.</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Subject</Label>
                <Input className="rounded-xl h-11" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required placeholder="Brief description of the issue" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Description</Label>
                <Textarea className="rounded-xl resize-none" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} required placeholder="Provide detailed information..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600">Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="harassment">Harassment</SelectItem>
                      <SelectItem value="discrimination">Discrimination</SelectItem>
                      <SelectItem value="workplace">Workplace</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editingId && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="ghost" className="rounded-full h-11 px-6" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="rounded-full h-11 px-7 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">Submit Complaint</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Active Complaints</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{complaints.length} total</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-14 px-4">
              <div className="bg-[#eaf6e6] text-[#256c1d] w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No active complaints</h3>
              <p className="text-sm text-muted-foreground mt-1">All issues have been resolved or none have been reported.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagedComplaints.map((c) => {
                const cid = c.id || c.id;
                return (
                  <div key={cid} className="group relative flex flex-col p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors gap-4 overflow-hidden">
                    {c.status === 'open' && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                    )}
                    {c.status === 'in_progress' && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                    )}
                    {c.status === 'resolved' && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#54b947]" />
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="font-semibold text-base text-slate-900 truncate">{c.subject}</h3>
                          <div className="flex items-center gap-2">
                            <Badge className={`rounded-full border-0 px-3 capitalize ${statusColors[c.status] || ''}`}>{c.status?.replace('_', ' ')}</Badge>
                            <Badge className={`rounded-full border-0 px-3 capitalize ${priorityColors[c.priority] || ''}`}>{c.priority}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed bg-white p-3.5 rounded-2xl mt-3 mb-3">
                          {c.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-muted-foreground">
                          <span className="bg-white px-3 py-1 rounded-full">
                            <span className="font-semibold opacity-70 mr-1.5">Category</span> {c.category}
                          </span>
                          {c.submittedAt && (
                            <span className="bg-white px-3 py-1 rounded-full">
                              {new Date(c.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                          {c.user?.name && (
                            <span className="bg-white px-3 py-1 rounded-full flex items-center">
                              <span className="font-semibold opacity-70 mr-1.5">By</span>
                              <span className="text-foreground">{c.user.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                        {c.status !== 'resolved' && c.status !== 'closed' && (
                          <Button variant="outline" size="sm" className="h-10 w-full sm:w-auto rounded-full border-[#cfe9c9] bg-white hover:bg-[#eaf6e6] gap-1.5 px-4 text-[#256c1d] font-semibold" onClick={() => handleResolve(cid)}>
                            Resolve
                          </Button>
                        )}
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button variant="outline" size="sm" className="h-10 flex-1 sm:flex-none rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6] gap-1.5 px-4" onClick={() => handleEdit(c)}>
                            <Edit className="w-3.5 h-3.5 text-muted-foreground" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" className="h-10 flex-1 sm:flex-none rounded-full border-red-200 bg-white hover:bg-red-50 text-red-600 gap-1.5 px-4" onClick={() => handleDelete(cid)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <ListPagination total={validComplaints.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
