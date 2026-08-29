import { useState, useEffect } from 'react';
import { FileText, Search, Printer, Building2, User, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';

function ReceiptDocument({ receipt, orgName }: { receipt: any; orgName: string }) {
  const statusColor: Record<string, string> = {
    paid: '#16a34a', pending: '#d97706', draft: '#64748b', partial: '#2563eb'
  };

  const actualOrgName = receipt.organization?.name || orgName;
  const logoUrl = api.getFileUrl(receipt.organization?.logo);
  const totalPaid = (receipt.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
  const balanceDue = receipt.balanceDue !== undefined ? receipt.balanceDue : Math.max(0, (receipt.total || 0) - totalPaid);

  return (
    <div id="receipt-print-area" style={{ fontFamily: '"Inter", "Helvetica Neue", sans-serif', maxWidth: 800, margin: '0 auto', padding: 40, background: '#fff', color: '#334155' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #f1f5f9', paddingBottom: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Organization Logo" style={{ width: 64, height: 64, objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 64, height: 64, background: '#1e40af', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
              {actualOrgName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>{actualOrgName}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b', fontWeight: 500 }}>Finance &amp; Admissions Department</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1e40af', letterSpacing: '1px' }}>INVOICE / RECEIPT</div>
          <div style={{ fontSize: 14, color: '#475569', marginTop: 8, fontWeight: 500 }}>Receipt #: <span style={{ color: '#0f172a' }}>{receipt.receiptNo}</span></div>
          <div style={{ fontSize: 14, color: '#475569', marginTop: 4, fontWeight: 500 }}>Date: <span style={{ color: '#0f172a' }}>{new Date(receipt.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
        </div>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, background: '#f8fafc' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Billed To (Student)</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{receipt.studentName}</div>
          {receipt.studentEmail && <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{receipt.studentEmail}</div>}
          {receipt.enrollmentNo && <div style={{ fontSize: 13, color: '#475569', marginTop: 4, fontWeight: 500 }}>Enrollment ID: <span style={{ color: '#0f172a' }}>{receipt.enrollmentNo}</span></div>}
        </div>
        <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, background: '#f8fafc' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Program &amp; Center Details</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{receipt.program || 'N/A'}</div>
          {receipt.university && <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{receipt.university}</div>}
          {receipt.center && <div style={{ fontSize: 13, color: '#475569', marginTop: 4, fontWeight: 500 }}>Center: <span style={{ color: '#0f172a' }}>{receipt.center}</span></div>}
        </div>
      </div>

      {/* Items Table */}
      <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 32 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Description</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(receipt.items) ? receipt.items : []).map((item: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '16px 20px', fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{item.description || item.name || 'Fee'}</td>
                <td style={{ padding: '16px 20px', textAlign: 'right', fontSize: 14, color: '#0f172a', fontWeight: 600 }}>₹{(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {receipt.tax > 0 && (
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '16px 20px', fontSize: 14, color: '#64748b' }}>Tax / GST</td>
                <td style={{ padding: '16px 20px', textAlign: 'right', fontSize: 14, color: '#64748b', fontWeight: 500 }}>₹{receipt.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Financial Summary */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
        <div style={{ width: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Subtotal</span>
            <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>₹{(receipt.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 14, color: '#16a34a', fontWeight: 600 }}>Amount Paid</span>
            <span style={{ fontSize: 14, color: '#16a34a', fontWeight: 700 }}>- ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '3px solid #1e40af' }}>
            <span style={{ fontSize: 18, color: '#0f172a', fontWeight: 800 }}>Balance Due</span>
            <span style={{ fontSize: 18, color: '#1e40af', fontWeight: 800 }}>₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: balanceDue === 0 ? '#f0fdf4' : (balanceDue === receipt.total ? '#fffbeb' : '#eff6ff'), border: `1px solid ${balanceDue === 0 ? '#bbf7d0' : (balanceDue === receipt.total ? '#fde68a' : '#bfdbfe')}`, borderRadius: 12, marginBottom: 32 }}>
        <div style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>Payment Status</div>
        <div style={{ fontWeight: 800, fontSize: 16, color: statusColor[receipt.status] || '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>{receipt.status}</div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: 20, fontSize: 12, color: '#64748b', textAlign: 'center', fontWeight: 500 }}>
        This is a computer-generated receipt and does not require a physical signature. <br/>
        Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
      </div>
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
    api.get('/auth/me').then(r => setOrgName(r.data?.data?.organization?.name || 'Organisation')).catch(() => {});
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
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Receipt</title><style>body{margin:0;padding:0;}</style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Payment Receipt</DialogTitle>
              <Button size="sm" onClick={handlePrint} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Printer className="w-3.5 h-3.5" /> Print
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
