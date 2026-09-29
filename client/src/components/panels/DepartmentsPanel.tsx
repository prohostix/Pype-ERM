import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building, Users } from 'lucide-react';
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

interface Department {
  id: string;
  name: string;
  type: string;
  organizationId?: any;
  managerId?: any;
  features?: string[];
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  designation?: string;
  role: string;
}

export function DepartmentsPanel() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'custom',
    organizationId: '',
    managerId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptsRes, orgsRes, usersRes] = await Promise.all([
        api.get('/departments'),
        api.get('/organizations'),
        api.get('/users'),
      ]);
      setDepartments(deptsRes.data.data || []);
      setOrganizations(orgsRes.data.data || []);
      setUsers((usersRes.data.data || []).filter((u: any) => u.status !== 'resigned'));
    } catch (error: any) {
      toast.error('Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingDept(null);
    setFormData({
      name: '',
      type: 'custom',
      organizationId: '',
      managerId: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      type: dept.type,
      organizationId: dept.organizationId?.id || dept.organizationId || '',
      managerId: dept.managerId?.id || dept.managerId || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (dept: Department) => {
    setDeletingDept(dept);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload: any = {
        name: formData.name,
        type: formData.type,
        organizationId: formData.organizationId,
      };
      // Only include managerId if a real user was selected
      if (formData.managerId && formData.managerId !== 'none') {
        payload.managerId = formData.managerId;
      }

      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, payload);
        toast.success('Department updated successfully');
      } else {
        await api.post('/departments', payload);
        toast.success('Department created successfully');
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
      console.error(error);
    }
  };

  const confirmDelete = async () => {
    if (!deletingDept) return;

    try {
      await api.delete(`/departments/${deletingDept.id}`);
      toast.success('Department deleted successfully');
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete department');
      console.error(error);
    }
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: any = {
      hr: 'bg-orange-500',
      finance: 'bg-green-500',
      operations: 'bg-blue-500',
      sales: 'bg-pink-500',
      ceo: 'bg-indigo-500',
      org_admin: 'bg-teal-500',
      study_center: 'bg-cyan-500',
      student: 'bg-slate-500',
      custom: 'bg-purple-500',
    };
    return colors[type] || 'bg-gray-500';
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
          <h2 className="text-2xl font-black tracking-tight text-foreground">Departments</h2>
          <p className="text-muted-foreground text-sm mt-1 font-medium">
            Manage organizational structure and departments
          </p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all rounded-full px-6 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Create Department
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <Card key={dept.id} className="group relative overflow-hidden bg-card/60 backdrop-blur-xl border-border/40 hover:border-primary/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(255,255,255,0.02)] transition-all duration-300 hover:-translate-y-1 rounded-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-150 duration-500 pointer-events-none">
              <Building className="w-24 h-24 text-primary" />
            </div>
            <CardHeader className="p-6 pb-4 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary shadow-sm border border-primary/10 group-hover:rotate-3 transition-transform duration-300">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">{dept.name}</CardTitle>
                    <Badge className={cn("mt-1.5 uppercase tracking-widest text-[9px] font-black shadow-sm", getTypeBadgeColor(dept.type), "text-white border-none")}>
                      {dept.type}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4 relative z-10">
              <div className="space-y-2.5 text-sm">
                {dept.organizationId && (
                  <div className="flex items-center gap-3 text-muted-foreground bg-muted/30 p-2 rounded-xl">
                    <div className="p-1 bg-background rounded-md shadow-sm border border-border/50"><Building className="w-3.5 h-3.5 text-foreground/70" /></div>
                    <span className="font-medium truncate text-xs">
                      {dept.organizationId.name || 'N/A'}
                    </span>
                  </div>
                )}
                {dept.managerId && (
                  <div className="flex items-center gap-3 text-muted-foreground bg-muted/30 p-2 rounded-xl">
                    <div className="p-1 bg-background rounded-md shadow-sm border border-border/50"><Users className="w-3.5 h-3.5 text-foreground/70" /></div>
                    <span className="text-xs font-medium truncate">
                      Manager: <span className="text-foreground">{dept.managerId.name || 'Assigned'}</span>
                    </span>
                  </div>
                )}
                {dept.features && dept.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {dept.features.slice(0, 3).map((feature, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-background/50 backdrop-blur-sm shadow-sm">
                        {feature}
                      </Badge>
                    ))}
                    {dept.features.length > 3 && (
                      <Badge variant="outline" className="text-[10px] font-bold bg-background/50 shadow-sm">
                        +{dept.features.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-colors"
                  onClick={() => handleEdit(dept)}
                >
                  <Edit className="w-3.5 h-3.5 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-none px-3 rounded-xl shadow-sm border-red-100 hover:border-red-200 bg-red-50/50 hover:bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                  onClick={() => handleDelete(dept)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {departments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No departments found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Get started by creating your first department
            </p>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Department
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDept ? 'Edit Department' : 'Create New Department'}
            </DialogTitle>
            <DialogDescription>
              {editingDept
                ? 'Update the department details below'
                : 'Fill in the details to create a new department'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Marketing"
                  required
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
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="ceo">CEO</SelectItem>
                    <SelectItem value="org_admin">Org Admin</SelectItem>
                    <SelectItem value="study_center">Academic Partner</SelectItem>
                    <SelectItem value="employee">Staff</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="managerId">Department Manager</Label>
                <Select
                  value={formData.managerId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, managerId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} {user.designation ? `(${user.designation})` : ''} - {user.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                {editingDept ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingDept?.name}"? This action
              cannot be undone and may affect users assigned to this department.
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
