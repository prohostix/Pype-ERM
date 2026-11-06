import { IndianRupee, Layers, ShieldCheck, Smartphone, Settings2, Headphones, ArrowRight, Check, X } from 'lucide-react';
import { PREMIUM_CARD, PREMIUM_CARD_ALT, ICON_CHIP } from '../cardStyles';
import { MarketingShell, PageHero, SectionHeading } from './MarketingShell';

const REASONS = [
  { icon: IndianRupee, title: 'Built for education businesses', body: 'Installment-based fees, receipts, tax settings and study-center models are part of the product, not add-ons.' },
  { icon: Layers, title: 'One system, one source of truth', body: 'Admissions, sales, finance, HR and academics share the same records. No spreadsheets to reconcile between departments.' },
  { icon: ShieldCheck, title: 'Role-based access', body: 'Each person signs in to a dashboard designed for their job and sees only what they are permitted to.' },
  { icon: Smartphone, title: 'Web and mobile apps', body: 'Attendance with selfie and location, approvals and daily work are available on the mobile apps as well as the web.' },
  { icon: Settings2, title: 'Configured for you', body: 'We set up your organization structure, roles and fee rules so your team starts with a system that matches how you work.' },
  { icon: Headphones, title: 'Support from the people who build it', body: 'You talk to the team behind PYPE ERM, so questions and change requests reach the people who can act on them.' },
];

const COMPARE = [
  ['Student data in spreadsheets and chat groups', 'One student record across every department'],
  ['Fee follow-ups done by hand', 'Installment schedules, reminders and payment links'],
  ['Attendance on paper or separate devices', 'Biometric and mobile attendance flowing into payroll'],
  ['Partner centers managed by phone', 'Invitation, verification and approval workflow'],
];

export function WhyChooseUsPage() {
  return (
    <MarketingShell>
      {openInquiry => (
        <>
          <PageHero
            title="Why institutions choose"
            accent="PYPE ERM."
            sub="One platform designed around how education businesses actually admit students, collect fees and run teams."
          />

          {/* Reasons: bento */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {REASONS.map(({ icon: Icon, title, body }, i) => {
                const hero = i === 0;
                const wide = i === REASONS.length - 1;
                if (hero) {
                  return (
                    <article key={title} className="md:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6bd05a] via-[#54b947] to-[#1a5323] text-white p-7 sm:p-9 shadow-[0_24px_50px_-20px_rgba(44,119,34,0.6)] min-h-[220px] flex flex-col justify-between">
                      <Icon aria-hidden="true" className="absolute -right-6 -bottom-8 w-52 h-52 text-white/10" strokeWidth={1.1} />
                      <span className="relative w-12 h-12 rounded-2xl bg-white/95 text-[#2f8a24] flex items-center justify-center shadow-lg"><Icon className="w-6 h-6" /></span>
                      <div className="relative mt-8">
                        <h2 className="font-black text-2xl sm:text-3xl tracking-tight mb-2">{title}</h2>
                        <p className="text-emerald-50/90 text-sm sm:text-base leading-relaxed max-w-xl">{body}</p>
                      </div>
                    </article>
                  );
                }
                return (
                  <article key={title} className={`${i % 2 ? PREMIUM_CARD_ALT : PREMIUM_CARD} ${wide ? 'md:col-span-3 md:flex-row md:items-center' : ''} relative p-6 sm:p-7 flex flex-col gap-4 overflow-hidden`}>
                    <span aria-hidden="true" className="absolute right-5 top-3 text-5xl font-black text-emerald-100/80 select-none">{String(i + 1).padStart(2, '0')}</span>
                    <div className={`w-12 h-12 shrink-0 ${ICON_CHIP}`}><Icon className="w-6 h-6" /></div>
                    <div className="relative">
                      <h2 className="font-bold text-lg text-slate-900 mb-1.5">{title}</h2>
                      <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">{body}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Before / after */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
            <SectionHeading title="Before and after PYPE ERM" />
            <div className="hidden md:grid grid-cols-[1fr_auto_1fr] gap-4 px-2 mb-3 text-xs font-bold uppercase tracking-wider">
              <span className="text-slate-400">Without</span><span className="w-10" /><span className="text-[#256c1d]">With PYPE ERM</span>
            </div>
            <div className="space-y-4">
              {COMPARE.map(([a, b]) => (
                <div key={a} className="grid md:grid-cols-[1fr_auto_1fr] items-stretch gap-3 md:gap-4">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/70 px-5 py-4 flex items-center gap-3">
                    <span className="w-7 h-7 shrink-0 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center"><X className="w-4 h-4" /></span>
                    <span className="text-sm text-slate-500 font-medium">{a}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="w-10 h-10 rounded-full bg-white border border-emerald-200 text-[#54b947] shadow-sm flex items-center justify-center rotate-90 md:rotate-0"><ArrowRight className="w-4 h-4" /></span>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-white to-emerald-50 border border-[#54b947]/40 shadow-[0_14px_30px_-16px_rgba(44,119,34,0.4)] px-5 py-4 flex items-center gap-3">
                    <span className={`w-7 h-7 shrink-0 rounded-full ${ICON_CHIP}`}><Check className="w-4 h-4" strokeWidth={3} /></span>
                    <span className="text-sm text-slate-900 font-bold">{b}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
            <div className="relative overflow-hidden rounded-[2rem] bg-[#091f14] text-center px-6 py-14 sm:py-20 shadow-xl shadow-emerald-900/20">
              <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 600" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="whyWaveTop" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#54b947" /><stop offset="50%" stopColor="#2e8229" /><stop offset="100%" stopColor="#124317" />
                  </linearGradient>
                  <linearGradient id="whyWaveBottom" x1="100%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#54b947" /><stop offset="100%" stopColor="#1a5323" />
                  </linearGradient>
                </defs>
                <path d="M0,0 L220,0 C280,250 150,350 0,550 Z" fill="url(#whyWaveTop)" opacity="0.85" />
                <path d="M400,600 L100,600 C250,450 400,300 400,100 Z" fill="url(#whyWaveBottom)" opacity="0.85" />
                <circle cx="350" cy="450" r="150" fill="#8ae47e" opacity="0.18" />
              </svg>
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">See it with your own workflow</h2>
                <p className="text-emerald-50 mb-8 max-w-xl mx-auto">Tell us how your teams work today and we will show you how it looks in PYPE ERM.</p>
                <button
                  type="button"
                  onClick={() => openInquiry()}
                  className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-[#256c1d] font-bold px-9 h-12 rounded-full shadow-lg transition-colors"
                >
                  Request a Demo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </MarketingShell>
  );
}
