import {
  ArrowRight, Award, Banknote, BarChart3, Bell, Boxes, Building2, Calendar, Camera, CheckSquare, ClipboardList, FileCheck, Fingerprint, GraduationCap, Layers, LayoutDashboard, Link2, ListChecks, MessageCircle, ReceiptIndianRupee, ShieldCheck, Target, TrendingUp, Truck, Video,
} from 'lucide-react';
import { reveal } from './marketing/scrollEffects';

/** Only features the product has today; keep this in step with the Features page. */
const FEATURES = [
  { icon: GraduationCap, label: 'Online Applications' },
  { icon: FileCheck, label: 'Document Verification' },
  { icon: TrendingUp, label: 'Lead Pipeline' },
  { icon: Building2, label: 'Study Centre Onboarding' },
  { icon: Fingerprint, label: 'Biometric Attendance' },
  { icon: Camera, label: 'Selfie Punch-in' },
  { icon: Calendar, label: 'Fee Schedules' },
  { icon: Link2, label: 'Payment Links' },
  { icon: ReceiptIndianRupee, label: 'Receipts' },
  { icon: Banknote, label: 'Payroll Batches' },
  { icon: ClipboardList, label: 'Leave Workflows' },
  { icon: Layers, label: 'Batches & Lessons' },
  { icon: Video, label: 'Online Sessions' },
  { icon: CheckSquare, label: 'Tasks' },
  { icon: MessageCircle, label: 'WhatsApp Messages' },
  { icon: LayoutDashboard, label: 'Role-based Dashboards' },
  { icon: BarChart3, label: 'Conversion Reports' },
  { icon: ShieldCheck, label: 'Users & Roles' },
  { icon: ListChecks, label: 'Exam Registration' },
  { icon: Award, label: 'Internal Marks' },
  { icon: Target, label: 'Counselor Targets' },
  { icon: Bell, label: 'Fee Reminders' },
  { icon: Truck, label: 'Courier Tracking' },
  { icon: Boxes, label: 'Asset Management' },
];

const PHONE_LIMIT = 12;

/** Ruled grid of product features. Every tile leads to the full Features page. */
export function LandingFeaturesGrid() {
  return (
    <section id="all-features" className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 scroll-mt-24">
      <div {...reveal()} className="max-w-3xl mb-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">What your teams can do in PYPE ERM</h2>
        <p className="text-slate-600 text-base sm:text-lg">Some of the everyday work your staff can do here.</p>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 -mr-px -mb-px">
        {FEATURES.map(({ icon: Icon, label }, i) => (
          <li key={label} className={i >= PHONE_LIMIT ? 'hidden sm:block' : ''}>
            <a
              href="/features"
              className="group h-full min-h-24 flex flex-col items-center justify-center gap-2.5 p-3 text-center border-r border-b border-slate-200 hover:bg-emerald-50 transition-colors"
            >
              <Icon className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] transition-colors" strokeWidth={1.5} />
              <span className="text-xs sm:text-[13px] font-medium leading-snug text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
            </a>
          </li>
        ))}
      </ul>
      </div>
      <div className="mt-6">
        <a href="/features" className="inline-flex items-center gap-2 text-sm font-semibold text-[#256c1d] underline underline-offset-4">
          See all features <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </section>
  );
}
