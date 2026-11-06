import {
  GraduationCap, TrendingUp, IndianRupee, Users, BookOpen, MessageSquare,
  ClipboardCheck, BarChart3, Check, ArrowRight, ShieldCheck,
} from 'lucide-react';
import { reveal } from './scrollEffects';
import { PREMIUM_CARD_STATIC, ICON_CHIP } from '../cardStyles';
import { MobileApp } from '../LandingMore';
import { Roles } from '../LandingSections';
import { MarketingShell, PageHero, CtaBand } from './MarketingShell';

const FEATURE_GROUPS = [
  {
    icon: GraduationCap, title: 'Admissions & Students',
    body: 'Take applications online and move each student from enquiry to enrollment without paperwork.',
    points: ['Online student application portal', 'Document upload and verification', 'Enrollment review and approval', 'Re-registration, exam registration and marks', 'Student portal'],
  },
  {
    icon: TrendingUp, title: 'Sales, CRM & Study Centres',
    body: 'Track leads, manage follow-ups and convert enquiries into admissions.',
    points: ['Lead pipeline and follow-ups', 'Counselor targets and incentives', 'Study-centre registration by invitation link', 'Verification and approval workflow'],
  },
  {
    icon: IndianRupee, title: 'Finance & Collections',
    body: 'Set up fee plans and keep track of what is due.',
    points: ['Invoices and installment schedules', 'Payment links and reminders', 'GST settings and receipts', 'Study-centre wallets', 'Expense claims', 'Overdue and upcoming receivables dashboard'],
  },
  {
    icon: Users, title: 'HR & Payroll',
    body: 'Attendance, leave and salary in one place, on the web and on mobile.',
    points: ['Biometric and mobile attendance with selfie and location', 'Leave workflows with approvals', 'Salary configuration and payroll batches', 'Early-exit and auto punch-out rules'],
  },
  {
    icon: BookOpen, title: 'Classes & Faculty',
    body: 'Keep academics organised for faculty and students.',
    points: ['Batches and lessons', 'Online sessions', 'Assessments and student progress', 'Faculty attendance'],
  },
  {
    icon: ClipboardCheck, title: 'Operations & Tasks',
    body: 'Assign work and follow it until it is finished.',
    points: ['Tasks and escalations', 'Complaints handling', 'Document dispatch and courier tracking', 'Asset management'],
  },
  {
    icon: MessageSquare, title: 'Communication',
    body: 'Reach students, staff and centres on the channel they use.',
    points: ['Email and WhatsApp', 'Announcements and polls', 'Meetings', 'Push notifications'],
  },
  {
    icon: BarChart3, title: 'Reports & Dashboards',
    body: 'Every role gets the numbers that matter to them.',
    points: ['Role-based dashboards', 'Admissions and conversion reports', 'Collections reports', 'Team performance'],
  },
  {
    icon: ShieldCheck, title: 'Administration',
    body: 'Keep centralized control across your whole organisation.',
    points: ['Users and roles', 'Departments and branches', 'Role-based permissions'],
  },
];

export function FeaturesPage() {
  return (
    <MarketingShell>
      {openInquiry => (
        <>
          <PageHero
            title="Everything your institution needs,"
            accent="all in one place."
            sub="Admissions, sales, finance, HR, academics and operations share the same student and finance data, so teams stop re-entering it."
          >
            <button
              type="button"
              onClick={() => openInquiry()}
              className="inline-flex items-center gap-2 bg-[#256c1d] hover:bg-[#1a5323] text-white font-semibold px-7 h-12 rounded-full transition-colors"
            >
              Book a Free Demo <ArrowRight className="w-4 h-4" />
            </button>
          </PageHero>

          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            <div className={`divide-y divide-slate-200 ${PREMIUM_CARD_STATIC} px-5 sm:px-8`}>
              {FEATURE_GROUPS.map(({ icon: Icon, title, body, points }) => (
                <article key={title} {...reveal()} className="grid md:grid-cols-5 gap-4 md:gap-10 py-6">
                  <div className="md:col-span-2">
                    <div className={`w-11 h-11 mb-3 ${ICON_CHIP}`}><Icon className="w-5 h-5" /></div>
                    <h2 className="font-semibold text-xl text-slate-900 mb-1.5">{title}</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
                  </div>
                  <ul className="md:col-span-3 grid sm:grid-cols-2 gap-x-6 gap-y-2.5 content-start">
                    {points.map(p => (
                      <li key={p} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="w-4 h-4 text-[#256c1d] mt-0.5 shrink-0" /> {p}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <Roles />
          <MobileApp />
          <CtaBand title="See it with your own workflow" sub="Tell us how your teams work today and we will show you how it looks in PYPE ERM." label="Book a Free Demo" onClick={() => openInquiry()} />
        </>
      )}
    </MarketingShell>
  );
}
