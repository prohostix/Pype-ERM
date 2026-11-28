import { useState, useEffect } from 'react';
import { Upload, Save, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { uploadFormFile } from '@/lib/uploadFile';
import { getCurrencyCode, type CurrencyOption } from '@/lib/currency';
import { AttendanceRulesCard } from './AttendanceRulesCard';

export function OrganizationSettingsPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currencyCode, setCurrencyCodeState] = useState(getCurrencyCode());
  const [currencyOptions, setCurrencyOptionsState] = useState<CurrencyOption[]>([]);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    logo: '',
    enrollmentApprovalFlow: 'direct',
    admissionPrefix: ''
  });

  useEffect(() => {
    fetchOrgDetails();
    api.get('/organizations/currency').then((r) => { setCurrencyOptionsState(r.data?.data?.options || []); setCurrencyCodeState(r.data?.data?.code || 'INR'); }).catch(() => {});
  }, []);

  const saveCurrency = async () => {
    setSavingCurrency(true);
    try {
      await api.put('/organizations/currency', { code: currencyCode });
      toast.success('Currency saved. Reloading to apply it everywhere...');
      setTimeout(() => window.location.reload(), 700);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save currency');
      setSavingCurrency(false);
    }
  };

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
          enrollmentApprovalFlow: (org.metadata as any)?.enrollmentApprovalFlow || 'direct',
          admissionPrefix: (org.metadata as any)?.admissionPrefix || ''
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

      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error('Browser does not support image compression');
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Use webp to preserve transparency while allowing compression, or fallback to png
      const mimeType = file.type === 'image/png' ? 'image/webp' : (file.type || 'image/jpeg');
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Failed to compress image');
          return;
        }

        const newFileName = file.type === 'image/png' ? file.name.replace(/\.[^/.]+$/, ".webp") : file.name;

        const compressedFile = new File([blob], newFileName, {
          type: mimeType,
          lastModified: Date.now(),
        });

        const toastId = toast.loading(width !== img.width ? 'Compressing and uploading logo...' : 'Uploading logo...');
        try {
          const url = await uploadFormFile(compressedFile);
          setFormData(prev => ({ ...prev, logo: url }));
          toast.success('Logo uploaded successfully!', { id: toastId });
        } catch (err: any) {
          toast.error(err.message || 'Failed to upload logo', { id: toastId });
        }
      }, mimeType, 0.9);
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
        <div className="w-8 h-8 border-4 border-[#54b947]/30 border-t-[#54b947] rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium">Loading settings...</p>
      </div>
    );
  }

  const logoUrl = api.getFileUrl(formData.logo);

  return (
    <div className="space-y-6 wizard-form max-w-4xl">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Organisation Settings</h2>
        <p className="text-muted-foreground text-sm mt-1.5">Configure your institution's profile branding and logo settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-3xl bg-white border border-slate-100 p-6 sm:p-8 space-y-8">
          {/* Logo Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-28 h-28 rounded-3xl border-2 border-dashed border-[#cfe9c9] bg-[#f4f6f3] flex items-center justify-center overflow-hidden shrink-0 relative group transition-colors hover:border-[#8ae47e]">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Globe className="w-10 h-10 text-[#256c1d]/60 group-hover:text-[#256c1d] transition-colors" />
              )}
            </div>
            <div className="space-y-2 text-center sm:text-left flex-1 pt-2">
              <h3 className="text-base font-semibold">Institution Logo</h3>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                Supported formats: PNG, JPG or WebP (max 2MB).<br />
                <span className="text-xs">Recommended: Fits top navbar (Max {600}x{150}px)</span>
              </p>
              <Label htmlFor="logo-input" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-[#cfe9c9] bg-white text-[#256c1d] text-sm font-semibold hover:bg-[#eaf6e6] transition-colors">
                  <Upload className="w-4 h-4" /> {logoUrl ? 'Change Logo' : 'Upload Logo'}
                </div>
              </Label>
              <input id="logo-input" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold">General Details</h3>
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
              <div className="space-y-2 sm:col-span-2">
                <Label>Registered Address</Label>
                <Textarea
                  required
                  rows={3}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. 1st Floor, Building Block 4, Knowledge Park, New Delhi"
                />
              </div>
            </div>
          </div>

        </div>

        <div className="rounded-3xl bg-white border border-slate-100 p-6 sm:p-8 space-y-4">
            <h3 className="text-base font-semibold">Preferences</h3>
            <div className="space-y-2 max-w-lg">
              <Label>Enrollment Approval Flow</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-transparent bg-[#f4f6f3] px-3 py-2 text-sm outline-none focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="space-y-2 max-w-lg mt-4">
              <Label>Student Admission Number Prefix</Label>
              <Input
                value={formData.admissionPrefix}
                onChange={e => setFormData({ ...formData, admissionPrefix: e.target.value })}
                placeholder="e.g. ADM or TIM (Leave empty for default)"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Prefix added to auto-generated admission numbers. Defaults to first 3 letters of Org name if left blank.</p>
            </div>
          </div>

        <div className="rounded-3xl bg-white border border-slate-100 p-6 sm:p-8 space-y-3">
            <h3 className="text-base font-semibold">Currency</h3>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 max-w-xl">
              <div className="space-y-2 flex-1">
                <Label>Currency used for all amounts</Label>
                <select
                  className="flex h-11 w-full rounded-xl border border-transparent bg-[#f4f6f3] px-3 py-2 text-sm outline-none focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
                  value={currencyCode}
                  onChange={e => setCurrencyCodeState(e.target.value)}
                >
                  {currencyOptions.map((c) => (
                    <option key={c.code} value={c.code}>{c.name} ({c.code}) — {c.symbol.trim()}</option>
                  ))}
                </select>
              </div>
              <Button type="button" variant="outline" className="h-11 px-5 rounded-full border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6]" onClick={saveCurrency} disabled={savingCurrency || currencyCode === getCurrencyCode()}>
                {savingCurrency ? 'Saving...' : 'Apply currency'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This changes only the symbol and number grouping on screens, receipts, emails and reports. Existing amounts are not converted.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="h-11 px-7 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
      </form>

      <AttendanceRulesCard />
    </div>
  );
}
