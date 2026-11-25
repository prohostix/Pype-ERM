import { useState, useEffect } from 'react';
import { FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';

import { CS } from '@/lib/currency';
import { ListPagination } from '@/components/ui/list-pagination';
export function FinancePayrollHistoryPanel() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const [historyDialog, setHistoryDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setEmployees(res.data.data || []);
      setFilteredEmployees(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredEmployees(employees.filter(e => 
      e.name?.toLowerCase().includes(q) || 
      e.email?.toLowerCase().includes(q) ||
      e.employeeId?.toLowerCase().includes(q)
    ));
  }, [search, employees]);

  const viewHistory = async (user: any) => {
    setSelectedUser(user);
    setHistoryDialog(true);
    setLoadingPayrolls(true);
    try {
      const res = await api.get(`/payroll?employeeId=${user.id}`);
      setPayrolls(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load payroll history');
    } finally {
      setLoadingPayrolls(false);
    }
  };

  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredEmployees.length / pageSize)));
  const pagedEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Payroll History</h2>
          <p className="text-muted-foreground text-sm mt-1.5">View each employee's past payroll records.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search employee..."
            className="pl-11 h-11 rounded-full bg-white border-slate-200 focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Employees</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{filteredEmployees.length} found</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><FileText className="w-6 h-6" /></div>
              <p className="text-sm">No employees found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagedEmployees.map(emp => (
                <div key={emp.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center font-semibold shrink-0">
                      {(emp.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{emp.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{emp.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-between md:justify-end">
                    <Badge variant="outline" className="capitalize rounded-full bg-white border-slate-200">{emp.role?.replace(/_/g, ' ')}</Badge>
                    <Button variant="outline" className="h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold" onClick={() => viewHistory(emp)}>
                      View Payrolls
                    </Button>
                  </div>
                </div>
              ))}
              <ListPagination total={filteredEmployees.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
            </div>
          )}
        </div>
      </div>

      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="wizard-form max-w-3xl rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Payroll History: {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 pr-1">
            {loadingPayrolls ? (
              <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
            ) : payrolls.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground rounded-2xl bg-[#f4f6f3]">
                No payroll records found for this employee.
              </div>
            ) : (
              payrolls.map(p => (
                <div key={p.id} className="rounded-2xl bg-[#f4f6f3] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-base text-slate-900">{p.month}</span>
                      <Badge className={`rounded-full border-0 px-3 ${p.status === 'paid' ? 'bg-[#dff3da] text-[#256c1d]' : 'bg-slate-200/70 text-slate-600'}`}>
                        {p.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex gap-4 flex-wrap">
                      <span>Basic: {CS()}{p.basicSalary?.toLocaleString()}</span>
                      <span>Gross: {CS()}{p.grossSalary?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium text-slate-500">Net</p>
                    <span className="block text-xl font-semibold text-[#256c1d]">{CS()}{p.netSalary?.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
