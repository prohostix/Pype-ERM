import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Briefcase, Building2, MapPin, Hash, ShieldCheck, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function MyProfilePanel() {
  const { user } = useAuth();

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>;
  }

  // Helper to format role names (e.g., 'sales_admin' -> 'Sales Admin')
  const formatRole = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Profile</h2>
          <p className="text-muted-foreground">View your personal and organizational details.</p>
        </div>
        <Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="text-sm px-3 py-1 bg-success/20 text-success hover:bg-success/30">
          <ShieldCheck className="w-4 h-4 mr-1" />
          {user.status.charAt(0).toUpperCase() + user.status.slice(1)} Account
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Main Profile Card */}
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl md:col-span-1">
          <CardContent className="pt-10 pb-8 flex flex-col items-center text-center">
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-6 shadow-inner ring-4 ring-background">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-primary" />
              )}
            </div>
            
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
