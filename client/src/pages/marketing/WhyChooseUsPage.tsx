import { IndianRupee, Layers, ShieldCheck, Smartphone, Settings2, Headphones, Eye, BadgeCheck, Gauge } from 'lucide-react';
import { reveal } from './scrollEffects';
import { PREMIUM_CARD, PREMIUM_CARD_ALT, PREMIUM_CARD_STATIC, ICON_CHIP } from '../cardStyles';
import { Institutions, SecurityBlock } from '../LandingMore';
import { Steps } from '../LandingSections';
import { MarketingShell, PageHero, SectionHeading, CtaBand } from './MarketingShell';

const REASONS = [
  { icon: IndianRupee, title: 'Built for education businesses', body: 'Installment-based fees, receipts, tax settings and study-centre models are part of the product.' },
  { icon: Layers, title: 'One system, one source of truth', body: 'Admissions, sales, finance, HR and academics share the same records. No spreadsheets to reconcile between departments.' },
  { icon: ShieldCheck, title: 'Role-based access', body: 'Each person signs in to a dashboard designed for their job and sees only what they are permitted to.' },
  { icon: Smartphone, title: 'Web and mobile apps', body: 'Attendance with selfie and location, approvals and daily work are available on the mobile apps as well as the web.' },
  { icon: Settings2, title: 'Configured for you', body: 'We set up your organisation structure, roles and fee rules so your team starts with a system that matches how you work.' },
  { icon: Headphones, title: 'Support from the people who build it', body: 'You talk to the team behind PYPE ERM, so questions and change requests reach the people who can act on them.' },
];

const OUTCOMES = [
  { icon: Eye, title: 'Transparency', body: 'Management sees the same information as the teams doing the work.' },
  { icon: BadgeCheck, title: 'Accountability', body: 'Tasks, approvals and escalations show who needs to act next.' },
  { icon: Gauge, title: 'Operational efficiency', body: 'Information moves between departments, so teams stop re-entering it.' },
];

const COMPARE = [
  ['Separate software for student data', 'One student record across every department'],
  ['Separate software for attendance', 'Biometric and mobile attendance flowing into payroll'],
  ['Separate software for finance and funds', 'Installment schedules, reminders and payment links'],
  ['Partner centres managed by phone', 'Invitation, verification and approval workflow'],
];

export function WhyChooseUsPage() {
  return (
    <MarketingShell>
      {openInquiry => (
        <>
          <PageHero
            title="Why institutions moved to"
            accent="one system."
            sub="They were using different software for student data, attendance and finance. PYPE ERM replaced all of it, so their teams only need this one."
          />

          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {REASONS.map(({ icon: Icon, title, body }, i) => (
                <article key={title} {...reveal(i % 2)} className="flex items-start gap-4">
                  <div className={`w-11 h-11 shrink-0 ${ICON_CHIP}`}><Icon className="w-5 h-5" /></div>
                  <div>
                    <h2 className="font-semibold text-lg text-slate-900 mb-1">{title}</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <SectionHeading
              title="What changes when every department uses one system"
              sub="Staff stop moving information between different software."
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {OUTCOMES.map(({ icon: Icon, title, body }, i) => (
                <article key={title} {...reveal(i)} className={`${i % 2 ? PREMIUM_CARD_ALT : PREMIUM_CARD} p-6`}>
                  <Icon className="w-5 h-5 mb-3 text-[#256c1d]" />
                  <h3 className="font-semibold text-lg text-slate-900 mb-1">{title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <SectionHeading title="Before and after PYPE ERM" />
            <div {...reveal()} className={`overflow-hidden ${PREMIUM_CARD_STATIC}`}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-slate-500">Without</th>
                  <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-[#256c1d]">With PYPE ERM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 border-t border-slate-200">
                {COMPARE.map(([a, b]) => (
                  <tr key={a}>
                    <td className="py-4 px-4 sm:px-6 w-1/2 text-slate-500 align-top">{a}</td>
                    <td className="py-4 px-4 sm:px-6 font-medium text-slate-900 align-top">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </section>

          <Steps />
          <Institutions />
          <SecurityBlock />
          <CtaBand title="See it with your own workflow" sub="Tell us how your teams work today and we will show you how it looks in PYPE ERM." label="Book a Free Demo" onClick={() => openInquiry()} />
        </>
      )}
    </MarketingShell>
  );
}
