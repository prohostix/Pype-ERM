import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Briefcase, Building2, MapPin, Hash, ShieldCheck, Clock, Camera, Loader2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // matches the server upload limit
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
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const upload = await api.post('/auth/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url: string | undefined = upload.data?.url;
      if (!url) throw new Error('Upload returned no file URL');

      await api.updateProfile({ avatar: url });
      await refreshUser();
      toast.success('Profile picture updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update profile picture');
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Profile</h2>
          <p className="text-muted-foreground">View and update your personal details.</p>
        </div>
        <Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="text-sm px-3 py-1 bg-success/20 text-success hover:bg-success/30">
          <ShieldCheck className="w-4 h-4 mr-1" />
          {(user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)} Account
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Main Profile Card */}
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl md:col-span-1">
          <CardContent className="pt-10 pb-8 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center shadow-inner ring-4 ring-background overflow-hidden">
                {user.avatar ? (
                  <img src={api.getFileUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-primary" />
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
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg ring-2 ring-background hover:opacity-90 disabled:opacity-60"
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
                className="text-xs text-muted-foreground hover:text-destructive -mt-3 mb-4"
              >
                Remove picture
              </button>
            )}

            <h3 className="text-2xl font-bold mb-1">{user.name}</h3>
            <p className="text-primary font-medium mb-4">{user.designation || 'Employee'}</p>

            <Badge variant="outline" className="mb-6 font-semibold">
              Role: {formatRole(user.role)}
            </Badge>

            <div className="w-full space-y-4 text-sm mt-2 border-t pt-6">
              <div className="flex items-center text-muted-foreground">
                <Mail className="w-4 h-4 mr-3 text-primary" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Phone className="w-4 h-4 mr-3 text-primary" />
                <span>{user.phone || 'Not provided'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Details */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-md bg-card/60">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Personal Details
              </CardTitle>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                    Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full Name</Label>
                  {editing ? (
                    <Input id="profile-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  ) : (
                    <p className="font-medium">{user.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-phone">Phone</Label>
                  {editing ? (
                    <Input id="profile-phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +91 98765 43210" />
                  ) : (
                    <p className="font-medium">{user.phone || 'Not provided'}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Email</Label>
                  <p className="font-medium">{user.email}</p>
                  {editing && (
                    <p className="text-xs text-muted-foreground">Your email is your login, so it can only be changed by an administrator.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-card/60">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Employee ID</p>
                  <p className="font-medium flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    {(user as any).userId || (user as any).employeeId || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Organization</p>
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    {user.organization?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Department</p>
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    {(user as any).department?.name || 'Not assigned'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Sub-Department</p>
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    {(user as any).subDepartment?.name || 'Not assigned'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Work Location</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {user.organization?.address || 'Head Office'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Join Date</p>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {(user as any).employeeProfileDetail?.joinDate ? new Date((user as any).employeeProfileDetail.joinDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Probation Status</p>
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
                    <p className="font-medium">N/A</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Last Login</p>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
