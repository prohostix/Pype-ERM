import { Building2, Handshake, Code2, Megaphone, ArrowRight } from 'lucide-react';
import { reveal } from './scrollEffects';
import { PREMIUM_CARD, PREMIUM_CARD_ALT, ICON_CHIP } from '../cardStyles';
import { MarketingShell, PageHero, SectionHeading, CtaBand } from './MarketingShell';

const PARTNER_TYPES = [
  { icon: Building2, title: 'Study Centres', body: 'Run admissions for a partner university or institution through PYPE ERM, with your own dashboard, wallet and student records.', cta: 'Register your centre', href: '/register' },
  { icon: Handshake, title: 'Channel & Reseller Partners', body: 'Introduce PYPE ERM to institutions you already work with and support them through rollout.', cta: 'Talk to us' },
  { icon: Code2, title: 'Technology Partners', body: 'Payment, communication, biometric and other service providers who want to integrate with the platform.', cta: 'Talk to us' },
  { icon: Megaphone, title: 'Education Consultants', body: 'Advise institutions on operations and technology? Recommend a system that fits education workflows.', cta: 'Talk to us' },
];

const STEPS = [
  { n: '1', title: 'Get in touch', body: 'Tell us about your organisation and the kind of partnership you have in mind.' },
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
            sub="Whether you run a study centre, advise institutions or build technology for education, there is a way to work together."
          >
            <button
              type="button"
              onClick={() => openInquiry('Partnership')}
              className="inline-flex items-center gap-2 bg-[#256c1d] hover:bg-[#1a5323] text-white font-semibold px-7 h-12 rounded-full transition-colors"
            >
              Become a Partner <ArrowRight className="w-4 h-4" />
            </button>
          </PageHero>

          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <SectionHeading title="Choose how you want to work with us" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PARTNER_TYPES.map(({ icon: Icon, title, body, cta, href }, i) => {
                const linkCls = 'inline-flex items-center gap-2 text-sm font-semibold text-[#256c1d] underline underline-offset-4';
                return (
                  <article key={title} {...reveal(i % 2)} className={`${i % 2 ? PREMIUM_CARD_ALT : PREMIUM_CARD} p-6 sm:p-7 flex flex-col gap-3`}>
                    <div className={`w-11 h-11 ${ICON_CHIP}`}><Icon className="w-5 h-5" /></div>
                    <h3 className="font-semibold text-xl text-slate-900">{title}</h3>
                    <p className="flex-1 text-sm text-slate-600 leading-relaxed">{body}</p>
                    <div>
                      {href ? (
                        <a href={href} className={linkCls}>{cta} <ArrowRight className="w-4 h-4" /></a>
                      ) : (
                        <button type="button" onClick={() => openInquiry('Partnership')} className={linkCls}>{cta} <ArrowRight className="w-4 h-4" /></button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 text-center mt-5">Study-centre registration needs an invitation link from the organisation admin.</p>
          </section>

          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <SectionHeading title="From first conversation to launch" />
            <ol className="grid md:grid-cols-3 gap-8">
              {STEPS.map((st, i) => (
                <li key={st.n} {...reveal(i)} className={`${PREMIUM_CARD} p-6`}>
                  <div className="inline-flex px-3 py-1 rounded-full bg-emerald-50 text-xs font-semibold text-[#256c1d] mb-3">Step {st.n}</div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">{st.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{st.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <CtaBand title="Ready to partner?" sub="Send us a few details and our team will get back to you." label="Become a Partner" onClick={() => openInquiry('Partnership')} />
        </>
      )}
    </MarketingShell>
  );
}
