import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';

export function PaymentsPanel() {
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
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
    referenceNo: ''
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
      alert(error.response?.data?.message || 'Failed to save payment');
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
      referenceNo: payment.referenceNo || ''
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
    setFormData({ invoiceId: '', amount: '', method: 'cash', referenceNo: '' });
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Management</h2>
          <p className="text-muted-foreground">Track and manage payment entries</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Payment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
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
                          {inv.invoiceNo || inv.id} — ₹{inv.total ?? inv.amount}
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

              <div>
                <Label>Reference No</Label>
                <Input value={formData.referenceNo} onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })} />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Save</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No payments found</div>
          ) : (
            <div className="space-y-2">
              {payments.filter(p => p?.id).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">₹{payment.amount.toLocaleString('en-IN')}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {payment.method?.toUpperCase()} • {payment.referenceNo || 'No reference'}
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
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(payment)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(payment.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
