import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Building2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  organizationId?: any;
  departmentId?: any;
  biometricId?: string;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

export function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    organizationId: '',
    departmentId: '',
    biometricId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, orgsRes, deptsRes] = await Promise.all([
        api.get('/users'),
        api.get('/organizations'),
        api.get('/departments'),
      ]);
      setUsers((usersRes.data.data || []).filter((u: any) => u.status !== 'resigned'));
      setOrganizations(orgsRes.data.data || []);
      setDepartments(deptsRes.data.data || []);
    } catch (error: any) {
      toast.error('Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      organizationId: '',
      departmentId: '',
      biometricId: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      organizationId: user.organizationId?.id || user.organizationId || '',
      departmentId: user.departmentId?.id || user.departmentId || '',
      biometricId: user.biometricId || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = { ...formData };
      
      // Remove empty departmentId
      if (!payload.departmentId) {
        delete (payload as any).departmentId;
      }
      
      // Remove empty biometricId
      if (!payload.biometricId) {
        delete (payload as any).biometricId;
      }
      
      // Remove password if editing and password is empty
      if (editingUser && !payload.password) {
        delete (payload as any).password;
      }

      console.log('Submitting user data:', payload);

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', payload);
        toast.success('User created successfully');
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Operation failed';
      toast.error(errorMessage);
      console.error('Full error:', error);
      console.error('Error response:', error.response?.data);
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;

    try {
      await api.delete(`/users/${deletingUser.id}`);
      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      // DELETE_REQUESTED_NOT_COMPLETED = 202 approval flow, toast already shown
      if (error?.message === 'DELETE_REQUESTED_NOT_COMPLETED' || error?.isDeleteRequest) {
        setIsDeleteDialogOpen(false);
        return;
      }
      toast.error(error.response?.data?.message || 'Failed to delete user');
      console.error(error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: any = {
      superadmin: 'bg-purple-500',
      org_admin: 'bg-blue-500',
      ceo: 'bg-indigo-500',
      hr_admin: 'bg-orange-500',
      hr_sub_admin: 'bg-orange-400',
      finance_admin: 'bg-green-500',
      finance_sub_admin: 'bg-green-400',
      ops_admin: 'bg-cyan-500',
      sales_admin: 'bg-pink-500',
      sales_sub_admin: 'bg-pink-400',
      employee: 'bg-gray-500',
    };
    return colors[role] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-primary/10 via-background to-background rounded-2xl border border-primary/10 shadow-sm backdrop-blur-xl">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">User Management</h2>
          <p className="text-muted-foreground text-sm mt-1 font-medium">
            Manage all system users and organizational access
          </p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all rounded-full px-6 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Create New User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {users.map((user) => (
          <Card key={user.id} className="group relative overflow-hidden bg-card/60 backdrop-blur-xl border-border/40 hover:border-primary/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(255,255,255,0.02)] transition-all duration-300 hover:-translate-y-1 rounded-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-150 duration-500 pointer-events-none">
              <User className="w-24 h-24 text-primary" />
            </div>
            <CardHeader className="p-6 pb-4 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary shadow-sm border border-primary/10 group-hover:rotate-3 transition-transform duration-300">
                      <User className="w-6 h-6" />
                    </div>
                    <div className={cn("absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background", user.status === 'active' ? 'bg-green-500' : 'bg-amber-500')} title={user.status} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">{user.name}</CardTitle>
                    <Badge className={cn("mt-1.5 uppercase tracking-widest text-[9px] font-black shadow-sm", getRoleBadgeColor(user.role), "text-white border-none")}>
                      {(user.role || '').replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4 relative z-10">
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground bg-muted/30 p-2 rounded-xl">
                  <div className="p-1 bg-background rounded-md shadow-sm border border-border/50"><User className="w-3.5 h-3.5 text-foreground/70" /></div>
                  <span className="truncate font-medium">{user.email}</span>
                </div>
                {user.organizationId && (
                  <div className="flex items-center gap-3 text-muted-foreground bg-muted/30 p-2 rounded-xl">
                    <div className="p-1 bg-background rounded-md shadow-sm border border-border/50"><Building2 className="w-3.5 h-3.5 text-foreground/70" /></div>
                    <span className="text-xs truncate font-medium">
                      {user.organizationId.name || 'Organization'}
                    </span>
                  </div>
                )}
                {user.departmentId && (
                  <div className="flex items-center gap-3 text-muted-foreground bg-muted/30 p-2 rounded-xl">
                    <div className="p-1 bg-background rounded-md shadow-sm border border-border/50"><Shield className="w-3.5 h-3.5 text-foreground/70" /></div>
                    <span className="text-xs truncate font-medium">
                      {user.departmentId.name || 'Department'}
                    </span>
                  </div>
                )}
                {user.biometricId && (
                  <div className="flex items-center gap-3 text-muted-foreground bg-muted/30 p-2 rounded-xl">
                    <div className="p-1 bg-background rounded-md shadow-sm border border-border/50"><span className="w-3.5 h-3.5 text-[10px] font-black flex items-center justify-center text-foreground/70">ID</span></div>
                    <span className="text-xs font-medium">Biometric: <span className="text-foreground">{user.biometricId}</span></span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-colors"
                  onClick={() => handleEdit(user)}
                >
                  <Edit className="w-3.5 h-3.5 mr-2" />
                  Edit User
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-none px-3 rounded-xl shadow-sm border-red-100 hover:border-red-200 bg-red-50/50 hover:bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                  onClick={() => handleDelete(user)}
                  title="Delete User"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Get started by creating your first user
            </p>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Create New User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Update the user details below'
                : 'Fill in the details to create a new user'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {editingUser ? '(leave blank to keep current)' : '*'}
                </Label>
                <Input
                  id="password"
                  type="password" autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="••••••••"
                  required={!editingUser}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationId">Organization *</Label>
                <Select
                  value={formData.organizationId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, organizationId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org_admin">Organization Admin</SelectItem>
                    <SelectItem value="ceo">CEO</SelectItem>
                    <SelectItem value="hr_admin">HR Admin</SelectItem>
                    <SelectItem value="hr_sub_admin">HR Sub Admin</SelectItem>
                    <SelectItem value="finance_admin">Finance Admin</SelectItem>
                    <SelectItem value="finance_sub_admin">Finance Sub Admin</SelectItem>
                    <SelectItem value="ops_admin">Operations Admin</SelectItem>
                    <SelectItem value="sales_admin">Sales Admin</SelectItem>
                    <SelectItem value="sales_sub_admin">Sales Sub Admin</SelectItem>
                    <SelectItem value="center_admin">Center Admin</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="general_manager">General Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="departmentId">Department (Optional)</Label>
                <Select
                  value={formData.departmentId || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, departmentId: value || '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="biometricId">Biometric Device PIN (Optional)</Label>
                <Input
                  id="biometricId"
                  value={formData.biometricId}
                  onChange={(e) =>
                    setFormData({ ...formData, biometricId: e.target.value })
                  }
                  placeholder="e.g. 1001"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingUser?.name}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
