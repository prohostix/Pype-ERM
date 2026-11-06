import { Building2, Handshake, Code2, Megaphone, ArrowRight } from 'lucide-react';
import { PREMIUM_CARD, PREMIUM_CARD_ALT, ICON_CHIP } from '../cardStyles';
import { MarketingShell, PageHero, SectionHeading } from './MarketingShell';

const PARTNER_TYPES = [
  { icon: Building2, title: 'Study Centers', body: 'Run admissions for a partner university or institution through PYPE ERM, with your own dashboard, wallet and student records.', cta: 'Register your center', href: '/register' },
  { icon: Handshake, title: 'Channel & Reseller Partners', body: 'Introduce PYPE ERM to institutions you already work with and support them through rollout.', cta: 'Talk to us' },
  { icon: Code2, title: 'Technology Partners', body: 'Payment, communication, biometric and other service providers who want to integrate with the platform.', cta: 'Talk to us' },
  { icon: Megaphone, title: 'Education Consultants', body: 'Advise institutions on operations and technology? Recommend a system that fits education workflows.', cta: 'Talk to us' },
];

const STEPS = [
  { n: '1', title: 'Get in touch', body: 'Tell us about your organization and the kind of partnership you have in mind.' },
  { n: '2', title: 'We review and talk', body: 'Our team reviews your request and contacts you to discuss fit and terms.' },
  { n: '3', title: 'Onboard and launch', body: 'We set you up, share the materials and support you through your first customers or students.' },
];

export function PartnerWithUsPage() {
  return (
    <MarketingShell>
      {openInquiry => (
        <>
          <PageHero
            title="Grow with"
            accent="PYPE ERM."
            sub="Whether you run a study center, advise institutions or build technology for education, there is a way to work together."
          >
            <button
              type="button"
              onClick={() => openInquiry('Partnership')}
              className="inline-flex items-center gap-2 bg-[#54b947] hover:bg-[#439c36] text-white font-bold px-8 py-3.5 rounded-full shadow-lg shadow-[#54b947]/25 transition-colors"
            >
              Become a Partner <ArrowRight className="w-4 h-4" />
            </button>
          </PageHero>

          {/* Partner types */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <SectionHeading title="Choose how you want to work with us" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {PARTNER_TYPES.map(({ icon: Icon, title, body, cta, href }, i) => {
                const primary = i === 0;
                const action = href ? (
                  <a href={href} className={`inline-flex items-center gap-2 h-10 px-5 rounded-full text-sm font-bold transition-all hover:gap-3 ${primary ? 'bg-white text-[#256c1d] hover:bg-emerald-50' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                    {cta} <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <button type="button" onClick={() => openInquiry('Partnership')} className="inline-flex items-center gap-2 h-10 px-5 rounded-full text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all hover:gap-3">
                    {cta} <ArrowRight className="w-4 h-4" />
                  </button>
                );
                return primary ? (
                  <article key={title} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6bd05a] via-[#54b947] to-[#1a5323] text-white p-7 sm:p-8 shadow-[0_24px_50px_-20px_rgba(44,119,34,0.6)] flex flex-col gap-4 min-h-[260px]">
                    <Icon aria-hidden="true" className="absolute -right-6 -bottom-8 w-48 h-48 text-white/10" strokeWidth={1.1} />
                    <span className="relative w-14 h-14 rounded-2xl bg-white/95 text-[#2f8a24] flex items-center justify-center shadow-lg"><Icon className="w-7 h-7" /></span>
                    <div className="relative flex-1">
                      <h3 className="font-black text-2xl mb-2">{title}</h3>
                      <p className="text-emerald-50/90 text-sm sm:text-base leading-relaxed">{body}</p>
                    </div>
                    <div className="relative">{action}</div>
                  </article>
                ) : (
                  <article key={title} className={`${i % 2 ? PREMIUM_CARD_ALT : PREMIUM_CARD} p-7 sm:p-8 flex flex-col gap-4 min-h-[260px]`}>
                    <span className={`w-14 h-14 ${ICON_CHIP} rounded-2xl`}><Icon className="w-7 h-7" /></span>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-slate-900 mb-2">{title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
                    </div>
                    <div>{action}</div>
                  </article>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 text-center mt-5">Study-center registration needs an invitation link from the organization admin.</p>
          </section>

          {/* Steps */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <SectionHeading title="From first conversation to launch" />
            <ol className="relative grid md:grid-cols-3 gap-5 md:gap-6">
              <span aria-hidden="true" className="hidden md:block absolute top-[2.15rem] left-[16.6%] right-[16.6%] h-0.5 bg-gradient-to-r from-[#54b947]/20 via-[#54b947] to-[#54b947]/20 rounded-full" />
              {STEPS.map(st => (
                <li key={st.n} className={`${PREMIUM_CARD} relative overflow-hidden pt-12 pb-7 px-6 text-center`}>
                  <span aria-hidden="true" className="absolute -right-2 -bottom-6 text-[7.5rem] leading-none font-black text-emerald-100/70 select-none">{st.n}</span>
                  <span className={`absolute left-1/2 -translate-x-1/2 translate-y-[0.6rem] top-0 w-12 h-12 rounded-full text-lg font-black ring-4 ring-white ${ICON_CHIP}`}>{st.n}</span>
                  <h3 className="relative font-bold text-lg text-slate-900 mb-2 mt-3">{st.title}</h3>
                  <p className="relative text-sm text-slate-500 leading-relaxed">{st.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* CTA */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
            <div className="relative overflow-hidden rounded-[2rem] bg-[#091f14] text-center px-6 py-14 sm:py-20 shadow-xl shadow-emerald-900/20">
              <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 600" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="partnerWaveTop" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#54b947" /><stop offset="50%" stopColor="#2e8229" /><stop offset="100%" stopColor="#124317" />
                  </linearGradient>
                  <linearGradient id="partnerWaveBottom" x1="100%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#54b947" /><stop offset="100%" stopColor="#1a5323" />
                  </linearGradient>
                </defs>
                <path d="M0,0 L220,0 C280,250 150,350 0,550 Z" fill="url(#partnerWaveTop)" opacity="0.85" />
                <path d="M400,600 L100,600 C250,450 400,300 400,100 Z" fill="url(#partnerWaveBottom)" opacity="0.85" />
                <circle cx="350" cy="450" r="150" fill="#8ae47e" opacity="0.18" />
              </svg>
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Ready to partner?</h2>
                <p className="text-emerald-50 mb-8 max-w-xl mx-auto">Send us a few details and our team will get back to you.</p>
                <button
                  type="button"
                  onClick={() => openInquiry('Partnership')}
                  className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-[#256c1d] font-bold px-9 h-12 rounded-full shadow-lg transition-colors"
                >
                  Become a Partner <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </MarketingShell>
  );
}
