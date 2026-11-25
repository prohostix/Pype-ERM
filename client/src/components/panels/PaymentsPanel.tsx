import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';

import { CS, numLocale } from '@/lib/currency';
import { ListPagination } from '@/components/ui/list-pagination';
export function PaymentsPanel() {
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [paymentTarget, setPaymentTarget] = useState<'invoice' | 'student'>('invoice');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: '',
    method: 'cash',
    referenceNo: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchPayments();
    fetchInvoices();
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/finance/payments');
      setPayments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/finance/invoices');
      setInvoices(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/finance/payments/${editingId}`, formData);
      } else {
        await api.post('/finance/payments', formData);
      }
      setDialogOpen(false);
      resetForm();
      fetchPayments();
    } catch (error: any) {
      console.error('Failed to save payment:', error);
      toast.error(error.response?.data?.message || 'Failed to save payment');
    }
  };

  const handleEdit = (payment: any) => {
    const paymentId = payment.id;
    const rawInvoice = payment.invoiceId;
    const invoiceId = typeof rawInvoice === 'object' && rawInvoice !== null ? rawInvoice.id : rawInvoice;
    setEditingId(paymentId);
    setFormData({
      invoiceId: invoiceId?.toString() || '',
      amount: payment.amount?.toString() || '',
      method: payment.method || 'cash',
      referenceNo: payment.referenceNo || '',
      date: payment.receivedAt ? new Date(payment.receivedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const remarks = prompt('Enter deletion remarks (required for audit):');
    if (!remarks) return;
    try {
      await api.delete(`/finance/payments/${id}`, { data: { remarks } });
      fetchPayments();
    } catch (error) {
      console.error('Failed to delete payment:', error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setPaymentTarget('invoice');
    setSelectedStudentId('');
    setStudentSearch('');
    setStudentDropdownOpen(false);
    setFormData({ invoiceId: '', amount: '', method: 'cash', referenceNo: '', date: new Date().toISOString().split('T')[0] });
  };

  const filteredStudents = students.filter((st) => {
    const q = studentSearch.toLowerCase();
    if (!q) return true;
    return (
      st.name?.toLowerCase().includes(q) ||
      st.email?.toLowerCase().includes(q) ||
      st.enrollmentNo?.toLowerCase().includes(q) ||
      st.phone?.toLowerCase().includes(q)
    );
  });

  const selectedStudent = students.find((st) => st.id === selectedStudentId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Payment Management</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Track and manage payment entries</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"><Plus className="w-4 h-4 mr-2" />Add Payment</Button>
          </DialogTrigger>
          <DialogContent className="wizard-form max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">{editingId ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Record Payment Against</Label>
                  <Select value={paymentTarget} onValueChange={(value: 'invoice' | 'student') => {
                    setPaymentTarget(value);
                    setFormData({ ...formData, invoiceId: '' });
                    setSelectedStudentId('');
                    setStudentSearch('');
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Against Invoice</SelectItem>
                      <SelectItem value="student">Against Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {paymentTarget === 'student' ? (
                  <div>
                    <Label>Select Student</Label>
                    <div className="relative">
                      <Input
                        placeholder="Search name, email or enroll no..."
                        value={selectedStudent && !studentDropdownOpen
                          ? `${selectedStudent.name}${selectedStudent.enrollmentNo ? ` (#${selectedStudent.enrollmentNo})` : ''}`
                          : studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          setSelectedStudentId('');
                          setStudentDropdownOpen(true);
                        }}
                        onFocus={() => {
                          setStudentSearch('');
                          setStudentDropdownOpen(true);
                        }}
                        onBlur={() => setTimeout(() => setStudentDropdownOpen(false), 200)}
                      />
                      {studentDropdownOpen && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-popover border rounded-md shadow-lg">
                          {filteredStudents.length === 0 ? (
                            <div className="p-3 text-sm text-muted-foreground text-center">No students found</div>
                          ) : (
                            filteredStudents.map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex flex-col gap-0.5"
                                onMouseDown={() => {
                                  setSelectedStudentId(st.id);
                                  setStudentSearch('');
                                  setStudentDropdownOpen(false);
                                  setFormData(prev => ({ ...prev, invoiceId: '' }));
                                }}
                              >
                                <span className="font-medium">{st.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {st.enrollmentNo && <span className="mr-2 text-primary">#{st.enrollmentNo}</span>}
                                  {st.email}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {selectedStudent && (
                      <p className="text-xs text-emerald-600 mt-1 font-medium">
                        ✓ {selectedStudent.name} {selectedStudent.enrollmentNo ? `(#${selectedStudent.enrollmentNo})` : ''}
                      </p>
                    )}
                  </div>
                ) : <div />}
              </div>

              <div>
                <Label>Invoice</Label>
                <Select
                  value={formData.invoiceId}
                  onValueChange={(value) => setFormData({ ...formData, invoiceId: value })}
                  disabled={paymentTarget === 'student' && !selectedStudentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={paymentTarget === 'student' && !selectedStudentId ? 'Select student first' : 'Select invoice'} />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices
                      .filter(inv => inv?.id)
                      .filter(inv => paymentTarget === 'student' ? inv.studentId === selectedStudentId : true)
                      .map((inv) => (
                        <SelectItem key={inv.id} value={inv.id.toString()}>
                          {inv.invoiceNo || inv.id} — {CS()}{inv.total ?? inv.amount}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {paymentTarget === 'student' && selectedStudentId && invoices.filter(i => i.studentId === selectedStudentId).length === 0 && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">
                    ⚠️ No invoices for this student. Create an invoice first.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Amount</Label>
                  <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Payment Date</Label>
                  <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                </div>
                <div>
                  <Label>Reference No</Label>
                  <Input value={formData.referenceNo} onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })} />
                </div>
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
          <h3 className="text-lg font-semibold tracking-tight">Payments</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{payments.filter(p => p?.id).length} total</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><DollarSign className="w-6 h-6" /></div>
              <p className="text-sm">No payments found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const validPayments = payments.filter(p => p?.id);
                const paginatedPayments = validPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                return (
                  <>
              {paginatedPayments.map((payment) => (
                <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-base text-slate-900">{CS()}{payment.amount.toLocaleString(numLocale())}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {payment.method?.toUpperCase()} • {payment.referenceNo || 'No reference'} • {payment.receivedAt ? new Date(payment.receivedAt).toLocaleDateString('en-GB').replace(/\//g, '-') : ''}
                      </div>
                      {payment.invoice && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Invoice: <span className="font-medium text-foreground">{payment.invoice.invoiceNo}</span>
                          {payment.invoice.student && (
                            <> · Student: <span className="font-medium text-foreground">{payment.invoice.student.name}</span></>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="rounded-full hover:bg-white" onClick={() => handleEdit(payment)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(payment.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              
              <ListPagination
                total={validPayments.length}
                page={currentPage}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
              />
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
