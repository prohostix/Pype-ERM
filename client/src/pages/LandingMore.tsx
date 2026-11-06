import {
  School, Landmark, BookOpenCheck, Building2, ShieldCheck, Lock, KeyRound, Server,
  Smartphone, Camera, MapPin, Bell, Download, ArrowRight, Check,
} from 'lucide-react';
import { PREMIUM_CARD, PREMIUM_CARD_ALT, ICON_CHIP } from './cardStyles';

const CARD = '';
const FRAME = '';

const Heading = ({ title, sub }: { title: string; sub: string }) => (
  <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">{title}</h2>
    <p className="text-slate-500 text-base sm:text-lg font-medium">{sub}</p>
  </div>
);

const INSTITUTIONS = [
  { icon: School, title: 'Schools', body: 'Admissions, fee installments, staff attendance and parent communication on one system.' },
  { icon: Landmark, title: 'Colleges & Universities', body: 'Programs, enrollment review, exam registration, marks and multi-branch reporting.' },
  { icon: BookOpenCheck, title: 'Coaching Institutes', body: 'Batches, faculty attendance, online sessions and fee collection with reminders.' },
  { icon: Building2, title: 'Study Center Networks', body: 'Onboard partner centers, manage wallets and track every center\'s admissions.' },
];

const SECURITY = [
  { icon: KeyRound, title: 'Role-based access', body: 'Every user sees only the data and actions their role allows.' },
  { icon: Lock, title: 'Protected credentials', body: 'Passwords are stored only as salted hashes, and sessions use secure tokens.' },
  { icon: Server, title: 'Secure cloud hosting', body: 'Data is stored on managed, encrypted cloud infrastructure.' },
  { icon: ShieldCheck, title: 'No data selling', body: 'We do not sell personal information or use it for advertising. See our privacy policy.' },
];

const APP_FEATURES = [
  { icon: Camera, label: 'Selfie punch-in and punch-out' },
  { icon: MapPin, label: 'Location-stamped attendance' },
  { icon: Bell, label: 'Push notifications for approvals and tasks' },
  { icon: Smartphone, label: 'Leave requests and daily work on the go' },
];

const toChips = (body: string) =>
  body.replace(/\.$/, '').split(/,\s*|\s+and\s+/).map(x => x.trim()).filter(Boolean).map(x => x[0].toUpperCase() + x.slice(1));

/** Phone mock for the mobile-app section. */
const PhoneMock = () => (
  <div aria-hidden="true" className="relative mx-auto w-[240px] sm:w-[260px]">
    <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-[#8ae47e]/50 to-[#54b947]/10 blur-2xl" />
    <div className="relative rounded-[2.4rem] bg-slate-900 p-2.5 shadow-[0_30px_60px_-20px_rgba(16,24,40,0.55)]">
      <div className="rounded-[1.9rem] bg-gradient-to-b from-emerald-50 to-white overflow-hidden min-h-[440px] flex flex-col">
        <div className="mx-auto mt-2 h-5 w-24 rounded-full bg-slate-900" />
        <div className="px-4 pt-4 flex items-center justify-between">
          <span className="text-xs font-black text-slate-900">Good morning</span>
          <span className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center"><Bell className="w-3.5 h-3.5 text-slate-500" /></span>
        </div>
        <div className="px-4 mt-4">
          <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-4 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-[#6bd05a] to-[#2c7722] p-1 shadow-lg shadow-[#54b947]/30">
              <div className="w-full h-full rounded-full bg-emerald-50 flex items-center justify-center"><Camera className="w-7 h-7 text-[#2f8a24]" /></div>
            </div>
            <div className="mt-3 text-[11px] font-bold text-slate-500">Selfie punch-in</div>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1 w-fit mx-auto">
              <MapPin className="w-3 h-3" /> Location verified
            </div>
            <div className="mt-3 h-9 rounded-xl bg-[#54b947] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#54b947]/30">
              <Check className="w-3.5 h-3.5" /> Punch in
            </div>
          </div>
        </div>
        <div className="px-4 mt-3 space-y-2">
          {['Approvals', 'Tasks', 'Leave requests'].map(l => (
            <div key={l} className="flex items-center gap-2.5 rounded-xl bg-white border border-slate-200/70 px-3 py-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50" />
              <span className="text-[11px] font-semibold text-slate-700">{l}</span>
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#54b947]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export function LandingMore() {
  return (
    <>
      {/* Institutions */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className={`${FRAME} px-5 sm:px-10 py-10 sm:py-14`}>
          <Heading title="Made for every kind of institution" sub="Whatever your size or model, PYPE ERM adapts to how you admit, teach and collect." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {INSTITUTIONS.map(({ icon: Icon, title, body }) => (
              <article key={title} className={`${PREMIUM_CARD} group overflow-hidden flex flex-col`}>
                <div className="relative h-28 bg-gradient-to-br from-[#6bd05a] via-[#54b947] to-[#1a5323] overflow-hidden">
                  <Icon aria-hidden="true" className="absolute -right-4 -bottom-6 w-32 h-32 text-white/15 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500" strokeWidth={1.25} />
                  <span className="absolute left-5 bottom-4 w-12 h-12 rounded-2xl bg-white/95 text-[#2f8a24] flex items-center justify-center shadow-lg"><Icon className="w-6 h-6" /></span>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-slate-900 mb-1.5">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">{body}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    {toChips(body).slice(0, 3).map(c => (
                      <span key={c} className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-semibold text-[#256c1d]">{c}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="text-center mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3">
            <a href="/features" className="inline-flex items-center gap-2 text-sm font-bold text-[#256c1d] underline decoration-[#54b947] underline-offset-4">Explore all features <ArrowRight className="w-4 h-4" /></a>
            <a href="/partner-with-us" className="inline-flex items-center gap-2 text-sm font-bold text-[#256c1d] underline decoration-[#54b947] underline-offset-4">Partner with us <ArrowRight className="w-4 h-4" /></a>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className={`${FRAME} grid lg:grid-cols-5 gap-5 lg:gap-6`}>
          <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-[#091f14] text-white p-7 sm:p-9 flex flex-col justify-between min-h-[320px]">
            <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 600" preserveAspectRatio="none">
              <defs>
                <linearGradient id="secWaveTop" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#54b947" /><stop offset="50%" stopColor="#2e8229" /><stop offset="100%" stopColor="#124317" />
                </linearGradient>
                <linearGradient id="secWaveBottom" x1="100%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#54b947" /><stop offset="100%" stopColor="#1a5323" />
                </linearGradient>
              </defs>
              <path d="M0,0 L220,0 C280,250 150,350 0,550 Z" fill="url(#secWaveTop)" opacity="0.55" />
              <path d="M400,600 L100,600 C250,450 400,300 400,100 Z" fill="url(#secWaveBottom)" opacity="0.55" />
              <circle cx="350" cy="120" r="110" fill="#8ae47e" opacity="0.14" />
            </svg>
            <div className="relative">
              <span className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center mb-5"><ShieldCheck className="w-6 h-6 text-[#8ae47e]" /></span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">Your institution's data, handled with care</h2>
              <p className="text-emerald-50/80 text-sm sm:text-base font-medium">Student records and fee data are sensitive. PYPE ERM is built to limit who can see them.</p>
            </div>
            <a href="/privacy-policy" className="relative mt-6 inline-flex items-center gap-2 text-sm font-bold text-white underline decoration-[#8ae47e] underline-offset-4 w-fit">
              Read our privacy policy <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4 sm:gap-5">
            {SECURITY.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className={`${i % 3 === 1 ? PREMIUM_CARD_ALT : PREMIUM_CARD} p-6`}>
                <div className={`w-11 h-11 mb-4 ${ICON_CHIP}`}><Icon className="w-5 h-5" /></div>
                <h3 className="font-bold text-base mb-1.5 text-slate-900">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile app */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className={`${FRAME} ${PREMIUM_CARD_ALT.replace('hover:-translate-y-1 ', '')} overflow-hidden grid lg:grid-cols-2 gap-10 items-center px-6 sm:px-12 py-10 sm:py-14`}>
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">Your institution in your pocket</h2>
            <p className="text-slate-500 text-base sm:text-lg font-medium mb-7">Staff and teams stay connected wherever they work, with the same data as the web app.</p>
            <ul className="grid sm:grid-cols-2 gap-3 mb-8">
              {APP_FEATURES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-start gap-3 rounded-2xl bg-white/90 border border-slate-200/60 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_20px_-12px_rgba(16,24,40,0.10)] px-4 py-3.5 text-sm font-semibold text-slate-700">
                  <span className={`w-8 h-8 shrink-0 ${ICON_CHIP}`}><Icon className="w-4 h-4" /></span>
                  <span className="leading-snug pt-1">{label}</span>
                </li>
              ))}
            </ul>
            <a href="/download" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-7 h-12 rounded-full shadow-lg transition-colors">
              <Download className="w-4 h-4" /> Download Android app
            </a>
          </div>
          <PhoneMock />
        </div>
      </section>
    </>
  );
}
