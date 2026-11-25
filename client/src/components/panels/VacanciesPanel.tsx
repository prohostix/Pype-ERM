import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { ListPagination } from '@/components/ui/list-pagination';

export function VacanciesPanel() {
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
    const baseStyle = "border-none rounded-full px-2.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider";
    const variants: any = {
      open: `bg-[#dff3da] text-[#256c1d] ${baseStyle}`,
      closed: `bg-slate-200/70 text-slate-600 ${baseStyle}`,
    };
    return <Badge className={variants[status] || baseStyle}>{status}</Badge>;
  };

  const currentPage = Math.min(page, Math.max(1, Math.ceil(vacancies.length / pageSize)));
  const pagedVacancies = vacancies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Vacancy Management</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Manage job openings and recruitment</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full h-11 px-6 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
              <Plus className="w-4 h-4 mr-2" /> Post Vacancy
            </Button>
          </DialogTrigger>
          <DialogContent className="wizard-form max-w-2xl border-0 rounded-[2rem] overflow-hidden p-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
            <div className="bg-[#f4f6f3] p-6 border-b border-slate-100 flex items-center gap-3">
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">{editingId ? 'Edit Vacancy' : 'Post New Vacancy'}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Fill in the details for this job opening.</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Designation / Job Title</Label>
                <Input className="rounded-xl h-11" value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} required placeholder="e.g., Software Engineer" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600">Department</Label>
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
                  <Label className="text-xs font-semibold text-slate-600">Status</Label>
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
                <Label className="text-xs font-semibold text-slate-600">Number of Positions</Label>
                <Input className="rounded-xl h-11" type="number" min="1" value={formData.count} onChange={(e) => setFormData({...formData, count: e.target.value})} required />
              </div>
              
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="ghost" className="rounded-full h-11 px-6" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="rounded-full h-11 px-7 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">Save Vacancy</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Current Vacancies</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{vacancies.length} total</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : vacancies.length === 0 ? (
            <div className="text-center py-14 px-4">
              <div className="bg-[#eaf6e6] text-[#256c1d] w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No active vacancies</h3>
              <p className="text-sm text-muted-foreground mt-1">Post a new vacancy to start hiring.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagedVacancies.map((vacancy) => {
                const vid = vacancy.id || vacancy.id || '';
                const deptName = typeof vacancy.departmentId === 'object'
                  ? vacancy.departmentId?.name
                  : vacancy.department?.name;
                const available = (vacancy.count || 0) - (vacancy.filled || 0);
                
                return (
                <div key={vid} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors overflow-hidden relative">
                  {vacancy.status === 'open' && available > 0 && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#54b947]" />
                  )}
                  {vacancy.status === 'closed' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-lg text-slate-900 truncate">{vacancy.designation}</h3>
                      {getStatusBadge(vacancy.status)}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium">
                      <div className="flex items-center text-slate-600 bg-white px-3 py-1.5 rounded-full">
                        <span className="opacity-70 font-semibold text-[11px] mr-2">Dept</span>
                        {deptName || 'Unassigned'}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-white text-slate-700 px-3 py-1.5 rounded-full">
                          <span className="opacity-70 text-[11px] font-semibold">Total</span>
                          <span className="font-semibold text-sm leading-none">{vacancy.count}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#dff3da] text-[#256c1d] px-3 py-1.5 rounded-full">
                          <span className="opacity-70 text-[11px] font-semibold">Filled</span>
                          <span className="font-semibold text-sm leading-none">{vacancy.filled || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-sky-100 text-sky-700 px-3 py-1.5 rounded-full">
                          <span className="opacity-70 text-[11px] font-semibold">Avail</span>
                          <span className="font-semibold text-sm leading-none">{available}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0">
                    {vacancy.status === 'open' && (
                      <>
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="h-10 rounded-full gap-1.5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold px-5"
                          onClick={() => openHireDialog(vacancy)}
                          title="Hire for this position"
                        >
                          Hire
                        </Button>
                        <Button variant="outline" size="sm" className="h-10 rounded-full border-[#cfe9c9] bg-white text-[#256c1d] hover:bg-[#eaf6e6] font-semibold gap-1.5 px-5" onClick={() => handleClose(vid)}>
                          Close
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" className="h-10 w-10 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6] p-0" onClick={() => handleEdit(vacancy)}>
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-10 w-10 rounded-full border-red-200 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 p-0" onClick={() => handleDelete(vid)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                );
              })}
              <ListPagination total={vacancies.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
            </div>
          )}
        </div>
      </div>

      {/* Hire Dialog */}
      <Dialog open={hireDialogOpen} onOpenChange={setHireDialogOpen}>
        <DialogContent className="wizard-form max-w-md border-0 rounded-[2rem] overflow-hidden p-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <div className="bg-[#f4f6f3] p-6 border-b border-slate-100 flex items-center gap-3">
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">Hire Candidate</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5 font-medium truncate max-w-[250px]">
                {selectedVacancy?.designation}
              </p>
            </div>
          </div>
          
          <form onSubmit={handleHireSubmit} className="p-6 space-y-4">
            <div className="bg-[#f4f6f3] p-4 rounded-2xl text-sm space-y-1 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Dept:</span>
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
              <Label className="text-xs font-semibold text-slate-600" htmlFor="hire-name">Full Name</Label>
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
              <Label className="text-xs font-semibold text-slate-600" htmlFor="hire-email">Email Address</Label>
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
                <Label className="text-xs font-semibold text-slate-600" htmlFor="hire-role">Role</Label>
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
                <Label className="text-xs font-semibold text-slate-600" htmlFor="hire-password">Initial Password</Label>
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
                className="rounded-full h-11 px-6"
                onClick={() => setHireDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-full h-11 px-7 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
                Create User & Hire
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
