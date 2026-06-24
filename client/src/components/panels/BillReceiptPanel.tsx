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

  return (
    <div id="receipt-print-area" style={{ fontFamily: 'Arial, sans-serif', maxWidth: 700, margin: '0 auto', padding: 32, background: '#fff', color: '#1e293b' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e40af', paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e40af' }}>{orgName}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Finance Department</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1e40af' }}>RECEIPT</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>#{receipt.receiptNo}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(receipt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Student Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Student Details</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{receipt.studentName}</div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{receipt.studentEmail}</div>
          {receipt.enrollmentNo && <div style={{ fontSize: 12, color: '#475569' }}>ID: {receipt.enrollmentNo}</div>}
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Program Details</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{receipt.program || 'N/A'}</div>
          {receipt.university && <div style={{ fontSize: 12, color: '#475569' }}>{receipt.university}</div>}
          {receipt.center && <div style={{ fontSize: 12, color: '#475569' }}>Center: {receipt.center}</div>}
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#1e40af', color: '#fff' }}>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12 }}>Description</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {(Array.isArray(receipt.items) ? receipt.items : []).map((item: any, i: number) => (
            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px 12px', fontSize: 13 }}>{item.description || item.name || 'Fee'}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13 }}>₹{(item.amount || 0).toLocaleString('en-IN')}</td>
            </tr>
          ))}
          {receipt.tax > 0 && (
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px 12px', fontSize: 13, color: '#64748b' }}>Tax / GST</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13 }}>₹{receipt.tax.toLocaleString('en-IN')}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f1f5f9' }}>
            <td style={{ padding: '12px', fontWeight: 700, fontSize: 15 }}>Total</td>
            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: 15, color: '#1e40af' }}>₹{(receipt.total || 0).toLocaleString('en-IN')}</td>
          </tr>
        </tfoot>
      </table>

      {/* Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: '#64748b' }}>Payment Status</div>
        <div style={{ fontWeight: 700, fontSize: 14, color: statusColor[receipt.status] || '#64748b', textTransform: 'uppercase' }}>{receipt.status}</div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
        This is a computer-generated receipt and does not require a physical signature. • Generated on {new Date().toLocaleDateString('en-IN')}
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
