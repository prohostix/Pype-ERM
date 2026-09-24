import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

export function LicensesPanel() {
  const [licenses, setLicenses] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    maxUsers: '10',
    maxStorage: '1024',
    durationMonths: '12',
    price: '',
    perEnrollmentFee: '0',
    status: 'active',
    features: '',
  });

  useEffect(() => { fetchLicenses(); }, []);

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/licenses');
      setLicenses(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch licenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      tag: formData.tag,
      maxUsers: Number(formData.maxUsers),
      maxStorage: Number(formData.maxStorage),
      durationMonths: Number(formData.durationMonths),
      price: Number(formData.price),
      perEnrollmentFee: Number(formData.perEnrollmentFee),
      status: formData.status,
      features: formData.features ? formData.features.split('\n').map(f => f.trim()).filter(Boolean) : [],
    };
    try {
      if (editingId) {
        await api.put(`/licenses/${editingId}`, payload);
      } else {
        await api.post('/licenses', payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchLicenses();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save license');
    }
  };

  const handleEdit = (l: Record<string, unknown>) => {
    setEditingId(l.id || l.id);
    setFormData({
      name: l.name || '',
      type: l.type || 'basic',
      maxUsers: l.maxUsers?.toString() || '10',
      maxStorage: l.maxStorage?.toString() || '1024',
      durationMonths: l.durationMonths?.toString() || '12',
      price: l.price?.toString() || '',
      status: l.status || 'active',
      features: Array.isArray(l.features) ? l.features.join('\n') : '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this license?')) return;
    try {
      await api.delete(`/licenses/${id}`);
      fetchLicenses();
    } catch (err) {
      console.error('Failed to delete license:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', tag: '', maxUsers: '10', maxStorage: '1024', durationMonths: '12', price: '', status: 'active', features: '' });
  };





  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">License Management</h2>
          <p className="text-muted-foreground">Manage software licenses and subscription plans</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add License
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit License' : 'Add New License'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>License Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g., Basic Plan" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Tag</Label>
                  <Input value={formData.tag} onChange={(e) => setFormData({ ...formData, tag: e.target.value })} placeholder="e.g., Most Popular" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Max Users</Label>
                  <Input type="number" min="1" value={formData.maxUsers} onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })} required />
                </div>
                <div>
                  <Label>Max Storage (MB)</Label>
                  <Input type="number" min="1" value={formData.maxStorage} onChange={(e) => setFormData({ ...formData, maxStorage: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Duration (months)</Label>
                  <Input type="number" min="1" value={formData.durationMonths} onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })} required />
                </div>
                <div>
                  <Label>Price (Base)</Label>
                  <Input type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label>Per Enrollment Fee (₹)</Label>
                <Input type="number" min="0" step="0.01" value={formData.perEnrollmentFee} onChange={(e) => setFormData({ ...formData, perEnrollmentFee: e.target.value })} required />
              </div>
              <div>
                <Label>Features (One per line)</Label>
                <Textarea value={formData.features} onChange={(e) => setFormData({ ...formData, features: e.target.value })} placeholder="e.g.&#10;Academic Center Management&#10;Advanced Attendance Tracking" className="min-h-[100px] bg-background" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Save</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : licenses.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
          <p className="text-lg">No licenses found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {licenses.map((l) => {
            const lid = l.id || l.id;
            return (
              <Card key={lid} className="relative flex flex-col hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden border-border/50">
                <div className={`h-1.5 w-full ${l.tag === 'PREMIUM' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                <CardHeader className="pb-4 pt-6 px-6">
                  <div className="flex items-start justify-between">
                    <div>
                      {l.tag && (
                        <Badge variant="default" className="mb-3 text-[10px] uppercase tracking-wider font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200">
                          {l.tag as string}
                        </Badge>
                      )}
                      <CardTitle className="text-xl font-bold">{l.name as string}</CardTitle>
                    </div>
                    <Badge variant={l.status === 'active' ? 'outline' : 'secondary'} className="capitalize">{l.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col px-6">
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight">₹{l.price}</span>
                      <span className="text-sm font-medium text-muted-foreground">/ {l.durationMonths} mo</span>
                    </div>
                    {l.perEnrollmentFee > 0 && (
                      <p className="mt-2 text-sm font-medium text-amber-600 bg-amber-50 inline-block px-2 py-0.5 rounded border border-amber-100">
                        + ₹{l.perEnrollmentFee} per enrollment
                      </p>
                    )}
                  </div>

                  <div className="space-y-4 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Everything in plan</p>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-sm text-foreground/90">
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                        <span>Up to <strong className="font-semibold text-foreground">{l.maxUsers} Users</strong></span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-foreground/90">
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                        <span><strong className="font-semibold text-foreground">{l.maxStorage} MB</strong> Storage</span>
                      </li>
                      {l.features?.map((feat: string, i: number) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-foreground/90">
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                          <span className="capitalize">{feat.replace(/_/g, ' ')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-4 border-t flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(l)} className="hover:bg-blue-50 hover:text-blue-600"><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(lid)} className="hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
