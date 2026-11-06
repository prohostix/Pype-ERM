import { useEffect, useRef, useState } from 'react';
import {
  GraduationCap, TrendingUp, IndianRupee, Users, BookOpen, MessageSquare,
  ClipboardCheck, BarChart3, ArrowRight, Plus, Crown, Building2, Wallet, Receipt, Store,
  Layers, HardDrive, CalendarClock, Check, Clock,
} from 'lucide-react';
import { reveal } from './marketing/scrollEffects';
import { PREMIUM_CARD, PREMIUM_CARD_ALT, PREMIUM_CARD_STATIC, ICON_CHIP } from './cardStyles';
import { LandingFeaturesGrid } from './LandingFeaturesGrid';
import { CardRibbon } from './marketing/CardRibbon';

const MODULES = [
  { icon: GraduationCap, title: 'Admissions & Students', who: 'admissions staff and students', question: 'Where is this student\'s application?', answer: 'See every application, document and approval on one student record.', body: 'Online applications, enrollment review, re-registration, exam registration, marks and student portal.' },
  { icon: TrendingUp, title: 'Sales & Study Centres', who: 'sales teams and counselors', question: 'Which lead needs a follow-up today?', answer: 'Track each lead, check progress against targets and bring new study centres on board.', body: 'Lead pipeline, counselor targets, incentives and onboarding for partner study centres.' },
  { icon: IndianRupee, title: 'Finance & Collections', who: 'finance and collections teams', question: 'Who has paid, and who is still due?', answer: 'See installments and dues for each student, then send a payment link or reminder.', body: 'Invoices, installment schedules, payment links, reminders, GST receipts and study-centre wallets.' },
  { icon: Users, title: 'HR & Payroll', who: 'HR managers and staff', question: 'Who is present today, and is payroll ready?', answer: 'Attendance and leave are recorded in one place and used for salary and payroll batches.', body: 'Biometric attendance, mobile attendance, leave workflows, salary configuration and payroll batches.' },
  { icon: BookOpen, title: 'Classes & Faculty', who: 'faculty and students', question: 'How is this batch doing?', answer: 'Plan lessons, run online sessions and follow each student\'s assessments and progress.', body: 'Batches, lessons, online sessions, assessments, faculty attendance and student progress.' },
  { icon: ClipboardCheck, title: 'Operations & Tasks', who: 'operations staff', question: 'Which task or complaint is still open?', answer: 'Assign tasks, escalate what is stuck and keep track of documents and couriers.', body: 'Tasks, escalations, complaints, document dispatch, courier tracking and asset management.' },
  { icon: MessageSquare, title: 'Communication', who: 'everyone in your institution', question: 'How do I reach everyone at once?', answer: 'Share announcements and polls, and schedule meetings, with email, WhatsApp and push notifications.', body: 'Email and WhatsApp, announcements, meetings, polls and push notifications.' },
  { icon: BarChart3, title: 'Reports & Dashboards', who: 'management and team leads', question: 'How are admissions and collections doing?', answer: 'Open the dashboard for your role to see admissions, conversion, collections and team performance.', body: 'Role-based dashboards and reports on admissions, conversion, collections and team performance.' },
];

const REPLACED = [
  { icon: GraduationCap, before: 'Student data', after: 'Student records, documents, enrollment and marks' },
  { icon: Clock, before: 'Attendance', after: 'Biometric and mobile attendance, leave and payroll' },
  { icon: IndianRupee, before: 'Finance and funds', after: 'Invoices, fee installments, payment links, receipts and study-centre wallets' },
];

const ROLES = [
  { icon: Crown, label: 'Management & CEO' },
  { icon: Building2, label: 'Branch Managers' },
  { icon: TrendingUp, label: 'Sales Teams' },
  { icon: Wallet, label: 'Finance Teams' },
  { icon: Users, label: 'HR Managers' },
  { icon: ClipboardCheck, label: 'Operations Staff' },
  { icon: Receipt, label: 'Collections Teams' },
  { icon: BookOpen, label: 'Faculty' },
  { icon: Store, label: 'Study Centres' },
  { icon: GraduationCap, label: 'Students' },
];

const STEPS = [
  { n: '1', title: 'Tell us about your institution', body: 'Share your branches, programmes and how your teams work today.' },
  { n: '2', title: 'We set up your organisation', body: 'Your structure, roles and fee rules are configured for you.' },
  { n: '3', title: 'Your team goes live', body: 'Staff, faculty, centres and students start using their own dashboards.' },
];

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

/** Split a module description into short capability items. */
const toChips = (body: string) =>
  body.replace(/\.$/, '').split(/,\s*(?:and\s+)?|\s+and\s+/).map(x => x.trim()).filter(Boolean).map(x => x[0].toUpperCase() + x.slice(1));

const MODULES_LINE = 0.35; // how far down the screen a card becomes the active department

function Modules() {
  const [active, setActive] = useState(0);
  const cardsRef = useRef<HTMLUListElement>(null);

  // On desktop the list on the left follows whichever card crosses this line on the screen.
  useEffect(() => {
    const cards = Array.from(cardsRef.current?.children ?? []);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActive(cards.indexOf(entry.target));
      });
    }, { rootMargin: `-${MODULES_LINE * 100}% 0px -${(1 - MODULES_LINE) * 100}% 0px` });
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  const goTo = (i: number) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rect = cardsRef.current?.children[i]?.getBoundingClientRect();
    if (!rect) return;
    window.scrollTo({ top: window.scrollY + rect.top + rect.height / 2 - window.innerHeight * MODULES_LINE, behavior: reduce ? 'auto' : 'smooth' });
  };

  const whyLink = (
    <a href="/why-choose-us" className="inline-flex items-center gap-2 text-sm font-semibold text-[#256c1d] hover:text-[#1a5323] underline underline-offset-4">
      See why institutions choose PYPE ERM <ArrowRight className="w-4 h-4" />
    </a>
  );

  return (
    <section id="modules" className="relative z-10 scroll-mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 grid lg:grid-cols-12 gap-6 lg:gap-10">
        <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
          <div {...reveal()}>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">One platform for every department</h2>
            <p className="text-slate-600 text-base">Each team gets the tools it needs, and all of them share the same student and finance data.</p>
            <p className="lg:hidden mt-3 text-sm font-semibold text-slate-900">Swipe to see all {MODULES.length} departments</p>
          </div>
          <nav aria-label="Departments" className="hidden lg:block mt-5">
            <ul>
              {MODULES.map(({ icon: Icon, title }, i) => {
                const on = i === active;
                return (
                  <li key={title}>
                    <button
                      type="button"
                      aria-current={on ? 'true' : undefined}
                      onClick={() => goTo(i)}
                      className={`w-full flex items-center gap-3 rounded-full px-4 text-left text-sm font-semibold transition-colors duration-300 motion-reduce:transition-none ${
                        on ? 'bg-emerald-50 text-[#256c1d]' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" /> {title}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 px-4">{whyLink}</div>
          </nav>
        </div>

        <div className="lg:col-span-8 min-w-0">
          {/* A swipeable row on small screens, a plain column that scrolls with the page on desktop. */}
          <ul
            ref={cardsRef}
            tabIndex={0}
            aria-label="Departments"
            className="flex lg:flex-col gap-4 -mx-4 px-4 pt-2 pb-8 sm:-mx-6 sm:px-6 lg:m-0 lg:p-0 overflow-x-auto overflow-y-hidden lg:overflow-visible snap-x snap-mandatory lg:snap-none scroll-px-4 sm:scroll-px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {MODULES.map(({ icon: Icon, title, who, question, answer, body }, i) => (
              <li
                key={title}
                {...reveal()}
                className={`${PREMIUM_CARD_STATIC} w-[85%] sm:w-[60%] lg:w-full shrink-0 snap-start p-6 sm:p-7 motion-reduce:transition-none ${
                  i === active ? 'lg:border-[#54b947]' : ''
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 shrink-0 ${ICON_CHIP}`}><Icon className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 leading-snug">{title}</p>
                    <p className="text-sm text-slate-500 leading-snug">For {who}</p>
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">{question}</h3>
                <p className="text-slate-600 leading-relaxed mb-4">{answer}</p>
                <ul aria-label="Included" className="flex flex-wrap gap-2">
                  {toChips(body).map(c => (
                    <li key={c} className="rounded-full border border-slate-200 px-3 py-1 text-xs sm:text-sm text-slate-700">{c}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="lg:hidden">{whyLink}</div>
        </div>
      </div>
    </section>
  );
}

/** The problem PYPE ERM solves: separate software for each job, replaced by one system. */
function Replaced() {
  return (
    <section id="what-it-replaces" className="relative z-10 scroll-mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div {...reveal()} className="max-w-3xl mb-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">Our clients used different software for each job</h2>
          <p className="text-slate-600 text-base sm:text-lg">Student data was kept in one place, attendance in another, and finance and funds somewhere else. PYPE ERM replaced them, so they only need this one system.</p>
        </div>
        <div className={`divide-y divide-slate-200 ${PREMIUM_CARD_STATIC} px-5 sm:px-8`}>
          {REPLACED.map(({ icon: Icon, before, after }, i) => (
            <div key={before} {...reveal(i)} className="grid sm:grid-cols-5 gap-2 sm:gap-8 py-5">
              <div className="sm:col-span-2 flex items-center gap-3">
                <Icon className="w-5 h-5 shrink-0 text-[#256c1d]" />
                <span className="font-semibold text-slate-900">{before}</span>
              </div>
              <p className="sm:col-span-3 text-sm sm:text-base text-slate-600">{after}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const BRANCH_DEPTS = ['Admissions', 'Finance', 'HR'];
const BRANCH_POINTS = ['See how each branch is doing from one account', 'Use the same process in every branch', 'Give each branch manager access to their own branch'];

function Branches() {
  return (
    <section id="branches" className="relative z-10 px-4 sm:px-6 lg:px-8 scroll-mt-24">
      <div {...reveal(0, 'zoom')} className="relative overflow-hidden max-w-6xl mx-auto rounded-[2.5rem] bg-[#091f14] text-white px-6 sm:px-8 py-10 sm:py-12 grid lg:grid-cols-2 gap-10 items-center">
        <CardRibbon />
        <div className="relative">
          <h2 className="text-white text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Run every branch from the same system
          </h2>
          <p className="text-emerald-50/80 text-base sm:text-lg mb-6">
            All your branches and departments work from one set of records, instead of each keeping its own.
          </p>
          <ul className="space-y-3">
            {BRANCH_POINTS.map((p, i) => (
              <li key={p} {...reveal(i + 1)} className="flex items-start gap-3 text-sm sm:text-base text-emerald-50">
                <Check className="w-5 h-5 text-[#8ae47e] shrink-0" /> {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Decorative: one head office connected to its branches */}
        <div aria-hidden="true" className="relative flex flex-col items-center">
          <div className="flex items-center gap-2.5 rounded-full bg-[#54b947] text-[#091f14] font-bold text-sm sm:text-base px-5 py-3">
            <Building2 className="w-5 h-5" /> Your Organisation
          </div>
          <span className="w-px h-7 bg-[#54b947]" />
          <div className="relative w-full grid grid-cols-3 gap-2 sm:gap-3 pt-7">
            <span className="absolute top-0 left-[16.6%] right-[16.6%] h-px bg-[#54b947]" />
            {[1, 2, 3].map(n => (
              <div key={n} {...reveal(n)} className="relative rounded-2xl border border-white/15 p-2.5 sm:p-4">
                <span className="absolute -top-7 left-1/2 w-px h-7 bg-[#54b947]" />
                <div className="font-semibold text-xs sm:text-sm mb-2.5 text-center">Branch {n}</div>
                <div className="space-y-1.5">
                  {BRANCH_DEPTS.map(d => (
                    <div key={d} className="rounded-full bg-white/10 text-[10px] sm:text-xs text-emerald-50 text-center py-1 truncate">{d}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

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

/** Role list, shown on the Features page. */
export function Roles() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <Heading
        title="A workspace for each person on your team"
        sub="Everyone signs in to a dashboard designed for their job, with access limited to what they need."
      />
      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {ROLES.map(({ icon: Icon, label }, i) => (
          <li key={label} {...reveal(i % 5)} className={`${i % 2 ? PREMIUM_CARD_ALT : PREMIUM_CARD} p-4 flex items-center gap-3`}>
            <Icon className="w-5 h-5 shrink-0 text-[#256c1d]" />
            <span className="text-sm font-medium text-slate-800 leading-snug">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Onboarding steps, shown on the Why Choose Us page. */
export function Steps() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <Heading title="Up and running in three steps" sub="From first conversation to your team using the platform." />
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
  );
}

export function LandingSections({ onRequestDemo }: { onRequestDemo: () => void }) {
  return (
    <>
      <Replaced />
      <Modules />
      <LandingFeaturesGrid />
      <Branches />
      <Pricing onRequestQuote={onRequestDemo} />
      <Faq onRequestDemo={onRequestDemo} />
    </>
  );
}
