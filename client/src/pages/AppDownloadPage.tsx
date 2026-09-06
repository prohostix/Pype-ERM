import React, { useEffect, useState } from 'react';
import { 
  Download, 
  Smartphone, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  QrCode, 
  Copy, 
  Check, 
  Clock, 
  Bell, 
  TrendingUp, 
  BookOpen, 
  Lock, 
  MapPin, 
  Share2, 
  Fingerprint, 
  WifiOff, 
  FileText, 
  ArrowRight, 
  CheckCircle,
  ExternalLink,
  ChevronDown,
  Info,
  Calendar,
  Layers,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

interface ReleaseManifest {
  versionName: string;
  versionCode: number;
  releaseNotes: string;
  apkFileName: string;
  releasedAt: string;
}

export function AppDownloadPage() {
  const [manifest, setManifest] = useState<ReleaseManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeScreenTab, setActiveScreenTab] = useState<'punch' | 'notifications' | 'sales' | 'classes'>('punch');

  // Compute full direct download URL
  const baseUrl = api.getBaseUrl().replace(/\/$/, '');
  const downloadEndpoint = `${baseUrl}/app-releases/download/mobile`;
  const downloadUrl = downloadEndpoint.startsWith('http') 
    ? downloadEndpoint 
    : `${window.location.origin}${downloadEndpoint}`;

  const fetchRelease = async () => {
    setLoading(true);
    try {
      const res = await api.get('/app-releases/latest?platform=mobile');
      if (res.data) {
        setManifest(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to fetch latest release manifest:', err);
      setManifest({
        versionName: '1.0.11',
        versionCode: 12,
        releaseNotes: 'Enhanced geofenced punch in/out, real-time push notification sync, live class stream launcher, and fast mobile admissions pipeline.',
        apkFileName: 'ERM-Mobile-v1.0.11.apk',
        releasedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelease();
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const formattedDate = manifest?.releasedAt
    ? new Date(manifest.releasedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recent Build';

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(downloadUrl)}`;

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans selection:bg-[#7b68ee] selection:text-white relative">
      
      {/* ═════════════════════════════════════════════════════
          MINIMALIST APP HEADER (Dedicated Download Experience)
      ═════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm group-hover:bg-[#7b68ee] transition-colors">
                <img src="/pype-logo.png" alt="PYPE" className="w-5 h-5 object-contain invert brightness-0" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                PYPE<span className="text-[#7b68ee]">.</span>
              </span>
            </a>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">
              <Smartphone className="w-3 h-3 text-[#7b68ee]" />
              Android Release Hub
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors hidden sm:block"
            >
              Sign In to Web
            </a>
            <a
              href={downloadUrl}
              download={manifest?.apkFileName || 'ERM-Mobile-v1.0.11.apk'}
              className="flex items-center gap-1.5 bg-[#7b68ee] hover:bg-[#6a5acd] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download APK</span>
            </a>
          </div>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════
          HERO SPLIT STAGE: Action Center + Live Interactive Phone
      ═════════════════════════════════════════════════════ */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT: Download Action Hub (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-6 text-left">
            
            {/* Version status pill */}
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#7b68ee]/10 border border-[#7b68ee]/20 text-[#7b68ee] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#7b68ee] animate-ping" />
              Official Stable Release • v{manifest?.versionName || '1.0.11'}
            </div>

            <div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-[1.1] mb-3">
                PYPE ERM <br className="hidden sm:block" />
                <span className="text-[#7b68ee]">for Android</span>
              </h1>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
                Experience high-performance attendance punch in/out, real-time push notifications, rapid sales lead conversions, and online live classes natively on Android.
              </p>
            </div>

            {/* Main Action Box */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/60 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a
                  href={downloadUrl}
                  download={manifest?.apkFileName || 'ERM-Mobile-v1.0.11.apk'}
                  className="flex-1 flex items-center justify-center gap-3 bg-[#7b68ee] hover:bg-[#6a5acd] text-white font-bold text-sm sm:text-base py-4 px-6 rounded-2xl shadow-lg shadow-[#7b68ee]/25 transition-transform active:scale-[0.99] group"
                >
                  <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                  <span>Download Latest APK</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-normal">~58 MB</span>
                </a>

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold transition-colors"
                  title="Scan with Android Phone"
                >
                  <QrCode className="w-4 h-4 text-[#7b68ee]" />
                  <span>Scan QR</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold transition-colors"
                  title="Copy Direct Link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              {/* Build metadata row */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                <div className="py-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Version</span>
                  <span className="text-xs font-bold text-slate-800">v{manifest?.versionName || '1.0.11'} (#{manifest?.versionCode || 12})</span>
                </div>
                <div className="py-1 border-x border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Requires</span>
                  <span className="text-xs font-bold text-slate-800">Android 8.0+</span>
                </div>
                <div className="py-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Updated</span>
                  <span className="text-xs font-bold text-slate-800">{formattedDate}</span>
                </div>
              </div>

              {/* Release Notes Preview */}
              {manifest?.releaseNotes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[#7b68ee] shrink-0 mt-0.5" />
                  <p className="line-clamp-2 leading-relaxed">
                    <strong className="text-slate-800 font-semibold">What's new: </strong>
                    {manifest.releaseNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Malware-Free & Official Build</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#7b68ee]" />
                <span>Direct SSL Encrypted Delivery</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-slate-600" />
                <span>Biometric Auth Ready</span>
              </span>
            </div>

          </div>

          {/* RIGHT: Interactive Mobile Simulator (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            
            {/* Screen Tab Selector */}
            <div className="w-full max-w-sm mb-3 p-1 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveScreenTab('punch')}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all ${
                  activeScreenTab === 'punch' 
                    ? 'bg-[#7b68ee] text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Punch In
              </button>
              <button
                type="button"
                onClick={() => setActiveScreenTab('notifications')}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all ${
                  activeScreenTab === 'notifications' 
                    ? 'bg-[#7b68ee] text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Push Alerts
              </button>
              <button
                type="button"
                onClick={() => setActiveScreenTab('sales')}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all ${
                  activeScreenTab === 'sales' 
                    ? 'bg-[#7b68ee] text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sales Flow
              </button>
              <button
                type="button"
                onClick={() => setActiveScreenTab('classes')}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all ${
                  activeScreenTab === 'classes' 
                    ? 'bg-[#7b68ee] text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Live Classes
              </button>
            </div>

            {/* Mobile Device Mockup Frame */}
            <div className="w-full max-w-sm rounded-[42px] border-[7px] border-slate-900 bg-slate-950 p-2.5 shadow-2xl shadow-slate-900/30 relative">
              {/* Phone Speaker Notch */}
              <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center">
                <div className="w-8 h-1 bg-slate-800 rounded-full" />
              </div>

              {/* Phone Screen Canvas */}
              <div className="w-full bg-white rounded-[32px] overflow-hidden min-h-[440px] flex flex-col border border-slate-100 text-left relative">
                
                {/* Mobile Top Bar */}
                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#7b68ee] flex items-center justify-center font-bold text-white text-[10px]">
                      P
                    </div>
                    <span className="font-bold">PYPE ERM</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">09:41 AM</span>
                </div>

                {/* DYNAMIC SCREEN CONTENT */}
                <div className="p-4 flex-1 flex flex-col justify-between bg-slate-50/50">
                  
                  {/* SCREEN 1: ATTENDANCE & PUNCH IN/OUT */}
                  {activeScreenTab === 'punch' && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">Rahul Sharma</p>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            Main Campus (GPS Verified)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          Punched In
                        </span>
                      </div>

                      {/* Central Interactive Dial */}
                      <div className="py-4 flex flex-col items-center justify-center text-center">
                        <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#7b68ee] to-[#6a5acd] p-1.5 shadow-lg shadow-[#7b68ee]/30 flex items-center justify-center">
                          <div className="w-full h-full bg-white rounded-full flex flex-col items-center justify-center">
                            <Clock className="w-5 h-5 text-[#7b68ee] mb-0.5" />
                            <span className="text-sm font-black text-slate-900">07h 45m</span>
                            <span className="text-[9px] font-semibold text-slate-400">Shift Elapsed</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span>Punch In Time: 09:02 AM</span>
                          <span>Auto-Geofence</span>
                        </div>
                        <p className="text-[11px] text-emerald-700">Offline BA Center • 32 Enrolled Students Present</p>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 2: PUSH NOTIFICATIONS */}
                  {activeScreenTab === 'notifications' && (
                    <div className="space-y-2.5 animate-in fade-in duration-200">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recent Mobile Push Alerts</p>
                      
                      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span className="flex items-center gap-1 text-[#7b68ee]">
                            <Bell className="w-3 h-3" /> Class Scheduled
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">Just now</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Dr. Sharma scheduled <strong>Modern History Lecture</strong> for today at 11:30 AM in Room 302.
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" /> Leave Approved
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">1h ago</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Your medical leave request for Sep 12 was approved by Academic Manager.
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span className="flex items-center gap-1 text-purple-600">
                            <Sparkles className="w-3 h-3" /> New Student
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">3h ago</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Suman Rao submitted admission documents for BA-SVSU program.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 3: ENHANCED SALES FLOW */}
                  {activeScreenTab === 'sales' && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="p-3.5 bg-gradient-to-r from-slate-900 to-[#1E293B] text-white rounded-2xl shadow-sm">
                        <span className="text-[10px] text-slate-300 uppercase font-semibold">Monthly Admissions</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <h4 className="text-lg font-black text-white">₹1,45,000</h4>
                          <span className="text-[10px] text-emerald-400 font-bold">+18% Target</span>
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                        <p className="text-xs font-bold text-slate-900">Generate Student Link</p>
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                          <span className="truncate">pypeerm.com/student-apply?ref=counselor</span>
                          <Share2 className="w-3.5 h-3.5 text-[#7b68ee] shrink-0 ml-1" />
                        </div>
                        <button className="w-full py-2 rounded-xl bg-[#7b68ee] hover:bg-[#6a5acd] text-white text-xs font-bold transition-colors">
                          Share to WhatsApp
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-1">
                        <span>14 Leads Active</span>
                        <span>8 Pending Documents</span>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 4: LIVE CLASSES & LMS */}
                  {activeScreenTab === 'classes' && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                            • Live in 10 mins
                          </span>
                          <span className="text-[10px] text-slate-400">BA (BA-SVSU)</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">Contemporary Indian History</h4>
                        <p className="text-[10px] text-slate-500">Instructor: Prof. Anjali Menon</p>
                        <button className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm">
                          Join Live Classroom
                        </button>
                      </div>

                      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                        <p className="text-xs font-bold text-slate-900">Digital Course Materials</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-700 p-2 bg-slate-50 rounded-lg">
                          <span className="truncate">Unit-3_Lecture_Notes.pdf</span>
                          <span className="text-[10px] text-[#7b68ee] font-bold">Download</span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Mobile Bottom Navigation Bar */}
                <div className="bg-white border-t border-slate-100 px-4 py-2 flex items-center justify-between text-slate-400">
                  <div className="flex flex-col items-center">
                    <Clock className="w-4 h-4 text-[#7b68ee]" />
                    <span className="text-[9px] font-bold text-[#7b68ee] mt-0.5">Punch</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Bell className="w-4 h-4" />
                    <span className="text-[9px] mt-0.5">Alerts</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-[9px] mt-0.5">Sales</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-[9px] mt-0.5">Classes</span>
                  </div>
                </div>

              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 text-center">
              * Tap tabs above to explore mobile screens
            </p>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════
            BENTO GRID: THE 4 CORE PILLARS
        ═════════════════════════════════════════════════════ */}
        <section className="mt-20 pt-12 border-t border-slate-200">
          <div className="text-left mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Engineered for Real Campus Operations
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-1">
              Built to solve attendance delays, communication gaps, and sales follow-up latency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. ATTENDANCE & PUNCH IN/OUT */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Attendance Management & Punch In/Out
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Geofenced mobile check-in with GPS verification. Faculty and employees punch in from campus boundaries. Teachers record offline classroom attendance sheets in seconds, while online students register attendance during live streams.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">GPS Geofence</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">Shift Counters</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">Teacher Sheets</span>
              </div>
            </div>

            {/* 2. PUSH NOTIFICATIONS */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Real-time Push Notifications
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Instant mobile notifications powered by Firebase Cloud Messaging. Receive immediate alerts when faculty schedule lectures, when leave applications are decided, and when urgent notice board bulletins are published.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">Class Alerts</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">Leave Decisions</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">Campus Bulletins</span>
              </div>
            </div>

            {/* 3. ENHANCED SALES FLOW */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7b68ee] flex items-center justify-center mb-4">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Enhanced Sales Flow & Leads
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Counselors and admissions teams can track candidate status on the move. Generate customized student invite links, share directly to WhatsApp, verify document readiness, and monitor tuition fee collection milestones.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">1-Tap WhatsApp Link</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">Fee Verification</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">Target Tracking</span>
              </div>
            </div>

            {/* 4. LIVE CLASSES & E-BOOKS */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Live Classes & Digital LMS
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Never miss an academic lecture. Launch and join online classes directly from the mobile app. Download university-approved course notes, syllabus guides, and e-learning resources to study offline.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">1-Tap Stream</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">Offline E-Books</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">Class Timetable</span>
              </div>
            </div>

            {/* 5. BIOMETRIC SECURITY */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center mb-4">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Biometric Access & Security
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Log in instantly with Android fingerprint or face recognition. Multi-tenant database fencing ensures your institution's employee, student, and financial records are strictly isolated.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">Fingerprint Auth</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">Encrypted Cache</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">Tenant Isolation</span>
              </div>
            </div>

            {/* 6. AUTO UPDATES */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  In-App OTA Updates
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Self-hosted release updates keep your app current. Whenever a new version is released on the server, the app alerts you and updates smoothly in the background.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">OTA Server Updates</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">Auto-Sync</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">ProHostix Release</span>
              </div>
            </div>

          </div>
        </section>

        {/* ═════════════════════════════════════════════════════
            4-STEP INSTALLATION TIMELINE
        ═════════════════════════════════════════════════════ */}
        <section className="mt-20 p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm text-left">
          <div className="mb-8">
            <h3 className="text-xl font-bold text-slate-900">How to Install in 4 Simple Steps</h3>
            <p className="text-xs text-slate-500 mt-1">Direct APK installation on Android devices</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col space-y-2">
              <span className="w-7 h-7 rounded-full bg-[#7b68ee] text-white text-xs font-bold flex items-center justify-center shadow-sm">1</span>
              <h4 className="text-sm font-bold text-slate-800">Download APK</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click <strong>"Download Latest APK"</strong> or scan the QR code to save <code className="text-[#7b68ee]">ERM-Mobile.apk</code>.
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <span className="w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h4 className="text-sm font-bold text-slate-800">Open File</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tap the completed download alert from the notification drawer or your <strong>Downloads</strong> folder.
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <span className="w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">3</span>
              <h4 className="text-sm font-bold text-slate-800">Enable Unknown Apps</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                If prompted by Android, tap <strong>Settings</strong> and turn ON <strong>"Allow from this source"</strong> for Chrome.
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">4</span>
              <h4 className="text-sm font-bold text-slate-800">Install & Sign In</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tap <strong>Install</strong>. Once installed, open PYPE ERM and log in with your email and password.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* ═════════════════════════════════════════════════════
          QR CODE MODAL
      ═════════════════════════════════════════════════════ */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative text-center">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-2xl bg-[#7b68ee]/10 text-[#7b68ee] flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">Scan with Android Phone</h3>
            <p className="text-xs text-slate-500 mb-4">
              Open your camera app or QR scanner to download the APK file directly to your smartphone.
            </p>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm inline-block mb-4">
              <img
                src={qrCodeUrl}
                alt="QR Code for APK download"
                className="w-48 h-48 rounded-lg object-contain mx-auto"
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="rounded-xl text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? 'Link Copied' : 'Copy URL'}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowQrModal(false)}
                className="bg-[#7b68ee] hover:bg-[#6a5acd] text-white rounded-xl text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════
          CLEAN APP FOOTER
      ═════════════════════════════════════════════════════ */}
      <footer className="border-t border-slate-200/80 bg-white py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 tracking-tight">PYPE<span className="text-[#7b68ee]">.</span></span>
            <span>&copy; {new Date().getFullYear()} PYPE ERM. Official Android App Distribution.</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="hover:text-slate-900 transition-colors">Web Portal</a>
            <a href={downloadUrl} className="hover:text-[#7b68ee] transition-colors font-semibold text-[#7b68ee]">Direct APK</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
