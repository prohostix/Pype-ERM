import { useState, useEffect } from 'react';
import { Link2, QrCode, Copy, CheckCircle, Clock, XCircle, Plus, Search, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';

import { CS } from '@/lib/currency';
import { ListPagination } from '@/components/ui/list-pagination';
import { useAuth } from '@/hooks/useAuth';
import { mayOn } from '@/lib/access';
import { Allowed } from '@/components/ui/allowed';
// Inline SVG QR-like placeholder using a canvas-free approach
function QRDisplay({ value }: { value: string }) {
  // Generate a deterministic "pattern" using string hash for visual representation
  const hash = Array.from(value).reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0);
  const size = 7;
  const cells: boolean[] = [];
  for (let i = 0; i < size * size; i++) {
    cells.push(((hash >> (i % 32)) & 1) === 1 || i % 3 === 0);
  }
  // Corner markers
  const corners = new Set([0, 1, 2, 7, 14, 21, 28, 35, 42, 5, 6, 13, 6, 41, 48, 42, 43, 44, 45, 46, 47, 48]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl border">
      <div className="p-3 bg-white rounded-lg shadow-sm border">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
          {cells.map((filled, i) => (
            <div key={i} className={`w-5 h-5 rounded-sm ${filled || corners.has(i) ? 'bg-slate-900' : 'bg-white'}`} />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center break-all max-w-xs">{value}</p>
    </div>
  );
}

export function PaymentGatewayPanel() {
  const { user } = useAuth();
  // The role decides unless an Org Admin has set something for this user (the server enforces it)
  const mayCreate = mayOn(user, 'payment_gateway', 'create', true);
  const [links, setLinks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [search, setSearch] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    scheduleId: '',
    amount: '',
    description: '',
    expiryDays: '30'
  });

  useEffect(() => {
    fetchLinks();
    api.get('/students').then(r => setStudents(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.studentId) {
      api.get(`/finance/payment-plan/${form.studentId}`)
        .then(r => setSchedules(r.data.data?.schedules || []))
        .catch(() => setSchedules([]));
    } else {
      setSchedules([]);
    }
  }, [form.studentId]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/payment-links');
      setLinks(res.data.data || []);
    } catch { toast.error('Failed to load payment links'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.studentId || !form.amount) { toast.error('Student and amount are required'); return; }
    setCreating(true);
    try {
      await api.post('/finance/payment-links', {
        studentId: form.studentId,
        scheduleId: form.scheduleId || undefined,
        amount: form.amount,
        description: form.description,
        expiryDays: parseInt(form.expiryDays)
      });
      toast.success('Payment link generated!');
      setCreateOpen(false);
      setForm({ studentId: '', scheduleId: '', amount: '', description: '', expiryDays: '30' });
      fetchLinks();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setCreating(false); }
  };

  const copyLink = (link: any) => {
    navigator.clipboard.writeText(link.paymentUrl);
    toast.success('Payment link copied!');
  };

  const statusIcon = (status: string) => {
    if (status === 'paid') return <span className="w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center"><CheckCircle className="w-5 h-5" /></span>;
    if (status === 'expired') return <span className="w-11 h-11 rounded-2xl bg-white text-red-500 flex items-center justify-center"><XCircle className="w-5 h-5" /></span>;
    return <span className="w-11 h-11 rounded-2xl bg-white text-amber-500 flex items-center justify-center"><Clock className="w-5 h-5" /></span>;
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-sky-100 text-sky-700',
      paid: 'bg-[#dff3da] text-[#256c1d]',
      expired: 'bg-red-100 text-red-700',
    };
    return <span className={`rounded-full px-3 py-0.5 text-[11px] font-semibold capitalize ${map[s] || 'bg-slate-100 text-slate-600'}`}>{s}</span>;
  };

  const filtered = links.filter(l =>
    !search || l.student?.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.student?.enrollmentNo?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Payment Gateway Links</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Generate and share payment links for student fees.</p>
        </div>
        <Allowed when={mayCreate}><Button onClick={() => setCreateOpen(true)} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
          <Plus className="w-4 h-4 mr-2" />Generate Link
        </Button></Allowed>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Links', value: links.length, color: 'text-slate-900' },
          { label: 'Active', value: links.filter(l => l.status === 'active').length, color: 'text-sky-600' },
          { label: 'Paid', value: links.filter(l => l.status === 'paid').length, color: 'text-[#256c1d]' },
        ].map(s => (
          <div key={s.label} className="rounded-3xl bg-white border border-slate-100 p-5">
            <div className="text-xs font-medium text-slate-500">{s.label}</div>
            <div className={`text-3xl font-semibold tracking-tight mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search student..." className="pl-11 h-12 rounded-full bg-[#f4f6f3] border-transparent text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Links</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{filtered.length} found</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><QrCode className="w-6 h-6" /></div>
              <p className="text-sm">No payment links generated yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const paginatedFiltered = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                return (
                  <>
              {paginatedFiltered.map(link => (
                <div key={link.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                  <div className="flex items-center gap-3">
                    <div>{statusIcon(link.status)}</div>
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {link.student?.name}
                        {statusBadge(link.status)}
                      </div>
                      <div className="text-xs text-muted-foreground">{link.student?.enrollmentNo} • {link.description}</div>
                      {link.schedule && (
                        <div className="text-xs text-muted-foreground">{link.schedule.title} — Due: {new Date(link.schedule.dueDate).toLocaleDateString('en-IN')}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Expires: {new Date(link.expiresAt).toLocaleDateString('en-IN')} •
                        Created: {new Date(link.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right mr-2">
                      <div className="font-semibold text-lg text-slate-900">{CS()}{link.amount.toLocaleString()}</div>
                    </div>
                    <Button size="sm" variant="outline" className="h-9 w-9 p-0 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]" onClick={() => copyLink(link)} title="Copy link">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 w-9 p-0 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]" onClick={() => { setSelectedLink(link); setQrOpen(true); }} title="Show QR">
                      <QrCode className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 w-9 p-0 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]" onClick={() => window.open(link.paymentUrl, '_blank')} title="Open link">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <ListPagination
                total={filtered.length}
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

      {/* Create Link Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader><DialogTitle className="text-xl font-semibold tracking-tight">Generate Payment Link</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Student <span className="text-rose-500">*</span></Label>
              <Select value={form.studentId} onValueChange={v => setForm({ ...form, studentId: v, scheduleId: '' })}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.enrollmentNo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {schedules.length > 0 && (
              <div>
                <Label>Installment (optional)</Label>
                <Select value={form.scheduleId} onValueChange={v => {
                  const s = schedules.find((s: any) => s.id === v);
                  setForm({ ...form, scheduleId: v, amount: s?.amount?.toString() || form.amount, description: s?.title || form.description });
                }}>
                  <SelectTrigger><SelectValue placeholder="Link to an installment" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— No specific installment —</SelectItem>
                    {schedules.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title} — {CS()}{s.amount.toLocaleString()} (Due: {new Date(s.dueDate).toLocaleDateString('en-IN')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Amount ({CS()}) <span className="text-rose-500">*</span></Label>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Enter amount" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Semester 1 Fee" />
            </div>
            <div>
              <Label>Link Expires After</Label>
              <Select value={form.expiryDays} onValueChange={v => setForm({ ...form, expiryDays: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="15">15 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Allowed when={mayCreate}><Button onClick={handleCreate} disabled={creating} className="flex-1 h-11 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold gap-1.5">
                <Link2 className="w-4 h-4" /> {creating ? 'Generating...' : 'Generate Link'}
              </Button></Allowed>
              <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setCreateOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader><DialogTitle className="text-xl font-semibold tracking-tight">Payment QR Code</DialogTitle></DialogHeader>
          {selectedLink && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="font-semibold">{selectedLink.student?.name}</div>
                <div className="text-3xl font-semibold tracking-tight text-[#256c1d] mt-1">{CS()}{selectedLink.amount.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">{selectedLink.description}</div>
              </div>
              <QRDisplay value={selectedLink.paymentUrl} />
              <div className="flex gap-2">
                <Button className="flex-1 gap-1.5 h-11 rounded-full" variant="outline" onClick={() => copyLink(selectedLink)}>
                  <Copy className="w-4 h-4" /> Copy Link
                </Button>
                <Button className="flex-1 gap-1.5 h-11 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => window.open(selectedLink.paymentUrl, '_blank')}>
                  <ExternalLink className="w-4 h-4" /> Open
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
