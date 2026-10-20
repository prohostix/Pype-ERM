import { useState, useEffect } from 'react';
import { FileText, Search, Printer, Building2, User, Receipt, CheckCircle, AlertTriangle, TrendingUp, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

function ReceiptDocument({ receipt, orgName }: { receipt: any; orgName: string }) {
  const actualOrgName = receipt.organization?.name || orgName;
  const logoUrl = api.getFileUrl(receipt.organization?.logo);
  const totalPaid = (receipt.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
  
  const paymentMethod = receipt.payments?.[0]?.method || 'CASH';
  const payAt = receipt.center || 'HEAD OFFICE';

  const totalFeeAmount = receipt.totalFee ?? (receipt.overallProgramFee || receipt.universityFee || 0);
  const totalRemittedAmount = receipt.overallPaid ?? totalPaid;
  const balanceFeeAmount = Math.max(0, totalFeeAmount - totalRemittedAmount);

  const paymentHistoryList = (Array.isArray(receipt.paymentHistory) && receipt.paymentHistory.length > 0)
    ? receipt.paymentHistory
    : (Array.isArray(receipt.payments) && receipt.payments.length > 0)
      ? receipt.payments.map((p: any) => ({
          id: p.id,
          date: p.receivedAt || p.createdAt || receipt.date,
          amount: p.amount,
          method: p.method || paymentMethod,
          referenceNo: p.referenceNo || receipt.receiptNo,
          invoiceNo: receipt.receiptNo?.replace('RCP-', '')
        }))
      : [];

  const receiptContent = (
    <div style={{ fontFamily: '"Inter", "Helvetica Neue", sans-serif', width: '100%', margin: '0 auto', background: '#fff', color: '#1e293b', padding: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
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
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>Cash Receipt</div>
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

      <div style={{ textAlign: 'center', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '18px', color: '#2563eb', marginBottom: '18px', textShadow: '0 1px 2px rgba(37,99,235,0.1)' }}>Payment Receipt</div>

      {/* Details section grouped for readability (Column-wise stacked) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
        
        {/* Receipt Details */}
        <div style={{ border: '1px solid #bfdbfe', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ background: '#eff6ff', padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', borderBottom: '1px solid #bfdbfe', letterSpacing: '0.5px' }}>Receipt Details</div>
          <div style={{ display: 'flex', padding: '8px 12px', fontSize: '13px', gap: '24px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748b', width: '80px' }}>Receipt No:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.receiptNo?.replace('RCP-', '')}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748b', width: '40px' }}>Date:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{new Date(receipt.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</span>
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

      {/* Table of Particulars */}
      <div style={{ borderRadius: '8px', border: '1px solid #2563eb', overflow: 'hidden', marginBottom: '16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#2563eb' }}>
              <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: '11px', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Particulars</th>
              <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: '11px', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', width: '200px' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(receipt.items) ? receipt.items : []).map((item: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px', fontSize: '13px', color: '#0f172a', fontWeight: 600, textTransform: 'uppercase' }}>{item.description || item.name}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>{(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            <tr style={{ background: '#eff6ff', borderTop: '2px solid #2563eb' }}>
              <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1e40af', fontWeight: 800, textAlign: 'right', textTransform: 'uppercase' }}>Total Amount</td>
              <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '15px', color: '#1e40af', fontWeight: 900 }}>₹{(receipt.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment History / Transactions Table */}
      {paymentHistoryList.length > 0 && (
        <div style={{ borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ background: '#f8fafc', padding: '6px 12px', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment History / Transactions</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>{paymentHistoryList.length} {paymentHistoryList.length === 1 ? 'Record' : 'Records'}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '32px' }}>#</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '95px' }}>Date</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Receipt / Ref No</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '105px' }}>Mode</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '120px' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistoryList.map((p: any, idx: number) => {
                const pDate = p.date ? new Date(p.date).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A';
                return (
                  <tr key={p.id || idx} style={{ borderBottom: idx === paymentHistoryList.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '6px 10px', fontSize: '12px', color: '#0f172a', fontWeight: 600 }}>{pDate}</td>
                    <td style={{ padding: '6px 10px', fontSize: '12px', color: '#334155', fontFamily: 'monospace', fontWeight: 600 }}>{p.referenceNo || p.invoiceNo || 'N/A'}</td>
                    <td style={{ padding: '6px 10px', fontSize: '12px', color: '#0f172a', textTransform: 'uppercase', fontWeight: 600 }}>{p.method || 'CASH'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>₹{(Number(p.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment & Summary */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.8' }}>
            <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Amount in Words:</span> <span>{numberToWords(receipt.total || 0)}</span></div>
            <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Payment Mode:</span> <span>{paymentMethod.toUpperCase()}</span></div>
            <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Paid At:</span> <span>{payAt.toUpperCase()}</span></div>
          </div>
        </div>

        <div style={{ width: '320px', background: '#fdf8f6', padding: '16px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed #fdba74' }}>
            <span style={{ fontSize: '13px', color: '#c2410c', fontWeight: 600 }}>Total Fee</span>
            <span style={{ fontSize: '14px', color: '#9a3412', fontWeight: 700 }}>{receipt.feeStructureMissing ? 'Fee not set up' : `₹${totalFeeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px dashed #fdba74' }}>
            <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>Total Remitted Fee</span>
            <span style={{ fontSize: '14px', color: '#16a34a', fontWeight: 700 }}>₹{totalRemittedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800, textTransform: 'uppercase' }}>Balance Fee</span>
            <span style={{ fontSize: '17px', color: balanceFeeAmount <= 0 ? '#16a34a' : '#ef4444', fontWeight: 900 }}>{receipt.feeStructureMissing ? '—' : `₹${balanceFeeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '12px', borderTop: '2px dashed #e2e8f0', fontSize: '12px', color: '#475569' }}>
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>NB: Fee is not refundable.</div>
          <div style={{ fontSize: '11px' }}>This is a computer-generated receipt and does not require a physical signature.</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>Received by:</div>
          <div style={{ fontStyle: 'italic' }}>Accountant / Cashier</div>
          <div style={{ fontWeight: 600, marginTop: '2px' }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <div id="receipt-print-area" style={{ background: '#fff' }}>
      {receiptContent}
    </div>
  );
}

export function BillReceiptPanel() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [receipt, setReceipt] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [orgName, setOrgName] = useState('Organisation');

  useEffect(() => {
    fetchInvoices();
    // Try to get org name
    api.get('/auth/me').then(r => setOrgName(r.data?.data?.organization?.name || 'Organisation')).catch(() => { });
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/invoices');
      setInvoices(res.data.data || []);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  const openReceipt = async (invoice: any) => {
    setLoadingReceipt(true);
    setReceiptOpen(true);
    try {
      const res = await api.get(`/finance/receipt/invoice/${invoice.id}`);
      setReceipt(res.data.data);
    } catch { toast.error('Failed to load receipt'); setReceiptOpen(false); }
    finally { setLoadingReceipt(false); }
  };

  const handlePrint = () => {
    const content = document.getElementById('receipt-print-area');
    if (!content) return;
    
    const opt = {
      margin:       5, // Small 5mm margin all around
      filename:     `Receipt_${receipt?.receiptNo || 'Download'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(content).save();
  };

  const filtered = invoices.filter(inv => {
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchSearch = !search || inv.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
      inv.student?.name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusColors: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    draft: 'bg-slate-100 text-slate-600',
    partial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-500" />
              Bills &amp; Receipts
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search invoice / student..." className="pl-8 h-8 w-56 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-32 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading invoices...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No invoices found</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3.5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{inv.invoiceNo}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <User className="w-3 h-3" /> {inv.student?.name || 'N/A'}
                        {inv.center?.name && <><span>•</span><Building2 className="w-3 h-3" />{inv.center.name}</>}
                      </div>
                      {inv.dueDate && (
                        <div className="text-xs text-muted-foreground">Due: {new Date(inv.dueDate).toLocaleDateString('en-IN')}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-sm">₹{(inv.total || inv.amount || 0).toLocaleString('en-IN')}</div>
                      <Badge className={statusColors[inv.status] || ''}>{inv.status}</Badge>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => openReceipt(inv)}>
                      <Printer className="w-3.5 h-3.5" /> Receipt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Payment Receipt</DialogTitle>
              <Button size="sm" onClick={handlePrint} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Download className="w-3.5 h-3.5" /> Download PDF
              </Button>
            </div>
          </DialogHeader>
          {loadingReceipt ? (
            <div className="py-16 text-center text-muted-foreground">Generating receipt...</div>
          ) : receipt ? (
            <ReceiptDocument receipt={receipt} orgName={orgName} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
