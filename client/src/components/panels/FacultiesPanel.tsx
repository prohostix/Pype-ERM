import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UserCheck } from 'lucide-react';
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

export function FacultiesPanel() {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin'].includes(user?.role || '');
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    if (!confirm('Are you sure you want to delete this faculty member?')) return;
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Faculty Management</h2>
          <p className="text-muted-foreground">Manage faculty members and their details</p>
        </div>
        {canWrite && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Faculty</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Faculty' : 'Add New Faculty'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>Name *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Password {editingId ? '(Leave blank to keep unchanged)' : '*'}</Label>
                    <Input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingId} />
                  </div>
                  <div>
                    <Label>Phone</Label>

                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Specialization</Label>
                    <Input value={formData.specialization} onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">Save</Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Faculty List</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading faculties...</div>
          ) : faculties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No faculty members found</div>
          ) : (
            <div className="space-y-3">
              {faculties.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{f.name}</div>
                      <div className="text-sm text-muted-foreground">{f.email} {f.phone && `• ${f.phone}`}</div>
                      {f.specialization && <div className="text-xs text-muted-foreground mt-0.5 font-medium bg-muted inline-block px-2 py-0.5 rounded-full">{f.specialization}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={f.status === 'active' ? 'default' : 'secondary'}>{f.status}</Badge>
                    {canWrite && (
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(f)}><Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}><Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" /></Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
