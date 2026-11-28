import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListPagination } from '@/components/ui/list-pagination';
import { confirmDialog } from '@/lib/confirm';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';

interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string | null;
  branchName: string | null;
  accountType: string;
  upiId: string | null;
  isPrimary: boolean;
  isActive: boolean;
}

const emptyForm = {
  accountName: '', bankName: '', accountNumber: '', ifscCode: '', branchName: '',
  accountType: 'current', upiId: '', isPrimary: false, isActive: true,
};

export function BankAccountsPanel() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [overall, setOverall] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Wait for typing to pause before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim() === search) return;
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    let outdated = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/organizations/bank-accounts', {
          params: { page, limit: pageSize, search: search || undefined },
        });
        if (outdated) return;
        // Deleting the last row of a page leaves it empty, so step back
        if (!res.data.data.length && page > 1) {
          setPage(page - 1);
          return;
        }
        setAccounts(res.data.data);
        setTotal(res.data.total);
        setOverall(res.data.overall);
      } catch (err: any) {
        if (!outdated) toast.error(err.response?.data?.message || 'Failed to load bank accounts');
      } finally {
        if (!outdated) setLoading(false);
      }
    };
    load();
    return () => { outdated = true; };
  }, [page, pageSize, search, refreshKey]);

  const reload = () => setRefreshKey((key) => key + 1);

  const openForm = (account?: BankAccount) => {
    setEditingId(account?.id ?? null);
    setForm(account ? {
      accountName: account.accountName,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      ifscCode: account.ifscCode || '',
      branchName: account.branchName || '',
      accountType: account.accountType,
      upiId: account.upiId || '',
      isPrimary: account.isPrimary,
      isActive: account.isActive,
    } : emptyForm);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) await api.put(`/organizations/bank-accounts/${editingId}`, form);
      else await api.post('/organizations/bank-accounts', form);
      toast.success(editingId ? 'Bank account updated' : 'Bank account added');
      setOpen(false);
      if (!editingId) setPage(1);
      reload();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save bank account');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account: BankAccount) => {
    const ok = await confirmDialog({
      title: 'Delete bank account?',
      message: `Delete the ${account.bankName} account ${account.accountNumber}?`,
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/organizations/bank-accounts/${account.id}`);
      toast.success('Bank account deleted');
      reload();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete bank account');
    }
  };

  const field = (key: 'accountName' | 'bankName' | 'accountNumber' | 'ifscCode' | 'branchName' | 'upiId', label: string, required = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}{required && ' *'}</Label>
      <Input id={key} required={required} maxLength={120} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Bank Accounts</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Add and manage the organization's bank accounts</p>
        </div>
        <Button onClick={() => openForm()} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
          <Plus className="w-4 h-4 mr-1.5" />Add Bank Account
        </Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Accounts</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{total.toLocaleString()} of {overall.toLocaleString()} accounts</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search bank, holder or number" className="pl-10 h-10 rounded-full bg-[#f4f6f3] border-0" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
          ) : accounts.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">{search ? 'No accounts match your search.' : 'No bank accounts added yet.'}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="pb-3 pr-3 font-medium">Bank</th><th className="pb-3 pr-3 font-medium">Account holder</th><th className="pb-3 pr-3 font-medium">Account number</th>
                      <th className="pb-3 pr-3 font-medium">IFSC / SWIFT</th><th className="pb-3 pr-3 font-medium">UPI ID</th><th className="pb-3 pr-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((a) => (
                      <tr key={a.id} className="hover:bg-[#f7faf6] transition-colors">
                        <td className="py-3 pr-3"><p className="font-semibold text-slate-900">{a.bankName}</p><p className="text-xs text-muted-foreground">{a.branchName || ''}</p></td>
                        <td className="py-3 pr-3"><p className="text-slate-700">{a.accountName}</p><p className="text-xs text-muted-foreground capitalize">{a.accountType}</p></td>
                        <td className="py-3 pr-3 font-mono text-slate-700">{a.accountNumber}</td>
                        <td className="py-3 pr-3 font-mono text-slate-700">{a.ifscCode || '—'}</td>
                        <td className="py-3 pr-3 text-slate-700">{a.upiId || '—'}</td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', a.isActive ? 'bg-[#dff3da] text-[#256c1d]' : 'bg-slate-100 text-slate-600')}>{a.isActive ? 'Active' : 'Inactive'}</span>
                          {a.isPrimary && <span className="ml-1.5 rounded-full bg-[#0b1d14] px-3 py-1 text-xs font-semibold text-white">Primary</span>}
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" onClick={() => openForm(a)} aria-label="Edit bank account"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(a)} aria-label="Delete bank account" className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ListPagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
            </>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 bg-white">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
            <DialogDescription>Fields marked * are required.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 wizard-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('accountName', 'Account holder name', true)}
              {field('bankName', 'Bank name', true)}
              {field('accountNumber', 'Account number', true)}
              {field('ifscCode', 'IFSC / SWIFT code')}
              {field('branchName', 'Branch')}
              <div className="space-y-1.5">
                <Label>Account type</Label>
                <Select value={form.accountType} onValueChange={(accountType) => setForm({ ...form, accountType })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {field('upiId', 'UPI ID')}
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked, isPrimary: e.target.checked && form.isPrimary })} />
                Active
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isPrimary} disabled={!form.isActive} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} />
                Primary account
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 px-5 rounded-full bg-white border-slate-200">Cancel</Button>
              <Button type="submit" disabled={saving} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
