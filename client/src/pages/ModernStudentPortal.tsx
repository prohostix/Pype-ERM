import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Bell, 
  CreditCard, 
  Download, 
  FileText, 
  Calendar, 
  User, 
  Award, 
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Printer, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  MessageSquare,
  Video,
  Clock,
  MapPin,
  ExternalLink,
  PlayCircle,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { ModernStaffPortal } from './ModernStaffPortal';
import { toast } from 'sonner';

interface StudentPortalProps {
  onNavigate?: (tab: string) => void;
  initialTab?: string;
}

export function ModernStudentPortal({ initialTab, onNavigate }: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState(!initialTab || initialTab === 'dashboard' ? 'overview' : initialTab);

  useEffect(() => {
    setActiveTab(!initialTab || initialTab === 'dashboard' ? 'overview' : initialTab);
  }, [initialTab]);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate(tab);
  };
  const [loading, setLoading] = useState(true);
  const [isNotStudent, setIsNotStudent] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classFilter, setClassFilter] = useState<'all' | 'upcoming' | 'live' | 'online' | 'offline'>('all');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showPaymentGateway, setShowPaymentGateway] = useState<any>(null); // holds schedule or invoice to pay
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [markingAttendance, setMarkingAttendance] = useState<string | null>(null);

  const handleRegisterAttendance = async (classId: string) => {
    setMarkingAttendance(classId);
    try {
      const res = await api.post(`/student-portal/classes/${classId}/attendance`);
      if (res.data.success) {
        toast.success(res.data.message || 'Attendance registered successfully!');
        setClasses((prev) =>
          prev.map((c) => (c.id === classId ? { ...c, myAttendance: res.data.data } : c))
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register attendance');
    } finally {
      setMarkingAttendance(null);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile to verify if user is linked to a student
      const profileRes = await api.get('/student-portal/profile').catch(() => null);
      if (profileRes?.data?.success && profileRes?.data?.data) {
        setProfile(profileRes.data.data);
      } else {
        // Fallback: Check if this account belongs to an Academic Center student
        const centerRes = await api.get('/academic-center/student-portal/dashboard').catch(() => null);
        if (centerRes?.data?.success && centerRes.data.data?.student) {
          const cs = centerRes.data.data.student;
          const firstEnrollment = cs.enrollments?.[0];
          setProfile({
            id: cs.id,
            name: cs.name,
            email: cs.email,
            phone: cs.phone,
            admissionNo: cs.studentCode,
            status: cs.status,
            program: firstEnrollment?.program || null,
            center: centerRes.data.data.center || null,
          });
        } else {
          setIsNotStudent(true);
          setLoading(false);
          return;
        }
      }

      // 2. Fetch student portal data in parallel
      const [notifRes, matRes, feeRes, invRes, classesRes] = await Promise.all([
        api.get('/student-portal/notifications').catch(() => ({ data: { data: { notifications: [], announcements: [] } } })),
        api.get('/student-portal/materials').catch(() => ({ data: { data: [] } })),
        api.get('/student-portal/fees').catch(() => ({ data: { data: { schedules: [], feeStructures: [] } } })),
        api.get('/student-portal/invoices').catch(() => ({ data: { data: [] } })),
        api.get('/student-portal/classes').catch(() => ({ data: { data: [] } })),
      ]);

      setNotifications(notifRes.data.data?.notifications || []);
      setAnnouncements(notifRes.data.data?.announcements || []);
      setMaterials(matRes.data.data || []);
      setSchedules(feeRes.data.data?.schedules || []);
      setInvoices(invRes.data.data || []);

      let fetchedClasses = classesRes.data.data || [];
      if (fetchedClasses.length === 0) {
        // Fallback to academic center classes endpoint if needed
        const altClassesRes = await api.get('/academic-center/student-portal/classes').catch(() => null);
        if (altClassesRes?.data?.success && Array.isArray(altClassesRes.data.data)) {
          fetchedClasses = altClassesRes.data.data;
        }
      }
      setClasses(fetchedClasses);
    } catch (error) {
      console.error('Failed to fetch student data:', error);
      setIsNotStudent(true);
    } finally {
      setLoading(false);
    }
  };

  // If user has the staff role but no linked student record, fall back to ModernStaffPortal
  if (isNotStudent) {
    return <ModernStaffPortal />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Calculate stats
  const pendingSchedules = schedules.filter(s => s.status !== 'PAID');
  const totalDueAmount = pendingSchedules.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const nextPayment = pendingSchedules.length > 0 ? pendingSchedules[0] : null;
  const isOverdue = nextPayment && new Date(nextPayment.dueDate) < new Date();

  // Print Invoice handler
  const handlePrintInvoice = (invoice: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const formattedDate = new Date(invoice.createdAt).toLocaleDateString();
    const paymentsHtml = invoice.payments && invoice.payments.length > 0 
      ? invoice.payments.map((p: any) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(p.paymentDate).toLocaleDateString()}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.transactionId || 'N/A'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-transform: uppercase;">${p.paymentMethod}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${p.amount}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4" style="padding: 8px; text-align: center; color: #888;">No payments received yet</td></tr>';

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #5a67d8; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #5a67d8; }
            .title { font-size: 28px; font-weight: bold; text-align: right; }
            .details { display: flex; justify-content: space-between; margin-top: 30px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 40px; }
            .table th { background: #f7fafc; padding: 12px 8px; text-align: left; border-bottom: 2px solid #e2e8f0; }
            .table td { padding: 12px 8px; border-bottom: 1px solid #e2e8f0; }
            .totals { width: 40%; margin-left: auto; margin-top: 30px; }
            .totals table { width: 100%; border-collapse: collapse; }
            .totals td { padding: 8px 0; }
            .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">${profile?.organization?.name || 'ERP Institution'}</div>
              <div>${profile?.center?.name || 'Main Study Center'}</div>
            </div>
            <div>
              <div class="title">INVOICE</div>
              <div style="text-align: right; margin-top: 5px;">
                <strong>Invoice #:</strong> ${invoice.invoiceNumber}<br/>
                <strong>Date:</strong> ${formattedDate}
              </div>
            </div>
          </div>
          
          <div class="details">
            <div>
              <h3>Bill To:</h3>
              <strong>${profile?.name}</strong><br/>
              Roll No: ${profile?.rollNumber || 'N/A'}<br/>
              Email: ${profile?.email}<br/>
              Program: ${profile?.program?.name || 'N/A'}
            </div>
            <div style="text-align: right;">
              <h3>Status:</h3>
              <span style="padding: 4px 8px; border-radius: 4px; font-weight: bold; background: ${invoice.status === 'PAID' ? '#c6f6d5' : invoice.status === 'PARTIALLY_PAID' ? '#feebc8' : '#fed7d7'}; color: ${invoice.status === 'PAID' ? '#22543d' : invoice.status === 'PARTIALLY_PAID' ? '#744210' : '#742a2a'}; text-transform: uppercase; font-size: 12px;">
                ${invoice.status}
              </span>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Total Amount</th>
                <th style="text-align: right;">Amount Paid</th>
                <th style="text-align: right;">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Program Fee Installment / Service Fee</td>
                <td style="text-align: right;">₹${invoice.amount}</td>
                <td style="text-align: right;">₹${invoice.paidAmount}</td>
                <td style="text-align: right;">₹${invoice.balanceAmount}</td>
              </tr>
            </tbody>
          </table>

          <h3 style="margin-top: 40px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Payment History</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f7fafc; font-size: 13px;">
                <th style="padding: 8px; text-align: left;">Date</th>
                <th style="padding: 8px; text-align: left;">Transaction ID</th>
                <th style="padding: 8px; text-align: left;">Method</th>
                <th style="padding: 8px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${paymentsHtml}
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr>
                <td><strong>Subtotal:</strong></td>
                <td style="text-align: right;">₹${invoice.amount}</td>
              </tr>
              <tr>
                <td><strong>Total Paid:</strong></td>
                <td style="text-align: right;">₹${invoice.paidAmount}</td>
              </tr>
              <tr style="border-top: 2px solid #5a67d8; font-size: 18px; font-weight: bold;">
                <td style="padding-top: 10px;">Balance Due:</td>
                <td style="text-align: right; padding-top: 10px; color: ${invoice.balanceAmount > 0 ? '#e53e3e' : '#2f855a'};">₹${invoice.balanceAmount}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            Thank you for your enrollment. For any billing inquiries, please contact the support desk.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePayNowClick = (target: any) => {
    setShowPaymentGateway(target);
    setPaymentAmount(target.balanceAmount || target.amount || '');
  };

  const handleProcessPayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setPaying(true);
    try {
      // Send payment update to server
      const isInvoice = Boolean(showPaymentGateway.invoiceNumber);
      const payload = {
        amount: Number(paymentAmount),
        paymentMethod: 'credit_card',
        transactionId: `TXN-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        ...(isInvoice ? { invoiceId: showPaymentGateway.id } : { paymentScheduleId: showPaymentGateway.id }),
      };

      await api.post('/payment-schedules/pay', payload);
      toast.success('Payment simulated successfully!');
      setShowPaymentGateway(null);
      fetchStudentData(); // Refresh data
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Payment processing failed');
    } finally {
      setPaying(false);
    }
  };

  // Class helper utilities
  const isClassLive = (cls: any) => {
    const now = new Date();
    const start = new Date(cls.startTime);
    const end = new Date(cls.endTime);
    return now >= start && now <= end;
  };

  const isClassUpcoming = (cls: any) => {
    const now = new Date();
    const end = new Date(cls.endTime || cls.startTime);
    return end >= now;
  };

  const upcomingClasses = classes.filter(isClassUpcoming);
  const liveClasses = classes.filter(isClassLive);

  const filteredClasses = classes.filter((cls) => {
    if (classFilter === 'upcoming') return isClassUpcoming(cls);
    if (classFilter === 'live') return isClassLive(cls);
    if (classFilter === 'online') return cls.type === 'ONLINE' || Boolean(cls.meetingLink);
    if (classFilter === 'offline') return cls.type === 'OFFLINE' || Boolean(cls.roomOrLocation);
    return true;
  });

  // Nav tabs definition
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { id: 'classes', label: 'Live Classes', icon: <Video className="w-4 h-4" />, count: upcomingClasses.length },
    { id: 'materials', label: 'Classes & E-Books', icon: <BookOpen className="w-4 h-4" />, count: materials.length },
    { id: 'fees', label: 'Fee details', icon: <CreditCard className="w-4 h-4" />, count: pendingSchedules.length },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, count: notifications.length + announcements.length },
    { id: 'invoices', label: 'Invoices', icon: <FileText className="w-4 h-4" /> },
    { id: 'refer_admission', label: 'Refer Admission', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'terms', label: 'Terms & Conditions', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'help', label: 'Help & Support', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  // Primary tabs shown in bottom nav on mobile (max 5)
  const primaryTabs = tabs.slice(0, 5);

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-3 sm:p-4 md:p-6 pb-24 sm:pb-6 animate-in fade-in duration-500">
      
      {/* Due Payment Reminder Notification */}
      {nextPayment && (
        <div className={cn(
          "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border backdrop-blur-md shadow-sm transition-all duration-300",
          isOverdue 
            ? "bg-destructive/10 border-destructive/20 text-destructive-foreground dark:text-red-300"
            : "bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-300"
        )}>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-semibold block text-sm">
                {isOverdue ? "Overdue Payment Notice" : "Upcoming Payment Reminder"}
              </span>
              <span className="text-xs opacity-90">
                Installment of <strong>${nextPayment.amount}</strong> is due on <strong>{new Date(nextPayment.dueDate).toLocaleDateString()}</strong>.
              </span>
            </div>
          </div>
          <Button 
            variant={isOverdue ? "destructive" : "outline"}
            size="sm"
            onClick={() => handlePayNowClick(nextPayment)}
            className="flex-shrink-0"
          >
            Pay Now <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      )}

      {/* Profile Header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/10 via-background to-card p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-32 h-32 text-primary" />
        </div>
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-6 items-center text-center md:text-left">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
              <User className="w-10 h-10" />
            </div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{profile?.name}</h1>
                <Badge variant="secondary">Student</Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-1">Roll No: {profile?.rollNumber || 'N/A'}</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{profile?.program?.name || 'No Program Enrolled'}</span>
                <span>•</span>
                <span>{profile?.center?.name || 'No Study Center'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto justify-center">
            <div className="text-center md:text-right border-r border-border pr-4">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Due</span>
              <span className="text-2xl font-bold">${totalDueAmount.toFixed(2)}</span>
            </div>
            <div className="text-center md:text-right pl-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Schedules</span>
              <span className="text-2xl font-bold text-primary">{schedules.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Tabs — horizontal scroll */}
      <div className="hidden sm:flex border-b border-border overflow-x-auto gap-2 scrollbar-none pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleNavigate(tab.id)}
            className={cn(
              "flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Mobile Bottom Tab Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 py-1 safe-area-pb">
        {primaryTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleNavigate(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-lg transition-all relative",
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <div className="relative">
              <div className={cn("p-1.5 rounded-lg transition-all", activeTab === tab.id ? "bg-primary/10" : "")}>
                {tab.icon}
              </div>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {tab.count > 9 ? '9+' : tab.count}
                </span>
              )}
            </div>
            <span className={cn("text-[10px] font-medium", activeTab === tab.id ? "text-primary" : "text-muted-foreground")}>
              {tab.label.split(' ')[0]}
            </span>
          </button>
        ))}
        {/* More button for overflow tabs */}
        {tabs.length > 5 && (
          <button
            onClick={() => handleNavigate(tabs[5]?.id)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-lg text-muted-foreground"
          >
            <div className="p-1.5"><BookOpen className="w-4 h-4" /></div>
            <span className="text-[10px] font-medium">More</span>
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Quick Metrics */}
            <Card className="md:col-span-2 border-none bg-card/60 backdrop-blur-md shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">My Education Profile</CardTitle>
                <CardDescription>Academic & enrollment configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block">Academic Program</span>
                    <span className="font-semibold text-sm">{profile?.program?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Session</span>
                    <span className="font-semibold text-sm">{profile?.session?.name || profile?.enrollments?.[0]?.session?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Admission Number</span>
                    <span className="font-semibold text-sm">{profile?.admissionNo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Enrollment Status</span>
                    <span className="font-semibold text-sm capitalize">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        {profile?.status || 'Active'}
                      </Badge>
                    </span>
                  </div>
                </div>
                {profile?.program?.durationYears && (
                  <div className="pt-4 border-t border-border">
                    <span className="text-xs text-muted-foreground block">Program Duration</span>
                    <span className="font-medium text-sm">{profile.program.durationYears} Years</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Installment Card */}
            <Card className="border-none bg-card/60 backdrop-blur-md shadow-lg flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> Financial Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow flex flex-col justify-between">
                {nextPayment ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Next Installment</span>
                      <div className="text-3xl font-extrabold text-foreground mt-1">${nextPayment.amount}</div>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-border pt-3">
                      <span className="text-muted-foreground">Due Date:</span>
                      <span className="font-semibold">{new Date(nextPayment.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    All installments paid!
                  </div>
                )}
                
                {nextPayment && (
                  <Button 
                    className="w-full mt-4" 
                    variant="premium"
                    onClick={() => handlePayNowClick(nextPayment)}
                  >
                    Pay Now
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* UPCOMING CLASSES & LECTURES WIDGET ON OVERVIEW */}
            <Card className="md:col-span-3 border-none bg-card/60 backdrop-blur-md shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" /> Upcoming Classes & Lectures
                  </CardTitle>
                  <CardDescription>Live online sessions and campus lectures scheduled for your programs</CardDescription>
                </div>
                {classes.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigate('classes')}
                    className="text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1 font-medium"
                  >
                    View All Schedule ({classes.length})
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {upcomingClasses.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-xs">
                    <Calendar className="w-8 h-8 mx-auto opacity-25 mb-1.5" />
                    No upcoming classes scheduled right now.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {upcomingClasses.slice(0, 3).map((cls) => {
                      const live = isClassLive(cls);
                      const isOnline = cls.type === 'ONLINE' || Boolean(cls.meetingLink);
                      return (
                        <div key={cls.id} className="p-3.5 rounded-xl border border-border bg-background/50 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-1">
                              <Badge variant="outline" className={cn(
                                "text-[10px] py-0 px-1.5 flex items-center gap-1",
                                isOnline ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              )}>
                                {isOnline ? <Video className="w-2.5 h-2.5" /> : <MapPin className="w-2.5 h-2.5" />}
                                {isOnline ? 'Online Live' : 'Campus / Room'}
                              </Badge>
                              {live ? (
                                <Badge variant="default" className="bg-emerald-600 text-[10px] py-0 px-1.5 animate-pulse text-white">
                                  LIVE NOW
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(cls.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-sm line-clamp-1">{cls.title}</h4>
                            <p className="text-xs text-primary font-medium line-clamp-1">
                              {cls.program?.university?.name ? `[${cls.program.university.name}] ` : ''}
                              {cls.program?.name || profile?.program?.name}
                            </p>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span>
                                {new Date(cls.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(cls.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {cls.teacher && (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <User className="w-3 h-3 text-muted-foreground" />
                                <span>Faculty: {cls.teacher.name}</span>
                              </div>
                            )}
                          </div>
                          <div className="pt-2.5 mt-2 border-t flex flex-col gap-2">
                            {/* Attendance status / action */}
                            {isOnline ? (
                              cls.myAttendance ? (
                                <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                                    Attendance: Present
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-normal">
                                    {new Date(cls.myAttendance.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={markingAttendance === cls.id}
                                  onClick={() => handleRegisterAttendance(cls.id)}
                                  className="h-6 text-[11px] text-primary border-primary/30 hover:bg-primary/10 gap-1 font-medium justify-center"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  {markingAttendance === cls.id ? 'Marking...' : 'Register Attendance (Online)'}
                                </Button>
                              )
                            ) : (
                              <div className="text-[11px] text-muted-foreground flex items-center justify-between bg-muted/40 px-2 py-1 rounded">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-primary" />
                                  {cls.myAttendance ? (
                                    <strong className={cls.myAttendance.status === 'PRESENT' ? 'text-emerald-600' : 'text-destructive'}>
                                      Teacher Marked: {cls.myAttendance.status}
                                    </strong>
                                  ) : (
                                    'Campus class (Teacher marks attendance)'
                                  )}
                                </span>
                              </div>
                            )}

                            {isOnline && cls.meetingLink ? (
                              <Button size="sm" className="h-7 text-xs gap-1 w-full font-medium" asChild>
                                <a
                                  href={cls.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => {
                                    if (!cls.myAttendance) handleRegisterAttendance(cls.id);
                                  }}
                                >
                                  <Video className="w-3 h-3" /> Join Class
                                </a>
                              </Button>
                            ) : !isOnline && (
                              <span className="text-xs font-medium text-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-primary" /> {cls.roomOrLocation || 'Physical Campus'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* NOTIFICATIONS & ANNOUNCEMENTS */}
        {activeTab === 'notifications' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Direct Notifications */}
            <Card className="border-none bg-card/60 backdrop-blur-md shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" /> My Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No new notifications.</div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="flex gap-3 p-3 rounded-xl border border-border bg-background/50 hover:bg-background/80 transition-all">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg h-fit">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">{notif.title}</h4>
                        <p className="text-xs text-muted-foreground">{notif.message}</p>
                        <span className="text-[10px] text-muted-foreground block">{new Date(notif.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Org-wide Announcements */}
            <Card className="border-none bg-card/60 backdrop-blur-md shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" /> Institution Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {announcements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No recent announcements.</div>
                ) : (
                  announcements.map((ann) => (
                    <div key={ann.id} className="flex gap-3 p-3 rounded-xl border border-border bg-background/50 hover:bg-background/80 transition-all">
                      <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg h-fit">
                        <Award className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">{ann.title}</h4>
                        <p className="text-xs text-muted-foreground">{ann.content}</p>
                        <span className="text-[10px] text-muted-foreground block">{new Date(ann.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* CLASSES & SCHEDULE */}
        {activeTab === 'classes' && (
          <div className="space-y-4">
            <Card className="border-none bg-card/60 backdrop-blur-md shadow-lg">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" /> Classes & Lecture Schedule
                  </CardTitle>
                  <CardDescription>
                    Live online lectures, classroom sessions, and recordings for your programs
                  </CardDescription>
                </div>
                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={classFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setClassFilter('all')}
                    className="h-7 text-xs px-2.5"
                  >
                    All ({classes.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={classFilter === 'upcoming' ? 'default' : 'outline'}
                    onClick={() => setClassFilter('upcoming')}
                    className="h-7 text-xs px-2.5"
                  >
                    Upcoming ({upcomingClasses.length})
                  </Button>
                  {liveClasses.length > 0 && (
                    <Button
                      size="sm"
                      variant={classFilter === 'live' ? 'default' : 'outline'}
                      onClick={() => setClassFilter('live')}
                      className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Live Now ({liveClasses.length})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={classFilter === 'online' ? 'default' : 'outline'}
                    onClick={() => setClassFilter('online')}
                    className="h-7 text-xs px-2.5"
                  >
                    Online Live
                  </Button>
                  <Button
                    size="sm"
                    variant={classFilter === 'offline' ? 'default' : 'outline'}
                    onClick={() => setClassFilter('offline')}
                    className="h-7 text-xs px-2.5"
                  >
                    Campus / Offline
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {filteredClasses.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto opacity-20 mb-3" />
                    <h3 className="font-semibold text-base text-foreground">No Classes Found</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {classes.length === 0
                        ? 'No classes have been scheduled for your program yet. Check back soon!'
                        : 'No classes match the selected filter.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClasses.map((cls) => {
                      const live = isClassLive(cls);
                      const isOnline = cls.type === 'ONLINE' || Boolean(cls.meetingLink);
                      return (
                        <div
                          key={cls.id}
                          className={cn(
                            "p-4 rounded-xl border bg-background/50 hover:border-primary/40 transition-all flex flex-col justify-between shadow-xs",
                            live ? "border-emerald-500/50 bg-emerald-500/5" : "border-border"
                          )}
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] py-0.5 px-2 flex items-center gap-1 font-medium",
                                  isOnline
                                    ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                )}
                              >
                                {isOnline ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                {isOnline ? 'Online Live' : 'Campus / Room'}
                              </Badge>

                              {live ? (
                                <Badge variant="default" className="bg-emerald-600 text-white text-[10px] animate-pulse">
                                  LIVE NOW
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                  {cls.status || 'SCHEDULED'}
                                </Badge>
                              )}
                            </div>

                            <div>
                              <h4 className="font-bold text-foreground text-sm line-clamp-2">{cls.title}</h4>
                              <p className="text-xs text-primary font-medium mt-1">
                                {cls.program?.university?.name ? (
                                  <span className="opacity-80">[{cls.program.university.name}] </span>
                                ) : null}
                                {cls.program?.name || profile?.program?.name}
                              </p>
                            </div>

                            <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>
                                  {new Date(cls.startTime).toLocaleDateString([], {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>
                                  {new Date(cls.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(cls.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {cls.teacher && (
                                <div className="flex items-center gap-2">
                                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Instructor: <strong>{cls.teacher.name}</strong></span>
                                </div>
                              )}
                              {!isOnline && (
                                <div className="flex items-center gap-2 text-foreground">
                                  <MapPin className="w-3.5 h-3.5 text-primary" />
                                  <span>Location: <strong>{cls.roomOrLocation || 'Physical Campus'}</strong></span>
                                </div>
                              )}
                              {cls.notes && (
                                <div className="text-[11px] bg-muted/40 p-2 rounded text-muted-foreground italic">
                                  {cls.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 mt-3 border-t border-border/60 space-y-2.5">
                            {/* Attendance Status & Action Section */}
                            <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-foreground flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                                  Attendance:
                                </span>
                                {cls.myAttendance ? (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] py-0.5 px-2 font-medium flex items-center gap-1",
                                      cls.myAttendance.status === 'PRESENT'
                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                                        : "bg-destructive/10 text-destructive border-destructive/30"
                                    )}
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    {cls.myAttendance.markedBy === 'STUDENT' ? 'Self-Registered: Present' : `Teacher Marked: ${cls.myAttendance.status}`}
                                  </Badge>
                                ) : isOnline ? (
                                  <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
                                    Pending Registration
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-muted-foreground bg-muted border-muted-foreground/20">
                                    Teacher Mark Only
                                  </Badge>
                                )}
                              </div>

                              {/* Action for Online Class: Register Attendance */}
                              {isOnline && !cls.myAttendance && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={markingAttendance === cls.id}
                                  onClick={() => handleRegisterAttendance(cls.id)}
                                  className="w-full text-xs h-7 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 font-semibold"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  {markingAttendance === cls.id ? 'Registering Attendance...' : 'Register Attendance (Present)'}
                                </Button>
                              )}

                              {/* Info for Offline Class */}
                              {!isOnline && !cls.myAttendance && (
                                <p className="text-[11px] text-muted-foreground italic">
                                  Physical campus session. Your instructor will mark your attendance in the classroom.
                                </p>
                              )}
                            </div>

                            {isOnline && cls.meetingLink && (
                              <div className="flex items-center gap-2">
                                <Button size="sm" className="w-full text-xs gap-1.5 h-8 font-semibold" asChild>
                                  <a
                                    href={cls.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => {
                                      if (!cls.myAttendance) handleRegisterAttendance(cls.id);
                                    }}
                                  >
                                    <Video className="w-3.5 h-3.5" /> Join Live Session
                                    <ExternalLink className="w-3 h-3 opacity-70" />
                                  </a>
                                </Button>
                              </div>
                            )}
                            {cls.meetingPassword && (
                              <div className="flex items-center justify-between text-[11px] bg-muted/40 px-2 py-1 rounded">
                                <span className="text-muted-foreground">Meeting Passcode:</span>
                                <span className="font-mono font-bold text-foreground">{cls.meetingPassword}</span>
                              </div>
                            )}
                            {cls.recordingUrl && (
                              <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 h-7" asChild>
                                <a href={cls.recordingUrl} target="_blank" rel="noopener noreferrer">
                                  <PlayCircle className="w-3.5 h-3.5 text-primary" /> Watch Recording
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* CLASSES & EBOOKS */}
        {activeTab === 'materials' && (
          <Card className="border-none bg-card/60 backdrop-blur-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> Program Materials & E-Books
              </CardTitle>
              <CardDescription>View and download video lectures, textbooks, materials and syllabus for {profile?.program?.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {materials.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto opacity-20 mb-3" />
                  No digital course materials uploaded for this program.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {materials.map((material) => {
                    const isVideo = material.type === 'VIDEO_LECTURE' || material.mediaUrl?.includes('youtube') || material.mediaUrl?.includes('vimeo');
                    return (
                      <div key={material.id} className="p-4 rounded-xl border border-border bg-background/50 hover:border-primary/30 transition-all flex flex-col justify-between shadow-xs">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="capitalize text-[10px]">
                              {material.type ? material.type.replace('_', ' ') : 'Course Material'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{new Date(material.createdAt).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-bold text-foreground line-clamp-1">{material.title}</h4>
                          {material.universityName && (
                            <p className="text-[11px] text-primary font-medium mt-0.5">
                              [{material.universityName}] {material.programName || ''}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{material.description || 'No description provided.'}</p>
                          {material.chapterOrTopic && (
                            <p className="text-[11px] text-muted-foreground mt-1">Topic: <strong>{material.chapterOrTopic}</strong></p>
                          )}
                        </div>
                        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {material.duration ? `Duration: ${material.duration}` : (material.fileSize ? `Size: ${material.fileSize}` : 'Digital Asset')}
                          </span>
                          {material.fileUrl && (
                            <Button size="sm" variant={isVideo ? "default" : "outline"} className="text-xs h-7 gap-1" asChild>
                              <a href={material.fileUrl} target="_blank" rel="noopener noreferrer">
                                {isVideo ? <PlayCircle className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                                {isVideo ? 'Watch Lecture' : 'Download'}
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* FEE DETAILS (PAYMENT SCHEDULES) */}
        {activeTab === 'fees' && (
          <div className="space-y-6">
            <Card className="border-none bg-card/60 backdrop-blur-md shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Payment Schedules</CardTitle>
                <CardDescription>Installments, due dates and current balance</CardDescription>
              </CardHeader>
              <CardContent>
                {schedules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No payment schedule configured.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-medium">
                          <th className="pb-3 pr-4">Due Date</th>
                          <th className="pb-3 px-4">Amount</th>
                          <th className="pb-3 px-4">Balance</th>
                          <th className="pb-3 px-4">Status</th>
                          <th className="pb-3 pl-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedules.map((sched) => {
                          const isSchedOverdue = sched.status !== 'PAID' && new Date(sched.dueDate) < new Date();
                          return (
                            <tr key={sched.id} className="border-b border-border/50 hover:bg-background/20">
                              <td className="py-3.5 pr-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className={cn(isSchedOverdue && "text-destructive font-semibold")}>
                                  {new Date(sched.dueDate).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-medium">${sched.amount}</td>
                              <td className="py-3.5 px-4">${sched.balanceAmount !== undefined ? sched.balanceAmount : sched.amount}</td>
                              <td className="py-3.5 px-4">
                                <Badge 
                                  variant={
                                    sched.status === 'PAID' ? 'default' : 
                                    sched.status === 'PARTIALLY_PAID' ? 'outline' : 
                                    isSchedOverdue ? 'destructive' : 'secondary'
                                  }
                                  className={cn(
                                    sched.status === 'PAID' && 'bg-emerald-500/10 text-emerald-500 border-none hover:bg-emerald-500/20',
                                    sched.status === 'PARTIALLY_PAID' && 'bg-amber-500/10 text-amber-500 border-none hover:bg-amber-500/20'
                                  )}
                                >
                                  {sched.status}
                                </Badge>
                              </td>
                              <td className="py-3.5 pl-4 text-right">
                                {sched.status !== 'PAID' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handlePayNowClick(sched)}
                                  >
                                    Pay Installment
                                  </Button>
                                )}
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
          </div>
        )}

        {/* INVOICES */}
        {activeTab === 'invoices' && (
          <Card className="border-none bg-card/60 backdrop-blur-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Invoices & Billing History</CardTitle>
              <CardDescription>View, print and pay generated billing invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No invoices found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-medium">
                        <th className="pb-3 pr-4">Invoice #</th>
                        <th className="pb-3 px-4">Date</th>
                        <th className="pb-3 px-4">Amount</th>
                        <th className="pb-3 px-4">Balance</th>
                        <th className="pb-3 px-4">Status</th>
                        <th className="pb-3 pl-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-border/50 hover:bg-background/20">
                          <td className="py-3.5 pr-4 font-bold text-foreground">{inv.invoiceNumber}</td>
                          <td className="py-3.5 px-4">{new Date(inv.createdAt).toLocaleDateString()}</td>
                          <td className="py-3.5 px-4 font-semibold">${inv.amount}</td>
                          <td className="py-3.5 px-4 text-destructive">${inv.balanceAmount}</td>
                          <td className="py-3.5 px-4">
                            <Badge 
                              variant={
                                inv.status === 'PAID' ? 'default' : 
                                inv.status === 'PARTIALLY_PAID' ? 'outline' : 'destructive'
                              }
                              className={cn(
                                inv.status === 'PAID' && 'bg-emerald-500/10 text-emerald-500 border-none hover:bg-emerald-500/20',
                                inv.status === 'PARTIALLY_PAID' && 'bg-amber-500/10 text-amber-500 border-none hover:bg-amber-500/20'
                              )}
                            >
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 pl-4 text-right space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handlePrintInvoice(inv)}
                              title="Print Invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                            {inv.balanceAmount > 0 && (
                              <Button 
                                size="sm" 
                                variant="premium"
                                onClick={() => handlePayNowClick(inv)}
                              >
                                Pay Now
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* REFER ADMISSION */}
        {activeTab === 'refer_admission' && (
          <div className="space-y-6">
            <Card className="border-none bg-card/60 backdrop-blur-md shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Refer a Student</CardTitle>
                <CardDescription>Recommend our programs to your friends or family and refer them for admission.</CardDescription>
              </CardHeader>
              <CardContent>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formEl = e.currentTarget;
                    const formData = new FormData(formEl);
                    const payload = {
                      centerName: formData.get('centerName') as string,
                      contactName: formData.get('contactName') as string,
                      email: formData.get('email') as string,
                      phone: formData.get('phone') as string,
                      address: formData.get('address') as string,
                      notes: formData.get('notes') as string,
                    };
                    
                    if (!payload.contactName || !payload.email || !payload.phone) {
                      toast.error('Name, Email, and Phone number are required.');
                      return;
                    }
                    
                    try {
                      await api.post('/student-portal/refer', payload);
                      toast.success('Referral submitted successfully! Your referral has been recorded.');
                      formEl.reset();
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || 'Failed to submit referral.');
                    }
                  }}
                  className="space-y-4 max-w-xl"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
                      <input 
                        name="contactName" 
                        type="text" 
                        required 
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        placeholder="Friend's full name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Email Address *</label>
                      <input 
                        name="email" 
                        type="email" 
                        required 
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        placeholder="friend@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Phone Number *</label>
                      <input 
                        name="phone" 
                        type="tel" 
                        required 
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        placeholder="e.g. +91 9876543210"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Preferred Study Center (Optional)</label>
                      <input 
                        name="centerName" 
                        type="text" 
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        placeholder="e.g. TIMS EDAPPAL"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Address / Location (Optional)</label>
                    <input 
                      name="address" 
                      type="text" 
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                      placeholder="City, State"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Additional Notes</label>
                    <textarea 
                      name="notes" 
                      rows={3}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                      placeholder="Any program preferences or details..."
                    />
                  </div>

                  <Button type="submit" className="w-full md:w-auto">Submit Referral</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TERMS & CONDITIONS */}
        {activeTab === 'terms' && (
          <div className="space-y-6">
            <Card className="border-none bg-card/60 backdrop-blur-md shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Terms & Conditions</CardTitle>
                <CardDescription>Review the rules, policies, and regulations of our institution.</CardDescription>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none text-sm text-muted-foreground space-y-4 leading-relaxed">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">1. Academic Integrity & Conduct</h4>
                  <p>Students are expected to adhere to high standards of academic honesty and conduct. Plagiarism, cheating, or behavior disrupting academic operations will lead to disciplinary actions.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">2. Fee Payment & Installments</h4>
                  <p>Tuition fees must be settled according to the scheduled milestones. Failure to complete installment payments on or before the due date may restrict access to exams and student portal assets.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">3. Attendance Requirement</h4>
                  <p>A minimum of 75% attendance is required in all classes and coursework to qualify for term examinations, unless approved otherwise by the academic board.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">4. Refund & Cancellation Policy</h4>
                  <p>Admission registration fees are non-refundable. Tuition fee refunds will be processed strictly in accordance with the institution's official refund policy guidelines.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* HELP & SUPPORT */}
        {activeTab === 'help' && (
          <div className="space-y-6">
            <Card className="border-none bg-card/60 backdrop-blur-md shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Help & Support Desk</CardTitle>
                <CardDescription>Need help with your courses, fee receipts, or exams? Contact us.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Academic Queries</h4>
                    <p className="text-sm text-muted-foreground">For support with classes, study materials, or exams, email us at:</p>
                    <span className="text-sm text-primary font-medium">support.academics@pypeerm.com</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Finance & Billing Help</h4>
                    <p className="text-sm text-muted-foreground">For issues relating to payments, balance, or invoice receipts:</p>
                    <span className="text-sm text-primary font-medium">support.billing@pypeerm.com</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">General Office Support</h4>
                    <p className="text-sm text-muted-foreground">For general inquiries, campus details, and other operations support:</p>
                    <span className="text-sm text-primary font-medium">info@pypeerm.com</span>
                  </div>
                </div>
                <div className="bg-muted/40 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Frequently Asked Questions</h4>
                    <ul className="text-xs text-muted-foreground list-disc list-inside space-y-2">
                      <li>How can I print my invoice? Go to the "Invoices" tab and click the printer icon next to the record.</li>
                      <li>Where can I access study materials? Select the "Classes & Ebooks" tab in your sidebar.</li>
                      <li>How to apply for a referral fee? Once your referral registers, sales agents will link the lead to your record.</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* MOCK PAYMENT GATEWAY DIALOG/MODAL */}
      {showPaymentGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-primary" /> Mock Payment Gateway
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Simulate payment for {showPaymentGateway.invoiceNumber ? `Invoice ${showPaymentGateway.invoiceNumber}` : 'Installment Schedule'}.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Paying To</label>
                <input 
                  type="text" 
                  disabled 
                  value={profile?.organization?.name || 'ERP Institution'}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Amount to Pay ($)</label>
                <input 
                  type="number" 
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-background border border-primary/20 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm text-foreground font-semibold"
                  placeholder="Enter amount"
                />
                <span className="text-[10px] text-muted-foreground block mt-1">
                  Remaining Balance: ${showPaymentGateway.balanceAmount || showPaymentGateway.amount}
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPaymentGateway(null)}
                disabled={paying}
              >
                Cancel
              </Button>
              <Button 
                variant="premium" 
                size="sm" 
                onClick={handleProcessPayment}
                disabled={paying}
              >
                {paying ? 'Processing...' : 'Authorize & Pay'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
