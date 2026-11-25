import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ListPagination } from '@/components/ui/list-pagination';

export function HolidaysPanel() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const canManage = ['hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin'].includes(user?.role || '');
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', date: '', type: 'national', description: '' });

  useEffect(() => { fetchHolidays(); }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/holidays');
      setHolidays(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/hr/holidays/${editingId}`, formData);
      } else {
        await api.post('/hr/holidays', formData);
      }
      setDialogOpen(false);
      resetForm();
      fetchHolidays();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save holiday');
    }
  };

  const handleEdit = (h: any) => {
    setEditingId(h.id || h.id);
    setFormData({
      name: h.name || '',
      date: h.date ? new Date(h.date).toISOString().split('T')[0] : '',
      type: h.type || 'national',
      description: h.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this holiday?')) return;
    try {
      await api.delete(`/hr/holidays/${id}`);
      toast.success('Holiday deleted');
      fetchHolidays();
    } catch (err) {
      console.error('Failed to delete holiday:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', date: '', type: 'national', description: '' });
  };

  const typeColors: any = {
    national: 'bg-sky-100 text-sky-700',
    regional: 'bg-violet-100 text-violet-700',
    company: 'bg-[#dff3da] text-[#256c1d]',
  };

  const sortedHolidays = holidays.filter(h => h && h.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const currentPage = Math.min(page, Math.max(1, Math.ceil(sortedHolidays.length / pageSize)));
  const pagedHolidays = sortedHolidays.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Holiday Calendar</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Company holidays and observances</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-full h-11 px-6 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
                <Plus className="w-4 h-4 mr-2" /> Add Holiday
              </Button>
            </DialogTrigger>
            <DialogContent className="wizard-form max-w-md border-0 rounded-[2rem] overflow-hidden p-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
              <div className="bg-[#f4f6f3] p-6 border-b border-slate-100 flex items-center gap-3">
                <div>
                  <DialogTitle className="text-xl font-semibold tracking-tight">{editingId ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Manage designated holidays.</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600">Holiday Name</Label>
                  <Input className="rounded-xl h-11" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-600">Date</Label>
                    <Input type="date" className="rounded-xl h-11" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-600">Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="national">National</SelectItem>
                        <SelectItem value="regional">Regional</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600">Description (optional)</Label>
                  <Input className="rounded-xl h-11" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="pt-4 flex justify-end gap-2">
                  <Button type="button" variant="ghost" className="rounded-full h-11 px-6" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="rounded-full h-11 px-7 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">Save Holiday</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Upcoming Holidays</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{holidays.length} total</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-14 px-4">
              <div className="bg-[#eaf6e6] text-[#256c1d] w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"><Calendar className="w-6 h-6" /></div>
              <h3 className="text-lg font-semibold text-slate-900">No holidays found</h3>
              <p className="text-sm text-muted-foreground mt-1">There are no company holidays registered.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagedHolidays.map((h) => {
                const hid = h.id || h.id;
                const d = new Date(h.date);
                
                // Compare just the dates (ignoring time) to check if past
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const holidayDate = new Date(h.date);
                holidayDate.setHours(0, 0, 0, 0);
                const isUpcoming = holidayDate >= today;
                
                return (
                  <div key={hid} className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl ${isUpcoming ? 'bg-[#f4f6f3] hover:bg-[#eef5ec]' : 'bg-[#f4f6f3] opacity-60'} transition-colors gap-4 overflow-hidden relative`}>
                    {!isUpcoming && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300" />
                    )}
                    {isUpcoming && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#54b947]" />
                    )}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl ${isUpcoming ? 'bg-[#8ae47e] text-[#0b1d14]' : 'bg-white text-slate-500'} shrink-0`}>
                        <div className="text-xl font-semibold leading-none">{d.getDate()}</div>
                        <div className="text-[10px] font-semibold uppercase tracking-widest mt-0.5">{d.toLocaleDateString('en-US', { month: 'short' })}</div>
                      </div>
                      <div className="min-w-0">
                        <div className={`font-semibold text-base truncate ${!isUpcoming ? 'text-muted-foreground' : 'text-slate-900'}`}>{h.name}</div>
                        <div className="text-xs font-medium text-muted-foreground mt-0.5">
                          {d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        {h.description && <div className="text-xs text-muted-foreground mt-1.5 italic">"{h.description}"</div>}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 shrink-0">
                      <Badge className={`border-none rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${typeColors[h.type] || 'bg-slate-200/70 text-slate-600'}`}>
                        {h.type}
                      </Badge>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-9 w-9 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6] p-0" onClick={() => handleEdit(h)}>
                            <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-9 w-9 rounded-full border-red-200 bg-white hover:bg-red-50 text-red-600 p-0" onClick={() => handleDelete(hid)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <ListPagination total={sortedHolidays.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
