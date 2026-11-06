import { useState } from 'react';
import { ArrowRight, Play, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import { LandingSections } from './LandingSections';
import { LandingMore } from './LandingMore';
import { LandingBento } from './LandingBento';
import { LandingFeaturesGrid } from './LandingFeaturesGrid';
import { LandingTour } from './LandingTour';

export function LandingPage({ onGoToLogin }: { onGoToLogin: () => void }) {
  const [openModal, setOpenModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#54b947] selection:text-white">
    <div className="w-full overflow-x-clip relative flex flex-col">

      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-xl">
        <div className="px-4 sm:px-8 h-16 md:h-20 lg:h-24 grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <div
            className="flex items-center gap-2.5 md:gap-3.5 cursor-pointer"
            onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            <img src="/erm-logo-green.png" alt="PYPE ERM Logo" className="block h-12 md:h-16 lg:h-20 w-auto drop-shadow-sm" />
            <div className="flex items-baseline gap-1.5 whitespace-nowrap select-none leading-none">
              <span className="text-2xl md:text-[28px] font-bold tracking-tight text-slate-500">pype</span>
              <span className="text-xl md:text-[21px] font-black tracking-wider text-slate-900">ERM</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center justify-center gap-1 lg:gap-3" aria-label="Main">
            {[['/', 'Home'], ['#features', 'Features'], ['#preview', 'Platform'], ['/why-choose-us', 'Why Choose Us'], ['/partner-with-us', 'Partner With Us']].map(([h, l]) => (
              <a key={h} href={h} className={`inline-flex items-center h-10 px-3 text-sm font-semibold transition-colors ${h === '/' ? 'text-[#256c1d]' : 'text-slate-600 hover:text-slate-900'}`}>{l}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2 justify-self-end">
            <Button variant="ghost" className="text-slate-600 hover:text-slate-900 font-semibold text-xs sm:text-sm px-3 h-10" onClick={onGoToLogin}>
              Log in
            </Button>
            <Button
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-4 sm:px-6 rounded-full h-10 gap-1.5"
              onClick={() => setOpenModal(true)}
            >
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-slate-100 bg-white px-4 py-3 flex flex-col gap-1" aria-label="Mobile">
            {[['/', 'Home'], ['#features', 'Features'], ['#preview', 'Platform'], ['/why-choose-us', 'Why Choose Us'], ['/partner-with-us', 'Partner With Us']].map(([h, l]) => (
              <a key={h} href={h} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 text-sm">{l}</a>
            ))}
          </nav>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-4 sm:px-8 pt-10 sm:pt-16 pb-14 sm:pb-20 text-center flex flex-col items-center overflow-hidden">
        {/* Brand ribbon from the login page, kept subtle */}
        <svg aria-hidden="true" className="absolute inset-0 -z-10 w-full h-full pointer-events-none opacity-[0.28]" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lpRibbon1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#54b947" /><stop offset="50%" stopColor="#8ae47e" /><stop offset="100%" stopColor="#2c7722" />
            </linearGradient>
            <linearGradient id="lpRibbon2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#67cf57" stopOpacity="0.85" /><stop offset="100%" stopColor="#1a4f15" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <path d="M -100 800 C 300 900, 500 100, 1000 300 C 1300 400, 1200 900, 1600 700" fill="none" stroke="url(#lpRibbon1)" strokeWidth="140" strokeLinecap="round" />
          <path d="M 1200 -200 C 1100 200, 1400 600, 900 800 C 400 1000, 200 300, -200 200" fill="none" stroke="url(#lpRibbon2)" strokeWidth="110" strokeLinecap="round" />
        </svg>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-white/70 via-white/40 to-white" />


        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-5 leading-[1.1] max-w-3xl">
          One app to <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#54b947] via-emerald-600 to-teal-700">replace them all.</span>
        </h1>

        <p className="text-slate-500 text-base sm:text-lg max-w-2xl mb-8 font-medium leading-relaxed">
          All your admissions, sales, HR, and fee collections in one beautifully simple platform. Tailor-made for educational institutions.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-14 w-full sm:w-auto">
          <Button
            className="bg-[#54b947] hover:bg-[#439c36] text-white text-base font-bold px-8 h-12 rounded-full shadow-lg shadow-[#54b947]/30 transition-all"
            onClick={() => setOpenModal(true)}
          >
            Get Started <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            className="bg-white border-slate-300 text-slate-800 hover:bg-slate-50 text-base font-bold px-8 h-12 rounded-full"
            onClick={onGoToLogin}
          >
            <Play className="w-4 h-4 mr-2 fill-current" /> Watch Demo
          </Button>
        </div>

        {/* Interactive Software Pages Showcase */}
        <div id="preview" className="relative w-full max-w-6xl mx-auto scroll-mt-24">
          <span className="hidden lg:flex absolute z-20 -top-1 left-6 items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-md text-[11px] font-semibold text-slate-700"><i className="w-2 h-2 rounded-full bg-[#54b947]" />Sales Lead</span><span className="hidden lg:flex absolute z-20 top-6 right-4 items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-md text-[11px] font-semibold text-slate-700"><i className="w-2 h-2 rounded-full bg-amber-400" />Finance Officer</span><span className="hidden lg:flex absolute z-20 top-1/2 -left-6 items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-md text-[11px] font-semibold text-slate-700"><i className="w-2 h-2 rounded-full bg-sky-400" />Operations Head</span><span className="hidden lg:flex absolute z-20 top-[55%] -right-6 items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-md text-[11px] font-semibold text-slate-700"><i className="w-2 h-2 rounded-full bg-emerald-700" />HR & Dean</span>
          <LandingTour />
        </div>
      </section>

      <LandingBento />
      <LandingFeaturesGrid />

      <LandingSections onRequestDemo={() => setOpenModal(true)} />
      <LandingMore />

      {/* CTA Section */}
      <section className="relative z-10 px-4 sm:px-8 pb-12 sm:pb-16">
        <div className="relative overflow-hidden max-w-5xl mx-auto rounded-[2rem] bg-[#091f14] text-center px-6 py-14 sm:py-20 shadow-xl shadow-emerald-900/20">
          <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 600" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ctaWaveTop" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#54b947" /><stop offset="50%" stopColor="#2e8229" /><stop offset="100%" stopColor="#124317" />
              </linearGradient>
              <linearGradient id="ctaWaveBottom" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#54b947" /><stop offset="100%" stopColor="#1a5323" />
              </linearGradient>
            </defs>
            <path d="M0,0 L220,0 C280,250 150,350 0,550 Z" fill="url(#ctaWaveTop)" opacity="0.85" />
            <path d="M400,600 L100,600 C250,450 400,300 400,100 Z" fill="url(#ctaWaveBottom)" opacity="0.85" />
            <circle cx="50" cy="150" r="120" fill="#54b947" opacity="0.25" />
            <circle cx="350" cy="450" r="150" fill="#8ae47e" opacity="0.18" />
          </svg>
          <div className="relative">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">Ready to get started?</h2>
          <p className="text-base sm:text-lg text-emerald-50 font-medium mb-8 max-w-2xl mx-auto">Join hundreds of institutions that use PYPE ERM to manage their entire operation.</p>
          <Button
            className="bg-white hover:bg-emerald-50 text-[#256c1d] text-base sm:text-lg font-bold px-10 h-12 sm:h-14 rounded-full shadow-lg"
            onClick={() => setOpenModal(true)}
          >
            Sign up for free
          </Button>
          </div>
        </div>
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
                <div className="flex items-baseline gap-1.5 whitespace-nowrap select-none leading-none">
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-400">pype</span>
                  <span className="text-base sm:text-[18px] font-black tracking-wider text-white">ERM</span>
                </div>
              </div>
              
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">
                Next-generation Education Resource Management platform. Empowering institutions to streamline admissions, attendance, fees, and compliance on one unified platform.
              </p>

              {/* Status & App Badges */}
              <div className="space-y-3 pt-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/25 text-xs font-semibold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-[#54b947] animate-pulse"></span>
                  All Systems Operational
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                  {/* Google Play Store Badge */}
                  <a
                    href="https://play.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 transition-all hover:-translate-y-0.5 shadow-sm group"
                    aria-label="Get it on Google Play"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a1.532 1.532 0 0 1-.36-.615V2.429a1.53 1.53 0 0 1 .36-.615z" fill="#00D2FF"/>
                      <path d="M14.799 13.004l2.585 2.585-13.067 7.545a1.516 1.516 0 0 1-.41-.12z" fill="#00E676"/>
                      <path d="M16.413 11.39l3.185 1.84c1.196.69 1.196 1.817 0 2.507l-3.185 1.84-2.888-2.889z" fill="#FFC400"/>
                      <path d="M3.418.307l13.067 7.545-2.585 2.585-10.482-10.13a1.528 1.528 0 0 1-.41-.12z" fill="#FF3D00"/>
                    </svg>
                    <div className="flex flex-col text-left">
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold leading-tight">GET IT ON</span>
                      <span className="text-xs font-bold text-white tracking-tight leading-tight">Google Play</span>
                    </div>
                  </a>

                  {/* Apple App Store Badge */}
                  <a
                    href="https://apps.apple.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 transition-all hover:-translate-y-0.5 shadow-sm group"
                    aria-label="Download on the App Store"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 fill-white">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.71-.93 2.73 1.01.08 2.03-.5 2.64-1.23z"/>
                    </svg>
                    <div className="flex flex-col text-left">
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold leading-tight">Download on the</span>
                      <span className="text-xs font-bold text-white tracking-tight leading-tight">App Store</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
            
            {/* Col 3: Product */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li><a href="#features" className="hover:text-[#54b947] transition-colors">Features</a></li>
                <li><a href="#preview" className="hover:text-[#54b947] transition-colors">Platform</a></li>
                <li><a href="/features" className="hover:text-[#54b947] transition-colors">All Features</a></li>
                <li><a href="/why-choose-us" className="hover:text-[#54b947] transition-colors">Why Choose Us</a></li>
                <li><a href="/partner-with-us" className="hover:text-[#54b947] transition-colors">Partner With Us</a></li>
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
                <li><span className="hover:text-slate-200 cursor-default transition-colors">Payment Links</span></li>
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
    </div>
  );
}
