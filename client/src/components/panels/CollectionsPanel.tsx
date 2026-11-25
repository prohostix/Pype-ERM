import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  CheckCircle2, 
  UserPlus, 
  Trash2, 
  ShieldAlert, 
  Bell, 
  MessageSquare, 
  Check, 
  Edit,
  Search
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

import { CS, numLocale } from '@/lib/currency';
import { useAuth } from '@/hooks/useAuth';
import { mayOn } from '@/lib/access';
import { Allowed } from '@/components/ui/allowed';
export function CollectionsPanel() {
  const { user } = useAuth();
  // The role decides unless an Org Admin has set something for this user (the server enforces it)
  const mayEdit = mayOn(user, 'collections', 'edit', true);
  const maySend = mayOn(user, 'collections', 'send', true);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [activePanelTab, setActivePanelTab] = useState<'overview' | 'students' | 'overseers'>('overview');
  
  // Metrics state
  const [metrics, setMetrics] = useState<any>(null);
  const [overseers, setOverseers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [overseerLoading, setOverseerLoading] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Remarks modal state
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [remarksText, setRemarksText] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/collections/metrics');
      if (res.data.success) {
        setMetrics(res.data.data);
        setHasAccess(true);
        // Load overseers if user is admin
        if (res.data.data?.currentUserOversight?.isAdmin) {
          fetchOverseers();
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 403) {
        setHasAccess(false);
      } else {
        toast.error('Failed to load collections metrics');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOverseers = async () => {
    try {
      const res = await api.get('/collections/overseers');
      if (res.data.success) {
        setOverseers(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add multiple overseers at once
  const handleAddOverseers = async () => {
    if (selectedUserIds.size === 0) {
      toast.error('Please select at least one user');
      return;
    }
    setOverseerLoading(true);
    let addedCount = 0;
    let failedCount = 0;
    for (const userId of selectedUserIds) {
      try {
        await api.post('/collections/overseers', { userId });
        addedCount++;
      } catch {
        failedCount++;
      }
    }
    setOverseerLoading(false);
    setSelectedUserIds(new Set());
    fetchOverseers();
    if (failedCount === 0) {
      toast.success(`${addedCount} agent${addedCount !== 1 ? 's' : ''} granted collection access`);
    } else {
      toast.warning(`${addedCount} added, ${failedCount} failed (already assigned?)`);
    }
  };

  const handleRemoveOverseer = async (userId: string) => {
    try {
      const res = await api.delete(`/collections/overseers/${userId}`) as any;
      if (res?.data?.success) {
        toast.success('User removed from overseers list');
        fetchOverseers();
      }
    } catch (err) {
      toast.error('Failed to remove overseer');
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleMarkPaid = async (sc: any) => {
    try {
      await api.put(`/payment-schedules/${sc.id}`, { status: 'paid' });
      toast.success('Installment marked as settled successfully');
      fetchMetrics();
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
      toast.success('Collection remarks updated');
      setRemarkDialogOpen(false);
      fetchMetrics();
    } catch (err) {
      toast.error('Failed to update remarks');
    }
  };

  const handleSendNotification = async (sc: any) => {
    try {
      await api.post(`/students/${sc.studentId}/notify`, {
        title: 'Outstanding Installment Reminder',
        message: `Dear ${sc.student?.name || 'Student'},\n\nThis is a reminder regarding your scheduled payment of ${CS()}${sc.amount.toLocaleString('en-IN')} which was due on ${new Date(sc.dueDate).toLocaleDateString('en-IN')}. Please complete the payment at the earliest.\n\nThank you,\nCollections Desk`,
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
    const message = `Hello ${sc.student?.name}, this is a reminder regarding your payment installment of ${CS()}${sc.amount.toLocaleString('en-IN')} which was due on ${new Date(sc.dueDate).toLocaleDateString('en-IN')}. Please arrange to clear this amount. Thank you!`;
    const url = `https://wa.me/${cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <Card className="max-w-md mx-auto mt-12 border-destructive/20 bg-destructive/5 text-center p-8">
        <CardHeader className="flex flex-col items-center">
          <ShieldAlert className="w-16 h-16 text-destructive mb-2" />
          <CardTitle className="text-xl">Access Denied</CardTitle>
          <CardDescription className="mt-2 text-sm text-muted-foreground">
            You do not have permission to oversee collections. Please ask an administrator to assign you to the Collections Panel.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Overseers already added (by ID)
  const overseerIds = new Set(overseers.map((o: any) => o.id));

  // Filter org users — exclude already-assigned overseers, apply search
  const filteredUsers = (metrics?.orgUsers || []).filter((u: any) =>
    !overseerIds.has(u.id) && (
      u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchUserQuery.toLowerCase())
    )
  );

  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every((u: any) => selectedUserIds.has(u.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedUserIds(prev => {
        const next = new Set(prev);
        filteredUsers.forEach((u: any) => next.delete(u.id));
        return next;
      });
    } else {
      setSelectedUserIds(prev => {
        const next = new Set(prev);
        filteredUsers.forEach((u: any) => next.add(u.id));
        return next;
      });
    }
  };

  return (
    <div className="space-y-6 wizard-form animate-in fade-in duration-500">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Collections Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-2xl">Monitor outstanding receivables, follow up on pending student installments, and log collections activity.</p>
        </div>
        <Button variant="outline" onClick={fetchMetrics} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          Refresh Data
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 scrollbar-none rounded-3xl bg-white border border-slate-100 p-2 w-fit max-w-full">
        <button
          onClick={() => setActivePanelTab('overview')}
          className={cn(
            "py-2.5 px-5 text-sm font-semibold rounded-full transition-colors whitespace-nowrap",
            activePanelTab === 'overview' ? "bg-[#8ae47e] text-[#0b1d14]" : "text-slate-600 hover:bg-[#eaf6e6]"
          )}
        >
          Collections Overview
        </button>
        <button
          onClick={() => setActivePanelTab('students')}
          className={cn(
            "py-2.5 px-5 text-sm font-semibold rounded-full transition-colors whitespace-nowrap",
            activePanelTab === 'students' ? "bg-[#8ae47e] text-[#0b1d14]" : "text-slate-600 hover:bg-[#eaf6e6]"
          )}
        >
          Students Status ({metrics?.studentStats?.total || 0})
        </button>
        {metrics?.currentUserOversight?.isAdmin && (
          <button
            onClick={() => setActivePanelTab('overseers')}
            className={cn(
              "py-2.5 px-5 text-sm font-semibold rounded-full transition-colors whitespace-nowrap",
              activePanelTab === 'overseers' ? "bg-[#8ae47e] text-[#0b1d14]" : "text-slate-600 hover:bg-[#eaf6e6]"
            )}
          >
            Collection Agents ({overseers.length})
          </button>
        )}
      </div>

      {/* Panels contents */}
      <div className="space-y-6">
        
        {/* TAB 1: OVERVIEW */}
        {activePanelTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Top Banner: Collection Target */}
            <Card className="bg-[#eaf6e6] border border-[#cfe9c9] shadow-none py-0">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] uppercase font-semibold text-[#256c1d] tracking-wider block mb-1">Collection Target</span>
                    <div className="text-3xl font-semibold tracking-tight text-foreground flex items-baseline gap-2">
                      {CS()}{metrics?.targetStats?.achieved?.toLocaleString(numLocale()) || 0} 
                      <span className="text-sm font-semibold text-muted-foreground">/ {CS()}{metrics?.targetStats?.target?.toLocaleString(numLocale()) || 50000}</span>
                    </div>
                  </div>
                  <div className="flex-1 max-w-md w-full">
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-2">
                      <span>Progress</span>
                      <span className="text-[#256c1d]">{Math.round(((metrics?.targetStats?.achieved || 0) / (metrics?.targetStats?.target || 50000)) * 100)}% Achieved</span>
                    </div>
                    <div className="w-full bg-white h-3 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#54b947] h-full rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${Math.min(100, Math.round(((metrics?.targetStats?.achieved || 0) / (metrics?.targetStats?.target || 50000)) * 100))}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card 
                className="bg-white border border-slate-100 shadow-none hover:-translate-y-0.5 transition-all py-6 gap-4 cursor-pointer hover:ring-1 hover:ring-emerald-500/50 hover:border-emerald-500/50"
                onClick={() => document.getElementById('today-settled')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              >
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <span className="text-[11px] uppercase font-semibold text-slate-500 tracking-wider block">Today's Collections</span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tracking-tight text-[#256c1d]">
                    {CS()}{metrics?.todayCollectingStats?.collectedAmount?.toLocaleString(numLocale()) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics?.todayCollectingStats?.collectedCount || 0} installments collected
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="bg-white border border-slate-100 shadow-none hover:-translate-y-0.5 transition-all py-6 gap-4 cursor-pointer hover:ring-1 hover:ring-primary/50 hover:border-primary/50"
                onClick={() => document.getElementById('expected-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <span className="text-[11px] uppercase font-semibold text-slate-500 tracking-wider block">Pending Collections</span>
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tracking-tight text-[#256c1d]">
                    {CS()}{metrics?.paymentPendingStats?.outstandingAmount?.toLocaleString(numLocale()) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics?.paymentPendingStats?.pendingSchedulesCount || 0} schedules awaiting payment
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="bg-white border border-slate-100 shadow-none hover:-translate-y-0.5 transition-all py-6 gap-4 cursor-pointer hover:ring-1 hover:ring-amber-500/50 hover:border-amber-500/50"
                onClick={() => document.getElementById('expected-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <span className="text-[11px] uppercase font-semibold text-slate-500 tracking-wider block">Upcoming (7 Days)</span>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-amber-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tracking-tight text-amber-600">
                    {CS()}{metrics?.upcomingStats?.dueAmount?.toLocaleString(numLocale()) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics?.upcomingStats?.dueCount || 0} upcoming installments
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="bg-white border border-slate-100 shadow-none hover:-translate-y-0.5 transition-all py-6 gap-4 cursor-pointer hover:ring-1 hover:ring-destructive/50 hover:border-destructive/50"
                onClick={() => document.getElementById('expected-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <span className="text-[11px] uppercase font-semibold text-slate-500 tracking-wider block">Overdue Amount</span>
                  <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4 text-destructive" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tracking-tight text-red-600">
                    {CS()}{metrics?.paymentPendingStats?.overdueAmount?.toLocaleString(numLocale()) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    Critical attention required
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Today's Action Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Today Collected */}
              <Card id="today-settled" className="bg-white border border-slate-100 shadow-none flex flex-col scroll-mt-24 py-6 gap-4">
                <CardHeader className="border-b border-slate-100 pb-5">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> 
                      Settled Today
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      {CS()}{(metrics?.todayCollectingStats?.collectedAmount || 0).toLocaleString(numLocale())}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar px-6">
                    {metrics?.todayCollectingStats?.collectedSchedules?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                        <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] flex items-center justify-center mb-3">
                          <CheckCircle2 className="w-6 h-6 text-[#256c1d]" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No Collections Yet</p>
                        <p className="text-xs text-muted-foreground mt-1">No payments have been recorded for today.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {metrics?.todayCollectingStats?.collectedSchedules?.map((sc: any) => (
                          <div key={sc.id} className="group flex justify-between items-center p-3 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#256c1d] font-semibold text-sm">
                                {sc.student?.name?.charAt(0)}
                              </div>
                              <div>
                                <span className="font-semibold text-sm block text-foreground">{sc.student?.name}</span>
                                <span className="text-[11px] text-muted-foreground">{sc.title} • {sc.student?.enrollmentNo}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm block">{CS()}{sc.amount.toLocaleString(numLocale())}</span>
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 mt-1">Settled</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
 
              {/* Today Due */}
              <Card id="today-due" className="bg-white border border-slate-100 shadow-none flex flex-col scroll-mt-24 py-6 gap-4">
                <CardHeader className="border-b border-slate-100 pb-5">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between text-amber-600 dark:text-amber-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" /> 
                      Due Today
                    </div>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      {CS()}{(metrics?.todayCollectingStats?.dueAmount || 0).toLocaleString(numLocale())}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar px-6">
                    {metrics?.todayCollectingStats?.dueSchedules?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                        <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] flex items-center justify-center mb-3">
                          <CheckCircle2 className="w-6 h-6 text-[#256c1d]" />
                        </div>
                        <p className="text-sm font-medium text-foreground">All Clear</p>
                        <p className="text-xs text-muted-foreground mt-1">No pending installments scheduled for today.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {metrics?.todayCollectingStats?.dueSchedules?.map((sc: any) => (
                          <div key={sc.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-amber-600 font-semibold text-sm">
                                {sc.student?.name?.charAt(0)}
                              </div>
                              <div>
                                <span className="font-semibold text-sm block text-foreground">{sc.student?.name}</span>
                                <span className="text-[11px] text-muted-foreground">{sc.title} • {sc.student?.enrollmentNo}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4">
                              <span className="font-bold text-amber-600 text-sm">{CS()}{sc.amount.toLocaleString(numLocale())}</span>
                              <div className="flex gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Allowed when={maySend}><Button variant="secondary" size="icon" className="w-8 h-8 rounded-full hover:bg-amber-500/10 hover:text-amber-600" onClick={() => handleSendNotification(sc)} title="System Reminder">
                                  <Bell className="w-3.5 h-3.5" />
                                </Button></Allowed>
                                <Allowed when={mayEdit}><Button variant="secondary" size="icon" className="w-8 h-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-600" onClick={() => handleMarkPaid(sc)} title="Mark Settled">
                                  <Check className="w-3.5 h-3.5" />
                                </Button></Allowed>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming & Overdue List */}
            <Card id="expected-list" className="bg-white border border-slate-100 shadow-none scroll-mt-24 py-6">
              <CardHeader>
                <CardTitle className="text-base">Expected & Overdue Payments List</CardTitle>
                <CardDescription>Comprehensive timeline of all outstanding receivables</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics?.expectedPaymentsStats?.overdueSchedules?.length === 0 && 
                 metrics?.upcomingStats?.schedules?.length === 0 && 
                 metrics?.expectedPaymentsStats?.pendingSchedules?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No outstanding dues in the system.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-[#f4f6f3] text-xs font-semibold text-slate-500 uppercase tracking-wider [&>th:first-child]:rounded-l-2xl [&>th:last-child]:rounded-r-2xl">
                          <th className="py-3.5 px-4">Student & Details</th>
                          <th className="py-3.5 px-4">Milestone</th>
                          <th className="py-3.5 px-4">Amount</th>
                          <th className="py-3.5 px-4">Due Date</th>
                          <th className="py-3.5 px-4">Remarks</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* Overdue */}
                        {metrics?.expectedPaymentsStats?.overdueSchedules?.map((sc: any) => (
                          <tr key={sc.id} className="hover:bg-[#f7faf6]">
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-slate-900 block">{sc.student?.name}</span>
                              <span className="text-[10px] text-muted-foreground">{sc.student?.enrollmentNo}</span>
                            </td>
                            <td className="py-3.5 px-4">{sc.title}</td>
                            <td className="py-3.5 px-4 font-semibold text-rose-500">{CS()}{sc.amount.toLocaleString(numLocale())}</td>
                            <td className="py-3.5 px-4 text-destructive font-semibold">
                              {new Date(sc.dueDate).toLocaleDateString()}
                              <span className="text-[9px] uppercase font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full ml-1.5">Overdue</span>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-muted-foreground truncate max-w-[150px]">{sc.remarks || '-'}</td>
                            <td className="py-3.5 px-4">
                              <span className="rounded-full bg-red-100 text-red-700 px-3 py-1 text-[11px] font-semibold">Overdue</span>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                              <Allowed when={maySend}><Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6]" onClick={() => handleSendNotification(sc)} title="System Notify">
                                <Bell className="w-3.5 h-3.5 text-amber-500" />
                              </Button></Allowed>
                              <Allowed when={maySend}><Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6]" onClick={() => handleSendWhatsApp(sc)} title="WhatsApp Notify">
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                              </Button></Allowed>
                              <Allowed when={mayEdit}><Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6]" onClick={() => handleMarkPaid(sc)} title="Settle">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              </Button></Allowed>
                              <Allowed when={mayEdit}><Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6]" onClick={() => handleOpenRemarks(sc)} title="Remarks">
                                <Edit className="w-3.5 h-3.5 text-primary" />
                              </Button></Allowed>
                            </td>
                          </tr>
                        ))}

                        {/* Upcoming */}
                        {metrics?.upcomingStats?.schedules?.map((sc: any) => (
                          <tr key={sc.id} className="hover:bg-[#f7faf6]">
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-slate-900 block">{sc.student?.name}</span>
                              <span className="text-[10px] text-muted-foreground">{sc.student?.enrollmentNo}</span>
                            </td>
                            <td className="py-3.5 px-4">{sc.title}</td>
                            <td className="py-3.5 px-4 font-semibold text-amber-600">{CS()}{sc.amount.toLocaleString(numLocale())}</td>
                            <td className="py-3.5 px-4 font-medium text-amber-600">
                              {new Date(sc.dueDate).toLocaleDateString()}
                              <span className="text-[9px] uppercase font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full ml-1.5">Upcoming</span>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-muted-foreground truncate max-w-[150px]">{sc.remarks || '-'}</td>
                            <td className="py-3.5 px-4">
                              <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-[11px] font-semibold">Upcoming</span>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                              <Allowed when={maySend}><Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6]" onClick={() => handleSendNotification(sc)} title="System Notify">
                                <Bell className="w-3.5 h-3.5 text-amber-500" />
                              </Button></Allowed>
                              <Allowed when={mayEdit}><Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6]" onClick={() => handleMarkPaid(sc)} title="Settle">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              </Button></Allowed>
                              <Allowed when={mayEdit}><Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6]" onClick={() => handleOpenRemarks(sc)} title="Remarks">
                                <Edit className="w-3.5 h-3.5 text-primary" />
                              </Button></Allowed>
                            </td>
                          </tr>
                        ))}

                        {/* Future Pending */}
                        {metrics?.expectedPaymentsStats?.pendingSchedules?.map((sc: any) => (
                          <tr key={sc.id} className="hover:bg-[#f7faf6]">
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-slate-900 block">{sc.student?.name}</span>
                              <span className="text-[10px] text-muted-foreground">{sc.student?.enrollmentNo}</span>
                            </td>
                            <td className="py-3.5 px-4">{sc.title}</td>
                            <td className="py-3.5 px-4 font-semibold text-foreground">{CS()}{sc.amount.toLocaleString(numLocale())}</td>
                            <td className="py-3.5 px-4 text-muted-foreground">{new Date(sc.dueDate).toLocaleDateString()}</td>
                            <td className="py-3.5 px-4 text-xs text-muted-foreground truncate max-w-[150px]">{sc.remarks || '-'}</td>
                            <td className="py-3.5 px-4">
                              <span className="rounded-full bg-slate-200/70 text-slate-600 px-3 py-1 text-[11px] font-semibold">Pending</span>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                              <Allowed when={mayEdit}><Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6]" onClick={() => handleMarkPaid(sc)} title="Settle">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              </Button></Allowed>
                              <Allowed when={mayEdit}><Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6]" onClick={() => handleOpenRemarks(sc)} title="Remarks">
                                <Edit className="w-3.5 h-3.5 text-primary" />
                              </Button></Allowed>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: STUDENTS STATUS */}
        {activePanelTab === 'students' && (
          <div className="space-y-6">
            
            {/* Student Counts grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white border border-slate-100 shadow-none text-center py-5">
                <span className="text-[11px] uppercase font-semibold text-slate-500 tracking-wider block">Total Enrolled</span>
                <span className="text-3xl font-semibold tracking-tight text-foreground mt-1">{metrics?.studentStats?.total || 0}</span>
              </Card>
              <Card className="bg-white border border-slate-100 shadow-none text-center py-5">
                <span className="text-[10px] uppercase font-bold text-[#256c1d] tracking-wider block">Active</span>
                <span className="text-3xl font-semibold tracking-tight text-[#256c1d] mt-1">{metrics?.studentStats?.statusCounts?.active || 0}</span>
              </Card>
              <Card className="bg-white border border-slate-100 shadow-none text-center py-5">
                <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider block">Pending Review</span>
                <span className="text-3xl font-semibold tracking-tight text-amber-500 mt-1">{metrics?.studentStats?.statusCounts?.pending || 0}</span>
              </Card>
              <Card className="bg-white border border-slate-100 shadow-none text-center py-5">
                <span className="text-[11px] uppercase font-semibold text-slate-500 tracking-wider block">Inactive / Suspended</span>
                <span className="text-3xl font-semibold tracking-tight text-muted-foreground mt-1">{metrics?.studentStats?.statusCounts?.inactive || 0}</span>
              </Card>
            </div>

            {/* Students List Table */}
            <Card className="bg-white border border-slate-100 shadow-none py-6">
              <CardHeader>
                <CardTitle className="text-base">Students Enrollment Status Directory</CardTitle>
                <CardDescription>View status of academic students in this organization</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics?.studentStats?.total === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No student records found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-[#f4f6f3] text-xs font-semibold text-slate-500 uppercase tracking-wider [&>th:first-child]:rounded-l-2xl [&>th:last-child]:rounded-r-2xl">
                          <th className="py-3.5 px-4">Student Name & Enrollment</th>
                          <th className="py-3.5 px-4">Student Contact</th>
                          <th className="py-3.5 px-4">Father Details</th>
                          <th className="py-3.5 px-4">Mother Details</th>
                          <th className="py-3.5 px-4">Admission Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {metrics?.studentStats?.total > 0 && (
                          (() => {
                            const uniqueStudents = metrics?.studentStats?.students || [];
                            
                            if (uniqueStudents.length === 0) {
                              return <tr><td colSpan={5} className="text-center py-4 text-muted-foreground text-xs">No student database logs linked</td></tr>;
                            }
                            
                            return uniqueStudents.map((st: any) => (
                              <tr key={st.id} className="hover:bg-[#f7faf6]">
                                <td className="py-3.5 px-4">
                                  <span className="font-semibold text-slate-900 block">{st.name}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">ENR: {st.enrollmentNo || 'N/A'}</span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="text-xs font-medium text-foreground block">{st.phone || 'N/A'}</span>
                                  <span className="text-[10px] text-muted-foreground block">{st.email}</span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="text-xs font-semibold text-foreground block">{st.fatherName || 'N/A'}</span>
                                  <span className="text-[10px] text-muted-foreground block">{st.fatherPhone || '-'}</span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="text-xs font-semibold text-foreground block">{st.motherName || 'N/A'}</span>
                                  <span className="text-[10px] text-muted-foreground block">{st.motherPhone || '-'}</span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <Badge 
                                    variant={
                                      st.status === 'active' || st.status === 'ACTIVE' ? 'default' : 
                                      st.status === 'pending' || st.status === 'PENDING' ? 'outline' : 'secondary'
                                    }
                                    className={cn(
                                      (st.status === 'active' || st.status === 'ACTIVE') && 'bg-[#dff3da] text-[#256c1d] border-none hover:bg-[#dff3da]'
                                    )}
                                  >
                                    {st.status || 'Active'}
                                  </Badge>
                                </td>
                              </tr>
                            ));
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: COLLECTION AGENTS (MULTI-SELECT) */}
        {activePanelTab === 'overseers' && metrics?.currentUserOversight?.isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            
            {/* LEFT: Add agents panel */}
            <Card className="bg-white border border-slate-100 shadow-none py-6 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#256c1d]" /> Add Collection Agents
                </CardTitle>
                <CardDescription>Select one or more users to grant access to the Collections Dashboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email or role..."
                    className="pl-9 h-11 rounded-full"
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                  />
                </div>

                {/* Select All toggle */}
                {filteredUsers.length > 0 && (
                  <div className="flex items-center justify-between px-1">
                    <button
                      onClick={toggleSelectAll}
                      className="text-xs text-[#256c1d] hover:underline font-semibold"
                    >
                      {allFilteredSelected ? 'Deselect All' : `Select All (${filteredUsers.length})`}
                    </button>
                    {selectedUserIds.size > 0 && (
                      <span className="text-xs text-muted-foreground">{selectedUserIds.size} selected</span>
                    )}
                  </div>
                )}

                {/* User checkbox list */}
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {filteredUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-5">
                      {searchUserQuery ? 'No users match your search.' : 'All users are already agents.'}
                    </p>
                  ) : (
                    filteredUsers.map((u: any) => {
                      const isChecked = selectedUserIds.has(u.id);
                      return (
                        <label
                          key={u.id}
                          htmlFor={`agent-${u.id}`}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-colors",
                            isChecked
                              ? "border-[#8ae47e] bg-[#eaf6e6]"
                              : "border-transparent bg-[#f4f6f3] hover:bg-[#eef5ec]"
                          )}
                        >
                          <input
                            id={`agent-${u.id}`}
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleUserSelection(u.id)}
                            className="w-4 h-4 accent-primary rounded"
                          />
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xs uppercase flex-shrink-0">
                            {u.name?.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-sm block truncate">{u.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate block">{u.email} · {u.role}</span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Add button */}
                <Button
                  className="w-full h-11 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"
                  onClick={handleAddOverseers}
                  disabled={overseerLoading || selectedUserIds.size === 0}
                >
                  {overseerLoading
                    ? 'Adding...'
                    : selectedUserIds.size === 0
                      ? 'Select Users to Add'
                      : `Grant Access to ${selectedUserIds.size} Agent${selectedUserIds.size !== 1 ? 's' : ''}`}
                </Button>
              </CardContent>
            </Card>

            {/* RIGHT: Current agents list */}
            <Card className="bg-white border border-slate-100 shadow-none py-6 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-base">Active Collection Agents ({overseers.length})</CardTitle>
                <CardDescription>These users can oversee outstanding dues, upcoming schedules and student statuses</CardDescription>
              </CardHeader>
              <CardContent>
                {overseers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">No agents assigned yet. Admins have access by default.</div>
                ) : (
                  <div className="space-y-2.5">
                    {overseers.map((ov: any) => (
                      <div key={ov.id} className="flex justify-between items-center p-3.5 rounded-2xl bg-[#f4f6f3]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center font-semibold text-[#256c1d] text-sm uppercase">
                            {ov.name?.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-sm block">{ov.name}</span>
                            <span className="text-[10px] text-muted-foreground">{ov.email} · {ov.role}</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleRemoveOverseer(ov.id)}
                          title="Remove agent"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Remarks logger dialog */}
      <Dialog open={remarkDialogOpen} onOpenChange={setRemarkDialogOpen}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Log Dues Follow-up Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Student Name</Label>
              <Input value={selectedSchedule?.student?.name || ''} disabled />
            </div>
            <div>
              <Label>Due Milestone</Label>
              <Input value={`${selectedSchedule?.title} (${CS()}${selectedSchedule?.amount?.toLocaleString(numLocale())})`} disabled />
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
              <Allowed when={mayEdit}><Button onClick={handleSaveRemarks} className="flex-1 h-11 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">Update Notes</Button></Allowed>
              <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setRemarkDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
