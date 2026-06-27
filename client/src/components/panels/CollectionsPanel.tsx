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

export function CollectionsPanel() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [activePanelTab, setActivePanelTab] = useState<'overview' | 'students' | 'overseers'>('overview');
  
  // Metrics state
  const [metrics, setMetrics] = useState<any>(null);
  const [overseers, setOverseers] = useState<any[]>([]);
  const [selectedUserForOverseer, setSelectedUserForOverseer] = useState('');
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

  const handleAddOverseer = async () => {
    if (!selectedUserForOverseer) {
      toast.error('Please select a user');
      return;
    }
    setOverseerLoading(true);
    try {
      const res = await api.post('/collections/overseers', { userId: selectedUserForOverseer });
      if (res.data.success) {
        toast.success('User added successfully to overseers list');
        setSelectedUserForOverseer('');
        fetchOverseers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add overseer');
    } finally {
      setOverseerLoading(false);
    }
  };

  const handleRemoveOverseer = async (userId: string) => {
    try {
      const res = await api.delete(`/collections/overseers/${userId}`);
      if (res.data.success) {
        toast.success('User removed from overseers list');
        fetchOverseers();
      }
    } catch (err) {
      toast.error('Failed to remove overseer');
    }
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
        message: `Dear ${sc.student?.name || 'Student'},\n\nThis is a reminder regarding your scheduled payment of ₹${sc.amount.toLocaleString('en-IN')} which was due on ${new Date(sc.dueDate).toLocaleDateString('en-IN')}. Please complete the payment at the earliest.\n\nThank you,\nCollections Desk`,
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
    const message = `Hello ${sc.student?.name}, this is a reminder regarding your payment installment of ₹${sc.amount.toLocaleString('en-IN')} which was due on ${new Date(sc.dueDate).toLocaleDateString('en-IN')}. Please arrange to clear this amount. Thank you!`;
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

  // Filter org users by query
  const filteredUsers = (metrics?.orgUsers || []).filter((u: any) => 
    u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Collections Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-1">Monitor outstanding receivables, follow up on pending student installments, and log collections activity.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMetrics} className="glass">
          Refresh Data
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto gap-2 scrollbar-none pb-px">
        <button
          onClick={() => setActivePanelTab('overview')}
          className={cn(
            "py-2.5 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
            activePanelTab === 'overview' ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Collections Overview
        </button>
        <button
          onClick={() => setActivePanelTab('students')}
          className={cn(
            "py-2.5 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
            activePanelTab === 'students' ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Students Status ({metrics?.studentStats?.total || 0})
        </button>
        {metrics?.currentUserOversight?.isAdmin && (
          <button
            onClick={() => setActivePanelTab('overseers')}
            className={cn(
              "py-2.5 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
              activePanelTab === 'overseers' ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Designated Overseers ({overseers.length})
          </button>
        )}
      </div>

      {/* Panels contents */}
      <div className="space-y-6">
        
        {/* TAB 1: OVERVIEW */}
        {activePanelTab === 'overview' && (
          <div className="space-y-6">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-none bg-card/65 backdrop-blur-md shadow-md">
                <CardHeader className="pb-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Today Collecting Payment</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${metrics?.todayCollectingStats?.collectedAmount || 0}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {metrics?.todayCollectingStats?.collectedCount || 0} installments collected today
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none bg-card/65 backdrop-blur-md shadow-md">
                <CardHeader className="pb-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Payment Pending Status</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    ${metrics?.paymentPendingStats?.outstandingAmount || 0}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {metrics?.paymentPendingStats?.pendingSchedulesCount || 0} schedules awaiting payment
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none bg-card/65 backdrop-blur-md shadow-md">
                <CardHeader className="pb-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Upcoming Payments (7 Days)</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">
                    ${metrics?.upcomingStats?.dueAmount || 0}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {metrics?.upcomingStats?.dueCount || 0} upcoming installments
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none bg-card/65 backdrop-blur-md shadow-md">
                <CardHeader className="pb-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Expected Payments (Outstanding)</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    ${metrics?.paymentPendingStats?.outstandingAmount || 0}
                  </div>
                  <p className="text-[10px] text-destructive mt-1 font-semibold">
                    Includes ${metrics?.paymentPendingStats?.overdueAmount || 0} Overdue dues
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Today's Collections Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Today Collected */}
              <Card className="border-none bg-card/65 backdrop-blur-md shadow-md">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" /> Today's Collected Dues (${metrics?.todayCollectingStats?.collectedAmount || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics?.todayCollectingStats?.collectedSchedules?.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">No payments received today.</div>
                  ) : (
                    <div className="space-y-3">
                      {metrics?.todayCollectingStats?.collectedSchedules?.map((sc: any) => (
                        <div key={sc.id} className="flex justify-between items-center p-3 rounded-lg border border-emerald-500/10 bg-emerald-500/5">
                          <div>
                            <span className="font-bold text-sm block">{sc.student?.name}</span>
                            <span className="text-[10px] text-muted-foreground">{sc.title} • {sc.student?.enrollmentNo}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm block">₹{sc.amount.toLocaleString('en-IN')}</span>
                            <span className="text-[9px] text-muted-foreground">Settled</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
 
              {/* Today Due */}
              <Card className="border-none bg-card/65 backdrop-blur-md shadow-md">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-amber-500">
                    <Clock className="w-5 h-5" /> Today's Due Installments (₹{(metrics?.todayCollectingStats?.dueAmount || 0).toLocaleString('en-IN')})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics?.todayCollectingStats?.dueSchedules?.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">No installments scheduled for today.</div>
                  ) : (
                    <div className="space-y-3">
                      {metrics?.todayCollectingStats?.dueSchedules?.map((sc: any) => (
                        <div key={sc.id} className="flex justify-between items-center p-3 rounded-lg border border-amber-500/10 bg-amber-500/5">
                          <div>
                            <span className="font-bold text-sm block">{sc.student?.name}</span>
                            <span className="text-[10px] text-muted-foreground">{sc.title} • {sc.student?.enrollmentNo}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-amber-600 text-sm">₹{sc.amount.toLocaleString('en-IN')}</span>
                            <div className="flex gap-1">
                              <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => handleSendNotification(sc)}>
                                <Bell className="w-3.5 h-3.5 text-amber-500" />
                              </Button>
                              <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => handleMarkPaid(sc)}>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Upcoming & Overdue List */}
            <Card className="border-none bg-card/65 backdrop-blur-md shadow-md">
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
                        <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <th className="pb-3 pr-4">Student & Details</th>
                          <th className="pb-3 px-4">Milestone</th>
                          <th className="pb-3 px-4">Amount</th>
                          <th className="pb-3 px-4">Due Date</th>
                          <th className="pb-3 px-4">Remarks</th>
                          <th className="pb-3 px-4">Status</th>
                          <th className="pb-3 pl-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {/* Overdue */}
                        {metrics?.expectedPaymentsStats?.overdueSchedules?.map((sc: any) => (
                          <tr key={sc.id} className="hover:bg-background/20">
                            <td className="py-3 px-4 pl-0">
                              <span className="font-bold text-foreground block">{sc.student?.name}</span>
                              <span className="text-[10px] text-muted-foreground">{sc.student?.enrollmentNo}</span>
                            </td>
                            <td className="py-3 px-4">{sc.title}</td>
                            <td className="py-3 px-4 font-semibold text-rose-500">₹{sc.amount.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-destructive font-semibold">
                              {new Date(sc.dueDate).toLocaleDateString()}
                              <span className="text-[9px] uppercase font-bold text-destructive bg-destructive/10 px-1 rounded ml-1.5">Overdue</span>
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground truncate max-w-[150px]">{sc.remarks || '-'}</td>
                            <td className="py-3 px-4">
                              <Badge variant="destructive">Overdue</Badge>
                            </td>
                            <td className="py-3 pl-4 text-right space-x-1.5 whitespace-nowrap">
                              <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => handleSendNotification(sc)} title="System Notify">
                                <Bell className="w-3.5 h-3.5 text-amber-500" />
                              </Button>
                              <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => handleSendWhatsApp(sc)} title="WhatsApp Notify">
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                              </Button>
                              <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => handleMarkPaid(sc)} title="Settle">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              </Button>
                              <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => handleOpenRemarks(sc)} title="Remarks">
                                <Edit className="w-3.5 h-3.5 text-primary" />
                              </Button>
                            </td>
                          </tr>
                        ))}

                        {/* Upcoming */}
                        {metrics?.upcomingStats?.schedules?.map((sc: any) => (
                          <tr key={sc.id} className="hover:bg-background/20">
                            <td className="py-3 px-4 pl-0">
                              <span className="font-bold text-foreground block">{sc.student?.name}</span>
                              <span className="text-[10px] text-muted-foreground">{sc.student?.enrollmentNo}</span>
                            </td>
                            <td className="py-3 px-4">{sc.title}</td>
                            <td className="py-3 px-4 font-semibold text-amber-600">₹{sc.amount.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 font-medium text-amber-600">
                              {new Date(sc.dueDate).toLocaleDateString()}
                              <span className="text-[9px] uppercase font-bold text-amber-600 bg-amber-500/10 px-1 rounded ml-1.5">Upcoming</span>
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground truncate max-w-[150px]">{sc.remarks || '-'}</td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="border-amber-500 text-amber-500">Upcoming</Badge>
                            </td>
                            <td className="py-3 pl-4 text-right space-x-1.5 whitespace-nowrap">
                              <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => handleSendNotification(sc)} title="System Notify">
                                <Bell className="w-3.5 h-3.5 text-amber-500" />
                              </Button>
                              <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => handleMarkPaid(sc)} title="Settle">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              </Button>
                              <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => handleOpenRemarks(sc)} title="Remarks">
                                <Edit className="w-3.5 h-3.5 text-primary" />
                              </Button>
                            </td>
                          </tr>
                        ))}

                        {/* Future Pending */}
                        {metrics?.expectedPaymentsStats?.pendingSchedules?.map((sc: any) => (
                          <tr key={sc.id} className="hover:bg-background/20">
                            <td className="py-3 px-4 pl-0">
                              <span className="font-bold text-foreground block">{sc.student?.name}</span>
                              <span className="text-[10px] text-muted-foreground">{sc.student?.enrollmentNo}</span>
                            </td>
                            <td className="py-3 px-4">{sc.title}</td>
                            <td className="py-3 px-4 font-semibold text-foreground">₹{sc.amount.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-muted-foreground">{new Date(sc.dueDate).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-xs text-muted-foreground truncate max-w-[150px]">{sc.remarks || '-'}</td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary">Pending</Badge>
                            </td>
                            <td className="py-3 pl-4 text-right space-x-1.5 whitespace-nowrap">
                              <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => handleMarkPaid(sc)} title="Settle">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              </Button>
                              <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => handleOpenRemarks(sc)} title="Remarks">
                                <Edit className="w-3.5 h-3.5 text-primary" />
                              </Button>
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
              <Card className="border-none bg-card/65 backdrop-blur-md shadow-md text-center py-4">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Enrolled</span>
                <span className="text-3xl font-extrabold text-foreground mt-1">{metrics?.studentStats?.total || 0}</span>
              </Card>
              <Card className="border-none bg-card/65 backdrop-blur-md shadow-md text-center py-4">
                <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider block">Active</span>
                <span className="text-3xl font-extrabold text-emerald-500 mt-1">{metrics?.studentStats?.statusCounts?.active || 0}</span>
              </Card>
              <Card className="border-none bg-card/65 backdrop-blur-md shadow-md text-center py-4">
                <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider block">Pending Review</span>
                <span className="text-3xl font-extrabold text-amber-500 mt-1">{metrics?.studentStats?.statusCounts?.pending || 0}</span>
              </Card>
              <Card className="border-none bg-card/65 backdrop-blur-md shadow-md text-center py-4">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Inactive / Suspended</span>
                <span className="text-3xl font-extrabold text-muted-foreground mt-1">{metrics?.studentStats?.statusCounts?.inactive || 0}</span>
              </Card>
            </div>

            {/* Students List Table */}
            <Card className="border-none bg-card/65 backdrop-blur-md shadow-md">
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
                        <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <th className="pb-3 pr-4">Student Name</th>
                          <th className="pb-3 px-4">Program</th>
                          <th className="pb-3 px-4">Admission Status</th>
                          <th className="pb-3 px-4">Enrollments Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {metrics?.studentStats?.total > 0 && (
                          (() => {
                            const allSchedules = [
                              ...(metrics?.expectedPaymentsStats?.overdueSchedules || []),
                              ...(metrics?.upcomingStats?.schedules || []),
                              ...(metrics?.expectedPaymentsStats?.pendingSchedules || []),
                              ...(metrics?.todayCollectingStats?.collectedSchedules || []),
                              ...(metrics?.todayCollectingStats?.dueSchedules || [])
                            ];
                            const uniqueStudents = Array.from(new Map(
                              allSchedules.map((s: any) => [s.studentId, s.student])
                            ).values()).filter(Boolean);
                            
                            if (uniqueStudents.length === 0) {
                              return <tr><td colSpan={4} className="text-center py-4 text-muted-foreground text-xs">No student database logs linked</td></tr>;
                            }
                            
                            return uniqueStudents.map((st: any) => (
                              <tr key={st.id} className="hover:bg-background/20">
                                <td className="py-3 pr-4 font-bold text-foreground">{st.name}</td>
                                <td className="py-3 px-4 text-xs font-medium text-muted-foreground">{st.email}</td>
                                <td className="py-3 px-4">
                                  <Badge 
                                    variant="outline" 
                                    className="bg-emerald-500/10 text-emerald-500 border-none hover:bg-emerald-500/20"
                                  >
                                    Active
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 font-semibold">{st.enrollmentNo || 'N/A'}</td>
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

        {/* TAB 3: DESIGNATED OVERSEERS */}
        {activePanelTab === 'overseers' && metrics?.currentUserOversight?.isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Assign Overseers Card */}
            <Card className="border-none bg-card/65 backdrop-blur-md shadow-md lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" /> Assign Oversight Permission
                </CardTitle>
                <CardDescription>Grant designated users access to see this Collections Dashboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs mb-1.5 block">Search & Select User</Label>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Type name or email..." 
                      className="pl-8"
                      value={searchUserQuery}
                      onChange={(e) => setSearchUserQuery(e.target.value)}
                    />
                  </div>
                  
                  <select
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm text-foreground mb-4"
                    value={selectedUserForOverseer}
                    onChange={(e) => setSelectedUserForOverseer(e.target.value)}
                  >
                    <option value="">-- Choose User --</option>
                    {filteredUsers.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role} - {u.email})
                      </option>
                    ))}
                  </select>
                </div>
                
                <Button 
                  className="w-full" 
                  variant="premium" 
                  onClick={handleAddOverseer}
                  disabled={overseerLoading}
                >
                  {overseerLoading ? 'Adding...' : 'Grant Oversight Access'}
                </Button>
              </CardContent>
            </Card>

            {/* Designated Overseers List */}
            <Card className="border-none bg-card/65 backdrop-blur-md shadow-md lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Current Designated Collections Overseers</CardTitle>
                <CardDescription>These users can oversee outstanding dues, upcoming schedules and student statuses</CardDescription>
              </CardHeader>
              <CardContent>
                {overseers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">No designated overseers found. Admins have access by default.</div>
                ) : (
                  <div className="space-y-3">
                    {overseers.map((ov: any) => (
                      <div key={ov.id} className="flex justify-between items-center p-3.5 rounded-xl border border-border bg-background/50">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm uppercase">
                            {ov.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-sm block">{ov.name}</span>
                            <span className="text-[10px] text-muted-foreground">{ov.email} • Role: {ov.role}</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveOverseer(ov.id)}
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
              <Input value={`${selectedSchedule?.title} (₹${selectedSchedule?.amount?.toLocaleString('en-IN')})`} disabled />
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
