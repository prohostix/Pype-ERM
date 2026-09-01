import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

export function VacanciesPanel() {
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hireDialogOpen, setHireDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<any>(null);
  const [formData, setFormData] = useState({
    designation: '',
    departmentId: '',
    count: '1',
    status: 'open'
  });

  const [hireFormData, setHireFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
  });

  useEffect(() => {
    fetchVacancies();
    fetchDepartments();
  }, []);

  const fetchVacancies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/hr/vacancies');
      setVacancies(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch vacancies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/hr/vacancies/${editingId}`, formData);
      } else {
        await api.post('/hr/vacancies', formData);
      }
      setDialogOpen(false);
      resetForm();
      fetchVacancies();
    } catch (error: any) {
      console.error('Failed to save vacancy:', error);
      alert(error.response?.data?.message || 'Failed to save vacancy');
    }
  };

  const handleEdit = (vacancy: any) => {
    const vid = vacancy.id || vacancy.id;
    setEditingId(vid);
    setFormData({
      designation: vacancy.designation || '',
      departmentId: (typeof vacancy.departmentId === 'object' ? vacancy.departmentId?.id || vacancy.departmentId?.id : vacancy.departmentId) || '',
      count: vacancy.count?.toString() || '1',
      status: vacancy.status || 'open'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vacancy?')) return;
    try {
      await api.delete(`/hr/vacancies/${id}`);
      fetchVacancies();
    } catch (error) {
      console.error('Failed to delete vacancy:', error);
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm('Close this vacancy?')) return;
    try {
      await api.put(`/hr/vacancies/${id}/close`);
      fetchVacancies();
    } catch (error) {
      console.error('Failed to close vacancy:', error);
    }
  };

  const openHireDialog = (vacancy: any) => {
    setSelectedVacancy(vacancy);
    setHireFormData({
      name: '',
      email: '',
      password: '',
      role: 'employee',
    });
    setHireDialogOpen(true);
  };

  const handleHireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create the user with the vacancy's department
      await api.post('/users', {
        ...hireFormData,
        departmentId: selectedVacancy.departmentId,
      });
      
      alert(`User ${hireFormData.name} created successfully and assigned to ${selectedVacancy.department?.name || 'department'}!`);
      setHireDialogOpen(false);
      setHireFormData({
        name: '',
        email: '',
        password: '',
        role: 'employee',
      });
      setSelectedVacancy(null);
    } catch (error: any) {
      console.error('Failed to create user:', error);
      alert(error.response?.data?.message || 'Failed to create user');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      designation: '',
      departmentId: '',
      count: '1',
      status: 'open'
    });
  };

  const getStatusBadge = (status: string) => {
    const baseStyle = "border-none rounded-full px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider shadow-sm";
    const variants: any = {
      open: `bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 ${baseStyle}`,
      closed: `bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 ${baseStyle}`,
    };
    return <Badge className={variants[status] || baseStyle}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <UserPlus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Vacancy Management</h2>
            <p className="text-muted-foreground text-sm mt-1">Manage job openings and recruitment</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-md h-10 px-4 transition-transform hover:scale-105 active:scale-95">
              <Plus className="w-4 h-4 mr-2" /> Post Vacancy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
            <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{editingId ? 'Edit Vacancy' : 'Post New Vacancy'}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Fill in the details for this job opening.</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Designation / Job Title</Label>
                <Input className="rounded-xl h-11" value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} required placeholder="e.g., Software Engineer" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Department</Label>
                  <Select value={formData.departmentId} onValueChange={(value) => setFormData({...formData, departmentId: value})}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {departments.filter(dept => dept && (dept.id || dept.id)).map((dept) => (
                        <SelectItem key={dept.id || dept.id} value={(dept.id || dept.id).toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Number of Positions</Label>
                <Input className="rounded-xl h-11" type="number" min="1" value={formData.count} onChange={(e) => setFormData({...formData, count: e.target.value})} required />
              </div>
              
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="rounded-xl px-6 shadow-md">Save Vacancy</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-xl rounded-2xl bg-card/60 backdrop-blur-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 border-b border-border/40 bg-muted/20">
          <CardTitle className="text-lg">Current Vacancies</CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-24 bg-muted/40 rounded-2xl animate-pulse border border-border/50" />)}
            </div>
          ) : vacancies.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-border/60 bg-muted/10">
              <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No active vacancies</h3>
              <p className="text-sm text-muted-foreground mt-1">Post a new vacancy to start hiring.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vacancies.map((vacancy) => {
                const vid = vacancy.id || vacancy.id || '';
                const deptName = typeof vacancy.departmentId === 'object'
                  ? vacancy.departmentId?.name
                  : vacancy.department?.name;
                const available = (vacancy.count || 0) - (vacancy.filled || 0);
                
                return (
                <div key={vid} className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl bg-card/40 hover:bg-card/80 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 gap-4 overflow-hidden relative">
                  {vacancy.status === 'open' && available > 0 && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-2xl" />
                  )}
                  {vacancy.status === 'closed' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-400 rounded-l-2xl" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-base text-foreground truncate">{vacancy.designation}</h3>
                      {getStatusBadge(vacancy.status)}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium">
                      <div className="flex items-center text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40 shadow-sm">
                        <span className="opacity-70 uppercase tracking-wider font-bold text-[10px] mr-2">Dept</span>
                        {deptName || 'Unassigned'}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
                          <span className="opacity-70 text-[10px] uppercase tracking-wider font-bold">Total</span>
                          <span className="font-black text-sm leading-none">{vacancy.count}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-sm">
                          <span className="opacity-70 text-[10px] uppercase tracking-wider font-bold">Filled</span>
                          <span className="font-black text-sm leading-none">{vacancy.filled || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm">
                          <span className="opacity-70 text-[10px] uppercase tracking-wider font-bold">Avail</span>
                          <span className="font-black text-sm leading-none">{available}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                    {vacancy.status === 'open' && (
                      <>
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="h-9 rounded-xl shadow-sm gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-4"
                          onClick={() => openHireDialog(vacancy)}
                          title="Hire for this position"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Hire
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 rounded-xl shadow-sm border-slate-200 hover:bg-slate-50 gap-1.5 px-3" onClick={() => handleClose(vid)}>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Close
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" className="h-9 rounded-xl shadow-sm border-slate-200 hover:bg-slate-50 gap-1.5 px-3" onClick={() => handleEdit(vacancy)}>
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 rounded-xl shadow-sm border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 gap-1.5 px-3" onClick={() => handleDelete(vid)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hire Dialog */}
      <Dialog open={hireDialogOpen} onOpenChange={setHireDialogOpen}>
        <DialogContent className="max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Hire Candidate</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5 font-medium truncate max-w-[250px]">
                {selectedVacancy?.designation}
              </p>
            </div>
          </div>
          
          <form onSubmit={handleHireSubmit} className="p-6 space-y-4">
            <div className="bg-muted/40 p-4 rounded-2xl border border-border/50 text-sm space-y-1 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Dept:</span>
                <span className="font-semibold text-foreground">
                  {typeof selectedVacancy?.departmentId === 'object'
                    ? selectedVacancy?.departmentId?.name
                    : selectedVacancy?.department?.name}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                The new user will be automatically assigned to this department.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="hire-name">Full Name</Label>
              <Input
                id="hire-name"
                className="rounded-xl h-11"
                value={hireFormData.name}
                onChange={(e) => setHireFormData({ ...hireFormData, name: e.target.value })}
                required
                placeholder="Enter employee name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="hire-email">Email Address</Label>
              <Input
                id="hire-email"
                type="email"
                className="rounded-xl h-11"
                value={hireFormData.email}
                onChange={(e) => setHireFormData({ ...hireFormData, email: e.target.value })}
                required
                placeholder="employee@company.com"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="hire-role">Role</Label>
                <Select
                  value={hireFormData.role}
                  onValueChange={(value) => setHireFormData({ ...hireFormData, role: value })}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="hr_sub_admin">HR Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="hire-password">Initial Password</Label>
                <Input
                  id="hire-password"
                  type="password"
                  className="rounded-xl h-11"
                  value={hireFormData.password}
                  onChange={(e) => setHireFormData({ ...hireFormData, password: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Min. 6 chars"
                />
              </div>
            </div>
            
            <div className="pt-4 flex justify-end gap-2">
              <Button 
                type="button" 
                variant="ghost"
                className="rounded-xl"
                onClick={() => setHireDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl px-6 shadow-md gap-2">
                <UserPlus className="w-4 h-4" /> Create User & Hire
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
