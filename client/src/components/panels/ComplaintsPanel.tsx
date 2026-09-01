import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';

export function ComplaintsPanel() {
  const [complaints, setComplaints] = useState<any[]>([]);
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
    open: `bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 ${badgeStyle}`,
    in_progress: `bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400 ${badgeStyle}`,
    resolved: `bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 ${badgeStyle}`,
    closed: `bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 ${badgeStyle}`
  };
  const priorityColors: any = {
    low: `bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400 ${badgeStyle}`,
    medium: `bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400 ${badgeStyle}`,
    high: `bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400 ${badgeStyle}`
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <AlertCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Complaints Management</h2>
            <p className="text-muted-foreground text-sm mt-1">Track and resolve employee concerns</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-md h-10 px-4 transition-transform hover:scale-105 active:scale-95">
              <Plus className="w-4 h-4 mr-2" /> File Complaint
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
            <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{editingId ? 'Edit Complaint' : 'File New Complaint'}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Submit an issue for HR review.</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subject</Label>
                <Input className="rounded-xl h-11 shadow-sm" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required placeholder="Brief description of the issue" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Textarea className="rounded-xl shadow-sm resize-none" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} required placeholder="Provide detailed information..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger className="rounded-xl h-11 shadow-sm"><SelectValue /></SelectTrigger>
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
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger className="rounded-xl h-11 shadow-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="rounded-xl h-11 shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="rounded-xl px-6 shadow-md">Submit Complaint</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-xl rounded-2xl bg-card/60 backdrop-blur-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 border-b border-border/40 bg-muted/20">
          <CardTitle className="text-lg">Active Complaints</CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-28 bg-muted/40 rounded-2xl animate-pulse border border-border/50" />)}
            </div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-border/60 bg-muted/10">
              <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No active complaints</h3>
              <p className="text-sm text-muted-foreground mt-1">All issues have been resolved or none have been reported.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {complaints.filter(c => c && (c.id || c.id)).map((c) => {
                const cid = c.id || c.id;
                return (
                  <div key={cid} className="group flex flex-col p-5 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl bg-card/40 hover:bg-card/80 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 gap-4 overflow-hidden relative">
                    {c.status === 'open' && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-2xl" />
                    )}
                    {c.status === 'in_progress' && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 rounded-l-2xl" />
                    )}
                    {c.status === 'resolved' && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-2xl" />
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="font-bold text-base text-foreground truncate">{c.subject}</h3>
                          <div className="flex items-center gap-2">
                            <Badge className={statusColors[c.status] || ''}>{c.status?.replace('_', ' ')}</Badge>
                            <Badge className={priorityColors[c.priority] || ''}>{c.priority}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/40 mt-3 mb-3">
                          {c.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-muted-foreground">
                          <span className="bg-background px-2.5 py-1 rounded-md border border-border/50 shadow-sm">
                            <span className="uppercase tracking-widest font-bold opacity-70 mr-1.5">Category</span> {c.category}
                          </span>
                          {c.submittedAt && (
                            <span className="bg-background px-2.5 py-1 rounded-md border border-border/50 shadow-sm">
                              {new Date(c.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                          {c.employeeId?.name && (
                            <span className="bg-background px-2.5 py-1 rounded-md border border-border/50 shadow-sm flex items-center">
                              <span className="uppercase tracking-widest font-bold opacity-70 mr-1.5">By</span>
                              <span className="text-foreground">{c.employeeId.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 w-full sm:w-auto mt-2 sm:mt-0">
                        {c.status !== 'resolved' && c.status !== 'closed' && (
                          <Button variant="outline" size="sm" className="h-9 w-full sm:w-auto rounded-xl shadow-sm border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5 px-3" onClick={() => handleResolve(cid)}>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Resolve
                          </Button>
                        )}
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button variant="outline" size="sm" className="h-9 flex-1 sm:flex-none rounded-xl shadow-sm border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5 px-3" onClick={() => handleEdit(c)}>
                            <Edit className="w-3.5 h-3.5 text-muted-foreground" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" className="h-9 flex-1 sm:flex-none rounded-xl shadow-sm border-red-200 hover:bg-red-50 text-red-600 dark:hover:bg-red-900/20 gap-1.5 px-3" onClick={() => handleDelete(cid)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
