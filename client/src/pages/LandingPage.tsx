import { useState } from 'react';
import { 
  ArrowRight, Shield, Users, GraduationCap, DollarSign, Activity, 
  FileText, CheckCircle, Play, Smartphone, Check, Menu, X,
  LayoutDashboard, TrendingUp, Search, Bell, Filter, Building, 
  CreditCard, Sparkles, Clock, PhoneCall, CheckCircle2,
  FolderKanban, MessageSquare, Bot, Target, Calendar,
  Award, QrCode, Zap, Layers, UserCheck, Inbox,
  PieChart, Sliders, Lock, Briefcase, Tag, Headphones,
  CheckSquare, PenTool, BarChart3, HelpCircle, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';

const GlobalBrandBackground = () => (
  <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
    <svg 
      className="w-full h-full object-cover" 
      viewBox="0 0 1440 900" 
      preserveAspectRatio="xMidYMid slice" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="globalRibbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#54b947" /> 
          <stop offset="50%" stopColor="#8ae47e" /> 
          <stop offset="100%" stopColor="#2c7722" /> 
        </linearGradient>
        <linearGradient id="globalRibbonGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#67cf57" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#1a4f15" stopOpacity="0.9" />
        </linearGradient>
        
        {/* Drop shadow for ribbon */}
        <filter id="globalRibbonShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="20" stdDeviation="30" floodOpacity="0.18" floodColor="#1a4f15"/>
        </filter>
      </defs>

      {/* Canvas background fill */}
      <rect width="100%" height="100%" fill="#f8fbf7" />

      {/* The ribbon stroke 1 */}
      <path 
        d="M -100 800 C 300 900, 500 100, 1000 300 C 1300 400, 1200 900, 1600 700" 
        fill="none" 
        stroke="url(#globalRibbonGrad)" 
        strokeWidth="140" 
        strokeLinecap="round" 
        filter="url(#globalRibbonShadow)"
      />
      
      {/* The ribbon stroke 2 crossing */}
      <path 
        d="M 1200 -200 C 1100 200, 1400 600, 900 800 C 400 1000, 200 300, -200 200" 
        fill="none" 
        stroke="url(#globalRibbonGrad2)" 
        strokeWidth="110" 
        strokeLinecap="round" 
        filter="url(#globalRibbonShadow)"
      />
    </svg>
  </div>
);

export function LandingPage({ onGoToLogin }: { onGoToLogin: () => void }) {
  const [openModal, setOpenModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSoftwareTab, setActiveSoftwareTab] = useState<'sales' | 'finance' | 'operations' | 'hr'>('sales');
  const [formData, setFormData] = useState({
    orgName: '',
    adminName: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/public/org-inquiry', formData);
      toast.success('Inquiry submitted successfully! Our team will contact you shortly.');
      setOpenModal(false);
      setFormData({ orgName: '', adminName: '', email: '', phone: '', message: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-900 flex flex-col font-sans selection:bg-[#54b947] selection:text-white overflow-x-clip relative">
      
      {/* Global Background Ribbon SVG from Login page */}
      <GlobalBrandBackground />

      {/* Header / Navbar (Sticky Floating Pill) */}
      <header className="sticky top-3 sm:top-4 z-50 w-full px-3 sm:px-8 pointer-events-none transition-all">
        <div className="max-w-7xl mx-auto bg-white/90 backdrop-blur-2xl border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.03)] rounded-2xl sm:rounded-full px-3.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between transition-all pointer-events-auto">
          {/* Left Area: Logo & Brand + Nav Links */}
          <div className="flex items-center gap-3 sm:gap-7 shrink-0">
            {/* Logo & Brand */}
            <div 
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0" 
              onClick={() => {
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div className="relative flex items-center justify-center group-hover:scale-105 transition-transform">
                <img src="/erm-logo-green.png" alt="PYPE ERM Logo" className="w-10 h-10 sm:w-14 sm:h-14 object-contain drop-shadow-sm" />
              </div>
              <div className="flex items-baseline gap-1 sm:gap-1.5 whitespace-nowrap select-none">
                <span className="text-xl sm:text-[26px] font-bold tracking-tight text-slate-500">pype</span>
                <span className="text-[16px] sm:text-[20px] font-black tracking-wider text-slate-900">ERM</span>
              </div>
            </div>
            
            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 border border-slate-200/60 p-1 rounded-full text-sm font-medium text-slate-600 shadow-xs ml-4 sm:ml-8">
              <a 
                href="#features" 
                className="h-8 px-4 rounded-full flex items-center justify-center hover:text-slate-900 hover:bg-white hover:shadow-xs transition-all font-semibold leading-none"
              >
                Features
              </a>
              <a 
                href="#preview" 
                className="h-8 px-4 rounded-full flex items-center justify-center hover:text-slate-900 hover:bg-white hover:shadow-xs transition-all font-semibold leading-none"
              >
                Platform
              </a>
            </nav>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <a
              href="/download"
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-200/80 px-3.5 py-2 rounded-full transition-all shadow-xs"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mobile App</span>
            </a>
            
            <Button 
              variant="ghost" 
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-semibold text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full h-8 sm:h-9 transition-colors"
              onClick={onGoToLogin}
            >
              Log in
            </Button>
            
            <Button 
              className="bg-[#54b947] hover:bg-[#439c36] text-white font-bold text-xs sm:text-sm px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full h-8 sm:h-9 shadow-[0_4px_14px_rgba(84,185,71,0.35)] hover:shadow-[0_6px_20px_rgba(84,185,71,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center gap-1 sm:gap-1.5"
              onClick={() => setOpenModal(true)}
            >
              <span>Get Started</span>
              <ArrowRight className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </Button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors ml-0.5 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 max-w-7xl mx-auto bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl p-3 shadow-xl pointer-events-auto flex flex-col gap-1 transition-all">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-700 font-semibold hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center justify-between text-sm"
            >
              <span>Features</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
            <a 
              href="#preview" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-700 font-semibold hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center justify-between text-sm"
            >
              <span>Platform</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
            <a 
              href="/download" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-emerald-800 bg-emerald-50/80 font-semibold hover:bg-emerald-100 transition-colors flex items-center justify-between border border-emerald-100 text-sm"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#54b947]" />
                Android Mobile App
              </span>
              <span className="text-xs bg-[#54b947] text-white px-2 py-0.5 rounded-full font-bold">APK</span>
            </a>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-24 pb-14 sm:pb-20 text-center flex-1 flex flex-col items-center justify-center">
        
        {/* Playful top badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold mb-6 sm:mb-8 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-[#54b947] animate-pulse"></span>
          The all-in-one ERM for Education
        </div>
        
        <h1 className="text-4xl sm:text-6xl md:text-[5.5rem] font-black tracking-tight text-slate-900 mb-6 sm:mb-8 leading-[1.15] sm:leading-[1.1] max-w-5xl">
          One app to <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#54b947] via-emerald-600 to-teal-700">replace them all.</span>
        </h1>
        
        <p className="text-slate-500 text-base sm:text-xl md:text-2xl max-w-3xl mb-8 sm:mb-12 font-medium leading-relaxed px-2">
          All your admissions, sales, HR, and fee collections in one beautifully simple platform. Tailor-made for Indian educational institutions.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-12 sm:mb-16 w-full sm:w-auto px-4 sm:px-0">
          <Button 
            className="bg-[#54b947] hover:bg-[#439c36] text-white text-base sm:text-lg font-bold px-6 py-6 sm:px-10 sm:py-7 rounded-xl sm:rounded-2xl shadow-xl shadow-[#54b947]/25 hover:shadow-[#54b947]/40 hover:-translate-y-0.5 transition-all w-full sm:w-auto"
            onClick={() => setOpenModal(true)}
          >
            Get Started <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button 
            variant="outline" 
            className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-base sm:text-lg font-bold px-6 py-6 sm:px-10 sm:py-7 rounded-xl sm:rounded-2xl shadow-sm transition-all w-full sm:w-auto"
            onClick={onGoToLogin}
          >
            <Play className="w-5 h-5 mr-2 fill-current" /> Watch Demo
          </Button>
        </div>

        <div className="text-xs sm:text-sm font-semibold text-slate-400 mb-8 sm:mb-12 tracking-wider">
          TRUSTED BY 200+ INSTITUTIONS IN INDIA
        </div>

        {/* Interactive Software Pages Showcase */}
        <div id="preview" className="w-full max-w-6xl mx-auto">
          {/* Module Selector Tabs */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-6 px-1">
            {[
              { id: 'sales', label: 'Sales', icon: <Activity className="w-4 h-4" /> },
              { id: 'finance', label: 'Finance', icon: <DollarSign className="w-4 h-4" /> },
              { id: 'operations', label: 'Operations', icon: <GraduationCap className="w-4 h-4" /> },
              { id: 'hr', label: 'HR', icon: <Users className="w-4 h-4" /> },
            ].map(tab => {
              const isActive = activeSoftwareTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSoftwareTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ease-out shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#54b947] text-white shadow-lg shadow-[#54b947]/35 scale-105 ring-2 ring-[#54b947]/20'
                      : 'bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-xs hover:scale-[1.02]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Software Window Shell */}
          <div className="relative w-full rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-xl sm:shadow-2xl shadow-slate-200/90 mx-auto overflow-hidden">
            {/* macOS Window Controls & Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-100/80 border-b border-slate-200/80 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                <div className="hidden sm:flex items-center gap-1.5 ml-3 px-3 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-mono text-slate-500">
                  <span className="text-[#54b947]">https://</span>
                  <span>pype-erm.app/dashboard/{activeSoftwareTab}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 bg-white border border-slate-200 px-3 py-1 rounded-md text-xs text-slate-400 w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span>Search records...</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#54b947] animate-pulse" />
                  <span className="text-[11px] font-bold text-slate-700">Live Campus Mode</span>
                </div>
              </div>
            </div>
            
            <div className="flex min-h-[480px]">
              {/* Software Sidebar with Category-Specific Navigation */}
              {(() => {
                const sidebarConfig = {
                  sales: {
                    portalName: 'Sales & Enrollments',
                    user: { name: 'Karan Sharma', role: 'Sales Lead', initials: 'KS' },
                    items: [
                      { label: 'Provisional Enrollments', icon: <GraduationCap className="w-4 h-4" />, active: true },
                      { label: 'Team Review & Approvals', icon: <Users className="w-4 h-4" /> },
                      { label: 'Document Verification', icon: <FileText className="w-4 h-4" /> },
                      { label: 'Admission Confirmations', icon: <CheckCircle2 className="w-4 h-4" /> },
                      { label: 'Counselor Quotas', icon: <TrendingUp className="w-4 h-4" /> },
                    ],
                    section: 'Review Queue',
                    subItems: [
                      { label: 'Pending Review (14)', icon: <Clock className="w-4 h-4" /> },
                      { label: 'Approved Today (28)', icon: <CheckCircle2 className="w-4 h-4" /> },
                    ]
                  },
                  finance: {
                    portalName: 'Finance & Accounts',
                    user: { name: 'Priya Sundaram', role: 'Finance Officer', initials: 'PS' },
                    items: [
                      { label: 'Fee Schedules & Bills', icon: <DollarSign className="w-4 h-4" />, active: true },
                      { label: 'UPI Auto-Reconcile', icon: <CreditCard className="w-4 h-4" /> },
                      { label: 'GST Tax Invoices', icon: <FileText className="w-4 h-4" /> },
                      { label: 'Defaulters & Dues', icon: <Clock className="w-4 h-4" /> },
                      { label: 'University Payouts', icon: <Building className="w-4 h-4" /> },
                    ],
                    section: 'Reconciliation',
                    subItems: [
                      { label: '₹ Gateway Linked', icon: <CreditCard className="w-4 h-4" /> },
                      { label: 'Bank Settlement Live', icon: <CheckCircle2 className="w-4 h-4" /> },
                    ]
                  },
                  operations: {
                    portalName: 'Operations Desk',
                    user: { name: 'Rajesh Kumar', role: 'Operations Head', initials: 'RK' },
                    items: [
                      { label: 'Student Admissions', icon: <GraduationCap className="w-4 h-4" />, active: true },
                      { label: 'Document Validation', icon: <CheckCircle2 className="w-4 h-4" /> },
                      { label: 'Study Centres (18)', icon: <Building className="w-4 h-4" /> },
                      { label: 'Batch Allotments', icon: <Users className="w-4 h-4" /> },
                      { label: 'Certificates Dispatch', icon: <FileText className="w-4 h-4" /> },
                    ],
                    section: 'Affiliations',
                    subItems: [
                      { label: '18 Study Centres', icon: <Building className="w-4 h-4" /> },
                      { label: 'Intake 2026 SLAs', icon: <Shield className="w-4 h-4" /> },
                    ]
                  },
                  hr: {
                    portalName: 'People & HR',
                    user: { name: 'Dr. Amit Roy', role: 'HR & Dean', initials: 'AR' },
                    items: [
                      { label: 'Staff Directory', icon: <Users className="w-4 h-4" />, active: true },
                      { label: 'Biometric Clock Feed', icon: <Clock className="w-4 h-4" /> },
                      { label: 'Leave Authorizations', icon: <CheckCircle2 className="w-4 h-4" /> },
                      { label: 'Monthly Payroll', icon: <DollarSign className="w-4 h-4" /> },
                      { label: 'Shift Timings & Rules', icon: <Shield className="w-4 h-4" /> },
                    ],
                    section: 'Hardware & Compliance',
                    subItems: [
                      { label: 'Device 01 & 02 Online', icon: <Clock className="w-4 h-4" /> },
                      { label: 'PF & ESI Compliance', icon: <FileText className="w-4 h-4" /> },
                    ]
                  }
                }[activeSoftwareTab];

                return (
                  <div 
                    key={`sidebar-${activeSoftwareTab}`}
                    className="w-56 bg-slate-50/90 border-r border-slate-200 p-3 hidden md:flex flex-col justify-between text-xs transition-all duration-300 animate-in fade-in"
                  >
                    <div className="space-y-1">
                      <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>{sidebarConfig.portalName}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#54b947]" />
                      </div>
                      {sidebarConfig.items.map((item, idx) => (
                        <div
                          key={idx}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-all text-left ${
                            item.active
                              ? 'bg-[#54b947] text-white shadow-xs font-bold'
                              : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 cursor-default'
                          }`}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                      ))}
                      <div className="pt-3 px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {sidebarConfig.section}
                      </div>
                      {sidebarConfig.subItems.map((sub, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 px-3 py-2 text-slate-500 font-medium">
                          {sub.icon}
                          <span>{sub.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Logged In User Pill Specific to Module */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#54b947] text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {sidebarConfig.user.initials}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-800 text-xs truncate">{sidebarConfig.user.name}</div>
                        <div className="text-[10px] text-slate-400">{sidebarConfig.user.role}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Dynamic Software Screen Content */}
              <div className="flex-1 p-4 sm:p-7 bg-white flex flex-col text-left relative overflow-hidden">
                {/* Animated & Blurred Page Wrapper */}
                <div 
                  key={activeSoftwareTab} 
                  className="filter blur-[4px] opacity-80 select-none pointer-events-none transition-all duration-500 ease-out animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-2"
                >
                {/* 1. SALES PAGE */}
                {activeSoftwareTab === 'sales' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900">Student Provisional Enrollments</h3>
                          <span className="bg-emerald-50 text-[#54b947] border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            Team Review Active
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                          Provisional student enrollments, counselor team review, eligibility clearances & fee validation.
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => setOpenModal(true)}
                        className="bg-[#54b947] hover:bg-[#439c36] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
                      >
                        + Provisional Enrollment
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {[
                        { label: 'Provisional Enrollments', val: '1,420', sub: 'Current Academic Cycle', color: 'text-slate-900', icon: <GraduationCap className="w-4 h-4 text-[#54b947]" /> },
                        { label: 'Team Reviews Pending', val: '38', sub: 'SLA < 24 Hours', color: 'text-amber-600', icon: <Clock className="w-4 h-4 text-amber-600" /> },
                        { label: 'Approved & Cleared', val: '1,280', sub: '90.1% clearance rate', color: 'text-emerald-600', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
                        { label: 'Confirmed Admissions', val: '₹34.2 L', sub: 'Advance seat fee paid', color: 'text-slate-900', icon: <DollarSign className="w-4 h-4 text-slate-700" /> }
                      ].map(kpi => (
                        <div key={kpi.label} className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500">{kpi.label}</span>
                            <div className="p-1.5 rounded-lg bg-white border border-slate-200/80">{kpi.icon}</div>
                          </div>
                          <div>
                            <div className={`text-xl sm:text-2xl font-black ${kpi.color}`}>{kpi.val}</div>
                            <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">{kpi.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Provisional Student Enrollments & Team Review Table */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between">
                        <span>Provisional Student Enrollments & Team Review</span>
                        <span>Review Stage</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        {[
                          { student: 'Aarav Sharma', appNo: 'APP-2025-0842', course: 'B.Tech Computer Science & AI', counselor: 'Counselor: Pooja M.', badge: 'Team Review Pending', bColor: 'bg-amber-50 text-amber-700 border-amber-200' },
                          { student: 'Meera Reddy', appNo: 'APP-2025-0914', course: 'MBA Executive Marketing', counselor: 'Counselor: Karan S.', badge: 'Provisional Approved', bColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                          { student: 'Aditya Bansal', appNo: 'APP-2025-0792', course: 'BCA Cyber Security & Forensics', counselor: 'Counselor: Neha P.', badge: 'Documents Verified', bColor: 'bg-blue-50 text-blue-700 border-blue-200' },
                          { student: 'Swati Gupta', appNo: 'APP-2025-1033', course: 'M.Sc Biotechnology & Genetics', counselor: 'Counselor: Pooja M.', badge: 'Final Fee Seat Confirmed', bColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                        ].map((item, idx) => (
                          <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                            <div>
                              <div className="font-bold text-slate-900">{item.student} <span className="text-slate-400 font-normal">({item.appNo})</span></div>
                              <div className="text-slate-500 text-[11px]">{item.course} • {item.counselor}</div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${item.bColor}`}>
                              {item.badge}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. FINANCE PAGE */}
                {activeSoftwareTab === 'finance' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900">Finance & Fee Collections</h3>
                          <span className="bg-emerald-50 text-[#54b947] border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            ₹ Engine Active
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                          Automated WhatsApp payment links, instant UPI reconciliation, and GST receipts.
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => setOpenModal(true)}
                        className="bg-[#54b947] hover:bg-[#439c36] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
                      >
                        + Create Fee Invoice
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {[
                        { label: 'Quarterly Collections', val: '₹8.45 Cr', sub: '97.4% recovery rate', color: 'text-emerald-600', icon: <DollarSign className="w-4 h-4 text-[#54b947]" /> },
                        { label: 'Overdue Balance', val: '₹32.5 L', sub: 'WhatsApp alerts sent', color: 'text-amber-600', icon: <TrendingUp className="w-4 h-4 text-amber-600" /> },
                        { label: 'GST Receipts Issued', val: '4,120', sub: '100% Tax Compliant', color: 'text-slate-900', icon: <FileText className="w-4 h-4 text-slate-700" /> },
                        { label: 'Unmatched Transactions', val: '0', sub: 'Zero reconciliation gap', color: 'text-teal-600', icon: <CheckCircle2 className="w-4 h-4 text-teal-600" /> }
                      ].map(kpi => (
                        <div key={kpi.label} className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500">{kpi.label}</span>
                            <div className="p-1.5 rounded-lg bg-white border border-slate-200/80">{kpi.icon}</div>
                          </div>
                          <div>
                            <div className={`text-xl sm:text-2xl font-black ${kpi.color}`}>{kpi.val}</div>
                            <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">{kpi.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Fees Ledger */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between">
                        <span>Live Fee Transactions & Invoices</span>
                        <span>Mode / Receipt</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        {[
                          { inv: 'INV-2026-8812', student: 'Siddharth Rao (B.Tech Year 2)', amt: '₹65,000', method: 'UPI Instant Settlement', status: 'Paid & Receipt #PYPE-8812' },
                          { inv: 'INV-2026-8813', student: 'Sneha Kulkarni (MBA Semester 1)', amt: '₹38,000', method: 'HDFC NetBanking', status: 'Paid & Receipt #PYPE-8813' },
                          { inv: 'INV-2026-8814', student: 'Priya Sundaram (BCA Final Year)', amt: '₹85,000', method: 'Debit Card', status: 'Paid & Receipt #PYPE-8814' },
                          { inv: 'INV-2026-8815', student: 'Rahul Mehra (Diploma Hostel Fee)', amt: '₹18,500', method: 'Pending Payment', status: 'Due in 3 days (Reminder active)' },
                        ].map((item, idx) => (
                          <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                            <div>
                              <div className="font-bold text-slate-900">{item.student}</div>
                              <div className="text-slate-400 text-[11px]">{item.inv} • {item.method}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-black text-slate-900">{item.amt}</div>
                              <span className={`text-[10px] font-bold ${item.status.startsWith('Paid') ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. OPERATIONS PAGE */}
                {activeSoftwareTab === 'operations' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900">Academic Operations & Admissions</h3>
                          <span className="bg-emerald-50 text-[#54b947] border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            Session 2026-27
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                          Admissions enrollment wizard, study centre mapping, and batch allocations.
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => setOpenModal(true)}
                        className="bg-[#54b947] hover:bg-[#439c36] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
                      >
                        + Enroll New Student
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {[
                        { label: 'Total Enrolled Students', val: '4,850', sub: 'Across 18 centres', color: 'text-slate-900', icon: <GraduationCap className="w-4 h-4 text-[#54b947]" /> },
                        { label: 'Applications Verified', val: '892', sub: 'Zero backlog', color: 'text-emerald-600', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
                        { label: 'Affiliated Centres', val: '18', sub: '100% SLA Compliant', color: 'text-teal-600', icon: <Building className="w-4 h-4 text-teal-600" /> },
                        { label: 'Batch Allocation', val: '99.4%', sub: 'Class assigned', color: 'text-slate-900', icon: <Users className="w-4 h-4 text-slate-700" /> }
                      ].map(kpi => (
                        <div key={kpi.label} className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500">{kpi.label}</span>
                            <div className="p-1.5 rounded-lg bg-white border border-slate-200/80">{kpi.icon}</div>
                          </div>
                          <div>
                            <div className={`text-xl sm:text-2xl font-black ${kpi.color}`}>{kpi.val}</div>
                            <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">{kpi.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Operations / Admissions List */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between">
                        <span>Admissions Pipeline & Study Centre Allotment</span>
                        <span>Stage Status</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        {[
                          { name: 'Ananya Sharma', app: 'ADM-2026-904', course: 'B.Tech Computer Science', mark: '94.6% in 10+2', badge: 'Verified & Confirmed', bColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                          { name: 'Rohan M. Verma', app: 'ADM-2026-905', course: 'MBA International Business', mark: '88.2% Graduation', badge: 'Fees Paid (₹65,000)', bColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                          { name: 'Kavita S. Patel', app: 'ADM-2026-906', course: 'BCA Cloud Computing', mark: '89.4% in 10+2', badge: 'Docs in Verification', bColor: 'bg-amber-50 text-amber-700 border-amber-200' },
                          { name: 'Bengaluru Central Campus', app: 'Affiliated Branch 01', course: '1,840 Students Active', mark: '99.4% Operations SLA', badge: 'Centre Active', bColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                        ].map((candidate, idx) => (
                          <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#54b947]/15 text-[#54b947] font-black flex items-center justify-center shrink-0">
                                {candidate.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{candidate.name} <span className="text-slate-400 font-normal">({candidate.app})</span></div>
                                <div className="text-slate-500 text-[11px]">{candidate.course} • {candidate.mark}</div>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${candidate.bColor}`}>
                              {candidate.badge}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. HR PAGE */}
                {activeSoftwareTab === 'hr' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900">HR & Biometric Attendance</h3>
                          <span className="bg-emerald-50 text-[#54b947] border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            Device 01 & 02 Connected
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                          Real-time biometric punch-in logs, leave approvals, and Indian-compliant payroll.
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => setOpenModal(true)}
                        className="bg-[#54b947] hover:bg-[#439c36] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
                      >
                        Process Monthly Payroll
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {[
                        { label: 'Staff Present Today', val: '248 / 254', sub: '97.6% attendance', color: 'text-emerald-600', icon: <Users className="w-4 h-4 text-[#54b947]" /> },
                        { label: 'On-Time Punctuality', val: '96.2%', sub: 'Avg punch: 08:52 AM', color: 'text-slate-900', icon: <TrendingUp className="w-4 h-4 text-emerald-600" /> },
                        { label: 'Pending Leaves', val: '6 Requests', sub: 'Awaiting HOD approval', color: 'text-amber-600', icon: <Clock className="w-4 h-4 text-amber-600" /> },
                        { label: 'Monthly Payroll', val: '₹42.8 L', sub: 'PF/ESI auto calculated', color: 'text-slate-900', icon: <DollarSign className="w-4 h-4 text-slate-700" /> }
                      ].map(kpi => (
                        <div key={kpi.label} className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500">{kpi.label}</span>
                            <div className="p-1.5 rounded-lg bg-white border border-slate-200/80">{kpi.icon}</div>
                          </div>
                          <div>
                            <div className={`text-xl sm:text-2xl font-black ${kpi.color}`}>{kpi.val}</div>
                            <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">{kpi.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Attendance Logs */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between">
                        <span>Live Biometric Clock-In Feed</span>
                        <span>Status</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        {[
                          { staff: 'Dr. Amit Roy', role: 'Dean - Computer Science', punch: '08:48 AM', device: 'Fingerprint Sensor #1', badge: 'Present & On Time', bColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                          { staff: 'Sunita Nair', role: 'Associate Professor (Math)', punch: '08:54 AM', device: 'Face ID Terminal #2', badge: 'Present & On Time', bColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                          { staff: 'Vikas Singh', role: 'Finance & Accounts Officer', punch: '08:58 AM', device: 'Fingerprint Sensor #1', badge: 'Present & On Time', bColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                          { staff: 'Pooja Deshmukh', role: 'Lab Assistant (Physics)', punch: '--:--', device: 'Casual Leave Approved', badge: 'Authorized Leave', bColor: 'bg-blue-50 text-blue-700 border-blue-200' },
                        ].map((log, idx) => (
                          <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                            <div>
                              <div className="font-bold text-slate-900">{log.staff}</div>
                              <div className="text-slate-500 text-[11px]">{log.role} • Punch: {log.punch} ({log.device})</div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${log.bColor}`}>
                              {log.badge}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ClickUp-Style Infinite Grid Wall with Real Edge-to-Edge CSS Mask Blending */}
      <section id="features" className="py-20 sm:py-32 relative z-10 overflow-hidden w-full">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mb-12 sm:mb-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#256c1d] text-xs font-bold mb-4 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#54b947]" />
              Modular ERP Platform
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 sm:mb-6">
              Save time and <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#256c1d] via-[#54b947] to-[#1a5323]">get more done.</span>
            </h2>
            <p className="text-slate-500 text-base sm:text-lg md:text-xl font-medium">
              Everything you need to manage your institution, brought together in a single intuitive workspace.
            </p>
          </div>
        </div>

        {/* Full-width container with true CSS gradient mask fade on left and right */}
        <div className="w-full overflow-x-auto pb-6 pt-2">
          <div 
            className="w-full flex justify-center px-4"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)'
            }}
          >
            <div className="min-w-[1240px] w-full max-w-[1360px] border-t border-l border-emerald-950/15 grid grid-cols-10 bg-white/70 backdrop-blur-sm">

              {/* ROW 1 */}
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Layers className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Course Batches</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-50 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Search className="w-6 h-6 text-slate-600 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">Unified Search</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Check className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={2} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Admin Tasks</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Activity className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Branch Pipeline</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <FileText className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Curriculum</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Bot className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">WhatsApp Bot</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Calendar className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Calendar</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Sliders className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Doc Verify</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <FolderKanban className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-all">Portfolios</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Briefcase className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Fee Templates</span>
              </div>

              {/* ROW 2 */}
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Bell className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Dues Alerts</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <PieChart className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Collections MIS</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Target className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Intake Goals</span>
              </div>

              {/* CENTER CARD 1: Student Admissions (Spans 2 cols, 2 rows) - Styled like Projects with Green Theme */}
              <div className="col-span-2 row-span-2 border-r border-b border-emerald-950/10 bg-gradient-to-b from-emerald-50/40 via-white to-white flex flex-col items-center justify-between p-6 relative overflow-hidden group cursor-pointer hover:bg-emerald-50/20 hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-xl transition-all z-10">
                <div className="w-full flex justify-center pt-2">
                  {/* Floating Micro UI Preview */}
                  <div className="w-full max-w-[190px] bg-white rounded-xl shadow-md border border-emerald-100 p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-bold">Needs Review 5</span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">Enrolled 3</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex -space-x-1.5">
                        <div className="w-4 h-4 rounded-full bg-[#54b947] text-[8px] text-white flex items-center justify-center font-bold">AS</div>
                        <div className="w-4 h-4 rounded-full bg-emerald-700 text-[8px] text-white flex items-center justify-center font-bold">RV</div>
                      </div>
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-3/4 h-full bg-[#54b947]"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 pb-1">
                  <div className="w-5 h-5 rounded-md bg-[#54b947] text-white flex items-center justify-center font-black text-xs shadow-xs">
                    <GraduationCap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xl font-black text-slate-900 group-hover:text-emerald-950 transition-colors">Admissions</span>
                </div>
              </div>

              {/* CENTER CARD 2: Provisional & Team Review (Spans 2 cols, 2 rows) - Styled like Docs with Green Theme */}
              <div className="col-span-2 row-span-2 border-r border-b border-emerald-950/10 bg-gradient-to-b from-teal-50/40 via-white to-white flex flex-col items-center justify-between p-6 relative overflow-hidden group cursor-pointer hover:bg-teal-50/20 hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-xl transition-all z-10">
                <div className="w-full flex justify-center pt-2">
                  {/* Floating Stack Preview */}
                  <div className="w-full max-w-[190px] relative">
                    <div className="absolute -top-1 left-3 right-3 h-14 bg-teal-50/60 rounded-lg border border-teal-100"></div>
                    <div className="relative bg-white rounded-xl shadow-md border border-teal-100 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-800">
                        <span>Provisional SLA Review</span>
                        <span className="text-[8px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">Approved</span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-1 bg-teal-200 rounded-full w-full"></div>
                        <div className="h-1 bg-slate-100 rounded-full w-4/5"></div>
                        <div className="h-1 bg-slate-100 rounded-full w-2/3"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 pb-1">
                  <div className="w-5 h-5 rounded-md bg-teal-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    <Users className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xl font-black text-slate-900 group-hover:text-teal-950 transition-colors">Team Review</span>
                </div>
              </div>

              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Calendar className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Exam Sprints</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Target className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">Custom Status</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Bot className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">AI Notice Draft</span>
              </div>

              {/* ROW 3 */}
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Zap className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Gateway Webhook</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Award className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Merit Awards</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <FileText className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Intake Forms</span>
              </div>
              {/* (Center cards span here) */}
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Zap className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Automations</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Sliders className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">Custom Fields</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Clock className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Timesheets</span>
              </div>

              {/* ROW 4 */}
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Bot className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">AI Counselor</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Target className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Quota Priorities</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Clock className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">Fee Timelines</span>
              </div>

              {/* CENTER CARD 3: Fee Collections (Spans 2 cols, 2 rows) - Styled like Brain with Green / Emerald Theme */}
              <div className="col-span-2 row-span-2 border-r border-b border-emerald-950/10 bg-gradient-to-b from-emerald-50/30 via-white to-white flex flex-col items-center justify-between p-6 relative overflow-hidden group cursor-pointer hover:bg-emerald-50/20 hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-xl transition-all z-10">
                <div className="w-full flex justify-center pt-2">
                  {/* Floating Fee Reconcile Dialog */}
                  <div className="w-full max-w-[190px] bg-white rounded-xl shadow-md border border-emerald-100 p-2.5 space-y-2">
                    <div className="text-[9px] text-slate-400 font-medium">UPI Reconciliation (Instant)</div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50/80 border border-emerald-100 text-[9px] text-[#256c1d]">
                      <Sparkles className="w-2.5 h-2.5 text-[#54b947]" />
                      <span>Term II Settlement: ₹48,500</span>
                    </div>
                    <div className="text-[8px] font-bold text-slate-700 flex items-center justify-between pt-0.5">
                      <span>Webhook HDFC-089</span>
                      <span className="text-[7px] bg-emerald-100 text-[#1a5323] px-1 py-0.2 rounded font-bold">MATCHED ✓</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 pb-1">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#256c1d] to-[#54b947] text-white flex items-center justify-center text-xs shadow-xs">
                    ₹
                  </div>
                  <span className="text-xl font-black text-slate-900 group-hover:text-emerald-950 transition-colors">Collections</span>
                </div>
              </div>

              {/* CENTER CARD 4: HR & Attendance (Spans 2 cols, 2 rows) - Styled like Chat with Green Theme */}
              <div className="col-span-2 row-span-2 border-r border-b border-emerald-950/10 bg-gradient-to-b from-green-50/40 via-white to-white flex flex-col items-center justify-between p-6 relative overflow-hidden group cursor-pointer hover:bg-green-50/20 hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-xl transition-all z-10">
                <div className="w-full flex justify-center pt-2">
                  {/* Floating Bio-Sync Log */}
                  <div className="w-full max-w-[190px] bg-white rounded-xl shadow-md border border-emerald-100 p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#54b947] text-white text-[8px] flex items-center justify-center font-bold">JD</div>
                      <div className="h-2 w-20 bg-emerald-100 rounded-full"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[8px] flex items-center justify-center font-bold">SK</div>
                      <div className="h-2 w-14 bg-slate-200 rounded-full"></div>
                    </div>
                    <div className="flex items-center gap-1 pt-1 text-[8px] text-slate-500 font-semibold">
                      <span>📍 Main Campus</span>
                      <span className="text-emerald-700">• 98.4% On Time</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 pb-1">
                  <div className="w-5 h-5 rounded-md bg-[#256c1d] text-white flex items-center justify-center font-black text-xs shadow-xs">
                    <Clock className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xl font-black text-slate-900 group-hover:text-emerald-950 transition-colors">Bio-Attendance</span>
                </div>
              </div>

              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Play className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Video Lectures</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <LayoutDashboard className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">Campus View</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Lock className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">SSO & 2FA</span>
              </div>

              {/* ROW 5 */}
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Inbox className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">SMS & Alerts</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <LayoutDashboard className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Executive MIS</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Clock className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">Shift Tracking</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <FolderKanban className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">Kanban Quotas</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Layers className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Branch Scopes</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Users className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Parents Portal</span>
              </div>

              {/* ROW 6: Continuous full 10-column row spanning across below the 4 focal cards */}
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-20 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Tag className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Custom Tags</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-40 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Headphones className="w-6 h-6 text-slate-600 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">24/7 Support</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-55 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <CheckSquare className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Checklists</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-55 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Calendar className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Scheduling</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <FileText className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Spreadsheets</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <PenTool className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Whiteboards</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-55 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <BarChart3 className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Gantt Charts</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-55 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <TrendingUp className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Roadmaps</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-40 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Inbox className="w-6 h-6 text-slate-600 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Inbox</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-20 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Users className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Teams</span>
              </div>

            </div>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="py-16 sm:py-32 bg-transparent text-center px-4 sm:px-6 relative z-10">
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 mb-4 sm:mb-8">Ready to get started?</h2>
        <p className="text-base sm:text-xl text-slate-500 font-medium mb-8 sm:mb-10 max-w-2xl mx-auto">Join hundreds of institutions that use PYPE ERM to manage their entire operation.</p>
        <Button 
          className="bg-[#54b947] hover:bg-[#439c36] text-white text-base sm:text-xl font-bold px-8 py-5 sm:px-12 sm:py-8 rounded-xl sm:rounded-2xl shadow-xl shadow-[#54b947]/30 hover:shadow-[#54b947]/40 transition-all hover:-translate-y-1 w-full sm:w-auto"
          onClick={() => setOpenModal(true)}
        >
          Sign up for free
        </Button>
      </section>

      {/* Footer */}
      <footer className="bg-[#06140d] text-slate-300 pt-14 sm:pt-20 pb-10 sm:pb-12 border-t border-emerald-950/60 relative overflow-hidden">
        {/* Subtle top glow matching brand green */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-32 bg-[#54b947]/10 blur-[100px] pointer-events-none rounded-full" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12 sm:mb-16">
            
            {/* Col 1 & 2: Brand & Mission */}
            <div className="col-span-2 md:col-span-3 lg:col-span-2 space-y-4 sm:space-y-6">
              <div 
                className="flex items-center gap-3 cursor-pointer group w-fit"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <div className="relative flex items-center justify-center group-hover:scale-105 transition-transform">
                  <img src="/erm-logo-green.png" alt="PYPE ERM Logo" className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-sm" />
                </div>
                <div className="flex items-baseline gap-1.5 whitespace-nowrap select-none">
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-400">pype</span>
                  <span className="text-base sm:text-[18px] font-black tracking-wider text-white">ERM</span>
                </div>
              </div>
              
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">
                Next-generation Education Resource Management platform. Empowering Indian institutions to streamline admissions, attendance, fees, and compliance on one unified platform.
              </p>

              {/* Status & App Badges */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/25 text-xs font-semibold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-[#54b947] animate-pulse"></span>
                  All Systems Operational
                </div>
                <a 
                  href="/download"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#54b947]" />
                  <span>Android App</span>
                </a>
              </div>
            </div>
            
            {/* Col 3: Product */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li><a href="#features" className="hover:text-[#54b947] transition-colors">Features</a></li>
                <li><a href="#preview" className="hover:text-[#54b947] transition-colors">Platform</a></li>
                <li><a href="/download" className="hover:text-[#54b947] transition-colors">Mobile App</a></li>
              </ul>
            </div>

            {/* Col 4: Solutions */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Capabilities</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li><span className="hover:text-slate-200 cursor-default transition-colors">Admissions</span></li>
                <li><span className="hover:text-slate-200 cursor-default transition-colors">Fee Schedules</span></li>
                <li><span className="hover:text-slate-200 cursor-default transition-colors">Attendance</span></li>
                <li><span className="hover:text-slate-200 cursor-default transition-colors">Study Centres</span></li>
              </ul>
            </div>

            {/* Col 5: Security & Platform */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Compliance</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li><span className="hover:text-slate-200 cursor-default transition-colors">Rupee (₹) Engine</span></li>
                <li><span className="hover:text-slate-200 cursor-default transition-colors">GST Receipts</span></li>
                <li><span className="hover:text-slate-200 cursor-default transition-colors">RBAC Security</span></li>
                <li><span className="hover:text-slate-200 cursor-default transition-colors">Cloud Encrypted</span></li>
              </ul>
            </div>

            {/* Col 6: Quick Action */}
            <div className="col-span-2 sm:col-span-1 lg:col-span-1 space-y-3 sm:space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Institution Access</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ready to transform your academic operations?
              </p>
              <Button 
                onClick={() => setOpenModal(true)}
                className="w-full bg-[#54b947] hover:bg-[#439c36] text-white font-bold text-xs h-10 rounded-xl shadow-lg shadow-[#54b947]/20 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Request Setup</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

          </div>
          
          {/* Bottom Bar: Copyright & Terms */}
          <div className="pt-6 sm:pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
            <p>© {new Date().getFullYear()} PYPE ERM. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6">
              <span className="hover:text-slate-300 cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-slate-300 cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-slate-300 cursor-pointer transition-colors">Security</span>
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="hover:text-[#54b947] font-semibold transition-colors"
              >
                Back to Top ↑
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Manage Organisation Form Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-white border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
          <DialogHeader className="mb-4 sm:mb-6">
            <DialogTitle className="text-2xl sm:text-3xl font-black text-slate-900 text-left">Get Started</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-left mt-1 sm:mt-2 text-xs sm:text-sm">
              Fill in the details below to request setup assistance for your institution.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-1 sm:space-y-1.5">
              <Label htmlFor="orgName" className="text-slate-700 font-bold text-xs sm:text-sm">Organisation Name</Label>
              <Input 
                id="orgName"
                placeholder="e.g. EduTech International"
                value={formData.orgName}
                onChange={e => setFormData(prev => ({ ...prev, orgName: e.target.value }))}
                className="h-11 sm:h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#54b947] focus:ring-[#54b947] text-sm"
                required
              />
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <Label htmlFor="adminName" className="text-slate-700 font-bold text-xs sm:text-sm">Admin Name</Label>
              <Input 
                id="adminName"
                placeholder="e.g. Rajesh Kumar"
                value={formData.adminName}
                onChange={e => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                className="h-11 sm:h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#54b947] focus:ring-[#54b947] text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-1.5">
                <Label htmlFor="email" className="text-slate-700 font-bold text-xs sm:text-sm">Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  placeholder="rajesh@company.com"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="h-11 sm:h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#54b947] focus:ring-[#54b947] text-sm"
                  required
                />
              </div>
              <div className="space-y-1 sm:space-y-1.5">
                <Label htmlFor="phone" className="text-slate-700 font-bold text-xs sm:text-sm">Phone Number</Label>
                <Input 
                  id="phone"
                  placeholder="e.g. +91 9876543210"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="h-11 sm:h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#54b947] focus:ring-[#54b947] text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <Label htmlFor="message" className="text-slate-700 font-bold text-xs sm:text-sm">Additional Message (Optional)</Label>
              <Textarea 
                id="message"
                placeholder="Describe your requirements..."
                value={formData.message}
                onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                className="bg-slate-50 border-slate-200 focus:bg-white focus:border-[#54b947] focus:ring-[#54b947] min-h-[80px] sm:min-h-[100px] resize-none text-sm"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-3 sm:pt-4">
              <Button 
                type="button"
                variant="ghost" 
                onClick={() => setOpenModal(false)}
                className="text-slate-500 hover:text-slate-700 font-bold h-11 sm:h-12 rounded-xl text-sm"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={submitting}
                className="bg-[#54b947] hover:bg-[#439c36] text-white font-bold h-11 sm:h-12 px-6 sm:px-8 rounded-xl shadow-md active:scale-95 transition-all text-sm"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
