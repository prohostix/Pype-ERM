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
    logo: '',
    enrollmentApprovalFlow: 'direct'
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
          logo: org.logo || '',
          enrollmentApprovalFlow: (org.metadata as any)?.enrollmentApprovalFlow || 'direct'
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

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = async () => {
      URL.revokeObjectURL(url);
      
      const MAX_WIDTH = 600;
      const MAX_HEIGHT = 150;

      if (img.width > MAX_WIDTH || img.height > MAX_HEIGHT) {
        toast.error(`Image is too large (${img.width}x${img.height}px). Maximum allowed dimensions are ${MAX_WIDTH}x${MAX_HEIGHT}px.`);
        return;
      }

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
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error('Invalid image file');
    };
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium">Loading settings...</p>
      </div>
    );
  }

  const logoUrl = api.getFileUrl(formData.logo);

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full">
      <Card className="max-w-3xl mx-auto shadow-sm">
        <CardHeader className="border-b px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Organisation Settings</CardTitle>
              <CardDescription className="mt-1">
                Configure your institution's profile branding and logo settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 pt-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Logo Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-28 h-28 rounded-xl border border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden shrink-0 relative group transition-colors hover:border-primary/50">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Globe className="w-10 h-10 text-muted-foreground group-hover:text-primary/70 transition-colors" />
              )}
            </div>
            <div className="space-y-2 text-center sm:text-left flex-1 pt-2">
              <h3 className="text-sm font-medium">Institution Logo</h3>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                Supported formats: PNG, JPG or WebP (max 2MB).<br />
                <span className="text-xs">Recommended: Fits top navbar (Max {600}x{150}px)</span>
              </p>
              <Label htmlFor="logo-input" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted transition-colors">
                  <Upload className="w-4 h-4" /> {logoUrl ? 'Change Logo' : 'Upload Logo'}
                </div>
              </Label>
              <input id="logo-input" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">General Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
          </div>

          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-sm font-medium">Preferences</h3>
            <div className="space-y-2 max-w-lg">
              <Label>Enrollment Approval Flow</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.enrollmentApprovalFlow}
                onChange={e => setFormData({ ...formData, enrollmentApprovalFlow: e.target.value })}
              >
                <option value="direct">Direct to Operations (Default)</option>
                <option value="sales_admin_approval">Require Sales Admin Approval</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1.5">
                Determine if sales enrollments go directly to operations or if they require a sales admin's approval first.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t">
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </div>
  );
}
