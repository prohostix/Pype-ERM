import { memo, useEffect, useRef, useState } from 'react';
import {
  GraduationCap, Users, FileText, CheckCircle2, TrendingUp, IndianRupee, CreditCard, Building,
  Clock, Check, Loader2, ArrowRight, Send, Receipt,
} from 'lucide-react';

const SCENE_MS = 7000;
const TICK_MS = 25; // clock resolution (re-render only when this quantum changes)
const CHAR_MS = 38;

/** Focus effect: the element being worked on stays sharp, everything else softly blurs. */
const focusCls = (on: boolean) =>
  `transition-opacity duration-300 ease-out ${on ? 'opacity-100' : 'opacity-60'}`;

const STUDENT = {
  name: 'Aarav Sharma',
  phone: '+91 98765 43210',
  course: 'B.Tech Computer Science & AI',
  counselor: 'Pooja M.',
  fee: '₹ 25,000',
  appNo: 'APP-2025-0842',
};

const SCENES = [
  {
    id: 'sales', step: 'Sales', title: 'Sales fills the enrollment form and submits it',
    portal: 'Sales & Enrollments', user: { name: 'Karan Sharma', role: 'Sales Lead', initials: 'KS' },
    nav: [
      { label: 'Provisional Enrollments', icon: GraduationCap },
      { label: 'Team Review & Approvals', icon: Users },
      { label: 'Document Verification', icon: FileText },
      { label: 'Counselor Quotas', icon: TrendingUp },
    ],
  },
  {
    id: 'operations', step: 'Operations', title: 'Operations receives it and verifies every detail',
    portal: 'Operations Desk', user: { name: 'Rajesh Kumar', role: 'Operations Head', initials: 'RK' },
    nav: [
      { label: 'Student Admissions', icon: GraduationCap },
      { label: 'Document Validation', icon: CheckCircle2 },
      { label: 'Study Centres', icon: Building },
      { label: 'Batch Allotments', icon: Users },
    ],
  },
  {
    id: 'finance', step: 'Finance', title: 'Finance collects the fee and issues the receipt',
    portal: 'Finance & Accounts', user: { name: 'Priya Sundaram', role: 'Finance Officer', initials: 'PS' },
    nav: [
      { label: 'Fee Schedules & Bills', icon: IndianRupee },
      { label: 'Payments', icon: CreditCard },
      { label: 'Receipts', icon: FileText },
      { label: 'Defaulters & Dues', icon: Clock },
    ],
  },
] as const;

const Field = memo(function Field({ label, text, active, wide }: { label: string; text: string; active: boolean; wide: boolean }) {
  return (
    <div className={`${wide ? 'sm:col-span-2' : ''} ${focusCls(active)}`}>
      <div className="text-[11px] font-bold text-slate-500 mb-1">{label}</div>
      <div className={`h-10 px-3 rounded-xl border text-sm font-semibold flex items-center whitespace-pre overflow-hidden transition-[border-color,box-shadow,background-color] duration-300 ${active ? 'border-[#54b947] ring-4 ring-[#54b947]/15 bg-white' : 'border-slate-200 bg-slate-50'} text-slate-900`}>
        {text}
        {active && <span className="w-px h-4 bg-slate-900 ml-0.5 shrink-0 animate-pulse" />}
      </div>
    </div>
  );
});

/* ───────── Scene 1: Sales form ───────── */
function SalesScene({ t }: { t: number }) {
  const fields = [
    ['Student name', STUDENT.name],
    ['Phone', STUDENT.phone],
    ['Programme', STUDENT.course],
    ['Counselor', STUDENT.counselor],
    ['Seat fee', STUDENT.fee],
  ] as const;
  const total = fields.reduce((n, [, v]) => n + v.length, 0);
  const typed = Math.max(0, Math.floor((t - 300) / CHAR_MS));
  const typing = typed < total;
  const pressed = t >= 3300 && t < 3650;
  const submitted = t >= 3650;
  const sending = t >= 4500;

  // Which field is being typed right now
  let left = typed;
  let activeField = -1;
  for (let i = 0; i < fields.length; i++) {
    if (left < fields[i][1].length || (i === fields.length - 1)) { activeField = i; break; }
    left -= fields[i][1].length;
  }
  const phase: 'form' | 'button' | 'status' = submitted && sending ? 'status' : typing ? 'form' : 'button';

  let rest = typed;
  return (
    <div className="space-y-4">
      <div className={focusCls(false)}>
        <h3 className="text-lg sm:text-xl font-bold text-slate-900">New Provisional Enrollment</h3>
        <p className="text-xs text-slate-500 font-medium">Fill in the student's details and submit for verification.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {fields.map(([label, value], i) => {
          const shown = Math.min(value.length, rest);
          const active = phase === 'form' && i === activeField;
          rest = Math.max(0, rest - value.length);
          return <Field key={label} label={label} text={value.slice(0, shown)} active={active} wide={i === 2} />;
        })}
      </div>
      <div className="flex items-center gap-3 pt-1">
        <div className={focusCls(phase === 'button')}>
          <button
            type="button" tabIndex={-1}
            className={`h-10 px-6 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all duration-300 ${submitted ? 'bg-emerald-700' : 'bg-[#54b947]'} ${pressed ? 'scale-95 ring-4 ring-[#54b947]/30' : phase === 'button' ? '' : ''}`}
          >
            {submitted ? <><Check className="w-4 h-4" /> Submitted</> : <>Submit Enrollment</>}
          </button>
        </div>
        {submitted && (
          <div className={`flex items-center gap-2 text-xs font-bold text-emerald-700 animate-in fade-in slide-in-from-left-2 ${focusCls(phase === 'status' || !sending)}`}>
            <Send className="w-4 h-4" />
            {sending ? 'Sent to Operations for verification' : 'Saving enrollment…'}
            {sending && <ArrowRight className="w-4 h-4 animate-pulse" />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Scene 2: Operations verifies ───────── */
const CHECKS = ['Identity proof matches name', '10th / 12th marksheets uploaded', 'Photograph & signature', 'Eligibility for B.Tech CSE & AI'];
function OperationsScene({ t }: { t: number }) {
  const arrived = t >= 200;
  const done = t >= 4900;
  const stepStart = (i: number) => 800 + i * 1000;
  // Focus the check currently running; once all done, focus the result line.
  const current = CHECKS.findIndex((_, i) => t < stepStart(i) + 700);
  return (
    <div className="space-y-4">
      <div className={focusCls(!arrived)}>
        <h3 className="text-lg sm:text-xl font-bold text-slate-900">Admissions Verification Queue</h3>
        <p className="text-xs text-slate-500 font-medium">New enrollments from Sales appear here for document and eligibility checks.</p>
      </div>
      {arrived && (
        <div className={`rounded-2xl border p-4 transition-colors duration-500 animate-in fade-in slide-in-from-top-3 ${done ? 'border-emerald-300 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/40'}`}>
          <div className={`flex items-start justify-between gap-3 mb-3 ${focusCls(t < 800)}`}>
            <div>
              <div className="font-bold text-slate-900 text-sm">{STUDENT.name} <span className="text-slate-400 font-normal">({STUDENT.appNo})</span></div>
              <div className="text-[11px] text-slate-500">{STUDENT.course} • Received from Sales (Counselor: {STUDENT.counselor})</div>
            </div>
            <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border ${done ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
              {done ? 'Verified' : 'Verifying…'}
            </span>
          </div>
          <ul className="space-y-2">
            {CHECKS.map((c, i) => {
              const ok = t >= stepStart(i) + 700;
              const running = t >= stepStart(i) && !ok;
              return (
                <li key={c} className={`flex items-center gap-2.5 text-xs font-semibold ${focusCls(i === current)}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-300 ${ok ? 'bg-[#54b947] text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {ok ? <Check className="w-3 h-3" /> : running ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  </span>
                  <span className="text-slate-700">{c}</span>
                </li>
              );
            })}
          </ul>
          {done && (
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-700 animate-in fade-in slide-in-from-left-2">
              <Send className="w-4 h-4" /> All details verified. Sent to Finance for fee collection <ArrowRight className="w-4 h-4 animate-pulse" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────── Scene 3: Finance collects fee ───────── */
function FinanceScene({ t }: { t: number }) {
  const times = [0, 1200, 2500, 3700];
  const confirmed = t >= 4800;
  const paid = t >= times[2];
  const current = confirmed ? -1 : times.reduce((c, ts, i) => (t >= ts ? i : c), 0);
  const steps = [
    { label: 'Verified enrollment received from Operations', icon: Users },
    { label: 'Payment link sent to student', icon: Send },
    { label: `Paid via UPI: ${STUDENT.fee}`, icon: CreditCard },
    { label: 'Receipt generated', icon: Receipt },
  ];
  return (
    <div className="space-y-4">
      <div className={focusCls(false)}>
        <h3 className="text-lg sm:text-xl font-bold text-slate-900">Seat Fee Collection</h3>
        <p className="text-xs text-slate-500 font-medium">Verified students move here to pay the seat fee.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className={`flex items-center justify-between ${focusCls(false)}`}>
          <div>
            <div className="font-bold text-slate-900 text-sm">{STUDENT.name} <span className="text-slate-400 font-normal">({STUDENT.appNo})</span></div>
            <div className="text-[11px] text-slate-500">Seat fee • {STUDENT.fee}</div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors duration-300 ${paid ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
            {paid ? 'Paid' : 'Due'}
          </span>
        </div>
        <ul className="space-y-2.5">
          {steps.map(({ label, icon: Icon }, i) => {
            const on = t >= times[i];
            return (
              <li key={label} className={`flex items-center gap-2.5 text-xs font-semibold transition-all duration-500 ${on ? '' : 'opacity-20 -translate-x-1'} ${on ? focusCls(i === current) : ''}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300 ${on ? 'bg-[#54b947] text-white' : 'bg-slate-200 text-slate-400'}`}><Icon className="w-3.5 h-3.5" /></span>
                <span className="text-slate-700">{label}</span>
              </li>
            );
          })}
        </ul>
      </div>
      {confirmed && (
        <div className="rounded-2xl bg-emerald-600 text-white px-4 py-3 text-sm font-bold flex items-center gap-2 animate-in fade-in zoom-in-95 duration-500">
          <CheckCircle2 className="w-5 h-5" /> Admission confirmed for {STUDENT.name}
        </div>
      )}
    </div>
  );
}

/** Which sidebar item is active (and any live badge) as the workflow progresses. */
function sidebarState(id: string, t: number): { active: number; badges: Record<number, string> } {
  if (id === 'sales') {
    // 0 Provisional Enrollments: badge appears once the form is submitted
    return { active: 0, badges: t >= 3650 ? { 0: '+1' } : {} };
  }
  if (id === 'operations') {
    // 0 Student Admissions (new arrival) -> 1 Document Validation while checks run
    if (t < 200) return { active: 0, badges: {} };
    if (t < 800) return { active: 0, badges: { 0: '1' } };
    if (t < 4900) return { active: 1, badges: { 0: '1', 1: '4' } };
    return { active: 1, badges: { 1: '✓' } };
  }
  // finance: 0 Fee Schedules -> 1 Payments -> 2 Receipts
  if (t < 1200) return { active: 0, badges: { 0: '1' } };
  if (t < 2500) return { active: 0, badges: { 0: 'Link sent' } };
  if (t < 3700) return { active: 1, badges: { 1: '₹' } };
  return { active: 2, badges: { 2: t >= 4800 ? '✓' : '1' } };
}

export function LandingTour() {
  const [time, setTime] = useState(0);
  const [reduced, setReduced] = useState(false);
  const total = SCENE_MS * SCENES.length;

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const timeRef = useRef(0);
  useEffect(() => {
    if (reduced) {
      // Reduced motion: no typing animation, just show each finished scene in turn.
      const id = setInterval(() => setTime(x => (x + SCENE_MS) % total), 6000);
      return () => clearInterval(id);
    }
    // Frame-aligned clock: smooth, and React re-renders only when the quantised time changes.
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      timeRef.current = (timeRef.current + Math.max(0, Math.min(now - last, 100))) % total;
      last = now;
      setTime(Math.floor(timeRef.current / TICK_MS) * TICK_MS);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, total]);

  const sceneIdx = Math.min(SCENES.length - 1, Math.max(0, Math.floor(time / SCENE_MS)));
  const local = reduced ? SCENE_MS : time % SCENE_MS;
  const scene = SCENES[sceneIdx];
  const side = sidebarState(scene.id, local);

  return (
    <div>
      {/* Flow indicator */}
      <div className="flex flex-col items-center gap-3 mb-5" aria-live="polite">
        <div className="flex items-center gap-1.5 sm:gap-2" aria-hidden="true">
          {SCENES.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1.5 sm:gap-2">
              <span className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 ${i === sceneIdx ? 'bg-[#54b947] text-white border-[#54b947]' : i < sceneIdx ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}>
                {i < sceneIdx && <Check className="inline w-3 h-3 mr-1" />}{s.step}
              </span>
              {i < SCENES.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-300" />}
            </div>
          ))}
        </div>
        <div key={sceneIdx} className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 animate-in fade-in slide-in-from-bottom-1 duration-500">
          <span className="text-[#54b947] mr-2">Step {sceneIdx + 1} of {SCENES.length}</span>{scene.title}
        </div>
      </div>

      {/* Window */}
      <div className="relative w-full rounded-3xl border border-slate-200 bg-white overflow-hidden text-left">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">Example workflow, using sample data</div>

        <div className="flex min-h-[440px]">
          <div key={`nav-${scene.id}`} className="w-56 bg-slate-50/90 border-r border-slate-200 p-3 hidden md:flex flex-col justify-between text-xs animate-in fade-in duration-300">
            <div className="space-y-1">
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{scene.portal}</div>
              {scene.nav.map(({ label, icon: Icon }, i) => {
                const on = i === side.active;
                const badge = side.badges[i];
                return (
                  <div key={label} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-all duration-500 ${on ? 'bg-[#54b947] text-white font-bold' : 'text-slate-500 opacity-70'}`}>
                    <Icon className="w-4 h-4 shrink-0" /><span className="truncate">{label}</span>
                    {badge && (
                      <span key={badge} className={`ml-auto shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold animate-in zoom-in-50 duration-300 ${on ? 'bg-white text-[#256c1d]' : 'bg-[#54b947] text-white'}`}>{badge}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#54b947] text-white font-bold flex items-center justify-center text-xs">{scene.user.initials}</div>
              <div className="truncate"><div className="font-bold text-slate-800 text-xs truncate">{scene.user.name}</div><div className="text-[10px] text-slate-500">{scene.user.role}</div></div>
            </div>
          </div>

          <div className="flex-1 p-4 sm:p-7 bg-white">
            <div key={scene.id} className="animate-in fade-in duration-500 ease-out">
              {scene.id === 'sales' && <SalesScene t={local} />}
              {scene.id === 'operations' && <OperationsScene t={local} />}
              {scene.id === 'finance' && <FinanceScene t={local} />}
            </div>
          </div>
        </div>
        <div className="h-1 bg-slate-100" aria-hidden="true">
          <div className="h-full bg-[#54b947] " style={{ width: `${((time + TICK_MS) / total) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
