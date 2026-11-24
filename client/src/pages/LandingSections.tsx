import { useState } from 'react';
import {
  GraduationCap, Users, ArrowRight, Plus, Layers, HardDrive, CalendarClock, Check, } from 'lucide-react';
import { reveal } from './marketing/scrollEffects';
import { PREMIUM_CARD } from './cardStyles';
import { LandingShowcase } from './LandingShowcase';

const PRICING_FACTORS = [
  { icon: Layers, title: 'Modules', body: 'Choose the departments and features your institution needs.' },
  { icon: Users, title: 'Users', body: 'The number of staff who need access to the platform.' },
  { icon: GraduationCap, title: 'Enrollments', body: 'The number of students you expect to enroll.' },
  { icon: HardDrive, title: 'Storage', body: 'Space for student documents, records and other files.' },
  { icon: CalendarClock, title: 'Contract length', body: 'The period your plan covers.' },
];

const PRICING_INCLUDED = [
  'Setup of your structure, roles and fee rules',
  'Web access and the Android app',
  'Role-based access for every user',
  'Support from the team that builds PYPE ERM',
];

const FAQS = [
  { q: 'What is PYPE ERM?', a: 'PYPE ERM is an Education Resource Management platform that brings admissions, sales, finance, HR, payroll, collections and classes together in one system for educational institutions.' },
  { q: 'How much does PYPE ERM cost?', a: 'Pricing is custom for each institution. Your quote depends on the modules you need, your number of users and enrollments, storage and contract length. Share your requirements and our team will prepare a quote.' },
  { q: 'Who uses PYPE ERM?', a: 'Schools, colleges, coaching institutes and study centres. Users include management, HR, finance, sales, operations and collections teams, as well as faculty and students.' },
  { q: 'What features does PYPE ERM offer?', a: 'Admission management, a sales pipeline, study-centre onboarding, HR and payroll, attendance tracking, fee collections, finance dashboards, programme management, internal marks and role-based access for every user.' },
  { q: 'Does PYPE ERM handle fee installments and receipts?', a: 'Yes. Fee schedules, installments, payment links, reminders and receipts are built in, so collections teams always know what is paid and what is due.' },
  { q: 'How do study centres register?', a: 'Study centres register using an invitation link from the organisation admin, submit their details and documents, and go through a verification and approval workflow.' },
  { q: 'How do students apply?', a: 'Students can apply online through the student application portal by entering their details, choosing a programme and uploading documents.' },
  { q: 'What does the Collections module do?', a: 'It manages fee payment schedules, tracks overdue and upcoming installments, sends payment reminders, and gives collections teams a dashboard of outstanding receivables.' },
];

const Heading = ({ title, sub }: { title: string; sub: string }) => (
  <div {...reveal()} className="max-w-3xl mb-6 sm:mb-8">
    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">{title}</h2>
    <p className="text-slate-600 text-base sm:text-lg">{sub}</p>
  </div>
);

function Pricing({ onRequestQuote }: { onRequestQuote: () => void }) {
  return (
    <section id="pricing" className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 scroll-mt-24">
      <Heading
        title="Pricing"
        sub="We prepare a quote for each institution instead of publishing fixed plans."
      />
      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
        <div className="lg:col-span-3">
          <h3 className="font-semibold text-lg text-slate-900 mb-2">What your quote is based on</h3>
          <dl className="divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white px-5 sm:px-6 mt-4">
            {PRICING_FACTORS.map(({ icon: Icon, title, body }, i) => (
              <div key={title} {...reveal(i)} className="flex items-start gap-4 py-4">
                <Icon className="w-5 h-5 mt-0.5 shrink-0 text-[#256c1d]" />
                <div>
                  <dt className="font-semibold text-slate-900">{title}</dt>
                  <dd className="text-sm text-slate-600 mt-0.5">{body}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
        <div {...reveal(1, 'right')} className={`lg:col-span-2 ${PREMIUM_CARD} p-7 sm:p-8 flex flex-col self-start`}>
          <h3 className="font-semibold text-xl tracking-tight text-slate-900 mb-5">Included with every plan</h3>
          <ul className="space-y-3 mb-8">
            {PRICING_INCLUDED.map(item => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                <Check className="w-4 h-4 text-[#256c1d] mt-0.5 shrink-0" /> {item}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onRequestQuote}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 h-12 rounded-full transition-colors"
          >
            Get a custom quote <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function Faq({ onRequestDemo }: { onRequestDemo: () => void }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 scroll-mt-24">
      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
        <div className="lg:col-span-2 lg:sticky lg:top-28 self-start">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">Frequently asked questions</h2>
          <p className="text-slate-600 text-base mb-4">Can't find your answer? Tell us what you need and our team will get back to you.</p>
          <button type="button" onClick={onRequestDemo} className="inline-flex items-center gap-2 text-sm font-semibold text-[#256c1d] underline underline-offset-4">
            Contact us <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="lg:col-span-3 space-y-3">
          {FAQS.map(({ q, a }, i) => {
            const isOpen = open === i;
            return (
              <div key={q} {...reveal(i)} className="rounded-2xl border border-slate-200 bg-white px-5">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center gap-4 text-left py-4 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#54b947]"
                >
                  <span className="flex-1 font-semibold text-slate-900 text-sm sm:text-base">{q}</span>
                  <Plus className={`w-4 h-4 shrink-0 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
                </button>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-5 pr-8 text-sm text-slate-600 leading-relaxed">{a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function LandingSections({ onRequestDemo }: { onRequestDemo: () => void }) {
  return (
    <>
      <LandingShowcase />
      <Pricing onRequestQuote={onRequestDemo} />
      <Faq onRequestDemo={onRequestDemo} />
    </>
  );
}
