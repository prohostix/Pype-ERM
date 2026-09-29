import { useState, useEffect, useRef } from 'react';
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
  UserCheck,
  Star,
  UserPlus,
  Gift,
  CheckSquare,
  Loader2,
  Play,
  Pause,
  Maximize,
  Volume2,
  VolumeX,
  Volume1,
  ChevronDown,
  ChevronUp,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { ModernStaffPortal } from './ModernStaffPortal';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactPlayer from 'react-player';
import { Slider } from '@/components/ui/slider';

interface StudentPortalProps {
  onNavigate?: (tab: string) => void;
  initialTab?: string;
}

const getCleanVideoUrl = (url: string | undefined) => {
  if (!url) return '';
  let clean = url;
  if (clean.includes('<iframe')) {
    const match = clean.match(/src="([^"]+)"/);
    if (match) clean = match[1];
  }
  if (clean.includes('&list=')) {
    clean = clean.split('&list=')[0];
  }
  if (clean.includes('?list=')) {
    clean = clean.split('?list=')[0];
  }
  return clean;
};

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return '';
  
  let cleanUrl = url;
  if (cleanUrl.includes('<iframe')) {
    const match = cleanUrl.match(/src="([^"]+)"/);
    if (match) cleanUrl = match[1];
  }
  
  let videoId = '';
  if (cleanUrl.includes('youtu.be/')) {
    videoId = cleanUrl.split('youtu.be/')[1].split('?')[0].split('&')[0];
  } else if (cleanUrl.includes('watch?v=')) {
    videoId = cleanUrl.split('watch?v=')[1].split('&')[0].split('#')[0];
  } else if (cleanUrl.includes('embed/')) {
    videoId = cleanUrl.split('embed/')[1].split('?')[0].split('"')[0];
  } else if (cleanUrl.includes('shorts/')) {
    videoId = cleanUrl.split('shorts/')[1].split('?')[0].split('&')[0];
  } else if (cleanUrl.includes('live/')) {
    videoId = cleanUrl.split('live/')[1].split('?')[0].split('&')[0];
  } else if (cleanUrl.includes('v/')) {
    videoId = cleanUrl.split('v/')[1].split('?')[0].split('&')[0];
  }
  
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&color=white`;
  }

  // Handle Playlists
  if (cleanUrl.includes('list=')) {
    const listId = cleanUrl.split('list=')[1].split('&')[0];
    if (listId) {
      return `https://www.youtube.com/embed/videoseries?list=${listId}&rel=0&modestbranding=1`;
    }
  }
  
  // Prevent raw youtube.com from being embedded as it causes X-Frame-Options crash
  if (cleanUrl.includes('youtube.com')) return '';
  return cleanUrl;
};

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
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [activeVideoLesson, setActiveVideoLesson] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showPaymentGateway, setShowPaymentGateway] = useState<any>(null); // holds schedule or invoice to pay
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [markingAttendance, setMarkingAttendance] = useState<string | null>(null);
  const [selectedCurriculumLesson, setSelectedCurriculumLesson] = useState<{ cls: any, mod: any, lesson: any } | null>(null);

  // Lesson Assessment State
  const [lessonAssessment, setLessonAssessment] = useState<any>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [takingAssessment, setTakingAssessment] = useState(false);
  const [assessmentAnswers, setAssessmentAnswers] = useState<any[]>([]); // array of { questionId, selectedIndex }
  const [submittingAssessment, setSubmittingAssessment] = useState(false);

  // Module Collapse State
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const playerRef = useRef<ReactPlayer>(null);
  const dialogPlayerRef = useRef<ReactPlayer>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [played, setPlayed] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Dialog Player State
  const [dialogIsPlaying, setDialogIsPlaying] = useState(false);
  const [dialogVolume, setDialogVolume] = useState(1);
  const [dialogPlayed, setDialogPlayed] = useState(0);
  const [dialogSeeking, setDialogSeeking] = useState(false);
  const [dialogDuration, setDialogDuration] = useState(0);
  const [dialogIsMuted, setDialogIsMuted] = useState(false);
  const [dialogHasStarted, setDialogHasStarted] = useState(false);

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) {
      return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  const toggleFullScreen = () => {
    if (playerContainerRef.current) {
      if (!document.fullscreenElement) {
        playerContainerRef.current.requestFullscreen();
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  const [ratingSessionId, setRatingSessionId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const handleSubmitRating = async () => {
    if (!ratingSessionId || ratingValue === 0) return;
    setSubmittingRating(true);
    try {
      const res = await api.post(`/student-portal/sessions/${ratingSessionId}/rate`, {
        rating: ratingValue,
        review: reviewText
      });
      if (res.data.success) {
        toast.success('Thank you for your review!');
        setRatingSessionId(null);
        setRatingValue(0);
        setReviewText('');
        fetchStudentData(); // Refresh to get the updated myRating
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

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

  useEffect(() => {
    let interval: any;
    if (videoDialogOpen && activeVideoLesson) {
      // Record view immediately
      api.post('/student-portal/video-view', { moduleLessonId: activeVideoLesson.id }).catch(console.error);

      // Heartbeat every 10 seconds
      interval = setInterval(() => {
        api.post('/student-portal/video-heartbeat', { moduleLessonId: activeVideoLesson.id, watchDuration: 10 }).catch(console.error);
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [videoDialogOpen, activeVideoLesson]);

  useEffect(() => {
    if (selectedCurriculumLesson) {
      setLoadingAssessment(true);
      setLessonAssessment(null);
      setTakingAssessment(false);
      setAssessmentAnswers([]);
      api.get(`/student-portal/lessons/${selectedCurriculumLesson.lesson.id}/assessment`)
        .then(res => {
          if (res.data?.data) {
            setLessonAssessment(res.data.data);
            setAssessmentAnswers(res.data.data.questions.map((q: any) => ({ questionId: q.id, selectedIndex: -1 })));
          }
        })
        .catch(() => setLessonAssessment(null))
        .finally(() => setLoadingAssessment(false));
    }
  }, [selectedCurriculumLesson]);

  const handleSubmitAssessment = async () => {
    if (!selectedCurriculumLesson || !lessonAssessment) return;
    
    // Check if all answered
    if (assessmentAnswers.some(a => a.selectedIndex === -1)) {
      toast.error('Please answer all questions');
      return;
    }

    setSubmittingAssessment(true);
    try {
      const res = await api.post(`/student-portal/lessons/${selectedCurriculumLesson.lesson.id}/assessment`, {
        answers: assessmentAnswers
      });
      toast.success(res.data.message || 'Assessment submitted!');
      // Update assessment data to show the new attempt
      api.get(`/student-portal/lessons/${selectedCurriculumLesson.lesson.id}/assessment`).then(res2 => {
         if(res2.data?.data) setLessonAssessment(res2.data.data);
      });
      setTakingAssessment(false);
    } catch(err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit assessment');
    } finally {
      setSubmittingAssessment(false);
    }
  };

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile to verify if user is linked to a student
      const profileRes = await api.get('/student-portal/profile').catch(() => null);
      if (profileRes?.data?.success && profileRes?.data?.data) {
        setProfile(profileRes.data.data);
      } else {
        setIsNotStudent(true);
        setLoading(false);
        return;
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
      setFeeStructures(feeRes.data.data?.feeStructures || []);
      setInvoices(invRes.data.data || []);

      let fetchedClasses = classesRes.data.data || [];

      // Compute sequential learning lock status
      fetchedClasses = fetchedClasses.map((cls: any) => {
        let previousCompleted = true; // First lesson is always unlocked
        cls.modules = cls.modules?.map((mod: any) => {
          mod.lessons = mod.lessons?.map((lesson: any) => {
            lesson.isLocked = !previousCompleted;
            previousCompleted = !!lesson.isCompleted;
            return lesson;
          });
          return mod;
        });
        return cls;
      });

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
              <div>${profile?.center?.name || 'Main Academic Partner'}</div>
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
    // { id: 'classes', label: 'Live Classes', icon: <Video className="w-4 h-4" />, count: upcomingClasses.length },
    { id: 'materials', label: 'Classes & E-Books', icon: <BookOpen className="w-4 h-4" />, count: materials.length },
    { id: 'fees', label: 'Fee & Invoices', icon: <CreditCard className="w-4 h-4" />, count: pendingSchedules.length },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, count: notifications.length + announcements.length },
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
      {activeTab === 'overview' && (
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 md:p-10 shadow-2xl border border-indigo-500/20 mt-2">
          {/* Background Decorative Elements */}
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3">
            <div className="w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl opacity-50"></div>
          </div>
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3">
            <div className="w-96 h-96 bg-purple-500/20 rounded-full blur-3xl opacity-50"></div>
          </div>
          <div className="absolute top-8 right-8 opacity-10 pointer-events-none">
            <Sparkles className="w-40 h-40 text-indigo-300 transform rotate-12" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-8 items-center text-center md:text-left">
              {/* Avatar / Icon */}
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-white/20 shadow-xl shadow-indigo-500/30">
                  <User className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-6 h-6 rounded-full border-4 border-slate-900 animate-pulse"></div>
              </div>

              <div>
                <div className="flex flex-col md:flex-row items-center md:items-end gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">{profile?.name}</h1>
                  <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-500/30 hover:bg-indigo-500/30 mb-1 font-bold">
                    Enrolled Student
                  </Badge>
                </div>
                <p className="text-indigo-200/80 text-sm font-medium mb-4">Enrollment No: {profile?.enrollmentNo || profile?.rollNumber || 'Not Assigned'}</p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2 text-sm">
                  <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-xl text-white">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold">{profile?.program?.name || 'No Program Enrolled'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-xl text-white">
                    <MapPin className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold">{profile?.center?.name || 'No Academic Partner'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Stats Box */}
            <div className="flex gap-6 w-full lg:w-auto justify-center bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-inner">
              <div className="text-center md:text-right border-r border-white/10 pr-6">
                <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-widest block mb-1">Total Due</span>
                <span className="text-3xl font-black text-white flex items-center justify-center md:justify-end gap-1">
                  <span className="text-indigo-400 text-xl">$</span>{totalDueAmount.toFixed(2)}
                </span>
              </div>
              <div className="text-center md:text-right pl-2">
                <span className="text-[10px] uppercase font-bold text-purple-300 tracking-widest block mb-1">Pending Schedules</span>
                <span className="text-3xl font-black text-white">{schedules.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}


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
          <div className="space-y-6">

            {/* Welcome Banner */}
            {/* <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 text-white shadow-xl">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Sparkles className="w-64 h-64 transform rotate-12 translate-x-12 -translate-y-12" />
              </div>

              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    Welcome back, {profile?.name?.split(' ')[0] || 'Student'}!
                  </h2>
                  <p className="text-pink-100 font-medium text-lg flex items-center gap-2">
                    <BookOpen className="w-5 h-5" /> {profile?.program?.name || 'Academic Program'}
                  </p>
                </div>
              </div>
            </div> */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Education Profile Card */}
              <Card className="md:col-span-2 border border-slate-200/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] overflow-hidden transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-slate-50/50 to-white/50 dark:from-slate-900/50 dark:to-slate-800/50 border-b border-slate-100 dark:border-slate-800 pb-5 pt-6 px-8">
                  <CardTitle className="text-xl font-extrabold flex items-center gap-3 text-slate-800 dark:text-slate-100">
                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                      <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    My Education Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="group bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <BookOpen className="w-4 h-4 text-indigo-500/70" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Program</span>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{profile?.program?.name || 'N/A'}</span>
                    </div>
                    <div className="group bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-300 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-4 h-4 text-purple-500/70" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Session</span>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-lg group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{profile?.session?.name || profile?.enrollments?.[0]?.session?.name || 'N/A'}</span>
                    </div>
                    <div className="group bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:border-pink-200 dark:hover:border-pink-800 transition-all duration-300 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <Award className="w-4 h-4 text-pink-500/70" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admission Number</span>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-lg group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">{profile?.admissionNo || 'N/A'}</span>
                    </div>
                    <div className="group bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-300 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500/70" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrollment Status</span>
                      </div>
                      <span className="font-bold text-sm capitalize inline-block mt-1">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-3 py-1 font-extrabold uppercase tracking-widest">
                          {profile?.status || 'Active'}
                        </Badge>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Next Installment Card */}
              <Card className="border border-emerald-200/50 dark:border-emerald-800/50 shadow-sm bg-gradient-to-b from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20 rounded-[2rem] overflow-hidden flex flex-col justify-between transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/30 dark:to-teal-900/30 border-b border-emerald-100/50 dark:border-emerald-800/50 pb-5 pt-6 px-8">
                  <CardTitle className="text-xl font-extrabold flex items-center gap-3 text-emerald-800 dark:text-emerald-400">
                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                      <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    Financial Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 flex-grow flex flex-col justify-between">
                  {nextPayment ? (
                    <div className="space-y-6">
                      <div className="relative bg-emerald-500/5 dark:bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/10 dark:border-emerald-500/20 text-center overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                          <CreditCard className="w-24 h-24 text-emerald-500 transform rotate-12" />
                        </div>
                        <span className="relative z-10 text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest">Next Installment</span>
                        <div className="relative z-10 text-5xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">${nextPayment.amount}</div>
                      </div>
                      <div className="flex items-center justify-between text-sm px-4 py-3 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-500 dark:text-slate-400">Due Date</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{new Date(nextPayment.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 flex flex-col items-center justify-center h-full">
                      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                        <CheckCircle className="w-10 h-10" />
                      </div>
                      <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-2">All Clear!</h4>
                      <p className="text-sm font-medium text-slate-500">You have no pending installments.</p>
                    </div>
                  )}

                  {nextPayment && (
                    <Button
                      className="w-full mt-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold tracking-widest shadow-lg hover:shadow-xl transition-all duration-300 py-6 text-base"
                      onClick={() => handlePayNowClick(nextPayment)}
                    >
                      PAY NOW <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* UPCOMING CLASSES WIDGET */}
              <Card className="md:col-span-3 border border-slate-200/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] overflow-hidden mt-4 transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-slate-50/50 to-white/50 dark:from-slate-900/50 dark:to-slate-800/50 border-b border-slate-100 dark:border-slate-800 pb-5 pt-6 px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-extrabold flex items-center gap-3 text-slate-800 dark:text-slate-100">
                      <div className="p-2 bg-pink-500/10 rounded-xl">
                        <Video className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                      </div>
                      Upcoming Classes & Lectures
                    </CardTitle>
                    <CardDescription className="font-medium mt-2 text-sm">Live online sessions and scheduled campus lectures</CardDescription>
                  </div>
                  {classes.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => handleNavigate('materials')}
                      className="rounded-2xl border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-900/50 dark:text-pink-400 dark:hover:bg-pink-900/20 font-bold tracking-wide"
                    >
                      View All Schedule
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-8">
                  {upcomingClasses.length === 0 ? (
                    <div className="text-center py-16 flex flex-col items-center">
                      <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner">
                        <Calendar className="w-12 h-12" />
                      </div>
                      <h4 className="text-2xl font-bold text-slate-500 dark:text-slate-400 mb-2">No upcoming classes</h4>
                      <p className="text-base font-medium text-slate-400">Take a well-deserved break and relax!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {upcomingClasses.slice(0, 3).map((cls) => {
                        const live = isClassLive(cls);
                        const isOnline = cls.type === 'ONLINE' || Boolean(cls.meetingLink);
                        return (
                          <div key={cls.id} className="group relative rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 hover:border-pink-300 dark:hover:border-pink-700 transition-all duration-500 shadow-sm hover:shadow-md hover:-translate-y-1 flex flex-col justify-between overflow-hidden">
                            {live && (
                              <div className="absolute -top-3 -right-3">
                                <span className="relative flex h-10 w-10 items-center justify-center">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-6 w-6 bg-emerald-500 border-4 border-white dark:border-slate-900"></span>
                                </span>
                              </div>
                            )}

                            <div className="space-y-5 relative z-10">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn(
                                  "text-[10px] py-1 px-3 font-black tracking-widest uppercase border rounded-xl",
                                  isOnline
                                    ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50"
                                    : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50"
                                )}>
                                  {isOnline ? <Video className="w-3 h-3 mr-2" /> : <MapPin className="w-3 h-3 mr-2" />}
                                  {isOnline ? 'Online' : 'Campus'}
                                </Badge>
                                {!live && (
                                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl uppercase tracking-widest">
                                    {new Date(cls.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>

                              <div>
                                <h4 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 line-clamp-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors leading-tight mb-2">{cls.title}</h4>
                                <p className="text-sm text-slate-500 font-semibold line-clamp-1">
                                  {cls.program?.university?.name ? `[${cls.program.university.name}] ` : ''}
                                  {cls.program?.name || profile?.program?.name}
                                </p>
                              </div>

                              <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                                  <div className="p-1.5 bg-indigo-500/10 rounded-lg"><Clock className="w-4 h-4 text-indigo-500" /></div>
                                  {new Date(cls.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(cls.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {cls.teacher && (
                                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="p-1.5 bg-purple-500/10 rounded-lg"><User className="w-4 h-4 text-purple-500" /></div>
                                    {cls.teacher.name}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 relative z-10">
                              {/* Attendance status / action */}
                              {isOnline ? (
                                cls.myAttendance ? (
                                  <div className="flex items-center justify-between text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-4 py-3 rounded-2xl">
                                    <span className="flex items-center gap-2">
                                      <CheckCircle className="w-5 h-5" />
                                      Attended
                                    </span>
                                    <span className="text-[10px] text-emerald-500/80 font-black uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-lg">
                                      {new Date(cls.myAttendance.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    disabled={markingAttendance === cls.id}
                                    onClick={() => handleRegisterAttendance(cls.id)}
                                    className="w-full py-6 text-sm font-extrabold tracking-widest border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-2xl uppercase"
                                  >
                                    <UserCheck className="w-5 h-5 mr-2" />
                                    {markingAttendance === cls.id ? 'Marking...' : 'Register Attendance'}
                                  </Button>
                                )
                              ) : (
                                <div className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl">
                                  <span className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-slate-400" />
                                    {cls.myAttendance ? (
                                      <span className={cls.myAttendance.status === 'PRESENT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                                        Marked {cls.myAttendance.status}
                                      </span>
                                    ) : (
                                      'Campus Class'
                                    )}
                                  </span>
                                </div>
                              )}

                              {isOnline && cls.meetingLink && (
                                <Button className="w-full mt-3 rounded-2xl bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white font-black tracking-widest uppercase shadow-lg hover:shadow-xl transition-all duration-300 py-6 text-sm" asChild>
                                  <a
                                    href={cls.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => {
                                      if (!cls.myAttendance) handleRegisterAttendance(cls.id);
                                    }}
                                  >
                                    <Video className="w-5 h-5 mr-2" /> Join Class
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
          </div>
        )}

        {/* NOTIFICATIONS & ANNOUNCEMENTS */}
        {activeTab === 'notifications' && (
          <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-border/50">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary shadow-sm">
                    <Bell className="w-6 h-6" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Updates & Alerts
                  </h1>
                </div>
                <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
                  Stay up to date with your personal notifications and institution-wide announcements.
                </p>
              </div>
              <Badge variant="outline" className="w-fit text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 border-border">
                Communication
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Direct Notifications */}
              <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden flex flex-col h-full">
                <CardHeader className="border-b border-border bg-transparent px-8 py-5">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
                    <Bell className="w-5 h-5 text-primary" /> My Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-grow bg-transparent overflow-y-auto max-h-[600px] custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="text-center py-16">
                      <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium text-base">You're all caught up!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {notifications.map((notif) => (
                        <div key={notif.id} className="flex gap-4 p-6 hover:bg-muted/30 transition-colors group">
                          <div className="p-2.5 bg-primary/10 text-primary rounded-xl h-fit border border-primary/20 shadow-sm flex-shrink-0">
                            <Bell className="w-5 h-5" />
                          </div>
                          <div className="space-y-1.5 flex-grow">
                            <div className="flex justify-between items-start gap-4">
                              <h4 className="text-base font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">{notif.title}</h4>
                              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap bg-muted px-2 py-1 rounded-md">{new Date(notif.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{notif.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Org-wide Announcements */}
              <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden flex flex-col h-full">
                <CardHeader className="border-b border-border bg-transparent px-8 py-5">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
                    <Award className="w-5 h-5 text-amber-500" /> Institution Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-grow bg-transparent overflow-y-auto max-h-[600px] custom-scrollbar">
                  {announcements.length === 0 ? (
                    <div className="text-center py-16">
                      <Award className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium text-base">No recent announcements.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {announcements.map((ann) => (
                        <div key={ann.id} className="flex gap-4 p-6 hover:bg-muted/30 transition-colors group">
                          <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl h-fit border border-amber-500/20 shadow-sm flex-shrink-0">
                            <Award className="w-5 h-5" />
                          </div>
                          <div className="space-y-1.5 flex-grow">
                            <div className="flex justify-between items-start gap-4">
                              <h4 className="text-base font-semibold text-foreground tracking-tight group-hover:text-amber-600 transition-colors">{ann.title}</h4>
                              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap bg-muted px-2 py-1 rounded-md">{new Date(ann.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{ann.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredClasses.map((cls) => {
                      const live = isClassLive(cls);
                      const isOnline = cls.type === 'ONLINE' || Boolean(cls.meetingLink);
                      return (
                        <div
                          key={cls.id}
                          className={cn(
                            "relative group flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300",
                            "hover:shadow-xl hover:-translate-y-1.5",
                            live ? "bg-gradient-to-br from-emerald-500/10 via-background to-background border-emerald-500/40 shadow-emerald-500/10" : "bg-card/60 backdrop-blur-md border-border/50 shadow-lg hover:border-primary/50"
                          )}
                        >
                          {/* Top decorative accent */}
                          <div className={cn(
                            "absolute top-0 left-0 right-0 h-1.5 opacity-80 group-hover:opacity-100 transition-opacity", 
                            live ? "bg-emerald-500" : isOnline ? "bg-gradient-to-r from-purple-500 to-indigo-500" : "bg-gradient-to-r from-primary to-blue-500"
                          )}></div>
                          
                          {/* Live pulse indicator background */}
                          {live && (
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
                          )}

                          <div className="p-5 space-y-4 flex-grow relative z-10">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              {cls.recordingUrl || isOnline ? (
                                <Badge
                                  variant="outline"
                                  className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px] gap-1.5 shadow-sm"
                                >
                                  <Video className="w-3 h-3" />
                                  {cls.recordingUrl ? 'Recorded' : 'Online'}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-primary/10 text-primary border-primary/30 text-[10px] gap-1.5 shadow-sm"
                                >
                                  <MapPin className="w-3 h-3" />
                                  Campus
                                </Badge>
                              )}

                              {live ? (
                                <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] gap-1.5 shadow-md shadow-emerald-500/20 animate-pulse">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></div>
                                  LIVE NOW
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] font-semibold text-muted-foreground bg-muted/80 backdrop-blur-sm border border-border/50 shadow-sm">
                                  {cls.status || 'SCHEDULED'}
                                </Badge>
                              )}
                            </div>

                            <div className="pt-2">
                              <h4 className="font-bold text-foreground text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">{cls.title}</h4>
                              <p className="text-xs text-primary/80 font-semibold mt-1.5 flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5" />
                                <span className="truncate">
                                  {cls.program?.university?.name ? (
                                    <span className="opacity-70">[{cls.program.university.name}] </span>
                                  ) : null}
                                  {cls.program?.name || profile?.program?.name}
                                </span>
                              </p>
                            </div>

                            <div className="space-y-2 text-xs text-muted-foreground pt-3 border-t border-border/40">
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-muted/50 rounded-md text-foreground/70"><Calendar className="w-3.5 h-3.5" /></div>
                                <span className="font-medium">
                                  {new Date(cls.startTime).toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-muted/50 rounded-md text-foreground/70"><Clock className="w-3.5 h-3.5" /></div>
                                <span className="font-medium">
                                  {new Date(cls.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(cls.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {cls.teacher && (
                                <div className="flex items-center gap-2.5">
                                  <div className="p-1.5 bg-muted/50 rounded-md text-foreground/70"><User className="w-3.5 h-3.5" /></div>
                                  <span className="truncate">Instructor: <strong className="text-foreground">{cls.teacher.name}</strong></span>
                                </div>
                              )}
                              {!isOnline && (
                                <div className="flex items-center gap-2.5">
                                  <div className="p-1.5 bg-primary/10 rounded-md text-primary"><MapPin className="w-3.5 h-3.5" /></div>
                                  <span className="truncate">Location: <strong className="text-foreground">{cls.roomOrLocation || 'Campus'}</strong></span>
                                </div>
                              )}
                              {cls.notes && (
                                <div className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 p-2.5 rounded-lg border border-amber-500/20 italic leading-relaxed shadow-inner">
                                  <AlertCircle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                                  {cls.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="p-5 pt-0 mt-auto relative z-10">
                            {/* Attendance Status & Action Section */}
                            <div className="p-3 rounded-xl border border-border/60 bg-muted/30 backdrop-blur-sm space-y-2 mb-3 shadow-sm">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-foreground/90 flex items-center gap-1.5">
                                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                                  Attendance
                                </span>
                                {cls.myAttendance ? (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] py-0.5 px-2 font-bold flex items-center gap-1 shadow-sm",
                                      cls.myAttendance.status === 'PRESENT'
                                        ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/40 dark:text-emerald-400"
                                        : "bg-destructive/15 text-destructive border-destructive/40"
                                    )}
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    {cls.myAttendance.status}
                                  </Badge>
                                ) : isOnline ? (
                                  <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-sm">
                                    Pending
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-muted-foreground bg-muted border-muted-foreground/30 shadow-sm">
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
                                  className="w-full text-xs h-8 gap-2 border-primary/40 text-primary hover:bg-primary hover:text-white transition-all font-bold shadow-sm"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  {markingAttendance === cls.id ? 'Registering...' : 'Register as Present'}
                                </Button>
                              )}

                              {/* Info for Offline Class */}
                              {!isOnline && !cls.myAttendance && (
                                <p className="text-[10px] text-muted-foreground/80 italic text-center mt-1">
                                  Instructor will mark attendance in class.
                                </p>
                              )}
                            </div>

                            {cls.recordingUrl || (isOnline && cls.meetingLink) ? (
                              <Button 
                                size="sm" 
                                className={cn(
                                  "w-full text-xs gap-2 h-9 font-bold shadow-md transition-all hover:scale-[1.02]",
                                  cls.recordingUrl 
                                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-none"
                                    : live 
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-none animate-pulse hover:animate-none"
                                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                                )} 
                                asChild
                              >
                                <a
                                  href={cls.recordingUrl || cls.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => {
                                    if (!cls.myAttendance) handleRegisterAttendance(cls.id);
                                  }}
                                >
                                  {cls.recordingUrl ? <PlayCircle className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                                  {cls.recordingUrl ? 'Watch Recording' : 'Join Live Session'}
                                  <ExternalLink className="w-3.5 h-3.5 opacity-70 ml-auto" />
                                </a>
                              </Button>
                            ) : null}
                            
                            {cls.meetingPassword && !cls.recordingUrl && (
                              <div className="flex items-center justify-between text-[11px] bg-muted/50 px-3 py-1.5 rounded-lg mt-3 border border-border/40">
                                <span className="text-muted-foreground font-medium">Passcode:</span>
                                <span className="font-mono font-bold text-foreground tracking-wider bg-background px-1.5 py-0.5 rounded text-xs shadow-sm border">{cls.meetingPassword}</span>
                              </div>
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

        {/* CURRICULUM & MATERIALS */}
        {activeTab === 'materials' && (
          <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-border/50">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary shadow-sm">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                    My Curriculum
                    <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                  </h1>
                </div>
                <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
                  Access your course structure, view recorded video lectures, and download study materials.
                </p>
              </div>
              <Badge variant="outline" className="w-fit text-[11px] font-semibold uppercase tracking-wider text-primary bg-primary/5 border-primary/20 px-3 py-1 shadow-sm">
                Self-Paced Learning
              </Badge>
            </div>

            {(!classes || classes.length === 0) ? (
              <div className="text-center py-20 text-muted-foreground border rounded-2xl bg-card/30">
                <BookOpen className="w-12 h-12 mx-auto opacity-20 mb-4" />
                <p className="font-medium text-lg">No curriculum data found for your batch.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT SIDE: Content (Video, Materials, Rating) */}
                <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
                  {selectedCurriculumLesson ? (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      {/* Content Header & Video Player */}
                      <Card className="border-none shadow-xl overflow-hidden bg-card/60 backdrop-blur-xl rounded-3xl ring-1 ring-border/50">
                        {selectedCurriculumLesson.lesson.videoUrl ? (
                          <div ref={playerContainerRef} className="relative w-full aspect-video bg-black flex flex-col items-center justify-center group overflow-hidden rounded-xl">
                            <div className="absolute inset-0">
                              {getYouTubeEmbedUrl(selectedCurriculumLesson.lesson.videoUrl) ? (
                                <iframe
                                  src={getYouTubeEmbedUrl(selectedCurriculumLesson.lesson.videoUrl)}
                                  className="w-full h-full border-0 absolute top-0 left-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                ></iframe>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/20">
                                  Invalid or unsupported video link format
                                </div>
                              )}
                            </div>
                            {/* Big Play Button Overlay Removed */}
                          </div>
                        ) : (
                          <div className="bg-gradient-to-br from-muted/50 to-muted/20 w-full aspect-[21/9] flex flex-col items-center justify-center border-b border-border/50">
                            <div className="p-6 rounded-full bg-background/50 shadow-sm mb-4">
                              <BookOpen className="w-10 h-10 text-muted-foreground/40" />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground">Lecture Materials</h3>
                            <p className="text-muted-foreground text-sm mt-1">No video lecture available for this session.</p>
                          </div>
                        )}
                        <CardContent className="p-8 lg:p-10">
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-[10px] font-bold text-primary bg-primary/5 border-primary/20 tracking-wide uppercase px-2.5 py-0.5">
                                {selectedCurriculumLesson.cls.name}
                              </Badge>
                              <span className="text-muted-foreground/40 text-xs">/</span>
                              <Badge variant="outline" className="text-[10px] font-bold text-foreground/70 bg-muted/50 tracking-wide uppercase px-2.5 py-0.5">
                                {selectedCurriculumLesson.mod.title}
                              </Badge>
                            </div>
                            <div className="flex items-start justify-between gap-6">
                              <h2 className="text-3xl lg:text-4xl font-extrabold text-foreground leading-tight tracking-tight">{selectedCurriculumLesson.lesson.title}</h2>
                              <div className="flex-shrink-0 mt-2">
                                {selectedCurriculumLesson.lesson.isCompleted ? (
                                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 text-sm font-bold border-emerald-500/30 shadow-sm">
                                    <CheckCircle className="w-4 h-4 mr-1.5" /> Completed
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="px-4 py-1.5 text-sm font-bold border-transparent text-muted-foreground bg-muted shadow-sm">
                                    <Clock className="w-4 h-4 mr-1.5" /> Pending
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {selectedCurriculumLesson.lesson.description && (
                              <p className="text-foreground/70 font-medium text-base leading-relaxed mt-2 mb-4 max-w-4xl">{selectedCurriculumLesson.lesson.description}</p>
                            )}
                            
                            {/* Embedded Assessment inside Video Card */}
                            {loadingAssessment ? (
                              <div className="flex items-center mt-4">
                                <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                                <span className="text-sm text-muted-foreground">Loading assessment...</span>
                              </div>
                            ) : lessonAssessment ? (
                              <div className="mt-4 pt-6 border-t border-border">
                                <div className="flex items-center gap-2 mb-6">
                                  <CheckSquare className="w-5 h-5 text-primary" />
                                  <h3 className="text-lg font-semibold text-foreground">Lesson Assessment: {lessonAssessment.title}</h3>
                                </div>
                                {lessonAssessment.studentAttempts && lessonAssessment.studentAttempts.length > 0 && !takingAssessment ? (
                                  <div className="space-y-4">
                                    <div className="p-5 rounded-xl border border-border bg-muted/20">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <h4 className="font-medium text-foreground">Your Last Attempt</h4>
                                          <p className="text-sm text-muted-foreground mt-1">Score: {lessonAssessment.studentAttempts[0].score}% (Passing: {lessonAssessment.passingScore}%)</p>
                                        </div>
                                        <Badge variant={lessonAssessment.studentAttempts[0].passed ? "secondary" : "destructive"} className="px-4 py-1">
                                          {lessonAssessment.studentAttempts[0].passed ? "Passed" : "Failed"}
                                        </Badge>
                                      </div>
                                    </div>
                                    {!lessonAssessment.studentAttempts[0].passed && (
                                      <Button onClick={() => setTakingAssessment(true)} className="w-full">
                                        Retry Assessment
                                      </Button>
                                    )}
                                  </div>
                                ) : takingAssessment || (lessonAssessment.studentAttempts && lessonAssessment.studentAttempts.length === 0) ? (
                                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                    {lessonAssessment.studentAttempts && lessonAssessment.studentAttempts.length === 0 && !takingAssessment ? (
                                      <Button onClick={() => setTakingAssessment(true)} className="w-full text-base font-semibold h-12 shadow-sm" variant="premium">
                                        Start Assessment
                                      </Button>
                                    ) : (
                                      <>
                                        {lessonAssessment.description && (
                                          <p className="text-sm text-muted-foreground">{lessonAssessment.description}</p>
                                        )}
                                        <div className="space-y-6">
                                          {lessonAssessment.questions.map((q: any, qIndex: number) => (
                                            <div key={q.id} className="p-6 rounded-xl border border-border bg-muted/10">
                                              <h5 className="font-medium text-foreground mb-4">{qIndex + 1}. {q.questionText}</h5>
                                              <div className="space-y-2">
                                                {(Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : [])).map((opt: string, oIndex: number) => {
                                                  const ans = assessmentAnswers.find(a => a.questionId === q.id);
                                                  const isSelected = ans?.selectedIndex === oIndex;
                                                  return (
                                                    <label key={oIndex} className={cn(
                                                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                                                      isSelected ? "bg-primary/10 border-primary text-primary" : "bg-card border-border hover:bg-muted/50 text-foreground"
                                                    )}>
                                                      <input
                                                        type="radio"
                                                        name={`q-${q.id}`}
                                                        checked={isSelected}
                                                        onChange={() => {
                                                          const newAnswers = [...assessmentAnswers];
                                                          const idx = newAnswers.findIndex(a => a.questionId === q.id);
                                                          if (idx >= 0) newAnswers[idx].selectedIndex = oIndex;
                                                          setAssessmentAnswers(newAnswers);
                                                        }}
                                                        className="w-4 h-4 text-primary focus:ring-primary border-primary"
                                                      />
                                                      <span className="text-sm font-medium">{opt}</span>
                                                    </label>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                        <Button 
                                          onClick={handleSubmitAssessment} 
                                          disabled={submittingAssessment} 
                                          className="w-full h-12 text-base font-bold shadow-sm"
                                        >
                                          {submittingAssessment ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                                          {submittingAssessment ? 'Submitting...' : 'Submit Assessment'}
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                          </div>
                        </CardContent>
                      </Card>

                      {/* Locked Alert */}
                      {!selectedCurriculumLesson.lesson.isCompleted && (
                        <div className="flex items-start gap-3 p-5 rounded-xl bg-muted/50 border border-border text-foreground/80 shadow-sm mt-6">
                          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium text-foreground">Materials Locked</h4>
                            <p className="text-sm mt-1">Complete this lesson's live session or requirements to unlock its study materials and assignments.</p>
                          </div>
                        </div>
                      )}

                      {/* Materials Section */}
                      {selectedCurriculumLesson.lesson.isCompleted && (
                        <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden mt-6">
                          <CardHeader className="pb-4 border-b border-border bg-transparent px-8 pt-6">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground" /> Study Materials
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-8">
                            {selectedCurriculumLesson.lesson.materials && selectedCurriculumLesson.lesson.materials.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedCurriculumLesson.lesson.materials.map((mat: any) => {
                                  const desiredFilename = `${selectedCurriculumLesson.cls.name} - ${selectedCurriculumLesson.mod.title} - ${selectedCurriculumLesson.lesson.title} - ${mat.title}${mat.fileName ? ' - ' + mat.fileName : ''}`;
                                  const url = api.getFileUrl(mat.fileUrl, desiredFilename);
                                  return (
                                    <div key={mat.id} className="group flex flex-col justify-between p-5 rounded-xl border border-border bg-transparent hover:border-foreground/20 hover:bg-muted/30 transition-all duration-300">
                                      <div className="flex items-start gap-4 overflow-hidden mb-5">
                                        <div className="p-2.5 rounded-lg bg-muted text-foreground">
                                          <Download className="w-4 h-4" />
                                        </div>
                                        <div className="overflow-hidden">
                                          <p className="text-sm font-semibold text-foreground truncate">{mat.title}</p>
                                          <p className="text-xs font-medium text-muted-foreground truncate mt-1">{mat.fileName || 'Document'}</p>
                                        </div>
                                      </div>
                                      <Button className="w-full text-xs h-9 rounded-lg" variant="outline" asChild>
                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                          View Material
                                        </a>
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground font-medium">No study materials available for this lesson.</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Review Section */}
                      {selectedCurriculumLesson.lesson.isCompleted && selectedCurriculumLesson.lesson.canRate && (
                        <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden">
                          <CardHeader className="pb-4 border-b border-border bg-transparent px-8 pt-6">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                              <Star className="w-4 h-4 text-muted-foreground" /> Lesson Feedback
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-8">
                            {selectedCurriculumLesson.lesson.myRating ? (
                              <div className="bg-muted/30 p-6 rounded-xl border border-border">
                                <div className="flex items-center gap-2 mb-3">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} className={cn("w-5 h-5", star <= selectedCurriculumLesson.lesson.myRating ? "fill-foreground text-foreground" : "text-muted-foreground/30")} />
                                  ))}
                                  <span className="ml-3 text-xs font-semibold text-muted-foreground tracking-wide uppercase">Your Rating</span>
                                </div>
                                {selectedCurriculumLesson.lesson.myReview && (
                                  <p className="text-sm font-medium text-foreground/80 mt-3 leading-relaxed">"{selectedCurriculumLesson.lesson.myReview}"</p>
                                )}
                              </div>
                            ) : (
                              ratingSessionId === selectedCurriculumLesson.lesson.sessionId ? (
                                <div className="bg-muted/20 p-6 rounded-xl border border-border animate-in fade-in zoom-in-95">
                                  <h6 className="text-sm font-semibold mb-4 text-foreground">Rate this Lesson</h6>
                                  <div className="flex items-center gap-2 mb-6">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button key={star} onClick={() => setRatingValue(star)} className="focus:outline-none hover:scale-110 transition-transform">
                                        <Star className={cn("w-8 h-8", star <= ratingValue ? "fill-foreground text-foreground" : "text-muted-foreground/30")} />
                                      </button>
                                    ))}
                                  </div>
                                  <Textarea
                                    placeholder="Write a brief review (optional)"
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    className="mb-6 text-sm resize-none bg-background rounded-lg border-border focus-visible:ring-1 focus-visible:ring-foreground"
                                    rows={3}
                                  />
                                  <div className="flex gap-3 justify-end">
                                    <Button variant="ghost" className="rounded-lg text-sm" onClick={() => { setRatingSessionId(null); setRatingValue(0); setReviewText(''); }}>Cancel</Button>
                                    <Button onClick={handleSubmitRating} disabled={ratingValue === 0 || submittingRating} className="rounded-lg text-sm bg-foreground text-background hover:bg-foreground/90">
                                      {submittingRating ? 'Submitting...' : 'Submit Review'}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <p className="text-sm font-medium text-muted-foreground mb-5">How was this lesson? Help us improve by leaving a quick rating.</p>
                                  <Button variant="outline" className="gap-2 rounded-lg h-10 px-6 text-sm" onClick={() => { setRatingSessionId(selectedCurriculumLesson.lesson.sessionId); setRatingValue(0); setReviewText(''); }}>
                                    <Star className="w-4 h-4" /> Rate This Lesson
                                  </Button>
                                </div>
                              )
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <Card className="h-[calc(100vh-16rem)] min-h-[600px] border border-dashed border-border flex flex-col items-center justify-center p-12 text-center bg-card/30 rounded-2xl shadow-none">
                      <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-6" />
                      <h3 className="font-semibold text-2xl text-foreground mb-2 tracking-tight">Select a Lesson</h3>
                      <p className="text-base text-muted-foreground max-w-sm">Choose a lesson from the curriculum index on the right to view its content.</p>
                    </Card>
                  )}
                </div>

                {/* RIGHT SIDE: Curriculum List */}
                <div className="lg:col-span-1 space-y-4 order-1 lg:order-2">
                  <Card className="border border-border/60 shadow-xl bg-card/60 backdrop-blur-xl rounded-3xl h-[calc(100vh-16rem)] min-h-[600px] flex flex-col overflow-hidden ring-1 ring-border/50">
                    <CardHeader className="bg-muted/30 border-b border-border/50 py-4 px-6 flex-shrink-0">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Course Index
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto flex-grow custom-scrollbar bg-transparent">
                      <div className="py-4">
                        {classes.map((cls: any, clsIdx: number) => (
                          <div key={cls.id} className={cn("bg-transparent", clsIdx > 0 && "mt-6")}>
                            <div className="px-5 py-2 mb-2 flex items-center gap-2 sticky top-0 bg-card/95 backdrop-blur z-10">
                              <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                              <h4 className="font-semibold text-sm text-foreground tracking-tight">{cls.name}</h4>
                            </div>
                            <div className="flex flex-col gap-4">
                              {cls.modules?.length === 0 ? (
                                <div className="px-6 py-3 text-xs text-muted-foreground italic">No modules available</div>
                              ) : (
                                cls.modules?.map((mod: any) => (
                                  <div key={mod.id} className="bg-transparent px-3">
                                    <div 
                                      className="px-3 py-1.5 mb-1 flex items-center justify-between text-muted-foreground hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
                                      onClick={() => toggleModule(mod.id)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-border"></div>
                                        <h5 className="font-semibold text-[10px] uppercase tracking-widest">{mod.title}</h5>
                                      </div>
                                      {expandedModules[mod.id] ? (
                                        <ChevronUp className="w-3 h-3 text-muted-foreground" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                      )}
                                    </div>
                                    
                                    {/* Lessons List - Collapsible */}
                                    <div className={cn(
                                      "flex flex-col gap-0.5 ml-1 border-l border-border/50 pl-2 overflow-hidden transition-all duration-300 ease-in-out",
                                      expandedModules[mod.id] ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                                    )}>
                                      {mod.lessons?.length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-muted-foreground/60 italic">No lessons</div>
                                      ) : (
                                        mod.lessons?.map((lesson: any) => {
                                          const isSelected = selectedCurriculumLesson?.lesson.id === lesson.id;
                                          const isLocked = lesson.isLocked;
                                          return (
                                            <button
                                              key={lesson.id}
                                              disabled={isLocked}
                                              onClick={() => !isLocked && setSelectedCurriculumLesson({ cls, mod, lesson })}
                                              className={cn(
                                                "text-left px-3 py-2.5 text-sm transition-all flex flex-col gap-1 w-full rounded-lg relative group",
                                                isSelected
                                                  ? "bg-primary/10 text-primary"
                                                  : isLocked 
                                                    ? "bg-transparent text-muted-foreground/40 cursor-not-allowed"
                                                    : "bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                              )}
                                            >
                                              {isSelected && (
                                                <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary ring-4 ring-card"></div>
                                              )}
                                              <div className="flex items-start justify-between w-full gap-2">
                                                <span className={cn(
                                                  "font-medium line-clamp-2 leading-tight",
                                                  isSelected ? "text-primary" : isLocked ? "text-muted-foreground/40" : "text-foreground/80 group-hover:text-foreground"
                                                )}>
                                                  {lesson.title}
                                                </span>
                                                {lesson.isCompleted && <CheckCircle className={cn("w-3.5 h-3.5 flex-shrink-0 mt-0.5", isSelected ? "text-primary" : "text-emerald-500/80")} />}
                                                {isLocked && <Lock className="w-3 h-3 flex-shrink-0 mt-0.5 text-muted-foreground/40" />}
                                              </div>
                                              <div className={cn("flex items-center gap-3 text-[10px] font-medium uppercase tracking-wider mt-0.5", isSelected ? "text-primary/70" : "text-muted-foreground/60")}>
                                                {lesson.videoUrl && <span className="flex items-center gap-1"><Video className="w-3 h-3" /> Video</span>}
                                                {lesson.materials?.length > 0 && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Docs</span>}
                                                {!lesson.videoUrl && (!lesson.materials || lesson.materials.length === 0) && <span>Lecture</span>}
                                              </div>
                                            </button>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FEE DETAILS (PAYMENT SCHEDULES) */}
        {activeTab === 'fees' && (
          <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-border/50">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary shadow-sm">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Fee Details
                  </h1>
                </div>
                <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
                  View your payment schedules, track installments, and pay pending dues.
                </p>
              </div>
              <Badge variant="outline" className="w-fit text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 border-border">
                Financial Overview
              </Badge>
            </div>

            {/* Program Fee Details */}
            {feeStructures.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {feeStructures.map((structure) => {
                  const totalBaseFee = (structure.registrationFee || 0) + (structure.tuitionFee || 0) + (structure.examFee || 0);
                  const taxAmount = (totalBaseFee * (structure.gstPercentage || 0)) / 100;
                  const netFee = totalBaseFee + taxAmount;
                  
                  return (
                  <Card key={structure.id} className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                          {structure.program?.name || 'General Program'}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl font-bold text-foreground">
                        Program Fee Structure
                      </CardTitle>
                      {structure.specialisation && (
                        <CardDescription>{structure.specialisation}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-muted-foreground text-sm">Tuition Fee</span>
                        <span className="font-semibold text-foreground">₹{structure.tuitionFee?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-muted-foreground text-sm">Registration Fee</span>
                        <span className="font-semibold text-foreground">₹{structure.registrationFee?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-muted-foreground text-sm">Exam Fee</span>
                        <span className="font-semibold text-foreground">₹{structure.examFee?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-muted-foreground text-sm">GST ({structure.gstPercentage || 0}%)</span>
                        <span className="font-semibold text-foreground">₹{taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 bg-muted/30 px-3 rounded-lg">
                        <span className="font-semibold text-foreground">Total Fee</span>
                        <span className="font-black text-primary text-lg">₹{netFee.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )})}
              </div>
            )}

            <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                {schedules.length === 0 ? (
                  <div className="text-center py-20">
                    <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium text-lg">No payment schedules found.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {schedules.map((sched) => {
                      const isSchedOverdue = sched.status !== 'PAID' && new Date(sched.dueDate) < new Date();
                      return (
                        <div key={sched.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-6 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "p-3 rounded-xl flex-shrink-0 mt-1 shadow-sm",
                              sched.status === 'PAID' ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                                isSchedOverdue ? "bg-destructive/10 text-destructive border border-destructive/20" :
                                  "bg-muted text-muted-foreground border border-border"
                            )}>
                              {sched.status === 'PAID' ? <CheckCircle className="w-5 h-5" /> :
                                isSchedOverdue ? <AlertCircle className="w-5 h-5" /> :
                                  <Calendar className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1.5">
                                <h4 className="font-semibold text-lg text-foreground tracking-tight">Installment</h4>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px] font-bold tracking-wider uppercase border-none",
                                    sched.status === 'PAID' ? "bg-emerald-500/10 text-emerald-600" :
                                      sched.status === 'PARTIALLY_PAID' ? "bg-amber-500/10 text-amber-600" :
                                        isSchedOverdue ? "bg-destructive/10 text-destructive" :
                                          "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {sched.status}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium text-muted-foreground mb-4">
                                Due on <span className={cn(isSchedOverdue && "text-destructive font-bold")}>{new Date(sched.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              </p>
                              <div className="flex items-center gap-8 text-sm bg-muted/40 px-4 py-2.5 rounded-lg border border-border/50">
                                <div>
                                  <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold block mb-0.5">Total Amount</span>
                                  <span className="font-semibold text-foreground">${sched.amount}</span>
                                </div>
                                {sched.status !== 'PAID' && (
                                  <div>
                                    <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold block mb-0.5">Remaining Balance</span>
                                    <span className="font-bold text-foreground">${sched.balanceAmount !== undefined ? sched.balanceAmount : sched.amount}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 sm:self-center w-full sm:w-auto mt-2 sm:mt-0">
                            {sched.status !== 'PAID' && (
                              <Button
                                className="w-full sm:w-auto font-bold rounded-xl h-11 px-6 shadow-sm"
                                variant={isSchedOverdue ? "destructive" : "default"}
                                onClick={() => handlePayNowClick(sched)}
                              >
                                Pay ${sched.balanceAmount !== undefined ? sched.balanceAmount : sched.amount}
                              </Button>
                            )}
                            {sched.status === 'PAID' && (
                              <Button
                                variant="outline"
                                className="w-full sm:w-auto font-semibold rounded-xl h-11 px-6 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 pointer-events-none"
                              >
                                Paid in Full
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

            {/* INVOICES SECTION (Merged into Fees) */}
            <div className="pt-10 mt-10 border-t border-border/50 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-border/50">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary shadow-sm">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Invoices & Billing
                  </h1>
                </div>
                <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
                  View your complete billing history, download invoices, and pay outstanding balances.
                </p>
              </div>
              <Badge variant="outline" className="w-fit text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 border-border">
                Financial Records
              </Badge>
            </div>

            <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                {invoices.length === 0 ? (
                  <div className="text-center py-20">
                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium text-lg">No invoices found.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {invoices.map((inv) => {
                      const isFullyPaid = inv.status === 'PAID';
                      const isPartial = inv.status === 'PARTIALLY_PAID';

                      return (
                        <div key={inv.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "p-3 rounded-xl flex-shrink-0 mt-1 shadow-sm",
                              isFullyPaid ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                                isPartial ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                                  "bg-destructive/10 text-destructive border border-destructive/20"
                            )}>
                              {isFullyPaid ? <CheckCircle className="w-5 h-5" /> :
                                isPartial ? <AlertCircle className="w-5 h-5" /> :
                                  <FileText className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1.5">
                                <h4 className="font-semibold text-lg text-foreground tracking-tight">{inv.invoiceNumber}</h4>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px] font-bold tracking-wider uppercase border-none",
                                    isFullyPaid ? "bg-emerald-500/10 text-emerald-600" :
                                      isPartial ? "bg-amber-500/10 text-amber-600" :
                                        "bg-destructive/10 text-destructive"
                                  )}
                                >
                                  {inv.status}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium text-muted-foreground mb-4">
                                Issued on <span className="text-foreground">{new Date(inv.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              </p>
                              <div className="flex items-center gap-8 text-sm bg-muted/40 px-4 py-2.5 rounded-lg border border-border/50">
                                <div>
                                  <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold block mb-0.5">Total Amount</span>
                                  <span className="font-semibold text-foreground">${inv.amount}</span>
                                </div>
                                {!isFullyPaid && (
                                  <div>
                                    <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold block mb-0.5">Remaining Balance</span>
                                    <span className="font-bold text-destructive">${inv.balanceAmount}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0 md:self-center w-full md:w-auto mt-2 md:mt-0">
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto font-semibold rounded-xl h-11 px-5 shadow-sm border-border bg-card hover:bg-muted"
                              onClick={() => handlePrintInvoice(inv)}
                            >
                              <Printer className="w-4 h-4 mr-2" /> Print
                            </Button>

                            {inv.balanceAmount > 0 ? (
                              <Button
                                className="w-full sm:w-auto font-bold rounded-xl h-11 px-6 shadow-sm"
                                variant="premium"
                                onClick={() => handlePayNowClick(inv)}
                              >
                                Pay ${inv.balanceAmount}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                className="w-full sm:w-auto font-semibold rounded-xl h-11 px-6 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 pointer-events-none"
                              >
                                Paid in Full
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
          </div>
        )}

        {/* REFER ADMISSION */}
        {activeTab === 'refer_admission' && (
          <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-border/50">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary shadow-sm">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Refer a Student
                  </h1>
                </div>
                <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
                  Recommend our programs to your friends or family and refer them for admission.
                </p>
              </div>
              <Badge variant="outline" className="w-fit text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 border-border">
                Admissions
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden h-full">
                  <div className="bg-gradient-to-br from-primary/10 via-background to-background p-8 h-full flex flex-col justify-center items-center text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/20 shadow-inner">
                      <Gift className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">Share the Gift of Education</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                      Help your friends and family achieve their goals by referring them to our programs. If your referral successfully enrolls, they will receive priority onboarding!
                    </p>
                    <div className="space-y-4 w-full text-left">
                      <div className="flex items-center gap-3 text-sm text-foreground font-medium">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Fast-tracked admission process
                      </div>
                      <div className="flex items-center gap-3 text-sm text-foreground font-medium">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Priority counselor allocation
                      </div>
                      <div className="flex items-center gap-3 text-sm text-foreground font-medium">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Special onboarding support
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-3">
                <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-border bg-transparent px-8 py-5">
                    <CardTitle className="text-lg font-semibold text-foreground">Referral Form</CardTitle>
                    <CardDescription>Fill out the details below to submit a referral.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
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
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Full Name *</label>
                          <input
                            name="contactName"
                            type="text"
                            required
                            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            placeholder="Friend's full name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email Address *</label>
                          <input
                            name="email"
                            type="email"
                            required
                            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            placeholder="friend@example.com"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number *</label>
                          <input
                            name="phone"
                            type="tel"
                            required
                            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            placeholder="e.g. +91 9876543210"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Preferred Partner (Optional)</label>
                          <input
                            name="centerName"
                            type="text"
                            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            placeholder="e.g. TIMS EDAPPAL"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Address / Location (Optional)</label>
                        <input
                          name="address"
                          type="text"
                          className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                          placeholder="City, State"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Additional Notes</label>
                        <textarea
                          name="notes"
                          rows={3}
                          className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                          placeholder="Any program preferences or details..."
                        />
                      </div>

                      <div className="pt-2 border-t border-border/50">
                        <Button type="submit" className="w-full sm:w-auto font-bold rounded-xl h-11 px-8 shadow-sm">
                          Submit Referral
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* TERMS & CONDITIONS */}
        {activeTab === 'terms' && (
          <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-border/50">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary shadow-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Terms & Conditions
                  </h1>
                </div>
                <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
                  Review the rules, policies, and regulations of our institution.
                </p>
              </div>
              <Badge variant="outline" className="w-fit text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 border-border">
                Legal & Policies
              </Badge>
            </div>

            <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">

                  <div className="p-6 md:p-8 hover:bg-muted/30 transition-colors">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold text-sm border border-primary/20">1</div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-lg text-foreground tracking-tight">Academic Integrity & Conduct</h4>
                        <p className="text-muted-foreground leading-relaxed">Students are expected to adhere to high standards of academic honesty and conduct. Plagiarism, cheating, or behavior disrupting academic operations will lead to disciplinary actions.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 hover:bg-muted/30 transition-colors">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold text-sm border border-primary/20">2</div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-lg text-foreground tracking-tight">Fee Payment & Installments</h4>
                        <p className="text-muted-foreground leading-relaxed">Tuition fees must be settled according to the scheduled milestones. Failure to complete installment payments on or before the due date may restrict access to exams and student portal assets.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 hover:bg-muted/30 transition-colors">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold text-sm border border-primary/20">3</div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-lg text-foreground tracking-tight">Attendance Requirement</h4>
                        <p className="text-muted-foreground leading-relaxed">A minimum of 75% attendance is required in all classes and coursework to qualify for term examinations, unless approved otherwise by the academic board.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 hover:bg-muted/30 transition-colors">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold text-sm border border-primary/20">4</div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-lg text-foreground tracking-tight">Refund & Cancellation Policy</h4>
                        <p className="text-muted-foreground leading-relaxed">Admission registration fees are non-refundable. Tuition fee refunds will be processed strictly in accordance with the institution's official refund policy guidelines.</p>
                      </div>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* HELP & SUPPORT */}
        {activeTab === 'help' && (
          <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-border/50">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary shadow-sm">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Help & Support Desk
                  </h1>
                </div>
                <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
                  Need help with your courses, fee receipts, or exams? We are here to assist you.
                </p>
              </div>
              <Badge variant="outline" className="w-fit text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 border-border">
                Student Services
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Contact Cards */}
              <div className="lg:col-span-3 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Academic Queries */}
                  <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden hover:shadow-md transition-all group">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-5 border border-primary/20 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="font-semibold text-foreground text-lg mb-2">Academic Queries</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        For support with classes, study materials, or exams, reach out to our academics team.
                      </p>
                      <a href="mailto:support.academics@pypeerm.com" className="inline-flex items-center text-sm text-primary font-medium hover:underline">
                        support.academics@pypeerm.com <ArrowRight className="w-4 h-4 ml-1" />
                      </a>
                    </CardContent>
                  </Card>

                  {/* Finance & Billing */}
                  <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden hover:shadow-md transition-all group">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-5 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                        <CreditCard className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h4 className="font-semibold text-foreground text-lg mb-2">Finance & Billing</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        For issues relating to payments, remaining balances, or invoice receipts.
                      </p>
                      <a href="mailto:support.billing@pypeerm.com" className="inline-flex items-center text-sm text-emerald-600 font-medium hover:underline">
                        support.billing@pypeerm.com <ArrowRight className="w-4 h-4 ml-1" />
                      </a>
                    </CardContent>
                  </Card>

                  {/* General Office */}
                  <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden sm:col-span-2 hover:shadow-md transition-all group">
                    <CardContent className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                      <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 flex-shrink-0 group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-semibold text-foreground text-lg mb-1">General Office Support</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                          For general inquiries, campus details, and other operations support across the institution.
                        </p>
                        <a href="mailto:info@pypeerm.com" className="inline-flex items-center text-sm text-amber-600 font-medium hover:underline">
                          info@pypeerm.com <ArrowRight className="w-4 h-4 ml-1" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="lg:col-span-2">
                <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden h-full">
                  <CardHeader className="border-b border-border bg-transparent px-8 py-6">
                    <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" /> FAQ
                    </CardTitle>
                    <CardDescription>Quick answers to common questions</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      <div className="p-6 hover:bg-muted/30 transition-colors">
                        <h5 className="font-medium text-foreground mb-2">How can I print my invoice?</h5>
                        <p className="text-sm text-muted-foreground leading-relaxed">Go to the "Invoices" tab and click the printer icon next to the record you wish to download or print.</p>
                      </div>
                      <div className="p-6 hover:bg-muted/30 transition-colors">
                        <h5 className="font-medium text-foreground mb-2">Where can I access study materials?</h5>
                        <p className="text-sm text-muted-foreground leading-relaxed">Select the "Curriculum" tab in your sidebar. All videos and PDFs will be available there.</p>
                      </div>
                      <div className="p-6 hover:bg-muted/30 transition-colors">
                        <h5 className="font-medium text-foreground mb-2">How to apply for a referral fee?</h5>
                        <p className="text-sm text-muted-foreground leading-relaxed">Once your referral registers, sales agents will automatically link the lead to your record.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
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

      {/* Video Player Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
          <div className="relative w-full aspect-video bg-black flex items-center justify-center">
            {activeVideoLesson?.videoUrl ? (
              <div ref={playerContainerRef} className="relative w-full aspect-video bg-black flex flex-col items-center justify-center group overflow-hidden">
                <div className="absolute inset-0">
                  {getYouTubeEmbedUrl(activeVideoLesson.videoUrl) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(activeVideoLesson.videoUrl)}
                      className="w-full h-full border-0 absolute top-0 left-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/20">
                      Invalid or unsupported video link format
                    </div>
                  )}
                </div>
                {/* Big Play Button Overlay Removed */}
              </div>
            ) : (
              <div className="text-white/50 flex flex-col items-center">
                <Video className="w-12 h-12 mb-2 opacity-50" />
                <p>No video source available.</p>
              </div>
            )}
          </div>
          <div className="p-6 bg-slate-950 text-slate-200">
            <h3 className="text-xl font-bold text-white mb-2">{activeVideoLesson?.title}</h3>
            {activeVideoLesson?.description && (
              <p className="text-sm text-slate-400">{activeVideoLesson?.description}</p>
            )}
            <div className="mt-4 flex items-center justify-between">
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">Self-Paced Online Learning</Badge>
              <Button variant="ghost" onClick={() => setVideoDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">Close Player</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
