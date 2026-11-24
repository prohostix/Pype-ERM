import { BarChart3, CalendarClock, Users, MessageSquare, LayoutDashboard, ShieldCheck, Zap, SlidersHorizontal, Gauge, Smile } from 'lucide-react';
import { reveal } from './marketing/scrollEffects';

const GREEN = '#256c1d';

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full bg-[#f1f2ef] px-3.5 py-1.5 text-xs font-medium text-slate-600">{children}</span>
);

const CardShell = ({ icon: Icon, title, sub, className = '', children, i = 0 }: { icon: any; title: string; sub: string; className?: string; children: React.ReactNode; i?: number }) => (
  <div {...reveal(i)} className={`group relative overflow-hidden rounded-[28px] bg-[#f4f6f3] p-6 sm:p-7 pb-0 sm:pb-0 min-h-[300px] flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_44px_-18px_rgba(44,119,34,0.28)] ${className}`}>
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-lg font-medium text-slate-900 tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm text-slate-500 max-w-[16rem] leading-relaxed">{sub}</p>
      </div>
      <span className="shrink-0 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" style={{ color: '#54b947' }}><Icon className="w-4 h-4" /></span>
    </div>
    <div className="mt-6 flex-1 flex items-end [&>div]:rounded-b-none [&>div]:shadow-[0_-6px_24px_-10px_rgba(16,24,40,0.15)]">{children}</div>
  </div>
);

/** Small white "mini UI" panel used inside each card. */
const Mini = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div aria-hidden="true" className={`w-full rounded-2xl bg-white p-4 shadow-[0_8px_24px_-10px_rgba(16,24,40,0.18)] ${className}`}>{children}</div>
);

function AnalyticsMini() {
  const bars = [38, 55, 44, 70, 60, 86, 100];
  return (
    <Mini>
      <div className="flex items-center justify-between text-[11px] text-slate-500"><span>Fees collected</span><span className="text-[#256c1d] font-semibold">+18%</span></div>
      <div className="text-xl font-bold text-slate-900 mt-1">₹42.6L</div>
      <div className="flex items-end gap-1.5 h-16 mt-3">
        {bars.map((h, i) => <span key={i} className="bar-grow flex-1 rounded-t-md" style={{ ['--d' as string]: `${i * 90}ms`, height: `${h}%`, background: i === 6 ? '#54b947' : '#dff3da' }} />)}
      </div>
    </Mini>
  );
}

function ScheduleMini() {
  return (
    <Mini>
      <div className="flex gap-1.5 mb-3">
        {['Upcoming', 'Pending', 'Past'].map((t, i) => (
          <span key={t} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${i === 0 ? 'bg-[#54b947] text-white' : 'text-slate-500 bg-slate-100'}`}>{t}</span>
        ))}
      </div>
      <p className="text-sm font-semibold text-slate-900">Parent–Teacher Meeting</p>
      <p className="text-[11px] text-slate-500 mt-0.5">11:00 AM – 11:30 AM · Class 8</p>
    </Mini>
  );
}

function TeamMini() {
  return (
    <Mini className="space-y-2.5">
      {[['Counsellor team', '12 leads today'], ['Finance team', '34 receipts']].map(([n, s]) => (
        <div key={n} className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-[#dff3da] text-[#256c1d] text-xs font-bold flex items-center justify-center">{n[0]}</span>
          <div className="min-w-0"><p className="text-xs font-semibold text-slate-900">{n}</p><p className="text-[11px] text-slate-500">{s}</p></div>
          <span className="ml-auto rounded-full bg-[#54b947] text-white text-[10px] px-2.5 py-1 font-semibold">Open</span>
        </div>
      ))}
    </Mini>
  );
}

function ChatMini() {
  return (
    <Mini className="space-y-2.5">
      <p className="msg-in rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-xs text-slate-700 max-w-[80%]">Has the fee reminder gone out to Class 10 parents?</p>
      <p style={{ ['--d' as string]: '500ms' }} className="msg-in rounded-2xl rounded-tr-sm bg-[#e7f6e3] px-3 py-2 text-xs text-slate-800 max-w-[80%] ml-auto">Yes, sent by WhatsApp and email this morning.</p>
    </Mini>
  );
}

function DashMini() {
  return (
    <Mini>
      <div className="grid grid-cols-3 gap-2">
        {[['Admissions', '1,248'], ['Pending', '₹6.1L'], ['Attendance', '98.2%']].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] text-slate-500">{l}</p><p className="text-sm font-bold text-slate-900 mt-0.5">{v}</p></div>
        ))}
      </div>
      <svg viewBox="0 0 200 40" className="w-full h-10 mt-3" preserveAspectRatio="none"><path pathLength="1" className="draw-line" d="M0 32 C30 30 40 12 70 18 S110 34 135 16 S175 6 200 4" fill="none" stroke="#54b947" strokeWidth="2.5" strokeLinecap="round" /></svg>
    </Mini>
  );
}

const BENEFITS = [
  { icon: ShieldCheck, title: 'Built by an expert team', body: 'The team that builds PYPE ERM sets it up, trains your staff and supports you after launch.' },
  { icon: Zap, title: 'Fast and scalable', body: 'Start with one branch and add more as you grow, on the same set of records.' },
  { icon: SlidersHorizontal, title: 'Configured for you', body: 'Your structure, roles, approvals and fee rules are set up to match how you work.' },
  { icon: Gauge, title: 'Maximum efficiency', body: 'Connected admissions, fees, attendance and HR remove repeat data entry and manual follow-ups.' },
  { icon: Smile, title: 'Easy for every user', body: 'Each person gets a simple dashboard for their job, from principals to parents.' },
];

const BENEFIT_CHIPS = ['Role-based access', 'UPI-ready collection', 'Audit-ready reports', 'Automated reminders', 'Centralised data'];

export function LandingShowcase() {
  return (
    <>
      <section id="valuable-features" className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-24">
        <div {...reveal()} className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex rounded-full bg-[#f4f4f2] px-3 py-1 text-xs font-medium text-slate-500">Valuable Features</span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-medium tracking-tight text-slate-900">Customizable Solutions for Every Need</h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg">Adapt the platform to your institution with flexible modules that grow with you.</p>
        </div>

        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          <CardShell i={0} icon={BarChart3} title="Real-time analytics" sub="Monitor admissions, collections and attendance as they happen."><AnalyticsMini /></CardShell>
          <CardShell i={1} icon={CalendarClock} title="Scheduling" sub="Plan classes, meetings and follow-ups across every branch."><ScheduleMini /></CardShell>
          <CardShell i={2} icon={Users} title="Team collaboration" sub="Manage tasks and approvals with your teams efficiently."><TeamMini /></CardShell>
        </div>
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 mt-4 sm:mt-5">
          <CardShell i={0} icon={MessageSquare} title="Streamlined communication" sub="Announcements, polls and reminders by email, WhatsApp and push."><ChatMini /></CardShell>
          <CardShell i={1} icon={LayoutDashboard} title="Role-based dashboards" sub="Every role sees the metrics that matter to their work."><DashMini /></CardShell>
        </div>
      </section>

      <section id="benefits" className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          <div {...reveal()} className="self-start">
            <span className="inline-flex rounded-full bg-[#f4f4f2] px-3 py-1 text-xs font-medium text-slate-500">Benefits</span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-slate-900 leading-[1.1]">Unlock a new era of operational excellence</h2>
            <p className="mt-4 text-slate-600 text-base sm:text-lg max-w-md">Admissions, fees, academics, HR and compliance work together, so your team spends less time chasing data.</p>
            <div className="mt-6 flex flex-wrap gap-2">{BENEFIT_CHIPS.map(c => <Pill key={c}>{c}</Pill>)}</div>
          </div>
          <ul>
            {BENEFITS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} {...reveal(i)} className="relative pl-6 py-5 border-l-2 border-slate-200 hover:border-[#54b947] transition-colors">
                <span className="accent-grow absolute left-[-2px] top-5 h-10 w-[2px]" style={{ background: '#54b947', ['--d' as string]: '200ms' }} />
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" style={{ color: GREEN }} />
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                </div>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
