import {
  School, Landmark, BookOpenCheck, Building2, ShieldCheck, Lock, KeyRound, Server,
  Smartphone, Camera, MapPin, Bell, Download, ArrowRight,
} from 'lucide-react';
import { reveal } from './marketing/scrollEffects';
import { CardRibbon } from './marketing/CardRibbon';
import { PREMIUM_CARD, PREMIUM_CARD_ALT, ICON_CHIP } from './cardStyles';

const Heading = ({ title, sub }: { title: string; sub: string }) => (
  <div {...reveal()} className="max-w-3xl mb-6 sm:mb-8">
    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">{title}</h2>
    <p className="text-slate-600 text-base sm:text-lg">{sub}</p>
  </div>
);

const INSTITUTIONS = [
  { icon: School, title: 'Schools', body: 'Admissions, fee installments, staff attendance and announcements on one system.' },
  { icon: Landmark, title: 'Colleges & Universities', body: 'Programmes, enrollment review, exam registration, marks and multi-branch reporting.' },
  { icon: BookOpenCheck, title: 'Coaching Institutes', body: 'Batches, faculty attendance, online sessions and fee collection with reminders.' },
  { icon: Building2, title: 'Study Centre Networks', body: 'Onboard partner centres, manage wallets and track every centre\'s admissions.' },
];

const SECURITY = [
  { icon: KeyRound, title: 'Role-based access', body: 'Every user sees only the data and actions their role allows.' },
  { icon: Lock, title: 'Protected credentials', body: 'Passwords are stored only as salted hashes, and sessions use secure tokens.' },
  { icon: Server, title: 'Hosted in India', body: 'Data is stored on Amazon Web Services in the India region and sent over HTTPS.' },
  { icon: ShieldCheck, title: 'No data selling', body: 'We do not sell personal information or use it for advertising.' },
];

const APP_FEATURES = [
  { icon: Camera, label: 'Selfie punch-in and punch-out' },
  { icon: MapPin, label: 'Location-stamped attendance' },
  { icon: Bell, label: 'Push notifications for approvals and tasks' },
  { icon: Smartphone, label: 'Leave requests and daily work on the go' },
];

/** Institution types, shown on the Why Choose Us page. */
export function Institutions() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <Heading title="Who uses PYPE ERM" sub="Schools, colleges, coaching institutes and study centre networks." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
        {INSTITUTIONS.map(({ icon: Icon, title, body }, i) => (
          <article key={title} {...reveal(i % 2)} className="flex items-start gap-4">
            <div className={`w-11 h-11 shrink-0 ${ICON_CHIP}`}><Icon className="w-5 h-5" /></div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900 mb-1">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Data handling summary, shown on the Why Choose Us page. */
export function SecurityBlock() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="grid lg:grid-cols-5 gap-4 lg:gap-5">
        <div {...reveal(0, 'left')} className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-[#091f14] text-white p-7 sm:p-8">
          <CardRibbon />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-3">How we protect your data</h2>
            <p className="text-emerald-50 text-base mb-5">Student records and fee data are sensitive. PYPE ERM is built to limit who can see them.</p>
            <a href="/privacy-policy" className="inline-flex items-center gap-2 text-sm font-semibold text-white underline decoration-[#8ae47e] underline-offset-4">
              Read our privacy policy <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
        <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
          {SECURITY.map(({ icon: Icon, title, body }, i) => (
            <div key={title} {...reveal(i)} className={`${i % 3 === 1 ? PREMIUM_CARD_ALT : PREMIUM_CARD} p-5`}>
              <Icon className="w-5 h-5 mb-3 text-[#256c1d]" />
              <h3 className="font-semibold text-base mb-1 text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Mobile app summary, shown on the Features page. */
export function MobileApp() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div {...reveal(0, 'left')}>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">Staff can work from the mobile app</h2>
          <p className="text-slate-600 text-base sm:text-lg mb-7">They can mark attendance and manage daily work on the phone, using the same data as the web app.</p>
          <a href="/download" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 h-12 rounded-full transition-colors">
            <Download className="w-4 h-4" /> Download Android app
          </a>
        </div>
        <ul className="divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white px-5 sm:px-6">
          {APP_FEATURES.map(({ icon: Icon, label }, i) => (
            <li key={label} {...reveal(i)} className="flex items-center gap-3 py-4 text-sm sm:text-base text-slate-800">
              <Icon className="w-5 h-5 shrink-0 text-[#256c1d]" /> {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
