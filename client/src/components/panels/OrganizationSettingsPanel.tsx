import { useState, useEffect } from 'react';
import { Building2, Upload, Save, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export function OrganizationSettingsPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    logo: ''
  });

  useEffect(() => {
    fetchOrgDetails();
  }, []);

  const fetchOrgDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.data?.organization) {
        const org = res.data.data.organization;
        setFormData({
          name: org.name || '',
          email: org.email || '',
          phone: org.phone || '',
          address: org.address || '',
          logo: org.logo || ''
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading('Uploading logo...');
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await api.post('/auth/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, logo: res.data.url }));
      toast.success('Logo uploaded successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload logo', { id: toastId });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const orgId = user?.organizationId;
      if (!orgId) throw new Error('No active organization associated');
      
      const targetId = typeof orgId === 'object' ? (orgId as any).id : orgId;
      await api.put(`/organizations/${targetId}`, formData);
      toast.success('Organization settings updated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading settings...</div>;
  }

  const logoUrl = api.getFileUrl(formData.logo);

  return (
    <Card className="max-w-2xl mx-auto shadow-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <CardTitle>Organisation Settings</CardTitle>
            <CardDescription>Configure your institution's profile branding and logo settings</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b">
            <div className="w-24 h-24 rounded-xl border bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 relative group">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Globe className="w-10 h-10 text-slate-300" />
              )}
            </div>
            <div className="space-y-2 text-center sm:text-left">
              <Label htmlFor="logo-input" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                  <Upload className="w-4 h-4" /> Upload New Logo
                </div>
              </Label>
              <input id="logo-input" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              <p className="text-xs text-muted-foreground">Supported formats: PNG, JPG or WebP (max 2MB)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Institution / Organisation Name</Label>
              <Input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Pype ERM Institute"
              />
            </div>
            <div className="space-y-2">
              <Label>Billing Email Address</Label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. accounts@pype.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +91 9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label>Registered Address</Label>
              <Input
                required
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. 1st Floor, Building Block 4"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
