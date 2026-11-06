import { GraduationCap, Users, IndianRupee, Clock, Check, Plus, Receipt } from 'lucide-react';
import { PREMIUM_CARD, PREMIUM_CARD_ALT, ICON_CHIP } from './cardStyles';

const KEYFRAMES = `
@keyframes bentoGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes bentoDraw{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:var(--off)}}
@keyframes bentoRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion: reduce){.bento-anim{animation:none!important}}
`;

const Tile = ({ title, icon: Icon, tint, live, className = '', children }: {
  title: string; icon: typeof Users; tint: 'main' | 'alt'; live?: boolean; className?: string; children: React.ReactNode;
}) => (
  <div className={`${tint === 'alt' ? PREMIUM_CARD_ALT : PREMIUM_CARD} ${className} group p-5 sm:p-6 flex flex-col overflow-hidden`}>
    <div className="flex items-center gap-2.5 mb-5">
      <span className={`w-9 h-9 ${ICON_CHIP}`}><Icon className="w-4 h-4" /></span>
      <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-tight">{title}</h3>
      {live && (
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#54b947] animate-pulse" /> Live
        </span>
      )}
    </div>
    <div aria-hidden="true" className="flex-1 flex flex-col">{children}</div>
  </div>
);

const Pill = ({ c, children }: { c: string; children: React.ReactNode }) => (
  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c}`}>{children}</span>
);

const PANEL = 'bg-white rounded-2xl border border-slate-200/70 shadow-[0_6px_18px_-8px_rgba(16,24,40,0.15)]';

/* Admissions: donut ring + legend */
function AdmissionsMock() {
  const R = 38;
  const C = 2 * Math.PI * R;
  const segs = [
    { label: 'Needs Review', n: 42, color: '#fbbf24' },
    { label: 'Enrolled', n: 47, color: '#54b947' },
    { label: 'Documents Pending', n: 16, color: '#38bdf8' },
  ];
  const total = segs.reduce((a, s) => a + s.n, 0);
  let acc = 0;
  return (
    <div className={`${PANEL} p-4 flex items-center gap-4`}>
      <div className="relative w-[92px] h-[92px] shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#f1f5f9" strokeWidth="12" />
          {segs.map(s => {
            const len = (s.n / total) * C;
            const off = -acc;
            acc += len;
            return (
              <circle
                key={s.label} cx="50" cy="50" r={R} fill="none" stroke={s.color} strokeWidth="12" strokeLinecap="butt"
                strokeDasharray={`${len - 2} ${C - len + 2}`}
                strokeDashoffset={off}
                className="bento-anim"
                style={{ ['--len' as string]: C, ['--off' as string]: off, animation: 'bentoDraw 1.1s ease-out both' }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-slate-900 leading-none">{total}</span>
          <span className="text-[9px] font-semibold text-slate-400 mt-0.5">students</span>
        </div>
      </div>
      <ul className="space-y-2 flex-1 min-w-0">
        {segs.map(s => (
          <li key={s.label} className="flex items-center gap-2 text-[11px] text-slate-600 font-semibold">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="truncate">{s.label}</span>
            <b className="ml-auto text-slate-900">{s.n}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Review: avatar list with status */
function ReviewMock() {
  const rows = [
    { i: 'AS', s: 'Pending', c: 'bg-amber-100 text-amber-800', bg: 'from-[#6bd05a] to-[#2c7722]', w: 'w-2/3' },
    { i: 'RV', s: 'Approved', c: 'bg-emerald-100 text-emerald-800', bg: 'from-sky-400 to-sky-600', w: 'w-1/2' },
    { i: 'KS', s: 'Approved', c: 'bg-emerald-100 text-emerald-800', bg: 'from-violet-400 to-violet-600', w: 'w-3/5' },
  ];
  return (
    <div className={`${PANEL} p-4 space-y-3`}>
      {rows.map((r, idx) => (
        <div key={r.i} className="flex items-center gap-3 bento-anim" style={{ animation: `bentoRise .5s ease-out ${idx * 0.12}s both` }}>
          <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${r.bg} text-white text-[10px] font-bold flex items-center justify-center shadow-sm`}>{r.i}</span>
          <div className="flex-1 space-y-1.5">
            <span className={`block h-2 rounded-full bg-slate-200 ${r.w}`} />
            <span className="block h-1.5 w-1/3 rounded-full bg-slate-100" />
          </div>
          <Pill c={r.c}>{r.s}</Pill>
        </div>
      ))}
      <div className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 text-[11px] text-emerald-700 font-bold py-2">
        <Plus className="w-3.5 h-3.5" /> Add review
      </div>
    </div>
  );
}

/* HR: devices + vertical timeline */
function HrMock() {
  const events = [['09:02', 'Punch in'], ['13:30', 'Break'], ['18:05', 'Punch out']];
  return (
    <div className="space-y-3 flex-1 flex flex-col">
      <div className="grid grid-cols-2 gap-2">
        {['Device 01', 'Device 02'].map(d => (
          <div key={d} className={`${PANEL} px-3 py-2.5`}>
            <div className="text-[11px] font-bold text-slate-800">{d}</div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#54b947] animate-pulse" /> Online
            </div>
          </div>
        ))}
      </div>
      <div className={`${PANEL} p-4 flex-1`}>
        <ol className="relative space-y-5 pl-6 before:absolute before:left-[9px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-gradient-to-b before:from-[#54b947] before:to-emerald-100">
          {events.map(([t, l], idx) => (
            <li key={t} className="relative bento-anim" style={{ animation: `bentoRise .5s ease-out ${0.2 + idx * 0.15}s both` }}>
              <span className="absolute -left-6 top-0.5 w-[19px] h-[19px] rounded-full bg-white border-2 border-[#54b947] flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-[#54b947]" strokeWidth={3} />
              </span>
              <div className="flex items-baseline gap-3">
                <b className="font-mono text-sm text-slate-900">{t}</b>
                <span className="text-xs text-slate-500 font-medium">{l}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* Fees: bar chart + installment stepper */
function FeesMock() {
  const bars = [32, 52, 40, 68, 58, 84, 72];
  const steps = [
    { l: 'Installment 1', s: 'Paid', c: 'bg-emerald-100 text-emerald-800', done: true },
    { l: 'Installment 2', s: 'Due', c: 'bg-amber-100 text-amber-800', done: false },
    { l: 'Installment 3', s: 'Upcoming', c: 'bg-slate-100 text-slate-600', done: false },
  ];
  return (
    <div className="grid sm:grid-cols-5 gap-3 flex-1">
      <div className={`${PANEL} p-4 sm:col-span-3 flex flex-col`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-slate-500 font-semibold">Collected this month</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">₹ ——</div>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">On track</span>
        </div>
        <div className="flex items-end gap-2 h-24 mt-4 border-b border-slate-100">
          {bars.map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-t-lg bg-gradient-to-t from-[#2c7722] via-[#54b947] to-[#8ae47e] origin-bottom bento-anim"
              style={{ height: `${h}%`, animation: `bentoGrow .7s cubic-bezier(.2,.8,.2,1) ${i * 0.07}s both` }}
            />
          ))}
        </div>
      </div>
      <div className={`${PANEL} p-4 sm:col-span-2 flex flex-col`}>
        <ul className="space-y-3 flex-1">
          {steps.map(s => (
            <li key={s.l} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${s.done ? 'bg-[#54b947] text-white' : 'bg-white border-2 border-slate-200'}`}>
                {s.done && <Check className="w-3 h-3" strokeWidth={3} />}
              </span>
              <span className="truncate">{s.l}</span>
              <span className="ml-auto"><Pill c={s.c}>{s.s}</Pill></span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-[11px] font-semibold text-emerald-800">
          <Receipt className="w-3.5 h-3.5 shrink-0" /> Receipt generated automatically
        </div>
      </div>
    </div>
  );
}

export function LandingBento() {
  return (
    <section id="features" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24 scroll-mt-24">
      <style>{KEYFRAMES}</style>
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
          Save time and <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#256c1d] via-[#54b947] to-[#1a5323]">get more done.</span>
        </h2>
        <p className="text-slate-500 text-base sm:text-lg font-medium">
          Everything you need to manage your institution, brought together in a single intuitive workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <Tile title="Admissions" icon={GraduationCap} tint="main" live><AdmissionsMock /></Tile>
        <Tile title="Provisional & Team Review" icon={Users} tint="alt"><ReviewMock /></Tile>
        <Tile title="HR & Attendance" icon={Clock} tint="main" live className="md:row-span-2"><HrMock /></Tile>
        <Tile title="Fee Collections" icon={IndianRupee} tint="alt" className="md:col-span-2"><FeesMock /></Tile>
      </div>
    </section>
  );
}
