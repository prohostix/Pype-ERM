import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, BookOpen, CalendarCheck, GraduationCap, IndianRupee, Menu, ShieldCheck, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import { LandingSections } from './LandingSections';
import { PublicFooter } from './marketing/PublicFooter';
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
    <div style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }} className="min-h-screen bg-white text-slate-900 selection:bg-[#54b947] selection:text-white">
    <div className="w-full overflow-x-clip relative flex flex-col">

      {/* Navbar */}
      <header className="absolute top-0 z-50 w-full bg-transparent">
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
            {[['#valuable-features', 'Features'], ['#benefits', 'Benefits'], ['#pricing', 'Pricing'], ['/partner-with-us', 'Partner With Us']].map(([h, l]) => (
              <a key={h} href={h} className={`inline-flex items-center h-10 px-3 text-sm font-medium transition-colors ${'text-slate-600 hover:text-slate-900'}`}>{l}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2 justify-self-end">
            <Button variant="ghost" className="hidden sm:inline-flex text-slate-600 hover:text-slate-900 font-semibold text-xs sm:text-sm px-3 h-10" onClick={onGoToLogin}>
              Log in
            </Button>
            <Button
              className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-[0_6px_20px_-8px_rgba(16,24,40,0.2)] font-medium text-xs sm:text-sm px-3 sm:px-5 rounded-full h-10 gap-1.5"
              onClick={() => setOpenModal(true)}
            >
              Book a Demo <ArrowUpRight className="hidden sm:block w-3.5 h-3.5" />
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
          <nav className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur px-4 py-3 flex flex-col gap-1" aria-label="Mobile">
            {[['#valuable-features', 'Features'], ['#benefits', 'Benefits'], ['#pricing', 'Pricing'], ['/partner-with-us', 'Partner With Us']].map(([h, l]) => (
              <a key={h} href={h} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2.5 rounded-2xl text-slate-700 font-semibold hover:bg-slate-100 text-sm">{l}</a>
            ))}
            <a href="/login" className="sm:hidden px-3 py-2.5 rounded-2xl text-slate-700 font-semibold hover:bg-slate-100 text-sm">Log in</a>
          </nav>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-4 sm:px-8 pt-28 sm:pt-32 pb-20 sm:pb-28 min-h-[760px] text-center flex flex-col items-center overflow-hidden">
        {/* Green light rays covering the whole first section, fading smoothly into the page below */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background: 'repeating-linear-gradient(100deg, rgba(84,185,71,.5) 0px, rgba(138,228,126,.22) 45px, rgba(255,255,255,0) 100px), linear-gradient(to bottom, rgba(84,185,71,.4), rgba(84,185,71,.08))', WebkitMaskImage: 'linear-gradient(to right, #000 0%, rgba(0,0,0,.35) 32%, rgba(0,0,0,.35) 68%, #000 100%)', maskImage: 'linear-gradient(to right, #000 0%, rgba(0,0,0,.35) 32%, rgba(0,0,0,.35) 68%, #000 100%)' }} />
        <div aria-hidden="true" className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background: 'radial-gradient(55% 45% at 50% 35%, rgba(255,255,255,.85), transparent 75%)' }} />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/5 -z-10 pointer-events-none bg-gradient-to-b from-transparent via-white/70 to-white" />

        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[76px] font-semibold tracking-tight text-slate-900 mb-6 mt-6 leading-[1.05] max-w-5xl relative z-10">
          <span className="hero-word block" style={{ animationDelay: '0ms' }}>Many software hassles.</span>{' '}
          <span className="hero-word block" style={{ animationDelay: '140ms' }}>
            <span className="bg-gradient-to-r from-[#256c1d] via-[#54b947] to-[#2c7722] bg-clip-text text-transparent pb-[0.08em] inline-block">One simple solution.</span>
          </span>
        </h1>

        <p {...reveal(1)} className="text-slate-500 text-sm sm:text-base max-w-md mb-6 leading-relaxed">
          One Platform to Run Your Entire Institution. With Smart Workflows.
        </p>

        <ul {...reveal(1)} className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-8 text-sm text-slate-600">
          {['Role-based access', 'UPI-ready fee collection', 'Guided setup & training'].map(t => (
            <li key={t} className="inline-flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#e7f6e3] text-[#256c1d] flex items-center justify-center"><Check className="w-3 h-3" /></span>{t}
            </li>
          ))}
        </ul>

        <div {...reveal(2)} className="flex flex-col sm:flex-row gap-3 mb-10 w-full sm:w-auto justify-center">
          <a href="#valuable-features" className="group inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-7 h-12 rounded-full transition-all hover:-translate-y-0.5 hover:shadow-lg">
            Explore PYPE ERM <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
          <Button
            variant="outline"
            className="bg-white border-slate-200 text-slate-800 hover:bg-slate-50 text-sm font-semibold px-7 h-12 rounded-full group transition-all hover:-translate-y-0.5 hover:shadow-lg"
            onClick={() => setOpenModal(true)}
          >
            Book a Free Demo <ArrowRight className="w-4 h-4 ml-2 -rotate-45 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Button>
        </div>

        <p {...reveal(2)} className="text-xs text-slate-500 mb-5">Everything your institution needs, in one login</p>
        <ul {...reveal(2)} className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-10 max-w-3xl">
          {([[GraduationCap, 'Admissions'], [IndianRupee, 'Fees'], [CalendarCheck, 'Attendance'], [BookOpen, 'Academics'], [Users, 'HR & Payroll'], [ShieldCheck, 'Compliance']] as const).map(([Icon, c]) => (
            <li key={c} className="inline-flex items-center gap-2 text-lg font-semibold text-slate-300"><Icon className="w-5 h-5" />{c}</li>
          ))}
        </ul>

      </section>

      <LandingSections onRequestDemo={() => setOpenModal(true)} />

      {/* Closing call to action */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div {...reveal(0, 'zoom')} className="relative overflow-hidden max-w-6xl mx-auto rounded-[2.5rem] bg-[#091f14] px-6 py-16 sm:py-24 text-center">
          <div aria-hidden="true" className="glow-pulse absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(50% 70% at 50% 0%, rgba(84,185,71,.45), transparent 70%), radial-gradient(35% 50% at 100% 100%, rgba(138,228,126,.22), transparent 70%)' }} />
          <div className="relative">
            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-white mb-5 leading-[1.1] max-w-3xl mx-auto">
              Move your institution to <span className="text-[#8ae47e]">one system.</span>
            </h2>
            <p className="text-base sm:text-lg text-emerald-50/80 mb-8 max-w-xl mx-auto">
              Tell us which software you use today, and we will show you how it works in PYPE ERM.
            </p>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-9 text-sm text-emerald-50/90">
              {['Guided setup & data migration', 'Training for your staff', 'Support after launch'].map(t => (
                <li key={t} className="inline-flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#54b947]/25 text-[#8ae47e] flex items-center justify-center"><Check className="w-3 h-3" /></span>{t}
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="bg-white hover:bg-emerald-50 text-[#256c1d] text-sm font-semibold px-8 h-12 rounded-full gap-2"
                onClick={() => setOpenModal(true)}
              >
                Book a Free Demo <ArrowUpRight className="w-4 h-4" />
              </Button>
              <a href="#valuable-features" className="inline-flex items-center justify-center rounded-full border border-white/25 text-white hover:bg-white/10 text-sm font-semibold px-8 h-12 transition-colors">
                Explore Features
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter onBookDemo={() => setOpenModal(true)} />

      {/* Book a demo modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }} className="w-[95vw] sm:max-w-[860px] p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] overflow-y-auto">
          <div className="grid md:grid-cols-[0.8fr_1.2fr]">
            {/* Intro panel */}
            <div className="relative overflow-hidden bg-[#091f14] text-white p-7 sm:p-9 flex flex-col justify-between gap-8">
              <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(70% 60% at 50% 0%, rgba(84,185,71,.45), transparent 70%), radial-gradient(50% 45% at 100% 100%, rgba(138,228,126,.22), transparent 70%)' }} />
              <img src="/erm-logo-green.png" alt="PYPE ERM" className="relative h-12 w-auto self-start" />
              <DialogHeader className="relative space-y-3 text-left">
                <DialogTitle className="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.1] text-white text-left">
                  Book a <span className="text-[#8ae47e]">Free Demo</span>
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base leading-relaxed text-emerald-50/80 text-left">
                  Share your details and our team will contact you to arrange a demo for your institution.
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-9 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="orgName" className="text-slate-700 font-semibold text-sm">Organisation name</Label>
                  <Input id="orgName" value={formData.orgName} onChange={e => setFormData(prev => ({ ...prev, orgName: e.target.value }))} className="h-12 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4 transition-all" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adminName" className="text-slate-700 font-semibold text-sm">Your name</Label>
                  <Input id="adminName" value={formData.adminName} onChange={e => setFormData(prev => ({ ...prev, adminName: e.target.value }))} className="h-12 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4 transition-all" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-700 font-semibold text-sm">Email address</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} className="h-12 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4 transition-all" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-slate-700 font-semibold text-sm">Phone number</Label>
                  <Input id="phone" placeholder="e.g. +91 9876543210" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="h-12 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4 transition-all" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-slate-700 font-semibold text-sm">Additional message <span className="font-normal text-slate-400">(optional)</span></Label>
                <Textarea id="message" placeholder="Describe your requirements..." value={formData.message} onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))} className="rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 min-h-[110px] resize-none text-sm px-4 py-3 transition-all" />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpenModal(false)} className="h-12 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="group h-12 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold gap-2 transition-all">
                  {submitting ? 'Submitting...' : <>Submit Request <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></>}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
