import { useState, type ReactNode } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PublicFooter } from './PublicFooter';
import { reveal, useScrollEffects } from './scrollEffects';

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/#preview', label: 'How it works' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/why-choose-us', label: 'Why Choose Us' },
  { href: '/partner-with-us', label: 'Partner With Us' },
];


export const SectionHeading = ({ title, sub }: { title: string; sub?: string }) => (
  <div {...reveal()} className="max-w-3xl mb-6 sm:mb-8">
    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">{title}</h2>
    {sub && <p className="text-slate-600 text-base sm:text-lg">{sub}</p>}
  </div>
);

export const PageHero = ({ title, accent, sub, children }: {
  title: string; accent: string; sub: string; children?: ReactNode;
}) => (
  <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-8 text-center">
    <h1 {...reveal()} className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1] [text-wrap:balance]">
      {title}{' '}
      <span className="text-[#256c1d]">{accent}</span>
    </h1>
    <p {...reveal(1)} className="text-slate-600 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed mb-8">{sub}</p>
    <div {...reveal(2)}>{children}</div>
  </section>
);

/** Closing call to action used at the end of the inner pages. */
export const CtaBand = ({ title, sub, label, onClick }: { title: string; sub: string; label: string; onClick: () => void }) => (
  <section className="px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
    <div {...reveal(0, 'zoom')} className="max-w-6xl mx-auto rounded-[2.5rem] bg-emerald-50 px-6 py-10 sm:py-12 text-center">
    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4">{title}</h2>
    <p className="text-base sm:text-lg text-slate-600 mb-8 max-w-2xl mx-auto">{sub}</p>
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 bg-[#256c1d] hover:bg-[#1a5323] text-white font-semibold px-7 h-12 rounded-full transition-colors"
    >
      {label} <ArrowRight className="w-4 h-4" />
    </button>
    </div>
  </section>
);

type Props = {
  children: (openInquiry: (topic?: string) => void) => ReactNode;
};

/** Shared navbar, footer and enquiry dialog for the public marketing pages. */
export function MarketingShell({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ orgName: '', adminName: '', email: '', phone: '', message: '' });
  const path = window.location.pathname;
  useScrollEffects();

  const openInquiry = (t?: string) => { setTopic(t); setOpen(true); };
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const message = [topic ? `[${topic}]` : '', form.message].filter(Boolean).join(' ').slice(0, 1000);
      await api.post('/public/org-inquiry', { ...form, message });
      toast.success('Thanks! Our team will contact you shortly.');
      setOpen(false);
      setForm({ orgName: '', adminName: '', email: '', phone: '', message: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'h-11 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:border-[#54b947] focus:ring-[#54b947] text-sm';
  const isTel = topic === 'Partnership';

  return (
    <div className="min-h-screen flex flex-col text-slate-900 font-sans bg-white selection:bg-[#54b947] selection:text-white">
      <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-xl border-b border-slate-100">
        <div className="px-4 sm:px-8 h-16 md:h-[72px] grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <a href="/" className="flex items-center gap-2.5 md:gap-3.5">
            <img src="/erm-logo-green.png" alt="PYPE ERM Logo" className="block h-10 md:h-12 w-auto" />
            <span className="flex items-baseline gap-1.5 whitespace-nowrap select-none leading-none">
              <span className="text-xl sm:text-2xl md:text-[28px] font-bold tracking-tight text-slate-500">pype</span>
              <span className="text-base sm:text-xl md:text-[21px] font-black tracking-wider text-slate-900">ERM</span>
            </span>
          </a>
          <nav className="hidden md:flex items-center justify-center gap-1 lg:gap-3" aria-label="Main">
            {NAV_LINKS.map(l => (
              <a
                key={l.href}
                href={l.href}
                aria-current={path === l.href ? 'page' : undefined}
                className={`inline-flex items-center h-10 px-3 text-sm font-semibold transition-colors ${path === l.href ? 'text-[#256c1d]' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 justify-self-end">
            <Button variant="ghost" className="hidden sm:inline-flex text-slate-600 hover:text-slate-900 font-semibold text-xs sm:text-sm px-3 h-10" onClick={() => (window.location.pathname = '/login')}>
              Log in
            </Button>
            <Button
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm px-3 sm:px-5 rounded-full h-10 gap-1.5"
              onClick={() => openInquiry()}
            >
              Book a Demo <ArrowRight className="hidden sm:block w-3.5 h-3.5" />
            </Button>
            <button
              type="button"
              className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(v => !v)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="md:hidden border-t border-slate-100 bg-white px-4 py-3 flex flex-col gap-1" aria-label="Mobile">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className="px-3 py-2.5 rounded-2xl text-slate-700 font-semibold hover:bg-slate-100 text-sm">{l.label}</a>
            ))}
            <a href="/login" className="sm:hidden px-3 py-2.5 rounded-2xl text-slate-700 font-semibold hover:bg-slate-100 text-sm">Log in</a>
          </nav>
        )}
      </header>

      <main className="flex-1">{children(openInquiry)}</main>

      <PublicFooter onBookDemo={() => openInquiry()} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-white rounded-3xl p-5 sm:p-8 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-2xl font-bold text-slate-900 text-left">{isTel ? 'Partner With Us' : 'Book a Free Demo'}</DialogTitle>
            <DialogDescription className="text-slate-500 text-left text-sm">
              {isTel ? 'Tell us about your organisation and how you would like to partner.' : 'Share your details and our team will contact you to arrange a demo for your institution.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-org" className="font-bold text-xs">{isTel ? 'Company / Institution Name' : 'Organisation Name'}</Label>
              <Input id="m-org" className={inputCls} value={form.orgName} onChange={set('orgName')} maxLength={150} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-name" className="font-bold text-xs">Your Name</Label>
              <Input id="m-name" className={inputCls} value={form.adminName} onChange={set('adminName')} maxLength={100} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-email" className="font-bold text-xs">Email</Label>
                <Input id="m-email" type="email" className={inputCls} value={form.email} onChange={set('email')} maxLength={150} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-phone" className="font-bold text-xs">Phone</Label>
                <Input id="m-phone" type="tel" placeholder="+91 9876543210" className={inputCls} value={form.phone} onChange={set('phone')} maxLength={20} pattern="\+?[0-9\s\-()]{7,20}" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-msg" className="font-bold text-xs">Message (optional)</Label>
              <Textarea id="m-msg" className="rounded-2xl bg-slate-50 border-slate-200 min-h-[90px] resize-none text-sm" value={form.message} onChange={set('message')} maxLength={900} />
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="font-semibold h-11 rounded-full">Cancel</Button>
              <Button type="submit" disabled={submitting} className="bg-[#256c1d] hover:bg-[#1a5323] text-white font-semibold h-11 px-8 rounded-full">
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
