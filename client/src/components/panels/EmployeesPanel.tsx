import { useState, useEffect, useMemo } from 'react';
import { Mail, Phone, UserCircle, Users, UserCheck, UserMinus, Search, X, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { EmployeeProfilePanel } from '@/components/panels/EmployeeProfilePanel';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
/** Read-only staff directory. Accounts are created and changed in the Users screen. */
export function EmployeesPanel({ onManageUsers }: { onManageUsers?: () => void }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();
  const isOrgAdmin = currentUser?.role === 'org_admin' || currentUser?.role === 'superadmin' || currentUser?.role === 'ceo';
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'on_leave'>('all');
  useEffect(() => {
    fetchEmployees();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/org/branches');
      setBranches(res.data.data || []);
    } catch { /* non-critical */ }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      // Filter out admin roles - HR should only see regular employees
      const allUsers = response.data.data || [];
      // Only exclude ceo and org_admin — all other roles (including *_admin) are employees
      // Also exclude resigned employees
      const employeesOnly = allUsers.filter((user: any) => {
        const role = user.role?.toLowerCase() || '';
        if (role === 'ceo' || role === 'org_admin' || role === 'student' || user.status === 'resigned') return false;
        if (role === 'center_admin' && !isOrgAdmin) return false;
        return true;
      });
      setEmployees(employeesOnly);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const openProfile = (id: string) => {
    setProfileUserId(id);
    setProfileOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const label = (status || 'active').replace('_', ' ');
    const styles: Record<string, string> = {
      active: 'bg-[#e3f7dd] text-[#1f6a17]',
      inactive: 'bg-slate-100 text-slate-600',
      on_leave: 'bg-amber-50 text-amber-700',
    };
    const dots: Record<string, string> = { active: 'bg-[#54b947]', inactive: 'bg-slate-400', on_leave: 'bg-amber-500' };
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize', styles[status] || styles.active)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', dots[status] || dots.active)} /> {label}
      </span>
    );
  };

  const branchIdOf = (emp: any) => (typeof emp.branchId === 'object' ? emp.branchId?.id : emp.branchId)?.toString();

  const visibleEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees
      .filter(emp => emp && emp.id)
      .filter(emp => selectedBranchFilter === 'all' || branchIdOf(emp) === selectedBranchFilter)
      .filter(emp => statusFilter === 'all' || (emp.status || 'active') === statusFilter)
      .filter(emp => !q || [emp.name, emp.email, emp.phone, emp.role, emp.designation, emp.department?.name].some((v: any) => (v || '').toString().toLowerCase().includes(q)));
  }, [employees, searchQuery, statusFilter, selectedBranchFilter]);

  const statusCounts = useMemo(() => ({
    all: employees.length,
    active: employees.filter(e => (e.status || 'active') === 'active').length,
    inactive: employees.filter(e => e.status === 'inactive').length,
    on_leave: employees.filter(e => e.status === 'on_leave').length,
  }), [employees]);

  return (
    <div className="space-y-6">
      <EmployeeProfilePanel
        userId={profileUserId}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Employee Directory</h1>
          <p className="text-sm text-muted-foreground mt-1.5">View employee records and profiles</p>
        </div>

        {onManageUsers && (
          <Button onClick={onManageUsers} className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm shrink-0 self-start lg:self-auto">
            <Users className="w-4 h-4" />
            Manage in Users
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {[
          { label: 'Total employees', value: statusCounts.all, icon: Users },
          { label: 'Active', value: statusCounts.active, icon: UserCheck },
          { label: 'On leave or inactive', value: statusCounts.on_leave + statusCounts.inactive, icon: UserMinus },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-3xl gap-0">
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="text-3xl font-semibold tracking-tight mt-1">{value.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative w-full lg:max-w-md">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, role or department..."
            className="pl-11 pr-9 h-11 rounded-full bg-white border-slate-200 shadow-sm text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {branches.length > 0 && (
            <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
              <SelectTrigger className="h-11 w-[200px] rounded-full text-sm bg-white border-slate-200 shadow-sm px-4">
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-[#256c1d]" />
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {([
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'on_leave', label: 'On leave' },
            { id: 'inactive', label: 'Inactive' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn('px-4 py-2 rounded-full text-xs font-semibold transition-colors', statusFilter === f.id ? 'bg-[#0b1d14] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}
            >
              {f.label} ({statusCounts[f.id]})
            </button>
          ))}
        </div>
      </div>

      {/* Directory */}
      <Card className="rounded-3xl gap-0 overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          {loading ? (
            <div className="space-y-3 p-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-2xl bg-[#f4f6f3] animate-pulse" />)}
            </div>
          ) : visibleEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <span className="w-14 h-14 rounded-full bg-[#f4f6f3] flex items-center justify-center mb-3"><Users className="w-6 h-6 opacity-50" /></span>
              <p className="text-sm font-medium text-foreground">{employees.length === 0 ? 'No employees found.' : 'No employees match your filters.'}</p>
            </div>
          ) : (
            <div>
              {visibleEmployees.map((employee) => {
                const empId = employee.id;
                const deptName = employee.department?.name || (typeof employee.departmentId === 'object' ? employee.departmentId?.name : '');
                const branchName = employee.branch?.name || (typeof employee.branchId === 'object' ? employee.branchId?.name : employee.branchId ? 'Assigned to Branch' : '');
                return (
                  <div
                    key={empId}
                    className="group flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-4 sm:px-5 py-4 rounded-2xl hover:bg-[#f4f6f3] transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center font-semibold text-lg shrink-0">
                        {(employee.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-base text-foreground truncate">{employee.name || 'Unknown'}</p>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1">
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#f1f3ef] text-slate-600 capitalize">
                            {(employee.role || '').replace(/_/g, ' ')}{employee.designation ? ` · ${employee.designation}` : ''}
                          </span>
                          {deptName && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#e3f7dd] text-[#1f6a17]">{deptName}</span>}
                          {branchName && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">{branchName}</span>}
                        </div>
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                          <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {employee.email}</span>
                          {employee.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {employee.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap xl:justify-end shrink-0">
                      <div className="mr-2">{getStatusBadge(employee.status)}</div>
                      <button onClick={() => openProfile(empId)} title="View Profile" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-[#eaf6e6] hover:text-[#256c1d] transition-colors">
                        <UserCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
