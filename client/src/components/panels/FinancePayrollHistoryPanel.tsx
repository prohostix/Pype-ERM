import { useState, useEffect } from 'react';
import { FileText, Eye, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';

export function FinancePayrollHistoryPanel() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Payroll History</CardTitle>
          <Input 
            placeholder="Search employee..." 
            className="w-64" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading employees...</div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3 font-medium">Employee Name</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 font-medium">Role</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{emp.name}</td>
                      <td className="p-3 text-muted-foreground">{emp.email}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="capitalize">{emp.role?.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => viewHistory(emp)}>
                          <FileText className="w-4 h-4 mr-2" />
                          View Payrolls
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">No employees found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payroll History: {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 pr-2">
            {loadingPayrolls ? (
              <div className="py-8 text-center text-muted-foreground">Loading records...</div>
            ) : payrolls.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground border rounded bg-muted/20">
                No payroll records found for this employee.
              </div>
            ) : (
              payrolls.map(p => (
                <div key={p.id} className="border rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-muted/10">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-base">{p.month}</span>
                      <Badge className={p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-secondary'}>
                        {p.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex gap-4 flex-wrap">
                      <span>Basic: ₹{p.basicSalary?.toLocaleString()}</span>
                      <span>Gross: ₹{p.grossSalary?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xl font-bold text-primary mb-1">₹{p.netSalary?.toLocaleString()}</span>
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
