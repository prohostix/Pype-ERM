import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { uploadFormFile } from '@/lib/uploadFile';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function MyProfilePanel() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>;
  }

  // Helper to format role names (e.g., 'sales_admin' -> 'Sales Admin')
  const formatRole = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getProbationStatus = () => {
    const profile = (user as any).employeeProfileDetail;
    if (!profile?.joinDate) return null;
    const probationEnd = profile.probationEndDate ? new Date(profile.probationEndDate) : null;
    const today = new Date();

    if (!probationEnd) return { text: 'N/A', active: false, type: 'default' };

    if (probationEnd > today) {
      const diffTime = Math.abs(probationEnd.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        text: `Active (${diffDays} days left)`,
        active: true,
        type: 'warning',
        dateStr: probationEnd.toLocaleDateString()
      };
    } else {
      return {
        text: 'Completed',
        active: false,
        type: 'success',
        dateStr: probationEnd.toLocaleDateString()
      };
    }
  };

  const probation = getProbationStatus();

  const startEditing = () => {
    setForm({ name: user.name || '', phone: user.phone || '' });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({ name: form.name.trim(), phone: form.phone.trim() });
      await refreshUser();
      toast.success('Profile updated');
      setEditing(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error('Please choose a JPG, PNG, WEBP or GIF image');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Compressing & updating profile picture...');
    try {
      const url = await uploadFormFile(file);
      await api.updateProfile({ avatar: url });
      await refreshUser();
      toast.success('Profile picture updated', { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update profile picture', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    try {
      await api.updateProfile({ avatar: null });
      await refreshUser();
      toast.success('Profile picture removed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove profile picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 wizard-form fee-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">My Profile</h2>
          <p className="text-muted-foreground text-sm mt-1.5">View and update your personal details.</p>
        </div>
        <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${user.status === 'active' || !user.status ? 'bg-[#dff3da] text-[#256c1d]' : 'bg-slate-200/70 text-slate-600'}`}>
          {(user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)} Account
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Left Column - Main Profile Card */}
        <div className="rounded-3xl bg-white border border-slate-100 lg:col-span-1">
          <div className="p-6 sm:p-8 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center overflow-hidden text-4xl font-semibold">
                {user.avatar ? (
                  <img src={api.getFileUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{(user.name || '?')[0].toUpperCase()}</span>
                )}
                {uploading && (
                  <div className="absolute inset-0 rounded-full bg-black/45 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Change profile picture"
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-[#8ae47e] text-[#0b1d14] flex items-center justify-center ring-4 ring-white hover:bg-[#7bd96f] disabled:opacity-60"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            {user.avatar && !uploading && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-xs font-semibold text-slate-500 hover:text-red-600 -mt-3 mb-4"
              >
                Remove picture
              </button>
            )}

            <h3 className="text-2xl font-semibold tracking-tight mb-1">{user.name}</h3>
            <p className="text-slate-600 font-medium mb-4">{user.designation || 'Employee'}</p>

            <span className="mb-6 rounded-full bg-[#f4f6f3] px-4 py-1.5 text-xs font-semibold text-slate-700">
              Role: {formatRole(user.role)}
            </span>

            <div className="w-full space-y-2 text-sm mt-2">
              <div className="rounded-2xl bg-[#f4f6f3] px-4 py-3 text-left">
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-medium text-slate-900 truncate">{user.email}</p>
              </div>
              <div className="rounded-2xl bg-[#f4f6f3] px-4 py-3 text-left">
                <p className="text-xs text-slate-500">Phone</p>
                <p className="font-medium text-slate-900">{user.phone || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-row items-center justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-tight">Personal Details</h3>
              {!editing ? (
                <Button variant="outline" onClick={startEditing} className="h-10 px-5 rounded-full bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold">
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="h-10 px-5 rounded-full">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="h-10 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
                    {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                    Save
                  </Button>
                </div>
              )}
            </div>
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full Name</Label>
                  {editing ? (
                    <Input id="profile-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  ) : (
                    <p className="font-medium rounded-2xl bg-[#f4f6f3] px-4 py-3 text-slate-900">{user.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-phone">Phone</Label>
                  {editing ? (
                    <Input id="profile-phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +91 98765 43210" />
                  ) : (
                    <p className="font-medium rounded-2xl bg-[#f4f6f3] px-4 py-3 text-slate-900">{user.phone || 'Not provided'}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Email</Label>
                  <p className="font-medium rounded-2xl bg-[#f4f6f3] px-4 py-3 text-slate-900">{user.email}</p>
                  {editing && (
                    <p className="text-xs text-muted-foreground">Your email is your login, so it can only be changed by an administrator.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold tracking-tight">Employment Details</h3>
            </div>
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[#f4f6f3] px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">Employee ID</p>
                  <p className="font-medium text-slate-900">
                    {(user as any).userId || (user as any).employeeId || 'N/A'}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f4f6f3] px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">Organization</p>
                  <p className="font-medium text-slate-900">
                    {user.organization?.name || 'N/A'}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f4f6f3] px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">Department</p>
                  <p className="font-medium text-slate-900">
                    {(user as any).department?.name || 'Not assigned'}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f4f6f3] px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">Sub-Department</p>
                  <p className="font-medium text-slate-900">
                    {(user as any).subDepartment?.name || 'Not assigned'}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f4f6f3] px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">Work Location</p>
                  <p className="font-medium text-slate-900">
                    {(user as any).employeeProfileDetail?.workLocation || (user as any).branch?.name || user.organization?.address || 'Head Office'}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f4f6f3] px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">Join Date</p>
                  <p className="font-medium text-slate-900">
                    {(user as any).employeeProfileDetail?.joinDate ? new Date((user as any).employeeProfileDetail.joinDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f4f6f3] px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">Probation Status</p>
                  {probation ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={probation.type as any} className={probation.type === 'warning' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : (probation.type === 'success' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : '')}>
                          {probation.text}
                        </Badge>
                      </div>
                      {probation.dateStr && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {probation.active ? 'Ends on: ' : 'Ended on: '} {probation.dateStr}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="font-medium text-slate-900">N/A</p>
                  )}
                </div>
                <div className="rounded-2xl bg-[#f4f6f3] px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">Last Login</p>
                  <p className="font-medium text-slate-900">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
