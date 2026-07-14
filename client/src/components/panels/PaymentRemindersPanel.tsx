import { useState, useEffect } from 'react';
import { Bell, Send, AlertTriangle, Clock, CheckCircle, Filter, Users, Mail, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';

export function PaymentRemindersPanel() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [closingDate, setClosingDate] = useState('');
  const [subject, setSubject] = useState('Fee Payment Reminder — Action Required');
  const [message, setMessage] = useState(
    `Dear {name},\n\nThis is a reminder that your payment of {amount} is due on {dueDate}.\n\nPlease ensure timely payment to avoid penalties.\n\nIf you have any queries, contact the finance department.\n\nRegards,\nFinance Department`
  );

  useEffect(() => { fetchSchedules(); }, [filter]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/finance/reminders/schedules?filter=${filter}`);
      setSchedules(res.data.data || []);
    } catch { toast.error('Failed to load payment schedules'); }
    finally { setLoading(false); }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelected(selected.length === schedules.length ? [] : schedules.map(s => s.id));
  };

  const handleSendReminders = async () => {
    if (!selected.length) { toast.error('Select at least one schedule'); return; }
    setSending(true);
    try {
      const res = await api.post('/finance/reminders/send', {
        scheduleIds: selected,
        subject,
        message,
        closingDate
      });
      toast.success(res.data.message);
      setReminderOpen(false);
      setSelected([]);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to send reminders');
    } finally { setSending(false); }
  };

  const statusBadge = (s: any) => {
    if (s.isOverdue) return <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">Overdue</Badge>;
    const days = Math.ceil((new Date(s.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Due in {days}d</Badge>;
    return <Badge variant="outline">Upcoming</Badge>;
  };

  const filterStats = {
    all: schedules.length,
    overdue: schedules.filter(s => s.isOverdue).length,
    week: schedules.filter(s => !s.isOverdue && Math.ceil((new Date(s.dueDate).getTime() - Date.now()) / 86400000) <= 7).length,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Payment Reminders
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-44 h-8 text-sm">
                  <Filter className="w-3.5 h-3.5 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pending</SelectItem>
                  <SelectItem value="overdue">Overdue Only</SelectItem>
                  <SelectItem value="week">Due This Week</SelectItem>
                  <SelectItem value="month">Due This Month</SelectItem>
                </SelectContent>
              </Select>
              {selected.length > 0 && (
                <Button size="sm" onClick={() => setReminderOpen(true)} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                  <Send className="w-3.5 h-3.5" /> Send to {selected.length}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Total Pending', value: filterStats.all, icon: <Clock className="w-4 h-4" />, color: 'text-blue-600' },
              { label: 'Overdue', value: filterStats.overdue, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-rose-600' },
              { label: 'Due This Week', value: filterStats.week, icon: <Calendar className="w-4 h-4" />, color: 'text-amber-600' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-3 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/30">
                <span className={stat.color}>{stat.icon}</span>
                <div>
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Select All */}
          {schedules.length > 0 && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b">
              <input type="checkbox" checked={selected.length === schedules.length && schedules.length > 0}
                onChange={selectAll} className="w-4 h-4 rounded" />
              <span className="text-sm text-muted-foreground">Select all ({schedules.length})</span>
              {selected.length > 0 && <span className="text-sm font-medium text-primary">{selected.length} selected</span>}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading schedules...</div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
              <p>No pending payment schedules</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {schedules.map(s => (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 p-3.5 border rounded-xl transition-colors cursor-pointer
                    ${selected.includes(s.id) ? 'bg-primary/5 border-primary/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}
                    ${s.isOverdue ? 'border-rose-200 dark:border-rose-800/30' : ''}`}
                  onClick={() => toggleSelect(s.id)}
                >
                  <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleSelect(s.id)}
                    className="w-4 h-4 rounded" onClick={e => e.stopPropagation()} />
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{s.student?.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Mail className="w-3 h-3" /> {s.student?.email}
                      <span>•</span> {s.student?.program?.name || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.title}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm">₹{s.amount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{new Date(s.dueDate).toLocaleDateString('en-IN')}</div>
                    <div className="mt-1">{statusBadge(s)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compose Reminder Dialog */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compose Payment Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-sm text-amber-800 dark:text-amber-300">
              Will be sent to <strong>{selected.length}</strong> students. Use <code>{'{name}'}</code>, <code>{'{amount}'}</code>, <code>{'{dueDate}'}</code>, <code>{'{closingDate}'}</code> as placeholders.
            </div>
            <div>
              <Label>University Closing Date (optional)</Label>
              <Input type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} />
            </div>
            <div>
              <Label>Email Subject</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div>
              <Label>Message Body</Label>
              <Textarea rows={8} value={message} onChange={e => setMessage(e.target.value)} className="text-sm font-mono" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSendReminders} disabled={sending} className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                <Send className="w-4 h-4" /> {sending ? 'Sending...' : `Send Reminders (${selected.length})`}
              </Button>
              <Button variant="outline" onClick={() => setReminderOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
