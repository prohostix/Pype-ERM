import { useState, useEffect } from 'react';
import { Link2, QrCode, Copy, CheckCircle, Clock, XCircle, Plus, Search, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';

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
  const [links, setLinks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [search, setSearch] = useState('');
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
    if (status === 'paid') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === 'expired') return <XCircle className="w-4 h-4 text-rose-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
      paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30',
      expired: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30',
    };
    return <Badge className={map[s] || ''}>{s}</Badge>;
  };

  const filtered = links.filter(l =>
    !search || l.student?.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.student?.enrollmentNo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-violet-500" />
              Payment Gateway Links
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search student..." className="pl-8 h-8 w-48 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="w-3.5 h-3.5" /> Generate Link
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total Links', value: links.length, color: 'text-violet-600' },
              { label: 'Active', value: links.filter(l => l.status === 'active').length, color: 'text-blue-600' },
              { label: 'Paid', value: links.filter(l => l.status === 'paid').length, color: 'text-emerald-600' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/30 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <QrCode className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No payment links generated yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filtered.map(link => (
                <div key={link.id} className="flex items-center justify-between p-3.5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
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
                      <div className="font-bold text-violet-600">₹{link.amount.toLocaleString()}</div>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => copyLink(link)} title="Copy link">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => { setSelectedLink(link); setQrOpen(true); }} title="Show QR">
                      <QrCode className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => window.open(link.paymentUrl, '_blank')} title="Open link">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Link Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Generate Payment Link</DialogTitle></DialogHeader>
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
                        {s.title} — ₹{s.amount.toLocaleString()} (Due: {new Date(s.dueDate).toLocaleDateString('en-IN')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Amount (₹) <span className="text-rose-500">*</span></Label>
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
              <Button onClick={handleCreate} disabled={creating} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
                <Link2 className="w-4 h-4" /> {creating ? 'Generating...' : 'Generate Link'}
              </Button>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Payment QR Code</DialogTitle></DialogHeader>
          {selectedLink && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="font-semibold">{selectedLink.student?.name}</div>
                <div className="text-2xl font-bold text-violet-600 mt-1">₹{selectedLink.amount.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">{selectedLink.description}</div>
              </div>
              <QRDisplay value={selectedLink.paymentUrl} />
              <div className="flex gap-2">
                <Button className="flex-1 gap-1.5" variant="outline" onClick={() => copyLink(selectedLink)}>
                  <Copy className="w-4 h-4" /> Copy Link
                </Button>
                <Button className="flex-1 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => window.open(selectedLink.paymentUrl, '_blank')}>
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
