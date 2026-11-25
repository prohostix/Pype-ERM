import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { confirmDialog } from '@/lib/confirm';

export function StudyCentersPanel() {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin'].includes(user?.role || '');
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    contact: '',
    email: '',
    status: 'active'
  });

  // Credentials Dialog State
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [credTarget, setCredTarget] = useState<any>(null);
  const [credPassword, setCredPassword] = useState('');
  const [savingCred, setSavingCred] = useState(false);

  const handleOpenCredentials = (c: any) => {
    setCredTarget(c);
    setCredPassword(c.credentials?.password || '');
    setCredDialogOpen(true);
  };

  const handleSaveCredentials = async () => {
    if (!credTarget) return;
    setSavingCred(true);
    try {
      const updatedCreds = {
        email: credTarget.email,
        password: credPassword
      };
      await api.put(`/operations/centers/${credTarget.id}`, {
        credentials: updatedCreds
      });
      toast.success('Credentials updated successfully');
      setCredDialogOpen(false);
      fetchCenters();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update credentials');
    } finally {
      setSavingCred(false);
    }
  };

  useEffect(() => { fetchCenters(); }, []);

  const fetchCenters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operations/centers');
      setCenters(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch centers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/operations/centers/${editingId}`, formData);
      } else {
        await api.post('/operations/centers', formData);
      }
      setDialogOpen(false);
      resetForm();
      fetchCenters();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save center');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id || c.id);
    setFormData({
      name: c.name || '',
      code: c.code || '',
      address: c.address || '',
      contact: c.contact || '',
      email: c.email || '',
      status: c.status || 'pending'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete academic partner?', message: 'Delete this academic partner?', confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.delete(`/operations/centers/${id}`);
      fetchCenters();
    } catch (err) {
      console.error('Failed to delete center:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', code: '', address: '', contact: '', email: '', status: 'active' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Academic Partner Management</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Manage academic partners and locations</p>
        </div>
        {canWrite && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"><Plus className="w-4 h-4 mr-2" />Add Academic Partner</Button>
            </DialogTrigger>
          <DialogContent className="wizard-form max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">{editingId ? 'Edit Academic Partner' : 'Add New Academic Partner'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Center Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Center Code</Label>
                  <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Contact (Phone)</Label>
                  <Input value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 h-11 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save'}
                </Button>
                <Button type="button" variant="outline" className="h-11 px-6 rounded-full" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Academic Partners</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{centers.length} total</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : centers.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><MapPin className="w-6 h-6" /></div>
              <p className="text-sm">No academic partners found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {centers.filter(c => c && (c.id || c.id)).map((c) => {
                const cid = c.id || c.id;
                return (
                  <div key={cid} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-sm text-muted-foreground">Code: {c.code} • {c.email}</div>
                        {c.address && <div className="text-xs text-muted-foreground">{c.address}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${c.status === 'active' ? 'bg-[#dff3da] text-[#256c1d]' : c.status === 'pending' ? 'bg-amber-100 text-amber-700' : c.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-slate-200/70 text-slate-600'}`}>{c.status}</span>
                      {canWrite && (
                        <>
                          <Button variant="outline" size="sm" className="rounded-full border-[#cfe9c9] bg-white hover:bg-[#eaf6e6]" onClick={() => handleOpenCredentials(c)} title="View/Edit Credentials">
                            <Key className="w-4 h-4 text-[#256c1d]" />
                          </Button>
                          <Button variant="ghost" size="sm" className="rounded-full hover:bg-white" onClick={() => handleEdit(c)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(cid)}><Trash2 className="w-4 h-4" /></Button>
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

      {/* View/Edit Credentials Dialog */}
      <Dialog open={credDialogOpen} onOpenChange={setCredDialogOpen}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Login Credentials — {credTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Username (Email)</Label>
              <Input value={credTarget?.credentials?.email || credTarget?.email || ''} readOnly className="text-muted-foreground" />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="text"
                value={credPassword}
                onChange={(e) => setCredPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleSaveCredentials} disabled={savingCred || !credPassword}>
                {savingCred ? 'Saving...' : 'Update Password'}
              </Button>
              <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setCredDialogOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
