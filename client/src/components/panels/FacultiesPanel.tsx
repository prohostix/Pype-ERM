import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, UserCheck, Mail, Phone, Search, X, Users, CheckCircle2, PauseCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { confirmDialog } from '@/lib/confirm';
import { mayOn } from '@/lib/access';

export function FacultiesPanel() {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin'].includes(user?.role || '');
  const mayCreate = mayOn(user, 'faculties', 'create', canWrite);
  const mayEdit = mayOn(user, 'faculties', 'edit', canWrite);
  const mayDelete = mayOn(user, 'faculties', 'delete', canWrite);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    specialization: '',
    status: 'active'
  });

  useEffect(() => { fetchFaculties(); }, []);

  const fetchFaculties = async () => {
    setLoading(true);
    try {
      const res = await api.get('/faculties');
      setFaculties(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch faculties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/faculties/${editingId}`, formData);
        toast.success('Faculty updated successfully');
      } else {
        await api.post('/faculties', formData);
        toast.success('Faculty created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchFaculties();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save faculty');
    }
  };

  const handleEdit = (f: any) => {
    setEditingId(f.id);
    setFormData({
      name: f.name || '',
      email: f.email || '',
      phone: f.phone || '',
      password: '', // Leave blank when editing to not change it unnecessarily, or f.password if you prefer to show it (usually not safe)
      specialization: f.specialization || '',
      status: f.status || 'active'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete faculty member?', message: 'Are you sure you want to delete this faculty member?', confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.delete(`/faculties/${id}`);
      toast.success('Faculty deleted successfully');
      fetchFaculties();
    } catch (err) {
      console.error('Failed to delete faculty:', err);
      toast.error('Failed to delete faculty');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', phone: '', password: '', specialization: '', status: 'active' });
  };

  const counts = useMemo(() => ({
    all: faculties.length,
    active: faculties.filter(f => f.status === 'active').length,
    inactive: faculties.filter(f => f.status !== 'active').length,
  }), [faculties]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return faculties.filter(f => {
      if (statusFilter === 'active' && f.status !== 'active') return false;
      if (statusFilter === 'inactive' && f.status === 'active') return false;
      if (!q) return true;
      return [f.name, f.email, f.phone, f.specialization].some((v: any) => (v || '').toString().toLowerCase().includes(q));
    });
  }, [faculties, search, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Faculty Management</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Manage faculty members and their details</p>
        </div>
        {(mayCreate || mayEdit) && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            {mayCreate && (
              <DialogTrigger asChild>
                <Button className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm shrink-0 self-start lg:self-auto"><Plus className="w-4 h-4" />Add Faculty</Button>
              </DialogTrigger>
            )}
            <DialogContent className="w-[95vw] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
              <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                  {editingId ? <Edit className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                </div>
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="text-2xl font-semibold tracking-tight text-left">{editingId ? 'Edit Faculty' : 'Add New Faculty'}</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground text-left">Faculty sign in to the faculty portal with these details.</DialogDescription>
                </DialogHeader>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Name <span className="text-rose-500">*</span></Label>
                    <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Email <span className="text-rose-500">*</span></Label>
                      <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Phone</Label>
                      <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Password {editingId ? <span className="font-normal text-muted-foreground">(leave blank to keep unchanged)</span> : <span className="text-rose-500">*</span>}</Label>
                    <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingId} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Specialization</Label>
                    <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={formData.specialization} onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} placeholder="e.g. Data Structures" />
                  </div>
                  <div className="space-y-2 pb-2">
                    <Label className="text-sm font-semibold">Status</Label>
                    <div className="flex gap-2.5">
                      {([['active', 'Active'], ['inactive', 'Inactive']] as const).map(([val, label]) => (
                        <button key={val} type="button" aria-pressed={formData.status === val} onClick={() => setFormData({ ...formData, status: val })}
                          className={cn('px-6 py-2.5 rounded-full text-sm font-semibold border transition-colors', formData.status === val ? 'bg-[#0b1d14] border-[#0b1d14] text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-[#f4f6f3]')}>{label}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
                  <Button type="submit" className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary */}
      {faculties.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {[
            { label: 'Total faculty', value: counts.all, icon: Users },
            { label: 'Active', value: counts.active, icon: CheckCircle2 },
            { label: 'Inactive', value: counts.inactive, icon: PauseCircle },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="rounded-3xl gap-0">
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="text-3xl font-semibold tracking-tight mt-1">{value}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search + status */}
      {faculties.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone or specialization..." className="pl-11 pr-9 h-11 rounded-full bg-white border-slate-200 shadow-sm text-sm" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search"><X className="w-4 h-4" /></button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {([{ id: 'all', label: 'All' }, { id: 'active', label: 'Active' }, { id: 'inactive', label: 'Inactive' }] as const).map(f => (
              <button key={f.id} onClick={() => setStatusFilter(f.id)}
                className={cn('px-4 py-2 rounded-full text-xs font-semibold transition-colors', statusFilter === f.id ? 'bg-[#0b1d14] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
                {f.label} ({counts[f.id]})
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">{[1, 2, 3].map(i => <div key={i} className="h-52 bg-[#f4f6f3] rounded-3xl animate-pulse" />)}</div>
      ) : faculties.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white dark:bg-card py-16 text-center">
          <span className="w-14 h-14 rounded-full bg-[#f4f6f3] flex items-center justify-center mx-auto mb-3"><UserCheck className="w-6 h-6 text-muted-foreground" /></span>
          <p className="font-medium text-foreground">No faculty members found</p>
          {mayCreate && <p className="text-sm text-muted-foreground mt-1">Add a faculty member to get started.</p>}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-muted-foreground">No faculty match your search or filter.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 sm:gap-6">
          {visible.map((f) => (
            <Card key={f.id} className="rounded-3xl gap-0 hover:-translate-y-0.5 transition-all duration-300">
              <CardContent className="p-6 flex flex-col gap-4 h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center font-semibold text-lg shrink-0">
                      {(f.name || '?').substring(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base truncate" title={f.name}>{f.name}</h3>
                      <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize mt-1', f.status === 'active' ? 'bg-[#e3f7dd] text-[#1f6a17]' : 'bg-slate-100 text-slate-600')}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', f.status === 'active' ? 'bg-[#54b947]' : 'bg-slate-400')} />{f.status}
                      </span>
                    </div>
                  </div>
                  {(mayEdit || mayDelete) && (
                    <div className="flex gap-1.5 shrink-0">
                      {mayEdit && <button onClick={() => handleEdit(f)} title="Edit faculty" className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-[#eaf6e6] hover:text-[#256c1d] transition-colors"><Edit className="w-3.5 h-3.5" /></button>}
                      {mayDelete && <button onClick={() => handleDelete(f.id)} title="Delete faculty" className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  )}
                </div>

                {f.specialization && (
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#e3f7dd] text-[#1f6a17] w-fit">{f.specialization}</span>
                )}

                <div className="space-y-2 mt-auto">
                  <a href={`mailto:${f.email}`} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#f4f6f3] dark:bg-muted/30 text-sm text-slate-700 hover:text-[#256c1d] transition-colors min-w-0">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-[#256c1d]" /><span className="truncate">{f.email}</span>
                  </a>
                  {f.phone && (
                    <a href={`tel:${f.phone}`} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#f4f6f3] dark:bg-muted/30 text-sm text-slate-700 hover:text-[#256c1d] transition-colors">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-[#256c1d]" />{f.phone}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
