import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText, Download, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';

function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero Rs. Only';
  
  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const format = (n: number): string => {
    if (n < 10) return single[n];
    if (n < 20) return double[n - 10];
    const t = Math.floor(n / 10);
    const s = n % 10;
    return tens[t] + (s > 0 ? ' ' + single[s] : '');
  };
  
  let words = '';
  let n = Math.floor(amount);
  
  if (n >= 10000000) {
    words += format(Math.floor(n / 10000000)) + ' Crore ';
    n %= 10000000;
  }
  if (n >= 100000) {
    words += format(Math.floor(n / 100000)) + ' Lakh ';
    n %= 100000;
  }
  if (n >= 1000) {
    words += format(Math.floor(n / 1000)) + ' Thousand ';
    n %= 1000;
  }
  if (n >= 100) {
    words += format(Math.floor(n / 100)) + ' Hundred ';
    n %= 100;
  }
  if (n > 0) {
    words += format(n) + ' ';
  }
  
  return words.trim() + ' Rs. Only';
}

function ProformaReceiptDocument({ receipt, orgName }: { receipt: any; orgName: string }) {
  const actualOrgName = receipt.organization?.name || orgName;
  const logoUrl = api.getFileUrl(receipt.organization?.logo);
  const totalPaid = (receipt.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
  
  const paymentMethod = receipt.payments?.[0]?.method || 'CASH';
  const payAt = receipt.center || 'HEAD OFFICE';

  const totalFeeAmount = receipt.totalFee ?? (receipt.overallProgramFee || receipt.universityFee || 0);
  const totalRemittedAmount = receipt.overallPaid ?? totalPaid;
  const balanceFeeAmount = Math.max(0, totalFeeAmount - totalRemittedAmount);

  const receiptContent = (
    <div style={{ fontFamily: '"Inter", "Helvetica Neue", sans-serif', width: '100%', margin: '0 auto', background: '#fff', color: '#1e293b', padding: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ height: '64px', maxWidth: '200px', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 'bold' }}>
              {actualOrgName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>{actualOrgName}</div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>Proforma Invoice</div>
          </div>
        </div>
        <div style={{ textAlign: 'left', fontSize: '13px', color: '#475569', lineHeight: '1.6', maxWidth: '340px' }}>
          {receipt.organization?.address ? (
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{receipt.organization.address}</div>
          ) : (
            <>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>2nd Floor Al Madeena Tower, Calicut</div>
              <div>Road Edappal, Malappuram</div>
              <div>Kerala - 679576</div>
              <div>Mob: 9526387777</div>
              <div>Email: info@timseducation.com</div>
            </>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '18px', color: '#2563eb', marginBottom: '20px', textShadow: '0 1px 2px rgba(37,99,235,0.1)' }}>Proforma Invoice</div>

      {/* Details section grouped for readability (Column-wise stacked) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '36px' }}>
        
        {/* Receipt / Invoice Details */}
        <div style={{ border: '1px solid #bfdbfe', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ background: '#eff6ff', padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', borderBottom: '1px solid #bfdbfe', letterSpacing: '0.5px' }}>Invoice Details</div>
          <div style={{ display: 'flex', padding: '8px 12px', fontSize: '13px', gap: '24px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748b', width: '80px' }}>Invoice No:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.receiptNo?.replace('RCP-', '')}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748b', width: '65px' }}>Bill Date:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.latestTransactionDate || receipt.latestBillDate || receipt.billDate || receipt.date ? new Date(receipt.latestTransactionDate || receipt.latestBillDate || receipt.billDate || receipt.date).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A'}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748b', width: '90px' }}>Admission No:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.admissionNo || receipt.enrollmentNo || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Student Details */}
        <div style={{ border: '1px solid #e9d5ff', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ background: '#faf5ff', padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase', borderBottom: '1px solid #e9d5ff', letterSpacing: '0.5px' }}>Student Details</div>
          <div style={{ display: 'flex', padding: '8px 12px', fontSize: '13px', gap: '24px' }}>
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748b', width: '80px' }}>Name:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.studentName !== 'N/A' ? receipt.studentName : 'N/A'}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748b', width: '90px' }}>Date of Birth:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.studentDob ? new Date(receipt.studentDob).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Academic Details */}
        <div style={{ border: '1px solid #bbf7d0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ background: '#f0fdf4', padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', borderBottom: '1px solid #bbf7d0', letterSpacing: '0.5px' }}>Academic Details</div>
          <div style={{ display: 'flex', padding: '8px 12px', fontSize: '13px', gap: '24px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748b', width: '80px' }}>University:</span>
              <span style={{ fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>{receipt.university || 'N/A'}</span>
            </div>
            <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748b', width: '60px' }}>Course:</span>
              <span style={{ fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>{receipt.program || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ borderRadius: '8px', border: '1px solid #2563eb', overflow: 'hidden', marginBottom: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#2563eb' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Particulars</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', width: '200px' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(receipt.items) ? receipt.items : []).map((item: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#0f172a', fontWeight: 600, textTransform: 'uppercase' }}>{item.description || item.name}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: '#0f172a', fontWeight: 700 }}>{(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            <tr style={{ background: '#eff6ff', borderTop: '2px solid #2563eb' }}>
              <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1e40af', fontWeight: 800, textAlign: 'right', textTransform: 'uppercase' }}>Total Amount</td>
              <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '16px', color: '#1e40af', fontWeight: 900 }}>₹{(receipt.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment & Summary */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.8' }}>
            <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Amount in Words:</span> <span>{numberToWords(receipt.total || 0)}</span></div>
            <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Payment Mode:</span> <span>{paymentMethod.toUpperCase()}</span></div>
            <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Paid At:</span> <span>{payAt.toUpperCase()}</span></div>
          </div>
        </div>

        <div style={{ width: '340px', background: '#fdf8f6', padding: '20px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed #fdba74' }}>
            <span style={{ fontSize: '13px', color: '#c2410c', fontWeight: 600 }}>Total Fee</span>
            <span style={{ fontSize: '14px', color: '#9a3412', fontWeight: 700 }}>{receipt.feeStructureMissing ? 'Fee not set up' : `₹${totalFeeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px dashed #fdba74' }}>
            <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>Total Remitted Fee</span>
            <span style={{ fontSize: '14px', color: '#16a34a', fontWeight: 700 }}>₹{totalRemittedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 800, textTransform: 'uppercase' }}>Balance Fee</span>
            <span style={{ fontSize: '18px', color: balanceFeeAmount <= 0 ? '#16a34a' : '#ef4444', fontWeight: 900 }}>{receipt.feeStructureMissing ? '—' : `₹${balanceFeeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '2px dashed #e2e8f0', fontSize: '13px', color: '#475569' }}>
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>NB: Fee is not refundable.</div>
          <div style={{ fontSize: '12px' }}>This is a computer-generated receipt and does not require a physical signature.</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Received by:</div>
          <div style={{ fontStyle: 'italic' }}>Accountant / Cashier</div>
          <div style={{ fontWeight: 600, marginTop: '2px' }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <div id="proforma-print-area" style={{ background: '#fff' }}>
      {receiptContent}
    </div>
  );
}

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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [editingId, setEditingId] = useState<string | null>(null);

  // Proforma Invoice State
  const [proformaOpen, setProformaOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [loadingProforma, setLoadingProforma] = useState(false);
  const [orgName, setOrgName] = useState('Organisation');

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
    api.get('/auth/me').then(r => setOrgName(r.data?.data?.organization?.name || 'Organisation')).catch(() => {});
  }, []);

  const openProforma = async (invoice: any) => {
    setLoadingProforma(true);
    setProformaOpen(true);
    try {
      const res = await api.get(`/finance/receipt/invoice/${invoice.id}`);
      setReceipt(res.data.data);
    } catch {
      toast.error('Failed to load proforma invoice');
      setProformaOpen(false);
    } finally {
      setLoadingProforma(false);
    }
  };

  const handleDownloadPdf = () => {
    const content = document.getElementById('proforma-print-area');
    if (!content) return;
    
    const opt = {
      margin:       5,
      filename:     `Proforma_Invoice_${receipt?.receiptNo?.replace('RCP-', '') || 'Download'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(content).save();
  };

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
      const student = students.find(s => s.id === formData.studentId);
      
      let matchedFee = fees.find(f => {
        const progId = typeof f.programId === 'object' ? f.programId?.id : f.programId;
        return progId === selectedProgId && f.specialisation === student?.specialisation;
      });
      if (!matchedFee && student?.specialisation) {
        matchedFee = fees.find(f => {
          const progId = typeof f.programId === 'object' ? f.programId?.id : f.programId;
          return progId === selectedProgId && !f.specialisation;
        });
      }
      if (!matchedFee) {
        matchedFee = fees.find(f => {
          const progId = typeof f.programId === 'object' ? f.programId?.id : f.programId;
          return progId === selectedProgId;
        });
      }

      if (matchedFee) {
        const baseAmount = (matchedFee.registrationFee || 0) + (matchedFee.tuitionFee || 0) + (matchedFee.examFee || 0);
        const gstRate = matchedFee.gstPercentage || 0;
        const computedTax = Math.round((baseAmount * gstRate) / 100);

        const progObj = programs.find(p => p.id === selectedProgId);
        const univObj = universities.find(u => u.id === selectedUnivId);
        const specStr = student?.specialisation ? ` - ${student.specialisation}` : '';

        setFormData(prev => ({
          ...prev,
          itemDescription: `Admission Fees for ${progObj?.name || 'Program'}${specStr}${univObj ? ` (${univObj.name})` : ''}`,
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
      toast.error(err.response?.data?.message || 'Failed to save invoice');
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
                    Academic Partner
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
                  <Label>Academic Partner</Label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {(() => {
                const validInvoices = invoices.filter(inv => inv?.id);

                const paginatedInvoices = validInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                return (
                  <>
              {paginatedInvoices.map((inv) => {
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:hover:bg-blue-950/40"
                        onClick={() => openProforma(inv)}
                        title="Download / View Proforma Invoice"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        Proforma Invoice
                      </Button>
                      <Badge>{inv.status}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(inv)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(inv.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                );
              })}
              
              {/* Pagination Controls */}
              {(() => {
                const validInvoices = invoices.filter(inv => inv?.id);
                const totalPages = Math.max(1, Math.ceil(validInvoices.length / itemsPerPage));
                if (totalPages <= 1) return null;
                return (
                  <div className="flex items-center justify-between p-4 border-t mt-4 rounded-md bg-slate-50 dark:bg-slate-900/20">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, validInvoices.length)} of {validInvoices.length} invoices
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="text-sm font-medium px-2">
                        Page {currentPage} of {totalPages}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                );
              })()}
                  </>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proforma Invoice Dialog */}
      <Dialog open={proformaOpen} onOpenChange={setProformaOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Proforma Invoice</DialogTitle>
              <Button size="sm" onClick={handleDownloadPdf} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Download className="w-3.5 h-3.5" /> Download PDF
              </Button>
            </div>
          </DialogHeader>
          {loadingProforma ? (
            <div className="py-16 text-center text-muted-foreground">Generating proforma invoice...</div>
          ) : receipt ? (
            <ProformaReceiptDocument receipt={receipt} orgName={orgName} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

