import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Megaphone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

import { useAuth } from '@/hooks/useAuth';
import { confirmDialog } from '@/lib/confirm';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

const TYPE_COLORS: Record<string, string> = {
  general: 'bg-blue-100 text-blue-800',
  hr: 'bg-purple-100 text-purple-800',
  ops: 'bg-orange-100 text-orange-800',
  finance: 'bg-emerald-100 text-emerald-800',
  sales: 'bg-cyan-100 text-cyan-800',
};

export function AnnouncementsPanel() {
  const { user } = useAuth();
  const canManage = ['hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin'].includes(user?.role || '');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', content: '', type: 'general', priority: 'medium', expiresAt: '',
  });

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/announcements');
      setAnnouncements(res.data.data || []);
    } catch { toast.error('Failed to load announcements'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, expiresAt: form.expiresAt || undefined };
      if (editingId) {
        await api.put(`/hr/announcements/${editingId}`, payload);
        toast.success('Announcement updated');
      } else {
        await api.post('/hr/announcements', payload);
        toast.success('Announcement published');
      }
      setDialogOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleEdit = (a: any) => {
    setEditingId(a.id || a.id);
    setForm({
      title: a.title || '',
      content: a.content || '',
      type: a.type || 'general',
      priority: a.priority || 'medium',
      expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete announcement?', message: 'Delete this announcement?', confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.delete(`/hr/announcements/${id}`);
      toast.success('Deleted');
      fetchAnnouncements();
    } catch { toast.error('Failed to delete'); }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ title: '', content: '', type: 'general', priority: 'medium', expiresAt: '' });
  };

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Announcements</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Publish org-wide announcements visible to all employees</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAnnouncements} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          {canManage && (
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
              <Plus className="w-4 h-4 mr-2" /> New Announcement
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Published Announcements</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{announcements.length} total</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Megaphone className="w-6 h-6" /></div>
              <p className="text-sm">No announcements yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => {
                const aid = a.id || a.id;
                return (
                  <div key={aid} className="flex items-start gap-4 p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                    <div className="w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center shrink-0">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{a.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{a.content}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge className={`text-xs rounded-full border-0 px-3 ${TYPE_COLORS[a.type] || ''}`}>{a.type}</Badge>
                        <Badge className={`text-xs rounded-full border-0 px-3 ${PRIORITY_COLORS[a.priority] || ''}`}>{a.priority}</Badge>
                        {a.postedBy?.name && <span className="text-xs text-muted-foreground">by {a.postedBy.name}</span>}
                        <span className="text-xs text-muted-foreground">{new Date(a.postedAt || a.createdAt).toLocaleDateString()}</span>
                        {a.expiresAt && <span className="text-xs text-orange-600">Expires {new Date(a.expiresAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {canManage && (
                        <>
                          <Button variant="ghost" size="sm" className="rounded-full hover:bg-white" onClick={() => handleEdit(a)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(aid)}><Trash2 className="w-4 h-4" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {canManage && (
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="wizard-form max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Content</Label>
              <Textarea rows={4} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="ops">Operations</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Expires On (optional)</Label>
              <Input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1 h-11 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">{editingId ? 'Update' : 'Publish'}</Button>
              <Button type="button" variant="outline" className="h-11 px-6 rounded-full" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
