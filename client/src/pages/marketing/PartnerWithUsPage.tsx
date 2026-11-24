import { Building2, Handshake, Code2, Megaphone, ArrowRight, ArrowUpRight, Check, Wallet, LayoutDashboard, Users, Plug, Lightbulb } from 'lucide-react';
import { reveal } from './scrollEffects';
import { MarketingShell, PageHero, CtaBand } from './MarketingShell';

const PARTNER_TYPES = [
  { icon: Building2, title: 'Study Centres', body: 'Run admissions for a partner university or institution, with your own dashboard, wallet and student records.', cta: 'Register your centre', href: '/register', points: ['Own dashboard', 'Centre wallet', 'Student records'] },
  { icon: Handshake, title: 'Channel & Reseller Partners', body: 'Introduce PYPE ERM to institutions you already work with and support them through rollout.', cta: 'Talk to us', points: ['Rollout support', 'Sales materials', 'Partner onboarding'] },
  { icon: Code2, title: 'Technology Partners', body: 'Payment, communication, biometric and other service providers who want to integrate with the platform.', cta: 'Talk to us', points: ['Payments', 'Messaging', 'Biometrics'] },
  { icon: Megaphone, title: 'Education Consultants', body: 'Advise institutions on operations and technology? Recommend a system that fits education workflows.', cta: 'Talk to us', points: ['Admissions', 'Fee collection', 'HR & payroll'] },
];

const PERKS = [
  { icon: LayoutDashboard, title: 'Your own dashboard', body: 'Track your students, institutions or integrations from a workspace built for your role.' },
  { icon: Wallet, title: 'Clear, transparent terms', body: 'Our team discusses fit and terms with you up front, with no surprises later.' },
  { icon: Users, title: 'Support through your first customers', body: 'We set you up, share the materials and stay with you through rollout.' },
  { icon: Plug, title: 'A platform ready to connect', body: 'Admissions, fees, attendance, academics and HR already work together in one system.' },
  { icon: Lightbulb, title: 'Built for education workflows', body: 'Made by the team that works with institutions, so it fits how they actually run.' },
];

const STEPS = [
  { n: '01', title: 'Get in touch', body: 'Tell us about your organisation and the kind of partnership you have in mind.' },
  { n: '02', title: 'We review and talk', body: 'Our team reviews your request and contacts you to discuss fit and terms.' },
  { n: '03', title: 'Onboard and launch', body: 'We set you up, share the materials and support you through your first customers or students.' },
];

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex rounded-full bg-[#f4f4f2] px-3 py-1 text-xs font-medium text-slate-500">{children}</span>
);

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
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button type="button" onClick={() => openInquiry('Partnership')} className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-7 h-12 rounded-full transition-colors">
                Become a Partner <ArrowRight className="w-4 h-4" />
              </button>
              <a href="#partner-types" className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-sm font-semibold px-7 h-12 rounded-full transition-colors">
                See partner types <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </PageHero>

          <section id="partner-types" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-24">
            <div {...reveal()} className="text-center max-w-2xl mx-auto mb-10">
              <Badge>Partner types</Badge>
              <h2 className="mt-4 text-3xl sm:text-4xl font-medium tracking-tight text-slate-900">Choose how you want to work with us</h2>
              <p className="mt-4 text-slate-600 text-base sm:text-lg">Four ways to partner, each with its own support from our team.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {PARTNER_TYPES.map(({ icon: Icon, title, body, cta, href, points }, i) => {
                const linkCls = 'inline-flex items-center gap-2 text-sm font-semibold text-[#256c1d] hover:text-[#1a5323]';
                return (
                  <article key={title} {...reveal(i % 2)} className="rounded-[28px] bg-[#f4f6f3] p-6 sm:p-7 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_44px_-18px_rgba(44,119,34,0.28)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-medium text-slate-900 tracking-tight">{title}</h3>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-sm">{body}</p>
                      </div>
                      <span className="shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-[#54b947]"><Icon className="w-4 h-4" /></span>
                    </div>
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {points.map(p => <li key={p} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">{p}</li>)}
                    </ul>
                    <div className="mt-6 pt-5 border-t border-slate-200/70">
                      {href ? (
                        <a href={href} className={linkCls}>{cta} <ArrowUpRight className="w-4 h-4" /></a>
                      ) : (
                        <button type="button" onClick={() => openInquiry('Partnership')} className={linkCls}>{cta} <ArrowUpRight className="w-4 h-4" /></button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 text-center mt-6">Study-centre registration needs an invitation link from the organisation admin.</p>
          </section>

          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
              <div {...reveal()} className="self-start">
                <Badge>Why partner</Badge>
                <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-slate-900 leading-[1.1]">A partnership built to grow with you</h2>
                <p className="mt-4 text-slate-600 text-base sm:text-lg max-w-md">Work with the team behind PYPE ERM and bring institutions one connected system.</p>
                <ul className="mt-6 space-y-3">
                  {['Hands-on onboarding', 'Support after launch', 'Role-based access for every user'].map(t => (
                    <li key={t} className="flex items-center gap-3 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-[#e7f6e3] text-[#256c1d] flex items-center justify-center"><Check className="w-3 h-3" /></span>{t}
                    </li>
                  ))}
                </ul>
              </div>
              <ul>
                {PERKS.map(({ icon: Icon, title, body }, i) => (
                  <li key={title} {...reveal(i)} className="relative pl-6 py-5 border-l-2 border-slate-200 hover:border-[#54b947] transition-colors">
                    <span className="absolute left-[-2px] top-5 h-10 w-[2px] bg-[#54b947]" />
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-[#256c1d]" />
                      <h3 className="font-semibold text-slate-900">{title}</h3>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div {...reveal()} className="text-center max-w-2xl mx-auto mb-10">
              <Badge>How it works</Badge>
              <h2 className="mt-4 text-3xl sm:text-4xl font-medium tracking-tight text-slate-900">From first conversation to launch</h2>
            </div>
            <ol className="grid md:grid-cols-3 gap-4 sm:gap-5">
              {STEPS.map((st, i) => (
                <li key={st.n} {...reveal(i)} className="rounded-[28px] bg-[#f4f6f3] p-6 sm:p-7">
                  <span className="text-4xl font-medium text-[#54b947]/70 tracking-tight">{st.n}</span>
                  <h3 className="mt-4 text-lg font-medium text-slate-900">{st.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">{st.body}</p>
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
