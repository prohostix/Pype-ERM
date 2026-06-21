import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Bell, MessageSquare, Check, AlertCircle, Edit } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export function CollectionsPanel() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [remarksText, setRemarksText] = useState('');

  // Stats KPIs
  const [kpis, setKpis] = useState({
    totalOutstanding: 0,
    totalOverdue: 0,
    totalCollected: 0,
    activeCount: 0
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payment-schedules');
      const data = res.data.data || [];
      setSchedules(data);
      calculateKpis(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load collections records');
    } finally {
      setLoading(false);
    }
  };

  const calculateKpis = (data: any[]) => {
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let totalCollected = 0;
    let activeCount = 0;

    const now = new Date();

    data.forEach(s => {
      const isPaid = s.status === 'paid';
      const isOverdue = !isPaid && new Date(s.dueDate) < now;

      if (isPaid) {
        totalCollected += s.amount;
      } else {
        totalOutstanding += s.amount;
        activeCount++;
        if (isOverdue) {
          totalOverdue += s.amount;
        }
      }
    });

    setKpis({
      totalOutstanding,
      totalOverdue,
      totalCollected,
      activeCount
    });
  };

  const handleMarkPaid = async (sc: any) => {
    try {
      await api.put(`/payment-schedules/${sc.id}`, { status: 'paid' });
      toast.success('Installment marked as settled successfully');
      fetchSchedules();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleOpenRemarks = (sc: any) => {
    setSelectedSchedule(sc);
    setRemarksText(sc.remarks || '');
    setRemarkDialogOpen(true);
  };

  const handleSaveRemarks = async () => {
    try {
      await api.put(`/payment-schedules/${selectedSchedule.id}`, { remarks: remarksText });
      toast.success('Collection follow-up remarks updated');
      setRemarkDialogOpen(false);
      fetchSchedules();
    } catch (err) {
      toast.error('Failed to update remarks');
    }
  };

  const handleSendNotification = async (sc: any) => {
    try {
      await api.post(`/students/${sc.studentId}/notify`, {
        title: 'Outstanding Installment Reminder',
        message: `Dear ${sc.student?.name || 'Student'},\n\nThis is a reminder from the Collections Desk regarding your scheduled payment of ₹${sc.amount} for "${sc.title}" which was due on ${new Date(sc.dueDate).toLocaleDateString()}. Please complete the payment at the earliest.\n\nThank you,\nCollections Desk`,
        type: 'fee_reminder'
      });
      toast.success('Fee reminder system notification sent');
    } catch (err) {
      toast.error('Failed to send notification');
    }
  };

  const handleSendWhatsApp = (sc: any) => {
    const phone = sc.student?.phone;
    if (!phone) {
      toast.error('No phone number configured for this student');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = `Hello ${sc.student?.name}, this is a reminder from Pype ERM Collections regarding your payment installment of ₹${sc.amount} for "${sc.title}" which was due on ${new Date(sc.dueDate).toLocaleDateString()}. Please arrange to clear this amount. Thank you!`;
    const url = `https://wa.me/${cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const now = new Date();
  const filteredSchedules = schedules.filter(s => {
    const isPaid = s.status === 'paid';
    const isOverdue = !isPaid && new Date(s.dueDate) < now;

    if (activeTab === 'pending') return s.status === 'pending' && !isOverdue;
    if (activeTab === 'overdue') return isOverdue;
    if (activeTab === 'paid') return isPaid;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Collections Dashboard</h2>
        <p className="text-muted-foreground text-sm">Monitor outstanding receivables, follow up on pending student installments, and log collections activity</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Outstanding Dues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">₹{kpis.totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{kpis.activeCount} active milestones</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Overdue Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">₹{kpis.totalOverdue.toLocaleString()}</div>
            <p className="text-xs text-rose-500 flex items-center gap-1 mt-0.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> High priority follow-up
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collected Dues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{kpis.totalCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Cleared installments</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Milestone Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {schedules.length > 0 ? Math.round((kpis.totalCollected / (kpis.totalCollected + kpis.totalOutstanding)) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Ratio of paid to total scheduled</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex gap-1.5">
          <Button variant={activeTab === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('all')}>All ({schedules.length})</Button>
          <Button variant={activeTab === 'pending' ? 'default' : 'ghost'} size="sm" className={activeTab === 'pending' ? '' : 'text-slate-600'} onClick={() => setActiveTab('pending')}>Pending Dues</Button>
          <Button variant={activeTab === 'overdue' ? 'default' : 'ghost'} size="sm" className={activeTab === 'overdue' ? 'bg-rose-600 hover:bg-rose-700' : 'text-rose-600'} onClick={() => setActiveTab('overdue')}>Overdue Dues</Button>
          <Button variant={activeTab === 'paid' ? 'default' : 'ghost'} size="sm" className={activeTab === 'paid' ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-emerald-600'} onClick={() => setActiveTab('paid')}>Paid/Cleared</Button>
        </div>

        <Button variant="outline" size="sm" onClick={fetchSchedules}>Refresh Feed</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Dues & Schedules List</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Fetching database logs...</div>
          ) : filteredSchedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No records found matching current criteria</div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="p-4">Student & Details</th>
                    <th className="p-4">Milestone</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Remarks</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredSchedules.map((sc) => {
                    const isPaid = sc.status === 'paid';
                    const isOverdue = !isPaid && new Date(sc.dueDate) < now;
                    return (
                      <tr key={sc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="p-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{sc.student?.name || 'Unknown student'}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{sc.student?.enrollmentNo} • {sc.student?.email}</div>
                          {sc.student?.phone && (
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" /> {sc.student.phone}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-medium text-slate-700 dark:text-slate-200">{sc.title}</td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">₹{sc.amount.toLocaleString()}</td>
                        <td className="p-4">
                          <div className="font-medium text-slate-700 dark:text-slate-200">{new Date(sc.dueDate).toLocaleDateString()}</div>
                          {isOverdue && <span className="text-[10px] text-rose-500 font-bold uppercase">Overdue</span>}
                        </td>
                        <td className="p-4">
                          <div className="text-xs text-slate-600 dark:text-slate-350 max-w-[200px] truncate" title={sc.remarks}>
                            {sc.remarks || <span className="text-slate-400 italic">No notes</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={isPaid ? 'default' : 'secondary'} className={isPaid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : isOverdue ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-450' : ''}>
                            {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {!isPaid && (
                              <>
                                {/* Dispatch fee reminder */}
                                <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => handleSendNotification(sc)} title="System Reminder">
                                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                                </Button>

                                {/* WhatsApp click to chat */}
                                <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => handleSendWhatsApp(sc)} title="WhatsApp Reminder">
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                                </Button>

                                {/* Settled checkbox */}
                                <Button variant="outline" size="icon" className="w-7 h-7 hover:bg-emerald-50 hover:text-emerald-600" onClick={() => handleMarkPaid(sc)} title="Settle Installment">
                                  <Check className="w-3.5 h-3.5 text-slate-500" />
                                </Button>
                              </>
                            )}

                            {/* Remarks logger */}
                            <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => handleOpenRemarks(sc)} title="Log Remarks/Notes">
                              <Edit className="w-3.5 h-3.5 text-indigo-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remarks logger dialog */}
      <Dialog open={remarkDialogOpen} onOpenChange={setRemarkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Dues Follow-up Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Student Name</Label>
              <Input value={selectedSchedule?.student?.name || ''} disabled />
            </div>
            <div>
              <Label>Due Milestone</Label>
              <Input value={`${selectedSchedule?.title} (₹${selectedSchedule?.amount})`} disabled />
            </div>
            <div>
              <Label>Follow-up Remarks</Label>
              <Textarea
                rows={4}
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
                placeholder="e.g. Student promised to pay by coming Friday; cash collection scheduled."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveRemarks} className="flex-1">Update Notes</Button>
              <Button variant="outline" onClick={() => setRemarkDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
