import { useState } from 'react';
import {
  GraduationCap, TrendingUp, IndianRupee, Users, BookOpen, MessageSquare,
  ClipboardCheck, BarChart3, ArrowRight, Plus, Crown, Building2, Wallet, Receipt, Store,
} from 'lucide-react';
import { PREMIUM_CARD, PREMIUM_CARD_ALT, PREMIUM_CARD_STATIC, ICON_CHIP } from './cardStyles';

const MODULES = [
  { icon: GraduationCap, title: 'Admissions & Students', body: 'Online applications, enrollment review, re-registration, exam registration, marks and a student portal.' },
  { icon: TrendingUp, title: 'Sales & Study Centers', body: 'Lead pipeline, counselor targets, incentives, and onboarding for partner study centers.' },
  { icon: IndianRupee, title: 'Finance & Collections', body: 'Invoices, installment schedules, payment links, reminders, GST receipts and study-center wallets.' },
  { icon: Users, title: 'HR & Payroll', body: 'Biometric and mobile attendance, leave workflows, salary configuration and payroll batches.' },
  { icon: BookOpen, title: 'Classes & Faculty', body: 'Batches, lessons, online sessions, assessments, faculty attendance and student progress.' },
  { icon: ClipboardCheck, title: 'Operations & Tasks', body: 'Tasks, escalations, complaints, document dispatch, courier tracking and asset management.' },
  { icon: MessageSquare, title: 'Communication', body: 'Email, SMS and WhatsApp, announcements, meetings, polls and push notifications.' },
  { icon: BarChart3, title: 'Reports & Dashboards', body: 'Role-based dashboards and reports on admissions, conversion, collections and team performance.' },
];

const ROLES = [
  'Management & CEO', 'Branch Managers', 'Sales Teams', 'Finance Teams', 'HR Managers',
  'Operations Staff', 'Collections Teams', 'Faculty', 'Study Centers', 'Students',
];

const ROLE_ICONS = [Crown, Building2, TrendingUp, Wallet, Users, ClipboardCheck, Receipt, BookOpen, Store, GraduationCap];

const STEPS = [
  { n: '1', title: 'Tell us about your institution', body: 'Share your branches, programs and how your teams work today.' },
  { n: '2', title: 'We set up your organization', body: 'Your structure, roles and fee rules are configured for you.' },
  { n: '3', title: 'Your team goes live', body: 'Staff, faculty, centers and students start using their own dashboards.' },
];

const FAQS = [
  { q: 'What is PYPE ERM?', a: 'PYPE ERM is an Education Resource Management platform that brings admissions, sales, finance, HR, payroll, collections and classes together in one system for educational institutions.' },
  { q: 'Who uses PYPE ERM?', a: 'Schools, colleges, coaching institutes and study centers. Users include management, HR, finance, sales, operations and collections teams, as well as faculty and students.' },
  { q: 'What features does PYPE ERM offer?', a: 'Admission management, a sales pipeline, study-center onboarding, HR and payroll, attendance tracking, fee collections, finance dashboards, program management, internal marks and role-based access for every user.' },
  { q: 'Does PYPE ERM handle fee installments and receipts?', a: 'Yes. Fee schedules, installments, payment links, reminders and receipts are built in, so collections teams always know what is paid and what is due.' },
  { q: 'How do study centers register?', a: 'Study centers register at /register using an invitation link from the organization admin, submit their details and documents, and go through a verification and approval workflow.' },
  { q: 'How do students apply?', a: 'Students can apply online through the student application portal at /student-apply by entering their details, choosing a program and uploading documents.' },
  { q: 'What does the Collections module do?', a: 'It manages fee payment schedules, tracks overdue and upcoming installments, sends payment reminders, and gives collections teams a dashboard of outstanding receivables.' },
];

const FRAME = '';
const Heading = ({ title, sub }: { title: string; sub: string }) => (
  <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">{title}</h2>
    <p className="text-slate-500 text-base sm:text-lg font-medium">{sub}</p>
  </div>
);

/** Split a module description into short capability chips. */
const toChips = (body: string) =>
  body.replace(/\.$/, '').split(/,\s*|\s+and\s+/).map(x => x.trim()).filter(Boolean).map(x => x[0].toUpperCase() + x.slice(1));

/** Decorative skeleton dashboard shown in the module preview. */
const PreviewUI = ({ seed }: { seed: number }) => (
  <div aria-hidden="true" className="rounded-2xl bg-white border border-slate-200/70 shadow-[0_10px_30px_-12px_rgba(16,24,40,0.18)] overflow-hidden">
    <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
      <i className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" /><i className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" /><i className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
      <span className="ml-3 h-2 w-28 rounded-full bg-slate-200" />
    </div>
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map(k => (
          <div key={k} className="rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/70 p-3">
            <span className="block h-1.5 w-1/2 rounded-full bg-slate-200 mb-2" />
            <span className="block h-3 rounded-full bg-[#54b947]/70" style={{ width: `${40 + ((seed * 13 + k * 19) % 45)}%` }} />
          </div>
        ))}
      </div>
      {[0, 1, 2, 3].map(r => (
        <div key={r} className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6bd05a] to-[#2c7722] opacity-90" />
          <span className="h-2 rounded-full bg-slate-200" style={{ width: `${45 + ((seed * 7 + r * 17) % 40)}%` }} />
          <span className={`ml-auto h-5 w-14 rounded-full ${['bg-emerald-100', 'bg-amber-100', 'bg-sky-100', 'bg-slate-100'][(r + seed) % 4]}`} />
        </div>
      ))}
    </div>
  </div>
);

function Modules() {
  const [active, setActive] = useState(0);
  const m = MODULES[active];
  const ActiveIcon = m.icon;
  return (
    <section id="modules" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 scroll-mt-24">
      <div className={`${FRAME} px-4 sm:px-8 py-10 sm:py-14`}>
        <Heading
          title="One platform for every department"
          sub="Each team gets the tools it needs, and all of them share the same student and finance data."
        />
        <div className="grid lg:grid-cols-12 gap-5 lg:gap-6">
          {/* Module selector */}
          <div role="tablist" aria-label="Departments" className="lg:col-span-5 grid grid-cols-2 lg:grid-cols-1 gap-2.5">
            {MODULES.map(({ icon: Icon, title }, i) => {
              const on = i === active;
              return (
                <button
                  key={title}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  className={`group flex items-center gap-3 text-left rounded-2xl px-3.5 py-3 border transition-all duration-300 ${
                    on
                      ? 'bg-gradient-to-r from-white to-emerald-50 border-[#54b947]/50 shadow-[0_14px_30px_-14px_rgba(44,119,34,0.35)] lg:translate-x-1'
                      : 'bg-white/70 border-slate-200/60 hover:border-[#54b947]/40 hover:bg-white'
                  }`}
                >
                  <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 ${on ? ICON_CHIP : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-[#2f8a24]'}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className={`flex-1 text-sm font-bold leading-snug ${on ? 'text-slate-900' : 'text-slate-600'}`}>{title}</span>
                  <ArrowRight className={`hidden lg:block w-4 h-4 shrink-0 transition-all duration-300 ${on ? 'text-[#54b947] opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} />
                </button>
              );
            })}
          </div>

          {/* Preview panel */}
          <div key={active} role="tabpanel" className={`lg:col-span-7 ${PREMIUM_CARD_STATIC} p-5 sm:p-7 flex flex-col gap-5 animate-in fade-in slide-in-from-right-3 duration-500`}>
            <div className="flex items-start gap-4">
              <span className={`w-14 h-14 shrink-0 rounded-2xl ${ICON_CHIP}`}><ActiveIcon className="w-7 h-7" /></span>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{m.title}</h3>
                <p className="text-sm sm:text-base text-slate-500 leading-relaxed mt-1">{m.body}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {toChips(m.body).map(c => (
                <span key={c} className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-semibold text-[#256c1d]">{c}</span>
              ))}
            </div>
            <PreviewUI seed={active + 1} />
          </div>
        </div>
        <div className="text-center mt-10">
          <a href="/why-choose-us" className="inline-flex items-center gap-2 text-sm font-bold text-[#256c1d] hover:text-[#1a5323] underline decoration-[#54b947] underline-offset-4">
            See why institutions choose PYPE ERM <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function Faq({ onRequestDemo }: { onRequestDemo: () => void }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 scroll-mt-24">
      <div className={`${FRAME} px-5 sm:px-10 py-10 sm:py-14`}>
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Intro */}
          <div className="lg:col-span-2 lg:sticky lg:top-28 self-start text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">Frequently asked questions</h2>
            <p className="text-slate-500 text-base sm:text-lg font-medium mb-6">Quick answers about PYPE ERM.</p>
            <div className={`${PREMIUM_CARD_ALT} hidden lg:block p-5 text-left`}>
              <div className="font-bold text-slate-900 mb-1">Can't find your answer?</div>
              <p className="text-sm text-slate-500 mb-4">Tell us what you need and our team will get back to you.</p>
              <button type="button" onClick={onRequestDemo} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-5 h-10 rounded-full transition-colors">
                Contact us <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Accordion */}
          <div className="lg:col-span-3 space-y-3">
            {FAQS.map(({ q, a }, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={q}
                  className={`rounded-2xl border transition-all duration-300 ${
                    isOpen
                      ? 'bg-gradient-to-br from-white to-emerald-50/70 border-[#54b947]/50 shadow-[0_18px_36px_-14px_rgba(44,119,34,0.28)]'
                      : 'bg-white/90 border-slate-200/70 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_20px_-12px_rgba(16,24,40,0.10)] hover:border-[#54b947]/40'
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center gap-4 text-left px-4 sm:px-5 py-4 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#54b947]"
                  >
                    <span className={`shrink-0 w-9 h-9 rounded-xl text-xs font-black flex items-center justify-center transition-colors duration-300 ${isOpen ? `${ICON_CHIP}` : 'bg-slate-100 text-slate-500'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 font-bold text-slate-900 text-sm sm:text-base">{q}</span>
                    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${isOpen ? 'bg-[#54b947] border-[#54b947] text-white rotate-45' : 'bg-white border-slate-200 text-slate-500'}`}>
                      <Plus className="w-4 h-4" />
                    </span>
                  </button>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-4 sm:px-5 pb-5 pl-[4.5rem] sm:pl-[4.75rem] text-sm text-slate-500 leading-relaxed">{a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="lg:hidden text-center pt-3">
              <button type="button" onClick={onRequestDemo} className="inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-bold px-6 h-10 rounded-full">
                Still have questions? Contact us <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingSections({ onRequestDemo }: { onRequestDemo: () => void }) {
  return (
    <>
      <Modules />

      {/* Roles */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className={`${FRAME} px-4 sm:px-8 py-10 sm:py-14`}>
          <Heading
            title="A workspace for each person on your team"
            sub="Everyone signs in to a dashboard designed for their job, with access limited to what they need."
          />
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {ROLES.map((r, i) => {
              const Icon = ROLE_ICONS[i % ROLE_ICONS.length];
              return (
                <li key={r} className={`${i % 2 ? PREMIUM_CARD_ALT : PREMIUM_CARD} group p-4 sm:p-5 flex flex-col items-center text-center gap-3`}>
                  <span className={`w-12 h-12 ${ICON_CHIP} group-hover:scale-110 transition-transform duration-300`}><Icon className="w-6 h-6" /></span>
                  <span className="text-sm font-bold text-slate-800 leading-snug">{r}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* How it works — connected stepper */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className={`${FRAME} px-4 sm:px-8 py-10 sm:py-14`}>
          <Heading title="Up and running in three steps" sub="From first conversation to your team using the platform." />
          <ol className="relative grid md:grid-cols-3 gap-5 md:gap-6">
            {/* connector line (desktop) */}
            <span aria-hidden="true" className="hidden md:block absolute top-[2.15rem] left-[16.6%] right-[16.6%] h-0.5 bg-gradient-to-r from-[#54b947]/20 via-[#54b947] to-[#54b947]/20 rounded-full" />
            {STEPS.map(st => (
              <li key={st.n} className={`${PREMIUM_CARD} relative overflow-hidden pt-12 pb-7 px-6 text-center`}>
                <span aria-hidden="true" className="absolute -right-2 -bottom-6 text-[7.5rem] leading-none font-black text-emerald-100/70 select-none">{st.n}</span>
                <span className={`absolute left-1/2 -translate-x-1/2 -top-0 translate-y-[0.6rem] w-12 h-12 rounded-full text-lg font-black ring-4 ring-white ${ICON_CHIP}`}>{st.n}</span>
                <h3 className="relative font-bold text-lg text-slate-900 mb-2 mt-3">{st.title}</h3>
                <p className="relative text-sm text-slate-500 leading-relaxed">{st.body}</p>
              </li>
            ))}
          </ol>
          <div className="text-center mt-10">
            <button type="button" onClick={onRequestDemo} className="inline-flex items-center gap-2 bg-[#54b947] hover:bg-[#439c36] text-white font-bold px-8 h-12 rounded-full shadow-lg shadow-[#54b947]/30 hover:-translate-y-0.5 transition-all">
              Request a Demo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <Faq onRequestDemo={onRequestDemo} />
    </>
  );
}
