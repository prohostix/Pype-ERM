import { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import { LandingSections } from './LandingSections';
import { LandingTour } from './LandingTour';
import { PublicFooter } from './marketing/PublicFooter';
import { CardRibbon } from './marketing/CardRibbon';
import { reveal, useScrollEffects } from './marketing/scrollEffects';

export function LandingPage({ onGoToLogin }: { onGoToLogin: () => void }) {
  // Other public pages link to /#book-demo to open the demo form here.
  const [openModal, setOpenModal] = useState(() => window.location.hash === '#book-demo');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useScrollEffects();
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
        <div className="px-4 sm:px-8 h-16 md:h-[72px] grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <div
            className="flex items-center gap-2.5 md:gap-3.5 cursor-pointer"
            onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            <img src="/erm-logo-green.png" alt="PYPE ERM Logo" className="block h-10 md:h-12 w-auto" />
            <div className="flex items-baseline gap-1.5 whitespace-nowrap select-none leading-none">
              <span className="text-xl sm:text-2xl md:text-[28px] font-bold tracking-tight text-slate-500">pype</span>
              <span className="text-base sm:text-xl md:text-[21px] font-black tracking-wider text-slate-900">ERM</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center justify-center gap-1 lg:gap-3" aria-label="Main">
            {[['/', 'Home'], ['/features', 'Features'], ['#preview', 'How it works'], ['#pricing', 'Pricing'], ['/why-choose-us', 'Why Choose Us'], ['/partner-with-us', 'Partner With Us']].map(([h, l]) => (
              <a key={h} href={h} className={`inline-flex items-center h-10 px-3 text-sm font-semibold transition-colors ${h === '/' ? 'text-[#256c1d]' : 'text-slate-600 hover:text-slate-900'}`}>{l}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2 justify-self-end">
            <Button variant="ghost" className="hidden sm:inline-flex text-slate-600 hover:text-slate-900 font-semibold text-xs sm:text-sm px-3 h-10" onClick={onGoToLogin}>
              Log in
            </Button>
            <Button
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm px-3 sm:px-5 rounded-full h-10 gap-1.5"
              onClick={() => setOpenModal(true)}
            >
              Book a Demo <ArrowRight className="hidden sm:block w-3.5 h-3.5" />
            </Button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-slate-100 bg-white px-4 py-3 flex flex-col gap-1" aria-label="Mobile">
            {[['/', 'Home'], ['/features', 'Features'], ['#preview', 'How it works'], ['#pricing', 'Pricing'], ['/why-choose-us', 'Why Choose Us'], ['/partner-with-us', 'Partner With Us']].map(([h, l]) => (
              <a key={h} href={h} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2.5 rounded-2xl text-slate-700 font-semibold hover:bg-slate-100 text-sm">{l}</a>
            ))}
            <a href="/login" className="sm:hidden px-3 py-2.5 rounded-2xl text-slate-700 font-semibold hover:bg-slate-100 text-sm">Log in</a>
          </nav>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-4 sm:px-8 pt-8 sm:pt-10 pb-8 sm:pb-10 text-center flex flex-col items-center overflow-hidden">
        {/* Brand ribbon from the login page, kept subtle */}
        <svg data-parallax="0.15" aria-hidden="true" className="absolute inset-0 -z-10 w-full h-full pointer-events-none opacity-[0.28]" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
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


        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-5 leading-[1.1] max-w-4xl">
          {['One', 'app', 'to'].map((word, i) => (
            <span key={word} className="hero-word" style={{ animationDelay: `${i * 110}ms` }}>{word}{' '}</span>
          ))}
          <br />
          {['replace', 'them', 'all.'].map((word, i) => (
            <span key={word} className="hero-word" style={{ animationDelay: `${(i + 3) * 110}ms` }}>
              <span className="gradient-text inline-block">{word}</span>{' '}
            </span>
          ))}
        </h1>

        <p {...reveal(1)} className="text-slate-600 text-base sm:text-lg max-w-2xl mb-8 leading-relaxed">
          Stop using different software for students, attendance and finance. PYPE ERM brings them into one system for your whole institution, built by Prohostix.
        </p>

        <div {...reveal(2)} className="flex flex-col sm:flex-row gap-3 mb-8 w-full sm:w-auto">
          <Button
            className="bg-[#256c1d] hover:bg-[#1a5323] text-white text-base font-semibold px-7 h-12 rounded-full transition-colors"
            onClick={() => setOpenModal(true)}
          >
            Book a Free Demo <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <a
            href="/features"
            className="inline-flex items-center justify-center bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 text-base font-semibold px-7 h-12 rounded-full transition-colors"
          >
            Explore Features
          </a>
        </div>

        {/* Interactive Software Pages Showcase */}
        <div id="preview" {...reveal(3, 'zoom')} className="relative w-full max-w-6xl mx-auto scroll-mt-24">
          <LandingTour />
        </div>
      </section>

      <LandingSections onRequestDemo={() => setOpenModal(true)} />

      {/* Closing call to action */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div {...reveal(0, 'zoom')} className="relative overflow-hidden max-w-6xl mx-auto rounded-[2.5rem] bg-[#091f14] px-6 py-12 sm:py-16 text-center">
        <CardRibbon />
        <div className="relative">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">Move your institution to one system.</h2>
        <p className="text-base sm:text-lg text-emerald-50 mb-8 max-w-2xl mx-auto">Tell us which software you use today, and we will show you how it works in PYPE ERM.</p>
        <Button
          className="bg-white hover:bg-emerald-50 text-[#256c1d] text-base font-semibold px-7 h-12 rounded-full"
          onClick={() => setOpenModal(true)}
        >
          Book a Free Demo
        </Button>
        </div>
        </div>
      </section>

      <PublicFooter onBookDemo={() => setOpenModal(true)} />

      {/* Manage Organisation Form Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-white border-slate-200 rounded-3xl p-5 sm:p-8 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-4 sm:mb-6">
            <DialogTitle className="text-2xl font-bold text-slate-900 text-left">Book a Free Demo</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-left mt-1 sm:mt-2 text-xs sm:text-sm">
              Share your details and our team will contact you to arrange a demo for your institution.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-1 sm:space-y-1.5">
              <Label htmlFor="orgName" className="text-slate-700 font-bold text-xs sm:text-sm">Organisation Name</Label>
              <Input 
                id="orgName"
                value={formData.orgName}
                onChange={e => setFormData(prev => ({ ...prev, orgName: e.target.value }))}
                className="h-11 sm:h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:border-[#54b947] focus:ring-[#54b947] text-sm"
                required
              />
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <Label htmlFor="adminName" className="text-slate-700 font-bold text-xs sm:text-sm">Your Name</Label>
              <Input 
                id="adminName"
                value={formData.adminName}
                onChange={e => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                className="h-11 sm:h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:border-[#54b947] focus:ring-[#54b947] text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-1.5">
                <Label htmlFor="email" className="text-slate-700 font-bold text-xs sm:text-sm">Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="h-11 sm:h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:border-[#54b947] focus:ring-[#54b947] text-sm"
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
                  className="h-11 sm:h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:border-[#54b947] focus:ring-[#54b947] text-sm"
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
                className="rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:border-[#54b947] focus:ring-[#54b947] min-h-[80px] sm:min-h-[100px] resize-none text-sm"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-3 sm:pt-4">
              <Button 
                type="button"
                variant="ghost" 
                onClick={() => setOpenModal(false)}
                className="text-slate-500 hover:text-slate-700 font-semibold h-11 sm:h-12 rounded-full text-sm"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={submitting}
                className="bg-[#256c1d] hover:bg-[#1a5323] text-white font-semibold h-11 sm:h-12 px-6 sm:px-8 rounded-full transition-colors text-sm"
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
