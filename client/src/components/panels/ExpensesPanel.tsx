import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Receipt, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { toast } from 'sonner';

import { CS } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { ListPagination } from '@/components/ui/list-pagination';
import { confirmDialog, promptDialog } from '@/lib/confirm';
import { useAuth } from '@/hooks/useAuth';
export function ExpensesPanel() {
  const { user } = useAuth();
  // The role decides unless an Org Admin has set something for this user (the server enforces it)
  const mayCreate = user?.access?.expenses?.create?.allowed ?? true;
  const mayEdit = user?.access?.expenses?.edit?.allowed ?? true;
  const mayDelete = user?.access?.expenses?.delete?.allowed ?? true;
  const mayApprove = user?.access?.expenses?.approve?.allowed ?? true;
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // Local date as YYYY-MM-DD, the format the date picker uses
  const toDateInput = (d: Date = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [formData, setFormData] = useState({
    amount: '',
    category: 'travel',
    description: '',
    status: 'pending',
    date: toDateInput()
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/finance/expenses');
      setExpenses(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount) || 0
      };
      if (editingId) {
        await api.put(`/finance/expenses/${editingId}`, payload);
      } else {
        await api.post('/finance/expenses', payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error: any) {
      console.error('Failed to save expense:', error);
      toast.error(error.response?.data?.message || 'Failed to save expense');
    }
  };

  const handleEdit = (expense: any) => {
    const expenseId = expense.id || expense.id;
    setEditingId(expenseId);
    setFormData({
      amount: expense.amount?.toString() || '',
      category: expense.category || 'travel',
      description: expense.description || '',
      status: expense.status || 'pending',
      date: expense.submittedAt ? toDateInput(new Date(expense.submittedAt)) : toDateInput()
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete expense?', message: 'Are you sure you want to delete this expense?', confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.delete(`/finance/expenses/${id}`);
      fetchExpenses();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  const handleApprove = async (id: string, action: 'approve' | 'reject') => {
    const approving = action === 'approve';
    const remarks = await promptDialog({
      title: approving ? 'Approve expense?' : 'Reject expense?',
      message: approving ? 'The expense will be marked as approved.' : 'The expense will be marked as rejected.',
      inputLabel: 'Remarks',
      placeholder: 'Add a note',
      confirmText: approving ? 'Approve' : 'Reject',
      tone: approving ? 'default' : 'danger',
    });
    if (remarks === null) return; // cancelled
    try {
      await api.put(`/finance/expenses/${id}/approve`, { action, remarks });
      fetchExpenses();
    } catch (error) {
      console.error(`Failed to ${action} expense:`, error);
      toast.error((error as any).response?.data?.message || `Failed to ${action} expense`);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      amount: '',
      category: 'travel',
      description: '',
      status: 'pending',
      date: toDateInput()
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Expense Management</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Track and approve expense claims</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          {mayCreate && (
            <DialogTrigger asChild>
              <Button className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"><Plus className="w-4 h-4 mr-2" />Add Expense</Button>
            </DialogTrigger>
          )}
          <DialogContent className="wizard-form max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">{editingId ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Amount</Label>
                  <Input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required />
                </div>
                <div>
                  <Label>Expense date</Label>
                  <Input type="date" value={formData.date} max={toDateInput()} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} required />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 h-11 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">Save</Button>
                <Button type="button" variant="outline" className="h-11 px-6 rounded-full" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Expense Claims</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{expenses.length} total</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Receipt className="w-6 h-6" /></div>
              <p className="text-sm">No expenses found</p>
            </div>
          ) : (() => {
            const valid = expenses.filter(expense => expense && expense.id);
            const currentPage = Math.min(page, Math.max(1, Math.ceil(valid.length / pageSize)));
            const paged = valid.slice((currentPage - 1) * pageSize, currentPage * pageSize);
            return (
            <div className="space-y-3">
              {paged.map((expense) => {
                const expenseId = expense.id;
                return (
                  <div key={expenseId} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center shrink-0">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900">{CS()}{expense.amount} <span className="font-normal text-slate-500">·</span> <span className="capitalize">{expense.category}</span></div>
                        <div className="text-sm text-slate-600 truncate">{expense.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          By: {expense.user?.name || expense.employeeId?.name || expense.employee?.name || 'Unknown'} • {expense.submittedAt ? new Date(expense.submittedAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold capitalize', expense.status === 'approved' ? 'bg-[#dff3da] text-[#256c1d]' : expense.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>{expense.status}</span>
                      {expense.status === 'pending' && (
                        <>
                          {mayApprove && (
                            <Button variant="ghost" size="sm" title="Approve" className="rounded-full hover:bg-white" onClick={() => handleApprove(expenseId, 'approve')}>
                              <CheckCircle className="w-4 h-4 text-[#256c1d]" />
                            </Button>
                          )}
                          {mayApprove && (
                            <Button variant="ghost" size="sm" title="Reject" className="rounded-full hover:bg-red-50" onClick={() => handleApprove(expenseId, 'reject')}>
                              <XCircle className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </>
                      )}
                      {mayEdit && (
                        <Button variant="ghost" size="sm" className="rounded-full hover:bg-white" onClick={() => handleEdit(expense)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {mayDelete && (
                        <Button variant="ghost" size="sm" className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(expenseId)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              <ListPagination total={valid.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
