import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

export function InvoicesPanel() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);

  const [billingTarget, setBillingTarget] = useState<'center' | 'student'>('center');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search states
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);

  // Service Type states
  const [serviceType, setServiceType] = useState<'admission' | 'other'>('other');
  const [selectedUnivId, setSelectedUnivId] = useState('');
  const [selectedProgId, setSelectedProgId] = useState('');

  const [formData, setFormData] = useState({
    centerId: '',
    studentId: '',
    invoiceNo: '',
    itemDescription: '',
    itemQty: '1',
    itemRate: '',
    tax: '0',
    dueDate: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchInvoices();
    fetchCenters();
    fetchStudents();
    fetchUniversities();
    fetchPrograms();
    fetchFees();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/invoices');
      setInvoices(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCenters = async () => {
    try {
      const res = await api.get('/operations/centers');
      setCenters(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch centers:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  const fetchUniversities = async () => {
    try {
      const res = await api.get('/operations/universities');
      setUniversities(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch universities:', err);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await api.get('/operations/programs');
      setPrograms(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    }
  };

  const fetchFees = async () => {
    try {
      const res = await api.get('/finance/fees');
      setFees(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch fees:', err);
    }
  };

  // Auto-fill university and program if billing target is student and service type is admission
  useEffect(() => {
    if (billingTarget === 'student' && serviceType === 'admission' && formData.studentId) {
      const student = students.find(s => s.id === formData.studentId);
      if (student) {
        if (student.universityId) {
          setSelectedUnivId(student.universityId.toString());
        }
        if (student.programId) {
          // ensure the universities are updated before setting program ID to avoid select constraints
          setTimeout(() => setSelectedProgId(student.programId.toString()), 50);
        }
      }
    }
  }, [billingTarget, serviceType, formData.studentId, students]);

  // Auto-fill rates and tax from fee structure when admission selection changes
  useEffect(() => {
    if (serviceType === 'admission' && selectedProgId) {
      const matchedFee = fees.find(f => {
        const progId = typeof f.programId === 'object' ? f.programId?.id : f.programId;
        return progId === selectedProgId;
      });

      if (matchedFee) {
        const baseAmount = (matchedFee.registrationFee || 0) + (matchedFee.tuitionFee || 0) + (matchedFee.examFee || 0);
        const gstRate = matchedFee.gstPercentage || 0;
        const computedTax = Math.round((baseAmount * gstRate) / 100);

        const progObj = programs.find(p => p.id === selectedProgId);
        const univObj = universities.find(u => u.id === selectedUnivId);

        setFormData(prev => ({
          ...prev,
          itemDescription: `Admission Fees for ${progObj?.name || 'Program'}${univObj ? ` (${univObj.name})` : ''}`,
          itemQty: '1',
          itemRate: baseAmount.toString(),
          tax: computedTax.toString()
        }));
      }
    }
  }, [selectedProgId, serviceType, fees, programs, universities, selectedUnivId]);

  const calcTotal = () => {
    const qty = Number(formData.itemQty) || 0;
    const rate = Number(formData.itemRate) || 0;
    const tax = Number(formData.tax) || 0;
    const amount = qty * rate;
    return { amount, total: amount + tax };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { amount, total } = calcTotal();
    const payload: any = {
      centerId: formData.centerId || null,
      studentId: billingTarget === 'student' ? formData.studentId : null,
      invoiceNo: formData.invoiceNo,
      items: [{
        description: formData.itemDescription,
        quantity: Number(formData.itemQty),
        rate: Number(formData.itemRate),
        amount
      }],
      amount,
      tax: Number(formData.tax),
      total,
      status: formData.status
    };
    if (formData.dueDate) payload.dueDate = formData.dueDate;

    try {
      if (editingId) {
        await api.put(`/finance/invoices/${editingId}`, payload);
      } else {
        await api.post('/finance/invoices', payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save invoice');
    }
  };

  const handleEdit = (inv: any) => {
    const centerId = typeof inv.centerId === 'object' ? inv.centerId?.id : inv.centerId;
    const studentId = typeof inv.studentId === 'object' ? inv.studentId?.id : inv.studentId;
    const firstItem = inv.items?.[0] || {};
    setEditingId(inv.id);
    setBillingTarget(inv.studentId ? 'student' : 'center');
    setServiceType('other'); // Default back to custom view on editing
    setFormData({
      centerId: centerId?.toString() || '',
      studentId: studentId?.toString() || '',
      invoiceNo: inv.invoiceNo || '',
      itemDescription: firstItem.description || '',
      itemQty: firstItem.quantity?.toString() || '1',
      itemRate: firstItem.rate?.toString() || '',
      tax: inv.tax?.toString() || '0',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
      status: inv.status || 'draft'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice?')) return;
    const remarks = prompt('Enter deletion remarks (required for audit):');
    if (!remarks) return;
    try {
      await api.delete(`/finance/invoices/${id}`, { data: { remarks } });
      fetchInvoices();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setBillingTarget('center');
    setServiceType('other');
    setSelectedUnivId('');
    setSelectedProgId('');
    setStudentSearch('');
    setStudentDropdownOpen(false);
    setFormData({
      centerId: '',
      studentId: '',
      invoiceNo: '',
      itemDescription: '',
      itemQty: '1',
      itemRate: '',
      tax: '0',
      dueDate: '',
      status: 'draft'
    });
  };

  const { total } = calcTotal();

  const filteredStudents = students.filter((st) => {
    const q = studentSearch.toLowerCase();
    if (!q) return true;
    return (
      st.name?.toLowerCase().includes(q) ||
      st.email?.toLowerCase().includes(q) ||
      st.enrollmentNo?.toLowerCase().includes(q)
    );
  });

  const selectedStudent = students.find((st) => st.id === formData.studentId);
  const filteredPrograms = selectedUnivId ? programs.filter(p => p.universityId === selectedUnivId) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoice Management</h2>
          <p className="text-muted-foreground">Manage invoices and billing</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Invoice' : 'Add New Invoice'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Billing Target */}
              <div>
                <Label>Billing Target</Label>
                <div className="flex gap-4 mt-1 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBillingTarget('center');
                      setFormData(prev => ({ ...prev, studentId: '' }));
                    }}
                    className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
                      billingTarget === 'center'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    Study Center
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBillingTarget('student');
                      setFormData(prev => ({ ...prev, centerId: '' }));
                    }}
                    className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
                      billingTarget === 'student'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    Student
                  </button>
                </div>
              </div>

              {/* Center Selector */}
              {billingTarget === 'center' ? (
                <div>
                  <Label>Study Center</Label>
                  <Select value={formData.centerId} onValueChange={(v) => setFormData({ ...formData, centerId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select center" /></SelectTrigger>
                    <SelectContent>
                      {centers.filter(c => c?.id).map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                /* Searchable Student Dropdown */
                <div>
                  <Label>Student</Label>
                  <div className="relative mt-1">
                    <Input
                      placeholder="Search student by name or enrollment number..."
                      value={selectedStudent && !studentDropdownOpen
                        ? `${selectedStudent.name} (${selectedStudent.enrollmentNo || 'No Enroll No'})`
                        : studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setFormData(prev => ({ ...prev, studentId: '' }));
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
                                setFormData(prev => ({
                                  ...prev,
                                  studentId: st.id,
                                  centerId: (st.centerId || '').toString()
                                }));
                                setServiceType('admission');
                                setStudentSearch('');
                                setStudentDropdownOpen(false);
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
                </div>
              )}

              {/* Service Type Dropdown */}
              <div>
                <Label>Service Type</Label>
                <Select value={serviceType} onValueChange={(val: 'admission' | 'other') => setServiceType(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="other">Custom Invoice Item</SelectItem>
                    <SelectItem value="admission">Admission / Program Fees</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admission details dropdowns */}
              {serviceType === 'admission' ? (
                <div className="flex flex-col gap-4 border p-3 rounded-lg bg-muted/20">
                  <div>
                    <Label>University</Label>
                    <Select value={selectedUnivId} onValueChange={(val) => { setSelectedUnivId(val); setSelectedProgId(''); }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select university" /></SelectTrigger>
                      <SelectContent>
                        {universities.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Program</Label>
                    <Select value={selectedProgId} onValueChange={setSelectedProgId} disabled={!selectedUnivId}>
                      <SelectTrigger className="w-full"><SelectValue placeholder={selectedUnivId ? 'Select program' : 'Select university first'} /></SelectTrigger>
                      <SelectContent>
                        {filteredPrograms.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              <div>
                <Label>Invoice No</Label>
                <Input value={formData.invoiceNo} onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })} required placeholder="e.g. INV-001" />
              </div>

              <div>
                <Label>Item Description</Label>
                <Input value={formData.itemDescription} onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {serviceType === 'other' ? (
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" min="1" value={formData.itemQty} onChange={(e) => setFormData({ ...formData, itemQty: e.target.value })} required />
                  </div>
                ) : (
                  <div className="flex flex-col justify-end pb-2">
                    <span className="text-xs text-emerald-600 font-medium">✓ Qty lock: 1 for Admission</span>
                  </div>
                )}
                <div>
                  <Label>Rate</Label>
                  <Input type="number" min="0" value={formData.itemRate} onChange={(e) => setFormData({ ...formData, itemRate: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tax</Label>
                  <Input type="number" min="0" value={formData.tax} onChange={(e) => setFormData({ ...formData, tax: e.target.value })} />
                </div>
                <div>
                  <Label>Total (auto)</Label>
                  <Input value={total.toFixed(2)} readOnly className="bg-muted" />
                </div>
              </div>

              <div>
                <Label>Due Date (optional)</Label>
                <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
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
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No invoices found</div>
          ) : (
            <div className="space-y-2">
              {invoices.filter(inv => inv?.id).map((inv) => {
                const centerName = inv.center?.name || (typeof inv.centerId === 'object' ? inv.centerId?.name : '');
                const studentName = inv.student?.name;
                const billingDisplay = studentName
                  ? `Student: ${studentName}${centerName ? ` (${centerName})` : ''}`
                  : `Center: ${centerName}`;
                return (
                  <div key={inv.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{inv.invoiceNo}</div>
                        <div className="text-sm text-muted-foreground">
                          {billingDisplay} • Total: ₹{inv.total}
                          {inv.dueDate && ` • Due: ${new Date(inv.dueDate).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{inv.status}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(inv)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(inv.id)}><Trash2 className="w-4 h-4" /></Button>
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

