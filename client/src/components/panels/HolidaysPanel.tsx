import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function HolidaysPanel() {
  const { user } = useAuth();
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
    national: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
    regional: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400',
    company: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Holiday Calendar</h2>
          <p className="text-muted-foreground text-sm mt-1">Company holidays and observances</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-md h-10 px-4 transition-transform hover:scale-105 active:scale-95">
                <Plus className="w-4 h-4 mr-2" /> Add Holiday
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
              <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">{editingId ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Manage designated holidays.</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Holiday Name</Label>
                  <Input className="rounded-xl h-11 shadow-sm" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</Label>
                    <Input type="date" className="rounded-xl h-11 shadow-sm" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger className="rounded-xl h-11 shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="national">National</SelectItem>
                        <SelectItem value="regional">Regional</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description (optional)</Label>
                  <Input className="rounded-xl h-11 shadow-sm" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="pt-4 flex justify-end gap-2">
                  <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="rounded-xl px-6 shadow-md">Save Holiday</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-xl rounded-2xl bg-card/60 backdrop-blur-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 border-b border-border/40 bg-muted/20">
          <CardTitle className="text-lg">Upcoming Holidays</CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/40 rounded-2xl animate-pulse border border-border/50" />)}
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-border/60 bg-muted/10">
              <h3 className="text-lg font-bold text-foreground">No holidays found</h3>
              <p className="text-sm text-muted-foreground mt-1">There are no company holidays registered.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {holidays.filter(h => h && (h.id || h.id)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((h) => {
                const hid = h.id || h.id;
                const d = new Date(h.date);
                
                // Compare just the dates (ignoring time) to check if past
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const holidayDate = new Date(h.date);
                holidayDate.setHours(0, 0, 0, 0);
                const isUpcoming = holidayDate >= today;
                
                return (
                  <div key={hid} className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl ${isUpcoming ? 'bg-card/40 hover:bg-card/80 shadow-sm hover:shadow-md' : 'bg-muted/30 opacity-75'} backdrop-blur-xl transition-all duration-300 gap-4 overflow-hidden relative`}>
                    {!isUpcoming && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300 dark:bg-slate-700 rounded-l-2xl" />
                    )}
                    {isUpcoming && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-2xl" />
                    )}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border ${isUpcoming ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-background border-border/50 text-muted-foreground'} shadow-sm shrink-0`}>
                        <div className="text-xl font-black leading-none">{d.getDate()}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5">{d.toLocaleDateString('en-US', { month: 'short' })}</div>
                      </div>
                      <div className="min-w-0">
                        <div className={`font-bold text-base truncate ${!isUpcoming ? 'text-muted-foreground' : 'text-foreground'}`}>{h.name}</div>
                        <div className="text-xs font-medium text-muted-foreground mt-0.5">
                          {d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        {h.description && <div className="text-xs text-muted-foreground mt-1.5 italic">"{h.description}"</div>}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 shrink-0">
                      <Badge className={`border-none rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${typeColors[h.type] || 'bg-slate-100 text-slate-800'}`}>
                        {h.type}
                      </Badge>
                      {canManage && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg shadow-sm border-slate-200 hover:bg-slate-50 p-0" onClick={() => handleEdit(h)}>
                            <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg shadow-sm border-red-200 hover:bg-red-50 text-red-600 p-0" onClick={() => handleDelete(hid)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
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
